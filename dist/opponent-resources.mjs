import {payment} from './engine.mjs';

// Replay the frozen sequence with real payment order, refunds, caps and movement.
// Incoming reactions are excluded here: this helper isolates the budget change
// caused by spending qi on the defender's response to the current player hit.
export function planBudget(b,qi=b.enemy.qi){
 return b.planBudget(qi);
}
export function reactionBudgetConflict(b,cost){
 const qi=payment(b.enemy.qi,cost);if(!qi)return [];
 const before=planBudget(b).failures,after=planBudget(b,qi).failures;
 const counts=new Map();for(const id of before)counts.set(id,(counts.get(id)||0)+1);return after.filter(id=>{const n=counts.get(id)||0;if(n){counts.set(id,n-1);return false;}return true;});
}
