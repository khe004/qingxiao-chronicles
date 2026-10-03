import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export function blobHash(bytes){return createHash('sha1').update(`blob ${Buffer.byteLength(bytes)}\0`).update(bytes).digest('hex');}
// Each candidate gets isolated production modules. The controller imports the
// same candidate engine as the arena, including during its cloned forecasts.
export async function variants(){
  const root=mkdtempSync(join(tmpdir(),'qingxiao-sustain-'));
  const source=readFileSync('dist/engine.mjs','utf8'),auto=readFileSync('dist/auto.mjs','utf8'),arena=readFileSync('scripts/balance-arena.mjs','utf8');
  assert.equal((source.match(/export const SUSTAIN_RECOVERY = \d+;/g)||[]).length,1);
  const list=[];
  try{
    for(const recovery of [6,4,2]){
      const engine=source.replace(/export const SUSTAIN_RECOVERY = \d+;/,`export const SUSTAIN_RECOVERY = ${recovery};`),dir=join(root,String(recovery));
      assert.equal(engine.replace(`SUSTAIN_RECOVERY = ${recovery};`,'SUSTAIN_RECOVERY = X;'),source.replace(/SUSTAIN_RECOVERY = \d+;/,'SUSTAIN_RECOVERY = X;'));
      mkdirSync(join(dir,'dist'),{recursive:true});mkdirSync(join(dir,'scripts'));
      writeFileSync(join(dir,'dist/engine.mjs'),engine);if(engine.includes("'./prepared.mjs'"))copyFileSync('dist/prepared.mjs',join(dir,'dist/prepared.mjs'));writeFileSync(join(dir,'dist/auto.mjs'),auto);writeFileSync(join(dir,'scripts/balance-arena.mjs'),arena);
      list.push({recovery,engineHash:blobHash(engine),autoHash:blobHash(auto),engine:await import(pathToFileURL(join(dir,'dist/engine.mjs'))),arena:await import(pathToFileURL(join(dir,'scripts/balance-arena.mjs')))});
    }
    return {list,cleanup:()=>rmSync(root,{recursive:true,force:true})};
  }catch(e){rmSync(root,{recursive:true,force:true});throw e;}
}
