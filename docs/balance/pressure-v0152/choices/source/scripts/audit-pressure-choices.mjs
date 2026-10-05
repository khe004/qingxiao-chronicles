// Read-only comparison of the planner's public-queue assumption and the next
// phase of the same adaptive opponent. This audits assumptions, not new wins.
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createPredictiveArena,cloneWorld,worldState,chooseArenaAction,actWorld,endPhase,advancePhase,playCurrentPhase,forecastWorld,winner} from './predictive-arena.mjs';import {planner} from './planner-internals.mjs';
const out=process.argv[2]??'/tmp/qingxiao-pressure-choices',s=JSON.parse(await readFile('docs/balance/wrapup-v0151/final/summary.json')),builds=Object.fromEntries(s.builds.map(b=>[b.id,b])),results=[];
for(const [a,b] of [['flame/fierce','wood/symbiosis'],['flame/fierce','earth/bastion'],['water/tidal','wood/symbiosis'],['water/tidal','earth/bastion']]){
 const w=createPredictiveArena(builds[a],builds[b],{first:0,distance:1,controllers:['prepared','prepared'],trace:true});
 while(winner(w)===null&&(w.battle.round<3||w.seat!==0)){playCurrentPhase(w);if(winner(w)===null)advancePhase(w);}
 assert.equal(winner(w),null);const before=worldState(w),map=new WeakMap([[w.battle,w]]),stats={trace:true};
 const clone=s=>{const n=cloneWorld(map.get(s));map.set(n.battle,n);return n.battle;},project=s=>{const n=forecastWorld(map.get(s),{mode:'script',depth:0}).world;map.set(n.battle,n);return n.battle;};
 const choice=planner.choosePreparedAction(w.battle,'balanced',{clone,project,stats});assert.deepEqual(worldState(w),before);assert.deepEqual(choice,chooseArenaAction(w));
 const top=[...stats.plans].sort((x,y)=>y.score-x.score),path=top[0].path,leaf=cloneWorld(w);for(const id of path){if(winner(leaf)!==null)break;assert.ok(actWorld(leaf,id).ok);}
 const predicted=forecastWorld(leaf,{mode:'script',depth:0}).world;const actual=cloneWorld(leaf);if(winner(actual)===null){endPhase(actual);advancePhase(actual);if(winner(actual)===null)playCurrentPhase(actual);if(winner(actual)===null)advancePhase(actual);}
 results.push({a,b,start:before,choice,budget:{rootStates:stats.rootStates,candidates:stats.candidates,forecasts:stats.forecasts,rootTruncated:stats.rootTruncated},plans:top,predicted:worldState(predicted),actual:worldState(actual)});
 console.log(a,b,choice.skillId??choice.action, 'path',path,'forecast/actual hp',predicted.actors.map(x=>x.hp),actual.actors.map(x=>x.hp));
}
await mkdir(out,{recursive:true});await writeFile(`${out}/audit.json`,JSON.stringify({scope:'Four round-3 midrange read-only probes; public queue forecast vs actual next prepared-AI phase, not win-rate samples or proof the browser forecast is incorrect',results},null,2));
