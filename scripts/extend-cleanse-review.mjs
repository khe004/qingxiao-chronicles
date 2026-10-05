import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
const root=process.argv[2]??'docs/balance/cleanse-v0153',previous='docs/balance/pressure-v0152';
const summary=JSON.parse(await readFile(`${previous}/final/summary.json`)),builds=summary.builds;
const oldHashes=JSON.parse(await readFile(`${previous}/final/source-hashes.json`));
for(const file of Object.keys(oldHashes).filter(f=>!['scripts/check-twelve-school.mjs','scripts/cultivation-reuse.mjs'].includes(f)))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),oldHashes[file]);
const old={balanced:JSON.parse(gunzipSync(await readFile(`${previous}/final/records.json.gz`))),defensive:JSON.parse(gunzipSync(await readFile(`${previous}/defensive/records.json.gz`)))};
const context=r=>JSON.stringify([r.a,r.b,r.controller,r.tendency,r.distance,r.first]);
const baselines=[],seenRefs=new Set(),manifest=[];
for(const id of ['purify-0','rinse-14','rinse-12']){const screen=JSON.parse(await readFile(`${root}/${id}/plan.json`)),spec=JSON.parse(await readFile(`${root}/${id}/variant.json`));
 const covered=new Set(screen.jobs.map(context)),targets=spec.kind==='purify'?['fire/ignite','flame/fierce','flame/smolder']:['water/cold','water/tidal'];
 const jobs=[],all=[];for(let i=0;i<12;i++)for(let j=i+1;j<12;j++){
  const a=builds[i],b=builds[j];if(!targets.some(t=>[a.id,b.id].includes(t)))continue;
  const modes=[['immediate','balanced'],['prepared','balanced']];if(spec.kind==='rinse'&&[a.id,b.id].includes('water/tidal'))modes.push(['immediate','defensive']);
  for(const [controller,tendency]of modes)for(const distance of [0,1,2])for(const first of [0,1]){const job={a,b,controller,tendency,distance,first,tag:id,...(spec.kind==='rinse'?{skillOverrides:{water:{rinse:{heal:spec.heal}}}}:{})};all.push(job);if(!covered.has(context(job)))jobs.push(job);
   const ref=old[tendency].find(r=>context(r)===context(job));assert.ok(ref);const key=`${tendency}/${ref.index}`;if(!seenRefs.has(key)){seenRefs.add(key);baselines.push({...ref,referenceSuite:`${previous}/${tendency==='balanced'?'final':'defensive'}`});}
  }
 }
 assert.equal(all.length,spec.kind==='purify'?360:318);assert.equal(jobs.length,spec.kind==='purify'?288:186);
 assert.equal(screen.jobs.length+jobs.length,all.length);
 const directory=`${root}/${id}-confirm`;await mkdir(directory,{recursive:true});await writeFile(`${directory}/plan.json`,JSON.stringify({label:`${id}: new execution of only unscreened full-rival scenarios; original screened cases are frozen and referenced separately, not rerun.`,jobs},null,2));
 manifest.push({id,directory,screenExecutions:screen.jobs.length,newExecutions:jobs.length,combinedUniqueScenarios:all.length,targets});
}
await writeFile(`${root}/confirmation-baseline-records.json.gz`,gzipSync(JSON.stringify(baselines)));
await writeFile(`${root}/confirmation-manifest.json`,JSON.stringify({newExecutions:660,historicalUniqueRecords:baselines.length,historicalNewExecutions:0,specs:manifest,scope:'Only unscreened scenarios are freshly executed; common target-versus-target pairs execute once and contribute to both row totals. Original ordered actors and full kits remain fixed.'},null,2));console.log(manifest);
