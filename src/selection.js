define([
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