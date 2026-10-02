import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {build} from './balance-arena.mjs';
import {planner} from './planner-internals.mjs';
import {createPredictiveArena,worldState,playCurrentPhase,advancePhase,forecastWorld,winner,ADAPTIVE_CANDIDATE_LIMIT} from './predictive-arena.mjs';

const outIndex=process.argv.indexOf('--out'),out=outIndex===-1?'docs/balance/adaptive-prediction':process.argv[outIndex+1];
assert.ok(out,'--out needs a directory');mkdirSync(out,{recursive:true});
const previous=process.argv.includes('--recompute')?JSON.parse(gunzipSync(readFileSync(resolve(out,'cases.json.gz')))):null;
const started=performance.now(),rows=previous?.rows??[],probes=previous?.probes??[],limit=30;
function hash(path){const b=readFileSync(path);return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');}
if(previous)for(const [field,path] of [['engineHash','dist/engine.mjs'],['autoHash','dist/auto.mjs'],['runtimeHash','scripts/predictive-arena.mjs'],['adapterHash','scripts/planner-internals.mjs']])assert.equal(previous.summary[field],hash(path),'Do not mix experimental sources');
function compact(w){return {round:w.battle.round,seat:w.seat,distance:w.battle.distance,winner:winner(w),actors:structuredClone(w.actors)};}
function legacyForecast(w){
  const b=Object.assign(Object.create(Object.getPrototypeOf(w.battle)),w.battle,{phase:'player'});
  const projected=planner.projectEnemyPhase(b,w.prefs[w.seat]);
  const actors=w.seat===0?[projected.player,projected.enemy]:[projected.enemy,projected.player];
  return {round:projected.round,seat:w.seat,distance:projected.distance,winner:projected.result===null?null:projected.result==='win'?w.seat:1-w.seat,actors:structuredClone(actors)};
}
function makeProbe(w,id){
  const before=JSON.stringify(worldState(w)),fixed=forecastWorld(w,{mode:'script'}),adaptive=forecastWorld(w,{mode:'adaptive',depth:0});
  const item={id,origin:w.seat,round:w.battle.round,controllers:[...w.controllers],legacy:legacyForecast(w),fixed:compact(fixed.world),adaptive:compact(adaptive.world),assumedController:adaptive.assumedController};
  assert.equal(JSON.stringify(worldState(w)),before);return item;
}
function addProbe(p,w){
  p.actual=compact(w);probes.push(p);
  // This check detects missing regen/reaction/charge effects independently of win rate.
  if(p.assumedController!=='immediate'||p.controllers[1-p.origin]==='immediate'){
    assert.deepEqual(p.adaptive,p.actual,'Known bounded policy must replay the entire combat state exactly');
  }
}
const cases=[];
for(const fire of ['ignite','sustain'])for(const sword of ['quick','heavy'])for(const distance of [0,1,2])for(const first of [0,1])cases.push({group:'core',a:build('fire',fire),b:build('sword',sword),distance,first,prefs:['balanced','balanced']});
// Same school, same build, so initiative can be checked without class identity.
for(const [key,major] of [['fire','ignite'],['fire','sustain'],['sword','quick'],['sword','heavy']])for(const distance of [0,1,2])for(const first of [0,1])cases.push({group:'mirror',a:build(key,major),b:build(key,major),distance,first,prefs:['balanced','balanced']});
for(const controller of previous?[]:['legacy','immediate','script','adaptive'])for(const c of cases){
  const id=rows.length,w=createPredictiveArena(c.a,c.b,{...c,controllers:[controller,controller],trace:c.group==='core'&&c.distance===1&&c.first===0});
  let pending=null,censored=0;
  while(winner(w)===null&&w.battle.round<=limit){
    playCurrentPhase(w);
    if(winner(w)!==null){if(pending)addProbe(pending,w);pending=null;break;}
    if(w.battle.round===limit&&w.seat!==w.first){if(pending)censored++;pending=null;break;}
    const current=makeProbe(w,id);
    advancePhase(w);
    if(pending)addProbe(pending,w);
    pending=current;
    if(winner(w)!==null){addProbe(pending,w);pending=null;break;}
  }
  rows.push({id,...c,controller,winner:winner(w),rounds:w.battle.round,hp:w.actors.map(a=>a.hp),metrics:w.metrics,censoredProbes:censored,trace:w.includeTrace?w.trace:null});
  if(rows.length%12===0)writeFileSync(resolve(out,'checkpoint.json'),JSON.stringify({rows,probes}));
  if(rows.length%12===0)console.log(`${rows.length}/${cases.length*4} duels, ${probes.length} probes (${Math.round((performance.now()-started)/1000)}s)`);
}
function aggregate(rs){return {n:rs.length,wins:rs.filter(r=>r.winner===0).length,losses:rs.filter(r=>r.winner===1).length,draws:rs.filter(r=>r.winner===null).length,avgRounds:rs.reduce((n,r)=>n+r.rounds,0)/rs.length};}
function errors(ps,key){
  // No actor owns an active action phase after death. Ignore that terminal label.
  const canonical=s=>JSON.stringify(s.winner===null?s:{...s,seat:null});
  return {n:ps.length,ownHpMAE:ps.reduce((n,p)=>n+Math.abs(p[key].actors[p.origin].hp-p.actual.actors[p.origin].hp),0)/ps.length,
    opponentHpMAE:ps.reduce((n,p)=>n+Math.abs(p[key].actors[1-p.origin].hp-p.actual.actors[1-p.origin].hp),0)/ps.length,
    fullStateMatches:ps.filter(p=>canonical(p[key])===canonical(p.actual)).length,
    distanceMatches:ps.filter(p=>p[key].distance===p.actual.distance).length,
    outcomeMatches:ps.filter(p=>p[key].winner===p.actual.winner).length};
}
const summaries=['legacy','immediate','script','adaptive'].map(controller=>{
  const subset=rows.filter(r=>r.controller===controller),core=subset.filter(r=>r.group==='core'),ps=probes.filter(p=>p.controllers[0]===controller);
  return {controller,core:aggregate(core),byMajor:['ignite','sustain'].map(major=>({major,...aggregate(core.filter(r=>r.a.config.major===major)),first:aggregate(core.filter(r=>r.a.config.major===major&&r.first===0)),second:aggregate(core.filter(r=>r.a.config.major===major&&r.first===1))})),
    byDistance:[0,1,2].map(distance=>({distance,...aggregate(core.filter(r=>r.distance===distance))})),
    mirrors:['ignite','sustain','quick','heavy'].map(major=>{const rs=subset.filter(r=>r.group==='mirror'&&r.a.config.major===major);return {major,n:rs.length,firstWins:rs.filter(r=>r.winner===r.first).length,draws:rs.filter(r=>r.winner===null).length};}),
    forecasts:['legacy','fixed','adaptive'].map(model=>({model,...errors(ps,model),byGroup:['core','mirror'].map(group=>({group,...errors(ps.filter(p=>rows[p.id].group===group),model)})),bySeat:[true,false].map(first=>({first,...errors(ps.filter(p=>(rows[p.id].first===p.origin)===first),model)}))}))};
});
const summary={engineHash:hash('dist/engine.mjs'),autoHash:hash('dist/auto.mjs'),runtimeHash:hash('scripts/predictive-arena.mjs'),adapterHash:hash('scripts/planner-internals.mjs'),generatorHash:hash('scripts/balance-prediction.mjs'),
  scope:'Recommended builds only; balanced preferences on both sides; 24 cross-school and 24 mirror cases per controller. No numeric changes. Deterministic counts, not human win rates.',
  candidateLimit:ADAPTIVE_CANDIDATE_LIMIT,
  truncation:'Adaptive controller ranks own-turn combinations by immediate score and keeps at most 12 for opponent-phase evaluation, reserving stop/charge/heal/move/guard/interrupt candidates when available. Adaptive opponent at depth zero is approximated by immediate controller. Other known policies run exactly; symmetric reactions and initiative boundaries are explicit.',
  horizon:'Forecasts compared at original actor next phase start including burn and free charge release, or immediate death. First actor foe phase is same-round; second actor foe phase begins after both regen.',
  duels:rows.length,probes:probes.length,censoredProbes:rows.reduce((n,r)=>n+r.censoredProbes,0),summaries,elapsedSeconds:previous?.summary.elapsedSeconds??(performance.now()-started)/1000};
writeFileSync(resolve(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
writeFileSync(resolve(out,'cases.json.gz'),gzipSync(JSON.stringify({summary,rows,probes})+'\n',{level:9}));
writeFileSync(resolve(out,'duels.csv'),['group,controller,a_major,b_major,distance,first,winner,rounds,a_hp,b_hp',...rows.map(r=>[r.group,r.controller,r.a.config.major,r.b.config.major,r.distance,r.first,r.winner??'unresolved',r.rounds,...r.hp].join(','))].join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
