import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {variants,blobHash} from './sustain-variants.mjs';
const out='docs/balance/sustain-recovery',baseDir='docs/balance/charge-window',started=performance.now();
mkdirSync(out,{recursive:true});
const baseSummary=JSON.parse(readFileSync(baseDir+'/summary.json','utf8'));
const base=JSON.parse(gunzipSync(readFileSync(baseDir+'/matches.json.gz'))).matches.filter(r=>r.a.config.major==='sustain'||r.b.config.major==='sustain');
assert.equal(base.length,888);assert.equal(blobHash(readFileSync('dist/auto.mjs')),baseSummary.autoHash,'Controller must match the last published baseline');
const experimental=await variants(),candidates=[];let executions=0;
function aggregate(rows,seat){const n=rows.length,wins=rows.filter(r=>r.winner===seat).length,draws=rows.filter(r=>r.winner===null).length;return {n,wins,losses:n-wins-draws,draws,winRate:n?wins/n:0,avgRounds:n?rows.reduce((s,r)=>s+r.rounds,0)/n:0,maxRounds:n?Math.max(...rows.map(r=>r.rounds)):0};}
function paired(before,after){assert.equal(before.length,after.length);return {n:before.length,changedWinner:after.filter((r,i)=>r.winner!==before[i].winner).length,lossesIntroduced:after.filter((r,i)=>before[i].winner===0&&r.winner!==0).length,winsIntroduced:after.filter((r,i)=>before[i].winner!==0&&r.winner===0).length};}
function summarize(rows){
  const core=rows.filter(r=>r.group==='core'),loadouts=rows.filter(r=>r.group==='loadout'&&r.a.config.major==='sustain'),mirror=rows.filter(r=>r.group==='mirror');
  const matrix=['quick','heavy'].map(sword=>({sword,all:aggregate(core.filter(r=>r.b.config.major===sword),0),mid:aggregate(core.filter(r=>r.b.config.major===sword&&r.distance===1),0)}));
  const byDistance=[0,1,2].map(distance=>({distance,...aggregate(core.filter(r=>r.distance===distance),0)}));
  const byStyle=['balanced','aggressive','defensive','burst'].map(style=>({style,...aggregate(core.filter(r=>r.prefs[0]===style),0)}));
  const initiative={first:aggregate(core.filter(r=>r.first===0),0),second:aggregate(core.filter(r=>r.first===1),0),firstWinner:core.filter(r=>r.winner===r.first).length,n:core.length,pairedFlips:core.filter((r,i)=>i%2===0&&r.winner!==core[i+1].winner).length,mirror:{n:mirror.length,firstWins:mirror.filter(r=>r.winner===r.first).length,draws:mirror.filter(r=>r.winner===null).length}};
  const groups=new Map();for(const r of loadouts){const key=r.a.config.skillIds.join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  const ranked=[...groups.values()].map(rs=>({skillIds:rs[0].a.config.skillIds,excluded:rs[0].excluded,...aggregate(rs,0)})).sort((a,b)=>b.winRate-a.winRate||a.avgRounds-b.avgRounds);
  const alternativeSword=rows.filter(r=>r.group==='loadout'&&r.a.key==='sword');
  return {core:aggregate(core,0),matrix,byDistance,byStyle,initiative,ownLoadouts:aggregate(loadouts,0),opponentSwordLoadouts:aggregate(alternativeSword,1),best:ranked.slice(0,3),worst:ranked.slice(-3),draws:rows.filter(r=>r.winner===null).length};
}
try{
  for(const candidate of experimental.list){
    const rows=[];let verified=0;
    for(let i=0;i<base.length;i++){
      const old=base[i],options={prefs:old.prefs,distance:old.distance,first:old.first};
      let result;
      if(candidate.recovery===6){
        if(old.group==='core'){
          result=candidate.arena.duel(old.a,old.b,options);executions++;verified++;
          for(const key of ['winner','rounds','hp','metrics','trace'])assert.deepEqual(result[key],old[key],`6-HP control differs at ${i}: ${key}`);
        }
        result=Object.fromEntries(['winner','rounds','hp','metrics','trace'].map(k=>[k,old[k]]));
      }else{result=candidate.arena.duel(old.a,old.b,options);executions++;}
      rows.push({...old,...result});
      if(executions%100===0){writeFileSync(out+'/checkpoint.json',JSON.stringify({recovery:candidate.recovery,completed:i+1,executions}));console.log(`${executions} executions completed (${Math.round((performance.now()-started)/1000)} s)`);}
    }
    const originalCore=base.filter(r=>r.group==='core'),core=rows.filter(r=>r.group==='core');
    candidates.push({recovery:candidate.recovery,engineHash:candidate.engineHash,autoHash:candidate.autoHash,baselineReused:candidate.recovery===6,verifiedBaselineCore:verified,summary:summarize(rows),pairedCoreVs6:paired(originalCore,core),matches:rows});
  }
}finally{experimental.cleanup();}
const head=readFileSync('.git/HEAD','utf8').trim(),sourceCommit=head.startsWith('ref: ')?readFileSync('.git/'+head.slice(5),'utf8').trim():head;
const summary={sourceCommit,baseline:baseSummary.sourceCommit,baselineEngineHash:baseSummary.engineHash,autoHash:baseSummary.autoHash,deterministic:true,scope:'Only the sustain first-wood bonus recovery varies; candidate engines and forecast controllers share the same isolated modules.',executions,scenarioCountsPerValue:{core:192,mirror:24,loadout:672,total:888},baselineReusedScenarios:888,baselineCoreRerun:192,elapsedSeconds:(performance.now()-started)/1000,candidates:candidates.map(({matches,...c})=>c)};
const raw=JSON.stringify({summary,candidates})+'\n';writeFileSync(out+'/matches.json',raw);writeFileSync(out+'/matches.json.gz',gzipSync(raw,{level:9}));writeFileSync(out+'/summary.json',JSON.stringify(summary,null,2)+'\n');
writeFileSync(out+'/matches.csv',['recovery,baseline_reused,group,a_class,a_major,a_skills,b_class,b_major,b_skills,a_style,b_style,start_distance,first,winner,rounds,a_hp,b_hp',...candidates.flatMap(c=>c.matches.map(r=>[c.recovery,c.baselineReused,r.group,r.a.key,r.a.config.major,r.a.config.skillIds.join('|'),r.b.key,r.b.config.major,r.b.config.skillIds.join('|'),...r.prefs,r.distance,r.first,r.winner??'draw',r.rounds,...r.hp].join(',')))].join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
