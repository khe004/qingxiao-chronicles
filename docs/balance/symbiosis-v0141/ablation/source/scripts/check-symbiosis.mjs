// Paired build/skill diagnostics. Workers change only their isolated skill data.
import assert from 'node:assert/strict';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {predictiveDuel} from './predictive-arena.mjs';
import {CLASSES,MAJORS,normalizeLoadout} from '../dist/engine.mjs';
import {TACTICAL_LOADOUTS} from '../dist/tactics.mjs';

const variants={
  baseline:{},
  'without-graft':{swap:{graft:'prune'}},
  'without-thorns':{swap:{thornscreen:'bloomguard'}},
  original:{swap:{graft:'prune',thornscreen:'bloomguard'}},
  'graft-cost-3':{graft:{cost:{wood:3}}},
  'graft-cost-4':{graft:{cost:{wood:4}}},
};
const sourceFiles=['dist/rules.mjs','dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs','dist/tactics.mjs','dist/active-policy.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs','scripts/check-symbiosis.mjs'];
if(!isMainThread){
  for(const job of workerData){
    const variant=variants[job.variant];assert.ok(variant);
    const graft=CLASSES.wood.skills.find(s=>s.id==='graft');
    // Reset before every job; no state can leak between candidates.
    graft.cost={...job.baseGraftCost};
    if(variant.graft)Object.assign(graft,variant.graft);
    const start=performance.now();
    const result=predictiveDuel(job.a,job.b,{first:job.first,distance:job.distance,
      controllers:[job.controller,job.controller],prefs:['balanced','balanced'],trace:true,limit:30});
    const {baseGraftCost,...scenario}=job;
    parentPort.postMessage({...scenario,...result,ms:performance.now()-start});
  }
}else{
  const out=process.argv[2];assert.ok(out,'Output directory required');
  const names=(process.argv.find(s=>s.startsWith('--variants='))?.split('=')[1]??'without-graft,without-thorns,original').split(',');
  assert.ok(names.every(s=>variants[s]));
  const full=process.argv.includes('--full');
  const ids=full?Object.entries(MAJORS).flatMap(([key,ms])=>Object.keys(ms).map(major=>`${key}/${major}`)).filter(id=>id!=='wood/symbiosis'):
    ['fire/ignite','sword/quick','flame/smolder','water/tidal','wood/parasitic','earth/bastion'];
  const build=id=>{const [key,major]=id.split('/');return {id,key,config:normalizeLoadout(key,{major,skillIds:TACTICAL_LOADOUTS[key][major]})};};
  const jobs=[];
  for(const variant of names)for(const id of ids)for(const controller of ['immediate','prepared'])for(const distance of (full?[0,1,2]:[1]))for(const first of [0,1]){
    const a=build('wood/symbiosis'),b=build(id);
    a.config.skillIds=a.config.skillIds.map(id=>variants[variant].swap?.[id]??id);
    assert.deepEqual(normalizeLoadout('wood',a.config),a.config);
    jobs.push({index:jobs.length,variant,a,b,controller,distance,first,baseGraftCost:{...CLASSES.wood.skills.find(s=>s.id==='graft').cost}});
  }
  await mkdir(out,{recursive:true});
  const hashes={};for(const file of sourceFiles){const data=await readFile(new URL('../'+file,import.meta.url));hashes[file]=createHash('sha256').update(data).digest('hex');await mkdir(`${out}/source/${file.split('/')[0]}`,{recursive:true});await writeFile(`${out}/source/${file}`,data);}
  await writeFile(`${out}/source-hashes.json`,JSON.stringify(hashes,null,2));
  const done=[];let checkpoint=Promise.resolve();
  const chunks=[jobs.filter((_,i)=>i%2===0),jobs.filter((_,i)=>i%2===1)];
  await Promise.all(chunks.filter(c=>c.length).map(chunk=>new Promise((resolve,reject)=>{
    const worker=new Worker(new URL(import.meta.url),{workerData:chunk});worker.on('error',reject);worker.on('exit',code=>code?reject(Error(`worker ${code}`)):resolve());
    worker.on('message',record=>{done.push(record);checkpoint=checkpoint.then(()=>writeFile(`${out}/checkpoint.json.gz`,gzipSync(JSON.stringify(done))));if(done.length%6===0)console.log(`${done.length}/${jobs.length}`);});
  })));
  await checkpoint;done.sort((a,b)=>a.index-b.index);await writeFile(`${out}/records.json.gz`,gzipSync(JSON.stringify(done)));
  const summary={games:done.length,limit:30,variants,scope:full?'all 11 other builds, 3 distances, both initiative orders':'six representative builds, middle distance, both initiative orders',controllers:['immediate','prepared'],results:{}};
  for(const variant of names){summary.results[variant]={};for(const controller of summary.controllers){const rs=done.filter(r=>r.variant===variant&&r.controller===controller);summary.results[variant][controller]={games:rs.length,wins:rs.filter(r=>r.winner===0).length,losses:rs.filter(r=>r.winner===1).length,unresolved:rs.filter(r=>r.winner===null).length,byOpponent:Object.fromEntries(ids.map(id=>{const os=rs.filter(r=>r.b.id===id);return [id,{games:os.length,wins:os.filter(r=>r.winner===0).length,unresolved:os.filter(r=>r.winner===null).length}];}))};}}
  await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary.results));
}
