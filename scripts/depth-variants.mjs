// Frozen offline forks. Every adaptive prediction consumes one explicit depth.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SOURCE_FILES,shieldAuto,blobHash} from './shield-score-variants.mjs';

export const DEPTH_PRESETS=[{id:'d1',depth:1,inner:12},{id:'d2',depth:2,inner:12},{id:'d2-6',depth:2,inner:6}];
function once(s,a,b){assert.equal(s.split(a).length,2,'Depth fork anchor changed: '+a);return s.replace(a,b);}
export function depthRuntime(source,preset){
  let s=once(source,'depth>=0&&depth<=1','depth>=0&&depth<=2');
  s=once(s,'assert.ok(depth===0||depth===1);','assert.ok(Number.isInteger(depth)&&depth>=0&&depth<=2);');
  s=once(s,'chooseArenaAction(w,{controller=w.controllers[w.seat],depth=1}','chooseArenaAction(w,{controller=w.controllers[w.seat],depth='+preset.depth+'}');
  s=once(s,'playCurrentPhase(w,{controller=w.controllers[w.seat],depth=1}','playCurrentPhase(w,{controller=w.controllers[w.seat],depth='+preset.depth+'}');
  s=once(s,"forecastWorld(leaf,{mode:'adaptive',depth:0}).future","forecastWorld(leaf,{mode:'adaptive',depth:depth-1}).future");
  s=once(s,'const ranked=candidates.toSorted((a,b)=>b.score-a.score),selected=[];','const budget=depth===1?'+preset.inner+':ADAPTIVE_CANDIDATE_LIMIT;\n    const ranked=candidates.toSorted((a,b)=>b.score-a.score),selected=[];');
  s=once(s,'if(selected.length>=ADAPTIVE_CANDIDATE_LIMIT)break;','if(selected.length>=budget)break;');
  // Six slots are enough for all existing reservations, including stop.
  assert.ok(preset.inner>=6&&preset.inner<=12);
  s=once(s,'const contexts=new WeakMap();',`const contexts=new WeakMap();
const computations={choices:{},forecasts:{},plans:{},maxDepth:0};
export function resetComputeStats(){computations.choices={};computations.forecasts={};computations.plans={};computations.maxDepth=0;}
export function computeStats(){return structuredClone(computations);}`);
  s=once(s,"  assert.ok(['script','adaptive'].includes(mode));", "  computations.forecasts[depth]=(computations.forecasts[depth]||0)+1;\n  computations.maxDepth=Math.max(computations.maxDepth,depth);\n  assert.ok(['script','adaptive'].includes(mode));");
  s=once(s,'  assert.ok(CONTROLLERS.includes(controller));','  computations.choices[depth]=(computations.choices[depth]||0)+1;\n  computations.maxDepth=Math.max(computations.maxDepth,depth);\n  assert.ok(CONTROLLERS.includes(controller));');
  s=once(s,'  const id=best.path[0];','  computations.plans[depth]={path:[...best.path],score:best.score};\n  const id=best.path[0];');
  return s;
}
export async function depthVariants(){
  const source=JSON.parse(gunzipSync(readFileSync('docs/balance/shield-score/source.json.gz'))),root=mkdtempSync(join(tmpdir(),'qingxiao-depth-')),list=[];
  try{
    for(const preset of DEPTH_PRESETS){
      const dir=join(root,preset.id),auto=shieldAuto(source.sources['dist/auto.mjs'],2),runtime=depthRuntime(source.sources['scripts/predictive-arena.mjs'],preset);
      for(const p of SOURCE_FILES){mkdirSync(join(dir,p,'..'),{recursive:true});writeFileSync(join(dir,p),p==='dist/auto.mjs'?auto:p==='scripts/predictive-arena.mjs'?runtime:source.sources[p]);}
      list.push({...preset,runtimeHash:blobHash(runtime),autoHash:blobHash(auto),runtime:await import(pathToFileURL(join(dir,'scripts/predictive-arena.mjs'))),planner:(await import(pathToFileURL(join(dir,'scripts/planner-internals.mjs')))).planner});
    }
    return {source,list,cleanup:()=>rmSync(root,{recursive:true,force:true})};
  }catch(e){rmSync(root,{recursive:true,force:true});throw e;}
}
