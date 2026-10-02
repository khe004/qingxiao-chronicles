import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {freezeShieldSource,shieldVariants,blobHash} from './shield-score-variants.mjs';

const dir='docs/balance/shield-score',snapshot=dir+'/source.json.gz',started=performance.now();mkdirSync(dir,{recursive:true});
freezeShieldSource(snapshot);const variants=await shieldVariants({snapshotPath:snapshot});
const previous=JSON.parse(gunzipSync(readFileSync('docs/balance/adaptive-prediction/cases.json.gz')));
for(const [p,field] of [['dist/engine.mjs','engineHash'],['dist/auto.mjs','autoHash'],['scripts/predictive-arena.mjs','runtimeHash'],['scripts/planner-internals.mjs','adapterHash']])assert.equal(variants.source.hashes[p],previous.summary[field],'Baseline source mismatch');
// The previous report sampled forecasts; this experiment records duels only.
const baseline=previous.rows.filter(r=>r.controller==='adaptive').map(({censoredProbes,...r})=>r);assert.equal(baseline.length,48);
const sig=r=>JSON.stringify([r.group,r.a,r.b,r.distance,r.first,r.prefs]);
let executions=0;
function run(c,r,extra={}){
  const t=performance.now(),result=c.runtime.predictiveDuel(r.a,r.b,{first:r.first,distance:r.distance,prefs:r.prefs,controllers:['adaptive','adaptive'],limit:extra.limit??30,trace:r.distance===1&&r.first===0});
  executions++;if(executions%12===0)console.log(`${executions} executions (${Math.round((performance.now()-started)/1000)}s)`);
  return {...r,...result,...extra,elapsedSeconds:(performance.now()-t)/1000};
}
export function statistics(rows){
  function group(rs){return {n:rs.length,wins:rs.filter(r=>r.winner===0).length,losses:rs.filter(r=>r.winner===1).length,unresolved:rs.filter(r=>r.winner===null).length,avgRounds:rs.reduce((n,r)=>n+r.rounds,0)/rs.length,avgUnusedAP:rs.reduce((n,r)=>n+r.metrics.reduce((m,x)=>m+x.unusedAP,0),0)/rs.length,avgGuards:rs.reduce((n,r)=>n+r.metrics.reduce((m,x)=>m+(x.actions.guard??0),0),0)/rs.length};}
  const core=rows.filter(r=>r.group==='core'),mirror=rows.filter(r=>r.group==='mirror');
  return {core:group(core),mirror:group(mirror),byMajor:['ignite','sustain'].map(major=>({major,...group(core.filter(r=>r.a.config.major===major))})),byDistance:[0,1,2].map(distance=>({distance,...group(core.filter(r=>r.distance===distance))})),byInitiative:[0,1].map(first=>({first,...group(core.filter(r=>r.first===first))})),mirrorMajors:['quick','heavy'].map(major=>{const rs=mirror.filter(r=>r.a.config.major===major);return {major,...group(rs),firstWins:rs.filter(r=>r.winner===r.first).length};})};
}
function save(name,data){writeFileSync(dir+'/'+name+'.json.gz',gzipSync(JSON.stringify(data)+'\n',{level:9}));}
try{
  const expanded=process.argv.indexOf('--expand');
  if(expanded!==-1){
    const id=process.argv[expanded+1],c=variants.list.find(c=>c.id===id);assert.ok(c&&id!=='base');
    const screened=JSON.parse(gunzipSync(readFileSync(dir+'/screen.json.gz'))),selected=screened.candidates.find(x=>x.id===id);
    assert.equal(selected.autoHash,c.autoHash);const cache=new Map(selected.rows.map(r=>[sig(r),r])),rows=[];let reused=0;
    for(const r of baseline){if(cache.has(sig(r))){rows.push(cache.get(sig(r)));reused++;}else rows.push(run(c,r));}
    const styleRows=[];
    // Mid range only for extra tendencies; balanced cases already screened.
    for(const r of baseline.filter(r=>r.distance===1))for(const style of ['aggressive','defensive','burst']){
      const changed={...r,prefs:[style,style]};
      const control=run(variants.list[0],changed,{testGroup:'styles'}),candidate=run(c,changed,{testGroup:'styles'});
      styleRows.push({case:changed,control,candidate});
    }
    const long=[];
    const extend=(variant,r,testGroup)=>long.push({at30:{hp:r.hp,metrics:r.metrics},...run(variant,r,{limit:90,testGroup,variant:variant.id})});
    for(const r of rows.filter(r=>r.winner===null))extend(c,r,'balanced-long');
    // One representative per tendency/matchup among the extra censored cases.
    const seen=new Set();
    for(const {candidate:r} of styleRows.filter(x=>x.candidate.winner===null)){
      const key=JSON.stringify([r.prefs,r.a,r.b]);if(seen.has(key))continue;seen.add(key);extend(c,r,'style-long');
    }
    // Check whether the observed lower-weight quick-sword loop survives 90 rounds.
    const lower=screened.candidates.find(x=>x.id==='equal').rows.find(r=>r.group==='mirror'&&r.a.config.major==='quick'&&r.distance===1&&r.first===0);
    extend(variants.list.find(x=>x.id==='equal'),lower,'lower-weight-long');
    const summary={selected:id,ratio:c.ratio,autoHash:c.autoHash,sourceHashes:variants.source.hashes,generatorHash:blobHash(readFileSync('scripts/balance-shield-score.mjs')),helperHash:blobHash(readFileSync('scripts/shield-score-variants.mjs')),executions,reused,baseRows:rows.length,styleCases:styleRows.length,styleExecutions:styleRows.length*2,longExecutions:long.length,statistics:statistics(rows),elapsedSeconds:(performance.now()-started)/1000};
    save('validation',{summary,rows,styleRows,long});writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
  }else{
    const cases=baseline.filter(r=>r.group==='core'||r.a.key==='sword'),candidates=[],controls=[];assert.equal(cases.length,36);
    for(const r of cases.filter(r=>r.distance===1)){
      const repeated=run(variants.list[0],r);
      for(const field of ['winner','rounds','hp','metrics'])assert.deepEqual(repeated[field],r[field],'Frozen baseline parity');
      controls.push(repeated);
    }
    for(const c of variants.list){
      const rows=c.id==='base'?cases:cases.map(r=>run(c,r));
      candidates.push({id:c.id,ratio:c.ratio,autoHash:c.autoHash,reused:c.id==='base'?rows.length:0,rows,statistics:statistics(rows)});
      save('checkpoint',{executions,candidates});console.log(JSON.stringify({id:c.id,statistics:statistics(rows)}));
    }
    const summary={sourceCommit:variants.source.commit,sourceHashes:variants.source.hashes,generatorHash:blobHash(readFileSync('scripts/balance-shield-score.mjs')),helperHash:blobHash(readFileSync('scripts/shield-score-variants.mjs')),executions,controls:controls.length,reused:36,rowsPerCandidate:36,variable:'Add (starting enemy shield - forecast enemy shield) * own-shield score weight * ratio; all rules, weights, search filters and 12-candidate budget unchanged.',elapsedSeconds:(performance.now()-started)/1000,candidates:candidates.map(({rows,...c})=>c)};
    save('screen',{summary,candidates,controls});writeFileSync(dir+'/screen-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({executions,controls:controls.length,candidates:summary.candidates,elapsedSeconds:summary.elapsedSeconds}));
  }
}finally{variants.cleanup();}
