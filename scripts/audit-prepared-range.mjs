import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const [source,out]=process.argv.slice(2);assert.ok(source&&out);const root=pathToFileURL(resolve(source)+'/');
const {ChallengeBattle}=await import(new URL('dist/challenge-battle.mjs',root)),{chooseReaction}=await import(new URL('dist/auto.mjs',root)),{activeFallback}=await import(new URL('dist/active-policy.mjs',root)),{reactionBudgetConflict}=await import(new URL('dist/opponent-resources.mjs',root));
const rows=[];
for(const [opponentId,skill,prep]of [['symbiosis','bloomstrike','growth'],['parasitic','reap','parasite']])for(const [n,ap,wood]of [[1,3,2],[2,3,2],[0,3,2],[3,3,2],[1,1,2],[1,3,1]]){
 const b=new ChallengeBattle('flame',{},opponentId,{distance:2});b.phase='enemy';b.enemy.ap=ap;b.enemy.qi.wood=wood;b.enemy.qi.any=0;b.enemy.growth=0;b.enemy.growthPending=false;b.player.parasite=0;b.player.parasiteTurns=2;(prep==='growth'?b.enemy:b.player)[prep]=n;b.enemyPlan=[skill];b.enemyQueue=[skill];
 const frozen=JSON.stringify(b),fix=activeFallback(b,b.enemy,{blockedId:skill}),budget=b.planBudget(),conflict=reactionBudgetConflict(b,{wood:1});assert.equal(JSON.stringify(b),frozen);let finished=false;Object.defineProperty(b,'beginRound',{value:()=>{finished=true;}});
 for(let steps=0;!finished&&!b.result;steps++){assert.ok(steps<12);if(b.phase==='reaction')assert.ok(b.react(chooseReaction(b,'balanced').response).ok);else b.enemyStep();}
 rows.push({id:`${opponentId}/${n}/${ap}/${wood}`,opponentId,skill,prep,n,ap,wood,input:JSON.parse(frozen),fix,budget,conflict,actions:b.stats[1].actions,unusedAP:b.enemy.ap,hp:[b.player.hp,b.enemy.hp],player:b.player,enemy:b.enemy,plan:b.enemyPlan,queue:b.enemyQueue,logs:b.logs});
}
await mkdir(out,{recursive:true});await writeFile(`${out}/range-audit.json`,JSON.stringify(rows,null,2));console.log(rows.map(r=>({id:r.id,first:r.fix.id,retry:r.fix.retry,actions:r.actions,conflict:r.conflict})));
