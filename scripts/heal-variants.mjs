import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {blobHash} from './sustain-variants.mjs';
export const CANDIDATES=[{id:'base',heal:26,clear:5},{id:'heal22',heal:22,clear:5},{id:'heal18',heal:18,clear:5},{id:'clear2',heal:26,clear:2}];
export async function healVariants(){
  const root=mkdtempSync(join(tmpdir(),'qingxiao-heal-')),source=readFileSync('dist/engine.mjs','utf8'),auto=readFileSync('dist/auto.mjs','utf8'),arena=readFileSync('scripts/balance-arena.mjs','utf8'),list=[];
  assert.equal((source.match(/export const HEAL_RECOVERY = \d+;/g)||[]).length,1);assert.equal((source.match(/export const HEAL_CLEAR_BURN = \d+;/g)||[]).length,1);
  try{
    for(const c of CANDIDATES){
      const engine=source.replace(/export const HEAL_RECOVERY = \d+;/,`export const HEAL_RECOVERY = ${c.heal};`).replace(/export const HEAL_CLEAR_BURN = \d+;/,`export const HEAL_CLEAR_BURN = ${c.clear};`),dir=join(root,c.id);
      const strip=s=>s.replace(/HEAL_RECOVERY = \d+;/,'HEAL_RECOVERY = X;').replace(/HEAL_CLEAR_BURN = \d+;/,'HEAL_CLEAR_BURN = X;');assert.equal(strip(engine),strip(source));
      mkdirSync(join(dir,'dist'),{recursive:true});mkdirSync(join(dir,'scripts'));writeFileSync(join(dir,'dist/engine.mjs'),engine);writeFileSync(join(dir,'dist/auto.mjs'),auto);writeFileSync(join(dir,'scripts/balance-arena.mjs'),arena);
      list.push({...c,engineHash:blobHash(engine),autoHash:blobHash(auto),engine:await import(pathToFileURL(join(dir,'dist/engine.mjs'))),arena:await import(pathToFileURL(join(dir,'scripts/balance-arena.mjs')))});
    }
    return {list,cleanup:()=>rmSync(root,{recursive:true,force:true})};
  }catch(e){rmSync(root,{recursive:true,force:true});throw e;}
}
