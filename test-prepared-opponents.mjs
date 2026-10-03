import assert from 'node:assert/strict';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {OPPONENTS,planOpponent} from './dist/opponents.mjs';
import {loadForecastModel} from './scripts/forecast-audit.mjs';
const ids=['symbiosis','parasitic','bastion','mountain'];
const {projectEnemyPhase,chooseReaction}=await loadForecastModel();
const observed={};let games=0,maxPlanMs=0;
for(const id of ids)for(const difficulty of ['practice','questioning'])for(const distance of [0,1,2]){
 const start=performance.now(),b=new ChallengeBattle('wood',{},id,{difficulty,distance});maxPlanMs=Math.max(maxPlanMs,performance.now()-start);
 const state=JSON.stringify(b),choices=planOpponent(b,id);assert.equal(JSON.stringify(b),state);assert.ok(choices.length>0);assert.ok(choices.every(c=>c.reason&&b.skill(b.enemy,c.id)));
 const actual=Object.assign(Object.create(ChallengeBattle.prototype),structuredClone(b)),predicted=projectEnemyPhase(b,'balanced');actual.endTurn();while(!actual.result&&actual.phase!=='player'){if(actual.phase==='reaction')actual.react(chooseReaction(actual).response);else actual.enemyStep();}
 for(const key of ['player','enemy','distance','round','result','phase','stats'])assert.deepEqual(predicted[key],actual[key],`${id}/${difficulty}/${distance} forecast ${key}`);
 // A real passive sparring partner exposes natural maturity, reaping and
 // release timing; this is a behavior check, not a human win-rate estimate.
 for(let n=0;!b.result;n++){assert.ok(n<700);if(b.phase==='player'){if(b.player.ap)b.act(b.player,'basic');else b.endTurn();}else if(b.phase==='reaction')b.react('none');else b.enemyStep();}
 const r=b.review(),profile=observed[id]??={};for(const [s,n] of Object.entries(r.actors[1].actions))profile[s]=(profile[s]||0)+n;profile.releases=(profile.releases||0)+r.actors[1].charges.released;
 for(const a of r.actors){assert.ok(a.growthSpent>=0&&a.parasiteSpent>=0&&a.terrainSpent>=0);const q=a.charges;assert.equal(q.started,q.released+q.interrupted+q.rangeMiss+q.canceled+q.pending);}games++;
}
assert.ok(observed.symbiosis.cultivate&&observed.symbiosis.bloomstrike);assert.ok(observed.parasitic.parasite&&observed.parasitic.reap);assert.ok(observed.bastion.foundation&&observed.bastion.landbreak);assert.ok(observed.mountain.mountain&&observed.mountain.releases);
const mature=new ChallengeBattle('wood',{},'symbiosis');mature.enemy.growth=1;mature.enemy.growthPending=true;const frozen=JSON.stringify(mature);assert.ok(planOpponent(mature,'symbiosis').some(c=>c.id==='bloomstrike'));assert.equal(JSON.stringify(mature),frozen);
const charge=new ChallengeBattle('wood',{},'mountain');charge.enemy.terrain=2;charge.enemy.qi.earth=7;charge.enemy.qi.any=2;assert.equal(planOpponent(charge,'mountain')[0].id,'mountain');assert.ok(!planOpponent(charge,'mountain').some(c=>c.id==='far'));
const block=new ChallengeBattle('water',{},'bastion');block.enemy.anchored=true;block.enemy.anchorExpires=block.round+1;block.moveActor(block.enemy,1,{forced:true});assert.equal(block.stats[0].forcedMoves,0);assert.equal(block.distance,1);
assert.equal(Object.keys(OPPONENTS).length,11);
console.log(JSON.stringify({checks:'Prepared NPCs: 24 natural games, isolated/frozen plans, same-horizon full forecast fields, real growth/parasite harvest and mountain release, stats and blocked displacement passed.',games,maxPlanMs,observed}));
