import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {shieldVariants,blobHash} from './shield-score-variants.mjs';
import {diagnose} from './planner-diagnostics.mjs';

const dir=process.argv[2]??'docs/balance/planner-decisions';mkdirSync(dir,{recursive:true});
const v=await shieldVariants({snapshotPath:'docs/balance/shield-score/source.json.gz'}),rows=[],duels=[];
const cases=[
  {variant:'equal',major:'quick',distance:1,targets:[1,10,30,60,63]},
  {variant:'double',major:'quick',distance:1,targets:[1,10,20]},
  {variant:'base',major:'heavy',distance:1,targets:[1,10,30]},
  {variant:'double',major:'heavy',distance:1,targets:[1,10]},
  {variant:'double',major:'quick',distance:2,targets:[1,10]},
];
const started=performance.now();let phases=0;
try{
  const auditSources=Object.fromEntries(['scripts/planner-diagnostics.mjs','scripts/audit-planner-decisions.mjs','scripts/shield-score-variants.mjs'].map(p=>[p,readFileSync(p,'utf8')]));
  writeFileSync(`${dir}/source.json.gz`,gzipSync(JSON.stringify({rules:v.source,auditSources,hashes:Object.fromEntries(Object.entries(auditSources).map(([p,s])=>[p,blobHash(s)]))}),{level:9}));
  for(const spec of cases){
    const c=v.list.find(c=>c.id===spec.variant),a={key:'sword',config:{major:spec.major}},w=c.runtime.createPredictiveArena(a,a,{distance:spec.distance,controllers:['adaptive','adaptive']});
    while(c.runtime.winner(w)===null&&w.battle.round<=Math.max(...spec.targets)){
      if(spec.targets.includes(w.battle.round)){
        const audit=diagnose(c,w);rows.push({...audit,major:spec.major,initialDistance:spec.distance});
        console.log(`${spec.variant}/${spec.major}/d${spec.distance}/r${w.battle.round}/seat${w.seat}: ${audit.totalCount} leaves, omitted gain ${audit.missedGain.toFixed(2)}`);
      }
      c.runtime.playCurrentPhase(w);phases++;
      if(c.runtime.winner(w)!==null||(w.battle.round===Math.max(...spec.targets)&&w.seat!==w.first))break;
      c.runtime.advancePhase(w);
    }
    duels.push({spec,state:c.runtime.worldState(w),metrics:w.metrics});
  }
  assert.ok(rows.length>0);
  const summary={sourceHashes:v.source.hashes,variantHashes:Object.fromEntries(v.list.map(c=>[c.id,c.autoHash])),diagnosticsHash:blobHash(readFileSync('scripts/planner-diagnostics.mjs')),generatorHash:blobHash(readFileSync('scripts/audit-planner-decisions.mjs')),
    trajectoryCount:cases.length,actualPhases:phases,decisions:rows.length,forecastLeaves:rows.reduce((n,r)=>n+r.totalCount,0),omittedBest:rows.filter(r=>r.missedGain>1e-8).length,changedFirstAction:rows.filter(r=>r.changesFirstAction).length,elapsedSeconds:(performance.now()-started)/1000};
  writeFileSync(`${dir}/decisions.json.gz`,gzipSync(JSON.stringify({summary,rows,duels})+'\n',{level:9}));
  writeFileSync(`${dir}/summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}finally{v.cleanup();}
