import assert from 'node:assert/strict';
import {Battle,CLASSES} from './dist/engine.mjs';
import {DuelBattle} from './dist/duel-setup.mjs';
import {chooseAction,TENDENCIES} from './dist/auto.mjs';
import {activeFallback} from './dist/active-policy.mjs';
function finish(b){for(let i=0;i<20&&b.round===1&&!b.result;i++){if(b.phase==='reaction')b.react('none');else b.enemyStep();}assert.ok(b.round===2||b.result);}
const far=new DuelBattle('sword',{}, {key:'sword'});far.distance=2;far.enemyQueue=['swift','strike'];far.enemyPlan=[...far.enemyQueue];far.endTurn();finish(far);assert.deepEqual(far.stats[1].actions,{near:1,swift:1,strike:1});assert.equal(far.stats[1].unusedAP,0);assert.equal(far.stats[1].adaptations,1);
const near=new DuelBattle('fire',{}, {key:'sword',skillIds:['lunge','swift','strike','guard','cut','expose']});near.distance=2;near.enemy.intent=3;near.enemyQueue=['lunge'];near.endTurn();finish(near);assert.equal(near.stats[1].actions.near,2);assert.equal(near.stats[1].actions.lunge,1,'Two moves can repair a close-only attack');
const empty=new DuelBattle('fire');empty.enemyQueue=[];empty.enemyPlan=[];empty.endTurn();finish(empty);assert.equal(empty.stats[1].unusedAP,0);assert.ok(Object.keys(empty.stats[1].actions).length);
const exhausted=new DuelBattle('fire',{}, {key:'sword'});exhausted.enemy.qi={metal:0,water:0,fire:0,wood:0,earth:0,any:0};exhausted.enemyQueue=['strike'];exhausted.endTurn();finish(exhausted);assert.equal(exhausted.stats[1].unusedAP,0);assert.ok(exhausted.stats[1].actions.meditate||exhausted.stats[1].actions.basic);
for(const key of Object.keys(CLASSES))for(const tendency of Object.keys(TENDENCIES)){const b=new DuelBattle(key);b.enemyQueue=[];b.enemyPlan=[];b.distance=2;const c=chooseAction(b,tendency);assert.equal(c.action,'skill',`${key}/${tendency}: empty pressure must not cause an idle turn`);assert.ok(!b.legal(b.player,c.skillId));}
const charged=new DuelBattle('sword');charged.act(charged.player,'unity');charged.player.ap=1;charged.player.qi={metal:8,water:0,fire:0,wood:0,earth:0,any:2};charged.player.shield=60;const wait=activeFallback(charged,charged.player);assert.equal(wait.id,undefined);assert.match(wait.reason,/等待.*释放/);
const bait=new DuelBattle('fire');bait.player.qi={metal:0,water:0,fire:0,wood:0,earth:0,any:0};bait.player.ap=1;bait.player.meditated=true;bait.enemy.shield=60;bait.enemy.counter={name:'测试反伤',power:25,hits:2,element:'metal'};const saved=activeFallback(bait,bait.player);assert.equal(saved.id,undefined);assert.match(saved.reason,/反伤.*存气/);
console.log('AI: one/two-step distance repair, legal skill replacement, empty plan and qi exhaustion recovery, all six schools/four tendencies act, charge/retaliation waits explained, public primary plan preserved.');
