define([
  "skylark-langx/Evented",
  "./texts"
],function(Evented,texts){
  // TEXTMARKERS

  // Collapsed markers have unique ids, in order to be able to order
  // them, which is needed for uniquely determining an outer marker
  // when they overlap (they may nest, but not partially overlap).
  var nextMarkerId = 0;

  // Created with markText and setBookmark methods. A TextMarker is a
  // handle that can be used to clear or find a marked position in the
  // document. Line objects hold arrays (markedSpans) containing
  // {from, to, marker} object pointing to such marker objects, and
  // indicating that such a marker is present on that line. Multiple
  // lines may point to the same marker when it spans across lines.
  // The spans will have null for their from/to properties when the
  // marker continues beyond the start/end of the line. Markers have
  // links back to the lines they currently touch.

  var TextMarker = Evented.inherit({

    _construct : function(doc, type) {
      this.lines = [];
      this.type = type;
      this.doc = doc;
      this.id = ++nextMarkerId;
    },

    // Clear the marker.
    clear : function() {
      if (this.explicitlyCleared) return;
      var cm = this.doc.cm, withOp = cm && !cm.curOp;
      if (withOp) startOperation(cm);
      if (hasHandler(this, "clear")) {
        var found = this.find();
        if (found) signalLater(this, "clear", found.from, found.to);
      }
      var min = null, max = null;
      for (var i = 0; i < this.lines.length; ++i) {
        var line = this.lines[i];
        var span = getMarkedSpanFor(line.markedSpans, this);
        if (cm && !this.collapsed) regLineChange(cm, lineNo(line), "text");
        else if (cm) {
          if (span.to != null) max = lineNo(line);
          if (span.from != null) min = lineNo(line);
        }
        line.markedSpans = removeMarkedSpan(line.markedSpans, span);
        if (span.from == null && this.collapsed && !lineIsHidden(this.doc, line) && cm)
          updateLineHeight(line, textHeight(cm.display));
      }
      if (cm && this.collapsed && !cm.options.lineWrapping) for (var i = 0; i < this.lines.length; ++i) {
        var visual = visualLine(this.lines[i]), len = lineLength(visual);
        if (len > cm.display.maxLineLength) {
          cm.display.maxLine = visual;
          cm.display.maxLineLength = len;
          cm.display.maxLineChanged = true;
        }
      }

      if (min != null && cm && this.collapsed) regChange(cm, min, max + 1);
      this.lines.length = 0;
      this.explicitlyCleared = true;
      if (this.atomic && this.doc.cantEdit) {
        this.doc.cantEdit = false;
        if (cm) reCheckSelection(cm.doc);
      }
      if (cm) signalLater(cm, "markerCleared", cm, this);
      if (withOp) endOperation(cm);
      if (this.parent) this.parent.clear();
    },

    // Find the position of the marker in the document. Returns a {from,
    // to} object by default. Side can be passed to get a specific side
    // -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
    // Pos objects returned contain a line object, rather than a line
    // number (used to prevent looking up the same line twice).
    find : function(side, lineObj) {
      if (side == null && this.type == "bookmark") side = 1;
      var from, to;
      for (var i = 0; i < this.lines.length; ++i) {
        var line = this.lines[i];
        var span = getMarkedSpanFor(line.markedSpans, this);
        if (span.from != null) {
          from = Pos(lineObj ? line : lineNo(line), span.from);
          if (side == -1) return from;
        }
        if (span.to != null) {
          to = Pos(lineObj ? line : lineNo(line), span.to);
          if (side == 1) return to;
        }
      }
      return from && {from: from, to: to};
    },

    // Signals that the marker's widget changed, and surrounding layout
    // should be recomputed.
    changed : function() {
      var pos = this.find(-1, true), widget = this, cm = this.doc.cm;
      if (!pos || !cm) return;
      runInOp(cm, function() {
        var line = pos.line, lineN = lineNo(pos.line);
        var view = findViewForLine(cm, lineN);
        if (view) {
          clearLineMeasurementCacheFor(view);
          cm.curOp.selectionChanged = cm.curOp.forceUpdate = true;
        }
        cm.curOp.updateMaxLine = true;
        if (!lineIsHidden(widget.doc, line) && widget.height != null) {
          var oldHeight = widget.height;
          widget.height = null;
          var dHeight = widgetHeight(widget) - oldHeight;
          if (dHeight)
            updateLineHeight(line, line.height + dHeight);
        }
      });
    },

    attachLine : function(line) {
      if (!this.lines.length && this.doc.cm) {
        var op = this.doc.cm.curOp;
        if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
          (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this);
      }
      this.lines.push(line);
    },

    detachLine : function(line) {
      this.lines.splice(indexOf(this.lines, line), 1);
      if (!this.lines.length && this.doc.cm) {
        var op = this.doc.cm.curOp;
        (op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
      }
    }
  });

  return texts.TextMarker = TextMarker;
});

