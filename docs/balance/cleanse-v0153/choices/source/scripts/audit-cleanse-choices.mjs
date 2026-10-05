// Read-only comparison of the planner's public-queue assumption and the next
// phase of the same adaptive opponent. This audits assumptions, not new wins.
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createPredictiveArena,cloneWorld,worldState,chooseArenaAction,actWorld,endPhase,advancePhase,playCurrentPhase,forecastWorld,winner} from './predictive-arena.mjs';import {planner} from './planner-internals.mjs';
const out=process.argv[2]??'docs/balance/cleanse-v0153/choices',s=JSON.parse(await readFile('docs/balance/pressure-v0152/final/summary.json')),builds=Object.fromEntries(s.builds.map(b=>[b.id,b])),results=[];
for(const [a,b] of [['flame/fierce','wood/symbiosis'],['flame/fierce','wood/parasitic'],['water/tidal','flame/smolder'],['water/tidal','water/cold']]){
 const w=createPredictiveArena(builds[a],builds[b],{first:0,distance:1,controllers:a==='water/tidal'?['immediate','immediate']:['prepared','prepared'],prefs:a==='water/tidal'?['defensive','defensive']:['balanced','balanced'],trace:true});
 while(winner(w)===null&&(w.battle.round<3||w.seat!==0)){playCurrentPhase(w);if(winner(w)===null)advancePhase(w);}
 assert.equal(winner(w),null);const before=worldState(w),map=new WeakMap([[w.battle,w]]),stats={trace:true};
 const clone=s=>{const n=cloneWorld(map.get(s));map.set(n.battle,n);return n.battle;},project=s=>{const n=forecastWorld(map.get(s),{mode:'script',depth:0}).world;map.set(n.battle,n);return n.battle;};
 const choice=planner.choosePreparedAction(w.battle,w.prefs[0],{clone,project,stats});assert.deepEqual(worldState(w),before);if(w.controllers[0]==='prepared')assert.deepEqual(choice,chooseArenaAction(w));
 const top=[...stats.plans].sort((x,y)=>y.score-x.score),path=top[0].path,leaf=cloneWorld(w);for(const id of path){if(winner(leaf)!==null)break;assert.ok(actWorld(leaf,id).ok);}
 const predicted=forecastWorld(leaf,{mode:'script',depth:0}).world;const actual=cloneWorld(leaf);if(winner(actual)===null){endPhase(actual);advancePhase(actual);if(winner(actual)===null)playCurrentPhase(actual);if(winner(actual)===null)advancePhase(actual);}
 results.push({a,b,controllers:w.controllers,prefs:w.prefs,scope:w.controllers[0]==='prepared'?'Actual prepared controller decision':'Prepared diagnostic of a defensive-immediate trajectory; not its actual immediate choice',start:before,choice,budget:{rootStates:stats.rootStates,candidates:stats.candidates,forecasts:stats.forecasts,rootTruncated:stats.rootTruncated},plans:top,predicted:worldState(predicted),actual:worldState(actual)});
 console.log(a,b,choice.skillId??choice.action, 'path',path,'forecast/actual hp',predicted.actors.map(x=>x.hp),actual.actors.map(x=>x.hp));
}
await mkdir(out,{recursive:true});await writeFile(`${out}/audit.json`,JSON.stringify({scope:'Four round-3 midrange read-only probes; flame uses real prepared decisions, water probes prepared scoring on defensive-immediate trajectories. Public queue forecast vs actual next rival phase; not win-rate samples or proof the browser forecast is incorrect',results},null,2));
