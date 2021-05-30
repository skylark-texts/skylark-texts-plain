define([
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