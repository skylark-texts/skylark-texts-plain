/**
 * skylark-texts-plain - The skylarkjs plain utility Library.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
      require = globals.require,
      isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                resolved: false,
                exports: null
            };
            require(id);
        } else {
            map[id] = {
                factory : null,
                resolved : true,
                exports : factory
            };
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.resolved) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args) || null;
            module.resolved = true;
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx-ns");

    if (isCmd) {
      module.exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-texts-plain/plain',[
	"skylark-langx/skylark"
],function(skylark){
	return skyalark.attach("plain.plain")
});
define('skylark-texts-plain/position',[
  "skylark-langx/klass",
  "skylark-langx/objects",
  "./plain"
],function(klass,objects,plain) {
  // POSITION OBJECT (original : line/pos.js)

  // A Position instance represents a position within the text.
  var Position = klass({
    _construct : function(line,ch,sticky = null) {
      this.line = line; 
      this.ch = ch;
      this.sticky = sticky;
    },
    compareTo : function(other) {
      return other && (this.line - other.line || this.ch - other.ch); 
    },

    clone : function() {
      return new Position(this.line,thie.ch);
    },

    equals : function(other) {
        return other && (this.sticky == other.sticky && this.compareTo(other) == 0);    
    },

    clipToLen : function(linelen) {
        let ch = this.ch;
        if (ch == null || ch > linelen) {
            return new Position(this.line, linelen);          
        } else if (ch < 0) {
            return new Position(this.line, 0);
        } else {
            return this;
        }
    }
  });

  // Compare two positions, return 0 if they are the same, a negative
  // number when a is less, and a positive number otherwise.
  Position.compare = function cmp(a, b) { 
    return a.compareTo(b);
  };

  Postion.copy = function copyPos(x) {
    return x.clone();
  }

  Position.max = function maxPos(a, b) { 
    return cmp(a, b) < 0 ? b : a; 
  };

  Position.min = function minPos(a, b) { 
    return cmp(a, b) < 0 ? a : b; 
  };

  Position.equal = function equalCursorPos(a,b) {
    return a && a.equals(b);
  };

  return plain.Position = Position;

});

define('skylark-texts-plain/range',[
  "skylark-langx/klass",
  "./plain",
  "./position"
],function(klass,plain,Postion) {
  // Original: model/selection.js
  
  var Range = klass({
    klassName : "Range",

    _construct : function(anchor, head) {
      this.anchor = anchor; 
      this.head = head;
    },

    from: function() { 
      return Positon.min(this.anchor, this.head); 
    },
    
    to: function() { 
      return Position.max(this.anchor, this.head); 
    },
    
    empty: function() {
      return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch;
    },

    extend : function extendRange(head, other, extend) {
      // moved from model/selection_updates.js
        if (extend) {
          let anchor = this.anchor;
          if (other) {
              let posBefore = Position.compare(head, anchor) < 0;
              if (posBefore != Position.compare(other, anchor) < 0) {
                  anchor = head;
                  head = other;
              } else if (posBefore != Position.compare(head, other) < 0) {
                  head = other;
              }
          }
          return new Range(anchor, head);
        } else {
          return new Range(other || head, head);
        }
    }
  });

  return plain.Range = Range;

});

define('skylark-texts-plain/selection',[
  "skylark-langx/klass",
  "./plain",
  "./position",
  "./range"
],function(klass,plain, Position, Range) {

  // Original: model/selection.js

  var Selection = klass({
    klassName : "Selection",

    _construct : function (ranges, primIndex) {
      this.ranges = ranges;
      this.primIndex = primIndex;
    },
    
    primary: function() { 
      return this.ranges[this.primIndex]; 
    },
    
    equals: function(other) {
      if (other == this) return true;
      if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) return false;
      for (var i = 0; i < this.ranges.length; i++) {
        var here = this.ranges[i], there = other.ranges[i];
        if (Position.compare(here.anchor, there.anchor) != 0 || Position.compare(here.head, there.head) != 0) return false;
      }
      return true;
    },
    
    deepCopy: function() {
      for (var out = [], i = 0; i < this.ranges.length; i++)
        out[i] = new Range(copyPos(this.ranges[i].anchor), copyPos(this.ranges[i].head));
      return new Selection(out, this.primIndex);
    },
    
    somethingSelected: function() {
      for (var i = 0; i < this.ranges.length; i++)
        if (!this.ranges[i].empty()) return true;
      return false;
    },
    
    contains: function(pos, end) {
      if (!end) end = pos;
      for (var i = 0; i < this.ranges.length; i++) {
        var range = this.ranges[i];
        if (Position.compare(end, range.from()) >= 0 && Position.compare(pos, range.to()) <= 0)
          return i;
      }
      return -1;
    }

  });

  // Take an unsorted, potentially overlapping set of ranges, and
  // build a selection out of it. 'Consumes' ranges array (modifying
  // it).

  Selection.normalize =  function normalizeSelection(mayTouch, ranges, primIndex) {
      //let mayTouch = cm && cm.options.selectionsMayTouch;
      let prim = ranges[primIndex];
      ranges.sort((a, b) => Position.compare(a.from(), b.from()));
      primIndex = arrays.indexOf(ranges, prim);
      for (let i = 1; i < ranges.length; i++) {
          let cur = ranges[i], prev = ranges[i - 1];
          let diff = Position.compare(prev.to(), cur.from());
          if (mayTouch && !cur.empty() ? diff > 0 : diff >= 0) {
              let from = Position.min(prev.from(), cur.from()), to = Position.max(prev.to(), cur.to());
              let inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
              if (i <= primIndex)
                  --primIndex;
              ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
          }
      }
      return new Selection(ranges, primIndex);
  };

  Selection.simple =  function simpleSelection(anchor, head) {
    return new Selection([new Range(anchor, head || anchor)], 0);
  };

  return plain.Selection = Selection;
});
 define('skylark-texts-plain/line',[
  "skylark-langx/Evented",
  "./plain"
],function(Evented,plain){

  // LINE DATA STRUCTURE

  // Line objects. These hold state related to a line, including
  // highlighting info (the styles array).
  var Line = Evented.inherit({
    _construct : function(text, markedSpans, estimateHeight) {
      this.text = text;
      //TODO : The following logic will been changing
      if (this.attachMarkedSpans) {
        this.attachMarkedSpans(markedSpans);      
      }
      if (this.updateLineHeight) {
        this.height = estimateHeight ? estimateHeight(this) : 1;
      }
    },

    lineNo : function() { 
      //return lineNo(this); 
      var line = this;
      if (line.parent == null) {
        return null;
      }
      var cur = line.parent, no = indexOf(cur.lines, line);
      for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
        for (var i = 0;; ++i) {
          if (chunk.children[i] == cur) break;
          no += chunk.children[i].chunkSize();
        }
      }
      return no + cur.first;
    },

    // Change the content (text, markers) of a line. Automatically
    // invalidates cached information and tries to re-estimate the
    // line's height.
    updateLine : function (text, markedSpans, estimateHeight) {
      var line = this;

      line.text = text;
      if (line.stateAfter) line.stateAfter = null;
      if (line.styles) line.styles = null;
      if (line.order != null) line.order = null;


      //TODO : The following logic will been changing

      if (this.detachMarkedSpans) {
        line.detachMarkedSpans();
      }
      if (this.attachMarkedSpans) {
        line.attachMarkedSpans( markedSpans);
      }
      if (this.updateLineHeight) {
        var estHeight = estimateHeight ? estimateHeight(line) : 1;
        if (estHeight != line.height) line.updateLineHeight(estHeight);
      }
    },

    // Detach a line from the document tree and its markers.
    cleanUpLine : function () {
      var line = this;
      line.parent = null;

      //TODO : The following logic will been changing
      if (this.detachMarkedSpans) {
        line.detachMarkedSpans();
      }
    }

  });


  function extractLineClasses(type, output) {
    if (type) for (;;) {
      var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/);
      if (!lineClass) break;
      type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length);
      var prop = lineClass[1] ? "bgClass" : "textClass";
      if (output[prop] == null)
        output[prop] = lineClass[2];
      else if (!(new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)")).test(output[prop]))
        output[prop] += " " + lineClass[2];
    }
    return type;
  }

  function callBlankLine(mode, state) {
    if (mode.blankLine) return mode.blankLine(state);
    if (!mode.innerMode) return;
    var inner = CodeMirror.innerMode(mode, state);
    if (inner.mode.blankLine) return inner.mode.blankLine(inner.state);
  }

  // Counts the column offset in a string, taking tabs into account.
  // Used mostly to find indentation.
  var countColumn = Line.countColumn = function(string, end, tabSize, startIndex, startValue) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/);
      if (end == -1) end = string.length;
    }
    for (var i = startIndex || 0, n = startValue || 0;;) {
      var nextTab = string.indexOf("\t", i);
      if (nextTab < 0 || nextTab >= end)
        return n + (end - i);
      n += nextTab - i;
      n += tabSize - (n % tabSize);
      i = nextTab + 1;
    }
  };

  // The inverse of countColumn -- find the offset that corresponds to
  // a particular column.
  var findColumn = Line.findColumn = function(string, goal, tabSize) {
    for (var pos = 0, col = 0;;) {
      var nextTab = string.indexOf("\t", pos);
      if (nextTab == -1) nextTab = string.length;
      var skipped = nextTab - pos;
      if (nextTab == string.length || col + skipped >= goal)
        return pos + Math.min(skipped, goal - col);
      col += nextTab - pos;
      col += tabSize - (col % tabSize);
      pos = nextTab + 1;
      if (col >= goal) return pos;
    }
  }

  return plain.Line = Line;

});


define('skylark-texts-plain/leaf_chunk',[
  "skylark-langx/Evented",
  "./plain"
],function(Evented,plain){
  // Original: model/chunk.js

  var LeafChunk = Evented.inherit({
    klassName : "LeafChunk",

    _construct :  function(lines) {
      this.lines = lines;
      this.parent = null;
      for (var i = 0, height = 0; i < lines.length; ++i) {
        lines[i].parent = this;
        height += lines[i].height;
      }
      this.height = height;
    },

    chunkSize: function() { 
      return this.lines.length; 
    },
    
    // Remove the n lines at offset 'at'.
    removeInner: function(at, n) {
      for (var i = at, e = at + n; i < e; ++i) {
        var line = this.lines[i];
        this.height -= line.height;
        line.cleanUpLine();
        //signalLater(line, "delete");
        this.emit("delete",line)
      }
      this.lines.splice(at, n);
    },

    // Helper used to collapse a small branch into a single leaf.
    collapse: function(lines) {
      lines.push.apply(lines, this.lines);
    },

    // Insert the given array of lines at offset 'at', count them as
    // having the given height.
    insertInner: function(at, lines, height) {
      this.height += height;
      this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
      for (var i = 0; i < lines.length; ++i) {
        lines[i].parent = this;
      }
    },

    // Used to iterate over a part of the tree.
    iterN: function(at, n, op) {
      for (var e = at + n; at < e; ++at)
        if (op(this.lines[at])) {
          return true;
        }
    }
  });

  return  plain.LeafChunk = LeafChunk;

});
define('skylark-texts-plain/branch_chunk',[
  "skylark-langx/Evented",
  "./plain",
  "./leaf_chunk"
],function(Evented,plain,LeafChunk){
  // Original: model/chunk.js

  var BranchChunk = Evented.inherit({
    klassName : "BranchChunk",

    _construct : function (children) {
      this.children = children;
      var size = 0, height = 0;
      for (var i = 0; i < children.length; ++i) {
        var ch = children[i];
        size += ch.chunkSize(); height += ch.height;
        ch.parent = this;
      }
      this.size = size;
      this.height = height;
      this.parent = null;
    },

    chunkSize: function() { 
      return this.size; 
    },
    
    removeInner: function(at, n) {
      this.size -= n;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var rm = Math.min(n, sz - at), oldHeight = child.height;
          child.removeInner(at, rm);
          this.height -= oldHeight - child.height;
          if (sz == rm) { this.children.splice(i--, 1); child.parent = null; }
          if ((n -= rm) == 0) break;
          at = 0;
        } else at -= sz;
      }
      // If the result is smaller than 25 lines, ensure that it is a
      // single leaf node.
      if (this.size - n < 25 &&
          (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
        var lines = [];
        this.collapse(lines);
        this.children = [new LeafChunk(lines)];
        this.children[0].parent = this;
      }
    },

    collapse: function(lines) {
      for (var i = 0; i < this.children.length; ++i) {
        this.children[i].collapse(lines);
      }
    },

    insertInner: function(at, lines, height) {
      this.size += lines.length;
      this.height += height;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at <= sz) {
          child.insertInner(at, lines, height);
          if (child.lines && child.lines.length > 50) {
            // To avoid memory thrashing when child.lines is huge (e.g. first view of a large file), it's never spliced.
            // Instead, small slices are taken. They're taken in order because sequential memory accesses are fastest.
            var remaining = child.lines.length % 25 + 25
            for (var pos = remaining; pos < child.lines.length;) {
              var leaf = new LeafChunk(child.lines.slice(pos, pos += 25));
              child.height -= leaf.height;
              this.children.splice(++i, 0, leaf);
              leaf.parent = this;
            }
            child.lines = child.lines.slice(0, remaining);
            this.maybeSpill();
          }
          break;
        }
        at -= sz;
      }
    },
    // When a node has grown, check whether it should be split.
    maybeSpill: function() {
      if (this.children.length <= 10) return;
      var me = this;
      do {
        var spilled = me.children.splice(me.children.length - 5, 5);
        var sibling = new BranchChunk(spilled);
        if (!me.parent) { // Become the parent node
          var copy = new BranchChunk(me.children);
          copy.parent = me;
          me.children = [copy, sibling];
          me = copy;
       } else {
          me.size -= sibling.size;
          me.height -= sibling.height;
          var myIndex = indexOf(me.parent.children, me);
          me.parent.children.splice(myIndex + 1, 0, sibling);
        }
        sibling.parent = me.parent;
      } while (me.children.length > 10);
      me.parent.maybeSpill();
    },
    
    iterN: function(at, n, op) {
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var used = Math.min(n, sz - at);
          if (child.iterN(at, used, op)) return true;
          if ((n -= used) == 0) break;
          at = 0;
        } else at -= sz;
      }
    }
  });

  return plain.BranchChunk = BranchChunk;
});

define('skylark-texts-plain/history',[
    "skylark-langx-arrays",
    './position',
    './selection'
], function (arrays,Position,  Selection) {
    'use strict';

    //TODO:spans/change_measurement/document_data

    function History(startGen) {
        this.done = [];
        this.undone = [];
        this.undoDepth = Infinity;
        this.lastModTime = this.lastSelTime = 0;
        this.lastOp = this.lastSelOp = null;
        this.lastOrigin = this.lastSelOrigin = null;
        this.generation = this.maxGeneration = startGen || 1;
    }

    function historyChangeFromChange(doc, change) {
        let histChange = {
            from: Position.copy(change.from),
            to: change_measurement.changeEnd(change),
            text: doc.getBetween(change.from, change.to)
        };
        attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
        document_data.linkedDocs(doc, doc => attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1), true);
        return histChange;
    }

    function clearSelectionEvents(array) {
        while (array.length) {
            let last = arrays.last(array);
            if (last.ranges)
                array.pop();
            else
                break;
        }
    }

    function lastChangeEvent(hist, force) {
        if (force) {
            clearSelectionEvents(hist.done);
            return arrays.last(hist.done);
        } else if (hist.done.length && !arrays.last(hist.done).ranges) {
            return arrays.last(hist.done);
        } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
            hist.done.pop();
            return arrays.last(hist.done);
        }
    }
    function addChangeToHistory(doc, change, selAfter, opId) {
        let hist = doc.history;
        hist.undone.length = 0;
        let time = +new Date(), cur;
        let last;
        if ((hist.lastOp == opId || hist.lastOrigin == change.origin && change.origin && (change.origin.charAt(0) == '+' && hist.lastModTime > time - (doc.cm ? doc.cm.options.historyEventDelay : 500) || change.origin.charAt(0) == '*')) && (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
            last = arrays.last(cur.changes);
            if (Position.compare(change.from, change.to) == 0 && Position.compare(change.from, last.to) == 0) {
                last.to = change_measurement.changeEnd(change);
            } else {
                cur.changes.push(historyChangeFromChange(doc, change));
            }
        } else {
            let before = arrays.last(hist.done);
            if (!before || !before.ranges)
                pushSelectionToHistory(doc.sel, hist.done);
            cur = {
                changes: [historyChangeFromChange(doc, change)],
                generation: hist.generation
            };
            hist.done.push(cur);
            while (hist.done.length > hist.undoDepth) {
                hist.done.shift();
                if (!hist.done[0].ranges)
                    hist.done.shift();
            }
        }
        hist.done.push(selAfter);
        hist.generation = ++hist.maxGeneration;
        hist.lastModTime = hist.lastSelTime = time;
        hist.lastOp = hist.lastSelOp = opId;
        hist.lastOrigin = hist.lastSelOrigin = change.origin;
        if (!last)
            doc.emit('historyAdded');
    }

    function selectionEventCanBeMerged(doc, origin, prev, sel) {
        let ch = origin.charAt(0);
        return ch == '*' || ch == '+' && prev.ranges.length == sel.ranges.length && prev.somethingSelected() == sel.somethingSelected() && new Date() - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500);
    }

    function addSelectionToHistory(doc, sel, opId, options) {
        let hist = doc.history, origin = options && options.origin;
        if (opId == hist.lastSelOp || origin && hist.lastSelOrigin == origin && (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin || selectionEventCanBeMerged(doc, origin, arrays.last(hist.done), sel)))
            hist.done[hist.done.length - 1] = sel;
        else
            pushSelectionToHistory(sel, hist.done);
        hist.lastSelTime = +new Date();
        hist.lastSelOrigin = origin;
        hist.lastSelOp = opId;
        if (options && options.clearRedo !== false)
            clearSelectionEvents(hist.undone);
    }

    function pushSelectionToHistory(sel, dest) {
        let top = arrays.last(dest);
        if (!(top && top.ranges && top.equals(sel)))
            dest.push(sel);
    }

    function attachLocalSpans(doc, change, from, to) {
        let existing = change['spans_' + doc.id], n = 0;
        doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), line => {
            if (line.markedSpans)
                (existing || (existing = change['spans_' + doc.id] = {}))[n] = line.markedSpans;
            ++n;
        });
    }

    function removeClearedSpans(spans) {
        if (!spans)
            return null;
        let out;
        for (let i = 0; i < spans.length; ++i) {
            if (spans[i].marker.explicitlyCleared) {
                if (!out)
                    out = spans.slice(0, i);
            } else if (out)
                out.push(spans[i]);
        }
        return !out ? spans : out.length ? out : null;
    }

    function getOldSpans(doc, change) {
        let found = change['spans_' + doc.id];
        if (!found)
            return null;
        let nw = [];
        for (let i = 0; i < change.text.length; ++i)
            nw.push(removeClearedSpans(found[i]));
        return nw;
    }

    function mergeOldSpans(doc, change) {
        let old = getOldSpans(doc, change);
        let stretched = spans.stretchSpansOverChange(doc, change);
        if (!old)
            return stretched;
        if (!stretched)
            return old;
        for (let i = 0; i < old.length; ++i) {
            let oldCur = old[i], stretchCur = stretched[i];
            if (oldCur && stretchCur) {
                spans:
                    for (let j = 0; j < stretchCur.length; ++j) {
                        let span = stretchCur[j];
                        for (let k = 0; k < oldCur.length; ++k)
                            if (oldCur[k].marker == span.marker)
                                continue spans;
                        oldCur.push(span);
                    }
            } else if (stretchCur) {
                old[i] = stretchCur;
            }
        }
        return old;
    }

    function copyHistoryArray(events, newGroup, instantiateSel) {
        let copy = [];
        for (let i = 0; i < events.length; ++i) {
            let event = events[i];
            if (event.ranges) {
                copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event);
                continue;
            }
            let changes = event.changes, newChanges = [];
            copy.push({ changes: newChanges });
            for (let j = 0; j < changes.length; ++j) {
                let change = changes[j], m;
                newChanges.push({
                    from: change.from,
                    to: change.to,
                    text: change.text
                });
                if (newGroup)
                    for (var prop in change)
                        if (m = prop.match(/^spans_(\d+)$/)) {
                            if (arrays.indexOf(newGroup, Number(m[1])) > -1) {
                                arrays.last(newChanges)[prop] = change[prop];
                                delete change[prop];
                            }
                        }
            }
        }
        return copy;
    }

    History.historyChangeFromChange = historyChangeFromChange;
    History.addChangeToHistory = addChangeToHistory;
    History.addSelectionToHistory = addSelectionToHistory;
    History.pushSelectionToHistory = pushSelectionToHistory;
    History.mergeOldSpans = mergeOldSpans;
    History.copyHistoryArray = copyHistoryArray;

    return History;
});
define('skylark-texts-plain/document',[
  "skylark-langx/arrays",
  "skylark-langx/Evented",
  "./plain",
  "./branch_chunk",
  "./leaf_chunk",
  "./position",
  "./selection",
  "./history"
],function(arrays, Evented,plain,BranchChunk,LeafChunk,Position,Selection, History){
    // Original : model/doc.js 
    //TODO : selection_updates/history/marker
    'use strict';
    let nextDocId = 0;

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
  
  var Document = BranchChunk.inherit({

    _construct : function(text, mode, firstLine, lineSep,direction) {
      if (firstLine == null) firstLine = 0;

      thie.overrited(new LeafChunk([new Line("", null)]));

      this.first = firstLine;
      this.scrollTop = this.scrollLeft = 0;
      this.cantEdit = false;
      this.cleanGeneration = 1;
      this.modeFrontier = this.highlightFrontier = firstLine;
      let start = new Position(firstLine, 0);
      this.sel = Selection.simple(start);
      this.history = new m_history.History(null);
      this.id = ++nextDocId;
      this.modeOption = mode;
      this.lineSep = lineSep;
      this.direction = direction == 'rtl' ? 'rtl' : 'ltr';
      this.extend = false;
      if (typeof text == 'string') {
          text = this.splitLines(text);
      }
      document_data.updateDoc(this, {
          from: start,
          to: start,
          text: text
      });
      selection_updates.setSelection(this, Selection.simple(start), misc.sel_dontScroll);
    },

    iter: function (from, to, op) {
        if (op) {
          this.iterN(from - this.first, to - from, op);
        } else {
          this.iterN(this.first, this.first + this.size, from);
        }
    },

    insert: function (at, lines) {
        let height = 0;
        for (let i = 0; i < lines.length; ++i) {
            height += lines[i].height;
        }
        this.insertInner(at - this.first, lines, height);
    },

    remove: function (at, n) {
        this.removeInner(at - this.first, n);
    },

    getValue: function (lineSep) {
        let lines = this.getLines(this.first, this.first + this.size);
        if (lineSep === false)
            return lines;
        return lines.join(lineSep || this.lineSeparator());
    },

    setValue: function (code) {
        //operations.docMethodOp
        let top = new Position(this.first, 0), last = this.first + this.size - 1;
        changes.makeChange(this, {
            from: top,
            to: new Position(last, this.getLineHandle(last).text.length),
            text: this.splitLines(code),
            origin: 'setValue',
            full: true
        }, true);
        if (this.cm)
            scrolling.scrollToCoords(this.cm, 0, 0);
        selection_updates.setSelection(this, Selection.simple(top), misc.sel_dontScroll);
    },

    replaceRange: function (code, from, to, origin) {
        from = this.clipPos( from);
        to = to ? this.clipPos( to) : from;
        changes.replaceRange(this, code, from, to, origin);
    },

    getRange: function (from, to, lineSep) {
        let lines = this.getBetween(this.clipPos( from), this.clipPos( to));
        if (lineSep === false)
            return lines;
        return lines.join(lineSep || this.lineSeparator());
    },

    getBetween : function (start, end) {
        // moved from line/utils_line.js
        let doc = this,
            out = [], n = start.line;
        doc.iter(start.line, end.line + 1, line => {
            let text = line.text;
            if (n == end.line)
                text = text.slice(0, end.ch);
            if (n == start.line)
                text = text.slice(start.ch);
            out.push(text);
            ++n;
        });
        return out;
    },

    getLine: function (line) {
        let l = this.getLineHandle(line);
        return l && l.text;
    },

    getLines : function (from, to) {
        // moved from line/utils_line.js
        let doc = this,
            out = [];
        doc.iter(from, to, line => {
            out.push(line.text);
        });
        return out;
    },

    getLineHandle: function (n) {
        ///return utils_line.getLine(this, n);

        // moved from line/utils_line.js
        n -= this.first;
        if (n < 0 || n >= this.size)
            throw new Error('There is no line ' + (n + this.first) + ' in the document.');
        let chunk = this;
        while (!chunk.lines) {
            for (let i = 0;; ++i) {
                let child = chunk.children[i], sz = child.chunkSize();
                if (n < sz) {
                    chunk = child;
                    break;
                }
                n -= sz;
            }
        }
        return chunk.lines[n];
    },

    getLineNumber: function (line) {
        ///return utils_line.lineNo(line);
        // moved from line/utils_line.js
        if (line.parent == null)
            return null;
        let cur = line.parent, no = arrays.indexOf(cur.lines, line);
        for (let chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
            for (let i = 0;; ++i) {
                if (chunk.children[i] == cur)
                    break;
                no += chunk.children[i].chunkSize();
            }
        }
        return no + cur.first;
    },

    getLineHandleVisualStart: function (line) {
        if (typeof line == 'number')
            line = this.getLineHandle(line);
        return spans.visualLine(line);
    },

    isLine : function(l) {
        // moved from line/utils_line.js
        return l >= this.first && l < this.first + this.size;        
    },

    lineCount: function () {
        return this.size;
    },

    firstLine: function () {
        return this.first;
    },

    lastLine: function () {
        return this.first + this.size - 1;
    },

    clipPos: function (pos) {
        ///return m_pos.clipPos(this, pos);
        //moved from line/pos.js
        if (pos.line < this.first)
            return  new Position(this.first, 0);
        let last = this.first + this.size - 1;
        if (pos.line > last)
            return Position(last, this.getLineHandle(last).text.length);
        return pos.clipToLen(this.getLineHandle(pos.line).text.length);
    },

    getCursor: function (start) {
        let range = this.sel.primary(), pos;
        if (start == null || start == 'head')
            pos = range.head;
        else if (start == 'anchor')
            pos = range.anchor;
        else if (start == 'end' || start == 'to' || start === false)
            pos = range.to();
        else
            pos = range.from();
        return pos;
    },

    listSelections: function () {
        return this.sel.ranges;
    },

    somethingSelected: function () {
        return this.sel.somethingSelected();
    },


    setCursor: function (line, ch, options) {
        //operations.docMethodOp
        selection_updates.setSimpleSelection(this, this.clipPos( typeof line == 'number' ? new Position(line, ch || 0) : line), null, options);
    },

    setSelection: function (anchor, head, options) {
        //operations.docMethodOp
        selection_updates.setSimpleSelection(this, this.clipPos( anchor), this.clipPos( head || anchor), options);
    },

    extendSelection: function (head, other, options) {
        //operations.docMethodOp
        selection_updates.extendSelection(this, this.clipPos( head), other && this.clipPos( other), options);
    },

    extendSelections: function (heads, options) {
        //operations.docMethodOp
        selection_updates.extendSelections(this, m_pos.clipPosArray(this, heads), options);
    },

    extendSelectionsBy: function (f, options) {
        //operations.docMethodOp
        let heads = misc.map(this.sel.ranges, f);
        selection_updates.extendSelections(this, m_pos.clipPosArray(this, heads), options);
    },

    setSelections: function (ranges, primary, options) {
        //operations.docMethodOp
        if (!ranges.length)
            return;
        let out = [];
        for (let i = 0; i < ranges.length; i++)
            out[i] = new m_selection.Range(this.clipPos( ranges[i].anchor), this.clipPos( ranges[i].head));
        if (primary == null)
            primary = Math.min(ranges.length - 1, this.sel.primIndex);
        selection_updates.setSelection(this, Selection.normalize(this.cm, out, primary), options);
    },

    addSelection: function (anchor, head, options) {
        //operations.docMethodOp
        let ranges = this.sel.ranges.slice(0);
        ranges.push(new m_selection.Range(this.clipPos( anchor), this.clipPos( head || anchor)));
        selection_updates.setSelection(this, m_selection.normalizeSelection(this.cm, ranges, ranges.length - 1), options);
    },

    getSelection: function (lineSep) {
        let ranges = this.sel.ranges, lines;
        for (let i = 0; i < ranges.length; i++) {
            let sel = this.getBetween(ranges[i].from(), ranges[i].to());
            lines = lines ? lines.concat(sel) : sel;
        }
        if (lineSep === false)
            return lines;
        else
            return lines.join(lineSep || this.lineSeparator());
    },
    getSelections: function (lineSep) {
        let parts = [], ranges = this.sel.ranges;
        for (let i = 0; i < ranges.length; i++) {
            let sel = this.getBetween(ranges[i].from(), ranges[i].to());
            if (lineSep !== false)
                sel = sel.join(lineSep || this.lineSeparator());
            parts[i] = sel;
        }
        return parts;
    },
    replaceSelection: function (code, collapse, origin) {
        let dup = [];
        for (let i = 0; i < this.sel.ranges.length; i++)
            dup[i] = code;
        this.replaceSelections(dup, collapse, origin || '+input');
    },

    replaceSelections: function (code, collapse, origin) {
        //operations.docMethodOp
        let changes = [], sel = this.sel;
        for (let i = 0; i < sel.ranges.length; i++) {
            let range = sel.ranges[i];
            changes[i] = {
                from: range.from(),
                to: range.to(),
                text: this.splitLines(code[i]),
                origin: origin
            };
        }
        let newSel = collapse && collapse != 'end' && change_measurement.computeReplacedSel(this, changes, collapse);
        for (let i = changes.length - 1; i >= 0; i--)
            changes.makeChange(this, changes[i]);
        if (newSel)
            selection_updates.setSelectionReplaceHistory(this, newSel);
        else if (this.cm)
            scrolling.ensureCursorVisible(this.cm);
    },

    undo: function () {
        //operations.docMethodOp
        changes.makeChangeFromHistory(this, 'undo');
    },

    redo: function () {
        //operations.docMethodOp
        changes.makeChangeFromHistory(this, 'redo');
    },

    undoSelection: function () {
        //operations.docMethodOp
        changes.makeChangeFromHistory(this, 'undo', true);
    },

    redoSelection: function () {
        //operations.docMethodOp
        changes.makeChangeFromHistory(this, 'redo', true);
    },

    setExtending: function (val) {
        this.extend = val;
    },

    getExtending: function () {
        return this.extend;
    },

    historySize: function () {
        let hist = this.history, done = 0, undone = 0;
        for (let i = 0; i < hist.done.length; i++)
            if (!hist.done[i].ranges)
                ++done;
        for (let i = 0; i < hist.undone.length; i++)
            if (!hist.undone[i].ranges)
                ++undone;
        return {
            undo: done,
            redo: undone
        };
    },

    clearHistory: function () {
        this.history = new m_history.History(this.history.maxGeneration);
    },

    markClean: function () {
        this.cleanGeneration = this.changeGeneration(true);
    },

    changeGeneration: function (forceSplit) {
        if (forceSplit)
            this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null;
        return this.history.generation;
    },

    isClean: function (gen) {
        return this.history.generation == (gen || this.cleanGeneration);
    },

    getHistory: function () {
        return {
            done: m_history.copyHistoryArray(this.history.done),
            undone: m_history.copyHistoryArray(this.history.undone)
        };
    },

    setHistory: function (histData) {
        let hist = this.history = new m_history.History(this.history.maxGeneration);
        hist.done = m_history.copyHistoryArray(histData.done.slice(0), null, true);
        hist.undone = m_history.copyHistoryArray(histData.undone.slice(0), null, true);
    },

    setGutterMarker: function (line, gutterID, value) {
        //operations.docMethodOp
        return changes.changeLine(this, line, 'gutter', line => {
            let markers = line.gutterMarkers || (line.gutterMarkers = {});
            markers[gutterID] = value;
            if (!value && misc.isEmpty(markers))
                line.gutterMarkers = null;
            return true;
        });
    },

    clearGutter: function (gutterID) {
        //operations.docMethodOp
        this.iter(line => {
            if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
                changes.changeLine(this, line, 'gutter', () => {
                    line.gutterMarkers[gutterID] = null;
                    if (misc.isEmpty(line.gutterMarkers))
                        line.gutterMarkers = null;
                    return true;
                });
            }
        });
    },

    lineInfo: function (line) {
        let n;
        if (typeof line == 'number') {
            if (!this.isLine(line))
                return null;
            n = line;
            line = this.getLineHandle(line);
            if (!line)
                return null;
        } else {
            n = this.getLineNumber(line);
            if (n == null)
                return null;
        }
        return {
            line: n,
            handle: line,
            text: line.text,
            gutterMarkers: line.gutterMarkers,
            textClass: line.textClass,
            bgClass: line.bgClass,
            wrapClass: line.wrapClass,
            widgets: line.widgets
        };
    },

    addLineClass: function (handle, where, cls) {
        //operations.docMethodOp
        return changes.changeLine(this, handle, where == 'gutter' ? 'gutter' : 'class', line => {
            let prop = where == 'text' ? 'textClass' : where == 'background' ? 'bgClass' : where == 'gutter' ? 'gutterClass' : 'wrapClass';
            if (!line[prop])
                line[prop] = cls;
            else if (dom.classTest(cls).test(line[prop]))
                return false;
            else
                line[prop] += ' ' + cls;
            return true;
        });
    },

    removeLineClass: function (handle, where, cls) {
        //operations.docMethodOp
        return changes.changeLine(this, handle, where == 'gutter' ? 'gutter' : 'class', line => {
            let prop = where == 'text' ? 'textClass' : where == 'background' ? 'bgClass' : where == 'gutter' ? 'gutterClass' : 'wrapClass';
            let cur = line[prop];
            if (!cur)
                return false;
            else if (cls == null)
                line[prop] = null;
            else {
                let found = cur.match(dom.classTest(cls));
                if (!found)
                    return false;
                let end = found.index + found[0].length;
                line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? '' : ' ') + cur.slice(end) || null;
            }
            return true;
        });
    },

    addLineWidget: function (handle, node, options) {
        //operations.docMethodOp
        return line_widget.addLineWidget(this, handle, node, options);
    },

    removeLineWidget: function (widget) {
        widget.clear();
    },

    markText: function (from, to, options) {
        return mark_text.markText(this, this.clipPos( from), this.clipPos( to), options, options && options.type || 'range');
    },

    setBookmark: function (pos, options) {
        let realOpts = {
            replacedWith: options && (options.nodeType == null ? options.widget : options),
            insertLeft: options && options.insertLeft,
            clearWhenEmpty: false,
            shared: options && options.shared,
            handleMouseEvents: options && options.handleMouseEvents
        };
        pos = this.clipPos( pos);
        return p.markText(this, pos, pos, realOpts, 'bookmark');
    },

    findMarksAt: function (pos) {
        pos = this.clipPos( pos);
        let markers = [], spans = this.getLineHandle(pos.line).markedSpans;
        if (spans)
            for (let i = 0; i < spans.length; ++i) {
                let span = spans[i];
                if ((span.from == null || span.from <= pos.ch) && (span.to == null || span.to >= pos.ch))
                    markers.push(span.marker.parent || span.marker);
            }
        return markers;
    },

    findMarks: function (from, to, filter) {
        from = this.clipPos( from);
        to = this.clipPos( to);
        let found = [], lineNo = from.line;
        this.iter(from.line, to.line + 1, line => {
            let spans = line.markedSpans;
            if (spans)
                for (let i = 0; i < spans.length; i++) {
                    let span = spans[i];
                    if (!(span.to != null && lineNo == from.line && from.ch >= span.to || span.from == null && lineNo != from.line || span.from != null && lineNo == to.line && span.from >= to.ch) && (!filter || filter(span.marker)))
                        found.push(span.marker.parent || span.marker);
                }
            ++lineNo;
        });
        return found;
    },

    getAllMarks: function () {
        let markers = [];
        this.iter(line => {
            let sps = line.markedSpans;
            if (sps)
                for (let i = 0; i < sps.length; ++i)
                    if (sps[i].from != null)
                        markers.push(sps[i].marker);
        });
        return markers;
    },

    posFromIndex: function (off) {
        let ch, lineNo = this.first, sepSize = this.lineSeparator().length;
        this.iter(line => {
            let sz = line.text.length + sepSize;
            if (sz > off) {
                ch = off;
                return true;
            }
            off -= sz;
            ++lineNo;
        });
        return this.clipPos( new Position(lineNo, ch));
    },

    indexFromPos: function (coords) {
        coords = this.clipPos( coords);
        let index = coords.ch;
        if (coords.line < this.first || coords.ch < 0)
            return 0;
        let sepSize = this.lineSeparator().length;
        this.iter(this.first, coords.line, line => {
            index += line.text.length + sepSize;
        });
        return index;
    },
    copy: function (copyHistory) {
        let doc = new Document(this.getLines(this.first, this.first + this.size), this.modeOption, this.first, this.lineSep, this.direction);
        doc.scrollTop = this.scrollTop;
        doc.scrollLeft = this.scrollLeft;
        doc.sel = this.sel;
        doc.extend = false;
        if (copyHistory) {
            doc.history.undoDepth = this.history.undoDepth;
            doc.setHistory(this.getHistory());
        }
        return doc;
    },

    linkedDoc: function (options) {
        if (!options)
            options = {};
        let from = this.first, to = this.first + this.size;
        if (options.from != null && options.from > from)
            from = options.from;
        if (options.to != null && options.to < to)
            to = options.to;
        let copy = new Document(this.getLines(from, to), options.mode || this.modeOption, from, this.lineSep, this.direction);
        if (options.sharedHist)
            copy.history = this.history;
        (this.linked || (this.linked = [])).push({
            doc: copy,
            sharedHist: options.sharedHist
        });
        copy.linked = [{
                doc: this,
                isParent: true,
                sharedHist: options.sharedHist
            }];
        line_widget.copySharedMarkers(copy, line_widget.findSharedMarkers(this));
        return copy;
    },

    unlinkDoc: function (other) {
        //if (other instanceof CodeMirror) // modified by lwf
        if (other.doc)
            other = other.doc;
        if (this.linked)
            for (let i = 0; i < this.linked.length; ++i) {
                let link = this.linked[i];
                if (link.doc != other)
                    continue;
                this.linked.splice(i, 1);
                other.unlinkDoc(this);
                line_widget.detachSharedMarkers(line_widget.findSharedMarkers(this));
                break;
            }
        if (other.history == this.history) {
            let splitIds = [other.id];
            document_data.linkedDocs(other, doc => splitIds.push(doc.id), true);
            other.history = new m_history.History(null);
            other.history.done = m_history.copyHistoryArray(this.history.done, splitIds);
            other.history.undone = m_history.copyHistoryArray(this.history.undone, splitIds);
        }
    },

    iterLinkedDocs: function (f) {
        document_data.linkedDocs(this, f);
    },

    getMode: function () {
        return this.mode;
    },

    getEditor: function () {
        return this.cm;
    },

    splitLines: function (str) {
        if (this.lineSep)
            return str.split(this.lineSep);
        return feature_detection.splitLinesAuto(str);
    },

    lineSeparator: function () {
        return this.lineSep || '\n';
    },

    setDirection: function (dir) {
        //operations.docMethodOp
        if (dir != 'rtl')
            dir = 'ltr';
        if (dir == this.direction)
            return;
        this.direction = dir;
        this.iter(line => line.order = null);
        ///if (this.cm)
        ///    document_data.directionChanged(this.cm);
        this.emit("directionChanged");
    }
  });
    
  // Public alias.
  Document.prototype.eachLine = Document.prototype.iter;

  return plain.Document = Document;
});

define('skylark-texts-plain/main',[
	"./plain",
	"./position",
	"./range",
	"./selection",
	"./line",
	"./leaf_chunk",
	"./branch_chunk",
	"./document"
],function(plain){
	return plain;
});
define('skylark-texts-plain', ['skylark-texts-plain/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-texts-plain.js.map
