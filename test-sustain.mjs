import assert from 'node:assert/strict';
import {variants} from './scripts/sustain-variants.mjs';
const v=await variants();
try{
  const reference=v.list[0].engine;
  for(const {engine} of v.list){assert.deepEqual(engine.CLASSES,reference.CLASSES);assert.deepEqual(engine.COMMON,reference.COMMON);const majors=structuredClone(engine.MAJORS),base=structuredClone(reference.MAJORS);delete majors.fire.sustain.effect;delete base.fire.sustain.effect;assert.deepEqual(majors,base,'All other major rules and loadouts remain identical');}
  for(const {recovery,engine:{Battle,MAJORS,SUSTAIN_RECOVERY,total},arena:{build,duel}} of v.list){
    assert.equal(SUSTAIN_RECOVERY,recovery);assert.ok(MAJORS.fire.sustain.effect.includes(`恢复 ${recovery} 气血`));
    const b=new Battle('fire',{major:'sustain'});b.player.hp=100;assert.ok(b.act(b.player,'seed').ok);assert.equal(b.player.hp,100+recovery);assert.equal(b.player.qi.fire,3);assert.equal(b.player.qi.wood,1);assert.equal(b.player.ap,2);
    b.player.qi.wood=2;assert.ok(b.act(b.player,'heal').ok);assert.equal(b.player.hp,126+recovery,'Second wood skill must not proc another bonus');
    b.beginRound();assert.ok(b.act(b.player,'seed').ok);assert.equal(b.player.hp,126+recovery*2);
    const full=new Battle('fire',{major:'sustain'});full.player.hp=full.player.maxHp-1;assert.ok(full.act(full.player,'seed').ok);assert.equal(full.player.hp,full.player.maxHp);assert.ok(full.logs.some(l=>l.text.includes('生息消耗')&&l.text.includes('恢复 1 气血')));
    const nourish=new Battle('fire',{major:'sustain'});nourish.player.hp=100;nourish.player.burn=3;nourish.player.burnTurns=3;const qi=total(nourish.player.qi);assert.ok(nourish.act(nourish.player,'nourish').ok);assert.equal(nourish.player.hp,114+recovery);assert.equal(nourish.player.burn,2);assert.equal(total(nourish.player.qi),qi);assert.equal(nourish.player.ap,2);assert.equal(nourish.act(nourish.player,'nourish').ok,false);
    const ignite=new Battle('fire',{major:'ignite'});ignite.player.hp=100;assert.ok(ignite.act(ignite.player,'seed').ok);assert.equal(ignite.player.hp,100,'Other major must not inherit recovery');assert.equal(ignite.player.qi.fire,3);
    const a=build('fire','sustain'),s=build('sword','quick');const normal=duel(a,s,{first:0}),swapped=duel(s,a,{first:1});assert.deepEqual(normal.hp,swapped.hp.toReversed());assert.equal(normal.winner,swapped.winner===null?null:1-swapped.winner);
  }
  console.log('All recovery candidates: isolated engine/AI, shared UI value, once-per-round recovery, overheal, unchanged wood passive/costs/cleanse and seat symmetry passed.');
}finally{v.cleanup();}
