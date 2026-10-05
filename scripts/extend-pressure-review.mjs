// Confirm selected screened kits against the seven remaining rivals. Preserve
// the historical actor order, so each baseline has the exact same scenario.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/balance/pressure-v0152';
const screen=JSON.parse(await readFile(`${root}/screen-plan.json`));
const summary=JSON.parse(await readFile('docs/balance/wrapup-v0151/final/summary.json'));
const hashes=JSON.parse(await readFile(`${root}/screen/source-hashes.json`));
for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),hash);
const tags=['flame/fierce/far-storm','flame/fierce/far-combust','water/tidal/independent-heal'];
const jobs=[];
for(const tag of tags){
 const screened=screen.jobs.filter(j=>j.tag===tag);assert.equal(screened.length,48);
 const actor=screened[0].a,at=summary.builds.findIndex(b=>b.id===actor.id);
 const covered=new Set(screened.map(j=>j.b.id));
 for(let i=0;i<summary.builds.length;i++){
  const foe=summary.builds[i];if(i===at||covered.has(foe.id))continue;
  const [a,b]=i<at?[foe,actor]:[actor,foe];
  for(const controller of ['immediate','prepared'])for(const distance of [0,1,2])for(const first of [0,1])jobs.push({tag,a,b,controller,distance,first,tendency:'balanced'});
 }
}
assert.equal(jobs.length,252);
await writeFile(`${root}/extension-plan.json`,JSON.stringify({label:'252 fresh confirmation executions: three screened variants against seven remaining rivals, original actor order, both controllers, ranges and initiatives. The separately frozen screen supplies 48 executions per variant; no scenario is rerun.',jobs},null,2));
console.log({newExecutions:jobs.length,selected:tags});
