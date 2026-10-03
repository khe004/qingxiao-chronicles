// Deterministic first-batch acceptance; never a human win-rate estimate.
import assert from 'node:assert/strict';
import {mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=resolve('docs/balance/water-first'),source=dir+'/source',replay=process.argv.includes('--replay');
const files=['dist/engine.mjs','dist/auto.mjs','dist/challenge-battle.mjs','dist/opponents.mjs','dist/opponent-planner.mjs','dist/opponent-resources.mjs','scripts/planner-internals.mjs','scripts/predictive-arena.mjs','scripts/check-water.mjs','scripts/forecast-audit.mjs','test-water.mjs'];
if(!replay)for(const name of files){mkdirSync(resolve(source,name,'..'),{recursive:true});copyFileSync(name,source+'/'+name);}
const hashes=Object.fromEntries(files.map(name=>[name,createHash('sha256').update(readFileSync(source+'/'+name)).digest('hex')]));
if(replay)assert.deepEqual(hashes,JSON.parse(readFileSync(dir+'/summary.json')).sourceHashes);
const load=name=>import(pathToFileURL(source+'/'+name).href);
const {total}=await load('dist/engine.mjs');
const {chooseAction,chooseReaction,TENDENCIES,describeAutoChoice}=await load('dist/auto.mjs');
const {ChallengeBattle}=await load('dist/challenge-battle.mjs');
const {OPPONENTS}=await load('dist/opponents.mjs');
const {predictiveDuel}=await load('scripts/predictive-arena.mjs');
const old=[['fire','ignite'],['fire','sustain'],['sword','quick'],['sword','heavy'],['flame','fierce'],['flame','smolder']];
const npc=[];
function npcGame(key,config,id,difficulty,tendency,category){
 const b=new ChallengeBattle(key,config,id,{difficulty});
 for(let steps=0;!b.result;steps++){
  assert.ok(steps<700);
  if(b.phase==='player'){const choice=chooseAction(b,tendency);b.log(describeAutoChoice(b,choice,tendency),'decision');assert.ok((choice.action==='end'?b.endTurn():b.act(b.player,choice.skillId)).ok);}
  else if(b.phase==='reaction')assert.ok(b.react(chooseReaction(b,tendency).response).ok);else b.enemyStep();
  for(const a of [b.player,b.enemy]){assert.ok(total(a.qi)<=10);assert.ok(a.ap>=0&&a.ap<=3);assert.ok(a.hp>=0&&a.hp<=a.maxHp);assert.ok(a.shield>=0&&a.shield<=60);assert.ok(a.burn<=5);assert.ok((a.tide??0)>=0&&(a.tide??0)<=3);assert.ok(Object.values(a.qi).every(n=>Number.isInteger(n)&&n>=0));}
 }
 npc.push({key,major:config.major,skillIds:b.player.skillIds,id,difficulty,tendency,category,result:b.result,review:b.review(),logs:b.logs});
 if(npc.length%14===0)console.log(`NPC ${npc.length}/168`);
}
for(const major of ['cold','tidal'])for(const id of Object.keys(OPPONENTS))for(const difficulty of ['practice','questioning'])for(const tendency of Object.keys(TENDENCIES))npcGame('water',{major},id,difficulty,tendency,'recommended');
const custom={cold:['waterbolt','frost','repulse','gather','surge','rinse'],tidal:['waterbolt','gather','surge','waterwall','rinse','ebb']};
for(const major of ['cold','tidal'])for(const id of ['fierce','quick','sustain','tidal'])for(const difficulty of ['practice','questioning'])for(const tendency of ['balanced','defensive'])npcGame('water',{major,skillIds:custom[major]},id,difficulty,tendency,'custom-cleanse');
for(const [key,major] of old)for(const id of ['cold','tidal'])for(const difficulty of ['practice','questioning'])npcGame(key,{major},id,difficulty,'balanced','old-vs-water');
const arena=[];
function arenaGame(major,key,other,distance,first,controller){const r=predictiveDuel({key:'water',config:{major}},{key,config:{major:other}},{first,distance,controllers:[controller,controller],prefs:['balanced','balanced'],trace:true});arena.push({major,key,other,distance,first,controller,...r});if(arena.length%12===0)console.log(`Arena ${arena.length}/114`);}
for(const major of ['cold','tidal'])for(const [key,other] of old)for(const distance of [0,1,2])for(const first of [0,1])arenaGame(major,key,other,distance,first,'immediate');
for(const [a,b] of [['cold','cold'],['tidal','tidal'],['cold','tidal']])for(const distance of [0,1,2])for(const first of [0,1])arenaGame(a,'water',b,distance,first,'immediate');
for(const major of ['cold','tidal'])for(const [key,other] of old)for(const first of [0,1])arenaGame(major,key,other,1,first,'script');
const outcome=r=>r.result??(r.winner===0?'win':r.winner===1?'lose':'draw');
const tally=rows=>({games:rows.length,wins:rows.filter(r=>outcome(r)==='win').length,losses:rows.filter(r=>outcome(r)==='lose').length,unresolved:rows.filter(r=>outcome(r)==='draw').length});
const group=(rows,key)=>Object.fromEntries([...new Set(rows.map(key))].map(k=>[k,tally(rows.filter(r=>key(r)===k))]));
const actions=rows=>rows.reduce((sum,r)=>{for(const [id,n] of Object.entries(r.review.actors[0].actions))sum[id]=(sum[id]??0)+n;return sum;},{});
const summary={schema:1,sourceHashes:hashes,method:{npc:'112 recommended water games (2 majors × 7 opponents × 2 difficulties × 4 tendencies), 32 cleanse-equipped custom games and 24 old-major vs water NPC games. Middle range, player first, 30-round limit.',arena:'90 immediate symmetric games (72 versus six old majors, 18 water pairings) across three ranges and both initiatives; 24 middle-range cross-school confirmations with the script controller. Identical controller and balanced reactions at both seats.',limits:'Deterministic coverage only; no human or arbitrary-loadout balance claim. Full public-plan prediction can exploit fixed NPC scripts. Time-limit unresolved games are separate from wins/losses.'},totals:{npc:tally(npc),arena:tally(arena)},npc:group(npc,r=>`${r.category}/${r.major}/${r.difficulty}`),arena:group(arena,r=>`${r.controller}/${r.major}/${r.key}/${r.other}`),initiative:group(arena.filter(r=>r.key!=='water'),r=>`${r.controller}/${r.major}/${r.first===0?'first':'second'}`),waterActions:Object.fromEntries(['cold','tidal'].map(m=>[m,actions(npc.filter(r=>r.key==='water'&&r.major===m))])),npcWaterOpponentActions:Object.fromEntries(['cold','tidal'].map(id=>[id,npc.filter(r=>r.id===id).reduce((s,r)=>{for(const [k,n] of Object.entries(r.review.actors[1].actions))s[k]=(s[k]??0)+n;return s;},{})]))};
assert.equal(npc.length,168);assert.equal(arena.length,114);
if(replay){assert.deepEqual(summary,JSON.parse(readFileSync(dir+'/summary.json')));assert.deepEqual(npc,JSON.parse(gunzipSync(readFileSync(dir+'/npc.json.gz'))));assert.deepEqual(arena,JSON.parse(gunzipSync(readFileSync(dir+'/arena.json.gz'))));console.log('Frozen-source replay matches every water duel, full chronicle and summary.');}
else{writeFileSync(dir+'/npc.json.gz',gzipSync(JSON.stringify(npc)));writeFileSync(dir+'/arena.json.gz',gzipSync(JSON.stringify(arena)));writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary.totals));}
