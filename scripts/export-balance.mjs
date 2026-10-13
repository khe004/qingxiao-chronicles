// Export the measured matrix and every scenario, without shipping research logs.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const [root,destination='dist/balance-data.json',...supplements]=process.argv.slice(2);assert.ok(root);
// Revalidate raw records and frozen hashes instead of trusting a stale or
// manually copied passing gates.json from another candidate.
await promisify(execFile)(process.execPath,[fileURLToPath(new URL('./balance-gates.mjs',import.meta.url)),root,'--require-pass']);
const s=JSON.parse(await readFile(`${root}/summary.json`,'utf8'));
const gates=JSON.parse(await readFile(`${root}/gates.json`,'utf8'));
assert.ok(gates.passed,'Only a complete matrix passing frozen gates may be exported');
const rows=JSON.parse(gunzipSync(await readFile(`${root}/records.json.gz`)));
const {Battle,CLASSES,RULES}=await import(pathToFileURL(resolve(root,'source/dist/engine.mjs')));
assert.deepEqual(s.rules,RULES);
const index=id=>s.builds.findIndex(b=>b.id===id);
const data={version:s.rules.label,sourceCommit:s.sourceCommit,limits:s.limits,measurement:s.measurement,gates:gates.gates,
 builds:s.builds.map(b=>({...b,maxHp:new Battle(b.key,b.config).player.maxHp,skills:b.config.skillIds.map(id=>{const skill=CLASSES[b.key].skills.find(s=>s.id===id);assert.ok(skill);return {id,name:skill.name};})})),
 controllers:s.controllers,
 records:rows.map(r=>({a:index(r.a.id),b:index(r.b.id),controller:r.controller,first:r.first,distance:r.distance,winner:r.winner,rounds:r.rounds,hp:r.hp,kind:r.kind}))};
assert.equal(data.records.length,936);
const compact=rows=>rows.map(r=>({a:index(r.a.id),b:index(r.b.id),controller:r.controller,first:r.first,distance:r.distance,winner:r.winner,rounds:r.rounds,hp:r.hp,kind:r.kind}));
data.datasets={};
const combat=['dist/rules.mjs','dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs',
 'dist/tactics.mjs','dist/active-policy.mjs','dist/recorded-battle.mjs',
 'scripts/predictive-arena.mjs','scripts/planner-internals.mjs'];
const mainHashes=JSON.parse(await readFile(`${root}/source-hashes.json`));
for(const extraRoot of supplements){
 const extra=JSON.parse(await readFile(`${extraRoot}/summary.json`));
 const hashes=JSON.parse(await readFile(`${extraRoot}/source-hashes.json`));
 for(const [file,hash] of Object.entries(hashes))assert.equal(
  createHash('sha256').update(await readFile(`${extraRoot}/source/${file}`)).digest('hex'),hash,'Supplement frozen source changed');
 for(const file of combat)assert.equal(hashes[file],mainHashes[file],`Supplement changed combat: ${file}`);
 assert.equal(extra.partial,undefined);assert.deepEqual(extra.rules,s.rules);assert.deepEqual(extra.builds,s.builds);
 const tendency=extra.limits.tendency;assert.ok(['aggressive','defensive'].includes(tendency));
 assert.equal(data.datasets[tendency],undefined,'Duplicate tendency dataset');
 assert.deepEqual(extra.limits.controllers,['prepared']);assert.deepEqual(extra.limits.distances,[0,1,2]);
 assert.equal(extra.limits.rounds,30);assert.equal(extra.limits.loadout,s.limits.loadout);
 const extraRows=JSON.parse(gunzipSync(await readFile(`${extraRoot}/records.json.gz`))),expected=[];
 for(let i=0;i<12;i++)for(let j=i;j<12;j++)for(const distance of [0,1,2])for(const first of [0,1])
  expected.push({a:s.builds[i],b:s.builds[j],distance,first,controller:'prepared',tendency,kind:i===j?'mirror':'cross'});
 assert.equal(extraRows.length,468);assert.equal(new Set(extraRows.map(r=>r.index)).size,468);
 for(const r of extraRows){
  assert.ok(Number.isInteger(r.index)&&r.index>=0&&r.index<468);
  for(const [key,value] of Object.entries(expected[r.index]))assert.deepEqual(r[key],value,'Supplement configuration changed');
  assert.ok(Number.isInteger(r.rounds)&&r.rounds>=1&&r.rounds<=30);assert.ok(r.winner===null||[0,1].includes(r.winner));
  assert.equal(r.hp.length,2);
  for(const seat of [0,1])assert.ok(Number.isInteger(r.hp[seat])&&r.hp[seat]>=0&&r.hp[seat]<=data.builds[index(r[seat?'b':'a'].id)].maxHp);
  if(r.winner===null){assert.equal(r.rounds,30);assert.ok(r.hp.every(h=>h>0));}
  else {assert.ok(r.hp[r.winner]>0);assert.equal(r.hp[1-r.winner],0);}
 }
 data.datasets[tendency]={limits:extra.limits,measurement:extra.measurement,records:compact(extraRows)};
}
await writeFile(destination,JSON.stringify(data)+'\n');
console.log(JSON.stringify({destination,version:data.version,games:data.records.length,secondary:Object.keys(data.datasets)}));
