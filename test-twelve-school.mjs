import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {predictiveDuel} from './scripts/predictive-arena.mjs';
import {RULES,normalizeLoadout} from './dist/engine.mjs';
import {TACTICAL_LOADOUTS} from './dist/tactics.mjs';

const root=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??'docs/balance/pressure-v0152/final';
const read=name=>JSON.parse(readFileSync(`${root}/${name}`,'utf8'));
const s=read('summary.json'),hashes=read('source-hashes.json');
const records=JSON.parse(gunzipSync(readFileSync(`${root}/records.json.gz`)));
const controllers=s.limits.controllers,perPair=s.limits.distances.length*2;assert.equal(records.length,78*perPair*controllers.length);assert.equal(s.builds.length,12);assert.deepEqual(s.rules,RULES);
for(const [name,hash] of Object.entries(hashes)){
 const digest=data=>createHash('sha256').update(data).digest('hex');
 assert.equal(digest(readFileSync(name)),hash,`Measured source differs from shipped source: ${name}`);
 assert.equal(digest(readFileSync(`${root}/source/${name}`)),hash,`Frozen source is corrupt: ${name}`);
}
for(const b of s.builds)assert.deepEqual(b.config,normalizeLoadout(b.key,{major:b.config.major,...(s.limits.loadout==='tactical sample six skills'?{skillIds:TACTICAL_LOADOUTS[b.key][b.config.major]}:{})}));
for(const controller of controllers){
 const g=s.controllers[controller];assert.equal(g.games,78*perPair);assert.equal(g.crossGames,66*perPair);assert.equal(g.mirrorGames,12*perPair);
 for(let i=0;i<12;i++)for(let j=0;j<12;j++){
  const a=g.matrix[i][j],b=g.matrix[j][i];assert.equal(a.games,i===j?0:perPair);
  assert.equal(a.wins+a.losses+a.draws,a.games);assert.equal(a.wins,b.losses);assert.equal(a.draws,b.draws);
 }
 for(const m of g.mirrors){assert.equal(m.games,perPair);assert.equal(m.firstWins+m.secondWins+m.draws,perPair);}
}
for(const [index,r] of records.entries()){
 assert.equal(r.index,index);assert.ok(r.hp.every(Number.isInteger));
 if(r.winner===null)assert.ok(r.hp.every(hp=>hp>0));else assert.equal(r.hp[1-r.winner],0);
 assert.ok(r.rounds>=1&&r.rounds<=30);
}
// Stratify replays by every class, both controllers and all initial distances.
// Re-running identical deterministic seeds is not additional win-rate evidence.
let replayed=0;
const keys=['fire','sword','flame','water','wood','earth'];
const cases=process.argv.includes('--sample-replays')?keys.map((key,i)=>({key,controller:controllers[i%controllers.length],distance:s.limits.distances[i%s.limits.distances.length]})):controllers.flatMap(controller=>keys.flatMap(key=>s.limits.distances.map(distance=>({controller,key,distance}))));
for(const {controller,key,distance} of cases){
 const r=records.find(r=>r.controller===controller&&r.kind==='cross'&&r.a.key===key&&r.distance===distance&&r.first===distance%2);
 assert.ok(r);const actual=predictiveDuel(r.a,r.b,{first:r.first,distance:r.distance,limit:30,prefs:[r.tendency,r.tendency],controllers:[controller,controller],trace:true});
 for(const field of ['winner','rounds','hp','metrics','trace'])assert.deepEqual(actual[field],r[field],`Replay mismatch: ${controller}/${key}/${distance}/${field}`);
 replayed++;
}
console.log(`Full 12×12 matrices: ${records.length} complete records, measured controllers/ranges/initiative, symmetric cells, separate draws/mirrors, exact shipped/frozen source hashes and ${replayed} stratified full deterministic replays passed.`);
