import assert from 'node:assert/strict';

// This is a narrowly bounded proof for v0.14 -> v0.14.1, not a general
// permission to reuse changed rules. Every other source must match its hash.
export const CULTIVATION_NOTE='培植与接枝共用每回合一次培育，收获后也不重置。';
const ids="export const CULTIVATION_IDS=['cultivate','graft'];\n";
const guard=" if(CULTIVATION_IDS.includes(s.id)&&a.usedSkills.some(id=>CULTIVATION_IDS.includes(id)))return '培植与接枝共用每回合一次培育，收获后也不重置';\n";
function removeOnce(source,fragment){assert.equal(source.split(fragment).length,2,'Expected exactly one reviewed change');return source.replace(fragment,'');}
export function verifyCultivationReuse(name,before,after){
 if(name==='dist/rules.mjs'){
  assert.ok(after.includes('"label": "v0.14.1-cultivation"'));
  assert.equal(after.replace('"label": "v0.14.1-cultivation"','"label": "v0.14-tactics"'),before);
 }else if(name==='dist/engine.mjs')assert.equal(removeOnce(after,CULTIVATION_NOTE),before);
 else if(name==='dist/tactics.mjs'){
  const normalized=removeOnce(removeOnce(removeOnce(after,ids),guard),CULTIVATION_NOTE);
  const marker='export const TACTICAL_LOADOUTS=';
  assert.equal(before.split(marker).length,2);assert.equal(normalized.split(marker).length,2);
  assert.equal(normalized.split(marker)[0],before.split(marker)[0],'Only the reviewed cultivation limit may change skills');
  // Everything after the marker must be data; reject appended code.
  for(const source of [before,normalized])JSON.parse(source.split(marker)[1].trim().replace(/;$/,''));
 }else assert.equal(after,before);
}
export function cultivationAffected(scenario){return [scenario.a,scenario.b].some(b=>['cultivate','graft'].every(id=>b.config.skillIds.includes(id)));}
