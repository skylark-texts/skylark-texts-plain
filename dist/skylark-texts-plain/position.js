/**
 * skylark-texts-plain - The skylarkjs plain utility Library.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["skylark-langx/klass","skylark-langx/objects","./plain"],function(n,t,i){var e=n({_construct:function(n,t,i=null){this.line=n,this.ch=t,this.sticky=i},compareTo:function(n){return n&&(this.line-n.line||this.ch-n.ch)},clone:function(){return new e(this.line,thie.ch)},equals:function(n){return n&&this.sticky==n.sticky&&0==this.compareTo(n)},clipToLen:function(n){let t=this.ch;return null==t||t>n?new e(this.line,n):t<0?new e(this.line,0):this}});return e.compare=function(n,t){return n.compareTo(t)},Postion.copy=function(n){return n.clone()},e.max=function(n,t){return cmp(n,t)<0?t:n},e.min=function(n,t){return cmp(n,t)<0?n:t},e.equal=function(n,t){return n&&n.equals(t)},i.Position=e});
//# sourceMappingURL=sourcemaps/position.js.map
