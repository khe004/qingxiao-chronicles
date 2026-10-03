import {CLASSES,COMMON,payment} from '../dist/engine.mjs';
export const COUNTERS=['interrupt','movement','shield','rush'];
export function directChoice(b,route='rush'){
 const a=b.player,e=b.enemy;if(!a.ap)return {action:'end'};
 if(e.charge){
  if(route==='interrupt'){
   const counter=b.skills(a).filter(s=>s.interrupt&&!b.legal(a,s.id)).sort((x,y)=>b.preview(y)-b.preview(x))[0];
   if(counter)return {skillId:counter.id};
   if(b.distance===2&&a.ap>=2&&!b.legal(a,'near'))return {skillId:'near'};
  }
  if(route==='movement'&&e.charge.range.includes(b.distance)&&!b.legal(a,'near'))return {skillId:'near'};
  if(route==='shield'&&a.shield<44&&!a.usedSkills.includes('guard')&&!b.legal(a,'guard'))return {skillId:'guard'};
 }
 if(a.key==='sword'&&b.distance===2&&!b.legal(a,'near'))return {skillId:'near'};
 if(!(e.charge&&route==='rush')&&a.burn>=2&&!b.legal(a,'purify'))return {skillId:'purify'};
 if(!(e.charge&&route==='rush')&&a.hp<a.maxHp*.5&&!b.legal(a,'heal'))return {skillId:'heal'};
 const moves=[...b.skills(a),...COMMON].filter(s=>!b.legal(a,s.id)&&!(s.interrupt&&s.id!=='lunge'&&route!=='interrupt')&&!(s.kind==='move'&&e.charge&&route==='shield')&&!(s.kind==='guard'&&route!=='shield'));
 const ranked=moves.map(s=>({id:s.id,v:e.charge&&route==='rush'?(s.kind==='attack'?b.preview(s):s.kind==='meditate'?1:0):s.power?b.preview(s)+(s.interrupt&&e.charge&&route==='interrupt'?65:0)+(s.burn??0)*4:s.kind==='charge'?38:s.kind==='seed'&&e.seed<2?30:s.kind==='guard'&&a.shield<22?18:s.kind==='meditate'?15:0})).sort((a,c)=>c.v-a.v);
 return ranked[0]?.v>0?{skillId:ranked[0].id}:{action:'end'};
}
export function counterReaction(b,route){const a=b.player,k=CLASSES[a.key].reactionElement;if(route==='shield'&&a.qi[k])return 'shield';return 'none';}
