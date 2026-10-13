import assert from 'node:assert/strict';
import {RULES,MAJORS,normalizeLoadout,Battle} from './dist/engine.mjs';
import {TACTICAL_LOADOUTS} from './dist/tactics.mjs';
import {changedRuleSkills} from './scripts/skill-rule-reuse.mjs';
import {changedActorRules,actorRuleAffected} from './scripts/actor-rule-reuse.mjs';
const builds=Object.keys(MAJORS).flatMap(key=>Object.keys(MAJORS[key]).map(major=>({key,config:normalizeLoadout(key,{major})})));
const get=(key,major)=>builds.find(b=>b.key===key&&b.config.major===major);
const before=structuredClone(RULES),after=structuredClone(before);
after.majorHp={...(after.majorHp??{}),wood:{...(after.majorHp?.wood??{}),parasitic:240}};
if(before.majorHp?.wood?.parasitic===240)after.majorHp.wood.parasitic=241;
after.skills.sword.swift={...after.skills.sword.swift,power:29};
if(before.skills.sword.swift.power===29)after.skills.sword.swift.power=30;
const frozen=JSON.stringify([before,after]),proof=changedActorRules(before,after,builds);
assert.deepEqual(proof.majors,[{key:'wood',major:'parasitic'}]);
assert.deepEqual(proof.skills,[{key:'sword',id:'swift'}]);
assert.equal(actorRuleAffected({a:get('wood','symbiosis'),b:get('water','cold')},proof),false);
for(const [a,b] of [[get('wood','parasitic'),get('water','cold')],[get('water','cold'),get('wood','parasitic')],[get('wood','parasitic'),get('wood','parasitic')],[get('sword','quick'),get('water','cold')]])assert.equal(actorRuleAffected({a,b},proof),true);
assert.equal(JSON.stringify([before,after]),frozen);
assert.throws(()=>changedRuleSkills(before,after),'HP reuse must be explicitly selected');
for(const hp of [0,-1,501,240.5,'240']){const r=structuredClone(after);r.majorHp.wood.parasitic=hp;assert.throws(()=>changedActorRules(before,r,builds),/Invalid specialization HP/);}
for(const map of [{missing:{parasitic:240}},{wood:{missing:240}},{wood:[240]}])assert.throws(()=>changedActorRules(before,{...after,majorHp:map},builds));
for(const r of [{...after,secondShield:19},{...after,burnLayer:4},{...after,stats:{...after.stats,wood:{...after.stats.wood,magical:35}}}])assert.throws(()=>changedActorRules(before,r,builds));
const bonus=before.bastionShield===8?6:8,bastion=changedActorRules(before,{...before,bastionShield:bonus},builds);
assert.deepEqual(bastion.passives,[{key:'earth',major:'bastion',field:'bastionShield'}]);
assert.deepEqual(bastion.majors,[]);assert.deepEqual(bastion.skills,[]);
for(const [a,b] of [[get('earth','bastion'),get('wood','symbiosis')],[get('wood','symbiosis'),get('earth','bastion')],[get('earth','bastion'),get('earth','bastion')]])assert.equal(actorRuleAffected({a,b},bastion),true);
assert.equal(actorRuleAffected({a:get('earth','mountain'),b:get('wood','symbiosis')},bastion),false);
for(const value of [-1,61,8.5,'8',undefined])assert.throws(()=>changedActorRules(before,{...before,bastionShield:value},builds),/Invalid paid bastion/);
const paidGuard=major=>{
 const skillIds=TACTICAL_LOADOUTS.earth[major].map(id=>major==='mountain'&&id==='gravel'?'stoneback':id);
 const battle=new Battle('earth',{major,skillIds});
 assert.ok(battle.act(battle.player,'foundation').ok);assert.ok(battle.act(battle.player,'stoneback').ok);
 const a=battle.player;return {shield:a.shield,ap:a.ap,qi:a.qi,terrain:a.terrain,counter:a.counter,hp:a.hp};
};
const originalBonus=RULES.bastionShield,originalBastion=paidGuard('bastion'),originalMountain=paidGuard('mountain');
try{
 RULES.bastionShield=bonus;const updated=paidGuard('bastion');
 assert.equal(originalBastion.shield-updated.shield,originalBonus-bonus);
 assert.deepEqual({...updated,shield:originalBastion.shield},originalBastion,'The paid guard changes no other resource or damage');
 assert.deepEqual(paidGuard('mountain'),originalMountain,'Other major cannot receive the changed bonus');
}finally{RULES.bastionShield=originalBonus;}
console.log('Actor reuse: affected major in both seats and mirrors, equipped skill reachability, unchanged other major, immutable proof, explicit opt-in, unknown/fractional/out-of-range HP and global/defense changes rejected.');
