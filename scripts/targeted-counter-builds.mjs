// Two explicit one-slot alternatives for locks not escaped by the core preset.
// The original matrix and the winning opponent's configuration remain intact.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
const [mode,primaryArg,coreArg,target]=process.argv.slice(2);
assert.ok(['plan','report'].includes(mode)&&target,'Usage: targeted-counter-builds.mjs plan|report PRIMARY CORE_REVIEW TARGET');
const primary=resolve(primaryArg),core=resolve(coreArg);
const checked=spawnSync(process.execPath,[new URL('./counter-builds.mjs',import.meta.url).pathname,'report',primary,core],{encoding:'utf8'});
assert.equal(checked.status,0,checked.stderr);
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const s=await json(`${primary}/summary.json`),hashes=await json(`${primary}/source-hashes.json`);
const previous=await json(`${core}/counter-report.json`);
const {normalizeLoadout,Battle}=await import(pathToFileURL(`${primary}/source/dist/engine.mjs`));
const swaps={
 'fire/ignite':[['inferno','sproutguard'],['seedburst','ember']],
 'fire/sustain':[['nourish','ember'],['blaze','vine']],
 'sword/quick':[['unity','return'],['lunge','expose']],
 'sword/heavy':[['unity','guard'],['cleave','pierce']],
 'flame/fierce':[['firestorm','firewall'],['firestorm','stoke']],
 'flame/smolder':[['firestorm','firewall'],['firestorm','stoke']],
 'water/cold':[['repulse','waterwall'],['mirrorwater','waterwall']],
 'water/tidal':[['waterwall','mirrorwater'],['tidespear','mirrorwater']],
 'wood/symbiosis':[['graft','bloomguard'],['thornscreen','prune']],
 'wood/parasitic':[['twinvine','thornscreen'],['twinvine','leafmend']],
 'earth/bastion':[['gravel','earthenwall'],['quakesunder','earthmend']],
 'earth/mountain':[['gravel','stoneback'],['mountain','faultline']],
};
const cases=[],jobs=[];
for(const c of previous.results.filter(c=>!c.escapedLock))for(const [removed,added] of swaps[c.loserId]){
 const a=structuredClone(s.builds.find(x=>x.id===c.a)),b=structuredClone(s.builds.find(x=>x.id===c.b));
 const loser=c.loserSeat===0?a:b,original=structuredClone(loser.config);
 assert.ok(original.skillIds.includes(removed)&&!original.skillIds.includes(added));
 loser.config=normalizeLoadout(loser.key,{major:original.major,skillIds:original.skillIds.map(id=>id===removed?added:id)});
 assert.equal(loser.config.major,original.major);assert.equal(loser.config.skillIds.length,6);
 assert.deepEqual(loser.config.skillIds,original.skillIds.map(id=>id===removed?added:id));
 const index=cases.length;
 cases.push({index,originalCase:c.index,loserId:c.loserId,loserSeat:c.loserSeat,removed,added,originalConfig:original,alternateConfig:loser.config});
 for(const distance of [0,1,2])for(const first of [0,1])jobs.push({tag:`targeted-${index}`,a,b,distance,first,controller:c.controller,tendency:'balanced',limit:30});
}
const expected={label:'Two one-slot counters per unresolved original controller lock; fixed original opponents',primary,primaryHashes:hashes,core,cases,jobs};
if(mode==='plan'){
 await writeFile(target,JSON.stringify(expected,null,2)+'\n');
 console.log(JSON.stringify({variants:cases.length,games:jobs.length}));
}else{
 const portable=({primary,core,...rest})=>rest;
 assert.deepEqual(portable(await json(`${target}/plan.json`)),portable(expected));
 const rh=await json(`${target}/source-hashes.json`);
 assert.ok([10,12].includes(Object.keys(rh).length));
 for(const [file,hash] of Object.entries(rh)){
  assert.equal(createHash('sha256').update(await readFile(`${target}/source/${file}`)).digest('hex'),hash);
  if(file!=='scripts/review-tactics.mjs')assert.equal(hash,hashes[file]);
 }
 const records=JSON.parse(gunzipSync(await readFile(`${target}/records.json.gz`)));
 assert.equal(records.length,jobs.length);const seen=new Set();
 for(const r of records){
  assert.ok(Number.isInteger(r.index)&&r.index>=0&&r.index<jobs.length&&!seen.has(r.index));seen.add(r.index);
  for(const [k,v] of Object.entries(jobs[r.index]))assert.deepEqual(r[k],v);
  assert.ok(!['skillOverrides','ruleOverrides','majorHpOverrides','statOverrides','genOverrides','prefs','controllers'].some(k=>Object.hasOwn(r,k)));
  assert.ok([0,1,null].includes(r.winner)&&Number.isInteger(r.rounds)&&r.rounds>=1&&r.rounds<=30);
  for(const seat of [0,1]){const actor=seat===0?r.a:r.b;assert.ok(Number.isInteger(r.hp[seat])&&r.hp[seat]>=0&&r.hp[seat]<=new Battle(actor.key,actor.config).player.maxHp);}
  if(r.winner===null)assert.ok(r.hp.every(h=>h>0));else{assert.equal(r.hp[1-r.winner],0);assert.ok(r.hp[r.winner]>0);}
 }
 const results=cases.map(c=>{const own=records.filter(r=>r.tag===`targeted-${c.index}`);assert.equal(own.length,6);return {...c,wins:own.filter(r=>r.winner===c.loserSeat).length,unresolved:own.filter(r=>r.winner===null).length,scenarios:own.map(r=>({index:r.index,distance:r.distance,first:r.first,winner:r.winner,hp:r.hp,rounds:r.rounds}))};});
 const escaped=new Set(results.filter(c=>c.wins>0).map(c=>c.originalCase));
 const result={games:records.length,variants:cases.length,additionalEscapedLocks:escaped.size,totalEscapedLocks:previous.escapedLocks+escaped.size,originalLocks:previous.locks,remainingLocks:previous.results.filter(c=>!c.escapedLock&&!escaped.has(c.index)).map(c=>({index:c.index,loser:c.loserId,opponent:c.loserSeat===0?c.b:c.a,controller:c.controller})),unresolved:records.filter(r=>r.winner===null).length,results};
 await writeFile(`${target}/targeted-report.json`,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({...result,results:undefined}));
}
