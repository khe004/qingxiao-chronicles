// Keep the acceptance matrix intact; review its losing side with an alternate
// legal six-skill preset, using the same opponent, controller and six starts.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';

const [mode,primaryPath,target]=process.argv.slice(2);
assert.ok(['plan','report'].includes(mode)&&primaryPath&&target,
 'Usage: counter-builds.mjs plan PRIMARY PLAN.json | report PRIMARY REVIEW_DIR');
const primary=resolve(primaryPath);
const check=spawnSync(process.execPath,[new URL('./balance-gates.mjs',import.meta.url).pathname,primary,'--require-pass'],{encoding:'utf8'});
assert.equal(check.status,0,check.stderr||'Primary acceptance has not passed');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const summary=await json(`${primary}/summary.json`),gates=await json(`${primary}/gates.json`);
const hashes=await json(`${primary}/source-hashes.json`);
const {normalizeLoadout,Battle}=await import(pathToFileURL(`${primary}/source/dist/engine.mjs`));
const locks=gates.singleControllerLocks;
const jobs=[];
const cases=locks.map((lock,index)=>{
 assert.equal(lock.games,6);assert.ok(lock.wins.includes(0));
 const loserSeat=lock.wins[0]===0?0:1;
 const a=structuredClone(summary.builds.find(b=>b.id===lock.a));
 const b=structuredClone(summary.builds.find(b=>b.id===lock.b));
 const loser=loserSeat===0?a:b;
 const originalConfig=structuredClone(loser.config);
 loser.config=normalizeLoadout(loser.key,{major:loser.config.major});
 assert.equal(loser.config.major,originalConfig.major);
 assert.equal(loser.config.skillIds.length,6);
 assert.notDeepEqual([...loser.config.skillIds].sort(),[...originalConfig.skillIds].sort(),
  'Alternate core preset must actually change skills');
 for(const distance of [0,1,2])for(const first of [0,1])jobs.push({
  tag:`counter-${index}`,a,b,distance,first,controller:lock.controller,
  tendency:'balanced',limit:30,
 });
 return {index,...lock,loserSeat,loserId:loser.id,originalConfig,alternateConfig:loser.config};
});
const expected={label:'Alternate core presets for every single-controller lock; original matrix unchanged',
 primary,primaryHashes:hashes,cases,jobs};
if(mode==='plan'){
 await writeFile(target,JSON.stringify(expected,null,2)+'\n');
 console.log(JSON.stringify({locks:cases.length,games:jobs.length,plan:target}));
}else{
 const plan=await json(`${target}/plan.json`);
 const portable=({primary,...rest})=>rest;
 assert.deepEqual(portable(plan),portable(expected),'Review plan changed or belongs to another primary matrix');
 const reviewHashes=await json(`${target}/source-hashes.json`);
 for(const [file,hash] of Object.entries(reviewHashes)){
  assert.equal(createHash('sha256').update(await readFile(`${target}/source/${file}`)).digest('hex'),hash);
  if(file!=='scripts/review-tactics.mjs')assert.equal(hash,hashes[file],`Combat rules differ: ${file}`);
 }
 assert.ok([10,12].includes(Object.keys(reviewHashes).length));
 const records=JSON.parse(gunzipSync(await readFile(`${target}/records.json.gz`)));
 assert.equal(records.length,jobs.length);
 const seen=new Set();
 for(const r of records){
  assert.ok(Number.isInteger(r.index)&&r.index>=0&&r.index<jobs.length&&!seen.has(r.index));seen.add(r.index);
  for(const [key,value] of Object.entries(jobs[r.index]))assert.deepEqual(r[key],value,`Scenario differs: ${r.index}/${key}`);
  assert.ok(!['ruleOverrides','majorHpOverrides','skillOverrides','statOverrides','genOverrides'].some(k=>Object.hasOwn(r,k)));
  assert.ok([0,1,null].includes(r.winner)&&Number.isInteger(r.rounds)&&r.rounds>=1&&r.rounds<=30);
  assert.equal(r.hp.length,2);
  for(const seat of [0,1]){const actor=seat===0?r.a:r.b;const hp=new Battle(actor.key,actor.config).player.maxHp;
   assert.ok(Number.isInteger(r.hp[seat])&&r.hp[seat]>=0&&r.hp[seat]<=hp);}
  if(r.winner===null)assert.ok(r.hp.every(h=>h>0));else{assert.equal(r.hp[1-r.winner],0);assert.ok(r.hp[r.winner]>0);}
 }
 const results=cases.map(c=>{
  const own=records.filter(r=>r.tag===`counter-${c.index}`);assert.equal(own.length,6);
  const wins=own.filter(r=>r.winner===c.loserSeat).length;
  const unresolved=own.filter(r=>r.winner===null).length;
  return {...c,alternateWins:wins,alternateLosses:6-wins-unresolved,unresolved,
   escapedLock:wins>0,scenarios:own.map(r=>({index:r.index,distance:r.distance,first:r.first,winner:r.winner,hp:r.hp,rounds:r.rounds}))};
 });
 const result={scope:expected.label,games:records.length,locks:results.length,
  escapedLocks:results.filter(c=>c.escapedLock).length,unresolved:records.filter(r=>r.winner===null).length,
  limits:{controller:'same as each original lock',tendency:'balanced',distances:[0,1,2],rounds:30},results};
 await writeFile(`${target}/counter-report.json`,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({games:result.games,locks:result.locks,escapedLocks:result.escapedLocks,unresolved:result.unresolved}));
}
