import assert from 'node:assert/strict';
import {DuelBattle} from './dist/duel-setup.mjs';
import {chooseAction,chooseReaction,choosePreparedAction,PREPARED_SEARCH_BUDGET} from './dist/auto.mjs';
import {activeFallback} from './dist/active-policy.mjs';
import {loadForecastModel,auditState} from './scripts/forecast-audit.mjs';
const empty=a=>{for(const k of Object.keys(a.qi))a.qi[k]=0;};
// The low-cost wood attack must be considered as a real first-cast refund,
// even with no charge to interrupt. Two basic attacks cannot finish this foe.
const vine=new DuelBattle('fire',{skillIds:['vine','spark','blaze','heal','rootdrink','seedburst']},{key:'sword'});
empty(vine.player);vine.player.qi.wood=1;vine.player.ap=2;vine.enemy.hp=25;vine.enemy.shield=0;vine.enemy.reaction=false;
assert.ok(vine.damage(vine.player,vine.skill(vine.player,'basic'))*2<25);
assert.equal(chooseAction(vine).skillId,'vine');assert.ok(vine.act(vine.player,'vine').ok);assert.equal(vine.player.qi.fire,1);assert.ok(vine.act(vine.player,'spark').ok);assert.equal(vine.result,'win');
for(const [key,id,ids,qi] of [
 ['sword','cut',['cut','guard','temper','riposte','cleave','unity'],{metal:1,water:1}],
 ['flame','scorchcut',['scorchcut','stoke','quench','ashenward','firestorm','solar'],{fire:1,any:1}],
]){const b=new DuelBattle(key,{skillIds:ids},{key:'sword'});empty(b.player);Object.assign(b.player.qi,qi);b.player.ap=1;b.enemy.hp=11;b.enemy.shield=0;b.enemy.reaction=false;assert.equal(b.enemy.charge,null);assert.equal(chooseAction(b).skillId,id);assert.ok(b.act(b.player,id).ok);assert.equal(b.result,'win');assert.ok(!b.logs.some(l=>l.text.includes('undefined')));}
const finish=new DuelBattle('fire');empty(finish.player);empty(finish.enemy);finish.player.ap=1;finish.player.hp=2;finish.player.meditated=true;finish.enemy.reaction=false;finish.enemy.hp=1;finish.enemy.shield=8;finish.enemy.counter={name:'有限反击',power:25,hits:2,element:'water'};
const choice=activeFallback(finish,finish.player);assert.equal(choice.id,'basic');assert.ok(finish.act(finish.player,choice.id).ok);assert.equal(finish.result,'win');assert.equal(finish.player.hp,2);assert.equal(finish.stats[1].reflectionDamage,0);
const threatened=new DuelBattle('fire');empty(threatened.player);threatened.player.ap=1;threatened.player.hp=2;threatened.player.meditated=true;threatened.enemy.reaction=false;threatened.enemy.hp=20;threatened.enemy.shield=8;threatened.enemy.counter={name:'有限反击',power:25,hits:2,element:'water'};assert.equal(activeFallback(threatened,threatened.player).id,undefined,'A surviving defender is still dangerous');
const response=new DuelBattle('fire',{}, {key:'sword'});empty(response.player);empty(response.enemy);response.player.qi.wood=1;response.player.shield=0;response.enemy.intent=5;response.enemy.ap=0;response.phase='reaction';response.pending={s:response.skill(response.enemy,'swift'),raw:12};response.enemyQueue=['unity'];assert.ok(response.legal(response.enemy,'unity'));assert.equal(chooseReaction(response,'defensive').response,'shield','An unpayable queued heavy cannot justify withholding this useful defense');
response.enemy.ap=2;response.enemy.qi.metal=3;response.enemy.qi.any=1;assert.equal(response.legal(response.enemy,'unity'),null);assert.equal(chooseReaction(response,'defensive').response,'none','An affordable larger queued threat can still receive the reserved response');
const model=await loadForecastModel();let forecasts=0;
for(const key of ['wood','earth'])for(const distance of [0,1,2]){
 const b=new DuelBattle(key,{}, {key:'sword'});b.distance=distance;b.player.hp-=30;const stats={trace:true},live=JSON.stringify(b),c=choosePreparedAction(b,'balanced',{stats});assert.equal(JSON.stringify(b),live);assert.ok(stats.rootStates<=PREPARED_SEARCH_BUDGET.rootStates);assert.ok(c.action==='end'||!b.legal(b.player,c.skillId));
 b.events=[];const predicted=model.projectEnemyPhase(b,'balanced'),actual=Object.assign(Object.create(DuelBattle.prototype),structuredClone(b));actual.endTurn();for(let n=0;actual.phase!=='player'&&!actual.result;n++){assert.ok(n<32);if(actual.phase==='reaction')actual.react(model.chooseReaction(actual,'balanced').response);else actual.enemyStep();}
 assert.deepEqual(auditState(predicted),auditState(actual),'Explicit forecasts still retain actual recording metadata and every combat field');forecasts++;
}
console.log(`AI review: real wood-refund finishing combo, paid interrupt attacks without enemy charge, certain lethal versus surviving reflection, affordable future defense hints, immutable bounded search and ${forecasts} complete recorded forecasts passed.`);
