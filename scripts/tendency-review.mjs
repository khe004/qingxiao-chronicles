// Descriptive secondary checks: report controller-specific extremes and stalls
// against the original rules, without changing the frozen balanced thresholds.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const [primaryRoot,candidateRoot,baselineRoot,destination]=process.argv.slice(2);
assert.ok(destination,'Usage: tendency-review.mjs PRIMARY SECONDARY ORIGINAL_BASELINE REPORT.json');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const combat=['dist/rules.mjs','dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs',
 'dist/tactics.mjs','dist/active-policy.mjs','dist/recorded-battle.mjs',
 'scripts/predictive-arena.mjs','scripts/planner-internals.mjs'];
const primary=await json(`${primaryRoot}/summary.json`),mainHashes=await json(`${primaryRoot}/source-hashes.json`);
async function readMatrix(root,isCandidate){
 const s=await json(`${root}/summary.json`),hashes=await json(`${root}/source-hashes.json`);
 for(const [file,hash] of Object.entries(hashes))assert.equal(
  createHash('sha256').update(await readFile(`${root}/source/${file}`)).digest('hex'),hash,`Source changed: ${file}`);
 if(isCandidate){for(const file of combat)assert.equal(hashes[file],mainHashes[file]);assert.deepEqual(s.rules,primary.rules);}
 assert.equal(s.partial,undefined);assert.deepEqual(s.builds,primary.builds);
 assert.deepEqual(s.limits.controllers,['prepared']);assert.deepEqual(s.limits.distances,[0,1,2]);
 assert.equal(s.limits.rounds,30);assert.equal(s.limits.loadout,'tactical sample six skills');
 assert.ok(['aggressive','defensive'].includes(s.limits.tendency));
 const {Battle,CLASSES,RULES}=await import(pathToFileURL(resolve(root,'source/dist/engine.mjs')));
 assert.deepEqual(RULES,s.rules);
 const records=JSON.parse(gunzipSync(await readFile(`${root}/records.json.gz`)));
 const jobs=[];
 for(let i=0;i<12;i++)for(let j=i;j<12;j++)for(const distance of [0,1,2])for(const first of [0,1])
  jobs.push({a:s.builds[i],b:s.builds[j],distance,first,controller:'prepared',tendency:s.limits.tendency,kind:i===j?'mirror':'cross'});
 assert.equal(records.length,468);const seen=new Set();
 for(const r of records){
  assert.ok(Number.isInteger(r.index)&&r.index>=0&&r.index<468&&!seen.has(r.index));seen.add(r.index);
  for(const [field,value] of Object.entries(jobs[r.index]))assert.deepEqual(r[field],value);
  assert.ok([0,1,null].includes(r.winner));assert.ok(Number.isInteger(r.rounds)&&r.rounds>=1&&r.rounds<=30);
  assert.equal(r.hp.length,2);
  for(const seat of [0,1]){const b=seat===0?r.a:r.b;assert.ok(Number.isInteger(r.hp[seat])&&r.hp[seat]>=0&&r.hp[seat]<=new Battle(b.key,b.config).player.maxHp);}
  if(r.winner===null){assert.equal(r.rounds,30);assert.ok(r.hp.every(h=>h>0));}else{assert.ok(r.hp[r.winner]>0);assert.equal(r.hp[1-r.winner],0);}
 }
 const cross=records.filter(r=>r.kind==='cross');
 const rows=s.builds.map(b=>{
  const own=cross.filter(r=>r.a.id===b.id||r.b.id===b.id),actions={};
  const seat=r=>r.a.id===b.id?0:1;
  let unusedAP=0;for(const r of own){const m=r.metrics[seat(r)];unusedAP+=m.unusedAP;
   for(const [id,count] of Object.entries(m.actions))actions[id]=(actions[id]??0)+count;}
  const wins=own.filter(r=>r.winner===seat(r)).length,unresolved=own.filter(r=>r.winner===null).length;
  const opponents=s.builds.filter(o=>o.id!==b.id).map(o=>{
   const pair=own.filter(r=>r.a.id===o.id||r.b.id===o.id),wins=pair.filter(r=>r.winner===seat(r)).length;
   const draws=pair.filter(r=>r.winner===null).length;
   return {id:o.id,wins,losses:6-wins-draws,unresolved:draws};
  });
  const restorativeActions=Object.fromEntries(Object.entries(actions).filter(([id])=>{
   const skill=CLASSES[b.key].skills.find(s=>s.id===id);
   return skill?.heal||skill?.shield||['purify','meditate'].includes(id);
  }));
  return {id:b.id,name:b.name,games:own.length,wins,losses:66-wins-unresolved,unresolved,
   winRate:Number((100*wins/66).toFixed(2)),beatsEveryOpponent:opponents.every(p=>p.wins>p.losses),
   majorityOpponents:opponents.filter(p=>p.wins>p.losses).length,opponents,actions,restorativeActions,unusedAP};
 });
 const roundList=records.map(r=>r.rounds).sort((a,b)=>a-b);
 return {tendency:s.limits.tendency,games:468,unresolved:records.filter(r=>r.winner===null).length,
  rounds:{median:roundList[234],maximum:roundList.at(-1),atLeast20:roundList.filter(n=>n>=20).length},
  highestRate:Math.max(...rows.map(r=>r.winRate)),beatsEveryOpponent:rows.filter(r=>r.beatsEveryOpponent).map(r=>r.id),rows,
  timeouts:records.filter(r=>r.winner===null).map(r=>({index:r.index,a:r.a.id,b:r.b.id,distance:r.distance,first:r.first,hp:r.hp,
   metrics:r.metrics,lastEvents:r.trace.slice(-20)}))};
}
const candidate=await readMatrix(candidateRoot,true),baseline=await readMatrix(baselineRoot,false);
assert.equal(candidate.tendency,baseline.tendency);
const result={scope:'Same twelve original tactical presets, prepared controller, three ranges and swapped initiative; no results merged into balanced acceptance',
 tendency:candidate.tendency,candidate,baseline,comparison:{highestRateDelta:Number((candidate.highestRate-baseline.highestRate).toFixed(2)),
  unresolvedDelta:candidate.unresolved-baseline.unresolved,
  newBeatsEveryOpponent:candidate.beatsEveryOpponent.filter(id=>!baseline.beatsEveryOpponent.includes(id))}};
await writeFile(destination,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({tendency:result.tendency,candidate:{highestRate:candidate.highestRate,unresolved:candidate.unresolved,beatsEveryOpponent:candidate.beatsEveryOpponent},
 baseline:{highestRate:baseline.highestRate,unresolved:baseline.unresolved,beatsEveryOpponent:baseline.beatsEveryOpponent},comparison:result.comparison}));
