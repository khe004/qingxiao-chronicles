import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {rangeVariants} from './range-variants.mjs';
import {blobHash} from './sustain-variants.mjs';
export const sig=r=>JSON.stringify([r.group,r.a,r.b,r.prefs,r.distance,r.first]);
export function aggregate(rows,seat=0){const n=rows.length,wins=rows.filter(r=>r.winner===seat).length,draws=rows.filter(r=>r.winner===null).length;return {n,wins,draws,winRate:n?wins/n:0,avgRounds:n?rows.reduce((s,r)=>s+r.rounds,0)/n:0};}
export function rangeStats(rows){
  const core=rows.filter(r=>r.group==='core');
  return {byMajor:['ignite','sustain'].map(major=>{const rs=core.filter(r=>r.a.config.major===major);return {major,...aggregate(rs),distance:[0,1,2].map(distance=>({distance,...aggregate(rs.filter(r=>r.distance===distance))})),first:aggregate(rs.filter(r=>r.first===0)),second:aggregate(rs.filter(r=>r.first===1)),matrix:['quick','heavy'].map(sword=>({sword,...aggregate(rs.filter(r=>r.b.config.major===sword))})),styles:['balanced','aggressive','defensive','burst'].map(style=>({style,...aggregate(rs.filter(r=>r.prefs[0]===style))})),ownLoadouts:aggregate(rows.filter(r=>r.group==='loadout'&&r.a.key==='fire'&&r.a.config.major===major)),opponentLoadouts:aggregate(rows.filter(r=>r.group==='loadout'&&r.a.key==='sword'&&r.b.config.major===major),1),avgSwordApproaches:rs.reduce((n,r)=>n+(r.metrics[1].actions.near||0),0)/rs.length,avgFireRetreats:rs.reduce((n,r)=>n+(r.metrics[0].actions.far||0),0)/rs.length,avgSwordEvades:rs.reduce((n,r)=>n+(r.metrics[1].reactions.evade||0),0)/rs.length,avgFireEvades:rs.reduce((n,r)=>n+(r.metrics[0].reactions.evade||0),0)/rs.length};}),mirrors:['ignite','sustain','quick','heavy'].map(major=>{const rs=rows.filter(r=>r.group==='mirror'&&r.a.config.major===major);return {major,n:rs.length,firstWins:rs.filter(r=>r.winner===r.first).length,draws:rs.filter(r=>r.winner===null).length};}),draws:rows.filter(r=>r.winner===null).length};
}
const isMain=process.argv[1]?.endsWith('/balance-range.mjs');
if(isMain){
  const dir='docs/balance/range-movement',started=performance.now();mkdirSync(dir,{recursive:true});
  const decode=p=>JSON.parse(gunzipSync(readFileSync(p))),snapshot=dir+'/source.json.gz',previous=decode('docs/balance/heal-recovery/full.json.gz'),base=previous.matches;
  assert.equal(base.length,1824);
  if(!existsSync(snapshot)){
    const head=readFileSync('.git/HEAD','utf8').trim(),commit=head.startsWith('ref: ')?readFileSync('.git/'+head.slice(5),'utf8').trim():head;
    const source={commit,engine:readFileSync('dist/engine.mjs','utf8'),auto:readFileSync('dist/auto.mjs','utf8'),arena:readFileSync('scripts/balance-arena.mjs','utf8')};
    assert.equal(blobHash(source.engine),previous.summary.engineHash);assert.equal(blobHash(source.auto),previous.summary.autoHash);writeFileSync(snapshot,gzipSync(JSON.stringify(source),{level:9}));
  }
  const v=await rangeVariants({snapshotPath:snapshot}),info=c=>Object.fromEntries(['id','label','short','approachRefund','engineHash','autoHash','arenaHash','immediateHash'].map(k=>[k,c[k]]));
  assert.equal(v.list[0].engineHash,previous.summary.engineHash);assert.equal(v.list[0].autoHash,previous.summary.autoHash);
  let executions=0;
  const save=(name,data)=>{const raw=JSON.stringify(data)+'\n';writeFileSync(dir+'/'+name+'.raw.json',raw);writeFileSync(dir+'/'+name+'.json.gz',gzipSync(raw,{level:9}));};
  const unchanged=(c,r)=>c.approachRefund?[r.a,r.b].every(a=>a.key!=='sword'):[r.a,r.b].every(a=>a.key!=='fire'||!a.config.skillIds.some(id=>c.short.includes(id)));
  function execute(c,old){executions++;const result=c.arena.duel(old.a,old.b,{prefs:old.prefs,distance:old.distance,first:old.first});if(executions%100===0)console.log(`${executions} duels (${Math.round((performance.now()-started)/1000)} s)`);return {...old,...result};}
  try{
    const expand=process.argv.indexOf('--expand'),diagnose=process.argv.indexOf('--diagnose'),extra=process.argv.indexOf('--screen-extra'),long=process.argv.indexOf('--long');
    if(extra!==-1){
      const id=process.argv[extra+1],c=v.list.find(c=>c.id===id);assert.ok(c&&id!=='base');const screen=decode(dir+'/screen.json.gz');assert.ok(!screen.candidates.some(x=>x.id===id),'Candidate already screened');
      let reused=0;const rows=base.filter(r=>r.group!=='loadout').map(old=>{if(unchanged(c,old)){reused++;return old;}return execute(c,old);});
      const candidate={...info(c),actualExecutions:executions,structurallyReused:reused,summary:rangeStats(rows),matches:rows};screen.candidates.push(candidate);screen.summary.executions+=executions;screen.summary.elapsedSeconds+=(performance.now()-started)/1000;
      screen.summary.candidates=screen.candidates.map(({matches,...c})=>c);save('screen',screen);writeFileSync(dir+'/screen-summary.json',JSON.stringify(screen.summary,null,2)+'\n');console.log(JSON.stringify({candidate:id,actualExecutions:executions,major:candidate.summary.byMajor,mirrors:candidate.summary.mirrors,draws:candidate.summary.draws}));
    }else if(long!==-1){
      const screen=decode(dir+'/screen.json.gz'),candidates=[];
      for(const tested of screen.candidates){const c=v.list.find(c=>c.id===tested.id),rows=[];for(const old of tested.matches.filter(r=>r.winner===null)){executions++;rows.push({...old,at30:{hp:old.hp,metrics:old.metrics},...c.arena.duel(old.a,old.b,{prefs:old.prefs,distance:old.distance,first:old.first,limit:90})});}if(rows.length)candidates.push({...info(c),matches:rows});}
      save('long',{summary:{sourceCommit:v.source.commit,executions,limit:90,description:'Rerun unresolved screening cases from initial state; separate from the 30-round matrix. These are repeat executions, not new unique configurations.'},candidates});console.log(JSON.stringify({longExecutions:executions,candidates:candidates.map(c=>({id:c.id,rows:c.matches.map(r=>({winner:r.winner,rounds:r.rounds,hp:r.hp}))}))}));
    }else if(expand!==-1){
      const id=process.argv[expand+1],c=v.list.find(c=>c.id===id);assert.ok(c&&id!=='base');const screen=decode(dir+'/screen.json.gz'),tested=screen.candidates.find(c=>c.id===id);assert.equal(tested.engineHash,c.engineHash);
      const cached=new Map(tested.matches.map(r=>[sig(r),r])),rows=[];let screenReused=0,structurallyReused=0;
      for(const old of base){let r;if(cached.has(sig(old))){r=cached.get(sig(old));screenReused++;}else if(unchanged(c,old)){r=old;structurallyReused++;}else r=execute(c,old);rows.push(r);}
      const summary={sourceCommit:v.source.commit,...info(c),rows:rows.length,additionalExecutions:executions,screenReused,structurallyReused,summary:rangeStats(rows),baselineSummary:rangeStats(base),elapsedSeconds:(performance.now()-started)/1000};
      save('full',{summary,matches:rows,baseline:base});writeFileSync(dir+'/full-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
    }else if(diagnose!==-1){
      const id=process.argv[diagnose+1],tested=v.list.find(c=>c.id===id);assert.ok(tested&&id!=='base');const pilot=base.filter(r=>r.group==='core'&&r.prefs.every(p=>p==='balanced'));assert.equal(pilot.length,24);
      const candidates=[];
      for(const c of [v.list[0],tested]){
        const rows=[];
        for(const controllers of [['script','script'],['immediate','script'],['script','immediate'],['immediate','immediate']])for(const old of pilot){
          executions++;const a=c.arena.createArena(old.a,old.b,{prefs:old.prefs,distance:old.distance,first:old.first,controllers,trace:controllers.every(x=>x==='script')}),probes=[];let round;
          for(round=1;round<=30;round++){
            c.arena.startRound(a,round);c.arena.playPhase(a,old.first);if(a.context.actors.some(x=>x.hp<=0))break;
            const predicted=old.first===0?c.arena.forecastEnemyPhase(a,0):null;
            c.arena.playPhase(a,1-old.first);
            if(predicted)probes.push({round,predicted,actual:{hp:a.context.actors.map(x=>x.hp),shield:a.context.actors.map(x=>x.shield),distance:a.battle.distance}});
            if(a.context.actors.some(x=>x.hp<=0))break;
          }
          rows.push({...old,...c.arena.finishArena(a,Math.min(round,30)),controllers,probes});
        }
        const summary=[['script','script'],['immediate','script'],['script','immediate'],['immediate','immediate']].map(controllers=>({controllers,byMajor:['ignite','sustain'].map(major=>({major,...aggregate(rows.filter(r=>r.a.config.major===major&&r.controllers.join()===controllers.join()))}))}));
        candidates.push({...info(c),summary,matches:rows});console.log(JSON.stringify({diagnostic:c.id,summary}));
      }
      const summary={sourceCommit:v.source.commit,selected:id,executions,comparison:'Immediate controller changes only score horizon; not optimal play. Probes compare the public-script forecast of one enemy phase with actual symmetric-controller play; first-acting fire only.',elapsedSeconds:(performance.now()-started)/1000};save('diagnostics-'+id,{summary,candidates});save('diagnostics',{summary,candidates});
    }else{
      const screen=base.filter(r=>r.group!=='loadout'),candidates=[];assert.equal(screen.length,480);let verified=0;
      for(const c of v.list){const rows=[];let actual=0,reused=0;
        for(const old of screen){let r;
          if(c.id==='base'){
            if(old.group==='mirror'||old.prefs[1]==='balanced'){r=execute(c,old);actual++;verified++;for(const k of ['winner','rounds','hp','metrics','trace'])assert.deepEqual(r[k],old[k],'Baseline control '+sig(old)+' / '+k);}
            r=old;reused++;
          }else if(unchanged(c,old)){r=old;reused++;}else{r=execute(c,old);actual++;}
          rows.push(r);
        }
        const summary=rangeStats(rows);candidates.push({...info(c),actualExecutions:actual,structurallyReused:c.id==='base'?0:reused,summary,matches:rows});writeFileSync(dir+'/checkpoint.json',JSON.stringify({executions,completed:candidates.map(({matches,...c})=>c)}));console.log(JSON.stringify({candidate:c.id,major:summary.byMajor}));
      }
      assert.equal(verified,192);const summary={sourceCommit:v.source.commit,baselineInput:'docs/balance/heal-recovery/full.json.gz',baselineHash:blobHash(readFileSync('docs/balance/heal-recovery/full.json.gz')),verifiedBaseline:verified,executions,scenariosPerCandidate:480,elapsedSeconds:(performance.now()-started)/1000,candidates:candidates.map(({matches,...c})=>c)};
      save('screen',{summary,candidates});writeFileSync(dir+'/screen-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({done:'screen',executions,seconds:summary.elapsedSeconds}));
    }
  }finally{v.cleanup();}
}
