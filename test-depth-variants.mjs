import assert from 'node:assert/strict';
import {depthVariants} from './scripts/depth-variants.mjs';
import {shieldVariants} from './scripts/shield-score-variants.mjs';
const v=await depthVariants(),old=await shieldVariants({snapshotPath:'docs/balance/shield-score/source.json.gz'});
try{
  const a={key:'sword',config:{major:'heavy'}},b={key:'fire',config:{major:'sustain'}},ref=old.list.find(c=>c.id==='double');
  const baseline=ref.runtime.createPredictiveArena(a,b,{controllers:['adaptive','adaptive']});
  for(const c of v.list){
    const w=c.runtime.createPredictiveArena(a,b,{controllers:['adaptive','adaptive']}),before=JSON.stringify(w);
    c.runtime.resetComputeStats();const choice=c.runtime.chooseArenaAction(w);assert.equal(JSON.stringify(w),before);
    assert.ok(choice.action==='end'||w.battle.legal(w.battle.player,choice.skillId)===null);
    assert.ok(c.runtime.computeStats().maxDepth<=c.depth);
    const plan=c.runtime.computeStats().plans[c.depth];
    assert.equal(plan.path[0]??null,choice.skillId??null);
    if(c.id==='d1'){
      assert.deepEqual(choice,ref.runtime.chooseArenaAction(baseline));
      c.runtime.playCurrentPhase(w);ref.runtime.playCurrentPhase(baseline);
      assert.deepEqual(c.runtime.worldState(w),ref.runtime.worldState(baseline));
    }
    assert.equal(c.autoHash,ref.autoHash);
    assert.throws(()=>c.runtime.chooseArenaAction(w,{depth:3}));
  }
  console.log('Explicit depth: legal immutable planning, bounded recursion, frozen scoring and original depth-1 policy parity passed.');
}finally{v.cleanup();old.cleanup();}
