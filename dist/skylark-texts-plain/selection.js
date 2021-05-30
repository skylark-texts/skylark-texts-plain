/**
 * skylark-texts-plain - The skylarkjs plain utility Library.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["skylark-langx/klass","./plain","./position","./range"],function(r,e,n,t){var i=r({klassName:"Selection",_construct:function(r,e){this.ranges=r,this.primIndex=e},primary:function(){return this.ranges[this.primIndex]},equals:function(r){if(r==this)return!0;if(r.primIndex!=this.primIndex||r.ranges.length!=this.ranges.length)return!1;for(var e=0;e<this.ranges.length;e++){var t=this.ranges[e],i=r.ranges[e];if(0!=n.compare(t.anchor,i.anchor)||0!=n.compare(t.head,i.head))return!1}return!0},deepCopy:function(){for(var r=[],e=0;e<this.ranges.length;e++)r[e]=new t(copyPos(this.ranges[e].anchor),copyPos(this.ranges[e].head));return new i(r,this.primIndex)},somethingSelected:function(){for(var r=0;r<this.ranges.length;r++)if(!this.ranges[r].empty())return!0;return!1},contains:function(r,e){e||(e=r);for(var t=0;t<this.ranges.length;t++){var i=this.ranges[t];if(n.compare(e,i.from())>=0&&n.compare(r,i.to())<=0)return t}return-1}});return i.normalize=function(r,e,a){let o=e[a];e.sort((r,e)=>n.compare(r.from(),e.from())),a=arrays.indexOf(e,o);for(let i=1;i<e.length;i++){let o=e[i],s=e[i-1],h=n.compare(s.to(),o.from());if(r&&!o.empty()?h>0:h>=0){let r=n.min(s.from(),o.from()),h=n.max(s.to(),o.to()),f=s.empty()?o.from()==o.head:s.from()==s.head;i<=a&&--a,e.splice(--i,2,new t(f?h:r,f?r:h))}}return new i(e,a)},i.simple=function(r,e){return new i([new t(r,e||r)],0)},e.Selection=i});
//# sourceMappingURL=sourcemaps/selection.js.map
