import assert from 'node:assert/strict';
import {build,duel} from './scripts/balance-arena.mjs';
import {total} from './dist/engine.mjs';
import {createPredictiveArena,cloneWorld,worldState,actWorld,endPhase,advancePhase,playCurrentPhase,forecastWorld,chooseArenaAction,predictiveDuel,winner} from './scripts/predictive-arena.mjs';

const fire=build('fire','ignite'),sword=build('sword','quick');
for(const own of ['balanced','aggressive','defensive','burst']){
  const w=createPredictiveArena(fire,sword,{prefs:[own,'defensive'],controllers:['adaptive','immediate']});
  const saved=JSON.stringify(worldState(w)),choice=chooseArenaAction(w);
  assert.ok(choice.action==='end'||!w.battle.legal(w.battle.player,choice.skillId));
  assert.equal(JSON.stringify(worldState(w)),saved,'Every tendency keeps real state immutable');
}
// New phase machinery must reproduce the old arena under the old controller.
for(const a of [fire,build('fire','sustain')])for(const b of [sword,build('sword','heavy')])for(const distance of [0,1,2])for(const first of [0,1]){
  const options={first,distance},old=duel(a,b,options),fresh=predictiveDuel(a,b,options);
  for(const field of ['hp','winner','rounds'])assert.deepEqual(fresh[field],old[field],'Legacy parity '+JSON.stringify([a,b,options,field]));
  assert.deepEqual(fresh.metrics.map(m=>m.actions),old.metrics.map(m=>m.actions));
  assert.deepEqual(fresh.metrics.map(m=>m.reactions),old.metrics.map(m=>m.reactions));
}

// An unspent first actor has a same-round opponent; the second actor crosses regen.
for(const first of [0,1]){
  const w=createPredictiveArena(fire,sword,{first,controllers:['immediate','immediate']});
  for(const a of w.actors)a.qi={metal:0,wood:0,water:0,fire:0,earth:0,any:0};
  endPhase(w);advancePhase(w);assert.equal(w.battle.round,1);assert.equal(total(w.actors[0].qi),0);assert.equal(total(w.actors[1].qi),0);
  endPhase(w);advancePhase(w);assert.equal(w.battle.round,2);
  assert.equal(total(w.actors[0].qi),5);assert.equal(total(w.actors[1].qi),5);
  assert.equal(w.seat,first);
}

// The second actor regens before the opposing first actor can attack/consume reaction.
const timing=createPredictiveArena(fire,sword,{controllers:['immediate','immediate']});
endPhase(timing);advancePhase(timing);
for(const a of timing.actors)a.qi={metal:0,wood:0,water:0,fire:0,earth:0,any:0};
timing.actors[1].ap=0;const before=JSON.stringify(worldState(timing));
const next=forecastWorld(timing,{horizon:'enemy-end'});
assert.equal(JSON.stringify(worldState(timing)),before);
assert.equal(next.world.battle.round,2);assert.equal(next.assumedController,'immediate');
assert.ok(total(next.world.actors[1].qi)<5,'Newly regenerated qi is available for a real reaction');

// Same rules and same known policy: complete state, both horizons, both seats.
for(const controller of ['legacy','immediate','script'])for(const first of [0,1])for(const distance of [0,1,2]){
  const w=createPredictiveArena(fire,sword,{first,distance,controllers:[controller,controller]});
  for(let phase=0;phase<4&&winner(w)===null;phase++){
    playCurrentPhase(w);if(winner(w)!==null)break;
    const saved=JSON.stringify(worldState(w)),forecast=forecastWorld(w),actual=cloneWorld(w);
    advancePhase(actual);if(winner(actual)===null)playCurrentPhase(actual);
    assert.deepEqual(forecast.enemyEnd,worldState(actual));
    if(winner(actual)===null)advancePhase(actual);
    assert.deepEqual(worldState(forecast.world),worldState(actual));
    assert.equal(JSON.stringify(worldState(w)),saved,'Policy forecast is read-only');
    advancePhase(w);
  }
}

// Both own-turn search clones and future clones retain symmetric defender reactions.
const shield=createPredictiveArena(fire,sword,{controllers:['immediate','immediate'],prefs:['balanced','defensive']});
shield.actors[1].shield=0;const shadow=cloneWorld(shield);assert.ok(actWorld(shadow,'spark').ok);
assert.equal(shadow.actors[1].reaction,false);assert.equal(shadow.actors[1].qi.metal,2);
assert.equal(shield.actors[1].reaction,true);assert.equal(shield.actors[1].qi.metal,3);

// Burn death stops before a charge can release; next own release is included free.
const lethal=createPredictiveArena(fire,sword,{controllers:['immediate','immediate']});
lethal.actors[1].hp=1;lethal.actors[1].burn=1;lethal.actors[1].burnTurns=1;
lethal.actors[1].charge={...lethal.battle.skill(lethal.actors[1],'unity'),storedPower:100};
const stopped=forecastWorld(lethal);assert.equal(stopped.future.result,'win');assert.equal(stopped.world.battle.round,1);
assert.equal(stopped.world.actors[0].hp,210);assert.ok(stopped.world.actors[1].charge);

const charged=createPredictiveArena(sword,fire,{controllers:['immediate','immediate'],prefs:['burst','aggressive']});
charged.actors[0].qi={metal:4,wood:0,water:0,fire:0,earth:0,any:1};charged.actors[0].intent=3;
assert.ok(actWorld(charged,'unity').ok);assert.ok(actWorld(charged,'guard').ok);
const free=forecastWorld(charged);if(winner(free.world)===null){assert.equal(free.world.actors[0].charge,null);assert.equal(free.world.actors[0].ap,3);}

// Adaptive-vs-adaptive stops at immediate policy; replay with one extra layer agrees.
for(const first of [0,1]){
  const w=createPredictiveArena(fire,sword,{first,controllers:['adaptive','adaptive']});
  const saved=JSON.stringify(worldState(w)),choice=chooseArenaAction(w);
  assert.ok(choice);assert.equal(JSON.stringify(worldState(w)),saved);
  const bounded=forecastWorld(w);assert.equal(bounded.assumedController,'immediate');
  const replay=forecastWorld(w,{depth:1}),actual=cloneWorld(w);
  endPhase(actual);advancePhase(actual);if(winner(actual)===null)playCurrentPhase(actual);if(winner(actual)===null)advancePhase(actual);
  assert.deepEqual(worldState(replay.world),worldState(actual));
  assert.throws(()=>forecastWorld(w,{depth:2}));
}
// Identity must never decide who benefits: flip actor order and preserve initiative.
for(const controller of ['immediate','script','adaptive']){
  const opts={controllers:[controller,controller],distance:2};
  const a=predictiveDuel(fire,sword,{...opts,first:0}),b=predictiveDuel(sword,fire,{...opts,first:1});
  assert.deepEqual(a.hp,b.hp.toReversed());assert.equal(a.winner,b.winner===null?null:1-b.winner);
}
console.log('Predictive arena: 24 legacy parity duels, both initiative boundaries, full-state policy replay, symmetric clone reactions, burn/charge timing, finite adaptive depth, immutable forecasts and seat-swap invariance passed.');
