import assert from 'node:assert/strict';
import {shieldVariants} from './scripts/shield-score-variants.mjs';
const v=await shieldVariants();
try{
  const ref=v.list[0];
  for(const c of v.list){
    assert.deepEqual(c.engine.CLASSES,ref.engine.CLASSES);assert.deepEqual(c.engine.MAJORS,ref.engine.MAJORS);
    assert.deepEqual(c.engine.COMMON,ref.engine.COMMON);assert.deepEqual(c.planner.TENDENCIES,ref.planner.TENDENCIES);
    assert.equal(c.runtime.ADAPTIVE_CANDIDATE_LIMIT,12);
    const start=new c.engine.Battle('sword'),leaf=new c.engine.Battle('sword');start.enemy.shield=60;leaf.enemy.shield=20;
    for(const t of Object.keys(c.planner.TENDENCIES)){
      const original=ref.planner.planScore(start,leaf,t,['basic'],leaf);
      const weighted=c.planner.planScore(start,leaf,t,['basic'],leaf);
      assert.ok(Math.abs(weighted-original-40*c.planner.TENDENCIES[t].shield*c.ratio)<1e-9);
      const refill=new c.engine.Battle('sword');refill.enemy.shield=60;
      assert.equal(c.planner.planScore(start,refill,t,[],refill),ref.planner.planScore(start,refill,t,[],refill),'Fully replenished shields cannot generate credit');
      const grows=new c.engine.Battle('sword');grows.enemy.shield=60;const low=new c.engine.Battle('sword');low.enemy.shield=20;
      assert.ok(Math.abs(c.planner.planScore(low,grows,t,[],grows)-ref.planner.planScore(low,grows,t,[],grows)+40*c.planner.TENDENCIES[t].shield*c.ratio)<1e-9);
      for(const result of ['win','lose']){leaf.result=result;assert.equal(c.planner.planScore(start,leaf,t,['basic'],leaf),ref.planner.planScore(start,leaf,t,['basic'],leaf),'Terminal priority is unchanged');leaf.result=null;}
    }
    const sword={key:'sword',config:{major:'heavy'}},fire={key:'fire',config:{major:'sustain'}};
    const w=c.runtime.createPredictiveArena(sword,fire,{controllers:['adaptive','adaptive']});
    const before=JSON.stringify(w),choice=c.runtime.chooseArenaAction(w);assert.ok(choice);
    assert.ok(choice.action==='end'||w.battle.legal(w.battle.player,choice.skillId)===null);assert.equal(JSON.stringify(w),before);
    const f=c.runtime.forecastWorld(w,{depth:1}),actual=c.runtime.cloneWorld(w);
    c.runtime.endPhase(actual);c.runtime.advancePhase(actual);if(c.runtime.winner(actual)===null)c.runtime.playCurrentPhase(actual);if(c.runtime.winner(actual)===null)c.runtime.advancePhase(actual);
    assert.deepEqual(c.runtime.worldState(f.world),c.runtime.worldState(actual),'Scoring is consistent in actual and forecast policy replay');
    const hit=c.runtime.cloneWorld(w);assert.ok(c.runtime.actWorld(hit,'swift').ok);
    const baseline=ref.runtime.createPredictiveArena(sword,fire,{controllers:['adaptive','adaptive']});assert.ok(ref.runtime.actWorld(baseline,'swift').ok);
    assert.deepEqual(c.runtime.worldState(hit),ref.runtime.worldState(baseline),'Only scoring changes; actual skill costs/damage/reactions do not');
  }
  console.log('Enemy-shield score: identical rules/weights/candidate budgets, net shield change, no refill farming, unchanged terminal priorities, immutable planning, exact policy replay and identical actual casts passed.');
}finally{v.cleanup();}
