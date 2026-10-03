import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {sequenceVariants} from './sequence-variants.mjs';
import {restoreArena} from './planner-probe-replay.mjs';
import {blobHash} from './shield-score-variants.mjs';
const step=Number(process.argv[2]),dir=`docs/balance/sequence-${step}`;assert.ok([1,2].includes(step));mkdirSync(dir,{recursive:true});
const specs=step===1?[{id:'base'},{id:'staged4',deep:4}]:[{id:'base'},{id:'diverse12',diverse:true}];
const v=await sequenceVariants(specs),started=performance.now(),snapshots=[],matches=[];
const decoded=JSON.parse(gunzipSync(readFileSync('docs/balance/depth-comparison/snapshots.json.gz')));
const states=decoded.rows.filter(r=>r.model==='d1');assert.equal(states.length,4);
function save(){writeFileSync(dir+'/results.json.gz',gzipSync(JSON.stringify({step,snapshots,matches}),{level:9}));}
try{
 for(const row of states)for(const c of v.list){const w=restoreArena(c,row.state);c.runtime.resetComputeStats();let t=performance.now();const choice=c.runtime.chooseArenaAction(w),ms=performance.now()-t,stats=c.runtime.computeStats(),root=stats.roots[0];
 // Quality references only the frozen original adaptive opponent, not actual new-policy combat.
 const scored=[];for(const path of root.selected){const leaf=c.runtime.cloneWorld(w);for(const id of path)assert.ok(c.runtime.actWorld(leaf,id).ok);const f=c.runtime.forecastWorld(leaf,{depth:1});scored.push({path,score:c.planner.planScore(w.battle,leaf.battle,w.prefs[w.seat],path,f.future)});}
 const best=scored.reduce((a,b)=>b.score>a.score?b:a),chosen=scored.find(x=>JSON.stringify(x.path)===JSON.stringify(root.best.path));assert.ok(chosen);snapshots.push({id:c.id,state:row.state,choice,ms,stats,knownPolicyBest:best,knownPolicyChosen:chosen,regret:best.score-chosen.score});save();console.log(`step${step} snapshot ${snapshots.length}: ${c.id} ${ms.toFixed(0)}ms regret ${(best.score-chosen.score).toFixed(2)}`);}
 for(const major of ['quick','sustain'])for(const first of [0,1])for(const c of v.list){const a={key:major==='quick'?'sword':'fire',config:{major}},b={key:'sword',config:{major:major==='quick'?'quick':'heavy'}},t=performance.now();c.runtime.resetComputeStats();const result=c.runtime.predictiveDuel(a,b,{first,distance:1,limit:12,controllers:['adaptive','adaptive'],trace:true});const stats=c.runtime.computeStats();matches.push({id:c.id,a,b,first,distance:1,limit:12,...result,ms:performance.now()-t,choices:stats.roots.length,forecasts:stats.forecasts});save();console.log(`step${step} duel ${matches.length}: ${c.id}/${major}/first${first} winner ${result.winner} round ${result.rounds}`);}
 const summary={step,executions:matches.length,snapshotRootChoices:snapshots.length,knownPolicyLeafReplays:snapshots.reduce((s,r)=>s+r.stats.roots[0].selected.length,0),elapsedSeconds:(performance.now()-started)/1000,variants:v.list.map(c=>({id:c.id,engineHash:c.engineHash,autoHash:c.autoHash,runtimeHash:c.runtimeHash,snapshotMeanMs:snapshots.filter(r=>r.id===c.id).reduce((s,r)=>s+r.ms,0)/4,snapshotRegrets:snapshots.filter(r=>r.id===c.id).map(r=>r.regret),duels:matches.filter(r=>r.id===c.id).map(({trace,...r})=>r)}))};
 writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');writeFileSync(dir+'/source.json.gz',gzipSync(JSON.stringify({sourceHashes:v.source.hashes,generator:readFileSync('scripts/sequence-search.mjs','utf8'),helper:readFileSync('scripts/sequence-variants.mjs','utf8'),variants:v.list.map(({id,sources,...rest})=>({id,sources}))}),{level:9}));console.log(JSON.stringify({done:step,seconds:summary.elapsedSeconds}));
}finally{v.cleanup();}
