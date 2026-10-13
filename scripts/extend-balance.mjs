// Extend unresolved scenarios without replacing their original matrix results.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const [mode,matrixRoot,target,arg,...flags]=process.argv.slice(2);
assert.ok(['plan','verify'].includes(mode)&&matrixRoot&&target,
 'Usage: extend-balance.mjs plan MATRIX PLAN [120] | verify MATRIX EXTENSION REPORT [--require-complete]');
const combat=['dist/rules.mjs','dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs',
 'dist/tactics.mjs','dist/active-policy.mjs','dist/recorded-battle.mjs',
 'scripts/predictive-arena.mjs','scripts/planner-internals.mjs'];
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const records=async root=>JSON.parse(gunzipSync(await readFile(`${root}/records.json.gz`)));
async function frozen(root){
 const hashes=await json(`${root}/source-hashes.json`);
 for(const [file,hash] of Object.entries(hashes))assert.equal(
  createHash('sha256').update(await readFile(`${root}/source/${file}`)).digest('hex'),hash,
  `Frozen source changed: ${file}`);
 for(const file of combat)assert.ok(hashes[file],`Missing combat source: ${file}`);
 return hashes;
}
const hashes=await frozen(matrixRoot),summary=await json(`${matrixRoot}/summary.json`);
assert.equal(summary.partial,undefined,'A partial matrix cannot establish all timeouts');
const original=await records(matrixRoot);
// Secondary tendency checks use one complete controller, rather than the two
// controllers required by the balanced acceptance gate. Neither may be partial.
const controllers=summary.limits.controllers;
assert.ok(Array.isArray(controllers)&&controllers.length>=1&&controllers.length<=2);
assert.equal(new Set(controllers).size,controllers.length);
assert.ok(controllers.every(c=>['immediate','prepared'].includes(c)));
assert.deepEqual(summary.limits.distances,[0,1,2]);
assert.equal(summary.limits.rounds,30);
assert.equal(summary.builds.length,12);
assert.equal(new Set(summary.builds.map(b=>b.id)).size,12);
const expected=[];
for(const controller of controllers)for(let i=0;i<12;i++)for(let j=i;j<12;j++)
 for(const distance of [0,1,2])for(const first of [0,1])expected.push({
  a:summary.builds[i],b:summary.builds[j],controller,distance,first,
  tendency:summary.limits.tendency,kind:i===j?'mirror':'cross'});
assert.equal(original.length,expected.length);
assert.equal(new Set(original.map(r=>r.index)).size,expected.length);
for(const r of original){
 assert.ok(Number.isInteger(r.index)&&r.index>=0&&r.index<expected.length,'Invalid matrix index');
 for(const [field,value] of Object.entries(expected[r.index]))
  assert.deepEqual(r[field],value,`Original matrix configuration differs: ${field}`);
}
const unresolved=original.filter(r=>r.winner===null);
if(mode==='plan'){
 const limit=Number(arg??120);assert.ok(Number.isInteger(limit)&&limit>30&&limit<=500);
 const jobs=unresolved.map(r=>({originalIndex:r.index,a:r.a,b:r.b,
  controller:r.controller,tendency:r.tendency,first:r.first,distance:r.distance,
  limit,tag:`${r.a.id}--${r.b.id}/${r.kind}`}));
 assert.ok(jobs.length,'No unresolved scenarios require extension');
 await writeFile(target,JSON.stringify({label:`Extend all ${jobs.length} unresolved scenarios to ${limit}; preserve the original 30-round matrix.`,jobs},null,2)+'\n');
 console.log(JSON.stringify({timeouts:jobs.length,limit,plan:target}));
}else{
 assert.ok(arg,'A report destination is required');
 const extensionHashes=await frozen(target);
 for(const file of combat)assert.equal(extensionHashes[file],hashes[file],`Extension changed combat: ${file}`);
 const plan=await json(`${target}/plan.json`),extended=await records(target);
 assert.equal(extended.length,plan.jobs.length);
 const seen=new Set(),rows=[];
 for(const e of extended){
  const job=plan.jobs[e.index];assert.ok(job,'Unexpected extension index');
  const id=job.originalIndex;assert.ok(!seen.has(id),'Duplicate original scenario');seen.add(id);
  const r=unresolved.find(r=>r.index===id);assert.ok(r,'Extension must refer to an unresolved matrix scenario');
  for(const field of ['a','b','controller','tendency','first','distance']){
   assert.deepEqual(job[field],r[field],`Extension configuration changed: ${field}`);
   assert.deepEqual(e[field],job[field],`Extension record differs from plan: ${field}`);
  }
  for(const field of ['skillOverrides','ruleOverrides','majorHpOverrides','statOverrides','genOverrides','controllers','prefs'])
   assert.equal(job[field],undefined,`Extension adds an override: ${field}`);
  assert.ok(Number.isInteger(job.limit)&&job.limit>30);
  assert.equal(e.limit,job.limit);assert.ok(Array.isArray(r.trace)&&Array.isArray(e.trace));
  assert.deepEqual(e.trace.slice(0,r.trace.length),r.trace,'Original trace is not an exact extension prefix');
  assert.ok(e.rounds>30&&e.rounds<=job.limit);
  if(e.winner===null)assert.equal(e.rounds,job.limit);
  else {assert.ok([0,1].includes(e.winner));assert.ok(e.hp[e.winner]>0);assert.equal(e.hp[1-e.winner],0);}
  rows.push({originalIndex:id,a:r.a.id,b:r.b.id,controller:r.controller,
   distance:r.distance,first:r.first,originalHp:r.hp,rounds:e.rounds,winner:e.winner,hp:e.hp,limit:job.limit});
 }
 const result={originalTimeouts:unresolved.length,covered:rows.length,
  complete:rows.length===unresolved.length,exactTracePrefixes:true,
  finished:rows.filter(r=>r.winner!==null).length,stillUnresolved:rows.filter(r=>r.winner===null).length,
  note:'Extended outcomes do not replace the original matrix wins, losses or unresolved denominators.',rows};
 if(flags.includes('--require-complete'))assert.ok(result.complete,'Not all original timeouts were extended');
 await writeFile(arg,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({...result,rows:undefined}));
}
