// Offline balance measurement; never changes the shipped rules or browser AI.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {predictiveDuel} from './predictive-arena.mjs';
import {MAJORS,normalizeLoadout} from '../dist/engine.mjs';

if(!isMainThread){
  for(const job of workerData){
    const {index,...scenario}=job,start=performance.now();
    const result=predictiveDuel(scenario.a,scenario.b,{
      first:scenario.first,distance:scenario.distance,limit:30,
      prefs:['balanced','balanced'],controllers:[scenario.controller,scenario.controller],trace:true,
    });
    parentPort.postMessage({index,...scenario,...result,ms:performance.now()-start});
  }
}else{
  const out=process.argv[2]??'/tmp/qingxiao-twelve-school';
  const keys=['fire','sword','flame','water','wood','earth'];
  const builds=keys.flatMap(key=>Object.entries(MAJORS[key]).map(([major,m])=>({
    id:`${key}/${major}`,name:m.name,key,config:normalizeLoadout(key,{major}),
  })));
  assert.equal(builds.length,12);
  const jobs=[];
  for(const controller of ['immediate','prepared'])
    for(let i=0;i<builds.length;i++)for(let j=i;j<builds.length;j++)
      for(const distance of [0,1,2])for(const first of [0,1])
        jobs.push({index:jobs.length,a:builds[i],b:builds[j],first,distance,controller,kind:i===j?'mirror':'cross'});
  assert.equal(jobs.length,936);
  await mkdir(out,{recursive:true});
  const sourceFiles=['dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs',
    'scripts/predictive-arena.mjs','scripts/planner-internals.mjs','scripts/check-twelve-school.mjs'];
  const hashes={};
  const resume=process.argv.includes('--resume');
  const previousHashes=resume?JSON.parse(await readFile(`${out}/source-hashes.json`,'utf8')):null;
  for(const name of sourceFiles){
    const data=await readFile(new URL('../'+name,import.meta.url));
    hashes[name]=createHash('sha256').update(data).digest('hex');
    if(resume&&name!=='scripts/check-twelve-school.mjs')assert.equal(hashes[name],previousHashes[name],`Resume rules changed: ${name}`);
    await mkdir(`${out}/source/${name.slice(0,name.lastIndexOf('/'))}`,{recursive:true});
    await writeFile(`${out}/source/${name}`,data);
  }
  await writeFile(`${out}/source-hashes.json`,JSON.stringify(hashes,null,2)+'\n');
  const records=resume?JSON.parse(gunzipSync(await readFile(`${out}/checkpoint.json.gz`))):Array(jobs.length);
  let complete=resume?records.length:0;
  if(resume){
    assert.equal(complete,jobs.length,'Only a completed checkpoint can be exported');
    records.forEach((r,i)=>{
      const {index,...s}=jobs[i];assert.equal(r.index,index);
      for(const key of Object.keys(s))assert.deepEqual(r[key],s[key]);
    });
  }
  const checkpoint=async()=>writeFile(`${out}/checkpoint.json.gz`,gzipSync(JSON.stringify(records.filter(Boolean))));
  if(!resume)await Promise.all([0,1].map(part=>new Promise((resolve,reject)=>{
    const worker=new Worker(new URL(import.meta.url),{workerData:jobs.filter(j=>j.index%2===part)});
    worker.on('message',record=>{
      records[record.index]=record;complete++;
      if(complete%24===0)console.log(`${complete}/${jobs.length} games complete (${record.controller})`);
    });
    worker.on('error',reject);
    worker.on('exit',code=>code===0?resolve():reject(new Error(`Worker exited ${code}`)));
  })));
  assert.equal(complete,936);assert.ok(records.every(Boolean));
  await checkpoint();
  const controllers={};
  for(const controller of ['immediate','prepared']){
    const list=records.filter(r=>r.controller===controller);
    const matrix=builds.map(()=>builds.map(()=>({games:0,wins:0,losses:0,draws:0})));
    const mirrors=builds.map(b=>({id:b.id,games:0,firstWins:0,secondWins:0,draws:0}));
    for(const r of list){
      const i=builds.findIndex(b=>b.id===r.a.id),j=builds.findIndex(b=>b.id===r.b.id);
      if(i===j){
        const m=mirrors[i];m.games++;
        if(r.winner===null)m.draws++;
        else if(r.winner===r.first)m.firstWins++;else m.secondWins++;
        continue;
      }
      for(const [row,col,seat] of [[i,j,0],[j,i,1]]){
        const c=matrix[row][col];c.games++;
        if(r.winner===null)c.draws++;else if(r.winner===seat)c.wins++;else c.losses++;
      }
    }
    for(let i=0;i<12;i++)for(let j=0;j<12;j++)if(i!==j){
      const a=matrix[i][j],b=matrix[j][i];assert.equal(a.games,6);
      assert.equal(a.wins,b.losses);assert.equal(a.draws,b.draws);
      assert.equal(a.wins+a.losses+a.draws,6);
    }
    controllers[controller]={games:list.length,crossGames:396,mirrorGames:72,
      draws:list.filter(r=>r.winner===null).length,matrix,mirrors,
      ranking:builds.map((b,i)=>{
        const totals=matrix[i].reduce((a,c)=>({games:a.games+c.games,wins:a.wins+c.wins,losses:a.losses+c.losses,draws:a.draws+c.draws}),{games:0,wins:0,losses:0,draws:0});
        assert.equal(totals.games,66);return {id:b.id,name:b.name,...totals};
      }).sort((a,b)=>b.wins-a.wins),
    };
    const csv=['流派,'+builds.map(b=>b.name).join(',')];
    matrix.forEach((row,i)=>csv.push(builds[i].name+','+row.map((c,j)=>i===j?'':(100*c.wins/c.games).toFixed(1)+'%').join(',')));
    await writeFile(`${out}/matrix-${controller}.csv`,'\uFEFF'+csv.join('\n')+'\n');
  }
  // Read metadata without a child process; sandboxed runners can reject spawnSync.
  const head=(await readFile('.git/HEAD','utf8')).trim();
  const sourceCommit=head.startsWith('ref: ')?(await readFile('.git/'+head.slice(5),'utf8')).trim():head;
  assert.match(sourceCommit,/^[0-9a-f]{40}$/);
  const summary={sourceCommit,
    builds,limits:{rounds:30,distances:[0,1,2],tendency:'balanced',loadout:'recommended six skills',
      gamesPerPairPerController:6,controllers:['immediate','prepared'],
      mirrorDiagonal:'not included in cross matrix; mirror first/second wins reported separately',
      preparedBoundary:'fixed public script; actual rival chooses again',
      deterministic:true},controllers};
  await writeFile(`${out}/records.json.gz`,gzipSync(JSON.stringify(records)));
  await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2)+'\n');
  const pct=c=>`${(100*c.wins/c.games).toFixed(1).replace('.0','')}%`;
  const md=['# 十二流派两两胜率（当前 v0.12 规则）','',
    `规则来源：\`${summary.sourceCommit}\`；共 936 场，两种 AI 各 468 场。每种 AI 中跨流派 396 场，同流派镜像 72 场。`,
    '', '每对流派近、中、远各交换先后手，共 6 场；推荐六槽、均衡倾向、30 回合上限。行对列表示行流派的获胜比例，未决也计入分母。对角线用 —，镜像先手率另列。',
    '', '这是确定性 AI 固定场景结果，不是真人胜率，也不是随机重复抽样。准备预测边界采用固定公开脚本，实际对手会重新选择。数值格局与 AI 使用功法的能力共同影响结果。',''];
  for(const controller of ['prepared','immediate']){
    const g=controllers[controller];md.push(`## ${controller==='prepared'?'准备预测 AI（主表）':'即时评分 AI（对照）'}`,'',`468 场中未决 ${g.draws} 场。`,'');
    for(const start of [0,6]){
      const columns=builds.slice(start,start+6);md.push(`### 对手 ${start+1}–${start+6}`,'',
        '| 行流派 ↓ / 对手 → | '+columns.map(b=>b.name).join(' | ')+' |',
        '| --- | '+columns.map(()=>'---:').join(' | ')+' |');
      for(let i=0;i<12;i++)md.push('| '+builds[i].name+' | '+columns.map((_,offset)=>i===start+offset?'—':pct(g.matrix[i][start+offset])).join(' | ')+' |');
      md.push('');
    }
    md.push('### 跨流派总计（每流派 66 场，剔除镜像）','','| 流派 | 胜 / 负 / 未决 | 胜率 |','| --- | ---: | ---: |');
    for(const r of g.ranking)md.push(`| ${r.name} | ${r.wins} / ${r.losses} / ${r.draws} | ${pct(r)} |`);
    md.push('','### 镜像（每流派 6 场）','','| 流派 | 先手胜 | 后手胜 | 未决 |','| --- | ---: | ---: | ---: |');
    g.mirrors.forEach((m,i)=>md.push(`| ${builds[i].name} | ${m.firstWins} | ${m.secondWins} | ${m.draws} |`));md.push('');
  }
  md.push('## 复现','','```sh',`node scripts/check-twelve-school.mjs /tmp/qingxiao-twelve-school`,'```','',
    '原始逐场结果、动作统计、完整纪要见 records.json.gz；summary.json 包含每格胜负未决场数。source/ 冻结测量源码，source-hashes.json 记录 SHA-256。','');
  await writeFile(`${out}/report.md`,md.join('\n'));
  console.log(JSON.stringify({games:complete,controllers:Object.fromEntries(Object.entries(controllers).map(([k,g])=>[k,{draws:g.draws,ranking:g.ranking}]))}));
}
