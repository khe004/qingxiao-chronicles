import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {healVariants} from './heal-variants.mjs';
import {blobHash} from './sustain-variants.mjs';
const dir='docs/balance/heal-recovery',started=performance.now();mkdirSync(dir,{recursive:true});
const decode=path=>JSON.parse(gunzipSync(readFileSync(path))),sig=r=>JSON.stringify([r.group,r.a,r.b,r.prefs,r.distance,r.first]);
const previous=decode('docs/balance/charge-window/matches.json.gz'),sustain=decode('docs/balance/sustain-recovery/matches.json.gz'),replacements=new Map(sustain.candidates.find(c=>c.recovery===2).matches.map(r=>[sig(r),r]));
assert.equal(replacements.size,888);
const base=previous.matches.map(r=>replacements.get(sig(r))??r);assert.equal(new Set(base.map(sig)).size,1824);assert.equal(base.filter(r=>replacements.has(sig(r))).length,888);
assert.equal(blobHash(readFileSync('dist/auto.mjs')),sustain.summary.autoHash,'Freeze controller during single-factor tests');
const screen=base.filter(r=>r.group==='core'||r.group==='mirror'&&r.a.key==='fire');assert.equal(screen.length,432);
const head=readFileSync('.git/HEAD','utf8').trim(),sourceCommit=head.startsWith('ref: ')?readFileSync('.git/'+head.slice(5),'utf8').trim():head;
const v=await healVariants();let executions=0;
const info=c=>({id:c.id,heal:c.heal,clear:c.clear,engineHash:c.engineHash,autoHash:c.autoHash});
function save(name,data){const raw=JSON.stringify(data)+'\n';writeFileSync(`${dir}/${name}.raw.json`,raw);writeFileSync(`${dir}/${name}.json.gz`,gzipSync(raw,{level:9}));}
function agg(rows,seat){const n=rows.length,wins=rows.filter(r=>r.winner===seat).length,draws=rows.filter(r=>r.winner===null).length;return {n,wins,losses:n-wins-draws,draws,winRate:n?wins/n:0,avgRounds:n?rows.reduce((s,r)=>s+r.rounds,0)/n:0,maxRounds:n?Math.max(...rows.map(r=>r.rounds)):0};}
function stats(rows){
  const core=rows.filter(r=>r.group==='core'),mirrors=rows.filter(r=>r.group==='mirror');
  return {core:agg(core,0),byMajor:['ignite','sustain'].map(major=>{const rs=core.filter(r=>r.a.config.major===major);return {major,...agg(rs,0),matrix:['quick','heavy'].map(sword=>({sword,all:agg(rs.filter(r=>r.b.config.major===sword),0),mid:agg(rs.filter(r=>r.b.config.major===sword&&r.distance===1),0)})),distance:[0,1,2].map(distance=>({distance,...agg(rs.filter(r=>r.distance===distance),0)})),styles:['balanced','aggressive','defensive','burst'].map(style=>({style,...agg(rs.filter(r=>r.prefs[0]===style),0)})),first:agg(rs.filter(r=>r.first===0),0),second:agg(rs.filter(r=>r.first===1),0),ownLoadouts:agg(rows.filter(r=>r.group==='loadout'&&r.a.key==='fire'&&r.a.config.major===major),0),opponentLoadouts:agg(rows.filter(r=>r.group==='loadout'&&r.a.key==='sword'&&r.b.config.major===major),1)};}),mirrors:['ignite','sustain'].map(major=>{const rs=mirrors.filter(r=>r.a.config.major===major);return {major,n:rs.length,firstWins:rs.filter(r=>r.winner===r.first).length,draws:rs.filter(r=>r.winner===null).length,avgRounds:rs.length?rs.reduce((s,r)=>s+r.rounds,0)/rs.length:0};}),draws:rows.filter(r=>r.winner===null).length};
}
function execute(c,old){executions++;const result=c.arena.duel(old.a,old.b,{prefs:old.prefs,distance:old.distance,first:old.first});if(executions%100===0)console.log(`${executions} executions (${Math.round((performance.now()-started)/1000)} s)`);return {...old,...result};}
function tactical(c,major,layers,defender){
  executions++;const arena=c.arena.createArena(c.arena.build('fire',major),c.arena.build('fire','ignite'),{prefs:['balanced',defender],distance:1});
  const a=arena.context.actors[0],e=arena.context.actors[1];a.hp=130;a.qi={metal:0,wood:4,water:0,fire:2,earth:0,any:1};a.burn=layers;a.burnTurns=3;
  const initial=[a.hp,e.hp];c.arena.playPhase(arena,0,{forceFirst:'heal'});if(a.hp&&e.hp)c.arena.playPhase(arena,1);if(a.hp&&e.hp){c.arena.startRound(arena,2);c.arena.playPhase(arena,0);}
  return {major,layers,defender,...c.arena.finishArena(arena,arena.battle.round),hpSwing:(initial[1]-e.hp)-(initial[0]-a.hp),remainingBurn:a.burn,initialHp:initial};
}
try{
  const expand=process.argv.indexOf('--expand');
  if(expand===-1){
    const candidates=[];let verified=0;
    for(const c of v.list){
      const rows=[];
      for(const old of screen){
        let r;
        if(c.id==='base'){
          if(old.group==='mirror'||old.prefs[1]==='balanced'){r=execute(c,old);verified++;for(const key of ['winner','rounds','hp','metrics','trace'])assert.deepEqual(r[key],old[key],`Control differs: ${sig(old)} / ${key}`);}
          r=old;
        }else if(c.id==='clear2'&&old.group==='core')r=old;
        else r=execute(c,old);
        rows.push(r);
      }
      const tactics=[];for(const major of ['ignite','sustain'])for(const layers of [1,3,5])for(const defender of ['balanced','aggressive','defensive','burst'])tactics.push(tactical(c,major,layers,defender));
      const summary=stats(rows);candidates.push({...info(c),summary,matches:rows,tactical:tactics});
      writeFileSync(dir+'/checkpoint.json',JSON.stringify({executions,completed:candidates.map(({matches,tactical,...c})=>c)}));console.log(JSON.stringify({candidate:c.id,core:summary.byMajor.map(m=>({major:m.major,wins:m.wins,n:m.n}))}));
    }
    const summary={sourceCommit,baselineSources:{charge:previous.method,sustain:sustain.summary.sourceCommit},autoHash:sustain.summary.autoHash,verifiedBaseline:verified,executions,screenPerCandidate:{core:384,fireMirror:48,tactical:24},clearCrossClassStructurallyReused:384,elapsedSeconds:(performance.now()-started)/1000,candidates:candidates.map(({matches,tactical,...c})=>c)};
    assert.equal(verified,144);save('screen',{summary,candidates});writeFileSync(dir+'/screen-summary.json',JSON.stringify(summary,null,2)+'\n');
    console.log(JSON.stringify({done:'screen',executions,seconds:summary.elapsedSeconds}));
  }else{
    const id=process.argv[expand+1],c=v.list.find(c=>c.id===id);assert.ok(c&&id!=='base','--expand requires a tested candidate');
    const screened=decode(dir+'/screen.json.gz'),tested=screened.candidates.find(r=>r.id===id);assert.equal(c.engineHash,tested.engineHash);assert.equal(c.autoHash,tested.autoHash);
    const cached=new Map(tested.matches.map(r=>[sig(r),r])),rows=[];let screenReused=0,structurallyReused=0;
    for(const old of base){
      let r;
      if(cached.has(sig(old))){r=cached.get(sig(old));screenReused++;}
      else if(c.id==='clear2'&&old.a.key!==old.b.key||![old.a,old.b].some(a=>a.key==='fire'&&a.config.skillIds.includes('heal'))){r=old;structurallyReused++;}
      else r=execute(c,old);
      rows.push(r);
      if(executions%100===0)writeFileSync(dir+'/checkpoint.json',JSON.stringify({stage:'expand',id,executions,rows:rows.length}));
    }
    const summary={sourceCommit,...info(c),screenExecutions:screened.summary.executions,additionalExecutions:executions,screenReused,structurallyReused,rows:rows.length,summary:stats(rows),baselineSummary:stats(base),elapsedSeconds:(performance.now()-started)/1000};
    save('full',{summary,matches:rows,baseline:base});writeFileSync(dir+'/full-summary.json',JSON.stringify(summary,null,2)+'\n');
    console.log(JSON.stringify({done:'expand',id,executions,seconds:summary.elapsedSeconds}));
  }
}finally{v.cleanup();}
