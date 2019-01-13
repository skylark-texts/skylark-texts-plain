define([
  "skylark-langx/Evented",
  "./texts",
  "./_operations",
  "./BranchChunk",
  "./LeafChunk",
  "./Position",
  "./History"
],function(Evented,texts,_operations,BranchChunk,LeafChunk,Position,History){

  var 

  function clipToLen(pos, linelen) {
    var ch = pos.ch;
    if (ch == null || ch > linelen) return Position(pos.line, linelen);
    else if (ch < 0) return Position(pos.line, 0);
    else return pos;
  }

  var nextDocId = 0;

  // The document is represented as a BTree consisting of leaves, with
  // chunk of lines in them, and branches, with up to ten leaves or
  // other branch nodes below them. The top node is always a branch
  // node, and is the document object itself (meaning it has
  // additional methods and properties).
  //
  // All nodes have parent links. The tree is used both to go from
  // line numbers to line objects, and to go from objects to numbers.
  // It also indexes by height, and is used to convert between height
  // and line object, and to find the total height of the document.
  //
  // See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html
  
  var Document = BranchChunk.iherit({

    _construct : function(text, mode, firstLine, lineSep) {
      if (firstLine == null) firstLine = 0;

      thie.overrited(new LeafChunk([new Line("", null)]));
      this.first = firstLine;
      this.scrollTop = this.scrollLeft = 0;
      this.cantEdit = false;
      this.cleanGeneration = 1;
      this.frontier = firstLine;
      var start = Position(firstLine, 0);
      this.sel = simpleSelection(start);
      this.history = new History(null);
      this.id = ++nextDocId;
      this.modeOption = mode;
      this.lineSep = lineSep;
      this.extend = false;

      if (typeof text == "string") text = this.splitLines(text);
      updateDoc(this, {from: start, to: start, text: text});
      setSelection(this, simpleSelection(start), sel_dontScroll);
    },

    // Iterate over the document. Supports two forms -- with only one
    // argument, it calls that for each line in the document. With
    // three, it iterates over the range given by the first two (with
    // the second being non-inclusive).
    iter: function(from, to, op) {
      if (op) this.iterN(from - this.first, to - from, op);
      else this.iterN(this.first, this.first + this.size, from);
    },

    // Non-public interface for adding and removing lines.
    insert: function(at, lines) {
      var height = 0;
      for (var i = 0; i < lines.length; ++i) height += lines[i].height;
      this.insertInner(at - this.first, lines, height);
    },

    remove: function(at, n) { 
      this.removeInner(at - this.first, n); 
    },

    // From here, the methods are part of the public interface. Most
    // are also available from CodeMirror (editor) instances.

    getValue: function(lineSep) {
      var lines = this.getLines( this.first, this.first + this.size);
      if (lineSep === false) return lines;
      return lines.join(lineSep || this.lineSeparator());
    },

    setValue: docMethodOp(function(code) {
      var top = Position(this.first, 0), last = this.first + this.size - 1;
      makeChange(this, {from: top, to: Position(last, this.getLine(last).text.length),
                        text: this.splitLines(code), origin: "setValue", full: true}, true);
      setSelection(this, simpleSelection(top));
    }),

    replaceRange: function(code, from, to, origin) {
      from = this.clipPos( from);
      to = to ? this.clipPos( to) : from;
      replaceRange(this, code, from, to, origin);
    },

    getRange: function(from, to, lineSep) {
      var lines = getBetween(this, this.clipPos( from), this.clipPos( to));
      if (lineSep === false) return lines;
      return lines.join(lineSep || this.lineSeparator());
    },

    getLine: function(line) {
      var l = this.getLineHandle(line); 
      return l && l.text;
    },

    getLineHandle: function(line,notsilent) {
      function getLine(doc,n,silent) {
        var doc = this;

        n -= doc.first;
        if (n < 0 || n >= doc.size) {
          if (silent) {
            return;
          }
          throw new Error("There is no line " + (n + doc.first) + " in the document.");
        }
        for (var chunk = doc; !chunk.lines;) {
          for (var i = 0;; ++i) {
            var child = chunk.children[i], sz = child.chunkSize();
            if (n < sz) { chunk = child; break; }
            n -= sz;
          }
        }
        return chunk.lines[n];
      }

      if (this.isLine(line)) {
        return getLine(this, line,!notsilent);
      }

    },
    
    getLineNumber: function(line) {
      return line.lineNo();
    },

    getLineHandleVisualStart: function(line) {
      if (typeof line == "number") line = getLine(this, line);
      return visualLine(line);
    },

    isLine : function (l) {
      var doc = this;

      return l >= doc.first && l < doc.first + doc.size;
    },
    
    clipPosArray : function (array) {
      var doc = this;
      for (var out = [], i = 0; i < array.length; i++) out[i] = clipPos(doc, array[i]);
      return out;
    },

    lineCount: function() {
      return this.size;
    },
    
    firstLine: function() {
      return this.first;
    },
    
    lastLine: function() {
      return this.first + this.size - 1;
    },


    // Most of the external API clips given positions to make sure they
    // actually exist within the document.
    clipLine : function (n) {
      var doc = this;
      return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1));
    },

    clipPos: function(pos) {
      var doc = this;

      if (pos.line < doc.first) {
        return Position(doc.first, 0);
      }
      var last = doc.first + doc.size - 1;
      if (pos.line > last) {
        return Position(last, doc.getLine(last).text.length);
      }
      return clipToLen(pos, doc.getLine(pos.line).text.length);

    },

    getCursor: function(start) {
      var range = this.sel.primary(), pos;
      if (start == null || start == "head") pos = range.head;
      else if (start == "anchor") pos = range.anchor;
      else if (start == "end" || start == "to" || start === false) pos = range.to();
      else pos = range.from();
      return pos;
    },

    listSelections: function() { 
      return this.sel.ranges; 
    },
    
    somethingSelected: function() {
      return this.sel.somethingSelected();
    },

    setCursor: docMethodOp(function(line, ch, options) {
      setSimpleSelection(this, this.clipPos( typeof line == "number" ? Position(line, ch || 0) : line), null, options);
    }),

    setSelection: docMethodOp(function(anchor, head, options) {
      setSimpleSelection(this, this.clipPos( anchor), this.clipPos( head || anchor), options);
    }),

    extendSelection: docMethodOp(function(head, other, options) {
      extendSelection(this, this.clipPos( head), other && this.clipPos( other), options);
    }),

    extendSelections: docMethodOp(function(heads, options) {
      extendSelections(this, clipPosArray(this, heads), options);
    }),

    extendSelectionsBy: docMethodOp(function(f, options) {
      var heads = map(this.sel.ranges, f);
      extendSelections(this, clipPosArray(this, heads), options);
    }),

    setSelections: docMethodOp(function(ranges, primary, options) {
      if (!ranges.length) return;
      for (var i = 0, out = []; i < ranges.length; i++)
        out[i] = new Range(this.clipPos( ranges[i].anchor),
                           this.clipPos( ranges[i].head));
      if (primary == null) primary = Math.min(ranges.length - 1, this.sel.primIndex);
      setSelection(this, normalizeSelection(out, primary), options);
    }),

    addSelection: docMethodOp(function(anchor, head, options) {
      var ranges = this.sel.ranges.slice(0);
      ranges.push(new Range(this.clipPos( anchor), this.clipPos( head || anchor)));
      setSelection(this, normalizeSelection(ranges, ranges.length - 1), options);
    }),

    getSelection: function(lineSep) {
      var ranges = this.sel.ranges, lines;
      for (var i = 0; i < ranges.length; i++) {
        var sel = getBetween(this, ranges[i].from(), ranges[i].to());
        lines = lines ? lines.concat(sel) : sel;
      }
      if (lineSep === false) return lines;
      else return lines.join(lineSep || this.lineSeparator());
    },

    getSelections: function(lineSep) {
      var parts = [], ranges = this.sel.ranges;
      for (var i = 0; i < ranges.length; i++) {
        var sel = getBetween(this, ranges[i].from(), ranges[i].to());
        if (lineSep !== false) sel = sel.join(lineSep || this.lineSeparator());
        parts[i] = sel;
      }
      return parts;
    },

    replaceSelection: function(code, collapse, origin) {
      var dup = [];
      for (var i = 0; i < this.sel.ranges.length; i++)
        dup[i] = code;
      this.replaceSelections(dup, collapse, origin || "+input");
    },

    replaceSelections: docMethodOp(function(code, collapse, origin) {
      var changes = [], sel = this.sel;
      for (var i = 0; i < sel.ranges.length; i++) {
        var range = sel.ranges[i];
        changes[i] = {from: range.from(), to: range.to(), text: this.splitLines(code[i]), origin: origin};
      }
      var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse);
      for (var i = changes.length - 1; i >= 0; i--)
        makeChange(this, changes[i]);
      if (newSel) setSelectionReplaceHistory(this, newSel);
      else if (this.cm) ensureCursorVisible(this.cm);
    }),

    undo: docMethodOp(function() {
      makeChangeFromHistory(this, "undo");
    }),

    redo: docMethodOp(function() {
      makeChangeFromHistory(this, "redo");
    }),

    undoSelection: docMethodOp(function() {
      makeChangeFromHistory(this, "undo", true);
    }),

    redoSelection: docMethodOp(function() {
      makeChangeFromHistory(this, "redo", true);
    }),

    setExtending: function(val) {
      this.extend = val;
    },

    getExtending: function() {
      return this.extend;
    },

    historySize: function() {
      var hist = this.history, done = 0, undone = 0;
      for (var i = 0; i < hist.done.length; i++) if (!hist.done[i].ranges) ++done;
      for (var i = 0; i < hist.undone.length; i++) if (!hist.undone[i].ranges) ++undone;
      return {undo: done, redo: undone};
    },

    clearHistory: function() {
      this.history = new History(this.history.maxGeneration);
    },

    markClean: function() {
      this.cleanGeneration = this.changeGeneration(true);
    },

    changeGeneration: function(forceSplit) {
      if (forceSplit)
        this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null;
      return this.history.generation;
    },

    isClean: function (gen) {
      return this.history.generation == (gen || this.cleanGeneration);
    },

    getHistory: function() {
      return {done: copyHistoryArray(this.history.done),
              undone: copyHistoryArray(this.history.undone)};
    },

    setHistory: function(histData) {
      var hist = this.history = new History(this.history.maxGeneration);
      hist.done = copyHistoryArray(histData.done.slice(0), null, true);
      hist.undone = copyHistoryArray(histData.undone.slice(0), null, true);
    },

    addLineClass: docMethodOp(function(handle, where, cls) {
      return this.changeLine(handle, where == "gutter" ? "gutter" : "class", function(line) {
        var prop = where == "text" ? "textClass"
                 : where == "background" ? "bgClass"
                 : where == "gutter" ? "gutterClass" : "wrapClass";
        if (!line[prop]) line[prop] = cls;
        else if (classTest(cls).test(line[prop])) return false;
        else line[prop] += " " + cls;
        return true;
      });
    }),

    removeLineClass: docMethodOp(function(handle, where, cls) {
      return this.changeLine(handle, where == "gutter" ? "gutter" : "class", function(line) {
        var prop = where == "text" ? "textClass"
                 : where == "background" ? "bgClass"
                 : where == "gutter" ? "gutterClass" : "wrapClass";
        var cur = line[prop];
        if (!cur) return false;
        else if (cls == null) line[prop] = null;
        else {
          var found = cur.match(classTest(cls));
          if (!found) return false;
          var end = found.index + found[0].length;
          line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null;
        }
        return true;
      });
    }),

    addLineWidget: docMethodOp(function(handle, node, options) {
      return addLineWidget(this, handle, node, options);
    }),

    removeLineWidget: function(widget) { 
      widget.clear(); 
    },

    markText: function(from, to, options) {
      return markText(this, this.clipPos( from), this.clipPos( to), options, options && options.type || "range");
    },

    setBookmark: function(pos, options) {
      var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
                      insertLeft: options && options.insertLeft,
                      clearWhenEmpty: false, shared: options && options.shared,
                      handleMouseEvents: options && options.handleMouseEvents};
      pos = this.clipPos( pos);
      return markText(this, pos, pos, realOpts, "bookmark");
    },

    findMarksAt: function(pos) {
      pos = this.clipPos( pos);
      var markers = [], spans = getLine(this, pos.line).markedSpans;
      if (spans) for (var i = 0; i < spans.length; ++i) {
        var span = spans[i];
        if ((span.from == null || span.from <= pos.ch) &&
            (span.to == null || span.to >= pos.ch))
          markers.push(span.marker.parent || span.marker);
      }
      return markers;
    },

    findMarks: function(from, to, filter) {
      from = this.clipPos( from); to = this.clipPos( to);
      var found = [], lineNo = from.line;
      this.iter(from.line, to.line + 1, function(line) {
        var spans = line.markedSpans;
        if (spans) for (var i = 0; i < spans.length; i++) {
          var span = spans[i];
          if (!(span.to != null && lineNo == from.line && from.ch >= span.to ||
                span.from == null && lineNo != from.line ||
                span.from != null && lineNo == to.line && span.from >= to.ch) &&
              (!filter || filter(span.marker)))
            found.push(span.marker.parent || span.marker);
        }
        ++lineNo;
      });
      return found;
    },

    getAllMarks: function() {
      var markers = [];
      this.iter(function(line) {
        var sps = line.markedSpans;
        if (sps) for (var i = 0; i < sps.length; ++i)
          if (sps[i].from != null) markers.push(sps[i].marker);
      });
      return markers;
    },

    posFromIndex: function(off) {
      var ch, lineNo = this.first, sepSize = this.lineSeparator().length;
      this.iter(function(line) {
        var sz = line.text.length + sepSize;
        if (sz > off) { ch = off; return true; }
        off -= sz;
        ++lineNo;
      });
      return this.clipPos( Position(lineNo, ch));
    },

    indexFromPos: function (coords) {
      coords = this.clipPos( coords);
      var index = coords.ch;
      if (coords.line < this.first || coords.ch < 0) return 0;
      var sepSize = this.lineSeparator().length;
      this.iter(this.first, coords.line, function (line) {
        index += line.text.length + sepSize;
      });
      return index;
    },

    copy: function(copyHistory) {
      var doc = new Doc(this.getLines( this.first, this.first + this.size),
                        this.modeOption, this.first, this.lineSep);
      doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft;
      doc.sel = this.sel;
      doc.extend = false;
      if (copyHistory) {
        doc.history.undoDepth = this.history.undoDepth;
        doc.setHistory(this.getHistory());
      }
      return doc;
    },

    linkedDoc: function(options) {
      if (!options) options = {};
      var from = this.first, to = this.first + this.size;
      if (options.from != null && options.from > from) from = options.from;
      if (options.to != null && options.to < to) to = options.to;
      var copy = new Doc(this.getLines( from, to), options.mode || this.modeOption, from, this.lineSep);
      if (options.sharedHist) copy.history = this.history;
      (this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist});
      copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}];
      copySharedMarkers(copy, findSharedMarkers(this));
      return copy;
    },

    unlinkDoc: function(other) {
      if (other instanceof CodeMirror) other = other.doc;
      if (this.linked) for (var i = 0; i < this.linked.length; ++i) {
        var link = this.linked[i];
        if (link.doc != other) continue;
        this.linked.splice(i, 1);
        other.unlinkDoc(this);
        detachSharedMarkers(findSharedMarkers(this));
        break;
      }
      // If the histories were shared, split them again
      if (other.history == this.history) {
        var splitIds = [other.id];
        linkedDocs(other, function(doc) {splitIds.push(doc.id);}, true);
        other.history = new History(null);
        other.history.done = copyHistoryArray(this.history.done, splitIds);
        other.history.undone = copyHistoryArray(this.history.undone, splitIds);
      }
    },
    
    iterLinkedDocs: function(f) {
      linkedDocs(this, f);
    },

    getMode: function() {
      return this.mode;
    },
    
    getEditor: function() {
      return this.cm;
    },

    splitLines: function(str) {
      if (this.lineSep) return str.split(this.lineSep);
      return splitLinesAuto(str);
    },

    lineSeparator: function() { 
      return this.lineSep || "\n"; 
    },

    // Create a marker, wire it up to the right lines, and
    markText : function (from, to, options, type) {
      var doc = this;

      // Shared markers (across linked documents) are handled separately
      // (markTextShared will call out to this again, once per
      // document).
      if (options && options.shared) return markTextShared(doc, from, to, options, type);
      // Ensure we are in an operation.
      if (doc.cm && !doc.cm.curOp) return operation(doc.cm, markText)(doc, from, to, options, type);

      var marker = new TextMarker(doc, type), diff = cmp(from, to);
      if (options) copyObj(options, marker, false);
      // Don't connect empty markers unless clearWhenEmpty is false
      if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false)
        return marker;
      if (marker.replacedWith) {
        // Showing up as a widget implies collapsed (widget replaces text)
        marker.collapsed = true;
        marker.widgetNode = elt("span", [marker.replacedWith], "CodeMirror-widget");
        if (!options.handleMouseEvents) marker.widgetNode.setAttribute("cm-ignore-events", "true");
        if (options.insertLeft) marker.widgetNode.insertLeft = true;
      }
      if (marker.collapsed) {
        if (conflictingCollapsedRange(doc, from.line, from, to, marker) ||
            from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker))
          throw new Error("Inserting collapsed marker partially overlapping an existing one");
        sawCollapsedSpans = true;
      }

      if (marker.addToHistory)
        addChangeToHistory(doc, {from: from, to: to, origin: "markText"}, doc.sel, NaN);

      var curLine = from.line, cm = doc.cm, updateMaxLine;
      doc.iter(curLine, to.line + 1, function(line) {
        if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine)
          updateMaxLine = true;
        if (marker.collapsed && curLine != from.line) updateLineHeight(line, 0);
        addMarkedSpan(line, new MarkedSpan(marker,
                                           curLine == from.line ? from.ch : null,
                                           curLine == to.line ? to.ch : null));
        ++curLine;
      });
      // lineIsHidden depends on the presence of the spans, so needs a second pass
      if (marker.collapsed) doc.iter(from.line, to.line + 1, function(line) {
        if (lineIsHidden(doc, line)) updateLineHeight(line, 0);
      });

      if (marker.clearOnEnter) on(marker, "beforeCursorEnter", function() { marker.clear(); });

      if (marker.readOnly) {
        sawReadOnlySpans = true;
        if (doc.history.done.length || doc.history.undone.length)
          doc.clearHistory();
      }
      if (marker.collapsed) {
        marker.id = ++nextMarkerId;
        marker.atomic = true;
      }
      if (cm) {
        // Sync editor state
        if (updateMaxLine) cm.curOp.updateMaxLine = true;
        if (marker.collapsed)
          regChange(cm, from.line, to.line + 1);
        else if (marker.className || marker.title || marker.startStyle || marker.endStyle || marker.css)
          for (var i = from.line; i <= to.line; i++) regLineChange(cm, i, "text");
        if (marker.atomic) reCheckSelection(cm.doc);
        signalLater(cm, "markerAdded", cm, marker);
      }
      return marker;
    }

  });

  // Public alias.
  Document.prototype.eachLine = Document.prototype.iter;

 
  // DOCUMENT DATA STRUCTURE

  // By default, updates that start and end at the beginning of a line
  // are treated specially, in order to make the association of line
  // widgets and marker elements with the text behave more intuitive.
  function isWholeLineUpdate(doc, change) {
    return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" &&
      (!doc.cm || doc.cm.options.wholeLineUpdateBefore);
  }

  // Perform a change on the document data structure.
  function updateDoc(doc, change, markedSpans, estimateHeight) {
    function spansFor(n) {return markedSpans ? markedSpans[n] : null;}
    function update(line, text, spans) {
      updateLine(line, text, spans, estimateHeight);
      signalLater(line, "change", line, change);
    }
    function linesFor(start, end) {
      for (var i = start, result = []; i < end; ++i)
        result.push(new Line(text[i], spansFor(i), estimateHeight));
      return result;
    }

    var from = change.from, to = change.to, text = change.text;
    var firstLine = doc.getLineHandle(from.line,true), lastLine = doc.getLineHandle(to.line,true);
    var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;

    // Adjust the line structure
    if (change.full) {
      doc.insert(0, linesFor(0, text.length));
      doc.remove(text.length, doc.size - text.length);
    } else if (isWholeLineUpdate(doc, change)) {
      // This is a whole-line replace. Treated specially to make
      // sure line objects move the way they are supposed to.
      var added = linesFor(0, text.length - 1);
      update(lastLine, lastLine.text, lastSpans);
      if (nlines) doc.remove(from.line, nlines);
      if (added.length) doc.insert(from.line, added);
    } else if (firstLine == lastLine) {
      if (text.length == 1) {
        update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
      } else {
        var added = linesFor(1, text.length - 1);
        added.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight));
        update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
        doc.insert(from.line + 1, added);
      }
    } else if (text.length == 1) {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
      doc.remove(from.line + 1, nlines);
    } else {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
      update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
      var added = linesFor(1, text.length - 1);
      if (nlines > 1) doc.remove(from.line + 1, nlines - 1);
      doc.insert(from.line + 1, added);
    }

    signalLater(doc, "change", doc, change);
  }



  // LeafChunk / BranchChunk/ Doc -> skylark-utils-text
  //  var Doc = CodeMirror.Doc 

  // Set up methods on CodeMirror's prototype to redirect to the editor's document.
  var dontDelegate = "iter insert remove copy getEditor constructor".split(" ");
  for (var prop in Doc.prototype) if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
    CodeMirror.prototype[prop] = (function(method) {
      return function() {return method.apply(this.doc, arguments);};
    })(Doc.prototype[prop]);

  // Call f for all linked documents.
  function linkedDocs(doc, f, sharedHistOnly) {
    function propagate(doc, skip, sharedHist) {
      if (doc.linked) for (var i = 0; i < doc.linked.length; ++i) {
        var rel = doc.linked[i];
        if (rel.doc == skip) continue;
        var shared = sharedHist && rel.sharedHist;
        if (sharedHistOnly && !shared) continue;
        f(rel.doc, shared);
        propagate(rel.doc, doc, shared);
      }
    }
    propagate(doc, null, true);
  }

  // Attach a document to an editor.
  function attachDoc(cm, doc) {
    if (doc.cm) throw new Error("This document is already in use.");
    cm.doc = doc;
    doc.cm = cm;
    estimateLineHeights(cm);
    loadMode(cm);
    if (!cm.options.lineWrapping) findMaxLine(cm);
    cm.options.mode = doc.modeOption;
    regChange(cm);
  }

  return texts.Document = Document;
});
