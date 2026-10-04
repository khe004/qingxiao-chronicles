import assert from 'node:assert/strict';
import {Battle,CLASSES,MAJORS,total} from './dist/engine.mjs';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {chooseAction,chooseReaction} from './dist/auto.mjs';
import {planOpponent} from './dist/opponents.mjs';
import {loadForecastModel} from './scripts/forecast-audit.mjs';
import {createPredictiveArena,actWorld,endPhase,advancePhase} from './scripts/predictive-arena.mjs';

const make=(major='cold',skillIds=MAJORS.water[major].recommended)=>{
 const b=new Battle('water',{major,skillIds});b.enemy.reaction=false;b.enemy.shield=0;return b;
};
const act=(b,id,a=b.player)=>assert.ok(b.act(a,id).ok,id);
const reject=(b,id,a=b.player)=>{const before=JSON.stringify(b);assert.equal(b.act(a,id).ok,false,id);assert.equal(JSON.stringify(b),before,'Rejected action is immutable');};
assert.equal(CLASSES.water.skills.length,8);
for(const major of Object.keys(MAJORS.water)){const b=make(major);assert.equal(b.player.qi.water,4);assert.equal(total(b.player.qi),5);assert.equal(b.player.tide,0);assert.equal(b.player.skillIds.length,6);}

// Condensation supplies one choice, never AP denial or permanent movement lock.
const force=make();reject(force,'repulse');act(force,'frost');const ap=force.enemy.ap;
force.enemy.charge={...force.skill(force.enemy,'inferno'),storedPower:86};
act(force,'repulse');assert.equal(force.distance,2);assert.equal(force.enemy.ap,ap);assert.equal(force.enemy.chilled,false);assert.ok(force.enemy.charge,'Displacement is not an interrupt');
assert.deepEqual(force.lastMove,{actor:'enemy',forced:true,from:1,to:2});
force.player.ap=3;force.player.qi.water=4;force.enemy.chilled=true;force.distance=1;reject(force,'repulse');
force.phase='enemy';act(force,'near',force.enemy);assert.equal(force.distance,0);assert.equal(force.enemy.chilled,false);
const boundary=make();boundary.distance=2;boundary.enemy.chilled=true;reject(boundary,'repulse');

// Move, cleanse and waiting are separately priced counterplay. Cleansing one
// category preserves the other, including the old burn-cleanse behavior.
for(const id of ['near','far','dispel','purify']){
 const b=make();act(b,'frost');b.enemy.burn=3;b.enemy.burnTurns=2;b.phase='enemy';
 const qi=total(b.enemy.qi),before=b.enemy.ap;act(b,id,b.enemy);assert.equal(b.enemy.ap,before-1);
 assert.equal(total(b.enemy.qi),qi-(['dispel','purify'].includes(id)?1:0));
 assert.equal(b.enemy.chilled,id==='purify');assert.equal(b.enemy.burn,id==='purify'?0:3);
}
const expiry=make();act(expiry,'frost');expiry.enemyQueue=[];expiry.endTurn();assert.ok(expiry.enemy.chilled);expiry.enemyStep();assert.equal(expiry.enemy.chilled,false);
const playerExpiry=make();playerExpiry.player.chilled=true;playerExpiry.endTurn();assert.equal(playerExpiry.player.chilled,false);
const evade=make();evade.player.chilled=true;evade.phase='reaction';evade.pending={s:evade.skill(evade.enemy,'basic'),raw:12};assert.ok(evade.react('evade').ok);assert.equal(evade.player.chilled,false);assert.equal(evade.lastMove.actor,'player');

// The cold branch consumes its setup at paid cast time, before the defender
// spends a reaction; the attack preview and resolved power agree.
const cold=make();act(cold,'frost');const s=cold.skill(cold.player,'waterbolt'),hp=cold.enemy.hp,preview=cold.preview(s);
act(cold,'waterbolt');assert.equal(hp-cold.enemy.hp,preview);assert.equal(cold.enemy.chilled,false);assert.ok(cold.player.coldTriggered);reject(cold,'repulse');
cold.enemy.chilled=true;assert.equal(cold.raw(cold.player,s),28);act(cold,'waterbolt');assert.ok(cold.enemy.chilled,'No second cold bonus this round');

// Finite tide is actually spent and cannot be duplicated across outlets.
for(const major of ['cold','tidal']){const b=make(major,['waterbolt','frost','repulse','gather','surge','waterwall']);const qi=total(b.player.qi);act(b,'gather');assert.equal(b.player.tide,major==='cold'?2:3);assert.equal(total(b.player.qi),qi-1);reject(b,'gather');const expected=b.preview(b.skill(b.player,'surge')),hp=b.enemy.hp;act(b,'surge');assert.equal(hp-b.enemy.hp,expected);assert.equal(b.player.tide,major==='cold'?0:1);act(b,'waterwall');assert.equal(b.player.shield,major==='cold'?30:42);assert.equal(b.player.tide,0);}
const ebb=make('tidal');act(ebb,'gather');const qi=total(ebb.player.qi);act(ebb,'ebb');assert.equal(total(ebb.player.qi),qi+2);assert.equal(ebb.player.tide,1);reject(ebb,'ebb');act(ebb,'waterwall');assert.equal(ebb.player.tide,0);
const cap=make('tidal');cap.player.tide=3;cap.player.qi.water=9;cap.player.qi.any=0;act(cap,'ebb');assert.equal(total(cap.player.qi),10);assert.equal(cap.player.tide,1);assert.ok(cap.logs.some(l=>l.text.includes('溢出 1')));
const empty=make('tidal');reject(empty,'surge');reject(empty,'ebb');act(empty,'waterbolt');assert.ok(empty.enemy.hp<empty.enemy.maxHp,'No-setup attacks remain useful');
const rinse=make('cold',['waterbolt','frost','repulse','gather','rinse','ebb']);rinse.player.hp=100;rinse.player.burn=5;rinse.player.burnTurns=3;rinse.player.chilled=true;act(rinse,'rinse');assert.equal(rinse.player.hp,118);assert.equal(rinse.player.burn,0);assert.ok(rinse.player.chilled);reject(rinse,'rinse');act(rinse,'dispel');assert.equal(rinse.player.chilled,false);
const meditate=make();act(meditate,'meditate');assert.equal(meditate.player.qi.water,5);assert.equal(meditate.player.qi.any,2);assert.equal(meditate.player.qi.fire,0);

// Public plans stay frozen when the player clears the setup or moves. Rules
// should skip the now-illegal force, without spending AP or replacing it.
for(const response of ['near','dispel']){const b=new ChallengeBattle('sword',{},'cold');b.player.chilled=true;b.enemyPlan=['repulse','waterbolt'];b.enemyQueue=[...b.enemyPlan];const frozen=[...b.enemyPlan];act(b,response);b.endTurn();b.enemyStep();assert.deepEqual(b.enemyPlan,frozen);assert.ok(b.logs.some(l=>l.text.includes('目标需要凝滞')));}
const metrics=new ChallengeBattle('water',{major:'tidal'},'quick');act(metrics,'gather');act(metrics,'surge');act(metrics,'waterwall');assert.equal(metrics.review().actors[0].tideSpent,3);

// Both actual seats use the same phase expiration and round reset boundaries.
for(const first of [0,1]){const w=createPredictiveArena({key:'water',config:{major:'cold'}},{key:'water',config:{major:'tidal',skillIds:['waterbolt','frost','repulse','gather','waterwall','rinse']}},{first,controllers:['immediate','immediate']});w.actors[1-first].reaction=false;actWorld(w,'frost');assert.ok(w.actors[1-first].chilled);endPhase(w);advancePhase(w);assert.ok(w.actors[1-first].chilled);endPhase(w);assert.equal(w.actors[1-first].chilled,false);advancePhase(w);assert.equal(w.actors[0].coldTriggered,false);assert.equal(w.actors[1].tide,0);}

// Forecasts include tide spending, condensation expiration, reactions, caps
// and the statistics from the exact same next-player phase boundary.
const {projectEnemyPhase}=await loadForecastModel();
for(const key of ['water','sword','flame'])for(const id of ['cold','tidal'])for(const difficulty of ['practice','questioning']){
 const b=new ChallengeBattle(key,key==='water'?{major:'tidal'}:{},id,{difficulty});
 if(key==='water')act(b,'gather');b.player.chilled=true;b.enemy.chilled=true;b.enemy.tide=2;
 b.planEnemy();const saved=JSON.stringify(b);chooseAction(b);planOpponent(b,id);assert.equal(JSON.stringify(b),saved);
 const predicted=projectEnemyPhase(b,'balanced'),actual=Object.assign(Object.create(ChallengeBattle.prototype),structuredClone(b));actual.endTurn();
 while(!actual.result&&actual.phase!=='player'){if(actual.phase==='reaction')actual.react(chooseReaction(actual).response);else actual.enemyStep();}
 for(const k of ['player','enemy','phase','round','distance','result','stats','lastMove'])assert.deepEqual(predicted[k],actual[k],`${key}/${id}/${difficulty} forecast ${k}`);
}
console.log('Water: paid single-use control, movement ownership, phase expiry, selective cleansing, cold cashout, finite shared tide, regeneration caps, immutable failures, frozen plans, both-seat timing and 12 full-state forecast cases passed.');
