// Extend a specific historical unresolved defense case with its frozen rules.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';import {gzipSync,gunzipSync} from 'node:zlib';
const [input='docs/balance/tactical-v015/long-defense',out='/tmp/qingxiao-defense-tail']=process.argv.slice(2);
const hashes=JSON.parse(await readFile(`${input}/source-hashes.json`));
for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(`${input}/source/${file}`)).digest('hex'),hash);
const {predictiveDuel}=await import(pathToFileURL(resolve(input,'source/scripts/predictive-arena.mjs')));
const records=JSON.parse(gunzipSync(await readFile(`${input}/records.json.gz`))),r=records.find(x=>x.baselineIndex===116);assert.equal(r.winner,null);assert.equal(r.rounds,90);
const actual=predictiveDuel(r.a,r.b,{first:r.first,distance:r.distance,limit:260,prefs:[r.tendency,r.tendency],controllers:[r.controller,r.controller],trace:true});
assert.ok(actual.winner!==null,'This diagnostic expects the observed slow loss to resolve within 260');
await mkdir(out,{recursive:true});await cp(`${input}/source`,`${out}/source`,{recursive:true});await cp(`${input}/source-hashes.json`,`${out}/source-hashes.json`);await cp(new URL(import.meta.url),`${out}/check-defense-tail.mjs`);
const result={...r,...actual,observationLimit:260,originalObservationLimit:90};await writeFile(`${out}/records.json.gz`,gzipSync(JSON.stringify([result])));
const summary={scope:'One historical v0.15 defensive sustain/symbiosis 90-round unresolved case, extended to 260 with original frozen sources; separate diagnostic, excluded from win-rate denominators',baselineIndex:116,winner:actual.winner,rounds:actual.rounds,hp:actual.hp,metrics:actual.metrics};
await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
