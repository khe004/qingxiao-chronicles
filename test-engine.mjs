import assert from 'node:assert/strict';
import {Battle,payment,total,CLASSES} from './dist/engine.mjs';

assert.equal(payment({fire:2,wood:1,any:0},{fire:3}),null);
assert.deepEqual(payment({fire:2,wood:1,any:1},{fire:2,any:1}),{fire:0,wood:1,any:0,metal:0,water:0,earth:0});
const b=new Battle('fire');
assert.equal(total(b.player.qi),5);
assert.ok(b.act(b.player,'seed').ok);
assert.equal(b.enemy.seed,2);
assert.equal(b.player.qi.fire,3);
assert.ok(b.act(b.player,'blaze').ok);
assert.equal(b.enemy.seed,0);
assert.equal(b.enemy.burn,2);
assert.equal(b.enemy.reaction,false);
assert.equal(b.player.ap,1);
assert.ok(b.act(b.player,'far').ok);
assert.equal(b.player.ap,0);
assert.equal(b.distance,2);
assert.equal(b.act(b.player,'spark').ok,false);
assert.ok(b.endTurn().ok);
if(b.phase==='reaction')b.react('none');
for(let i=0;i<15&&b.phase!=='player';i++){if(b.phase==='reaction')b.react('none');else b.enemyStep();}
assert.equal(b.round,2);
assert.ok(total(b.player.qi)<=10);

const charged=new Battle('sword');
assert.ok(charged.act(charged.player,'unity').ok);
assert.ok(charged.player.charge);
assert.equal(charged.act(charged.player,'basic').ok,false);
assert.ok(charged.act(charged.player,'meditate').ok);
assert.equal(charged.player.ap,0);
assert.ok(charged.cancelCharge().ok);
assert.equal(charged.player.charge,null);

const interrupt=new Battle('fire');
interrupt.enemy.charge={name:'万剑归一'};
assert.ok(interrupt.act(interrupt.player,'vine').ok);
assert.equal(interrupt.enemy.charge,null);

const reaction=new Battle('fire');reaction.endTurn();
while(reaction.phase==='enemy')reaction.enemyStep();
assert.equal(reaction.phase,'reaction');
const old=JSON.stringify(reaction.snapshot());
assert.equal(reaction.react('invalid').ok,false);
assert.equal(JSON.stringify(reaction.snapshot()),old);
assert.ok(reaction.react('shield').ok);
assert.equal(reaction.player.reaction,false);

const outcome={fire:{win:0,lose:0},sword:{win:0,lose:0}};
for(const key of ['fire','sword'])for(let trial=0;trial<40;trial++){
  const game=new Battle(key);let steps=0;
  while(!game.result&&steps++<500){
    for(const a of [game.player,game.enemy]){assert.ok(a.hp>=0&&a.hp<=a.maxHp);assert.ok(a.ap>=0&&a.ap<=3);assert.ok(total(a.qi)<=10);assert.ok(Object.values(a.qi).every(n=>Number.isInteger(n)&&n>=0));assert.ok(a.shield>=0&&a.shield<=60);}
    if(game.phase==='player'){
      const p=game.player;
      let options=CLASSES[key].skills.map(s=>s.id).filter(id=>!game.legal(p,id));
      if(trial%4===0&&!game.legal(p,'basic')){options=['basic',...options];}
      if(trial%4===1){options=options.reverse();}
      if(game.distance===2&&key==='sword'&&!game.legal(p,'near'))options.unshift('near');
      const id=options[(steps+trial)%Math.max(1,options.length)];
      if(id)assert.ok(game.act(p,id).ok);else game.endTurn();
    }else if(game.phase==='reaction'){
      const elem=CLASSES[key].reactionElement;
      assert.ok(game.react(trial%3===0?'none':game.player.qi[elem]?'shield':'none').ok);
    }else game.enemyStep();
  }
  assert.ok(game.result,`${key} 对局未能结束`);
  outcome[key][game.result]++;
}
console.log('Resource, combo, distance, charge, interruption, reaction and 80 complete duels passed.');
console.log(JSON.stringify(outcome));
