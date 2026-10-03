import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {depthVariants,depthRuntime} from './depth-variants.mjs';
import {shieldVariants,blobHash} from './shield-score-variants.mjs';
import {restoreArena} from './planner-probe-replay.mjs';

const dir=process.argv[2]??'docs/balance/depth-comparison';mkdirSync(dir,{recursive:true});
const v=await depthVariants(),old=await shieldVariants({snapshotPath:'docs/balance/shield-score/source.json.gz'}),ref=old.list.find(c=>c.id==='double');
const audit=JSON.parse(gunzipSync(readFileSync('docs/balance/planner-decisions/decisions.json.gz')));
const states=audit.rows.filter(r=>r.variant==='double'&&((r.major==='quick'&&r.initialDistance===1&&r.state.seat===0&&[10,20].includes(r.state.round))||(r.major==='heavy'&&r.state.seat===1&&[1,10].includes(r.state.round))));
assert.equal(states.length,4);const rows=[];
const cached=process.argv.includes('--recompute-quality')?JSON.parse(gunzipSync(readFileSync(`${dir}/snapshots.json.gz`))):null;
const qualityPaths=new Map();
try{
  const sources=Object.fromEntries(['scripts/depth-variants.mjs','scripts/depth-snapshots.mjs','scripts/planner-probe-replay.mjs'].map(p=>[p,readFileSync(p,'utf8')]));
  writeFileSync(`${dir}/source.json.gz`,gzipSync(JSON.stringify({rules:v.source,sources,runtimes:Object.fromEntries(v.list.map(c=>[c.id,depthRuntime(v.source.sources['scripts/predictive-arena.mjs'],c)]))}),{level:9}));
  for(const state of states)for(const c of v.list){
    const w=restoreArena(c,state.state),before=JSON.stringify(w),key=JSON.stringify([state.major,state.state.round,state.state.seat]);
    const reused=cached?.rows.find(r=>r.model===c.id&&JSON.stringify([r.origin.major,r.origin.round,r.origin.seat])===key);
    if(reused){assert.equal(cached.summary.variantHashes[c.id].runtime,c.runtimeHash);assert.deepEqual(reused.state,state.state);}
    c.runtime.resetComputeStats();const t=performance.now();
    const choice=reused?.choice??c.runtime.chooseArenaAction(w),ms=reused?.ms??performance.now()-t,computations=reused?.computations??c.runtime.computeStats(),plan=computations.plans[c.depth];
    assert.equal(JSON.stringify(w),before);assert.ok(computations.maxDepth<=c.depth);
    if(c.id==='d1')qualityPaths.set(key,plan.path);
    const qualityPath=qualityPaths.get(key);assert.ok(qualityPath);
    const leaf=c.runtime.cloneWorld(w);for(const id of qualityPath)assert.ok(c.runtime.actWorld(leaf,id).ok);
    const predicted=c.runtime.forecastWorld(leaf,{mode:'adaptive',depth:c.depth-1});
    const truth=restoreArena(ref,state.state);for(const id of qualityPath)assert.ok(ref.runtime.actWorld(truth,id).ok);
    assert.deepEqual(c.runtime.worldState(leaf),ref.runtime.worldState(truth));
    const replay=ref.runtime.forecastWorld(truth,{mode:'adaptive',depth:1}),future=c.runtime.worldState(predicted.world),actual=ref.runtime.worldState(replay.world),seat=state.state.seat;
    const row={origin:{major:state.major,round:state.state.round,seat},model:c.id,state:state.state,choice,plan,qualityPath,ms,computations,future,actual,
      ownHpError:Math.abs(future.actors[seat].hp-actual.actors[seat].hp),enemyHpError:Math.abs(future.actors[1-seat].hp-actual.actors[1-seat].hp),distanceEqual:future.distance===actual.distance,fullEqual:JSON.stringify(future)===JSON.stringify(actual)};
    if(c.id==='d2')assert.ok(row.fullEqual,'Full inner budget must replay the known original opponent exactly');
    rows.push(row);console.log(`${c.id}/${state.major}/r${state.state.round}/seat${seat}: ${ms.toFixed(0)}ms, ${JSON.stringify(plan.path)}, hp error ${row.ownHpError}/${row.enemyHpError}`);
  }
  const summary={sourceHashes:v.source.hashes,variantHashes:Object.fromEntries(v.list.map(c=>[c.id,{runtime:c.runtimeHash,auto:c.autoHash}])),generatorHash:blobHash(readFileSync('scripts/depth-snapshots.mjs')),helperHash:blobHash(readFileSync('scripts/depth-variants.mjs')),states:states.length,choices:rows.length,reusedChoiceMeasurements:cached?rows.length:0,quality:'All models forecast the same own combo chosen by d1, against a known original depth-1 opponent.',models:Object.fromEntries(v.list.map(c=>{const rs=rows.filter(r=>r.model===c.id),avg=k=>rs.reduce((s,r)=>s+r[k],0)/rs.length;return [c.id,{n:rs.length,meanMs:avg('ms'),ownHpMAE:avg('ownHpError'),enemyHpMAE:avg('enemyHpError'),distanceEqual:rs.filter(r=>r.distanceEqual).length,fullEqual:rs.filter(r=>r.fullEqual).length,forecastCalls:rs.reduce((n,r)=>n+Object.values(r.computations.forecasts).reduce((s,x)=>s+x,0),0)}];}))};
  writeFileSync(`${dir}/snapshots.json.gz`,gzipSync(JSON.stringify({summary,rows})+'\n',{level:9}));writeFileSync(`${dir}/snapshot-summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}finally{v.cleanup();old.cleanup();}
