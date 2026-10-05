import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
const root='docs/balance/fierce-window-v0154',base='docs/balance/cleanse-v0153/final';
const s=JSON.parse(await readFile(`${base}/summary.json`)),h=JSON.parse(await readFile(`${base}/source-hashes.json`));
for(const file of Object.keys(h).filter(f=>!['scripts/check-twelve-school.mjs','scripts/cultivation-reuse.mjs'].includes(f)))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),h[file]);
const fierce=s.builds.find(b=>b.id==='flame/fierce');
const specs=[['eruption-to-combust','eruption','combust'],['eruption-to-cinder','eruption','cinder'],['quench-to-combust','quench','combust'],['ward-to-combust','ashenward','combust']];
const jobs=[],refs=[];const old=JSON.parse(gunzipSync(await readFile(`${base}/records.json.gz`)));
for(const [tag,remove,add]of specs)for(const foe of ['wood/symbiosis','wood/parasitic'])for(const distance of [0,1,2])for(const first of [0,1]){
 const a=structuredClone(fierce),b=s.builds.find(b=>b.id===foe);assert.ok(a.config.skillIds.includes(remove));a.config.skillIds=a.config.skillIds.map(id=>id===remove?add:id);
 jobs.push({tag,target:a.id,a,b,controller:'prepared',tendency:'balanced',distance,first});
 if(tag===specs[0][0]){const r=old.find(r=>r.a.id===fierce.id&&r.b.id===foe&&r.controller==='prepared'&&r.tendency==='balanced'&&r.distance===distance&&r.first===first);assert.ok(r);assert.deepEqual(r.a,fierce);assert.deepEqual(r.b,b);refs.push(r);}
}
await mkdir(`${root}/screen`,{recursive:true});await writeFile(`${root}/screen/plan.json`,JSON.stringify({label:'Current v0.15.3 storm kit; four isolated one-slot alternatives vs two prepared wood builds; no rules or AI changes. Three ranges and exchanged initiative, not a full matrix.',jobs},null,2));await writeFile(`${root}/baseline-records.json.gz`,gzipSync(JSON.stringify(refs)));await writeFile(`${root}/manifest.json`,JSON.stringify({source:base,sourceHashes:h,specs,newExecutions:48,historicalReferences:12,historicalNewExecutions:0},null,2));console.log({jobs:jobs.length});
