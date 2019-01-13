 define([
  "skylark-langx/Evented",
  "./texts"
],function(Evented,texts){

  // LINE DATA STRUCTURE

  // Line objects. These hold state related to a line, including
  // highlighting info (the styles array).
  var Line = Evented.iherit({
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

  return texts.Line = Line;

});

