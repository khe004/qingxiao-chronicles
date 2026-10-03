import assert from 'node:assert/strict';
import {Battle,CLASSES,total} from './dist/engine.mjs';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {OPPONENTS,ROUTES,planOpponent} from './dist/opponents.mjs';
import {chooseAction,chooseReaction} from './dist/auto.mjs';
for(const route of Object.values(ROUTES)){assert.equal(route.opponents.length,3);assert.equal(new Set(route.opponents).size,3);}
const profiles={};
for(const id of Object.keys(OPPONENTS))for(const key of ['fire','sword'])for(const distance of [0,1,2]){
 const b=new ChallengeBattle(key,{},id,{distance});assert.equal(b.enemy.key,OPPONENTS[id].key);assert.equal(b.enemy.major,OPPONENTS[id].major);assert.equal(b.enemy.skillIds.length,6);assert.equal(total(b.player.qi),5);assert.equal(total(b.enemy.qi),5);const frozen=JSON.stringify(b),choices=planOpponent(b,id);assert.equal(JSON.stringify(b),frozen);assert.deepEqual(b.enemyPlan,choices.map(c=>c.id));
 let steps=0;while(!b.result){assert.ok(steps++<600);if(b.phase==='player'){const state=JSON.stringify(b),choice=chooseAction(b,'balanced');assert.equal(JSON.stringify(b),state);assert.ok((choice.action==='end'?b.endTurn():b.act(b.player,choice.skillId)).ok);}else if(b.phase==='reaction')assert.ok(b.react(chooseReaction(b,'balanced').response).ok);else{const plan=JSON.stringify(b.enemyPlan);b.enemyStep();if(b.phase!=='player'&&!b.result)assert.equal(JSON.stringify(b.enemyPlan),plan);}}
 const review=b.review();for(const a of review.actors){const q=a.charges;assert.equal(q.started,q.released+q.interrupted+q.rangeMiss+q.canceled+q.pending);assert.ok(a.intentSpent>=0);assert.ok(total((a.name==='你'?b.player:b.enemy).qi)<=10);}
 const stats=profiles[id]??={games:0,wins:0,losses:0,draws:0,rounds:0,actions:{},charges:0};stats.games++;stats[b.result==='win'?'losses':b.result==='lose'?'wins':'draws']++;stats.rounds+=b.round;for(const [s,n] of Object.entries(review.actors[1].actions))stats.actions[s]=(stats.actions[s]||0)+n;stats.charges+=review.actors[1].charges.started;
}
// The advertised plan may fail after player movement; it must never be replaced.
const b=new ChallengeBattle('fire',{},'quick');const announced=[...b.enemyPlan];assert.ok(b.act(b.player,'far').ok);assert.deepEqual(b.enemyPlan,announced);b.endTurn();while(b.phase!=='player'&&!b.result){if(b.phase==='reaction')b.react('none');else b.enemyStep();}assert.ok(b.logs.some(l=>l.text.includes('距离不适合')));
const heavy=new ChallengeBattle('fire',{},'heavy');heavy.enemy.edge=true;heavy.enemy.intent=3;heavy.enemy.qi={metal:5,water:1,any:2,fire:0,wood:0,earth:0};assert.equal(planOpponent(heavy,'heavy')[0].id,'strike');
const ignite=new ChallengeBattle('sword',{},'ignite',{distance:2});ignite.player.seed=0;ignite.player.burn=3;ignite.enemy.qi={metal:0,wood:1,water:0,fire:4,earth:0,any:2};assert.equal(planOpponent(ignite,'ignite')[0].id,'inferno');
const timeout=new ChallengeBattle('fire',{},'sustain',{limit:1});timeout.phase='enemy';timeout.enemyQueue=[];timeout.enemyStep();assert.equal(timeout.result,'draw');assert.equal(timeout.round,1);
console.log('Challenge: 42 complete profile/distance games; valid loadouts, immutable search, frozen plans, charge accounting, counterplay, activation and timeout verified.');console.log(JSON.stringify(profiles));
