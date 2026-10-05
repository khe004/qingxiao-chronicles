// Explicit one-slot screening, with historical baselines only after exact
// combat-source and full scenario verification. Baselines are not rerun samples.
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync,gzipSync} from 'node:zlib';
import {normalizeLoadout} from '../dist/engine.mjs';
const out=process.argv[2]??'docs/balance/pressure-v0152',old='docs/balance/wrapup-v0151/final';
const summary=JSON.parse(await readFile(`${old}/summary.json`)),hashes=JSON.parse(await readFile(`${old}/source-hashes.json`)),records=JSON.parse(gunzipSync(await readFile(`${old}/records.json.gz`)));
const shared=['dist/rules.mjs','dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs','dist/tactics.mjs','dist/active-policy.mjs','dist/recorded-battle.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs'];const verified={};
for(const file of shared){const h=createHash('sha256').update(await readFile(file)).digest('hex');assert.equal(h,hashes[file],`Historical baseline changed: ${file}`);assert.equal(createHash('sha256').update(await readFile(`${old}/source/${file}`)).digest('hex'),h);verified[file]=h;}
const builds=Object.fromEntries(summary.builds.map(b=>[b.id,b]));const targets=[
 ['flame/fierce',['wood/symbiosis','wood/parasitic','water/cold','earth/bastion'],[['far-storm','stoke','firestorm'],['storm-trade','eruption','firestorm'],['far-combust','stoke','combust'],['cinder-trade','eruption','cinder']]],
 ['water/tidal',['wood/symbiosis','wood/parasitic','earth/bastion','earth/mountain'],[['ebb-outlet','tidespear','ebb'],['independent-heal','mendingtide','rinse'],['mirror-trade','waterwall','mirrorwater'],['ebb-defense-trade','waterwall','ebb']]],
];const baselines=[],jobs=[];
for(const [id,foes,variants] of targets){const a=builds[id];assert.ok(a);
 for(const foe of foes)for(const controller of ['immediate','prepared'])for(const distance of [0,1,2])for(const first of [0,1]){
  const b=builds[foe],r=records.find(r=>r.a.id===id&&r.b.id===foe&&r.controller===controller&&r.distance===distance&&r.first===first&&r.tendency==='balanced');assert.ok(r);assert.deepEqual(r.a,a);assert.deepEqual(r.b,b);assert.equal(summary.limits.rounds,30);baselines.push({...r,tag:`${id}/baseline`,baselineSource:old});
 }
 for(const [variant,from,to] of variants){const actor={...a,config:normalizeLoadout(a.key,{major:a.config.major,skillIds:a.config.skillIds.map(x=>x===from?to:x)})};assert.ok(actor.config.skillIds.includes(to)&&!actor.config.skillIds.includes(from));
  for(const foe of foes)for(const controller of ['immediate','prepared'])for(const distance of [0,1,2])for(const first of [0,1])jobs.push({tag:`${id}/${variant}`,a:actor,b:builds[foe],controller,distance,first,tendency:'balanced'});
 }
}
assert.equal(baselines.length,96);assert.equal(jobs.length,384);await mkdir(out,{recursive:true});await writeFile(`${out}/baseline-records.json.gz`,gzipSync(JSON.stringify(baselines)));await writeFile(`${out}/baseline-provenance.json`,JSON.stringify({source:old,records:96,newExecutions:0,scope:'Same ordered actors, complete six-slot configuration, controller, distance, initiative, tendency and 30-round boundary; all nine common combat modules byte-identical',sourceHashes:verified,indices:baselines.map(r=>r.index)},null,2));await writeFile(`${out}/screen-plan.json`,JSON.stringify({label:'Fierce and tidal four single-slot variants, four specified opponents per school, two controllers/three distances/initiative. 384 fresh executions; 96 exact historical baseline records stored separately.',jobs},null,2));console.log({newJobs:jobs.length,historicalBaselines:baselines.length});
