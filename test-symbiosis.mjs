import assert from 'node:assert/strict';
import {Battle,CLASSES} from './dist/engine.mjs';
import {DuelBattle} from './dist/duel-setup.mjs';
import {TACTICAL_LOADOUTS} from './dist/tactics.mjs';
import {startPreparedPhase} from './dist/prepared.mjs';
import {loadForecastModel,auditState} from './scripts/forecast-audit.mjs';

const kit=TACTICAL_LOADOUTS.wood.symbiosis;
const stock=a=>{a.ap=3;a.qi={metal:0,water:0,fire:0,wood:8,earth:0,any:2};};
function board(major='symbiosis'){
 const b=new DuelBattle('wood',{major,skillIds:kit},{key:'wood',major,skillIds:kit});
 stock(b.player);stock(b.enemy);b.enemy.reaction=false;b.player.hp=100;return b;
}
for(const major of ['symbiosis','parasitic'])for(const first of ['cultivate','graft']){
 const b=board(major),second=first==='graft'?'cultivate':'graft';
 assert.ok(b.act(b.player,first).ok);
 assert.equal(b.player.growth,first==='graft'?2:1);
 assert.ok(b.act(b.player,'bloomheal').ok,'Emergency harvest remains available');
 assert.equal(b.player.growth,0);assert.equal(b.player.growthPending,false);
 const before=JSON.stringify(b);assert.equal(b.act(b.player,second).ok,false);
 assert.deepEqual(JSON.stringify(b),before,'Rejected second cultivation cannot spend qi/AP, log or restore maturation');
 assert.match(b.legal(b.player,second),/共用/);
 b.resetActor(b.player);assert.equal(b.legal(b.player,second),null,'Shared use resets next round');
}
const delayed=board();delayed.act(delayed.player,'cultivate');
 startPreparedPhase(delayed,delayed.player);assert.equal(delayed.player.growth,3);
 const immediate=board();immediate.act(immediate.player,'graft');
 startPreparedPhase(immediate,immediate.player);assert.equal(immediate.player.growth,2);
 assert.equal(immediate.player.growthPending,false,'Instant choice cannot earn delayed bonus');
for(const id of ['cultivate','graft']){
 const skillIds=[id,...CLASSES.wood.skills.map(s=>s.id).filter(s=>!['cultivate','graft'].includes(s))].slice(0,6);
 const b=new Battle('wood',{skillIds});stock(b.player);
 assert.equal(b.legal(b.player,id),null,'Either cultivation works when equipped alone');
}
const shared=board();shared.enemy.ap=3;shared.phase='enemy';shared.act(shared.enemy,'graft');
 const before=JSON.stringify(shared);assert.equal(shared.act(shared.enemy,'cultivate').ok,false);assert.equal(JSON.stringify(shared),before,'Enemy pays the same shared limit');

const model=await loadForecastModel();let count=0;
for(const first of ['cultivate','graft'])for(const distance of [0,1,2]){
 const b=board();b.distance=distance;b.enemy.reaction=true;b.enemy.hp=120;
 b.enemyQueue=[first,'bloomheal',first==='graft'?'cultivate':'graft'];b.enemyPlan=[...b.enemyQueue];
 const predicted=model.projectEnemyPhase(b,'balanced');
 const actual=Object.assign(Object.create(DuelBattle.prototype),structuredClone(b));
 actual.endTurn();for(let steps=0;actual.phase!=='player'&&!actual.result;steps++){
  assert.ok(steps<32);if(actual.phase==='reaction')actual.react(model.chooseReaction(actual,'balanced').response);else actual.enemyStep();
 }
 assert.deepEqual(auditState(predicted),auditState(actual),'Forecast and public fallback share cultivation limit');count++;
}
console.log(`Shared cultivation: both orders/majors, atomic rejection after harvest, round reset, delayed versus instant growth, single-skill loadouts, both seats and ${count} full forecast replays passed.`);
