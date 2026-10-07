import {Battle,CLASSES,burnBonus,COMMON,total,payment} from './engine.mjs';
import {startPreparedPhase,finishPreparedPhase} from './prepared.mjs';
import {chooseReaction} from './auto.mjs';

// Planning uses public board state only. All simulations are isolated and the
// selected sequence stays frozen throughout the actual player/enemy phases.
function settleReaction(c){
 if(c.result||c.phase!=='reaction'||!c.pending)return;
 const net=c.healthDamage(c.damage(c.enemy,c.pending.s,c.pending.raw,1,c.player),c.player.shield,c.pending.s);
 const response=c.simulateEvade&&net>=18&&payment(c.player.qi,{any:2})?'evade':chooseReaction(c,'balanced').response;
 c.react(response);
}
function clone(b){
 const {logs,stats,events,attack,act,endTurn,release,reactionDecision,...state}=b;
 const c=Object.assign(Object.create(Battle.prototype),structuredClone(state),{logs:[]});
 // Keep the real NPC's threshold, lethal defense and announced-plan budget.
 // Player responses are public, legal scenarios, not the player's next input.
 // Non-enumerable methods keep planBudget's normal data-only clone intact.
 Object.defineProperties(c,{
  reactionDecision:{value:reactionDecision??b.reactionDecision},
  act:{value:function(a,id){const result=Battle.prototype.act.call(this,a,id);settleReaction(this);return result;}},
  endTurn:{value:function(){const result=Battle.prototype.endTurn.call(this);settleReaction(this);return result;}},
  release:{value:function(a){Battle.prototype.release.call(this,a);settleReaction(this);}},
 });
 return c;
}
function value(start,c,id){const a=c.enemy,e=c.player,p=start.enemy,q=start.player;if(c.result==='lose')return 10000;if(c.result==='win')return -10000;const weights={cold:{hp:1,shield:.3,intent:0,seed:0,burn:4},tidal:{hp:1.1,shield:.45,intent:0,seed:0,burn:4},fierce:{hp:.85,shield:.3,intent:0,seed:0,burn:5},quick:{hp:.7,shield:.18,intent:7,seed:0,burn:3},heavy:{hp:1.35,shield:.65,intent:7,seed:0,burn:3},ignite:{hp:.7,shield:.2,intent:0,seed:5,burn:6},sustain:{hp:1.3,shield:.3,intent:0,seed:4,burn:5},symbiosis:{hp:1.25,shield:.35,intent:0,seed:0,burn:4},parasitic:{hp:.95,shield:.3,intent:0,seed:0,burn:4},bastion:{hp:1.4,shield:.6,intent:0,seed:0,burn:4},mountain:{hp:.95,shield:.3,intent:0,seed:0,burn:4}}[id];return (q.hp-e.hp)*1.8+(a.hp-p.hp)*weights.hp+(a.shield-p.shield)*weights.shield+(a.intent-p.intent)*weights.intent+(e.seed-q.seed)*weights.seed+(e.burn-q.burn)*weights.burn-(a.burn-p.burn)*6+(Number(e.broken)-Number(q.broken))*7+(Number(a.edge)-Number(p.edge))*7+((a.tide??0)-(p.tide??0))*4+(total(a.qi)-total(p.qi))*.7+((a.growth??0)-(p.growth??0))*12+(Number(Boolean(a.growthPending))-Number(Boolean(p.growthPending)))*12+((e.parasite??0)-(q.parasite??0))*(id==='parasitic'?8:4)+((a.terrain??0)-(p.terrain??0))*(id==='mountain'?10:7)-(a.parasite??0)*5;}
function available(c,a){return [...c.skills(a),...COMMON].filter(s=>!c.legal(a,s.id)&&!(s.kind==='heal'&&a.hp===a.maxHp&&(!a.burn||!s.clearBurn))&&!(s.kind==='purify'&&!a.burn)&&!(s.kind==='seed'&&c.other(a).seed>=5)&&!(s.id==='expose'&&c.other(a).broken)&&!(s.interrupt&&s.id!=='lunge'&&!c.other(a).charge)&&!(s.kind==='guard'&&a.shield>=44)&&!(s.id==='meditate'&&total(a.qi)>=7));}
function woodCounterValue(start,c){
 if(start.enemy.key!=='wood')return 0;
 // The same preparation values used for the NPC must also price a legal
 // player counter. Removing the final growth cancels its pending maturity.
 return ((start.enemy.growth??0)-(c.enemy.growth??0))*12
  +(Number(Boolean(start.enemy.growthPending))-Number(Boolean(c.enemy.growthPending)))*12
  +((start.player.parasite??0)-(c.player.parasite??0))*(start.enemy.major==='parasitic'?8:4);
}
function playerPressure(b,mode){const c=clone(b);c.phase='player';c.pending=null;
 if(mode==='retreat'&&c.distance<2&&c.player.ap>0&&!c.legal(c.player,'far'))c.act(c.player,'far');
 if(mode==='counter'){
  // Every candidate must survive a whole legal player combination, not just a greedy
  // first hit. Compare all candidates against the same bounded full-AP response.
  const start=clone(c),score=x=>{if(x.result==='win')return 10000;if(x.result==='lose')return -10000;let v=(start.enemy.hp-x.enemy.hp)*1.3+(x.player.hp-start.player.hp)*1.1+(x.player.shield-start.player.shield)*.25+(x.player.intent-start.player.intent)*7+(x.enemy.seed-start.enemy.seed)*5+(x.enemy.burn-start.enemy.burn)*6+(Number(x.enemy.broken)-Number(start.enemy.broken))*8+(start.player.burn-x.player.burn)*6+woodCounterValue(start,x);if(mode!=='attack'){if(!x.enemy.charge)v+=65;else if(!x.enemy.charge.range.includes(x.distance))v+=75;}if(x.player.charge)v+=22;return v;};
  let beam=[c],best=c,bestScore=score(c);
  for(let depth=0;depth<3;depth++){
   const next=[];for(const state of beam){if(state.result||!state.player.ap)continue;for(const s of available(state,state.player)){const x=clone(state);if(!x.act(x.player,s.id).ok)continue;const v=score(x);if(v>bestScore){best=x;bestScore=v;}next.push({x,v});}}
   beam=next.sort((a,b)=>b.v-a.v).slice(0,6).map(n=>n.x);if(!beam.length)break;
  }
  Object.assign(c,best);if(!c.result)c.endTurn();return c;
 }
 for(let n=0;n<3&&c.player.ap>0&&!c.result;n++){
  let best=null,score=0;for(const s of available(c,c.player)){const x=clone(c);if(!x.act(x.player,s.id).ok)continue;let v=(c.enemy.hp-x.enemy.hp)*1.3+(x.player.hp-c.player.hp)*1.1+(x.player.shield-c.player.shield)*.25+(x.player.intent-c.player.intent)*7+(x.enemy.seed-c.enemy.seed)*5+(x.enemy.burn-c.enemy.burn)*6+(Number(x.enemy.broken)-Number(c.enemy.broken))*8+woodCounterValue(c,x);
   if(mode!=='attack'&&c.enemy.charge&&!x.enemy.charge)v+=65;if(s.kind==='charge')v+=22;if(s.id==='near'&&c.distance===2&&c.player.key==='sword')v+=24;if(mode!=='attack'&&s.kind==='move'&&c.enemy.charge&&!c.enemy.charge.range.includes(x.distance))v+=75;else if(mode!=='attack'&&s.id==='near'&&c.enemy.charge&&c.distance===2)v+=35;if(s.id==='meditate')v+=total(c.player.qi)<3?16:1;if(v>score){best=x;score=v;}}
  if(!best)break;Object.assign(c,best);
 }
 if(!c.result)c.endTurn();return c;
}
function execute(b,path){
 const c=clone(b);c.phase='enemy';c.enemyPlan=[...path];c.enemyQueue=[...path];
 // Run the real fixed queue, including paid movement and public fallback.
 // Stop at this phase boundary; afterResponse owns the next-round horizon.
 Object.defineProperty(c,'beginRound',{value:()=>{},configurable:true});
 for(let n=0;n<4&&!c.result;n++)if(!Battle.prototype.enemyStep.call(c))break;
 delete c.beginRound;return c;
}
function afterResponse(b,mode='counter'){const c=clone(b);if(c.result)return c;c.beginRound();if(c.result)return c;return playerPressure(c,mode);}
const cache=new Map();
const planningKey=(b,id,queue=b.enemyQueue??[],plan=b.enemyPlan??[])=>JSON.stringify([id,b.round,b.distance,b.player,b.enemy,queue,plan]);
export function planQuestioning(b,id){
 const cacheKey=planningKey(b,id);if(cache.has(cacheKey))return structuredClone(cache.get(cacheKey));
 const scenarios=[playerPressure(b,'attack'),playerPressure(b,'retreat')],base=clone(b);scenarios[1].simulateEvade=true;base.phase='enemy';base.pending=null;startPreparedPhase(base,base.enemy);base.tickBurn(base.enemy);if(!base.result&&base.enemy.charge)base.release(base.enemy);
 const candidates=new Map();function search(c,path){candidates.set(path.join(','),path);if(path.length>=3||c.enemy.ap===0||c.result)return;for(const s of available(c,c.enemy)){if(s.kind==='guard'&&path.includes(s.id))continue;if(s.id==='purify'&&(c.enemy.burn<2||c.enemy.hp>c.enemy.maxHp-12))continue;if(['heal','purify'].includes(s.kind)&&path.some(id=>['heal','nourish','purify'].includes(id)))continue;const x=clone(c);if(x.act(x.enemy,s.id).ok)search(x,[...path,s.id]);}}
 if(['wood','earth'].includes(b.enemy.key)){
  // Three AP, three roots and a 24-state beam bound the prepared NPC search.
  // Preserve public charges and pending cultivation even before they pay out.
  for(const root of [base,...scenarios]){let beam=[{c:clone(root),path:[]}];for(let depth=0;depth<3;depth++){const next=[];for(const {c,path} of beam){candidates.set(path.join(','),path);if(c.result||!c.enemy.ap)continue;for(const s of available(c,c.enemy)){if(s.kind==='guard'&&path.includes(s.id))continue;const x=clone(c);if(x.act(x.enemy,s.id).ok){const p=[...path,s.id];candidates.set(p.join(','),p);next.push({c:x,path:p,score:value(b,x,id)+(x.enemy.charge?70:0)});}}}beam=next.sort((a,z)=>z.score-a.score).slice(0,24);}}
 }else{search(base,[]);for(const s of scenarios)if(!s.result)search(clone(s),[]);}
 const ranked=[...candidates.values()].map(path=>{const leaves=scenarios.map(s=>execute(s,path));const values=leaves.map(c=>value(b,c,id));const score=Math.min(...values)*.65+values.reduce((a,x)=>a+x,0)/values.length*.35+value(b,execute(base,path),id)*.12-path.length*.12;return {path,leaves,score};}).sort((a,c)=>c.score-a.score);
 // A charge has not released at this first horizon. Keep its best candidates
 // for the full counterplay horizon rather than discarding them for no damage.
 const shortlist=new Map(ranked.slice(0,16).map(c=>[c.path.join(','),c]));
 for(const c of ranked.filter(c=>c.path.some(id=>base.skill(base.enemy,id).kind==='charge')).slice(0,4))shortlist.set(c.path.join(','),c);
 const shortlisted=[...shortlist.values()];
 let best=[],bestScore=-Infinity;for(const {path,leaves} of shortlisted){
  const scores=leaves.map(leaf=>{const counter=value(b,afterResponse(leaf,'counter'),id),direct=leaf.enemy.charge?value(b,afterResponse(leaf,'attack'),id):counter;return counter*.65+direct*.35+value(b,leaf,id)*.3;});const score=Math.min(...scores)*.65+scores.reduce((a,x)=>a+x,0)/scores.length*.35-path.length*.12;
  if(score>bestScore){bestScore=score;best=path;}
 }
 const result=best.map((skillId,index)=>({id:skillId,reason:['unity','inferno','mountain'].includes(skillId)?'蓄势占用两行动，已比较下一次敌方反制与释放收益，按预告寻找爆发窗口。':skillId==='far'&&best.slice(0,index).some(id=>['unity','inferno'].includes(id))?'蓄势后拉到远距，增加贴近化解所需的行动。':skillId==='guard'&&best.includes('unity')?'蓄势前后护体承接，保留下一阶段的释放机会。':({cold:'比较凝霜、逐浪与直接进攻，凝滞消费后不再共用。',tidal:'比较纳潮后的进攻、防护与回潮，储备与行动有限。',fierce:'比较连续火法、灼烧兑现和御火留气，按公开预告施压。',quick:'兼顾接近成本和后续追击，按预告压制。',heavy:'估量承接后的反击收益，留出应对与出剑的资源。',ignite:'比较种灵引爆与直接施压，留意打断和距离风险。',sustain:'兼顾受伤后的恢复与持续火法，不把行动全用在回血。',symbiosis:'比较跨阶段成熟后的进攻、护体和恢复，同一生长不能重复收获。',parasitic:'比较寄藤维护、目标施法侵蚀与噬藤兑现，留意分类净化和射程。',bastion:'比较筑垒后的防守与反击，追击会损失自己的地势。',mountain:'比较地势准备、镇岳释放与退远反制，两行动蓄势不能临时替换。'})[id]}));
 // The new public sequence is part of future defense-budget inputs. Repeated
 // reads after publishing that same sequence still return its frozen choice.
 const published=result.map(c=>c.id);
 for(const key of new Set([cacheKey,planningKey(b,id,published,published)])){if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,result);}
 return structuredClone(result);
}
