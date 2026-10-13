import assert from 'node:assert/strict';
import {changedRuleSkills,skillRuleAffected} from './skill-rule-reuse.mjs';

// HP is read only when constructing the fighter selected by key/major. Every
// scenario containing a changed fighter is rerun, including its mirrors.
export function changedActorRules(before,after,builds){
 const strip=rules=>{const {majorHp,bastionShield,...rest}=rules;return rest;};
 const skills=changedRuleSkills(strip(before),strip(after)),majors=[];
 for(const rules of [before,after])for(const [key,table] of Object.entries(rules.majorHp??{})){
  assert.ok(table&&typeof table==='object'&&!Array.isArray(table));
  for(const [major,hp] of Object.entries(table)){
   assert.ok(builds.some(b=>b.key===key&&b.config.major===major),'Unknown HP specialization');
   assert.ok(Number.isInteger(hp)&&hp>=1&&hp<=500,'Invalid specialization HP');
  }
 }
 for(const b of builds)if(before.majorHp?.[b.key]?.[b.config.major]!==after.majorHp?.[b.key]?.[b.config.major])majors.push({key:b.key,major:b.config.major});
 if(before.bastionShield!==after.bastionShield){
  for(const rules of [before,after])assert.ok(Number.isInteger(rules.bastionShield)&&rules.bastionShield>=0&&rules.bastionShield<=60,'Invalid paid bastion shield bonus');
  assert.ok(builds.some(b=>b.key==='earth'&&b.config.major==='bastion'),'Missing bastion specialization');
  // The engine reads this bonus only inside a paid terrain guard with major
  // "bastion". Other legal majors, including mountain, cannot receive it.
  return {skills,majors,passives:[{key:'earth',major:'bastion',field:'bastionShield'}]};
 }
 return {skills,majors};
}
export function actorRuleAffected(job,proof){return skillRuleAffected(job,proof.skills)||[job.a,job.b].some(b=>[...proof.majors,...(proof.passives??[])].some(m=>m.key===b.key&&m.major===b.config.major));}
