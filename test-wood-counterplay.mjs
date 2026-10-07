import assert from 'node:assert/strict';
import {Battle} from './dist/engine.mjs';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {OPPONENTS} from './dist/opponents.mjs';
import {TACTICAL_LOADOUTS} from './dist/tactics.mjs';
import {chooseReaction} from './dist/auto.mjs';
import {loadOpponentPlanner} from './scripts/opponent-planner-internals.mjs';
const model=await loadOpponentPlanner();
const fields=b=>Object.fromEntries(['player','enemy','distance','result','phase','pending','enemyPlan','enemyQueue','enemyWaitReason'].map(k=>[k,b[k]]));
let comparisons=0;
function compare(b,path){
 const frozen=JSON.stringify(b),actual=Object.assign(Object.create(ChallengeBattle.prototype),structuredClone(b));actual.phase='enemy';actual.enemyPlan=[...path];actual.enemyQueue=[...path];
 // Stop the real engine at the same phase boundary as the planner. Reactions
 // remain real player windows; no next-round reset or new plan enters either.
 Object.defineProperty(actual,'beginRound',{value:()=>{}});
 for(let n=0;!actual.result;n++){assert.ok(n<12);if(actual.phase==='reaction')assert.ok(actual.react(chooseReaction(actual,'balanced').response).ok);else if(!Battle.prototype.enemyStep.call(actual))break;}
 const predicted=model.execute(b,path);assert.deepEqual(fields(predicted),fields(actual),`${b.opponentId}/${b.player.key}/${b.distance}/${path}`);assert.equal(JSON.stringify(b),frozen);comparisons++;return predicted;
}
for(const kind of ['growth','parasite'])for(const mode of ['attack','counter']){
 const b=new ChallengeBattle('flame',{},kind==='growth'?'symbiosis':'parasitic');b.player.ap=1;b.player.qi=Object.fromEntries(Object.keys(b.player.qi).map(k=>[k,k==='any'?1:0]));b.enemy.shield=60;b.enemy.reaction=false;b.enemyPlan=[];b.enemyQueue=[];b.enemy.growth=kind==='growth'?2:0;b.enemy.growthPending=kind==='growth';b.player.parasite=kind==='parasite'?3:0;b.player.parasiteTurns=2;
 const frozen=JSON.stringify(b),c=model.playerPressure(b,mode);assert.equal(JSON.stringify(b),frozen);assert.equal(c.player.ap,0);assert.equal(c.player.qi.any,0);
 if(kind==='growth'){assert.equal(c.enemy.growth,0);assert.equal(c.enemy.growthPending,false);}else assert.equal(c.player.parasite,0);
}
// A genuine retreat scenario spends its sole AP moving instead of granting a
// free simultaneous cleanse; the preparation then matures at enemy start.
const retreat=new ChallengeBattle('flame',{},'symbiosis');retreat.player.ap=1;retreat.enemy.growth=2;retreat.enemy.growthPending=true;const escaped=model.playerPressure(retreat,'retreat');assert.equal(escaped.distance,2);assert.equal(escaped.player.ap,0);assert.equal(escaped.enemy.growth,3);
const broken=new ChallengeBattle('flame',{},'symbiosis');broken.phase='enemy';broken.enemy.growth=0;broken.enemy.growthPending=false;broken.enemy.qi.wood=2;broken.enemy.qi.any=0;const replacement=compare(broken,['bloomheal']);assert.ok(replacement.logs.some(l=>l.text.includes('施展「调息」')));assert.ok(replacement.logs.some(l=>l.text.includes('施展「青叶矢」')));assert.equal(replacement.enemy.ap,0);
const majors={fire:'ignite',sword:'heavy',flame:'fierce',water:'cold',wood:'parasitic',earth:'mountain'};
for(const [key,major]of Object.entries(majors))for(const id of Object.keys(OPPONENTS))for(const distance of [0,1,2]){
 const b=new ChallengeBattle(key,{major,skillIds:TACTICAL_LOADOUTS[key][major]},id,{distance});b.phase='enemy';b.player.hp-=35;b.enemy.hp-=45;b.player.shield=b.enemy.shield=6;b.enemy.burn=2;b.enemy.burnTurns=3;b.enemy.growth=0;b.enemy.growthPending=false;b.enemy.terrain=0;
 compare(b,[]);compare(b,[b.enemy.skillIds[0],b.enemy.skillIds[1],b.enemy.skillIds[2]]);compare(b,['near',b.enemy.skillIds[0],'far']);
}
console.log(`Wood counterplay: paid growth/parasite counters, maturity cancellation and retreat AP; ${comparisons} full fixed-queue phases match real fallback, reactions, resources and boundaries across six player classes, eleven NPCs and three ranges. Source remains unchanged.`);
