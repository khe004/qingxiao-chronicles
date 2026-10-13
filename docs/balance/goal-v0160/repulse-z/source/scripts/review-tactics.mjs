// Execute explicit paired scenarios; frozen plans include all configurations.
import assert from 'node:assert/strict';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {CLASSES,normalizeLoadout,RULES} from '../dist/engine.mjs';
import {predictiveDuel} from './predictive-arena.mjs';

if(!isMainThread){
 const originals=structuredClone(CLASSES);
 const originalRules=structuredClone(RULES);
 for(const job of workerData){
  for(const k of Object.keys(RULES))delete RULES[k];Object.assign(RULES,structuredClone(originalRules));
  for(const [key,value] of Object.entries(job.ruleOverrides??{})){
   assert.ok(['secondShield','chainPower','edgePower','intentPower','mountainBonus','bastionShield','advantage','disadvantage','parasitePower','coldPower'].includes(key),'Only runtime scalar rules may be overridden');
   assert.ok(Number.isFinite(value));RULES[key]=value;
  }
  for(const [key,c] of Object.entries(CLASSES)){
   for(const [field,value] of Object.entries(originals[key]))if(field!=='skills')c[field]=structuredClone(value);
   for(const s of c.skills){const original=originals[key].skills.find(x=>x.id===s.id);for(const k of Object.keys(s))delete s[k];Object.assign(s,structuredClone(original));}
  }
  for(const [key,patch] of Object.entries(job.statOverrides??{})){
   assert.ok(Object.hasOwn(CLASSES,key));
   for(const [field,value] of Object.entries(patch)){assert.ok(['hp','physical','magical'].includes(field));assert.ok(Number.isFinite(value)&&value>0);CLASSES[key][field]=value;}
  }
  for(const [key,gen] of Object.entries(job.genOverrides??{})){
   assert.ok(Object.hasOwn(CLASSES,key));
   assert.ok(Object.keys(gen).every(k=>['metal','wood','water','fire','earth','any'].includes(k)));
   assert.ok(Object.values(gen).every(n=>Number.isInteger(n)&&n>=0));
   assert.equal(Object.values(gen).reduce((sum,n)=>sum+n,0),5,'Income allocation must preserve the five-qi budget');
   CLASSES[key].gen=structuredClone(gen);
  }
  for(const [key,skills] of Object.entries(job.skillOverrides??{}))for(const [id,values] of Object.entries(skills))Object.assign(CLASSES[key].skills.find(s=>s.id===id),values);
  const start=performance.now();
  const result=predictiveDuel(job.a,job.b,{first:job.first,distance:job.distance,
   controllers:job.controllers??[job.controller,job.controller],prefs:job.prefs??[job.tendency??'balanced',job.tendency??'balanced'],limit:job.limit??30,trace:true});
  parentPort.postMessage({...job,...result,ms:performance.now()-start});
 }
}else{
 const [planFile,out]=process.argv.slice(2);assert.ok(planFile&&out);
 const plan=JSON.parse(await readFile(planFile));assert.ok(plan.jobs.length);
 const jobs=plan.jobs.map((j,index)=>({...j,index}));
 for(const j of jobs){for(const b of [j.a,j.b])assert.deepEqual(normalizeLoadout(b.key,b.config),b.config);assert.ok([0,1,2].includes(j.distance));assert.ok([0,1].includes(j.first));}
 await mkdir(out,{recursive:true});await writeFile(`${out}/plan.json`,JSON.stringify(plan,null,2));
 const files=['dist/rules.mjs','dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs','dist/tactics.mjs','dist/active-policy.mjs','dist/recorded-battle.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs','scripts/review-tactics.mjs'];
 const hashes={};for(const file of files){const data=await readFile(new URL('../'+file,import.meta.url));hashes[file]=createHash('sha256').update(data).digest('hex');await mkdir(`${out}/source/${file.split('/')[0]}`,{recursive:true});await writeFile(`${out}/source/${file}`,data);}
 await writeFile(`${out}/source-hashes.json`,JSON.stringify(hashes,null,2));
 const records=[];let checkpoint=Promise.resolve();
 await Promise.all([0,1].map(part=>new Promise((resolve,reject)=>{
  // Keep adjacent controller comparisons together so both workers share the
  // expensive prepared forecasts rather than assigning them all to one worker.
  const worker=new Worker(new URL(import.meta.url),{workerData:jobs.filter(j=>Math.floor(j.index/2)%2===part)});
  worker.on('error',reject);worker.on('exit',code=>code?reject(Error(`worker ${code}`)):resolve());
  worker.on('message',r=>{records.push(r);checkpoint=checkpoint.then(()=>writeFile(`${out}/checkpoint.json.gz`,gzipSync(JSON.stringify(records))));if(records.length%12===0)console.log(`${records.length}/${jobs.length}`);});
 })));
 await checkpoint;records.sort((a,b)=>a.index-b.index);assert.equal(records.length,jobs.length);
 await writeFile(`${out}/records.json.gz`,gzipSync(JSON.stringify(records)));
 const limits=[...new Set(jobs.map(j=>j.limit??30))];
 const summary={label:plan.label,games:records.length,limit:limits.length===1?limits[0]:null,limits,groups:{}};
 for(const r of records){const key=`${r.tag}/${r.controller??r.controllers.join('-')}/${r.tendency??r.prefs?.join('-')??'balanced'}`;
  const s=summary.groups[key]??={games:0,wins:0,losses:0,unresolved:0,rounds:0,actions:{},unusedAP:0};s.games++;s[r.winner===null?'unresolved':r.winner===0?'wins':'losses']++;s.rounds+=r.rounds;s.unusedAP+=r.metrics[0].unusedAP;
  for(const [id,n] of Object.entries(r.metrics[0].actions))s.actions[id]=(s.actions[id]??0)+n;
 }
 await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary.groups));
}
