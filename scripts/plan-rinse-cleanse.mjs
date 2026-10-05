import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/balance/cleanse-v0153',previous='docs/balance/pressure-v0152/final';
const summary=JSON.parse(await readFile(`${previous}/summary.json`)),hashes=JSON.parse(await readFile(`${previous}/source-hashes.json`));
for(const file of Object.keys(hashes).filter(f=>!['scripts/check-twelve-school.mjs','scripts/cultivation-reuse.mjs'].includes(f)))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),hashes[file]);
const builds=summary.builds,manifest=[];
for(const clearBurn of [1,2]){const id=`rinse-clear-${clearBurn}`,directory=`${root}/${id}`,jobs=[];
 for(const target of ['water/tidal','water/cold'])for(const foe of ['fire/ignite','flame/fierce','flame/smolder']){const i=builds.findIndex(b=>b.id===target),j=builds.findIndex(b=>b.id===foe),[a,b]=i<j?[builds[i],builds[j]]:[builds[j],builds[i]];
  const modes=[['immediate','balanced'],['prepared','balanced']];if(target==='water/tidal')modes.push(['immediate','defensive']);
  for(const [controller,tendency]of modes)for(const distance of [0,1,2])for(const first of [0,1])jobs.push({tag:id,target,a,b,controller,tendency,distance,first,skillOverrides:{water:{rinse:{clearBurn}}}});
 }
 assert.equal(jobs.length,90);await mkdir(directory,{recursive:true});await writeFile(`${directory}/plan.json`,JSON.stringify({label:`Isolated rinse burn-clear cap ${clearBurn}, heal18/cost/once/passive unchanged; both water majors against three specified burning builds, all balanced controllers, plus tidal defensive. Historical references separately stored; not a full matrix.`,jobs},null,2));manifest.push({id,directory,clearBurn,newExecutions:jobs.length});
}
await writeFile(`${root}/clear-manifest.json`,JSON.stringify({newExecutions:180,baseline:`${root}/confirmation-baseline-records.json.gz`,specs:manifest},null,2));console.log(manifest);
