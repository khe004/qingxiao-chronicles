import assert from 'node:assert/strict';
import {Battle,CLASSES,COMMON,total} from './dist/engine.mjs';
import {chooseAction,TENDENCIES,describeAutoChoice} from './dist/auto.mjs';

function charged(key,{ap=3,distance=1}={}){
  const b=new Battle(key,key==='flame'?{major:'smolder'}:{});b.distance=distance;b.player.ap=ap;
  b.player.qi={metal:0,wood:0,water:0,fire:0,earth:0,any:1,...(key!=='sword'?{fire:4,wood:2}:{metal:4,water:2})};
  b.player.intent=2;assert.ok(b.act(b.player,key==='fire'?'inferno':key==='flame'?'solar':'unity').ok);return b;
}
for(const key of Object.keys(CLASSES).filter(key=>CLASSES[key].skills.some(s=>s.kind==='charge'))){
  const b=charged(key),power=b.player.charge.storedPower;
  assert.equal(b.player.ap,1);assert.equal(total(b.player.qi),3);
  for(const s of [...b.skills(b.player),...COMMON])if(!['move','meditate','guard'].includes(s.kind)){
    const before=JSON.stringify(b);assert.equal(b.act(b.player,s.id).ok,false);assert.equal(JSON.stringify(b),before,'Blocked skills must not alter the battle');
  }
  assert.ok(b.act(b.player,'far').ok);assert.equal(b.distance,2);assert.equal(b.player.ap,0);assert.equal(b.player.charge.storedPower,power);
  assert.equal(b.act(b.player,'meditate').ok,false,'Utility actions still cost AP');
  const m=charged(key);assert.ok(m.act(m.player,'meditate').ok);assert.equal(total(m.player.qi),5);assert.equal(m.player.meditated,true);assert.equal(m.player.ap,0);
  m.player.ap=1;assert.equal(m.act(m.player,'meditate').ok,false,'The once-per-round limit still applies');
  const empty=charged(key,{ap:2});assert.equal(empty.player.ap,0);assert.equal(empty.act(empty.player,'far').ok,false);
  const tooClose=charged(key);assert.ok(tooClose.act(tooClose.player,'near').ok);const hp=tooClose.enemy.hp;tooClose.release(tooClose.player);assert.equal(tooClose.enemy.hp,hp);assert.equal(tooClose.player.charge,null,'Moving near still invalidates release');
  for(const tendency of Object.keys(TENDENCIES)){
    const ai=charged(key),before=JSON.stringify(ai),choice=chooseAction(ai,tendency);assert.equal(JSON.stringify(ai),before);
    assert.equal(choice.action,'skill','AI should use an available remaining action in this fixture');
    if(key==='sword')assert.notEqual(choice.skillId,'guard','AI reserves the last metal qi for an available reaction during charge');
    assert.ok(['move','meditate','guard'].includes(ai.skill(ai.player,choice.skillId).kind));assert.ok(ai.act(ai.player,choice.skillId).ok);
    assert.ok(describeAutoChoice(charged(key),choice,tendency).includes('蓄势'));
  }
}
const guard=charged('sword'),lockedPower=guard.player.charge.storedPower;
assert.equal(guard.player.intent,0);assert.ok(guard.act(guard.player,'guard').ok);assert.equal(guard.player.shield,22);assert.equal(guard.player.intent,1);assert.equal(guard.player.charge.storedPower,lockedPower);
guard.enemy.reaction=false;const hp=guard.enemy.hp;guard.release(guard.player);
assert.equal(hp-guard.enemy.hp,Math.round(lockedPower*100/(100+CLASSES.fire.physical)));assert.equal(guard.player.intent,1,'Release must retain post-charge intent');
const cancelled=charged('fire');assert.ok(cancelled.act(cancelled.player,'meditate').ok);const qi=JSON.stringify(cancelled.player.qi);assert.ok(cancelled.cancelCharge().ok);assert.equal(JSON.stringify(cancelled.player.qi),qi);assert.equal(cancelled.player.ap,0,'Cancel does not refund any action or fee');

for(const key of ['fire','sword']){
  const b=new Battle(key==='fire'?'sword':'fire');b.round=3;b.enemy.qi={metal:0,wood:0,water:0,fire:0,earth:0,any:1,...(key!=='sword'?{fire:4,wood:2}:{metal:4,water:2})};b.planEnemy();
  const plan=[...b.enemyPlan],chargeId=key==='fire'?'inferno':key==='flame'?'solar':'unity';assert.equal(plan[0],chargeId);assert.equal(plan.length,2);assert.ok(['guard','far','meditate'].includes(plan[1]));
  b.endTurn();b.enemyStep();assert.ok(b.enemy.charge);assert.equal(b.enemy.ap,1);b.enemyStep();assert.equal(b.enemy.ap,0);assert.ok(b.enemy.charge);assert.deepEqual(b.enemyPlan,plan,'Enemy must execute its announced utility after charging');
}
console.log('Charge utility costs/limits, attack locks, range failure, fixed power, cancellation, all AI preferences and enemy announced actions passed.');
