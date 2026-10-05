import assert from 'node:assert/strict';
import {Battle,total} from './dist/engine.mjs';
import {RecordedBattle} from './dist/recorded-battle.mjs';
const make=(key='flame',major='fierce')=>new Battle(key,{major});
const reject=(b,id)=>{const before=JSON.stringify(b);assert.equal(b.act(b.player,id).ok,false);assert.equal(JSON.stringify(b),before);};
// Universal cleansing requires an actual burn; injury alone cannot fund repeat healing.
for(const key of ['fire','sword','flame','water','wood','earth']){
 const b=new Battle(key);b.player.hp=100;assert.equal(b.legal(b.player,'purify'),'自身没有灼烧');reject(b,'purify');
 b.player.burn=5;b.player.burnTurns=2;b.player.chilled=true;b.player.parasite=2;b.player.parasiteTurns=2;b.player.parasiteFed=true;
 const ap=b.player.ap,qi=total(b.player.qi);assert.ok(b.act(b.player,'purify').ok);
 assert.equal(b.player.hp,108);assert.equal(b.player.ap,ap-1);assert.equal(total(b.player.qi),qi-1);
 assert.equal(b.player.burn,0);assert.equal(b.player.burnTurns,0);assert.equal(b.player.chilled,true);assert.equal(b.player.parasite,2);
 assert.ok(b.logs.some(l=>l.text.includes('清除 5 层灼烧')));reject(b,'purify');
}
// A burn acquired later in the same phase may be cleared again, paying each time.
const twice=make();twice.player.hp=100;
for(let i=0;i<2;i++){twice.player.burn=2;twice.player.burnTurns=2;assert.ok(twice.act(twice.player,'purify').ok);}
assert.equal(twice.player.hp,116);assert.equal(twice.player.ap,1);assert.equal(total(twice.player.qi),3);
// Rinse clears one layer in addition to the once-per-phase first-paid-water passive.
for(const major of ['cold','tidal'])for(const passiveUsed of [false,true]){
 const b=make('water',major),a=b.player;a.hp=100;a.burn=5;a.burnTurns=2;a.chilled=true;a.parasite=1;a.parasiteTurns=2;a.waterCleanseTriggered=passiveUsed;
 const water=a.qi.water,ap=a.ap;assert.ok(b.act(a,'rinse').ok);
 // Parasite damage also applies to the paid cast; test healing separately below.
 assert.ok(a.hp<=118);assert.equal(a.burn,passiveUsed?4:3);assert.equal(a.burnTurns,2);assert.equal(a.chilled,true);assert.ok(a.parasite>0);
 assert.equal(a.qi.water,water-1);assert.equal(a.ap,ap-1);reject(b,'rinse');
}
for(const burn of [0,1,5]){
 const b=make('water','tidal'),a=b.player;a.hp=100;a.burn=burn;a.burnTurns=burn?2:0;
 assert.ok(b.act(a,'rinse').ok);assert.equal(a.hp,118);assert.equal(a.burn,Math.max(0,burn-2));assert.equal(a.burnTurns,burn>2?2:0);
 assert.ok(b.skill(a,'rinse').desc.includes('至多1层'));
}
const capped=make('water','cold');capped.player.hp=capped.player.maxHp-3;assert.ok(capped.act(capped.player,'rinse').ok);assert.equal(capped.player.hp,capped.player.maxHp);
const dispel=make();dispel.player.hp=100;dispel.player.chilled=true;dispel.player.burn=3;assert.ok(dispel.act(dispel.player,'dispel').ok);assert.equal(dispel.player.hp,108);assert.equal(dispel.player.burn,3);assert.equal(dispel.player.chilled,false);

const recorded=new RecordedBattle('flame');recorded.player.hp=100;recorded.player.burn=5;recorded.player.burnTurns=2;assert.ok(recorded.act(recorded.player,'purify').ok);assert.equal(recorded.review().actors[0].healing,8);assert.equal(recorded.review().actors[0].overheal,0);
const fullRecord=new RecordedBattle('flame');fullRecord.player.burn=3;fullRecord.player.burnTurns=2;assert.ok(fullRecord.act(fullRecord.player,'purify').ok);assert.equal(fullRecord.review().actors[0].healing,0);assert.equal(fullRecord.review().actors[0].overheal,8);
console.log('Cleanse: six-class selective conditional-heal purify, immutable no-burn rejection, paid recleansing, rinse cap/passive order, 18 healing, once limit and preserved dispel passed.');
