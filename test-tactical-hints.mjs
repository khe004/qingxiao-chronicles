import assert from 'node:assert/strict';
import {DuelBattle} from './dist/duel-setup.mjs';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {OPPONENTS} from './dist/opponents.mjs';
import {TACTICAL_LOADOUTS} from './dist/tactics.mjs';
import {tacticalHints} from './dist/tactical-hints.mjs';
const hint=(b,id)=>tacticalHints(b).find(h=>h.id===id);
function inspect(b){
 const before=JSON.stringify(b),hints=tacticalHints(b);assert.equal(JSON.stringify(b),before,'Hints cannot change combat, queues, logs, events or statistics');
 for(const h of hints){assert.ok(h.title&&h.text);assert.ok(!h.text.includes('undefined'));}
 for(const h of hints.filter(h=>['combo','range'].includes(h.id))){
  const c=Object.assign(Object.create(Object.getPrototypeOf(b)),structuredClone(b));
  for(const id of h.skillIds){assert.equal(c.legal(c.player,id),null);assert.ok(c.act(c.player,id).ok);}
  assert.notEqual(c.result,'lose','A shown combination must not die to reflection or parasite');
 }
 return hints;
}
let cases=0;
for(const [key,majors]of Object.entries(TACTICAL_LOADOUTS))for(const [major,skillIds]of Object.entries(majors))for(const distance of [0,1,2]){
 const b=new DuelBattle(key,{major,skillIds},{key:'wood',major:'parasitic'});b.distance=distance;inspect(b);cases++;
 b.player.hp-=30;b.player.burn=3;b.player.burnTurns=3;b.player.parasite=1;b.player.parasiteTurns=3;b.enemy.growth=2;b.enemy.growthPending=true;inspect(b);cases++;
 b.player.ap=0;assert.deepEqual(inspect(b).map(h=>h.id),['spent']);cases++;
}
for(const id of Object.keys(OPPONENTS)){const b=new ChallengeBattle('flame',{major:'fierce',skillIds:TACTICAL_LOADOUTS.flame.fierce},id);inspect(b);cases++;}
const flame=new DuelBattle('flame',{major:'fierce',skillIds:TACTICAL_LOADOUTS.flame.fierce},{key:'wood'});
assert.ok(hint(flame,'combo'));assert.deepEqual(hint(flame,'combo').skillIds,['kindle','firestorm']);
const setup=Object.assign(Object.create(DuelBattle.prototype),structuredClone(flame));assert.ok(setup.act(setup.player,'kindle').ok);assert.equal(hint(setup,'combo'),undefined);assert.ok(hint(setup,'outlet').skillIds.includes('firestorm'));inspect(setup);
flame.player.ap=2;assert.equal(hint(flame,'combo'),undefined,'Two remaining AP cannot support a three-AP combo');
flame.player.ap=3;flame.player.qi.fire=1;flame.player.qi.any=0;assert.equal(hint(flame,'combo'),undefined,'A paid setup alone does not prove the follow-up is affordable');
flame.player.qi.fire=4;flame.player.qi.any=1;flame.player.hp=1;flame.player.shield=0;flame.enemy.counter={name:'荆棘护幕',hits:2,power:20,element:'wood'};assert.equal(hint(flame,'combo'),undefined,'Deadly reflection blocks the sequence');
const sword=new DuelBattle('sword');sword.distance=2;inspect(sword);assert.ok(hint(sword,'range'));sword.player.ap=1;assert.equal(hint(sword,'range'),undefined,'Moving with the last AP leaves no attack');
const charged=new DuelBattle('sword');assert.ok(charged.act(charged.player,'unity').ok);assert.deepEqual(inspect(charged).map(h=>h.id),['charging']);
const threatened=new DuelBattle('flame',{}, {key:'sword'});threatened.enemy.charge={...threatened.skill(threatened.enemy,'unity')};assert.ok(hint(threatened,'charge'));assert.ok(hint(threatened,'charge').skillIds.includes('near'));
threatened.player.burn=3;assert.ok(hint(threatened,'burn').text.includes('恢复0气血'));threatened.player.hp-=5;assert.ok(hint(threatened,'burn').text.includes('恢复5气血'));
threatened.phase='reaction';threatened.pending={s:threatened.skill(threatened.enemy,'swift'),raw:30};assert.deepEqual(inspect(threatened).map(h=>h.id),['reaction']);
threatened.player.qi.fire=0;threatened.player.qi.any=0;assert.ok(hint(threatened,'reaction').text.includes('没有可支付'));
threatened.phase='enemy';assert.deepEqual(inspect(threatened).map(h=>h.id),['observe']);threatened.result='win';assert.deepEqual(inspect(threatened).map(h=>h.id),['over']);
console.log(`Tactical hints: ${cases} class/major/range/status/NPC cases remain immutable; real two-step payments/reactions, AP shortages, lethal reflection, charge escape, capped healing and phase-specific lessons passed.`);
