import {CLASSES,COMMON} from './engine.mjs';
const skillName=(key,id)=>[...CLASSES[key].skills,...COMMON].find(s=>s.id===id)?.name??'招式';
export function battleRecap(record){
 const actors=record.review.actors,rounds=new Map();
 for(const e of record.review.events??[]){const row=rounds.get(e.round)??{round:e.round,damage:[0,0],healing:[0,0],details:[],weight:0};rounds.set(e.round,row);const who=e.seat===0?'你':'对手',name=skillName(actors[e.seat].key,e.skillId);
  if(e.type==='hit'){row.damage[e.seat]+=e.damage;row.weight+=e.damage;if(e.damage>=25)row.details.push(`${who}的${name}造成 ${e.damage} 气血伤害`);}
  if(e.type==='action'&&e.healing){row.healing[e.seat]+=e.healing;row.weight+=e.healing*.5;}
  if(['released','interrupted','rangeMiss','canceled'].includes(e.type)){row.weight+=35;row.details.push(`${who}${{released:'释放',interrupted:'被打断',rangeMiss:'因距离落空',canceled:'取消'}[e.type]}${e.type==='canceled'?'蓄势':`「${name}」`}`);}
 }
 const highlights=[...rounds.values()].sort((a,b)=>b.weight-a.weight||a.round-b.round).slice(0,3).sort((a,b)=>a.round-b.round).map(r=>({...r,text:r.details.slice(0,3).join('；')||`招式气血伤害 ${r.damage[0]} : ${r.damage[1]}，恢复 ${r.healing[0]} : ${r.healing[1]}`}));
 const tips=[];const p=actors[0];if(p.charges.interrupted)tips.push(`你的蓄势被打断 ${p.charges.interrupted} 次，下次留意对手已装备的打断招式。`);if(p.charges.rangeMiss)tips.push(`你的蓄势因距离落空 ${p.charges.rangeMiss} 次，启动前确认有效距离与对手移动余量。`);if(p.overheal)tips.push(`恢复溢出 ${p.overheal} 气血，可以比较提前进攻与稍后恢复的机会。`);if(p.unusedAP>=3)tips.push(`合计闲置 ${p.unusedAP} 行动，检查是否还有合法的调息、移动或直接进攻。`);if(!tips.length)tips.push('结合关键回合与双方招式使用次数，比较准备投入和实际兑现。');
 return {highlights,tips:tips.slice(0,3),usage:actors.map(a=>Object.entries(a.actions).map(([id,count])=>({id,name:skillName(a.key,id),count})).sort((a,b)=>b.count-a.count))};
}
