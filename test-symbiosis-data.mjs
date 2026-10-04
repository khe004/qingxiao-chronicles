import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root='docs/balance/symbiosis-v0141';
for(const [name,games] of [['ablation',72],['confirm',264],['ordered',132]]){
 const dir=`${root}/${name}`,s=JSON.parse(readFileSync(`${dir}/summary.json`));
 const records=JSON.parse(gunzipSync(readFileSync(`${dir}/records.json.gz`)));
 assert.equal(records.length,games);assert.equal(s.games,games);
 const seen=new Set();
 for(const r of records){assert.equal(r.a.id,'wood/symbiosis');const key=JSON.stringify([r.variant,r.b.id,r.controller,r.distance,r.first]);assert.ok(!seen.has(key));seen.add(key);assert.ok(r.rounds<=30);if(r.winner===null)assert.ok(r.hp.every(hp=>hp>0));else assert.equal(r.hp[1-r.winner],0);}
 for(const [variant,controllers] of Object.entries(s.results))for(const [controller,summary] of Object.entries(controllers)){
  const rs=records.filter(r=>r.variant===variant&&r.controller===controller);
  assert.equal(summary.games,rs.length);assert.equal(summary.wins,rs.filter(r=>r.winner===0).length);assert.equal(summary.losses,rs.filter(r=>r.winner===1).length);assert.equal(summary.unresolved,rs.filter(r=>r.winner===null).length);
 }
 const hashes=JSON.parse(readFileSync(`${dir}/source-hashes.json`));
 for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(readFileSync(`${dir}/source/${file}`)).digest('hex'),hash);
}
console.log('468 isolated diagnostic games: complete paired scenarios, consistent outcomes/totals, distinct variants and intact frozen source hashes passed.');
