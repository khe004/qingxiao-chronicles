import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {blobHash} from './sustain-variants.mjs';
import {RULES} from '../dist/rules.mjs';
export const CANDIDATES=[{id:'base',heal:26,clear:5},{id:'heal22',heal:22,clear:5},{id:'heal18',heal:18,clear:5},{id:'clear2',heal:26,clear:2}];
export async function healVariants(){
  const root=mkdtempSync(join(tmpdir(),'qingxiao-heal-')),source=readFileSync('dist/engine.mjs','utf8'),auto=readFileSync('dist/auto.mjs','utf8'),arena=readFileSync('scripts/balance-arena.mjs','utf8'),list=[];
  assert.equal((source.match(/export const HEAL_RECOVERY = \d+;/g)||[]).length,1);assert.equal((source.match(/export const HEAL_CLEAR_BURN = \d+;/g)||[]).length,1);
  try{
    for(const c of CANDIDATES){
      const engine=source.replace(/export const HEAL_RECOVERY = \d+;/,`export const HEAL_RECOVERY = ${c.heal};`).replace(/export const HEAL_CLEAR_BURN = \d+;/,`export const HEAL_CLEAR_BURN = ${c.clear};`),dir=join(root,c.id);
      const strip=s=>s.replace(/HEAL_RECOVERY = \d+;/,'HEAL_RECOVERY = X;').replace(/HEAL_CLEAR_BURN = \d+;/,'HEAL_CLEAR_BURN = X;');assert.equal(strip(engine),strip(source));
      mkdirSync(join(dir,'dist'),{recursive:true});mkdirSync(join(dir,'scripts'));writeFileSync(join(dir,'dist/engine.mjs'),engine);if(engine.includes("'./prepared.mjs'"))copyFileSync('dist/prepared.mjs',join(dir,'dist/prepared.mjs'));if(engine.includes("'./rules.mjs'"))copyFileSync('dist/rules.mjs',join(dir,'dist/rules.mjs'));for(const name of ['tactics.mjs','active-policy.mjs'])copyFileSync('dist/'+name,join(dir,'dist',name));writeFileSync(join(dir,'dist/auto.mjs'),auto);writeFileSync(join(dir,'scripts/balance-arena.mjs'),arena);
      // Numerical rules can override the legacy constants. A variant must
      // change the executed skill and its description together, preserving
      // the shipped cost and once-per-phase contract.
      const rules=structuredClone(RULES);rules.skills??={};rules.skills.fire??={};
      const heal=rules.skills.fire.heal??={};
      Object.assign(heal,{heal:c.heal,clearBurn:c.clear,desc:`恢复 ${c.heal} 气血，清除自身至多 ${c.clear} 层灼烧${heal.once?'；每回合一次':''}。`});
      const ruleSource='export const RULES = '+JSON.stringify(rules,null,2)+';\n';
      writeFileSync(join(dir,'dist/rules.mjs'),ruleSource);
      list.push({...c,engineHash:blobHash(engine),rulesHash:blobHash(ruleSource),autoHash:blobHash(auto),engine:await import(pathToFileURL(join(dir,'dist/engine.mjs'))),arena:await import(pathToFileURL(join(dir,'scripts/balance-arena.mjs')))});
    }
    return {list,cleanup:()=>rmSync(root,{recursive:true,force:true})};
  }catch(e){rmSync(root,{recursive:true,force:true});throw e;}
}
