define([
  "skylark-langx/klass",
  "skylark-langx/objects",
  "./texts"
],function(klass,objects,texts) {
  // POSITION OBJECT

  // A Position instance represents a position within the text.
  var Position = klass({
    _construct : function(line,ch) {
      this.line = line; 
      this.ch = ch;
    },
    compareTo : function(other) {
      return this.line - other.line || this.ch - other.ch; 
    },

    clone : function() {
      return new Position(this.line,thie.ch);
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

  return texts.Position = Position;

});
