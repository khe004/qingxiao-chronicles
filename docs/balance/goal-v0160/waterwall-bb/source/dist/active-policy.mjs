// Public conditional fallback shared by actual turns and forecasts. No hidden queue.
export const AI_POLICY='超距先调整距离；缺气可调息或改用合法低耗招；安全普攻收尾。蓄势与反伤危险时可留气，纪要说明原因。';
const total=a=>Object.values(a.qi).reduce((n,x)=>n+x,0);
function atDistance(b,a,s,d){const shadow={...a,terrain:Math.max(0,(a.terrain??0)-(a.key==='earth'?Math.abs(d-b.distance):0))};const c=Object.assign(Object.create(Object.getPrototypeOf(b)),b,{distance:d,player:a===b.player?shadow:b.player,enemy:a===b.enemy?shadow:b.enemy});return !c.legal(shadow,s.id);}
export function activeFallback(b,a,{blockedId=null}={}){
 const e=b.other(a),legal=id=>!b.legal(a,id),skills=b.skills(a),isHit=s=>['attack','force'].includes(s.kind)&&s.power;
 if(!a.ap||b.result)return {reason:'行动点已用尽。'};
 if(a.charge){
  if(!a.charge.range.includes(b.distance)){const d=[...a.charge.range].sort((x,y)=>Math.abs(x-b.distance)-Math.abs(y-b.distance))[0],id=d<b.distance?'near':'far';if(legal(id))return {id,reason:`调整距离，保住「${a.charge.name}」的释放范围。`};}
  const guard=skills.find(s=>s.kind==='guard'&&a.shield<30&&legal(s.id));if(guard&&(!a.reaction||Object.values(guard.cost).reduce((n,x)=>n+x,0)<total(a)-1))return {id:guard.id,reason:'蓄势期间护体，保留释放机会。'};
  if(legal('meditate'))return {id:'meditate',reason:'利用蓄势余下行动补气，留给应对与下一阶段。'};
  return {reason:`「${a.charge.name}」等待下次自身行动释放，当前灵气已满或无合适护体；不强行移动。`};
 }
 // A defender killed by this hit cannot retaliate. Only call this certain
 // when it has no reaction opportunity or no qi to pay any response.
 const finishers=[...skills,b.skill(a,'basic')].filter(s=>s&&isHit(s)&&legal(s.id)&&(!e.reaction||total(e)===0)&&b.healthDamage(b.damage(a,s),e.shield,s)>=e.hp).sort((x,y)=>x.ap-y.ap||Object.values(x.cost).reduce((n,q)=>n+q,0)-Object.values(y.cost).reduce((n,q)=>n+q,0));
 if(finishers[0])return {id:finishers[0].id,reason:'对手已无付费应对，这一击可以结束斗法；倒下后不会再触发反伤。'};
 if(e.charge){const interrupt=skills.find(s=>s.interrupt&&legal(s.id));if(interrupt)return {id:interrupt.id,reason:`按备用策略打断「${e.charge.name}」。`};const escape=['near','far'].find(id=>legal(id)&&!e.charge.range.includes(b.distance+b.skill(a,id).delta));if(escape)return {id:escape,reason:'按备用策略退离已公开蓄势范围。'};}
 const blocked=b.skill(a,blockedId);
 // Full preparation extends these harvests to far range. Partial preparation
 // still permits a paid move to mid range; this is not missing preparation.
 if(blocked?.farPrep&&b.distance===2&&b.legal(a,blockedId)==='远距收获需要对应准备满3层'){
  if(a.ap>=blocked.ap+1&&legal('near')&&atDistance(b,a,blocked,1))return {id:'near',retry:true,reason:`「${blocked.name}」准备未满3层，先接近再按预告收获；移动消耗行动，收获仍需付费。`};
 }
 if(blocked&&b.legal(a,blockedId)==='距离不适合'){
  const d=blocked.range.toSorted((x,y)=>Math.abs(x-b.distance)-Math.abs(y-b.distance))[0],steps=Math.abs(d-b.distance),id=d<b.distance?'near':'far';
  if(a.ap>=steps+blocked.ap&&legal(id)&&atDistance(b,a,blocked,d))return {id,retry:true,reason:`「${blocked.name}」超距，先${id==='near'?'接近':'拉开'}再施展；移动同样付行动。`};
 }
 // Prefer a meaningful move+equipped attack over three weak distant basics.
 if(a.ap>=2){const out=skills.filter(s=>isHit(s)&&b.legal(a,s.id)==='距离不适合').find(s=>s.range.some(d=>Math.abs(d-b.distance)===1&&a.ap>=s.ap+1&&atDistance(b,a,s,d))&&b.damage(a,s)>b.damage(a,b.skill(a,'basic'))+12);if(out){const d=out.range.find(d=>Math.abs(d-b.distance)===1&&atDistance(b,a,out,d)),id=d<b.distance?'near':'far';if(legal(id))return {id,reason:`调整距离，为「${out.name}」创造合法出手机会。`};}}
 if(legal('meditate')&&total(a)<4&&a.ap>=2)return {id:'meditate',reason:'灵气不足，先调息再出招，补气占用行动。'};
 const ranked=[...skills,b.skill(a,'basic')].filter(s=>s&&isHit(s)&&legal(s.id)).map(s=>{
  const d=b.damage(a,s),reflected=e.counter?b.damage(e,{id:'reflection',element:e.counter.element,damageType:'magical'},Math.min(d,e.counter.power),1,a):0;
  const healthLoss=b.healthDamage(reflected,a.shield),shieldLoss=reflected-healthLoss;
  // Reflection uses the same armor, element and shield rules as a real hit.
  // Spending shield is still a cost, but absorbing it is not losing health.
  const score=healthLoss>=a.hp?-Infinity:b.healthDamage(d,e.shield,s)+(d-b.healthDamage(d,e.shield,s))*.35-healthLoss*1.25-shieldLoss*.35-Object.values(s.cost).reduce((n,x)=>n+x,0)*2;
  return {s,score};
 }).sort((x,y)=>y.score-x.score);
 if(ranked[0]?.score>0)return {id:ranked[0].s.id,reason:ranked[0].s.id==='basic'?'无需灵气的安全普攻收尾，保留灵气到下回合。':'按备用策略改用已装备、费用与射程合法的招式。'};
 if(legal('meditate')&&total(a)<10)return {id:'meditate',reason:'当前反伤收益不利，调息储气，避免无意义消耗。'};
 return {reason:e.counter?`对手有${e.counter.hits}次有限反伤准备；当前进攻收益不足，存气等待准备到期。`:'当前无可兑现的合法行动，保留灵气与准备到下一阶段。'};
}
export function activePlayerChoice(b){const c=activeFallback(b,b.player);return c.id?{action:'skill',skillId:c.id,reason:c.reason}:{action:'end',reason:c.reason};}
