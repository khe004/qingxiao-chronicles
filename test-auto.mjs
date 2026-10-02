import assert from 'node:assert/strict';
import {Battle,CLASSES,total} from './dist/engine.mjs';
import {TENDENCIES,chooseAction,chooseReaction,describeAutoChoice} from './dist/auto.mjs';

assert.throws(()=>chooseAction(new Battle(),'unknown'),/未知/);
const far=new Battle('sword');far.distance=2;
const snapshot=JSON.stringify(far);
const suggestion=chooseAction(far,'balanced');
assert.equal(JSON.stringify(far),snapshot,'Planning must not mutate the live battle');
assert.ok(suggestion.action==='end'||!far.legal(far.player,suggestion.skillId));

const emergency=new Battle('fire');emergency.phase='reaction';emergency.player.hp=30;
emergency.pending={s:emergency.skill(emergency.enemy,'strike'),raw:60};
const response=chooseReaction(emergency,'aggressive');
assert.equal(response.response,'shield','Prevent lethal damage before following attack preferences');
assert.ok(emergency.react(response.response).ok);assert.ok(emergency.player.hp>0);

const covered=new Battle('fire');covered.phase='reaction';covered.player.shield=60;
covered.pending={s:covered.skill(covered.enemy,'swift'),raw:30};
assert.equal(chooseReaction(covered,'defensive').response,'none');

const results=[],traces={};
for(const key of Object.keys(CLASSES))for(const tendency of Object.keys(TENDENCIES)){
  const b=new Battle(key),actions=[];let steps=0;
  while(!b.result&&steps++<500){
    if(b.phase==='player'){
      const choice=chooseAction(b,tendency);assert.ok(choice);
      assert.ok(describeAutoChoice(b,choice,tendency).includes('自动'));
      if(choice.action==='end'){assert.ok(b.endTurn().ok);actions.push('end');}
      else{assert.equal(b.legal(b.player,choice.skillId),null);actions.push(choice.skillId);assert.ok(b.act(b.player,choice.skillId).ok);}
    }else if(b.phase==='reaction'){
      const choice=chooseReaction(b,tendency);assert.ok(choice);assert.ok(b.react(choice.response).ok);
    }else b.enemyStep();
    for(const a of [b.player,b.enemy]){assert.ok(a.hp>=0&&a.hp<=a.maxHp);assert.ok(a.ap>=0&&a.ap<=3);assert.ok(total(a.qi)<=10);assert.ok(Object.values(a.qi).every(n=>n>=0));}
  }
  assert.ok(b.result,`${key}/${tendency}: automation stalled`);
  if(tendency==='burst')assert.ok(actions.includes(key==='fire'?'inferno':'unity'),'Burst preference should actually use charged skills');
  traces[key+':'+tendency]=actions.join(',');
  results.push({class:key,tendency,result:b.result,rounds:b.round,actions:actions.length});
}
for(const key of Object.keys(CLASSES))assert.ok(new Set(Object.keys(TENDENCIES).map(t=>traces[key+':'+t])).size>=3,'Preferences must produce different action sequences');
console.log('Read-only planning, legal decisions, lethal reactions and all 8 class/preference duels passed.');
console.log(JSON.stringify(results));
