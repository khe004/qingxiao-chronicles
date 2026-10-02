import assert from 'node:assert/strict';
import {healVariants} from './scripts/heal-variants.mjs';
const v=await healVariants();
try{
  const ref=v.list[0].engine;
  for(const c of v.list){
    const {Battle,CLASSES,MAJORS,COMMON,SUSTAIN_RECOVERY}=c.engine;assert.equal(SUSTAIN_RECOVERY,2);assert.deepEqual(MAJORS,ref.MAJORS);assert.deepEqual(COMMON,ref.COMMON);
    const classes=structuredClone(CLASSES),reference=structuredClone(ref.CLASSES);for(const table of [classes,reference]){const s=table.fire.skills.find(s=>s.id==='heal');delete s.heal;delete s.clearBurn;delete s.desc;}assert.deepEqual(classes,reference);
    for(const major of ['ignite','sustain'])for(const layers of [0,1,3,5]){
      const b=new Battle('fire',{major}),s=b.skill(b.player,'heal');b.player.hp=100;b.player.burn=layers;b.player.burnTurns=layers?3:0;
      assert.ok(s.desc.includes(`恢复 ${c.heal} 气血`));assert.equal(s.clearBurn,c.clear);
      assert.ok(b.act(b.player,'heal').ok);assert.equal(b.player.hp,100+c.heal+(major==='sustain'?2:0));assert.equal(b.player.burn,Math.max(0,layers-c.clear));assert.equal(b.player.burnTurns,b.player.burn?3:0);assert.equal(b.player.ap,2);assert.equal(b.player.qi.wood,0);assert.equal(b.player.qi.fire,3);
      if(b.player.burn){b.tickBurn(b.player);assert.equal(b.player.burnTurns,2,'Partial cleanse must retain the existing duration');}
      const capped=new Battle('fire',{major});capped.player.hp=capped.player.maxHp-1;capped.player.burn=5;capped.player.burnTurns=3;assert.ok(capped.act(capped.player,'heal').ok);assert.equal(capped.player.hp,capped.player.maxHp);assert.equal(capped.player.burn,5-c.clear,'Overheal must not skip cleansing');
      const insufficient=new Battle('fire',{major});insufficient.player.qi.wood=1;const before=JSON.stringify(insufficient);assert.equal(insufficient.act(insufficient.player,'heal').ok,false);assert.equal(JSON.stringify(insufficient),before);
    }
    const twice=new Battle('fire',{major:'sustain'});twice.player.hp=50;twice.player.qi.wood=4;twice.player.burn=5;twice.player.burnTurns=3;
    assert.ok(twice.act(twice.player,'heal').ok);assert.ok(twice.act(twice.player,'heal').ok);assert.equal(twice.player.hp,50+c.heal*2+2);assert.equal(twice.player.burn,Math.max(0,5-c.clear*2));assert.equal(twice.player.ap,1);
    const a=c.arena.build('fire','sustain'),b=c.arena.build('sword','quick');const x=c.arena.duel(a,b,{first:0}),y=c.arena.duel(b,a,{first:1});assert.deepEqual(x.hp,y.hp.toReversed());assert.equal(x.winner,y.winner===null?null:1-y.winner);
  }
  assert.ok(ref.CLASSES.sword.skills.every(s=>!s.burn),'Sword cannot inflict burn; cleanse tests require fire mirrors or explicit burn fixtures');
  console.log('All heal candidates: isolated forecasts, catalog invariance, recovery/cleanse limits, duration, overheal, costs, repeated cast/passive quota and seat symmetry passed.');
}finally{v.cleanup();}
