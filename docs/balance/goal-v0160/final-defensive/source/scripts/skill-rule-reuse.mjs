// Conservative proof for reusing matches where neither fighter equips any
// changed skill. Every global/stat/passive/economy field must remain identical.
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
export function changedRuleSkills(before,after){
 const strip=rules=>{const {label,skills,...rest}=rules;return rest;};
 assert.deepEqual(strip(before),strip(after),'Skill-only reuse forbids global, class-stat, passive, cost-rule or loadout changes');
 const changed=[];
 for(const key of new Set([...Object.keys(before.skills),...Object.keys(after.skills)])){
  const a=before.skills[key]??{},b=after.skills[key]??{};
  for(const id of new Set([...Object.keys(a),...Object.keys(b)])){
   for(const patch of [a[id],b[id]])if(patch)assert.ok(!Object.hasOwn(patch,'id'),'A skill patch must not change identity');
   if(!isDeepStrictEqual(a[id],b[id]))changed.push({key,id});
  }
 }
 return changed;
}
export function skillRuleAffected(job,changed){
 return [job.a,job.b].some(build=>changed.some(s=>s.key===build.key&&build.config.skillIds.includes(s.id)));
}
