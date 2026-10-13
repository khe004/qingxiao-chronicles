// Reuse a completed explicit-plan review when ONLY the rules' version label
// changes. No HP, skill, economy, controller or scenario change is accepted.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
const [originArg,primaryArg,planArg,target]=process.argv.slice(2);
assert.ok(target,'Usage: relabel-review.mjs ORIGIN NEW_PRIMARY NEW_PLAN TARGET');
const origin=resolve(originArg),primary=resolve(primaryArg);
assert.notEqual(resolve(target),origin);
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const before=await json(`${origin}/source-hashes.json`),after=await json(`${primary}/source-hashes.json`);
assert.ok([10,12].includes(Object.keys(before).length));
const sha=data=>createHash('sha256').update(data).digest('hex');
const source={};
for(const [file,hash] of Object.entries(before)){
 const data=await readFile(`${origin}/source/${file}`);assert.equal(sha(data),hash,'Original source changed');
 if(file!=='scripts/review-tactics.mjs'){
  const current=await readFile(`${primary}/source/${file}`);assert.equal(sha(current),after[file],'Primary source changed');
  if(file==='dist/rules.mjs'){
   const {RULES:a}=await import(pathToFileURL(`${origin}/source/${file}`));
   const {RULES:b}=await import(pathToFileURL(`${primary}/source/${file}`));
   const strip=({label,...rules})=>rules;
   assert.deepEqual(strip(a),strip(b),'Relabel reuse forbids any numerical/mechanical rule change');
   source[file]=current;
  }else{assert.equal(hash,after[file],`Combat changed: ${file}`);source[file]=data;}
 }else source[file]=data;
}
const oldPlan=await json(`${origin}/plan.json`),plan=await json(planArg);
assert.deepEqual(oldPlan.jobs,plan.jobs,'Review jobs changed');
assert.deepEqual(oldPlan.cases,plan.cases,'Review cases changed');
const raw=await readFile(`${origin}/records.json.gz`),records=JSON.parse(gunzipSync(raw));
assert.equal(records.length,plan.jobs.length);const seen=new Set();
for(const r of records){
 assert.ok(Number.isInteger(r.index)&&r.index>=0&&r.index<plan.jobs.length&&!seen.has(r.index));seen.add(r.index);
 for(const [field,value] of Object.entries(plan.jobs[r.index]))assert.deepEqual(r[field],value);
}
const summary=await json(`${origin}/summary.json`);assert.equal(summary.games,records.length);
await mkdir(target,{recursive:true});const hashes={};
for(const [file,data] of Object.entries(source)){
 await mkdir(`${target}/source/${file.split('/')[0]}`,{recursive:true});await writeFile(`${target}/source/${file}`,data);hashes[file]=sha(data);
}
await writeFile(`${target}/source-hashes.json`,JSON.stringify(hashes,null,2)+'\n');
await writeFile(`${target}/records.json.gz`,raw);
await writeFile(`${target}/plan.json`,JSON.stringify(plan,null,2)+'\n');
await writeFile(`${target}/summary.json`,JSON.stringify({...summary,label:plan.label},null,2)+'\n');
await writeFile(`${target}/reuse-provenance.json`,JSON.stringify({mode:'rules version label only',origin,primary,
 originalHashes:before,currentHashes:hashes,executed:0,structurallyReused:records.length,
 exactOriginalRecords:true,identicalNumericalRules:true,identicalJobs:true},null,2)+'\n');
console.log(JSON.stringify({target,executed:0,structurallyReused:records.length}));
