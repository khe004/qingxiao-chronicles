import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {rangeVariants} from './scripts/range-variants.mjs';
import {CLASSES as liveClasses,MAJORS as liveMajors} from './dist/engine.mjs';
import {TENDENCIES as liveTendencies} from './dist/auto.mjs';
const snapshot='docs/balance/range-movement/source.json.gz';
const v=await rangeVariants({snapshotPath:existsSync(snapshot)?snapshot:undefined});
try{
  const ref=v.list[0].engine;
  for(const c of v.list){
    const {Battle,CLASSES,MAJORS,COMMON,HEAL_RECOVERY,SUSTAIN_RECOVERY}=c.engine;
    assert.equal(HEAL_RECOVERY,18);assert.equal(SUSTAIN_RECOVERY,2);assert.deepEqual(MAJORS,ref.MAJORS);assert.deepEqual(COMMON,ref.COMMON);
    const catalog=structuredClone(CLASSES),original=structuredClone(ref.CLASSES);
    for(const table of [catalog,original])for(const s of table.fire.skills)delete s.range;
    assert.deepEqual(catalog,original,'Only ranges or movement refund may differ');
    for(const id of ['seed','spark','blaze','ember']){
      const s=CLASSES.fire.skills.find(s=>s.id===id);
      assert.deepEqual(s.range,c.short.includes(id)?[0,1]:[0,1,2]);
      const b=new Battle('fire',{skillIds:['seed','spark','blaze','ember','heal','inferno']});b.distance=2;
      const before=JSON.stringify(b),result=b.act(b.player,id);
      assert.equal(result.ok,!c.short.includes(id));
      if(!result.ok)assert.equal(JSON.stringify(b),before,'Out-of-range attempts cannot consume anything');
      const close=new Battle('fire',{skillIds:['seed','spark','blaze','ember','heal','inferno']});close.distance=1;
      assert.ok(close.act(close.player,id).ok);assert.equal(close.player.ap,2);
    }
    const sword=new Battle('sword');sword.distance=2;
    assert.ok(sword.act(sword.player,'near').ok);assert.equal(sword.player.ap,c.approachRefund?3:2);
    assert.ok(sword.act(sword.player,'near').ok);assert.equal(sword.player.ap,c.approachRefund?2:1,'Refund only once');
    const edge=JSON.stringify(sword);assert.equal(sword.act(sword.player,'near').ok,false);assert.equal(JSON.stringify(sword),edge);
    const fire=new Battle('fire');fire.distance=2;assert.ok(fire.act(fire.player,'near').ok);assert.equal(fire.player.ap,2,'Fire movement never gets a sword refund');
    sword.beginRound();sword.distance=2;assert.ok(sword.act(sword.player,'near').ok);assert.equal(sword.player.ap,c.approachRefund?3:2,'Movement quota resets each round');
    const a=c.arena.build('fire','sustain'),b=c.arena.build('sword','quick');
    for(const controllers of [undefined,['immediate','script']]){
      const x=c.arena.duel(a,b,{first:0,controllers}),y=c.arena.duel(b,a,{first:1,controllers:controllers?.toReversed()});
      assert.deepEqual(x.hp,y.hp.toReversed());assert.equal(x.winner,y.winner===null?null:1-y.winner);
    }
    const probe=c.arena.createArena(a,b);c.arena.playPhase(probe,0);const before=JSON.stringify(probe.battle),actors=structuredClone(probe.context.actors);
    c.arena.forecastEnemyPhase(probe,0);assert.equal(JSON.stringify(probe.battle),before);assert.deepEqual(probe.context.actors,actors,'Forecast must not mutate real state');
    if(c.id==='blaze_mid'){
      const announced=new Battle('sword');assert.ok(announced.enemyPlan.includes('blaze'));
      assert.ok(announced.act(announced.player,'far').ok);announced.endTurn();assert.ok(announced.enemyStep());
      const qi=structuredClone(announced.enemy.qi),ap=announced.enemy.ap;
      assert.ok(announced.enemyStep());assert.equal(announced.enemy.ap,ap-1);assert.equal(announced.enemy.qi.fire,qi.fire-1);assert.equal(announced.enemy.qi.any,qi.any);
      assert.ok(announced.logs.some(l=>l.text.includes('焚炎术')&&l.text.includes('距离不适合')),'Publicly announced blaze must skip without fees when distance changes');
      const evade=new Battle('fire');evade.phase='reaction';evade.pending={s:evade.skill(evade.enemy,'swift'),raw:30};assert.ok(evade.react('evade').ok);assert.equal(evade.distance,2);assert.equal(evade.legal(evade.player,'blaze'),'距离不适合','Reaction movement also invalidates blaze');
    }
  }
  const selected='docs/balance/range-movement/full-summary.json';
  if(existsSync(selected)){const s=JSON.parse(readFileSync(selected)),adopted=v.list.find(c=>c.id==='blaze_mid');assert.equal(adopted.engineHash,s.engineHash,'Frozen historical engine must match selected candidate');assert.equal(adopted.autoHash,s.autoHash,'Frozen historical controller hash');for(const key of ['fire','sword'])for(const skill of liveClasses[key].skills)assert.deepEqual(skill.range,adopted.engine.CLASSES[key].skills.find(s=>s.id===skill.id).range,'Adopted ranges remain unchanged across balance revisions');const historical=await import('data:text/javascript;base64,'+Buffer.from(v.source.auto.replace("'./engine.mjs'",JSON.stringify(new URL('./dist/engine.mjs',import.meta.url).href))).toString('base64'));assert.deepEqual(liveTendencies,historical.TENDENCIES,'Existing tendency weights remain unchanged');}
  console.log('Range candidates: invariant costs/damage/recovery, actual and simulated range checks, immutable invalid moves, one-time approach refunds/reset, seat symmetry with both controllers and forecast isolation passed.');
}finally{v.cleanup();}
