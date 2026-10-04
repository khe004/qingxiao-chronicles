import assert from 'node:assert/strict';
import {Battle,CLASSES,MAJORS,burnBonus,total} from './dist/engine.mjs';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {chooseAction,chooseReaction,TENDENCIES} from './dist/auto.mjs';
import {planOpponent} from './dist/opponents.mjs';
import {loadForecastModel} from './scripts/forecast-audit.mjs';
import {createPredictiveArena,actWorld,endPhase,advancePhase,worldState,cloneWorld} from './scripts/predictive-arena.mjs';
const custom=['flare','kindle','cinder','combust','firewall','solar'];
const make=(major='smolder')=>{const b=new Battle('flame',{major,skillIds:custom});b.enemy.reaction=false;b.enemy.shield=0;return b;};
assert.equal(CLASSES.flame.skills.length,12);assert.equal(Object.keys(MAJORS.flame).length,2);
for(const major of Object.keys(MAJORS.flame)){const b=make(major);assert.equal(total(b.player.qi),5);assert.equal(b.player.qi.fire,4);assert.equal(b.player.qi.wood,0);assert.equal(b.player.hp,CLASSES.fire.hp);}
// Second paid instantaneous fire attack gets one bonus, even when guard separates casts.
const chain=make('fierce');const damage=[];
for(let n=0;n<3;n++){const s=chain.skill(chain.player,'flare'),hp=chain.enemy.hp,preview=chain.preview(s);assert.ok(chain.act(chain.player,'flare').ok);damage.push(hp-chain.enemy.hp);assert.equal(damage.at(-1),preview);}
assert.deepEqual(damage,[20,26,20]);assert.equal(chain.logs.filter(l=>l.text.startsWith('烈焰强攻')).length,1);
const separated=make('fierce');separated.act(separated.player,'flare');separated.act(separated.player,'firewall');assert.equal(separated.player.fireCasts,1);assert.equal(separated.player.intent,0);assert.equal(separated.preview(separated.skill(separated.player,'flare')),26);
const paid=make('fierce');paid.act(paid.player,'solar');assert.equal(paid.player.ap,1);assert.equal(total(paid.player.qi),1);assert.equal(paid.player.fireCasts,0);assert.equal(paid.legal(paid.player,'flare'), '蓄势中仅可移动、调息或防守，也可结束回合或取消蓄势');paid.release(paid.player);assert.equal(paid.player.ap,1);assert.equal(paid.player.fireCasts,0);assert.equal(paid.player.charge,null);
const refreshed=make('fierce');refreshed.act(refreshed.player,'flare');refreshed.enemyQueue=[];refreshed.endTurn();while(refreshed.phase!=='player'&&!refreshed.result){if(refreshed.phase==='reaction')refreshed.react('none');else refreshed.enemyStep();}assert.equal(refreshed.player.fireCasts,0);
// Burn upkeep and cashout do not grant both damage streams or free resources.
const upkeep=make();upkeep.act(upkeep.player,'kindle');assert.equal(upkeep.enemy.burn,3);upkeep.act(upkeep.player,'kindle');assert.equal(upkeep.enemy.burn,5);assert.equal(upkeep.logs.filter(l=>l.text.startsWith('焚灼消耗')).length,1);
const partial=make();partial.enemy.burn=5;partial.enemy.burnTurns=2;const preview=partial.preview(partial.skill(partial.player,'cinder')),hp=partial.enemy.hp,qi=total(partial.player.qi);assert.ok(partial.act(partial.player,'cinder').ok);assert.equal(hp-partial.enemy.hp,preview);assert.equal(partial.enemy.burn,3);assert.equal(partial.enemy.burnTurns,2);assert.equal(total(partial.player.qi),qi-1);const shield=partial.enemy.shield;partial.tickBurn(partial.enemy);assert.equal(hp-partial.enemy.hp,preview+7);assert.equal(partial.enemy.shield,shield);
const empty=make(),saved=JSON.stringify(empty);assert.ok(empty.legal(empty.player,'combust').includes('灼烧'));assert.equal(empty.act(empty.player,'combust').ok,false);assert.equal(JSON.stringify(empty),saved);
const full=make();full.enemy.burn=5;full.enemy.burnTurns=3;full.enemy.shield=10;const d=full.preview(full.skill(full.player,'combust')),start=full.enemy.hp;assert.ok(full.act(full.player,'combust').ok);assert.equal(full.enemy.burn,0);assert.equal(full.enemy.burnTurns,0);assert.equal(start-full.enemy.hp,d-10);full.tickBurn(full.enemy);assert.equal(start-full.enemy.hp,d-10);assert.equal(total(full.player.qi),2);
// Charge evaluates burn at release: purification, range and interrupts have paid counters.
for(const mode of ['burn','purify','range','interrupt']){const b=make();b.enemy.burn=5;b.enemy.burnTurns=3;const hp=b.enemy.hp;b.act(b.player,'solar');assert.equal(b.player.ap,1);assert.equal(b.player.charge.storedPower,84);b.phase='enemy';b.enemy.reaction=false;if(mode==='purify'){const before=b.enemy.ap,q=total(b.enemy.qi);assert.ok(b.act(b.enemy,'purify').ok);assert.equal(b.enemy.ap,before-1);assert.equal(total(b.enemy.qi),q-1);assert.equal(b.enemy.burn,0);}if(mode==='range'){assert.ok(b.act(b.enemy,'near').ok);assert.equal(b.distance,0);}if(mode==='interrupt'){const s={id:'test',name:'付费测试',kind:'attack',power:0,interrupt:true};b.resolveAttack(b.enemy,s,0);assert.equal(b.player.charge,null);}else {b.release(b.player);assert.equal(b.player.charge,null);if(mode==='range'){assert.equal(b.enemy.hp,hp);assert.equal(b.enemy.burn,5);}else {assert.equal(b.enemy.burn,0);assert.equal(b.enemy.hp,hp-Math.round((84+(mode==='burn'?40:0))*100/130));}}}
const defending=make();defending.phase='reaction';defending.pending={s:{id:'basic',name:'攻',kind:'attack'},raw:30};const fire=defending.player.qi.fire;assert.ok(defending.react('shield').ok);assert.equal(defending.player.qi.fire,fire-1);assert.equal(defending.player.fireCasts,0);
const budget=make();budget.act(budget.player,'kindle');budget.act(budget.player,'combust');budget.act(budget.player,'flare');assert.equal(budget.player.qi.fire,0);assert.equal(total(budget.player.qi),0,'Three attacks may consume all defensive fire qi');
// Real NPC simulation, public preview and its response agree including cashout.
const {projectEnemyPhase}=await loadForecastModel();
for(const major of ['fierce','smolder'])for(const difficulty of ['practice','questioning']){
 const b=new ChallengeBattle('flame',{major},'fierce',{difficulty});b.player.burn=3;b.player.burnTurns=2;b.enemy.burn=2;b.enemy.burnTurns=2;
 const saved=JSON.stringify(b);chooseAction(b);planOpponent(b,'fierce');assert.equal(JSON.stringify(b),saved);
 const predicted=projectEnemyPhase(b,'balanced'),actual=Object.assign(Object.create(ChallengeBattle.prototype),structuredClone(b));actual.endTurn();while(!actual.result&&actual.phase!=='player'){if(actual.phase==='reaction')actual.react(chooseReaction(actual).response);else actual.enemyStep();}
 for(const k of ['player','enemy','phase','distance','round','stats','result'])assert.deepEqual(predicted[k],actual[k],`${major}/${difficulty} forecast ${k}`);
}
const metric=new ChallengeBattle('flame',{major:'smolder'},'fierce');metric.enemy.burn=5;metric.enemy.burnTurns=3;metric.act(metric.player,'combust');assert.equal(metric.review().actors[0].burnConsumed,5);
// Both seats reset branch state at the real round boundary, not at every phase.
for(const first of [0,1]){const w=createPredictiveArena({key:'flame',config:{major:'fierce'}},{key:'flame',config:{major:'smolder'}},{first,controllers:['immediate','immediate']});w.actors[0].fireCasts=2;w.actors[1].smolderTriggered=true;const snap=JSON.stringify(worldState(w)),copy=cloneWorld(w);assert.equal(JSON.stringify(worldState(w)),snap);endPhase(copy);advancePhase(copy);assert.equal(copy.actors[0].fireCasts,2);endPhase(copy);advancePhase(copy);assert.equal(copy.actors[0].fireCasts,0);assert.equal(copy.actors[1].smolderTriggered,false);}
console.log('Pure fire: six-slot builds, paid second-cast bonus, upkeep limits, partial/full burn consumption, shield/cleanse competition, paid charge timing and counterplay, isolated NPC/auto forecasts, review metrics and both-seat round resets passed.');

// A fixed easy target can give multiple tendencies the same optimal sequence.
// Against a pure-fire NPC, attack/guard/charge trade-offs expose real differences.
for(const major of ['fierce','smolder']){const traces=[];for(const tendency of Object.keys(TENDENCIES)){const b=new ChallengeBattle('flame',{major},'fierce',{difficulty:'questioning'}),actions=[];let steps=0;while(!b.result){assert.ok(steps++<700);if(b.phase==='player'){const c=chooseAction(b,tendency);actions.push(c.skillId??'end');assert.ok((c.action==='end'?b.endTurn():b.act(b.player,c.skillId)).ok);}else if(b.phase==='reaction')assert.ok(b.react(chooseReaction(b,tendency).response).ok);else b.enemyStep();}traces.push(actions.join(','));}assert.ok(new Set(traces).size>=3,major+' exposes at least three different tendency sequences');}
console.log('Both pure-fire majors expose distinct aggressive, defensive and upkeep/charge choices against the same questioning opponent.');
