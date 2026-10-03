// Paired public-plan behavior and bounded symmetric-policy checks. No human
// win-rate claims; historical outcomes are reused only with identical sources.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=resolve('docs/balance/prepared-ai'),replay=process.argv.includes('--replay');
const baseCommit='c5fddefef8e8a63bb8d3f09f7f162a05a415f595';
const files=['dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs','dist/duel-setup.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs'];
if(!replay){
 assert.ok(!existsSync(dir+'/summary.json'),'Existing samples must be replayed, not overwritten');
 for(const policy of ['before','after'])for(const file of files){
  const target=resolve(dir,'source',policy,file);mkdirSync(resolve(target,'..'),{recursive:true});
  writeFileSync(target,policy==='before'?execFileSync('git',['show',baseCommit+':'+file]):readFileSync(file));
 }
 const generator=dir+'/source/after/scripts/check-prepared-ai.mjs';writeFileSync(generator,readFileSync('scripts/check-prepared-ai.mjs'));
}
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const sourceHashes=Object.fromEntries(['before','after'].map(policy=>[policy,Object.fromEntries(files.map(file=>[file,hash(dir+'/source/'+policy+'/'+file)]))]));
sourceHashes.generator=hash(dir+'/source/after/scripts/check-prepared-ai.mjs');
if(replay)assert.deepEqual(sourceHashes,JSON.parse(readFileSync(dir+'/summary.json')).sourceHashes);
const modules={};
for(const policy of ['before','after']){
 const at=file=>import(pathToFileURL(dir+'/source/'+policy+'/'+file).href);
 modules[policy]={...await at('dist/duel-setup.mjs'),...await at('dist/auto.mjs'),...await at('dist/engine.mjs'),...await at('dist/prepared.mjs')};
}
assert.equal(sourceHashes.before['dist/engine.mjs'],sourceHashes.after['dist/engine.mjs'],'This comparison changes strategy, not battle values');
assert.equal(sourceHashes.before['dist/prepared.mjs'],sourceHashes.after['dist/prepared.mjs']);
const timings={before:[],after:[]},compute={rootStates:0,forecasts:0,continuationStates:0,rootTruncated:0};
const newcomers=[['wood','symbiosis'],['wood','parasitic'],['earth','bastion'],['earth','mountain']];
const opponents=[['fire','ignite'],['sword','quick'],['flame','fierce'],['water','cold'],['wood','symbiosis'],['earth','bastion']];
const cases=[];
for(const own of newcomers)for(const foe of opponents)for(const tendency of ['balanced','aggressive','defensive','burst'])cases.push({own,foe,tendency,distance:1,group:'middle'});
for(const own of newcomers)for(const foe of [['water','cold'],['earth','bastion']])for(const tendency of ['balanced','burst'])for(const distance of [0,2])cases.push({own,foe,tendency,distance,group:'range'});
assert.equal(cases.length,128);
function publicDuel(policy,c){
 const m=modules[policy],b=new m.DuelBattle(c.own[0],{major:c.own[1]},{key:c.foe[0],major:c.foe[1]});b.distance=c.distance;b.planEnemy();
 const actions={},responses={},trace=[];let steps=0;
 while(!b.result&&b.round<=30){
  assert.ok(++steps<350,'Public duel did not terminate');
  let event;
  if(b.phase==='player'){
   const start=performance.now(),stats={},choice=policy==='after'?m.choosePreparedAction(b,c.tendency,{stats}):m.chooseAction(b,c.tendency);
   timings[policy].push(performance.now()-start);
   if(policy==='after')for(const key of Object.keys(compute))compute[key]=key==='rootTruncated'?compute[key]+Number(stats[key]??false):Math.max(compute[key],stats[key]??0);
   if(choice.action==='end'){assert.ok(b.endTurn().ok);event='end';}
   else {assert.equal(b.legal(b.player,choice.skillId),null);assert.ok(b.act(b.player,choice.skillId).ok);actions[choice.skillId]=(actions[choice.skillId]??0)+1;event=choice.skillId;}
  }else if(b.phase==='reaction'){
   const choice=m.chooseReaction(b,c.tendency);assert.ok(b.react(choice.response).ok);responses[choice.response]=(responses[choice.response]??0)+1;event='reaction:'+choice.response;
  }else{
   assert.equal(b.phase,'enemy');
   // Stop at the last enemy phase's end, before round 31's regeneration/release.
   if(b.round===30&&!b.enemyQueue.length){b.expireEdge(b.enemy);b.clearChill(b.enemy,'行动结束');m.finishPreparedPhase(b,b.enemy);break;}
   b.enemyStep();event='enemy';
  }
  for(const a of [b.player,b.enemy]){assert.ok(a.ap>=0&&a.ap<=3);assert.ok(m.total(a.qi)<=10);assert.ok(a.hp>=0&&a.hp<=a.maxHp);assert.ok(Object.values(a.qi).every(n=>Number.isInteger(n)&&n>=0));}
  trace.push({event,round:b.round,phase:b.phase,distance:b.distance,player:structuredClone(b.player),enemy:structuredClone(b.enemy)});
 }
 return {...c,result:b.result??'limit',rounds:b.round,hp:[b.player.hp,b.enemy.hp],actions,responses,trace,logs:b.logs};
}
const publicRows=[];
for(const [i,c] of cases.entries()){
 publicRows.push({before:publicDuel('before',c),after:publicDuel('after',c)});
 if((i+1)%8===0)console.log(`Prepared AI public pairs ${i+1}/128`);
}
const oldSummary=JSON.parse(readFileSync('docs/balance/wood-earth-first/summary.json'));
for(const file of files.filter(f=>f!=='dist/duel-setup.mjs'))assert.equal(sourceHashes.before[file],oldSummary.sourceHashes[file]);
const oldRows=JSON.parse(gunzipSync(readFileSync('docs/balance/wood-earth-first/games.json.gz'))).filter(r=>['wood-earth','mirror'].includes(r.group));
assert.equal(oldRows.length,32);
const runtime=await import(pathToFileURL(dir+'/source/after/scripts/predictive-arena.mjs').href),symmetricRows=[];
for(const [i,before] of oldRows.entries()){
 const after=runtime.predictiveDuel({key:before.a[0],config:{major:before.a[1]}},{key:before.b[0],config:{major:before.b[1]}},{controllers:['prepared','prepared'],prefs:['balanced','balanced'],first:before.first,distance:before.distance,trace:true,limit:30});
 symmetricRows.push({a:before.a,b:before.b,first:before.first,distance:before.distance,group:before.group,before,after});
 if((i+1)%8===0)console.log(`Prepared AI symmetric pairs ${i+1}/32`);
}
const tally=rows=>({games:rows.length,wins:rows.filter(r=>r.result==='win').length,losses:rows.filter(r=>r.result==='lose').length,unresolved:rows.filter(r=>r.result==='limit').length});
function actionsByMajor(policy){const out={};for(const row of publicRows){const r=row[policy],label=r.own.join('/');out[label]??={};for(const [id,n] of Object.entries(r.actions))out[label][id]=(out[label][id]??0)+n;}return out;}
const symmetricTally=policy=>({games:32,seat0Wins:symmetricRows.filter(r=>r[policy].winner===0).length,seat1Wins:symmetricRows.filter(r=>r[policy].winner===1).length,unresolved:symmetricRows.filter(r=>r[policy].winner===null).length});
const releaseCounts=policy=>{
 const out={started:0,released:0,missed:0,interrupted:0,matured:0};
 for(const row of publicRows)for(const l of row[policy].logs){
  if(l.text.startsWith('你开始蓄势「镇岳印」'))out.started++;
  if(l.text.startsWith('你释放「镇岳印」'))out.released++;
  if(l.text.startsWith('你的「镇岳印」因距离'))out.missed++;
  if(l.text.startsWith('你的「镇岳印」被打断'))out.interrupted++;
  if(l.text.startsWith('你的付费培植跨过阶段'))out.matured++;
 }
 return out;
};
const summary={schema:1,baseCommit,sourceHashes,method:'128 paired single-player public-NPC cases: 96 middle-distance new-major × six opponents × four tendencies; 32 near/far water/earth checks. Same rules and unchanged NPC queues; compare v0.9 auto to bounded prepared policy. 32 symmetric pairs compare reused identical-source immediate records to the new prepared controller (both seats predict a public script, not the other controller). Limit cases are unresolved, not draws. Replays are not new scenarios.',newlyExecutedGames:288,reusedGames:32,pairedCases:160,public:{before:tally(publicRows.map(r=>r.before)),after:tally(publicRows.map(r=>r.after)),beforeActions:actionsByMajor('before'),afterActions:actionsByMajor('after'),beforePreparation:releaseCounts('before'),afterPreparation:releaseCounts('after'),changedOutcomes:publicRows.filter(r=>r.before.result!==r.after.result).length},symmetric:{before:symmetricTally('before'),after:symmetricTally('after'),changedOutcomes:symmetricRows.filter(r=>r.before.winner!==r.after.winner).length},compute};
const records={publicRows,symmetricRows};
if(replay){assert.deepEqual(summary,JSON.parse(readFileSync(dir+'/summary.json')));assert.deepEqual(records,JSON.parse(gunzipSync(readFileSync(dir+'/games.json.gz'))));console.log('Frozen prepared AI replay matches all paired outcomes, actions, reactions, resources, complete traces and budget counts.');}
else{
 writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');writeFileSync(dir+'/games.json.gz',gzipSync(JSON.stringify(records)));
 const stats=values=>{const v=[...values].sort((a,b)=>a-b);return {decisions:v.length,medianMs:v[Math.floor(v.length/2)],p95Ms:v[Math.ceil(v.length*.95)-1],maxMs:v.at(-1)};};
 writeFileSync(dir+'/timings.json',JSON.stringify({note:'Observed Node wall time on this workspace; performance measurements are not deterministic replay assertions.',before:stats(timings.before),after:stats(timings.after)},null,2)+'\n');console.log(JSON.stringify({public:summary.public.after,symmetric:summary.symmetric.after,compute}));
}
