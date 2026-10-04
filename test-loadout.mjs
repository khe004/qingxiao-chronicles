import assert from 'node:assert/strict';
import {Battle,CLASSES,MAJORS,SUSTAIN_RECOVERY,normalizeLoadout,total} from './dist/engine.mjs';
import {TENDENCIES,chooseAction,chooseReaction,describeAutoChoice} from './dist/auto.mjs';

for(const [key,c] of Object.entries(CLASSES)){
  assert.equal(c.skills.length,8);
  for(const major of Object.keys(MAJORS[key])){
    const config=normalizeLoadout(key,{major});assert.equal(config.skillIds.length,6);
    assert.throws(()=>normalizeLoadout(key,{major,skillIds:config.skillIds.slice(1)}),/6/);
    assert.throws(()=>normalizeLoadout(key,{major,skillIds:Array(6).fill(config.skillIds[0])}),/不同/);
    assert.throws(()=>normalizeLoadout(key,{major,skillIds:[...config.skillIds.slice(1),'basic']}),/不属于/);
    assert.throws(()=>normalizeLoadout(key,{major:'invalid'}),/主修/);
    const battle=new Battle(key,config);config.skillIds.pop();assert.equal(battle.player.skillIds.length,6,'Battle owns a copy of the configuration');
    const unequipped=c.skills.find(s=>!battle.player.skillIds.includes(s.id));
    const before=JSON.stringify(battle);assert.equal(battle.act(battle.player,unequipped.id).ok,false);assert.equal(JSON.stringify(battle),before,'Unequipped actions must not spend resources or change state');
  }
}
const fireSkills=['seed','spark','blaze','heal','ember','nourish'];
const ignite=new Battle('fire',{major:'ignite',skillIds:fireSkills});ignite.enemy.seed=5;ignite.enemy.reaction=false;
assert.ok(ignite.act(ignite.player,'ember').ok);assert.equal(ignite.enemy.seed,3);assert.equal(ignite.player.qi.fire,2,'First partial ignition refunds one fire');
assert.ok(ignite.act(ignite.player,'ember').ok);assert.equal(ignite.enemy.seed,1);assert.equal(ignite.player.qi.fire,1,'Ignition refund only triggers once per round');
assert.equal(ignite.logs.filter(l=>l.text.startsWith('引燃爆发')).length,1);

const sustain=new Battle('fire',{major:'sustain',skillIds:fireSkills});sustain.player.hp=100;sustain.player.burn=3;sustain.player.burnTurns=3;
assert.ok(sustain.act(sustain.player,'nourish').ok);assert.equal(sustain.player.hp,114+SUSTAIN_RECOVERY,'Wood major adds its recovery to the skill heal');assert.equal(sustain.player.burn,2);assert.equal(sustain.player.qi.any,1);
const beforeSecond=JSON.stringify(sustain);assert.equal(sustain.act(sustain.player,'nourish').ok,false);assert.equal(JSON.stringify(sustain),beforeSecond);
assert.ok(sustain.act(sustain.player,'seed').ok);assert.equal(sustain.player.hp,114+SUSTAIN_RECOVERY,'Sustain recovery only triggers once per round');

const swordSkills=['swift','expose','strike','guard','lunge','return'];
const quick=new Battle('sword',{major:'quick',skillIds:swordSkills});quick.enemy.reaction=false;
assert.ok(quick.act(quick.player,'swift').ok);assert.equal(quick.player.intent,2);
const beforeLunge=JSON.stringify(quick);assert.equal(quick.act(quick.player,'lunge').ok,false);assert.equal(JSON.stringify(quick),beforeLunge,'Lunge requires near distance before spending intent');
assert.ok(quick.act(quick.player,'near').ok);quick.enemy.charge={name:'测试蓄势'};
assert.ok(quick.act(quick.player,'lunge').ok);assert.equal(quick.player.intent,1);assert.equal(quick.enemy.charge,null);

const heavy=new Battle('sword',{major:'heavy',skillIds:swordSkills});heavy.enemy.reaction=false;heavy.enemy.shield=0;heavy.player.intent=5;
assert.ok(heavy.act(heavy.player,'guard').ok);heavy.hurt(heavy.player,10,'测试攻击');assert.equal(heavy.player.edge,true);assert.equal(heavy.player.edgeExpires,2);
const preview=heavy.preview(heavy.skill(heavy.player,'return')),enemyHp=heavy.enemy.hp;
assert.ok(heavy.act(heavy.player,'return').ok);assert.equal(heavy.player.intent,3);assert.equal(heavy.player.edge,false);assert.equal(enemyHp-heavy.enemy.hp,preview,'Preview includes partial sword intent and guarded bonus');

const expiry=new Battle('sword',{major:'heavy'});expiry.player.shield=20;expiry.hurt(expiry.player,5,'测试攻击');expiry.enemyQueue=[];
assert.ok(expiry.endTurn().ok);expiry.enemyStep();assert.equal(expiry.round,2);assert.equal(expiry.player.edge,true);assert.ok(expiry.endTurn().ok);assert.equal(expiry.player.edge,false,'Unused guarded bonus expires at next own action end');

const charged=new Battle('sword',{major:'heavy'});charged.enemy.reaction=false;charged.player.intent=3;charged.player.edge=true;
assert.ok(charged.act(charged.player,'unity').ok);assert.equal(charged.player.charge.storedPower,117);assert.equal(charged.player.intent,0);assert.equal(charged.player.edge,false);
charged.player.intent=1;charged.release(charged.player);assert.equal(charged.player.intent,1,'Release must not consume sword intent a second time');

const builds=[];
for(const key of Object.keys(CLASSES))for(const major of Object.keys(MAJORS[key])){
  builds.push({key,config:normalizeLoadout(key,{major})});
  builds.push({key,config:{major,skillIds:key==='fire'?['seed','blaze','ember','heal','nourish','vine']:key==='flame'?['flare','kindle','cinder','combust','firewall','solar']:key==='water'?['waterbolt','frost','repulse','surge','rinse','ebb']:key==='sword'?swordSkills:CLASSES[key].skills.slice(2,8).map(s=>s.id)}});
}
const results=[];
for(const {key,config} of builds)for(const tendency of Object.keys(TENDENCIES)){
  const b=new Battle(key,config);let steps=0;
  while(!b.result&&steps++<700){
    if(b.phase==='player'){
      const before=JSON.stringify(b),choice=chooseAction(b,tendency);assert.equal(JSON.stringify(b),before,'Planning stays read only with all loadouts');
      if(choice.action==='end')assert.ok(b.endTurn().ok);else{assert.ok(b.player.skillIds.includes(choice.skillId)||['basic','near','far','meditate','purify','dispel'].includes(choice.skillId));assert.ok(b.act(b.player,choice.skillId).ok);}
    }else if(b.phase==='reaction')assert.ok(b.react(chooseReaction(b,tendency).response).ok);else b.enemyStep();
    for(const a of [b.player,b.enemy]){assert.ok(a.hp>=0&&a.hp<=a.maxHp);assert.ok(a.ap>=0&&a.ap<=3);assert.ok(total(a.qi)<=10);assert.ok(Object.values(a.qi).every(n=>Number.isInteger(n)&&n>=0));assert.ok(a.intent>=0&&a.intent<=5);assert.ok(a.seed>=0&&a.seed<=5);assert.ok(a.shield>=0&&a.shield<=60);}
  }
  assert.ok(b.result,`${key}/${config.major}/${tendency}: duel did not finish`);
  results.push({class:key,major:config.major,custom:config.skillIds.join(',')!==MAJORS[key][config.major].recommended.join(','),tendency,result:b.result,rounds:b.round,logs:b.logs.length});
}
const history=new Battle('sword',{major:'heavy',skillIds:['swift','expose','guard','return','lunge','cut']});
for(let n=0;n<700&&!history.result;n++){
  if(history.phase==='player'){const choice=chooseAction(history,'defensive');history.log(describeAutoChoice(history,choice,'defensive'),'decision');if(choice.action==='end')history.endTurn();else history.act(history.player,choice.skillId);}
  else if(history.phase==='reaction')history.react(chooseReaction(history,'defensive').response);else history.enemyStep();
}
assert.ok(history.result);assert.ok(history.logs.length>160,'Long configured duel retains complete history');
assert.equal(history.logs[0].id,1);assert.equal(history.logs.at(-1).id,history.logs.length);assert.ok(history.logs[0].text.includes('装备：'),'Initial setup survives the entire duel');
console.log('Loadout validation, resource immutability, twelve majors, bonus expiry/charge and 96 configured automatic duels passed.');
console.log(JSON.stringify(results));
