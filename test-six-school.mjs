import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
let replayed=0;
for(const variant of ['baseline','landbreak-cost1']){
 const root=new URL(`./docs/balance/six-school-v012/${variant}/`,import.meta.url),hashes=JSON.parse(await readFile(new URL('source-hashes.json',root),'utf8'));
 for(const [name,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(new URL('source/'+name,root))).digest('hex'),hash);
 const records=JSON.parse(gunzipSync(await readFile(new URL('records.json.gz',root))));assert.equal(records.length,108);assert.equal(records.filter(r=>r.winner===null).length,0);
 const {predictiveDuel}=await import(new URL('source/scripts/predictive-arena.mjs',root));
 for(const controller of ['immediate','prepared']){const list=records.filter(r=>r.controller===controller);for(const r of [list[0],list.at(-1)]){const actual=predictiveDuel(r.a,r.b,{first:r.first,distance:r.distance,prefs:[r.tendency,r.tendency],controllers:[controller,controller],trace:true});for(const key of ['winner','rounds','hp','metrics','trace'])assert.deepEqual(actual[key],r[key],`${variant}/${controller}/${key}`);replayed++;}}
}
console.log(`Six-school review: 216 bounded records and all frozen source hashes, ${replayed} representative full-state/log replays passed.`);
