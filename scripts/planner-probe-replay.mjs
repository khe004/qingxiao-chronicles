// Replay retained decision leaves against the real adaptive opponent policy.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {shieldVariants,blobHash} from './shield-score-variants.mjs';

export function restoreArena(c,state){
  const config=a=>({key:a.key,config:{major:a.major,skillIds:a.skillIds}});
  const w=c.runtime.createPredictiveArena(...state.actors.map(config),{first:state.first,distance:state.distance,controllers:['adaptive','adaptive']});
  w.actors=structuredClone(state.actors);w.first=state.first;w.seat=state.seat;w.ended=state.ended;
  Object.assign(w.battle,{player:w.actors[w.seat],enemy:w.actors[1-w.seat],round:state.round,distance:state.distance,result:null,phase:'player',pending:null});
  w.battle.planEnemy();assert.deepEqual(c.runtime.worldState(w),state);return w;
}
async function main(){
  const dir=process.argv[2]??'docs/balance/planner-decisions';
  const audit=JSON.parse(gunzipSync(readFileSync(`${dir}/decisions.json.gz`)));
  const v=await shieldVariants({snapshotPath:'docs/balance/shield-score/source.json.gz'}),probes=[];
  const chosen=audit.rows.filter(r=>r.state.seat===0&&((r.variant==='equal'&&r.state.round===30)||(r.variant==='base'&&r.state.round===30)||(r.variant==='double'&&r.major==='quick'&&r.initialDistance===1&&r.state.round===20)));
  chosen.push(audit.rows.find(r=>r.variant==='equal'&&r.state.round===63&&r.state.seat===1));
  const started=performance.now();
  try{
    for(const row of chosen){
      const c=v.list.find(c=>c.id===row.variant),w=restoreArena(c,row.state),before=JSON.stringify(w),results=[];
      for(const candidate of row.candidates){
        const leaf=c.runtime.cloneWorld(w);for(const id of candidate.path)assert.ok(c.runtime.actWorld(leaf,id).ok);
        assert.deepEqual(c.runtime.worldState(leaf),candidate.leaf,'Restored leaf differs from audited trajectory');
        const predicted=c.runtime.forecastWorld(leaf,{mode:'adaptive',depth:0});
        assert.deepEqual(c.runtime.worldState(predicted.world),candidate.future);
        // At depth 1, the opponent actually runs adaptive; its own predictions
        // still have the original depth-0 cutoff. No extra recursion is introduced.
        const replay=c.runtime.forecastWorld(leaf,{mode:'adaptive',depth:1});
        const score=c.planner.planScore(w.battle,leaf.battle,row.tendency,candidate.path,replay.future);
        results.push({path:candidate.path,selected:candidate.selected,rank:candidate.rank,oldScore:candidate.score,score,oldFuture:candidate.future,replayedFuture:c.runtime.worldState(replay.world)});
      }
      assert.equal(JSON.stringify(w),before);
      const best=rows=>rows.reduce((b,x)=>x.score>b.score?x:b,{score:-Infinity});
      const selectedBest=best(results.filter(x=>x.selected)),allBest=best(results);
      probes.push({variant:row.variant,major:row.major,round:row.state.round,seat:row.state.seat,originalBest:row.best,originalUnlimited:row.unlimited,selectedBest:{path:selectedBest.path,score:selectedBest.score},allBest:{path:allBest.path,score:allBest.score},results});
      console.log(`${row.variant}/${row.major}/r${row.state.round}/seat${row.state.seat}: ${JSON.stringify(selectedBest.path)} vs all ${JSON.stringify(allBest.path)}`);
    }
    const summary={sourceHashes:v.source.hashes,scriptHash:blobHash(readFileSync(new URL(import.meta.url))),probeCount:probes.length,replayedLeaves:probes.reduce((n,p)=>n+p.results.length,0),elapsedSeconds:(performance.now()-started)/1000};
    writeFileSync(`${dir}/replay.json.gz`,gzipSync(JSON.stringify({summary,probes})+'\n',{level:9}));writeFileSync(`${dir}/replay-summary.json`,JSON.stringify(summary,null,2)+'\n');
    console.log(JSON.stringify(summary));
  }finally{v.cleanup();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
