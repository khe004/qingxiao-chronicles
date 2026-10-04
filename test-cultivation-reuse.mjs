import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyCultivationReuse,cultivationAffected} from './scripts/cultivation-reuse.mjs';
const root='docs/balance/twelve-school-v014/tactics/source/';
for(const name of ['dist/rules.mjs','dist/engine.mjs','dist/tactics.mjs']){
 const old=readFileSync(root+name,'utf8'),now=readFileSync(name,'utf8');
 verifyCultivationReuse(name,old,now);
 assert.throws(()=>verifyCultivationReuse(name,old,now+'\n// unexpected extra edit'),name);
}
const old=readFileSync(root+'dist/tactics.mjs','utf8'),now=readFileSync('dist/tactics.mjs','utf8');
assert.throws(()=>verifyCultivationReuse('dist/tactics.mjs',old,now.replace('instantGrowth:2','instantGrowth:3')),'An unrelated power increase must invalidate reuse');
assert.throws(()=>verifyCultivationReuse('dist/tactics.mjs',old,now+'\nconsole.log("unexpected code")'),'Appended executable code must invalidate reuse');
const build=skillIds=>({config:{skillIds}});
assert.equal(cultivationAffected({a:build(['cultivate']),b:build(['graft'])}),false,'Separate actors cannot share a use counter');
assert.equal(cultivationAffected({a:build([]),b:build(['graft','cultivate'])}),true,'Either seat with both skills must be rerun');
console.log('Cultivation reuse proof: exact reviewed edits accepted; extra code, unrelated skill changes and cross-actor false positives rejected.');
