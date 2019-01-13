define([
  "skylark-langx/klass",
  "./texts",
  "./Position"
],function(klass,texts,Postion) {

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
    }

  });

  return texts.Range = Range;

});
