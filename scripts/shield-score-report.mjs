// Summarizes retained records only; never executes a duel or forecast.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {blobHash,shieldAuto} from './shield-score-variants.mjs';

const dir=process.argv.find(a=>!a.startsWith('-')&&a!==process.argv[0]&&a!==process.argv[1])??'docs/balance/shield-score';
const read=name=>JSON.parse(gunzipSync(readFileSync(`${dir}/${name}.json.gz`)));
const source=read('source'),screen=read('screen');
for(const [p,hash] of Object.entries(source.hashes))assert.equal(blobHash(source.sources[p]),hash);
for(const c of screen.candidates)assert.equal(blobHash(shieldAuto(source.sources['dist/auto.mjs'],c.ratio)),c.autoHash);
assert.equal(screen.summary.executions,screen.controls.length+screen.candidates.filter(c=>c.id!=='base').reduce((n,c)=>n+c.rows.length,0));
function group(rows){
  const n=rows.length,total=fn=>rows.reduce((s,r)=>s+fn(r),0);
  return {n,wins:rows.filter(r=>r.winner===0).length,losses:rows.filter(r=>r.winner===1).length,unresolved:rows.filter(r=>r.winner===null).length,firstWins:rows.filter(r=>r.winner===r.first).length,avgRounds:n?total(r=>r.rounds)/n:null,avgUnusedAP:n?total(r=>r.metrics.reduce((s,m)=>s+m.unusedAP,0))/n:null,avgGuards:n?total(r=>r.metrics.reduce((s,m)=>s+(m.actions.guard??0),0))/n:null};
}
function classify(rows){
  return {core:group(rows.filter(r=>r.group==='core')),fireMirror:group(rows.filter(r=>r.group==='mirror'&&r.a.key==='fire')),swordMirror:group(rows.filter(r=>r.group==='mirror'&&r.a.key==='sword')),mirrorMajors:Object.fromEntries(['ignite','sustain','quick','heavy'].map(m=>[m,group(rows.filter(r=>r.group==='mirror'&&r.a.config.major===m))]))};
}
const result={screenExecutions:screen.summary.executions,screenControls:screen.controls.length,screenReused:screen.summary.reused,screen:Object.fromEntries(screen.candidates.map(c=>[c.id,classify(c.rows)]))};
if(existsSync(`${dir}/validation.json.gz`)){
  const v=read('validation');assert.equal(v.summary.executions,v.rows.length-v.summary.reused+2*v.styleRows.length+v.long.length);
  assert.equal(v.summary.autoHash,screen.candidates.find(c=>c.id===v.summary.selected).autoHash);
  for(const p of Object.keys(source.hashes))assert.equal(v.summary.sourceHashes[p],source.hashes[p]);
  result.validationExecutions=v.summary.executions;result.totalExecutions=result.screenExecutions+result.validationExecutions;
  result.balanced=classify(v.rows);
  result.styles=Object.fromEntries(['aggressive','defensive','burst'].map(t=>{
    const rows=v.styleRows.filter(r=>r.case.prefs[0]===t);
    return [t,{control:classify(rows.map(r=>r.control)),candidate:classify(rows.map(r=>r.candidate))}];
  }));
  result.long=v.long.map(r=>({variant:r.variant,group:r.testGroup,major:r.a.config.major,opponent:r.b.config.major,distance:r.distance,first:r.first,tendency:r.prefs[0],winner:r.winner,rounds:r.rounds,at30:r.at30.hp,hp:r.hp,unusedAP:r.metrics.map(m=>m.unusedAP),guards:r.metrics.map(m=>m.actions.guard??0)}));
}
if(process.argv.includes('--write'))writeFileSync(`${dir}/analysis-summary.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
