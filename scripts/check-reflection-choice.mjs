import assert from 'node:assert/strict';import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {activeFallback} from '../dist/active-policy.mjs';
const root=process.argv[2]??'/tmp/qingxiao-reflection-choice',before='docs/balance/tactical-v015/build-cohort';const records=JSON.parse(gunzipSync(await readFile(`${before}/records.json.gz`))),r=records.find(r=>r.index===559);const hashes=JSON.parse(await readFile(`${before}/source-hashes.json`));for(const [f,h] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(`${before}/source/${f}`)).digest('hex'),h);
const results=[];let identicalSnapshot=null;
for(const [label,module] of [['before',`${before}/source/scripts/predictive-arena.mjs`],['after','scripts/predictive-arena.mjs']]){
 const api=await import(pathToFileURL(resolve(module)));const w=api.createPredictiveArena(r.a,r.b,{first:r.first,distance:r.distance,prefs:[r.tendency,r.tendency],controllers:[r.controller,r.controller],trace:true});let observed=null;
 while(w.battle.round<=4&&api.winner(w)===null){const choice=api.chooseArenaAction(w);
  if(w.battle.round===4&&w.seat===0&&w.battle.player.ap===1){observed={choice,state:api.worldState(w)};
   if(label==='before'){
    const {activeFallback:oldFallback}=await import(pathToFileURL(resolve(before,'source/dist/active-policy.mjs'))),b=w.battle,state=api.worldState(w),oldChoice=oldFallback(b,b.player),newChoice=activeFallback(b,b.player);assert.equal(oldChoice.id,undefined);assert.ok(newChoice.id&&!b.legal(b.player,newChoice.id));const hp=b.player.hp;assert.ok(api.actWorld(w,newChoice.id).ok);assert.equal(b.player.hp,hp);assert.equal(b.enemy.counter,null);identicalSnapshot={state,oldChoice,newChoice,resolved:api.worldState(w)};
   }break;}
  if(choice.action==='end'){api.endPhase(w);api.advancePhase(w);}else assert.ok(api.actWorld(w,choice.skillId).ok);
 }
 assert.ok(observed);results.push({label,...observed});
}
assert.equal(results[0].choice.action,'end');assert.equal(results[0].state.actors[0].shield,60);assert.equal(results[1].choice.action,'skill');
await mkdir(root,{recursive:true});await writeFile(`${root}/results.json`,JSON.stringify({scenario:r,results,identicalSnapshot},null,2));await cp(new URL(import.meta.url),`${root}/check-reflection-choice.mjs`);console.log({identicalSnapshot:{oldChoice:identicalSnapshot.oldChoice,newChoice:identicalSnapshot.newChoice,health:[identicalSnapshot.state.actors[0].hp,identicalSnapshot.resolved.actors[0].hp]},fullReplay:results.map(x=>({label:x.label,choice:x.choice,shield:x.state.actors[0].shield,counter:x.state.actors[1].counter}))});
