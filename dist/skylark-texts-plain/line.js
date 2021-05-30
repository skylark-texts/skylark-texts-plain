/**
 * skylark-texts-plain - The skylarkjs plain utility Library.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["skylark-langx/Evented","./plain"],function(t,n){var e=t.inherit({_construct:function(t,n,e){this.text=t,this.attachMarkedSpans&&this.attachMarkedSpans(n),this.updateLineHeight&&(this.height=e?e(this):1)},lineNo:function(){if(null==this.parent)return null;for(var t=this.parent,n=indexOf(t.lines,this),e=t.parent;e;t=e,e=e.parent)for(var i=0;e.children[i]!=t;++i)n+=e.children[i].chunkSize();return n+t.first},updateLine:function(t,n,e){if(this.text=t,this.stateAfter&&(this.stateAfter=null),this.styles&&(this.styles=null),null!=this.order&&(this.order=null),this.detachMarkedSpans&&this.detachMarkedSpans(),this.attachMarkedSpans&&this.attachMarkedSpans(n),this.updateLineHeight){var i=e?e(this):1;i!=this.height&&this.updateLineHeight(i)}},cleanUpLine:function(){this.parent=null,this.detachMarkedSpans&&this.detachMarkedSpans()}});e.countColumn=function(t,n,e,i,a){null==n&&-1==(n=t.search(/[^\s\u00a0]/))&&(n=t.length);for(var h=i||0,r=a||0;;){var s=t.indexOf("\t",h);if(s<0||s>=n)return r+(n-h);r+=s-h,r+=e-r%e,h=s+1}},e.findColumn=function(t,n,e){for(var i=0,a=0;;){var h=t.indexOf("\t",i);-1==h&&(h=t.length);var r=h-i;if(h==t.length||a+r>=n)return i+Math.min(r,n-a);if(a+=h-i,i=h+1,(a+=e-a%e)>=n)return i}};return n.Line=e});
//# sourceMappingURL=sourcemaps/line.js.map
