// A guarded second check after the independent-heal kit showed a high
// defensive win rate. One further slot changes; all other kits stay fixed.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalizeLoadout} from '../dist/engine.mjs';
import {TACTICAL_LOADOUTS} from '../dist/tactics.mjs';
const root=process.argv[2]??'docs/balance/pressure-v0152';
const hashes=JSON.parse(await readFile(`${root}/final/source-hashes.json`));
for(const file of ['dist/rules.mjs','dist/tactics.mjs','dist/engine.mjs','dist/auto.mjs','dist/prepared.mjs','dist/active-policy.mjs','dist/recorded-battle.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs'])assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),hashes[file]);
const old=JSON.parse(await readFile('docs/balance/wrapup-v0151/final/summary.json'));
const builds=old.builds.map(b=>({...b,config:normalizeLoadout(b.key,{major:b.config.major,skillIds:TACTICAL_LOADOUTS[b.key][b.config.major]})}));
const at=builds.findIndex(b=>b.id==='water/tidal'),target=structuredClone(builds[at]);
assert.ok(target.config.skillIds.includes('rinse')&&target.config.skillIds.includes('waterwall'));
target.config=normalizeLoadout(target.key,{major:target.config.major,skillIds:target.config.skillIds.map(id=>id==='waterwall'?'mirrorwater':id)});
const jobs=[];
for(let i=0;i<builds.length;i++){if(i===at)continue;const [a,b]=i<at?[builds[i],target]:[target,builds[i]];
 for(const [controller,tendency]of [['immediate','balanced'],['prepared','balanced'],['immediate','defensive']])for(const distance of [0,1,2])for(const first of [0,1])jobs.push({tag:'water/tidal/mirror-rinse',a,b,controller,tendency,distance,first});
}
assert.equal(jobs.length,198);
await writeFile(`${root}/guard-plan.json`,JSON.stringify({label:'198 fresh one-slot guard trade confirmations against all 11 current combined rivals: immediate/prepared balanced and immediate defensive, all three ranges and both initiatives. Compare with the original combined final/defensive runs; no skill or AI changes.',jobs},null,2));console.log({newExecutions:jobs.length});
