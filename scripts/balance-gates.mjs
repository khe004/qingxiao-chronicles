// Independent acceptance accounting from full records, including every loss.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {TACTICAL_LOADOUTS as originalLoadouts} from '../docs/balance/goal-v0160/base/source/dist/tactics.mjs';
const root=process.argv[2];assert.ok(root);
const summary=JSON.parse(await readFile(`${root}/summary.json`,'utf8'));
const records=JSON.parse(gunzipSync(await readFile(`${root}/records.json.gz`)));
const builds=summary.builds,controllers=summary.limits.controllers;
assert.equal(builds.length,12);assert.deepEqual(controllers,['immediate','prepared']);
assert.equal(summary.limits.tendency,'balanced');
assert.equal(summary.limits.rounds,30);
assert.equal(summary.limits.loadout,'tactical sample six skills');
assert.equal(new Set(builds.map(b=>b.id)).size,12);
const hashes=JSON.parse(await readFile(`${root}/source-hashes.json`,'utf8'));
for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(`${root}/source/${file}`)).digest('hex'),hash,`Frozen source changed: ${file}`);
assert.deepEqual((await import(pathToFileURL(resolve(root,'source/dist/rules.mjs')))).RULES,summary.rules);
const {Battle,MAJORS,normalizeLoadout}=await import(pathToFileURL(resolve(root,'source/dist/engine.mjs')));
const expectedBuilds=Object.keys(originalLoadouts).flatMap(key=>Object.keys(originalLoadouts[key]).map(major=>({
 id:`${key}/${major}`,key,name:MAJORS[key][major].name,
 config:normalizeLoadout(key,{major,skillIds:originalLoadouts[key][major]}),
})));
assert.deepEqual(builds,expectedBuilds,'Frozen acceptance requires the original twelve tactical loadouts');
const maxHp=builds.map(b=>new Battle(b.key,b.config).player.maxHp);
const full=JSON.stringify(summary.limits.distances)==='[0,1,2]';
assert.equal(records.length,78*summary.limits.gamesPerPairPerController*2);
assert.equal(summary.limits.gamesPerPairPerController,summary.limits.distances.length*2);
const scenarios=new Set();
for(const r of records){
 const i=builds.findIndex(b=>b.id===r.a.id),j=builds.findIndex(b=>b.id===r.b.id);
 assert.ok(i>=0&&j>=i,'Unknown or reversed matrix pair');
 assert.deepEqual(r.a,builds[i]);assert.deepEqual(r.b,builds[j]);
 assert.equal(r.kind,i===j?'mirror':'cross');assert.equal(r.tendency,'balanced');
 assert.ok(controllers.includes(r.controller)&&summary.limits.distances.includes(r.distance));
 assert.ok([0,1].includes(r.first)&&[0,1,null].includes(r.winner));
 assert.ok(Number.isInteger(r.rounds)&&r.rounds>=1&&r.rounds<=30);
 assert.equal(r.hp.length,2);assert.ok(r.hp.every((h,seat)=>Number.isInteger(h)&&h>=0&&h<=maxHp[seat===0?i:j]),'HP outside the executed starting/max HP');
 if(r.winner===null)assert.ok(r.hp.every(h=>h>0));else {assert.equal(r.hp[1-r.winner],0);assert.ok(r.hp[r.winner]>0,'Winner must survive');}
 const key=JSON.stringify([i,j,r.controller,r.distance,r.first]);
 assert.ok(!scenarios.has(key),'Duplicate scenario');scenarios.add(key);
}
for(let i=0;i<12;i++)for(let j=i;j<12;j++)for(const c of controllers)for(const d of summary.limits.distances)for(const f of [0,1])assert.ok(scenarios.has(JSON.stringify([i,j,c,d,f])),'Missing scenario');
const cross=records.filter(r=>r.kind==='cross');
const rate=(n,d)=>Number((100*n/d).toFixed(2));
const inBand=r=>r.wins/r.games>=.4&&r.wins/r.games<=.6;
function ranking(list){return builds.map(b=>{
 const own=list.filter(r=>r.a.id===b.id||r.b.id===b.id);
 const wins=own.filter(r=>r.winner!==null&&(r.winner===0?r.a:r.b).id===b.id).length;
 const draws=own.filter(r=>r.winner===null).length;
 return {id:b.id,name:b.name,games:own.length,wins,draws,losses:own.length-wins-draws,winRate:rate(wins,own.length)};
});}
const primary=ranking(cross.filter(r=>r.controller==='prepared')),combined=ranking(cross);
for(const c of controllers){
 const list=records.filter(r=>r.controller===c),g=summary.controllers[c];
 assert.equal(g.games,list.length);assert.equal(g.crossGames,list.filter(r=>r.kind==='cross').length);
 assert.equal(g.mirrorGames,list.filter(r=>r.kind==='mirror').length);assert.equal(g.draws,list.filter(r=>r.winner===null).length);
 for(let i=0;i<12;i++)for(let j=0;j<12;j++){
  const own=list.filter(r=>r.kind==='cross'&&r.a.id===builds[Math.min(i,j)].id&&r.b.id===builds[Math.max(i,j)].id);
  const wins=own.filter(r=>r.winner===(i<j?0:1)).length,draws=own.filter(r=>r.winner===null).length;
  assert.deepEqual(g.matrix[i][j],{games:own.length,wins,losses:own.length-wins-draws,draws},`Summary matrix differs from raw records: ${c}/${i}/${j}`);
 }
 for(const r of ranking(list.filter(r=>r.kind==='cross'))){const stored=g.ranking.find(s=>s.id===r.id);for(const field of ['games','wins','losses','draws'])assert.equal(stored[field],r[field]);}
 for(const m of g.mirrors){
  const own=list.filter(r=>r.kind==='mirror'&&r.a.id===m.id);
  for(const d of [m,...(m.byDistance??[])]){
   const subset=d.distance===undefined?own:own.filter(r=>r.distance===d.distance);
   assert.equal(d.games,subset.length);assert.equal(d.firstWins,subset.filter(r=>r.winner===r.first).length);
   assert.equal(d.secondWins,subset.filter(r=>r.winner!==null&&r.winner!==r.first).length);assert.equal(d.draws,subset.filter(r=>r.winner===null).length);
  }
 }
}
const locks=[],singleControllerLocks=[];
for(let i=0;i<12;i++)for(let j=i+1;j<12;j++){
 const pair=cross.filter(r=>r.a.id===builds[i].id&&r.b.id===builds[j].id);
 const count=list=>[0,1].map(seat=>list.filter(r=>r.winner===seat).length);
 const wins=count(pair);
 if(wins.includes(0))locks.push({a:builds[i].id,b:builds[j].id,games:pair.length,wins});
 for(const c of controllers){const list=pair.filter(r=>r.controller===c),wins=count(list);if(wins.includes(0))singleControllerLocks.push({a:builds[i].id,b:builds[j].id,controller:c,games:list.length,wins});}
}
const initiative=controllers.map(controller=>{
 const list=cross.filter(r=>r.controller===controller),wins=list.filter(r=>r.winner===r.first).length;
 return {controller,games:list.length,firstWins:wins,draws:list.filter(r=>r.winner===null).length,firstRate:rate(wins,list.length)};
});
const primaryRecords=records.filter(r=>r.controller==='prepared'),draws=primaryRecords.filter(r=>r.winner===null).length;
const gates={fullMatrix:full,primaryRanking:primary.every(inBand),combinedRanking:combined.every(inBand),noCombinedLock:locks.length===0,
 initiative:initiative.every(r=>r.firstWins/r.games>=.4&&r.firstWins/r.games<=.6),primaryDraws:draws/primaryRecords.length<.02};
const result={scope:full?'complete balanced matrix':'distance screen; never final acceptance',games:records.length,gates,passed:full&&Object.values(gates).every(Boolean),primary,combined,initiative,
 primaryDraws:{games:primaryRecords.length,draws,rate:rate(draws,primaryRecords.length)},locks,singleControllerLocks};
await writeFile(`${root}/gates.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
if(process.argv.includes('--require-pass'))assert.ok(result.passed,'Frozen numerical acceptance gates failed; inspect gates.json');
