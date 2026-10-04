import assert from 'node:assert/strict';
import {build,createArena,duel,playPhase,tacticalCharge} from './scripts/balance-arena.mjs';
import {Battle,total} from './dist/engine.mjs';
const fire=build('fire','ignite'),sword=build('sword','quick');
const arena=createArena(fire,sword);assert.equal(total(arena.context.actors[0].qi),5);assert.equal(total(arena.context.actors[1].qi),5);
const reference=new Battle('fire');reference.enemy.reaction=false;const expected=reference.preview(reference.skill(reference.player,'spark'));
arena.context.actors[1].reaction=false;const hp=arena.context.actors[1].hp,opening=arena.context.actors[1].shield;assert.ok(arena.battle.act(arena.context.actors[0],'spark').ok);assert.equal(hp-arena.context.actors[1].hp+opening-arena.context.actors[1].shield,expected);
const response=createArena(fire,sword,{prefs:['balanced','defensive']});response.context.actors[1].reaction=true;response.context.actors[1].shield=0;
assert.ok(response.battle.act(response.context.actors[0],'spark').ok);assert.equal(response.context.actors[1].reaction,false);assert.equal(response.context.actors[1].qi.metal,2);
const first=duel(fire,sword,{first:0}),swapped=duel(sword,fire,{first:1});assert.deepEqual(first.hp,swapped.hp.toReversed());assert.equal(first.winner,swapped.winner===null?null:1-swapped.winner);
const same=duel(sword,sword,{first:0}),sameSwap=duel(sword,sword,{first:1});assert.deepEqual(same.hp,sameSwap.hp.toReversed());assert.equal(same.winner,sameSwap.winner===null?null:1-sameSwap.winner);
const waste=createArena(sword,fire);playPhase(waste,0,{forceFirst:'unity'});assert.equal(waste.context.metrics[0].chargeUnusedAP,0);assert.equal(waste.context.actors[0].ap,0);
assert.equal(Object.values(waste.context.metrics[0].actions).reduce((a,b)=>a+b,0),2);
const charge=tacticalCharge('fire','ignite');assert.equal(charge.metrics[0].charges.inferno.started,1);assert.ok(charge.metrics[0].charges.inferno.released+charge.metrics[0].charges.inferno.interrupted+charge.metrics[0].charges.inferno.outOfRange+charge.metrics[0].charges.inferno.unresolved===1);
for(const [key,major] of [['fire','ignite'],['fire','sustain'],['sword','quick'],['sword','heavy']]){const q=tacticalCharge(key,major,{ap:2}).metrics[0].charges[key==='fire'?'inferno':'unity'];assert.ok(q.started>=1,'Forced two-AP charge starts, later autonomous charges are allowed');assert.equal(q.started,q.released+q.interrupted+q.outOfRange+q.unresolved);}
const neutral=createArena(build('fire','sustain'),sword,{disableMajor:0});neutral.context.actors[0].hp=100;assert.ok(neutral.battle.act(neutral.context.actors[0],'seed').ok);assert.equal(neutral.context.actors[0].hp,100);assert.equal(neutral.context.actors[0].qi.fire,3);
console.log('Symmetric-controller harness: production damage/reactions, equal starting resources, seat-swap invariance, mirrors and charge remaining-action use passed.');
