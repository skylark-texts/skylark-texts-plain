define([
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
