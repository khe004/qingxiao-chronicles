// Reproducible initial pure-fire acceptance, not a statistical balance guarantee.
import assert from 'node:assert/strict';
import {mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=resolve('docs/balance/pure-fire-first'),source=dir+'/source';
const replay=process.argv.includes('--replay');
const files=['dist/engine.mjs','dist/auto.mjs','dist/challenge-battle.mjs','dist/opponents.mjs','dist/opponent-planner.mjs','dist/opponent-resources.mjs','scripts/planner-internals.mjs','scripts/predictive-arena.mjs'];
if(!replay)for(const name of files){mkdirSync(resolve(source,name,'..'),{recursive:true});copyFileSync(name,source+'/'+name);}
const hashes=Object.fromEntries(files.map(name=>[name,createHash('sha256').update(readFileSync(source+'/'+name)).digest('hex')]));
if(replay)assert.deepEqual(hashes,JSON.parse(readFileSync(dir+'/summary.json')).sourceHashes);
const load=name=>import(pathToFileURL(source+'/'+name).href);
const {CLASSES,MAJORS,total}=await load('dist/engine.mjs');
const {chooseAction,chooseReaction,TENDENCIES,describeAutoChoice}=await load('dist/auto.mjs');
const {ChallengeBattle}=await load('dist/challenge-battle.mjs');
const {OPPONENTS}=await load('dist/opponents.mjs');
const {predictiveDuel}=await load('scripts/predictive-arena.mjs');
const npc=[];
for(const major of ['fierce','smolder'])for(const id of Object.keys(OPPONENTS))for(const difficulty of ['practice','questioning'])for(const tendency of Object.keys(TENDENCIES)){
 const b=new ChallengeBattle('flame',{major},id,{difficulty,distance:1});
 for(let steps=0;!b.result;steps++){
  assert.ok(steps<700);if(b.phase==='player'){const decision=chooseAction(b,tendency);b.log(describeAutoChoice(b,decision,tendency),'decision');assert.ok((decision.action==='end'?b.endTurn():b.act(b.player,decision.skillId)).ok);}else if(b.phase==='reaction')assert.ok(b.react(chooseReaction(b,tendency).response).ok);else b.enemyStep();
  for(const a of [b.player,b.enemy]){assert.ok(total(a.qi)<=10);assert.ok(a.ap>=0&&a.ap<=3);assert.ok(a.hp>=0);assert.ok(a.burn<=5);assert.ok(Object.values(a.qi).every(n=>Number.isInteger(n)&&n>=0));}
 }
 npc.push({major,id,difficulty,tendency,result:b.result,review:b.review(),logs:b.logs});
 if(npc.length%20===0)console.log(`NPC ${npc.length}/80`);
}
const arena=[];const old=[['fire','ignite'],['fire','sustain'],['sword','quick'],['sword','heavy']];
for(const major of ['fierce','smolder'])for(const [key,other] of old)for(const distance of [0,1,2])for(const first of [0,1]){
 const result=predictiveDuel({key:'flame',config:{major}},{key,config:{major:other}},{first,distance,controllers:['immediate','immediate'],prefs:['balanced','balanced'],trace:true});
 arena.push({major,key,other,distance,first,...result});if(arena.length%12===0)console.log(`Symmetric ${arena.length}/66`);
}
for(const pair of [['fierce','fierce'],['smolder','smolder'],['fierce','smolder']])for(const distance of [0,1,2])for(const first of [0,1]){
 const result=predictiveDuel({key:'flame',config:{major:pair[0]}},{key:'flame',config:{major:pair[1]}},{first,distance,controllers:['immediate','immediate'],prefs:['balanced','balanced'],trace:true});arena.push({major:pair[0],key:'flame',other:pair[1],distance,first,...result});
}
const tally=rows=>({games:rows.length,wins:rows.filter(r=>(r.result??(r.winner===0?'win':r.winner===1?'lose':'draw'))==='win').length,losses:rows.filter(r=>(r.result??(r.winner===0?'win':r.winner===1?'lose':'draw'))==='lose').length,draws:rows.filter(r=>r.result==='draw'||r.winner===null).length});
const group=(rows,key)=>Object.fromEntries([...new Set(rows.map(key))].map(k=>[k,tally(rows.filter(r=>key(r)===k))]));
const summary={schema:1,sourceHashes:hashes,method:{npc:'80 recommended pure-fire builds: 2 majors × 5 opponents × 2 difficulties × 4 tendencies, middle distance, player first.',arena:'66 symmetric full-rule games: 48 versus old majors + 18 pure-fire pairings, each 3 ranges × 2 initiatives; identical immediate controller and balanced reactions; 30-round limit.',limits:'Deterministic coverage, recommended builds only. NPC player-first win rate is not faction PvP balance. Arena has an immediate controller; charge planning and human play are not established.'},npc:group(npc,r=>`${r.major}/${r.difficulty}/${r.id}`),arena:group(arena,r=>`${r.major}/${r.key}/${r.other}`),initiative:group(arena.filter(r=>r.key!=='flame'),r=>`${r.major}/${r.first===0?'first':'second'}`),totals:{npc:tally(npc),arena:tally(arena)}};
if(replay){assert.deepEqual(summary,JSON.parse(readFileSync(dir+'/summary.json')));assert.deepEqual(npc,JSON.parse((await import('node:zlib')).gunzipSync(readFileSync(dir+'/npc.json.gz'))));assert.deepEqual(arena,JSON.parse((await import('node:zlib')).gunzipSync(readFileSync(dir+'/arena.json.gz'))));console.log('Frozen-source replay matches all records and summary.');}else{writeFileSync(dir+'/npc.json.gz',gzipSync(JSON.stringify(npc)));writeFileSync(dir+'/arena.json.gz',gzipSync(JSON.stringify(arena)));writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary.totals));}
