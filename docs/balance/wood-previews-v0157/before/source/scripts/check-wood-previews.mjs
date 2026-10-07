// Actual fixed-preview NPC games. Observers stay outside combat state and
// forecasts: no rule, policy, AP, resource or random-input substitutions.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
const board=b=>({distance:b.distance,player:{hp:b.player.hp,ap:b.player.ap,qi:{...b.player.qi},parasite:b.player.parasite},enemy:{hp:b.enemy.hp,ap:b.enemy.ap,qi:{...b.enemy.qi},growth:b.enemy.growth,growthPending:b.enemy.growthPending,usedSkills:[...b.enemy.usedSkills]},queue:[...b.enemyQueue]});
if(!isMainThread){
 const root=pathToFileURL(workerData.root+'/'),{ChallengeBattle}=await import(new URL('dist/challenge-battle.mjs',root)),{chooseAction,chooseReaction}=await import(new URL('dist/auto.mjs',root)),{payment}=await import(new URL('dist/engine.mjs',root));
 for(const job of workerData.jobs){
  const started=performance.now(),b=new ChallengeBattle(job.player.key,job.player.config,job.opponentId,{distance:job.distance,difficulty:job.difficulty,limit:job.limit}),rounds=[];let ticket=null,stepContext=null;
  function open(){if(ticket?.round===b.round)return;ticket={round:b.round,plan:[...b.enemyPlan],opening:board(b),playerActions:[],incomingQiSpent:Object.fromEntries(Object.keys(b.enemy.qi).map(k=>[k,0])),attempts:[]};rounds.push(ticket);}
  const act=b.act,enemyStep=b.enemyStep;
  Object.defineProperties(b,{
   act:{value:function(a,id){
    const before=board(this),isEnemy=a===this.enemy;let type=null;
    if(stepContext&&isEnemy){const remaining=stepContext.remaining,queue=this.enemyQueue;type=remaining[0]===id&&JSON.stringify(queue)===JSON.stringify(remaining.slice(1))?'announced':JSON.stringify(queue)===JSON.stringify(remaining)&&remaining.length?'repair':'fallback';stepContext.remaining=[...queue];}
    const r=act.call(this,a,id),after=board(this);
    if(isEnemy&&stepContext){const restored=Object.fromEntries(Object.entries(before.enemy.qi).map(([k,v])=>[k,v+ticket.incomingQiSpent[k]]));ticket.attempts.push({id,type,ok:r.ok,error:r.error??null,before,after,canPayWithIncomingQiRestored:r.error==='所需灵气不足'&&Boolean(payment(restored,this.skill(a,id).cost))});}
    else if(!isEnemy&&ticket){ticket.playerActions.push({id,ok:r.ok,before,after});for(const k of Object.keys(ticket.incomingQiSpent))ticket.incomingQiSpent[k]+=Math.max(0,before.enemy.qi[k]-after.enemy.qi[k]);}
    return r;
   },configurable:true},
   enemyStep:{value:function(){stepContext={remaining:[...this.enemyQueue]};try{return enemyStep.call(this);}finally{stepContext=null;}},configurable:true},
  });
  for(let steps=0;!b.result;steps++){assert.ok(steps<700);if(b.phase==='player'){open();const c=chooseAction(b,job.tendency);const r=c.action==='end'?b.endTurn():b.act(b.player,c.skillId);assert.ok(r.ok);if(c.action==='end')ticket.enemyStart=board(b);}else if(b.phase==='reaction')assert.ok(b.react(chooseReaction(b,job.tendency).response).ok);else b.enemyStep();}
  parentPort.postMessage({...job,result:b.result,rounds:b.round,hp:[b.player.hp,b.enemy.hp],review:b.review(),logs:b.logs,previewRounds:rounds,ms:performance.now()-started});
 }
}else{
 const [sourceArg,out]=process.argv.slice(2);assert.ok(sourceArg&&out);const root=resolve(sourceArg),builds=JSON.parse(await readFile(new URL('../docs/balance/cleanse-v0153/final/summary.json',import.meta.url))).builds;
 const representatives=['fire/ignite','sword/heavy','flame/fierce','water/cold','wood/parasitic','earth/mountain'],jobs=[];
 for(const opponentId of ['symbiosis','parasitic'])for(const player of builds)for(const distance of [0,1,2])for(const tendency of representatives.includes(player.id)?['balanced','aggressive','defensive']:['balanced'])jobs.push({index:jobs.length,opponentId,player,distance,tendency,difficulty:'questioning',first:'player',limit:30});
 for(const opponentId of ['symbiosis','parasitic'])for(const id of representatives)for(const distance of [0,1,2])jobs.push({index:jobs.length,opponentId,player:builds.find(b=>b.id===id),distance,tendency:'balanced',difficulty:'practice',first:'player',limit:30});
 assert.equal(jobs.length,180);await mkdir(out,{recursive:true});await writeFile(`${out}/plan.json`,JSON.stringify({scope:'Actual fixed-preview wood NPCs. Twelve tactical player builds at balanced, six explicit representative builds also aggressive/defensive; all three ranges, player first, 30 rounds. 144 questioning +36 balanced practice controls. Finite deterministic scenarios, not human win rates or full 12x12 PvP.',representatives,jobs},null,2),{flag:'wx'});
 const files=(await readdir(root+'/dist')).filter(f=>f.endsWith('.mjs')).map(f=>'dist/'+f),hashes={};
 for(const file of files){const data=await readFile(root+'/'+file);hashes[file]=createHash('sha256').update(data).digest('hex');await mkdir(`${out}/source/dist`,{recursive:true});await writeFile(`${out}/source/${file}`,data);}
 for(const file of ['scripts/check-wood-previews.mjs','docs/balance/cleanse-v0153/final/summary.json']){const data=await readFile(new URL('../'+file,import.meta.url));hashes[file]=createHash('sha256').update(data).digest('hex');await mkdir(`${out}/source/${file.slice(0,file.lastIndexOf('/'))}`,{recursive:true});await writeFile(`${out}/source/${file}`,data);}
 await writeFile(`${out}/source-hashes.json`,JSON.stringify(hashes,null,2));const records=[];let checkpoint=Promise.resolve();
 await Promise.all([0,1].map(part=>new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:{root,jobs:jobs.filter(j=>j.index%2===part)}});w.on('error',reject);w.on('exit',code=>code?reject(Error('worker '+code)):resolve());w.on('message',r=>{records.push(r);checkpoint=checkpoint.then(()=>writeFile(`${out}/checkpoint.json.gz`,gzipSync(JSON.stringify(records))));if(records.length%12===0)console.log(`${records.length}/180`);});})));await checkpoint;records.sort((a,b)=>a.index-b.index);assert.equal(records.length,180);await writeFile(`${out}/records.json.gz`,gzipSync(JSON.stringify(records)));console.log('Completed',records.length);
}
