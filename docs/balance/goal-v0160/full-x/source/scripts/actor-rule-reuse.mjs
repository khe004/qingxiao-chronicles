import assert from 'node:assert/strict';
import {changedRuleSkills,skillRuleAffected} from './skill-rule-reuse.mjs';

// HP is read only when constructing the fighter selected by key/major. Every
// scenario containing a changed fighter is rerun, including its mirrors.
export function changedActorRules(before,after,builds){
 const strip=rules=>{const {majorHp,...rest}=rules;return rest;};
 const skills=changedRuleSkills(strip(before),strip(after)),majors=[];
 for(const rules of [before,after])for(const [key,table] of Object.entries(rules.majorHp??{})){
  assert.ok(table&&typeof table==='object'&&!Array.isArray(table));
  for(const [major,hp] of Object.entries(table)){
   assert.ok(builds.some(b=>b.key===key&&b.config.major===major),'Unknown HP specialization');
   assert.ok(Number.isInteger(hp)&&hp>=1&&hp<=500,'Invalid specialization HP');
  }
 }
 for(const b of builds)if(before.majorHp?.[b.key]?.[b.config.major]!==after.majorHp?.[b.key]?.[b.config.major])majors.push({key:b.key,major:b.config.major});
 return {skills,majors};
}
export function actorRuleAffected(job,proof){return skillRuleAffected(job,proof.skills)||[job.a,job.b].some(b=>proof.majors.some(m=>m.key===b.key&&m.major===b.config.major));}
