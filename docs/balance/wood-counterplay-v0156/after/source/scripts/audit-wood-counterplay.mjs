import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadOpponentPlanner} from './opponent-planner-internals.mjs';
const [source,out]=process.argv.slice(2);assert.ok(source&&out);const root=pathToFileURL(resolve(source)+'/'),model=await loadOpponentPlanner(root);
const {ChallengeBattle}=await import(new URL('dist/challenge-battle.mjs',root)),{Battle}=await import(new URL('dist/engine.mjs',root)),{chooseReaction}=await import(new URL('dist/auto.mjs',root));
const fields=b=>Object.fromEntries(['player','enemy','distance','result','phase','pending','enemyPlan','enemyQueue','enemyWaitReason'].map(k=>[k,b[k]]));
const rows=[];
for(const kind of ['growth','parasite'])for(const mode of ['attack','retreat','counter']){
 const b=new ChallengeBattle('flame',{},kind==='growth'?'symbiosis':'parasitic');b.player.ap=1;b.player.qi=Object.fromEntries(Object.keys(b.player.qi).map(k=>[k,k==='any'?1:0]));b.enemy.shield=60;b.enemy.reaction=false;b.enemyPlan=[];b.enemyQueue=[];b.enemy.growth=kind==='growth'?2:0;b.enemy.growthPending=kind==='growth';b.player.parasite=kind==='parasite'?3:0;b.player.parasiteTurns=2;
 const frozen=JSON.stringify(b),predicted=model.playerPressure(b,mode),actual=model.clone(b);
 const skill=mode==='retreat'?'far':kind==='growth'?'sever-growth':'unparasite';assert.ok(actual.act(actual.player,skill).ok);assert.ok(actual.endTurn().ok);assert.equal(JSON.stringify(b),frozen);
 rows.push({id:`${kind}-${mode}`,input:JSON.parse(frozen),skill,equal:JSON.stringify(fields(actual))===JSON.stringify(fields(predicted)),actual:fields(actual),predicted:fields(predicted),actualLogs:actual.logs,predictedLogs:predicted.logs});
}
const b=new ChallengeBattle('flame',{},'symbiosis');b.phase='enemy';b.enemy.growth=0;b.enemy.growthPending=false;b.enemy.qi.wood=2;b.enemy.qi.any=0;b.enemyPlan=['bloomheal'];b.enemyQueue=['bloomheal'];const frozen=JSON.stringify(b),actual=Object.assign(Object.create(ChallengeBattle.prototype),structuredClone(b));actual.logs=[];Object.defineProperty(actual,'beginRound',{value:()=>{}});
for(let n=0;!actual.result;n++){assert.ok(n<12);if(actual.phase==='reaction')actual.react(chooseReaction(actual,'balanced').response);else if(!Battle.prototype.enemyStep.call(actual))break;}
const predicted=model.execute(b,['bloomheal']);assert.equal(JSON.stringify(b),frozen);rows.push({id:'broken-harvest-fallback',input:JSON.parse(frozen),path:['bloomheal'],equal:JSON.stringify(fields(actual))===JSON.stringify(fields(predicted)),actual:fields(actual),predicted:fields(predicted),actualLogs:actual.logs,predictedLogs:predicted.logs});
await mkdir(out,{recursive:true});await writeFile(`${out}/audit.json`,JSON.stringify(rows,null,2));console.log(rows.map(r=>({id:r.id,equal:r.equal})));
