import assert from 'node:assert/strict';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {OPPONENTS,planOpponent} from './dist/opponents.mjs';
import {TACTICAL_LOADOUTS} from './dist/tactics.mjs';
import {chooseReaction} from './dist/auto.mjs';
import {loadOpponentPlanner} from './scripts/opponent-planner-internals.mjs';
const model=await loadOpponentPlanner(),fields=b=>({player:b.player,enemy:b.enemy,distance:b.distance,result:b.result,phase:b.phase,pending:b.pending});let comparisons=0;
function compare(b,actor,id){const before=JSON.stringify(b),actual=Object.assign(Object.create(ChallengeBattle.prototype),structuredClone(b)),predicted=model.clone(b);assert.ok(actual.act(actual[actor],id).ok);assert.ok(predicted.act(predicted[actor],id).ok);if(actual.phase==='reaction')assert.ok(actual.react(chooseReaction(actual,'balanced').response).ok);assert.deepEqual(fields(predicted),fields(actual),`${b.opponentId}/${b.player.key}/${b.distance}/${actor}/${id}`);assert.equal(JSON.stringify(b),before);comparisons++;}
const majors={fire:'ignite',sword:'heavy',flame:'fierce',water:'cold',wood:'parasitic',earth:'mountain'};
for(const [key,major]of Object.entries(majors))for(const id of Object.keys(OPPONENTS))for(const distance of [0,1,2]){
 const b=new ChallengeBattle(key,{major,skillIds:TACTICAL_LOADOUTS[key][major]},id,{distance});b.player.hp-=35;b.enemy.hp-=35;b.player.burn=2;b.enemy.burn=2;b.player.burnTurns=b.enemy.burnTurns=3;b.player.shield=b.enemy.shield=6;
 for(const actor of ['player','enemy']){b.phase=actor;for(const s of b.skills(b[actor]))if(!b.legal(b[actor],s.id))compare(b,actor,s.id);}
}
const wood=new ChallengeBattle('flame',{},'symbiosis');wood.player.ap=1;wood.player.qi.fire=3;wood.player.qi.any=1;wood.enemy.hp=140;wood.enemy.shield=0;wood.enemy.qi.wood=2;wood.enemy.qi.any=0;wood.enemy.growth=2;wood.enemy.growthPending=false;wood.enemyPlan=wood.enemyQueue=['bloomheal'];compare(wood,'player','eruption');const c=model.clone(wood);c.act(c.player,'eruption');assert.equal(c.enemy.qi.wood,2);assert.equal(c.planBudget().failures.length,0,'Real shield reserve retains the announced harvest budget');
const earth=new ChallengeBattle('earth',{skillIds:['stonebolt','foundation','rampart','landbreak','anchor','mountain']},'cold');earth.phase='enemy';earth.player.terrain=3;earth.player.qi.earth=1;earth.player.qi.any=0;earth.player.shield=0;earth.player.chilled=true;earth.enemy.qi.water=3;compare(earth,'enemy','repulse');const anchor=model.clone(earth);anchor.act(anchor.enemy,'repulse');assert.equal(anchor.distance,1);assert.equal(anchor.player.terrain,2);assert.equal(anchor.player.qi.earth,0);
const dead=new ChallengeBattle('wood',{major:'parasitic'},'fierce');dead.phase='enemy';dead.player.hp=4;dead.player.shield=0;dead.enemy.hp=1;dead.enemy.shield=0;dead.enemy.parasite=1;dead.enemy.parasiteTurns=3;compare(dead,'enemy','flare');const p=model.clone(dead);p.act(p.enemy,'flare');assert.equal(p.result,'win');assert.equal(p.player.hp,4);assert.equal(p.pending,null);
for(const id of ['heavy','ignite','mountain'])for(const distance of [0,1,2]){
 const b=new ChallengeBattle('earth',{major:'mountain'},id,{distance});const skill=b.skills(b.enemy).find(s=>s.kind==='charge');assert.ok(skill);b.enemy.charge={...skill,storedPower:80};
 const actual=Object.assign(Object.create(ChallengeBattle.prototype),structuredClone(b)),predicted=model.clone(b);assert.ok(actual.endTurn().ok);assert.ok(predicted.endTurn().ok);if(actual.phase==='reaction')actual.react(chooseReaction(actual,'balanced').response);assert.deepEqual(fields(predicted),fields(actual),'Free releases use the same legal response window');comparisons++;
}
for(const id of Object.keys(OPPONENTS)){
 const b=new ChallengeBattle('flame',{major:'fierce'},id,{difficulty:'questioning'}),state=JSON.stringify(b),frozen=[...b.enemyPlan];assert.deepEqual(planOpponent(b,id).map(c=>c.id),frozen);assert.equal(JSON.stringify(b),state);assert.ok(b.act(b.player,'far').ok);assert.deepEqual(b.enemyPlan,frozen,'Player input cannot change published actions');
}
console.log(`Opponent budget: ${comparisons} real-versus-planning action/release comparisons across six classes, eleven NPCs and three ranges; reserve qi, legal anchor, paid-parasite ordering, data-only budget clones, immutable plans and frozen previews passed.`);
