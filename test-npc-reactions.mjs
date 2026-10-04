import assert from 'node:assert/strict';
import {Battle,CLASSES} from './dist/engine.mjs';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {opponentReactionDecision} from './dist/opponents.mjs';
const qi=x=>({metal:0,wood:0,water:0,fire:0,earth:0,any:0,...x});
function board(key='wood',enemy='earth'){
 const b=new Battle(key,{}, {key:enemy});b.enemyPlan=b.enemyQueue=['basic'];b.enemy.shield=0;return b;
}
for(const [key,id] of [['wood','wooddart'],['earth','stonebolt'],['water','waterbolt'],['flame','flare']]){
 const b=board(key);b.player.ap=0;const s=b.skill(b.player,id),before=JSON.stringify(b);
 assert.equal(b.reactionDecision(s,b.raw(b.player,s)).response,'shield');assert.equal(JSON.stringify(b),before);
 b.player.ap=1;b.act(b.player,id);assert.equal(b.enemy.reaction,false);assert.equal(b.enemy.hp,b.enemy.maxHp,'Low-cost spell can be defended');
}
const light=board();light.player.ap=0;assert.equal(light.reactionDecision(light.skill(light.player,'basic'),12).response,'none');
light.enemy.shield=60;assert.equal(light.reactionDecision(light.skill(light.player,'wooddart'),26).response,'none');
const heavy=board('wood');heavy.player.growth=3;const dart=heavy.skill(heavy.player,'wooddart');assert.equal(heavy.reactionDecision(dart,26).response,'none','Keep a response for the prepared heavy follow-up');heavy.player.ap=0;assert.equal(heavy.reactionDecision(dart,26).response,'shield','Cannot reserve against a heavy spell without remaining AP');
heavy.enemy.qi=qi({});heavy.player.ap=2;assert.deepEqual(heavy.reactionDecision(dart,26),{response:'none'},'Cannot claim to retain an unaffordable reaction');
const survival=board();survival.enemy.hp=35;survival.enemyPlan=survival.enemyQueue=['foundation','landbreak'];survival.enemy.qi=qi({earth:1,any:2});assert.equal(survival.reactionDecision(dart,80).response,'evade','Shield cannot save this hit but evade can');
survival.enemy.terrain=2;survival.enemy.chilled=true;survival.attack(survival.player,dart,80);assert.equal(survival.distance,2);assert.equal(survival.enemy.terrain,1);assert.equal(survival.enemy.chilled,false);assert.ok(survival.enemy.hp>0);
const reserve=board();reserve.enemy.qi=qi({earth:3});reserve.enemyPlan=reserve.enemyQueue=['foundation','landbreak'];assert.equal(reserve.reactionDecision(dart,26).response,'none');reserve.enemy.hp=15;assert.equal(reserve.reactionDecision(dart,26).response,'shield','Survival overrides qi reservations');
for(const difficulty of ['practice','questioning']){
 const b=new ChallengeBattle('wood',{},'cold',{difficulty});b.enemy.shield=0;b.enemyQueue=b.enemyPlan=['basic'];b.player.ap=0;
 assert.equal(opponentReactionDecision(b,'cold',b.skill(b.player,'wooddart'),26).response,'shield');
 const before=JSON.stringify(b);b.reactionDecision(b.skill(b.player,'wooddart'),26);assert.equal(JSON.stringify(b),before);
}
assert.equal(CLASSES.earth.reactionElement,'earth');
console.log('NPC reactions: defended low-cost attacks, light/heavy judgment, AP limits, actual shield cap, survival/evade, movement costs, frozen-plan qi reservations and both difficulties passed.');
