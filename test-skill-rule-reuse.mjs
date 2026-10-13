import assert from 'node:assert/strict';
import {RULES} from './dist/engine.mjs';
import {changedRuleSkills,skillRuleAffected} from './scripts/skill-rule-reuse.mjs';
const current=structuredClone(RULES),next=structuredClone(current);
next.skills.wood.wooddart.power++;next.label='test';
const changed=changedRuleSkills(current,next);assert.deepEqual(changed,[{key:'wood',id:'wooddart'}]);
const fire={key:'fire',config:{skillIds:['seed','spark','blaze','heal','inferno','seedburst']}},wood={key:'wood',config:{skillIds:['wooddart','parasite','reap','bloomheal','cultivate','twinvine']}};
for(const job of [{a:wood,b:fire},{a:fire,b:wood}])assert.ok(skillRuleAffected(job,changed),'Both seats must rerun an equipped changed skill');
assert.equal(skillRuleAffected({a:fire,b:fire},changed),false);
assert.equal(skillRuleAffected({a:{key:'wood',config:{skillIds:['parasite','reap','bloomheal','cultivate','twinvine','graft']}},b:fire},changed),false,'Only equipped skill reachability proves an unchanged match');
for(const change of [r=>r.secondShield++,r=>r.advantage+=.01,r=>r.stats.wood.hp++,r=>r.loadouts.wood.parasitic.reverse(),r=>r.skills.wood.wooddart.id='reap']){
 const bad=structuredClone(next);change(bad);assert.throws(()=>changedRuleSkills(current,bad));
}
const removed=structuredClone(current);delete removed.skills.wood.wooddart;assert.deepEqual(changedRuleSkills(current,removed),[{key:'wood',id:'wooddart'}]);
assert.deepEqual(changedRuleSkills(current,{...current,label:'metadata'}),[]);
assert.deepEqual(RULES,current,'Proof never changes live rules');
console.log('Skill-only reuse: both seats/equipped reachability, changed/removal guards, global/stat/loadout/identity rejection and immutable input passed.');
