import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadOpponentPlanner} from './opponent-planner-internals.mjs';
const root=pathToFileURL(resolve(process.argv[2]??'.')+'/'),out=process.argv[3];assert.ok(out);
const {ChallengeBattle}=await import(new URL('dist/challenge-battle.mjs',root)),{chooseReaction}=await import(new URL('dist/auto.mjs',root)),model=await loadOpponentPlanner(root);
const cases=[];
// Announced bloomheal needs both remaining wood qi. The NPC can survive the
// hit, so its real defense policy keeps that budget instead of buying a shield.
const wood=new ChallengeBattle('flame',{},'symbiosis');wood.player.ap=1;wood.player.qi.fire=3;wood.player.qi.any=1;wood.enemy.hp=140;wood.enemy.shield=0;wood.enemy.qi.wood=2;wood.enemy.qi.any=0;wood.enemy.growth=2;wood.enemy.growthPending=false;wood.enemyPlan=['bloomheal'];wood.enemyQueue=['bloomheal'];cases.push({id:'reserve-harvest-qi',battle:wood,actor:'player',skill:'eruption'});
// A legal anchor response holds mid-range and consumes one terrain, rather
// than substituting a shield and allowing the force to move the defender.
const earth=new ChallengeBattle('earth',{skillIds:['stonebolt','foundation','rampart','landbreak','anchor','mountain']},'cold');earth.phase='enemy';earth.player.terrain=3;earth.player.qi.earth=1;earth.player.qi.any=0;earth.player.shield=0;earth.player.chilled=true;earth.enemy.qi.water=3;cases.push({id:'anchor-versus-force',battle:earth,actor:'enemy',skill:'repulse'});
// Paying a spell can kill its caster through parasite before the pending
// attack is resolved. Resolving damage inside attack() reverses that order.
const parasite=new ChallengeBattle('wood',{major:'parasitic'},'fierce');parasite.phase='enemy';parasite.player.hp=4;parasite.player.shield=0;parasite.enemy.hp=1;parasite.enemy.shield=0;parasite.enemy.parasite=1;parasite.enemy.parasiteTurns=3;cases.push({id:'paid-parasite-before-response',battle:parasite,actor:'enemy',skill:'flare'});
const fields=b=>({player:structuredClone(b.player),enemy:structuredClone(b.enemy),distance:b.distance,result:b.result,phase:b.phase,pending:b.pending});
const rows=[];for(const x of cases){const frozen=JSON.stringify(x.battle),actual=Object.assign(Object.create(ChallengeBattle.prototype),structuredClone(x.battle)),predicted=model.clone(x.battle);assert.ok(actual.act(actual[x.actor],x.skill).ok);assert.ok(predicted.act(predicted[x.actor],x.skill).ok);
 if(actual.phase==='reaction')actual.react(chooseReaction(actual,'balanced').response);
 if(predicted.phase==='reaction')predicted.react(chooseReaction(predicted,'balanced').response);
 assert.equal(JSON.stringify(x.battle),frozen);const a=fields(actual),p=fields(predicted);rows.push({id:x.id,input:JSON.parse(frozen),actor:x.actor,skill:x.skill,equal:JSON.stringify(a)===JSON.stringify(p),actual:a,predicted:p,actualLogs:actual.logs,predictedLogs:predicted.logs});}
await mkdir(out,{recursive:true});await writeFile(`${out}/audit.json`,JSON.stringify(rows,null,2));console.log(rows.map(r=>({id:r.id,equal:r.equal,actualQi:r.actual.enemy.qi,predictedQi:r.predicted.enemy.qi,actualDistance:r.actual.distance,predictedDistance:r.predicted.distance})));
