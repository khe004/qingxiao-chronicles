import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
if(!isMainThread){
 const root=pathToFileURL(workerData.root+'/');
 const {ChallengeBattle}=await import(new URL('dist/challenge-battle.mjs',root)),{chooseAction,chooseReaction}=await import(new URL('dist/auto.mjs',root));
 for(const job of workerData.jobs){const started=performance.now(),b=new ChallengeBattle(job.player.key,job.player.config,job.opponentId,{difficulty:job.difficulty,distance:job.distance});
  for(let steps=0;!b.result;steps++){assert.ok(steps<700);if(b.phase==='player'){const c=chooseAction(b,'balanced');assert.ok((c.action==='end'?b.endTurn():b.act(b.player,c.skillId)).ok);}else if(b.phase==='reaction')assert.ok(b.react(chooseReaction(b,'balanced').response).ok);else b.enemyStep();}
  parentPort.postMessage({...job,result:b.result,rounds:b.round,hp:[b.player.hp,b.enemy.hp],review:b.review(),logs:b.logs,ms:performance.now()-started});
 }
}else{
 const [sourceArg,out]=process.argv.slice(2);assert.ok(sourceArg&&out);const root=resolve(sourceArg),url=pathToFileURL(root+'/'),builds=JSON.parse(await readFile(new URL('../docs/balance/cleanse-v0153/final/summary.json',import.meta.url))).builds;
 const {OPPONENTS}=await import(new URL('dist/opponents.mjs',url));const alternatives=['fire/ignite','sword/heavy','water/cold','wood/parasitic','earth/mountain','flame/smolder'],jobs=[];
 for(const [i,opponentId]of Object.keys(OPPONENTS).entries())for(const playerId of ['flame/fierce',alternatives[i%alternatives.length]])for(const distance of [0,1,2])for(const difficulty of ['practice','questioning'])jobs.push({index:jobs.length,player:builds.find(b=>b.id===playerId),opponentId,distance,difficulty,first:'player',tendency:'balanced',limit:30});
 assert.equal(jobs.length,132);await mkdir(out,{recursive:true});await writeFile(`${out}/plan.json`,JSON.stringify({scope:'All eleven NPCs, each against fierce plus one specified rotating six-class tactical build; three ranges, both tiers, balanced page player, fixed player first, 30 rounds. Not full PvP or all-player NPC matrix.',jobs},null,2),{flag:'wx'});
 const {readdir}=await import('node:fs/promises');const hashes={};for(const name of await readdir(root+'/dist'))if(name.endsWith('.mjs')){const file='dist/'+name,data=await readFile(root+'/'+file);hashes[file]=createHash('sha256').update(data).digest('hex');await mkdir(`${out}/source/dist`,{recursive:true});await writeFile(`${out}/source/${file}`,data);}await writeFile(`${out}/source-hashes.json`,JSON.stringify(hashes,null,2));
 const records=[];let checkpoint=Promise.resolve();await Promise.all([0,1].map(part=>new Promise((resolve,reject)=>{const worker=new Worker(new URL(import.meta.url),{workerData:{root,jobs:jobs.filter(j=>j.index%2===part)}});worker.on('error',reject);worker.on('exit',code=>code?reject(Error('worker '+code)):resolve());worker.on('message',r=>{records.push(r);checkpoint=checkpoint.then(()=>writeFile(`${out}/checkpoint.json.gz`,gzipSync(JSON.stringify(records))));if(records.length%12===0)console.log(`${records.length}/${jobs.length}`);});})));await checkpoint;records.sort((a,b)=>a.index-b.index);assert.equal(records.length,jobs.length);await writeFile(`${out}/records.json.gz`,gzipSync(JSON.stringify(records)));console.log('Completed',records.length);
}
