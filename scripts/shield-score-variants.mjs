import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

export const SHIELD_CANDIDATES=[{id:'base',ratio:0},{id:'half',ratio:.5},{id:'equal',ratio:1},{id:'double',ratio:2}];
export function blobHash(bytes){const b=Buffer.from(bytes);return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');}
export const SOURCE_FILES=['dist/engine.mjs','dist/auto.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs'];
export function freezeShieldSource(path){
  if(existsSync(path))return JSON.parse(gunzipSync(readFileSync(path)));
  const head=readFileSync('.git/HEAD','utf8').trim(),commit=head.startsWith('ref: ')?readFileSync('.git/'+head.slice(5),'utf8').trim():head;
  const sources=Object.fromEntries(SOURCE_FILES.map(p=>[p,readFileSync(p,'utf8')]));
  const hashes=Object.fromEntries(SOURCE_FILES.map(p=>[p,blobHash(sources[p])]));
  const data={commit,sources,hashes,candidates:SHIELD_CANDIDATES};
  mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,gzipSync(JSON.stringify(data),{level:9}));return data;
}
export function shieldAuto(source,ratio){
  if(ratio===0)return source;
  const anchor='score-=path.length*.2;\n  return score;';assert.equal(source.split(anchor).length,2);
  return source.replace(anchor,`score-=path.length*.2;\n  score+=(start.enemy.shield-future.enemy.shield)*t.shield*${ratio};\n  return score;`);
}
export async function shieldVariants({snapshotPath}={}){
  const source=snapshotPath?JSON.parse(gunzipSync(readFileSync(snapshotPath))):{sources:Object.fromEntries(SOURCE_FILES.map(p=>[p,readFileSync(p,'utf8')]))};
  const root=mkdtempSync(join(tmpdir(),'qingxiao-shield-score-')),list=[];
  try{
    for(const c of SHIELD_CANDIDATES){
      const dir=join(root,c.id),auto=shieldAuto(source.sources['dist/auto.mjs'],c.ratio);
      for(const p of SOURCE_FILES){mkdirSync(join(dir,p,'..'),{recursive:true});writeFileSync(join(dir,p),p==='dist/auto.mjs'?auto:source.sources[p]);}
      const internals=await import(pathToFileURL(join(dir,'scripts/planner-internals.mjs')));
      list.push({...c,autoHash:blobHash(auto),engine:await import(pathToFileURL(join(dir,'dist/engine.mjs'))),planner:internals.planner,runtime:await import(pathToFileURL(join(dir,'scripts/predictive-arena.mjs')))});
    }
    return {source,list,cleanup:()=>rmSync(root,{recursive:true,force:true})};
  }catch(e){rmSync(root,{recursive:true,force:true});throw e;}
}
