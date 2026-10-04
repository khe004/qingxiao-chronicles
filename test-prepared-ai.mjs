import assert from 'node:assert/strict';
import {Battle,CLASSES,total} from './dist/engine.mjs';
import {DuelBattle} from './dist/duel-setup.mjs';
import {chooseAction,choosePreparedAction,chooseReaction,PREPARED_SEARCH_BUDGET} from './dist/auto.mjs';
import {planner} from './scripts/planner-internals.mjs';
import {createPredictiveArena,chooseArenaAction,worldState} from './scripts/predictive-arena.mjs';

function queue(b,ids){b.enemyQueue=[...ids];b.enemyPlan=[...ids];}
function choose(b,t='balanced'){
 const before=JSON.stringify(b),stats={trace:true},start=performance.now(),choice=choosePreparedAction(b,t,{stats});
 assert.equal(JSON.stringify(b),before,'Preparation planning leaves all live combat fields, queues, stats and logs unchanged');
 assert.ok(choice.action==='end'||b.legal(b.player,choice.skillId)===null);
 assert.ok(stats.rootStates<=PREPARED_SEARCH_BUDGET.rootStates);assert.ok(stats.candidates<=PREPARED_SEARCH_BUDGET.candidates);
 assert.ok(stats.forecasts<=PREPARED_SEARCH_BUDGET.candidates*(1+PREPARED_SEARCH_BUDGET.continuationFinals));
 assert.ok(stats.continuationStates<=PREPARED_SEARCH_BUDGET.candidates*15*(1+2*PREPARED_SEARCH_BUDGET.continuationWidth));
 return {choice,stats,ms:performance.now()-start};
}
function phase(b,t='balanced'){
 const ids=[];for(let n=0;b.player.ap&&b.phase==='player'&&!b.result;n++){
  assert.ok(n<4);const {choice}=choose(b,t);if(choice.action==='end')break;
  ids.push(choice.skillId);assert.ok(b.act(b.player,choice.skillId).ok);
 }
 return ids;
}
function advance(b,t='balanced'){
 assert.ok(b.endTurn().ok);for(let n=0;b.phase!=='player'&&!b.result;n++){
  assert.ok(n<24);if(b.phase==='reaction')b.react(chooseReaction(b,t).response);else b.enemyStep();
 }
}

// Preparation must actually survive the enemy phase and lead to a later harvest.
const grow=new DuelBattle('wood',{major:'symbiosis'},{key:'earth'});grow.player.hp=70;queue(grow,['stonebolt','stonebolt','stonebolt']);
const growIds=phase(grow,'defensive');assert.ok(growIds.includes('cultivate'));assert.ok(grow.player.growthPending);
advance(grow,'defensive');assert.equal(grow.player.growth,3);const harvest=phase(grow,'defensive');
assert.ok(harvest.some(id=>['bloomheal','bloomguard','bloomstrike'].includes(id)),'The mature preparation is spent by real, later actions');

// A lethal public harvest warrants breaking; an attached parasite can be cleansed
// before its equipped reap. Neither operation is treated as universal cleanse.
const breakGrowth=new DuelBattle('earth',{}, {key:'wood',major:'symbiosis'});breakGrowth.player.ap=1;breakGrowth.player.hp=30;breakGrowth.player.reaction=false;breakGrowth.enemy.growth=2;queue(breakGrowth,['bloomstrike','wooddart']);
assert.equal(choose(breakGrowth).choice.skillId,'quakesunder');breakGrowth.act(breakGrowth.player,'quakesunder');assert.equal(breakGrowth.enemy.growth,0);advance(breakGrowth);assert.ok(breakGrowth.player.hp>0);
const cleanse=new DuelBattle('earth',{}, {key:'wood',major:'parasitic'});cleanse.player.ap=1;cleanse.player.hp=20;cleanse.player.reaction=false;cleanse.player.parasite=3;cleanse.player.parasiteTurns=2;cleanse.player.shield=20;cleanse.player.terrain=3;queue(cleanse,['reap','wooddart']);
assert.equal(choose(cleanse).choice.skillId,'unparasite');cleanse.act(cleanse.player,'unparasite');advance(cleanse);assert.ok(cleanse.player.hp>0);assert.ok(cleanse.logs.some(l=>l.text.includes('目标需要寄生')));

const escape=new DuelBattle('wood',{}, {key:'earth',major:'mountain'});escape.player.ap=1;escape.player.hp=30;escape.enemy.charge={...escape.skill(escape.enemy,'mountain'),storedPower:150};queue(escape,[]);
assert.equal(choose(escape).choice.skillId,'far');escape.act(escape.player,'far');advance(escape);assert.ok(escape.logs.some(l=>l.text.includes('因距离不适合而落空')));assert.equal(escape.player.hp,30);

// Ready terrain and a safe release window produce a real mountain, not a bonus
// for a never-released charge. A threatened release reserves both anchor+charge
// and movement+charge combinations within the same fixed candidate budget.
const mountain=new DuelBattle('earth',{major:'mountain'},{key:'earth'});mountain.player.terrain=2;mountain.player.qi.earth=8;mountain.player.qi.any=2;queue(mountain,['basic','basic','basic']);
assert.ok(phase(mountain,'burst').includes('mountain'));advance(mountain,'burst');assert.ok(mountain.logs.some(l=>l.text.includes('释放「镇岳印」')));assert.equal(mountain.player.charge,null);
const protectedCharge=new DuelBattle('earth',{major:'mountain',skillIds:['stonebolt','foundation','mountain','anchor','rampart','earthenwall']},{key:'water',major:'cold'});
protectedCharge.player.terrain=3;protectedCharge.player.qi.earth=8;protectedCharge.player.qi.any=2;queue(protectedCharge,['frost','repulse','waterbolt']);
const protection=choose(protectedCharge,'burst');assert.ok(protection.stats.plans.every(p=>!p.path.includes('anchor')),'Anchor uses a reaction slot rather than an active AP');
protectedCharge.player.charge={...protectedCharge.skill(protectedCharge.player,'mountain'),storedPower:106};protectedCharge.player.chilled=true;protectedCharge.phase='reaction';protectedCharge.pending={s:protectedCharge.skill(protectedCharge.enemy,'repulse'),raw:18};
assert.equal(planner.chooseReaction(protectedCharge).response,'anchor');assert.ok(protectedCharge.react('anchor').ok);assert.equal(protectedCharge.distance,1);assert.equal(protectedCharge.player.terrain,2);assert.ok(protectedCharge.player.charge);

// A capped heal that cannot remove burn is not a useful growth harvest. Net
// shield scoring also gives no reward when the foe restores the same shield.
const full=new DuelBattle('wood',{major:'symbiosis'},{key:'earth'});full.player.growth=3;full.player.burn=2;full.player.burnTurns=2;
assert.ok(planner.options(full,'defensive').some(s=>s.id==='bloomheal'),'Burn-clearing harvest is useful even at full HP');full.player.burn=0;assert.ok(!planner.options(full,'defensive').some(s=>s.id==='bloomheal'));
const s=new DuelBattle('wood',{}, {key:'earth'}),f=new DuelBattle('wood',{}, {key:'earth'});s.enemy.shield=40;f.enemy.shield=40;
assert.equal(planner.preparedScore(s,f,'balanced',[],f),planner.planScore(s,f,'balanced',[],f));f.enemy.shield=20;
assert.ok(Math.abs(planner.preparedScore(s,f,'balanced',[],f)-planner.planScore(s,f,'balanced',[],f)-20*planner.TENDENCIES.balanced.shield)<1e-9);

// All prepared majors, all ranges/tendencies and costly high-resource branches
// remain bounded, legal and read-only. Existing four-school policies retain the
// old decision path when no prepared opponent is involved.
let probes=0,maxMs=0;
for(const [key,majors] of [['wood',['symbiosis','parasitic']],['earth',['bastion','mountain']]])for(const major of majors)for(const distance of [0,1,2])for(const t of Object.keys(planner.TENDENCIES)){
 const b=new DuelBattle(key,{major},{key:'wood',major:'parasitic'});b.distance=distance;b.player.qi[CLASSES[key].reactionElement]=8;b.player.qi.any=2;if(key==='wood')b.player.growth=2;else b.player.terrain=3;b.player.parasite=2;b.player.parasiteTurns=2;b.planEnemy();
 const r=choose(b,t);maxMs=Math.max(maxMs,r.ms);assert.deepEqual(chooseAction(b,t),r.choice);probes++;
}
const oldPolicy=await import('./docs/balance/prepared-ai/source/before/dist/auto.mjs');let parity=0,updatedReactions=0;
for(const key of ['fire','sword','flame','water'])for(const major of Object.keys((await import('./dist/engine.mjs')).MAJORS[key]))for(const distance of [0,1,2])for(const t of Object.keys(planner.TENDENCIES)){
 const b=new Battle(key,{major});b.distance=distance;b.player.hp-=35;b.planEnemy();const before=JSON.stringify(b);
 const choice=chooseAction(b,t);assert.ok(choice.action==='end'||!b.legal(b.player,choice.skillId));if(JSON.stringify(choice)!==JSON.stringify(oldPolicy.chooseAction(b,t)))updatedReactions++;assert.equal(JSON.stringify(b),before);parity++;
}
const a={key:'wood',config:{major:'symbiosis'}},e={key:'earth',config:{major:'bastion'}};
const world=createPredictiveArena(a,e,{controllers:['prepared','prepared']}),before=worldState(world),choice=chooseArenaAction(world);
assert.deepEqual(worldState(world),before);assert.ok(choice.action==='end'||world.battle.legal(world.battle.player,choice.skillId)===null);
const swapped=createPredictiveArena(e,a,{first:1,controllers:['prepared','prepared']});assert.deepEqual(chooseArenaAction(swapped),choice,'The bounded offline policy preserves seat-renaming symmetry');
console.log(`Prepared AI: real mature harvests, selective cleanse/breaking, far counter, released/protected mountain, no capped-heal waste or shield-refill credit, ${probes} immutable/bounded legal probes, ${parity} old-school legal probes (${updatedReactions} choices changed by the updated opponent reaction model) and offline seat symmetry passed; max probe ${Math.round(maxMs)} ms.`);
