import assert from 'node:assert/strict';
import {Battle,CLASSES,RULES,elementMultiplier,total} from './dist/engine.mjs';
import {DuelBattle} from './dist/duel-setup.mjs';
import {ChallengeBattle} from './dist/challenge-battle.mjs';
import {Trial} from './dist/trial.mjs';
import {normalizeRecord} from './dist/save.mjs';
import {createPredictiveArena} from './scripts/predictive-arena.mjs';

// An independent five-element cycle catches reversed relationships and treats
// the mixed defender by affinity, regardless of which side casts the spell.
const keys={metal:'sword',wood:'wood',earth:'earth',water:'water',fire:'flame'};
const cycle=['metal','wood','earth','water','fire'];
for(let i=0;i<5;i++){
 const a=cycle[i],b=cycle[(i+1)%5];
 assert.equal(elementMultiplier(a,keys[b]),1.08);
 assert.equal(elementMultiplier(b,keys[a]),.92);
 assert.equal(elementMultiplier(a,keys[a]),1);
 assert.equal(elementMultiplier('any',keys[a]),1);
}
assert.ok(Math.abs(elementMultiplier('water','fire')-1.056)<1e-12);
assert.ok(Math.abs(elementMultiplier('metal','fire')-.968)<1e-12);
for(const [key,id,enemy,factor,def] of [
 ['sword','swift','wood',1.08,28],['water','waterbolt','flame',1.08,30],
 ['earth','stonebolt','water',1.08,30],['wood','wooddart','earth',1.08,34],
 ['flame','flare','sword',1.08,32],['flame','flare','water',.92,30],
]){
 const b=new DuelBattle(key,{}, {key:enemy});b.enemy.reaction=false;b.enemy.shield=0;
 const s=b.skill(b.player,id),hp=b.enemy.hp,expected=Math.round(s.power*factor*100/(100+def));
 assert.equal(b.preview(s),expected);assert.ok(b.act(b.player,id).ok);assert.equal(hp-b.enemy.hp,expected);
}
const burn=new Battle('water');burn.player.burn=3;burn.player.burnTurns=2;burn.player.shield=40;
const hp=burn.player.hp;burn.tickBurn(burn.player);assert.equal(hp-burn.player.hp,6);assert.equal(burn.player.shield,40);
assert.equal(burn.player.burnTurns,1);burn.tickBurn(burn.player);assert.equal(burn.player.burn,0);assert.equal(burn.player.burnTurns,0);
const cleanse=new Battle('water');cleanse.player.burn=5;cleanse.player.burnTurns=2;cleanse.act(cleanse.player,'waterbolt');assert.equal(cleanse.player.burn,4);cleanse.act(cleanse.player,'waterbolt');assert.equal(cleanse.player.burn,4,'Paid water cleanse only once per round');
for(const key of Object.keys(CLASSES)){
 const b=new DuelBattle(key,{}, {key});assert.equal(b.player.shield,0);assert.equal(b.enemy.shield,16);
 const c=new ChallengeBattle(key,{},'cold');assert.equal(c.enemy.shield,16);
 for(const first of [0,1]){const w=createPredictiveArena({key,config:{}},{key,config:{}},{first});assert.equal(w.actors[first].shield,0);assert.equal(w.actors[1-first].shield,16);}
}

// Forced movement happens after damage. Anchoring spends the one response and
// its explicit resources; it cannot be played as a free active AP button.
const a=new DuelBattle('earth',{skillIds:['stonebolt','foundation','rampart','landbreak','anchor','earthenwall']},{key:'water'});
a.player.terrain=3;a.player.chilled=true;a.player.qi.earth=4;a.player.shield=0;
const before=JSON.stringify(a);assert.equal(a.act(a.player,'anchor').ok,false);assert.equal(JSON.stringify(a),before);
a.phase='reaction';a.pending={s:a.skill(a.enemy,'repulse'),raw:18};
const ahp=a.player.hp,ap=a.player.ap,qi=total(a.player.qi);assert.ok(a.react('anchor').ok);
assert.equal(a.distance,1);assert.equal(a.player.terrain,2);assert.equal(total(a.player.qi),qi-1);assert.equal(a.player.ap,ap);assert.equal(a.player.reaction,false);assert.equal(ahp-a.player.hp,12);assert.equal(a.lastMove.blocked,true);
const archived=new Trial().archive(a,{abandoned:true});assert.ok(normalizeRecord(archived).review.events.some(e=>e.type==='reaction'&&e.response==='anchor'),'Anchor response survives record validation');
for(const missing of ['qi','terrain','reaction','equipped']){
 const b=new DuelBattle('earth',{skillIds:['stonebolt','foundation','rampart','landbreak','anchor','earthenwall']},{key:'water'});b.player.terrain=2;b.phase='reaction';b.pending={s:b.skill(b.enemy,'repulse'),raw:18};
 if(missing==='qi')b.player.qi.earth=0;if(missing==='terrain')b.player.terrain=0;if(missing==='reaction')b.player.reaction=false;if(missing==='equipped')b.player.skillIds=b.player.skillIds.filter(id=>id!=='anchor');
 const state=JSON.stringify(b);assert.equal(b.react('anchor').ok,false);assert.equal(JSON.stringify(b),state);
}
const mature=new DuelBattle('wood',{major:'symbiosis'},{key:'water'});mature.distance=2;mature.player.growth=2;
const state=JSON.stringify(mature);assert.equal(mature.act(mature.player,'bloomstrike').ok,false);assert.equal(JSON.stringify(mature),state);mature.player.growth=3;mature.enemy.reaction=false;assert.ok(mature.act(mature.player,'bloomstrike').ok);assert.equal(mature.player.growth,0);
const parasite=new DuelBattle('wood',{major:'parasitic'},{key:'earth'});parasite.player.qi.wood=8;parasite.enemy.reaction=false;parasite.enemy.shield=0;
assert.ok(parasite.act(parasite.player,'parasite').ok);assert.equal(parasite.stats[0].hpDamage,2);
parasite.player.reaction=false;parasite.phase='enemy';const prev=parasite.enemy.hp;assert.ok(parasite.act(parasite.enemy,'stonebolt').ok);assert.equal(prev-parasite.enemy.hp,10);assert.equal(parasite.enemy.parasite,3);
const next=parasite.enemy.hp;assert.ok(parasite.act(parasite.enemy,'stonebolt').ok);assert.equal(parasite.enemy.hp,next);assert.equal(parasite.stats[0].hpDamage,12);assert.ok(parasite.events.some(e=>e.type==='hit'&&e.skillId==='parasite'));
console.log('Five-element directions, mixed affinity, previews/actual physical and magical hits, finite mitigated burn, water cleanse, both-seat opening compensation, paid anchor/immutable invalid reactions, mature far harvest and finite recorded parasite damage passed.');
