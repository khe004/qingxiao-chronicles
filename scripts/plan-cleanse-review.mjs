// Isolated numerical screens. No shipped rule is changed while screening.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
const root=process.argv[2]??'docs/balance/cleanse-v0153',previous='docs/balance/pressure-v0152';
const combat=['dist/rules.mjs','dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs','dist/tactics.mjs','dist/active-policy.mjs','dist/recorded-battle.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs'];
const files=[...combat,'scripts/review-tactics.mjs'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const summary=JSON.parse(await readFile(`${previous}/final/summary.json`)),builds=summary.builds;
const oldHashes=JSON.parse(await readFile(`${previous}/final/source-hashes.json`));
const sources=Object.fromEntries(await Promise.all(files.map(async f=>[f,await readFile(f)])));
for(const file of combat){assert.equal(hash(sources[file]),oldHashes[file]);assert.equal(hash(await readFile(`${previous}/final/source/${file}`)),oldHashes[file]);}
const old={balanced:JSON.parse(gunzipSync(await readFile(`${previous}/final/records.json.gz`))),defensive:JSON.parse(gunzipSync(await readFile(`${previous}/defensive/records.json.gz`)))};
const jobsFor=(pairs,modes)=>{const jobs=[];for(const [left,right]of pairs){const i=builds.findIndex(b=>b.id===left),j=builds.findIndex(b=>b.id===right);assert.ok(i>=0&&j>=0&&i!==j);const [a,b]=i<j?[builds[i],builds[j]]:[builds[j],builds[i]];
 for(const [controller,tendency]of modes)for(const distance of [0,1,2])for(const first of [0,1])jobs.push({a,b,controller,tendency,distance,first});}return jobs;};
const flamePairs=['wood/symbiosis','wood/parasitic','water/cold','water/tidal'].map(b=>['flame/fierce',b]).concat(['wood/symbiosis','wood/parasitic'].map(b=>['fire/ignite',b]));
const waterPairs=['fire/ignite','flame/fierce','flame/smolder','water/cold','wood/parasitic','earth/bastion'].map(b=>['water/tidal',b]);
const balanced=[['immediate','balanced'],['prepared','balanced']],waterModes=[...balanced,['immediate','defensive']];
const specs=[... [4,0].map(heal=>({id:`purify-${heal}`,kind:'purify',heal,jobs:jobsFor(flamePairs,balanced)})),... [14,12].map(heal=>({id:`rinse-${heal}`,kind:'rinse',heal,jobs:jobsFor(waterPairs,waterModes).concat(jobsFor(['fire/ignite','flame/fierce'].map(b=>['water/cold',b]),balanced))}))];
await mkdir(root,{recursive:true});const baselines=[],unique=new Set(),manifest=[];
for(const spec of specs){const directory=`${root}/${spec.id}`;await mkdir(directory,{recursive:true});const local={...sources},patches=[];
 if(spec.kind==='purify'){const src=sources['dist/engine.mjs'].toString(),line=src.split('\n').find(l=>l.includes("else if(s.kind==='purify')"));assert.ok(line&&line.includes('actor.hp+8')&&line.includes('恢复 8 气血'));
 const replacement=line.replace('actor.hp+8',`actor.hp+${spec.heal}`).replace('恢复 8 气血',`恢复 ${spec.heal} 气血`);assert.equal(src.split(line).length,2);local['dist/engine.mjs']=Buffer.from(src.replace(line,replacement));patches.push({file:'dist/engine.mjs',before:line,after:replacement});
 }
 const jobs=spec.jobs.map(job=>({...job,tag:spec.id,...(spec.kind==='rinse'?{skillOverrides:{water:{rinse:{heal:spec.heal}}}}:{})}));
 const context=new Set();for(const job of jobs){const key=JSON.stringify([job.a,job.b,job.controller,job.tendency,job.distance,job.first]);assert.ok(!context.has(key));context.add(key);
  const r=old[job.tendency].find(r=>r.a.id===job.a.id&&r.b.id===job.b.id&&r.controller===job.controller&&r.tendency===job.tendency&&r.distance===job.distance&&r.first===job.first);assert.ok(r);assert.deepEqual(r.a,job.a);assert.deepEqual(r.b,job.b);const id=`${job.tendency}/${r.index}`;if(!unique.has(id)){unique.add(id);baselines.push({...r,referenceSuite:`${previous}/${job.tendency==='balanced'?'final':'defensive'}`});}
 }
 const hashes={};for(const [file,data]of Object.entries(local)){await mkdir(`${directory}/source/${file.split('/')[0]}`,{recursive:true});await writeFile(`${directory}/source/${file}`,data);hashes[file]=hash(data);}
 await writeFile(`${directory}/plan.json`,JSON.stringify({label:`Isolated ${spec.kind} healing ${spec.heal}; explicit variant source or skillOverride; 30-round limit; exact historical scenarios stored separately, zero new baseline executions.`,jobs},null,2));
 await writeFile(`${directory}/variant.json`,JSON.stringify({id:spec.id,kind:spec.kind,heal:spec.heal,sourceBaseline:previous,baselineHashes:oldHashes,hashes,patches,newExecutions:jobs.length},null,2));manifest.push({id:spec.id,games:jobs.length});
}
assert.deepEqual(manifest.map(s=>s.games),[72,72,132,132]);
await writeFile(`${root}/baseline-records.json.gz`,gzipSync(JSON.stringify(baselines)));
await writeFile(`${root}/screen-manifest.json`,JSON.stringify({previous,specs:manifest,newExecutions:408,historicalUniqueRecords:baselines.length,historicalNewExecutions:0,scope:'All nine combat files match the v0.15.2 source before forks; purify forks change only its heal literal and log; rinse uses explicit per-job skill overrides. Exact ordered actors, six slots, controller, tendency, range and initiative are checked.'},null,2));
console.log({screens:manifest,newExecutions:408,oldReferences:baselines.length});
