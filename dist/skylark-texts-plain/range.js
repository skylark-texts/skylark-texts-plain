/**
 * skylark-texts-plain - The skylarkjs plain utility Library.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["skylark-langx/klass","./plain","./position"],function(n,t,i){var o=n({klassName:"Range",_construct:function(n,t){this.anchor=n,this.head=t},from:function(){return Positon.min(this.anchor,this.head)},to:function(){return Position.max(this.anchor,this.head)},empty:function(){return this.head.line==this.anchor.line&&this.head.ch==this.anchor.ch},extend:function(n,t,i){if(i){let i=this.anchor;if(t){let o=Position.compare(n,i)<0;o!=Position.compare(t,i)<0?(i=n,n=t):o!=Position.compare(n,t)<0&&(n=t)}return new o(i,n)}return new o(t||n,n)}});return t.Range=o});
//# sourceMappingURL=sourcemaps/range.js.map
