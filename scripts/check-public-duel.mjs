// Actual page engine: left player AI, right fixed public queue plus fallback.
// Swapping classes does not swap the fixed player-first rule.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {DuelBattle} from '../dist/duel-setup.mjs';
import {chooseAction,chooseReaction} from '../dist/auto.mjs';
const out=process.argv[2];assert.ok(out,'Pass a new output directory');
const base='docs/balance/cleanse-v0153/final';
const source=JSON.parse(await readFile(new URL('../'+base+'/summary.json',import.meta.url))),builds=Object.fromEntries(source.builds.map(b=>[b.id,b]));
const jobs=[];for(const wood of ['wood/symbiosis','wood/parasitic'])for(const reverse of [false,true])for(const distance of [0,1,2]){
 const [a,b]=reverse?[builds[wood],builds['flame/fierce']]:[builds['flame/fierce'],builds[wood]];jobs.push({a,b,distance,tendency:'balanced',fixedPlayerFirst:true,limit:30});
}
await mkdir(out,{recursive:true});await writeFile(`${out}/plan.json`,JSON.stringify({scope:'Actual DuelBattle, player first with enemy opening shield. Role swaps, NOT exchanged initiative in a symmetric arena. Twelve fixed diagnostic cases, not full matrix or human win rates.',jobs},null,2),{flag:'wx'});
const files=['dist/engine.mjs','dist/rules.mjs','dist/auto.mjs','dist/active-policy.mjs','dist/prepared.mjs','dist/tactics.mjs','dist/recorded-battle.mjs','dist/duel-setup.mjs','dist/builds.mjs','scripts/check-public-duel.mjs'];
const hashes={};for(const file of files){const data=await readFile(new URL('../'+file,import.meta.url));hashes[file]=createHash('sha256').update(data).digest('hex');await mkdir(`${out}/source/${file.split('/')[0]}`,{recursive:true});await writeFile(`${out}/source/${file}`,data);}
await writeFile(`${out}/source-hashes.json`,JSON.stringify(hashes,null,2));const records=[];
for(const [index,job]of jobs.entries()){
 const {a,b,distance,tendency}=job,battle=new DuelBattle(a.key,a.config,{key:b.key,...b.config});battle.distance=distance;battle.planEnemy();
 for(let steps=0;!battle.result;steps++){
  assert.ok(steps<512,'Battle exceeded bounded actual phases');
  if(battle.phase==='player'){const c=chooseAction(battle,tendency);assert.ok(c);assert.ok((c.action==='end'?battle.endTurn():battle.act(battle.player,c.skillId)).ok);}
  else if(battle.phase==='reaction')assert.ok(battle.react(chooseReaction(battle,tendency).response).ok);
  else {assert.equal(battle.phase,'enemy');battle.enemyStep();}
 }
 records.push({index,...job,result:battle.result,rounds:battle.round,hp:[battle.player.hp,battle.enemy.hp],review:battle.review(),logs:battle.logs});
 await writeFile(`${out}/checkpoint.json.gz`,gzipSync(JSON.stringify(records)));console.log(`${index+1}/${jobs.length}: ${a.id} / ${b.id}, ${distance}, ${battle.result}`);
}
await writeFile(`${out}/records.json.gz`,gzipSync(JSON.stringify(records)));
const groups={};for(const r of records){const id=`${r.a.id} vs ${r.b.id}`,g=groups[id]??={player:r.a.id,enemy:r.b.id,games:0,wins:0,losses:0,unresolved:0};g.games++;g[r.result==='win'?'wins':r.result==='lose'?'losses':'unresolved']++;}
await writeFile(`${out}/summary.json`,JSON.stringify({games:records.length,scope:'Player AI versus actual public queue; fixed player first, three ranges per role, 30-round limit. No symmetric per-pair six-game denominator.',groups},null,2));console.log(groups);
