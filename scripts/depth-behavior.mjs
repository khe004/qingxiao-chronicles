import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {depthVariants} from './depth-variants.mjs';
import {shieldVariants,blobHash} from './shield-score-variants.mjs';

const dir=process.argv[2]??'docs/balance/depth-comparison';mkdirSync(dir,{recursive:true});
const v=await depthVariants(),old=await shieldVariants({snapshotPath:'docs/balance/shield-score/source.json.gz'}),ref=old.list.find(c=>c.id==='double');
const cases=[{id:'quick-mirror',a:{key:'sword',config:{major:'quick'}},b:{key:'sword',config:{major:'quick'}}},{id:'sustain-heavy',a:{key:'fire',config:{major:'sustain'}},b:{key:'sword',config:{major:'heavy'}}}],rows=[];
const limit=12,started=performance.now();
try{
  writeFileSync(`${dir}/behavior-source.json.gz`,gzipSync(JSON.stringify({rules:v.source,sources:Object.fromEntries(['scripts/depth-variants.mjs','scripts/depth-behavior.mjs'].map(p=>[p,readFileSync(p,'utf8')]))}),{level:9}));
  for(const c of v.list)for(const spec of cases){
    const r=c.runtime,w=r.createPredictiveArena(spec.a,spec.b,{first:0,distance:1,controllers:['adaptive','adaptive'],trace:true}),decisions=[],probes=[];let pending=null;
    const start=performance.now();
    const flush=()=>{
      if(!pending)return;const actual=r.worldState(w);
      probes.push({...pending,actual,errors:Object.fromEntries(Object.entries(pending.predictions).map(([model,future])=>[model,{ownHp:Math.abs(future.actors[0].hp-actual.actors[0].hp),enemyHp:Math.abs(future.actors[1].hp-actual.actors[1].hp),distanceEqual:future.distance===actual.distance,fullEqual:JSON.stringify(future)===JSON.stringify(actual)}]))});pending=null;
    };
    while(r.winner(w)===null&&w.battle.round<=limit){
      for(let steps=0;r.winner(w)===null&&!w.ended;steps++){
        assert.ok(steps<8);w.battle.planEnemy();r.resetComputeStats();const t=performance.now();
        const choice=r.chooseArenaAction(w),ms=performance.now()-t,computations=r.computeStats();assert.ok(computations.maxDepth<=c.depth);
        decisions.push({round:w.battle.round,seat:w.seat,choice,ms,computations});
        if(choice.action==='end')r.endPhase(w);else assert.ok(r.actWorld(w,choice.skillId).ok);
      }
      if(r.winner(w)!==null){flush();break;}
      if(w.battle.round===limit&&w.seat!==w.first)break;
      if(w.seat===0&&[2,6].includes(w.battle.round)){
        const before=JSON.stringify(w),predictions={};for(const depth of [0,1])predictions['boundary'+depth]=r.worldState(r.forecastWorld(w,{mode:'adaptive',depth}).world);
        assert.equal(JSON.stringify(w),before);pending={round:w.battle.round,state:r.worldState(w),predictions};
      }
      r.advancePhase(w);if(pending&&(w.seat===0||r.winner(w)!==null))flush();
    }
    assert.equal(pending,null);
    const result={winner:r.winner(w),rounds:w.battle.round,hp:w.actors.map(a=>a.hp),metrics:w.metrics};
    if(c.id==='d1'){
      const control=ref.runtime.predictiveDuel(spec.a,spec.b,{first:0,distance:1,limit,controllers:['adaptive','adaptive']});
      for(const k of ['winner','rounds','hp','metrics'])assert.deepEqual(result[k],control[k],'Original-policy rollout parity');
    }
    rows.push({model:c.id,case:spec,limit,...result,decisions,probes,trace:w.trace,elapsedSeconds:(performance.now()-start)/1000});
    writeFileSync(`${dir}/behavior-checkpoint.json.gz`,gzipSync(JSON.stringify({rows})+'\n',{level:9}));
    console.log(`${c.id}/${spec.id}: ${result.rounds} rounds, winner ${result.winner}, ${decisions.length} choices, ${rows.at(-1).elapsedSeconds.toFixed(1)}s`);
  }
  const summary={sourceHashes:v.source.hashes,variantHashes:Object.fromEntries(v.list.map(c=>[c.id,{runtime:c.runtimeHash,auto:c.autoHash}])),generatorHash:blobHash(readFileSync('scripts/depth-behavior.mjs')),helperHash:blobHash(readFileSync('scripts/depth-variants.mjs')),limit,first:0,distance:1,executedTrajectories:rows.length,extraOriginalParityRollouts:cases.length,elapsedSeconds:(performance.now()-started)/1000,
    models:Object.fromEntries(v.list.map(c=>{const rs=rows.filter(r=>r.model===c.id),ds=rs.flatMap(r=>r.decisions),ps=rs.flatMap(r=>r.probes);return [c.id,{trajectories:rs.length,unresolved:rs.filter(r=>r.winner===null).length,decisions:ds.length,meanChoiceMs:ds.reduce((n,d)=>n+d.ms,0)/ds.length,maxChoiceMs:Math.max(...ds.map(d=>d.ms)),unusedAP:rs.reduce((n,r)=>n+r.metrics.reduce((m,a)=>m+a.unusedAP,0),0),probes:ps.length,predictions:Object.fromEntries(['boundary0','boundary1'].map(k=>[k,{ownHpMAE:ps.length?ps.reduce((n,p)=>n+p.errors[k].ownHp,0)/ps.length:null,enemyHpMAE:ps.length?ps.reduce((n,p)=>n+p.errors[k].enemyHp,0)/ps.length:null,distanceEqual:ps.filter(p=>p.errors[k].distanceEqual).length,fullEqual:ps.filter(p=>p.errors[k].fullEqual).length}]))}];}))};
  writeFileSync(`${dir}/behavior.json.gz`,gzipSync(JSON.stringify({summary,rows})+'\n',{level:9}));writeFileSync(`${dir}/behavior-summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}finally{v.cleanup();old.cleanup();}
