define([
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
