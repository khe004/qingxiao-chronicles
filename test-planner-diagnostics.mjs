import assert from 'node:assert/strict';
import {shieldVariants} from './scripts/shield-score-variants.mjs';
import {diagnose} from './scripts/planner-diagnostics.mjs';
import {restoreArena} from './scripts/planner-probe-replay.mjs';
const v=await shieldVariants({snapshotPath:'docs/balance/shield-score/source.json.gz'});
try{
  for(const c of v.list.filter(c=>['base','double'].includes(c.id))){
    const a={key:'sword',config:{major:'quick'}},b={key:'fire',config:{major:'sustain'}};
    const w=c.runtime.createPredictiveArena(a,b,{controllers:['adaptive','adaptive']});
    const result=diagnose(c,w);assert.ok(result.selectedCount<=12);assert.ok(result.totalCount>=result.selectedCount);assert.ok(result.missedGain>=0);
    const actual=c.runtime.chooseArenaAction(w);assert.deepEqual(result.actual,actual);
    const restored=restoreArena(c,result.state);assert.deepEqual(c.runtime.chooseArenaAction(restored),actual);
    const reversed=c.runtime.createPredictiveArena(b,a,{first:1,controllers:['adaptive','adaptive']});
    const swap=diagnose(c,reversed);assert.deepEqual(swap.best,result.best,'Renaming seats must preserve perspective choice');
    assert.equal(result.candidates.length,result.totalCount);
    assert.ok(result.candidates.some(r=>r.path.length===0&&r.selected));
  }
  console.log('Read-only diagnostics: frozen-policy parity, perspective/seat invariance, tactical reservations, score decomposition and bounded selection passed.');
}finally{v.cleanup();}
