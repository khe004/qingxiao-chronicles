import assert from 'node:assert/strict';
import {DuelBattle} from './dist/duel-setup.mjs';
import {TACTICAL_LOADOUTS} from './dist/tactics.mjs';
import {total} from './dist/engine.mjs';
const config=(key,major)=>({major,skillIds:TACTICAL_LOADOUTS[key][major]});
const make=(a,am,b,bm)=>new DuelBattle(a,config(a,am),{key:b,...config(b,bm)});
const cast=(b,a,id)=>{const r=b.act(a,id);assert.ok(r.ok,`${id}: ${JSON.stringify(r)}`);};
const rejected=(b,a,id)=>{const before=JSON.stringify(b);assert.equal(b.act(a,id).ok,false);assert.equal(JSON.stringify(b),before);};
// A paid sword response and Swift+Strike share one real five-qi income.
const sword=make('sword','quick','fire','ignite');sword.enemy.reaction=false;
sword.phase='reaction';sword.pending={s:sword.skill(sword.enemy,'spark'),raw:28};
assert.ok(sword.react('shield').ok);assert.equal(total(sword.player.qi),4);sword.phase='player';
cast(sword,sword.player,'swift');cast(sword,sword.player,'strike');
assert.equal(total(sword.player.qi),0);assert.equal(sword.player.ap,1);
rejected(sword,sword.player,'swift');
// Preparation+the paid interrupt fit the current income; charges are cancelled
// by the real hit, without refunding terrain, qi or the enemy's spent actions.
const tide=make('water','tidal','earth','mountain');tide.enemy.reaction=false;
tide.phase='enemy';cast(tide,tide.enemy,'foundation');cast(tide,tide.enemy,'mountain');
assert.equal(tide.enemy.charge.storedPower,86);assert.equal(tide.enemy.ap,0);assert.equal(total(tide.enemy.qi),0);
tide.phase='player';tide.distance=2;cast(tide,tide.player,'gather');cast(tide,tide.player,'tidespear');
assert.equal(tide.enemy.charge,null);assert.equal(tide.enemy.terrain,0);assert.equal(tide.player.tide,0);
assert.equal(total(tide.player.qi),1);assert.equal(tide.player.ap,1);
rejected(tide,tide.player,'surge');rejected(tide,tide.player,'tidespear');
// Spending all three tide layers leaves no protection bonus. The five-qi
// budget includes the revised two-water wall and setup shield is not forgotten.
const surge=make('water','tidal','sword','quick');surge.enemy.reaction=false;surge.distance=2;
cast(surge,surge.player,'gather');cast(surge,surge.player,'surge');cast(surge,surge.player,'waterwall');
assert.equal(surge.player.tide,0);assert.equal(surge.player.shield,42);assert.equal(total(surge.player.qi),0);assert.equal(surge.player.ap,0);
// Cold uses a single chill, even with reaction, setup, cashout and a final bolt.
const cold=new DuelBattle('water',{major:'cold',skillIds:['frost','icebreaker','waterbolt','mirrorwater','rinse','repulse']},{key:'earth',major:'bastion'});
cold.enemy.reaction=false;cold.phase='reaction';cold.pending={s:cold.skill(cold.enemy,'stonebolt'),raw:30};
assert.ok(cold.react('shield').ok);cold.phase='player';cast(cold,cold.player,'frost');cast(cold,cold.player,'icebreaker');cast(cold,cold.player,'waterbolt');
assert.equal(total(cold.player.qi),0);assert.equal(cold.enemy.chilled,false);assert.equal(cold.player.ap,0);
// A one-layer break cancels maturation only when it removes the final growth.
const gravel=make('earth','bastion','wood','symbiosis');gravel.enemy.reaction=false;
gravel.enemy.growth=1;gravel.enemy.growthPending=true;
cast(gravel,gravel.player,'gravel');assert.equal(gravel.enemy.growth,0);assert.equal(gravel.enemy.growthPending,false);
assert.equal(gravel.player.terrain,1);assert.equal(total(gravel.player.qi),4);rejected(gravel,gravel.player,'gravel');
const mend=make('earth','mountain','flame','smolder');mend.player.hp=100;mend.player.terrain=2;mend.player.burn=5;mend.player.burnTurns=2;
cast(mend,mend.player,'earthmend');assert.equal(mend.player.hp,114);assert.equal(mend.player.burn,2);assert.equal(mend.player.burnTurns,2);assert.equal(mend.player.terrain,0);
assert.equal(total(mend.player.qi),3);rejected(mend,mend.player,'earthmend');
// Reflection is finite and direct-hit-only, with no recursion between shields.
const reflect=make('earth','bastion','flame','smolder');reflect.enemy.reaction=false;reflect.player.terrain=1;
cast(reflect,reflect.player,'stoneback');assert.equal(reflect.player.counter.power,24);assert.equal(reflect.player.counter.hits,2);
reflect.player.burn=2;reflect.player.burnTurns=2;reflect.tickBurn(reflect.player);assert.equal(reflect.player.counter.hits,2);
reflect.enemy.counter={power:12,hits:2,element:'fire',name:'test'};reflect.phase='enemy';reflect.player.reaction=false;
cast(reflect,reflect.enemy,'flare');assert.equal(reflect.player.counter.hits,1);assert.equal(reflect.enemy.counter.hits,2);
cast(reflect,reflect.enemy,'flare');assert.equal(reflect.player.counter,null);assert.equal(reflect.enemy.counter.hits,2);
console.log('Real paid response/attack budgets, charge interruption, finite shared tide, single chill, maturation break, selective healing and finite nonrecursive reflection passed.');
