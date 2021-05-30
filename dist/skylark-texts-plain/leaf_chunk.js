/**
 * skylark-texts-plain - The skylarkjs plain utility Library.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["skylark-langx/Evented","./plain"],function(n,i){var e=n.inherit({klassName:"LeafChunk",_construct:function(n){this.lines=n,this.parent=null;for(var i=0,e=0;i<n.length;++i)n[i].parent=this,e+=n[i].height;this.height=e},chunkSize:function(){return this.lines.length},removeInner:function(n,i){for(var e=n,t=n+i;e<t;++e){var s=this.lines[e];this.height-=s.height,s.cleanUpLine(),this.emit("delete",s)}this.lines.splice(n,i)},collapse:function(n){n.push.apply(n,this.lines)},insertInner:function(n,i,e){this.height+=e,this.lines=this.lines.slice(0,n).concat(i).concat(this.lines.slice(n));for(var t=0;t<i.length;++t)i[t].parent=this},iterN:function(n,i,e){for(var t=n+i;n<t;++n)if(e(this.lines[n]))return!0}});return i.LeafChunk=e});
//# sourceMappingURL=sourcemaps/leaf_chunk.js.map
