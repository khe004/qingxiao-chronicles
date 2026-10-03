// Isolated experiments for the authorized seven-step review; no browser mutations.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SOURCE_FILES,shieldAuto,blobHash} from './shield-score-variants.mjs';
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Fork anchor: '+a);return s.replace(a,b);};
export function sequenceRuntime(source,{deep=0,diverse=false}={}){
 let s=once(source,'depth>=0&&depth<=1','depth>=0&&depth<=2');
 s=once(s,'assert.ok(depth===0||depth===1);','assert.ok(Number.isInteger(depth)&&depth>=0&&depth<=2);');
 for(const name of ['chooseArenaAction','playCurrentPhase'])s=once(s,`${name}(w,{controller=w.controllers[w.seat],depth=1}`,`${name}(w,{controller=w.controllers[w.seat],depth=2}`);
 s=once(s,'const contexts=new WeakMap();',`const contexts=new WeakMap();
let stats={roots:[],forecasts:{}};
export function resetComputeStats(){stats={roots:[],forecasts:{}};}
export function computeStats(){return structuredClone(stats);}`);
 s=once(s,"  assert.ok(['script','adaptive'].includes(mode));","  stats.forecasts[depth]=(stats.forecasts[depth]||0)+1;\n  assert.ok(['script','adaptive'].includes(mode));");
 if(diverse)s=once(s,'    for(const c of ranked){if(selected.length>=ADAPTIVE_CANDIDATE_LIMIT)break;add(c);}',`    if(depth===2){
      // Same total twelve slots, new reservations only at actual root decisions.
      const preparation=c=>{const p=c.path;return p.includes('guard')?'shield':p.some(id=>['near','far'].includes(id))?'move':p.some(id=>w.battle.skill(w.battle.player,id)?.kind==='attack')?'attack':'plain';};
      for(const prep of ['shield','move','attack','plain'])add(ranked.find(c=>c.leaf.battle.player.charge&&preparation(c)===prep));
      add(ranked.find(c=>c.path.includes('near')&&c.path.some(id=>w.battle.skill(w.battle.player,id)?.kind==='attack')));
      add(ranked.find(c=>c.path.includes('seed')&&c.path.some(id=>w.battle.skill(w.battle.player,id)?.ignite||w.battle.skill(w.battle.player,id)?.partialIgnite)));
    }
    assert.ok(selected.length<=ADAPTIVE_CANDIDATE_LIMIT);
    for(const c of ranked){if(selected.length>=ADAPTIVE_CANDIDATE_LIMIT)break;add(c);}`);
 const start='    for(const {leaf,path} of selected){';
 s=once(s,start,`    let evaluations=selected;
    let shallow=[];
    if(depth===2&&${deep}>0){
      shallow=selected.map(c=>({...c,score:planner.planScore(b,c.leaf.battle,tendency,c.path,winner(c.leaf)===null?forecastWorld(c.leaf,{mode:'adaptive',depth:0}).future:c.leaf.battle)})).toSorted((a,b)=>b.score-a.score);
      // All final contenders use the same deep score; stop also competes fairly.
      evaluations=[];const addFinal=c=>{if(c&&!evaluations.some(x=>x.leaf===c.leaf))evaluations.push(c);};
      addFinal(shallow.find(c=>c.path.length===0));
      for(const c of shallow){if(evaluations.length>=${deep})break;addFinal(c);}
    }
    const evaluated=[];
    for(const {leaf,path} of evaluations){`);
 s=once(s,"forecastWorld(leaf,{mode:'adaptive',depth:0}).future","forecastWorld(leaf,{mode:'adaptive',depth:depth===2&&"+deep+">0?1:0}).future");
 s=once(s,'      if(score>best.score)best={score,path};\n    }\n  }',`      evaluated.push({path:[...path],score});
      if(score>best.score)best={score,path};
    }
    if(depth===2)stats.roots.push({selected:selected.map(c=>c.path),shallow:shallow.map(c=>({path:c.path,score:c.score})),evaluated,best});
  }`);
 return s;
}
export async function sequenceVariants(specs){
 const source=JSON.parse(gunzipSync(readFileSync('docs/balance/shield-score/source.json.gz'))),root=mkdtempSync(join(tmpdir(),'qingxiao-sequence-')),list=[];
 try{for(const spec of specs){const dir=join(root,spec.id),auto=shieldAuto(source.sources['dist/auto.mjs'],2),runtime=sequenceRuntime(source.sources['scripts/predictive-arena.mjs'],spec),engine=spec.patch?spec.patch(source.sources['dist/engine.mjs']):source.sources['dist/engine.mjs'];
 for(const p of SOURCE_FILES){mkdirSync(join(dir,p,'..'),{recursive:true});writeFileSync(join(dir,p),p==='dist/auto.mjs'?auto:p==='scripts/predictive-arena.mjs'?runtime:p==='dist/engine.mjs'?engine:source.sources[p]);}
 list.push({...spec,patch:undefined,engineHash:blobHash(engine),autoHash:blobHash(auto),runtimeHash:blobHash(runtime),sources:{engine,auto,runtime,planner:source.sources['scripts/planner-internals.mjs']},engine:await import(pathToFileURL(join(dir,'dist/engine.mjs'))),planner:(await import(pathToFileURL(join(dir,'scripts/planner-internals.mjs')))).planner,runtime:await import(pathToFileURL(join(dir,'scripts/predictive-arena.mjs')))});}
 return {source,list,cleanup:()=>rmSync(root,{recursive:true,force:true})};}catch(e){rmSync(root,{recursive:true,force:true});throw e;}
}

export function patchNourish(field,value){return source=>{
 const line=source.split('\n').find(l=>l.includes("id:'nourish'"));
 const anchors={heal:['heal:14','heal:'+value],clearBurn:['clearBurn:1','clearBurn:'+value],refund:['refund:{any:1}','refund:{}'],ap:['ap:1','ap:'+value]};
 assert.ok(Object.hasOwn(anchors,field));const [a,b]=anchors[field];return once(source,line,once(line,a,b));
};}
