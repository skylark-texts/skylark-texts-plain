define([
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
