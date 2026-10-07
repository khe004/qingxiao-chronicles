import assert from 'node:assert/strict';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {activeFallback} from './dist/active-policy.mjs';
import {reactionBudgetConflict} from './dist/opponent-resources.mjs';
import {loadForecastModel} from './scripts/forecast-audit.mjs';
const {projectEnemyPhase,chooseReaction}=await loadForecastModel();
const cases=[['symbiosis','bloomstrike','growth'],['parasitic','reap','parasite']];let count=0;
function setup(id,skill,prep,n,ap=3){const b=new ChallengeBattle('flame',{},id,{distance:2});b.phase='enemy';b.enemy.qi.wood=2;b.enemy.qi.any=0;b.enemy.ap=ap;b.enemy.growth=0;b.enemy.growthPending=false;b.player.parasite=0;b.player.parasiteTurns=2;(prep==='growth'?b.enemy:b.player)[prep]=n;b.enemyPlan=[skill];b.enemyQueue=[skill];return b;}
for(const [id,skill,prep]of cases)for(const n of [1,2])for(const ap of [2,3]){
 const b=setup(id,skill,prep,n,ap),frozen=JSON.stringify(b);assert.deepEqual(activeFallback(b,b.enemy,{blockedId:skill}).id,'near');assert.equal(JSON.stringify(b),frozen);const plan=[...b.enemyPlan];assert.ok(b.enemyStep());assert.equal(b.distance,1);assert.equal(b.enemy.ap,ap-1);assert.deepEqual(b.enemyPlan,plan);assert.deepEqual(b.enemyQueue,[skill]);assert.equal((prep==='growth'?b.enemy:b.player)[prep],n);assert.ok(b.enemyStep());assert.equal(b.stats[1].actions[skill],1);assert.equal((prep==='growth'?b.enemy:b.player)[prep],0);assert.equal(b.enemy.qi.wood,0);assert.equal(b.stats[1].movement,1);count++;
}
for(const [id,skill,prep]of cases){
 for(const n of [0,1,2,3])for(const ap of [1,2,3]){
  const b=setup(id,skill,prep,n,ap),frozen=JSON.stringify(b),fix=activeFallback(b,b.enemy,{blockedId:skill});assert.equal(JSON.stringify(b),frozen);
  assert.equal(Boolean(fix.retry),n>0&&n<3&&ap>=2,`${id}/${n}/${ap}`);
  if(n===3){assert.equal(b.legal(b.enemy,skill),null);assert.ok(b.enemyStep());assert.equal(b.distance,2);assert.equal(b.stats[1].actions.near??0,0);}
  if(n===0||ap===1)assert.equal(fix.retry,undefined);
  count++;
 }
 const noQi=setup(id,skill,prep,1);noQi.enemy.qi.wood=1;assert.equal(activeFallback(noQi,noQi.enemy,{blockedId:skill}).retry,undefined);
 const budget=setup(id,skill,prep,1),frozen=JSON.stringify(budget);assert.deepEqual(budget.planBudget().failures,[]);assert.deepEqual(reactionBudgetConflict(budget,{wood:1}),[skill]);assert.equal(JSON.stringify(budget),frozen);
 const noPrep=setup(id,skill,prep,0);assert.deepEqual(reactionBudgetConflict(noPrep,{wood:1}),[]);
 const noAP=setup(id,skill,prep,1,1);assert.deepEqual(reactionBudgetConflict(noAP,{wood:1}),[]);
 // Real player-counter phase and its public forecast must both repair the
 // fixed partial harvest. Player owns the start boundary; no new preview.
 const live=setup(id,skill,prep,1);live.phase='player';live.player.ap=0;live.enemy.growthPending=false;
 const predicted=projectEnemyPhase(live,'balanced'),actual=Object.assign(Object.create(ChallengeBattle.prototype),structuredClone(live));actual.endTurn();for(let step=0;!actual.result&&actual.phase!=='player';step++){assert.ok(step<12);if(actual.phase==='reaction')actual.react(chooseReaction(actual,'balanced').response);else actual.enemyStep();}
 for(const key of ['player','enemy','distance','round','result','phase','stats'])assert.deepEqual(predicted[key],actual[key],`${id} forecast ${key}`);
}
console.log(`Prepared range: ${count} partial/full/zero preparation and AP cases, paid movement/harvest, frozen main preview, colored-qi reservation, no false reserve without prep/AP, and real-versus-public-forecast phase fields passed.`);
