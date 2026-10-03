import assert from 'node:assert/strict';
import {Trial,recordText} from './dist/trial.mjs';
import {ROUTES} from './dist/opponents.mjs';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
for(const route of ['wood','earth'])for(const difficulty of ['practice','questioning']){
 const t=new Trial();t.start(route,difficulty);
 for(let i=0;i<3;i++){
  const key=i===1?'earth':'wood',major=key==='earth'?'mountain':'parasitic',b=new ChallengeBattle(key,{major},t.opponentId,{difficulty,distance:i===1?2:1});
  assert.equal(b.opponentId,ROUTES[route].opponents[i]);assert.equal(b.player.major,major);assert.equal(b.player.hp,b.player.maxHp);assert.equal(b.player.ap,3);assert.equal(b.player.shield,0);assert.equal(b.player.burn,0);assert.equal(b.player.parasite,0);assert.equal(b.player.growth??b.player.terrain,0);assert.equal(b.enemy.growth??b.enemy.terrain,0);
  t.begin();b.result=['win','lose','draw'][i];b.log('木土路线备战换装验证');const r=t.finish(b),text=recordText(r);assert.equal(r.route,route);assert.equal(r.stage,i+1);assert.equal(r.difficulty,difficulty);assert.deepEqual(r.player.skillIds,b.player.skillIds);assert.equal(t.finish(b),r);b.player.skillIds.pop();b.logs.length=0;assert.equal(recordText(r),text);if(i<2)t.next();
 }
 assert.equal(t.status,'complete');assert.equal(t.snapshot().completed,3);assert.equal(t.snapshot().wins,1);const state=JSON.stringify(t);assert.throws(()=>t.start('invalid','questioning'));assert.equal(JSON.stringify(t),state);t.start(route,difficulty);t.begin();const b=new ChallengeBattle('wood',{},t.opponentId,{difficulty});assert.equal(t.archive(b,{abandoned:true}).result,'abandoned');t.retry();assert.equal(t.status,'preparing');assert.equal(t.difficulty,difficulty);t.leave();assert.equal(t.history.length,4);
}
console.log('Wood/earth trials: both routes and difficulties, three ordered stages, class/major changes, fresh resources, immutable history, win/loss/draw continuation, invalid-route atomicity, abandonment/retry passed.');
