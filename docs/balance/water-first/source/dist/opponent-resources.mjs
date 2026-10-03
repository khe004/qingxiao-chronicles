import {Battle,payment} from './engine.mjs';

// Replay the frozen sequence with real payment order, refunds, caps and movement.
// Incoming reactions are excluded here: this helper isolates the budget change
// caused by spending qi on the defender's response to the current player hit.
export function planBudget(b,qi=b.enemy.qi){
 const {logs,stats,attack,...state}=b;
 const c=Object.assign(Object.create(Battle.prototype),structuredClone(state),{logs:[]});
 c.phase='enemy';c.pending=null;c.result=null;c.enemy.qi={...qi};c.player.hp=c.player.maxHp=1000000;
 c.attack=function(a,s,raw){this.resolveAttack(a,s,raw);};
 if(c.enemy.charge)c.release(c.enemy);
 const failures=[];
 for(const id of b.enemyQueue??b.enemyPlan??[]){
  if(c.result)break;
  const error=c.legal(c.enemy,id);
  if(error){if(error==='所需灵气不足')failures.push(id);continue;}
  c.act(c.enemy,id);
 }
 return {failures,qi:{...c.enemy.qi}};
}
export function reactionBudgetConflict(b,cost){
 const qi=payment(b.enemy.qi,cost);if(!qi)return [];
 const before=planBudget(b).failures,after=planBudget(b,qi).failures;
 const counts=new Map();for(const id of before)counts.set(id,(counts.get(id)||0)+1);return after.filter(id=>{const n=counts.get(id)||0;if(n){counts.set(id,n-1);return false;}return true;});
}
