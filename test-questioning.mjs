import assert from 'node:assert/strict';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {planOpponent} from './dist/opponents.mjs';
import {loadForecastModel} from './scripts/forecast-audit.mjs';
import {chooseAction} from './dist/auto.mjs';
import {Trial,recordText} from './dist/trial.mjs';
for(const id of ['quick','heavy','ignite','sustain']){
 const b=new ChallengeBattle('sword',{},id,{difficulty:'questioning'}),easy=new ChallengeBattle('sword',{},id);assert.equal(b.enemy.hp,easy.enemy.hp);assert.deepEqual(b.enemy.qi,easy.enemy.qi);assert.deepEqual(b.enemy.skillIds,easy.enemy.skillIds);
 const state=JSON.stringify(b);assert.deepEqual(planOpponent(b,id).map(c=>c.id),b.enemyPlan);assert.equal(JSON.stringify(b),state);chooseAction(b);assert.equal(JSON.stringify(b),state);
 const plan=[...b.enemyPlan];b.act(b.player,'far');assert.deepEqual(b.enemyPlan,plan);b.endTurn();while(b.phase!=='player'&&!b.result){if(b.phase==='reaction')b.react('none');else{const frozen=[...b.enemyPlan];b.enemyStep();if(b.phase!=='player'&&!b.result)assert.deepEqual(b.enemyPlan,frozen);}}
 assert.equal(b.difficulty,'questioning');assert.ok(!b.forecastOnly);
}
const t=new Trial();t.start('fire','questioning');const b=new ChallengeBattle('fire',{},'ignite',{difficulty:'questioning'});t.begin();const r=t.archive(b,{abandoned:true});assert.equal(r.difficulty,'questioning');assert.ok(recordText(r).includes('问道'));t.retry();assert.equal(t.difficulty,'questioning');
assert.throws(()=>new ChallengeBattle('sword',{},'quick',{difficulty:'unknown'}));assert.throws(()=>t.start('fire','unknown'));
console.log('Questioning: equal resources/loadouts, isolated cached planning and auto forecast, frozen previews after player movement, difficulty archives/retry and invalid options verified.');

// Compare combat fields at the same next-player horizon. Only the unused next
// enemy preview is intentionally omitted from automatic score projections.
const {projectEnemyPhase,chooseReaction}=await loadForecastModel();
for(const id of ['quick','heavy','ignite','sustain']){
 const original=new ChallengeBattle('fire',{},id,{difficulty:'questioning'});
 const actual=Object.assign(Object.create(ChallengeBattle.prototype),structuredClone(original));
 const predicted=projectEnemyPhase(original,'balanced');actual.endTurn();while(!actual.result&&actual.phase!=='player'){if(actual.phase==='reaction')actual.react(chooseReaction(actual).response);else actual.enemyStep();}
 for(const k of ['player','enemy','distance','round','result','phase','stats'])assert.deepEqual(predicted[k],actual[k],`questioning forecast ${id} ${k}`);
}
// An equipped interrupt converts a charge into a real attack window; movement
// also works but costs two AP when the same threat starts at far range.
for(const key of ['sword','fire']){
 const id=key==='sword'?'cut':'vine',charged=new ChallengeBattle(key,{},'heavy',{distance:2,difficulty:'questioning'});charged.enemy.charge={...charged.skill(charged.enemy,'unity'),storedPower:110};charged.enemyPlan=[];charged.enemyQueue=[];
 assert.ok(charged.act(charged.player,'near').ok);assert.ok(charged.act(charged.player,id).ok);assert.equal(charged.enemy.charge,null);assert.equal(charged.stats[1].charges.interrupted,1);assert.ok(charged.stats[0].hpDamage+charged.stats[0].shieldDamage>0);assert.equal(charged.player.ap,1);
 const movement=new ChallengeBattle(key,{},'heavy',{distance:2,difficulty:'questioning'});movement.enemy.charge={...movement.skill(movement.enemy,'unity'),storedPower:110};movement.enemyPlan=[];movement.enemyQueue=[];movement.act(movement.player,'near');movement.act(movement.player,'near');movement.endTurn();assert.ok(movement.logs.some(l=>l.text.includes('因距离不适合而落空')));
}
console.log('Questioning forecast combat fields match actual execution; equipped interrupts and two-step distance counterplay preserve one remaining AP.');
