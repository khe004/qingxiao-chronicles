import assert from 'node:assert/strict';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {planBudget,reactionBudgetConflict} from './dist/opponent-resources.mjs';
import {opponentReactionDecision,planOpponent} from './dist/opponents.mjs';
const qi=(x={})=>({metal:0,wood:0,water:0,fire:0,earth:0,any:0,...x});
function queue(b,ids){b.enemyPlan=[...ids];b.enemyQueue=[...ids];}
const heavy=new ChallengeBattle('fire',{},'heavy',{difficulty:'questioning'});heavy.enemy.qi=qi({metal:2,any:1});queue(heavy,['strike']);assert.deepEqual(reactionBudgetConflict(heavy,{metal:1}),['strike']);const before=JSON.stringify(heavy);const d=opponentReactionDecision(heavy,'heavy',heavy.skill(heavy.player,'blaze'),46);assert.equal(d.response,'none');assert.ok(d.reason.includes('断岳'));assert.equal(JSON.stringify(heavy),before);
// Actual costs, meditation before payment, and death priority rather than sums.
heavy.enemy.qi=qi({metal:2,any:1});queue(heavy,['meditate','strike']);assert.deepEqual(reactionBudgetConflict(heavy,{metal:1}),[]);heavy.enemy.hp=10;assert.notEqual(opponentReactionDecision(heavy,'heavy',heavy.skill(heavy.player,'blaze'),46).response,'none');
// The any payment consumes colored qi when no universal qi remains.
heavy.enemy.hp=230;heavy.enemy.qi=qi({metal:3});queue(heavy,['strike']);assert.deepEqual(reactionBudgetConflict(heavy,{metal:1}),['strike']);
// Duplicate ids must account for an additional failed occurrence.
heavy.enemy.qi=qi({metal:1});queue(heavy,['swift','swift']);assert.deepEqual(planBudget(heavy).failures,['swift']);assert.deepEqual(reactionBudgetConflict(heavy,{metal:1}),['swift']);
// Refunded universal qi and fire generation are replayed, with no root mutations.
const fire=new ChallengeBattle('sword',{},'sustain',{difficulty:'questioning'});fire.enemy.qi=qi({wood:2,any:1,fire:1});fire.enemy.hp=150;queue(fire,['nourish','blaze']);const frozen=JSON.stringify(fire);assert.deepEqual(planBudget(fire).failures,[]);assert.deepEqual(reactionBudgetConflict(fire,{wood:1}),[]);assert.equal(JSON.stringify(fire),frozen);
queue(fire,['heal','seed']);fire.enemy.qi=qi({wood:3});assert.deepEqual(reactionBudgetConflict(fire,{wood:1}),['seed']);
// Out-of-range skips don't incorrectly reserve unavailable attacks.
heavy.distance=2;heavy.enemy.qi=qi({metal:2,any:1});queue(heavy,['strike']);assert.deepEqual(reactionBudgetConflict(heavy,{metal:1}),[]);
// Spending on the last universal qi can starve a later meditation-provided cost.
heavy.distance=1;heavy.enemy.qi=qi({metal:1,any:1});queue(heavy,['guard','meditate','strike']);assert.deepEqual(planBudget(heavy).failures,['strike']);
// A prepared midfight board also keeps planning isolated; natural charge
// selection and release are covered by the retained counterplay benchmark.
const choice=new ChallengeBattle('fire',{},'heavy',{distance:2,difficulty:'questioning'});choice.round=4;choice.enemy.qi=qi({metal:4,water:1,any:2});choice.enemy.intent=4;choice.enemy.hp=100;choice.player.qi=qi({fire:1,wood:1});choice.player.hp=180;
const state=JSON.stringify(choice);planOpponent(choice,'heavy');assert.equal(JSON.stringify(choice),state);
console.log('Exact budgets: colored/universal costs, meditation, refunds, duplicate failures, range skips, death priority and immutable planning passed.');
const live=new ChallengeBattle('fire',{},'heavy',{difficulty:'questioning'});live.enemy.qi=qi({metal:2,any:1});queue(live,['strike']);assert.ok(live.act(live.player,'blaze').ok);assert.equal(live.stats[1].reactionPreserved,1);assert.ok(live.logs.some(l=>l.text.includes('留气：')));live.endTurn();live.enemyStep();assert.equal(live.stats[1].actions.strike,1);assert.equal(live.stats[1].skipped['所需灵气不足']??0,0);
console.log('Live reaction preserves an announced strike, records the reason, and executes without a resource skip.');
