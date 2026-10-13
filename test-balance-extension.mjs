import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {gunzipSync,gzipSync} from 'node:zlib';
const matrix='docs/balance/goal-v0160/full-n',historical='docs/balance/goal-v0160/n-extended';
const temp=await mkdtemp(join(tmpdir(),'qingxiao-extension-'));
const run=(root,report,flags=[],matrixRoot=matrix)=>spawnSync(process.execPath,
 ['scripts/extend-balance.mjs','verify',matrixRoot,root,report,...flags],{encoding:'utf8'});
try{
 const report=`${temp}/verified.json`,valid=run(historical,report);
 assert.equal(valid.status,0,valid.stderr);
 const result=JSON.parse(await readFile(report));
 assert.equal(result.originalTimeouts,11);assert.equal(result.covered,6);
 assert.equal(result.complete,false);assert.equal(result.finished,6);
 assert.equal(result.exactTracePrefixes,true);
 // A complete one-controller matrix retains the exact same replay contract.
 const secondary=`${temp}/secondary`,secondaryReplay=`${temp}/secondary-replay`;
 await cp(matrix,secondary,{recursive:true});await cp(historical,secondaryReplay,{recursive:true});
 const secondarySummary=JSON.parse(await readFile(`${secondary}/summary.json`));
 secondarySummary.limits.controllers=['prepared'];
 delete secondarySummary.controllers.immediate;
 await writeFile(`${secondary}/summary.json`,JSON.stringify(secondarySummary));
 const secondaryRecords=JSON.parse(gunzipSync(await readFile(`${secondary}/records.json.gz`)))
  .filter(r=>r.controller==='prepared').map(r=>({...r,index:r.index-468}));
 await writeFile(`${secondary}/records.json.gz`,gzipSync(JSON.stringify(secondaryRecords)));
 const replayPlan=JSON.parse(await readFile(`${secondaryReplay}/plan.json`));
 replayPlan.jobs.forEach(j=>j.originalIndex-=468);
 await writeFile(`${secondaryReplay}/plan.json`,JSON.stringify(replayPlan));
 const secondaryValid=run(secondaryReplay,`${temp}/secondary.json`,[],secondary);
 assert.equal(secondaryValid.status,0,secondaryValid.stderr);
 assert.equal(JSON.parse(await readFile(`${temp}/secondary.json`)).exactTracePrefixes,true);
 secondaryRecords.pop();
 await writeFile(`${secondary}/records.json.gz`,gzipSync(JSON.stringify(secondaryRecords)));
 assert.notEqual(run(secondaryReplay,`${temp}/missing.json`,[],secondary).status,0);
 const required=run(historical,`${temp}/incomplete.json`,['--require-complete']);
 assert.notEqual(required.status,0);assert.match(required.stderr,/Not all original timeouts/);
 for(const [name,mutate,pattern] of [
  ['trace',async root=>{const p=`${root}/records.json.gz`,r=JSON.parse(gunzipSync(await readFile(p)));r[0].trace[0].text+=' changed';await writeFile(p,gzipSync(JSON.stringify(r)));},/exact extension prefix/],
  ['override',async root=>{const p=`${root}/plan.json`,plan=JSON.parse(await readFile(p));plan.jobs[0].ruleOverrides={secondShield:20};await writeFile(p,JSON.stringify(plan));},/adds an override/],
  ['source',async root=>{await writeFile(`${root}/source/dist/rules.mjs`,'export const RULES = {};');},/Frozen source changed/],
 ]){
  const root=`${temp}/${name}`;await cp(historical,root,{recursive:true});await mutate(root);
  const destination=`${temp}/${name}.json`,invalid=run(root,destination);
  assert.notEqual(invalid.status,0,name);assert.match(invalid.stderr,pattern,name);
  await assert.rejects(access(destination));
 }
 console.log('Extension audit: historical six exact-prefix finishes verified; incomplete coverage, altered traces, added rules and corrupt frozen combat source rejected. No new rate measurements.');
}finally{await rm(temp,{recursive:true,force:true});}
