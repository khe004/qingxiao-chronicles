import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
const root=process.argv[2]??'docs/balance/cleanse-v0153',old='docs/balance/pressure-v0152';
const json=async f=>JSON.parse(await readFile(f)),records=async f=>JSON.parse(gunzipSync(await readFile(f)));
const row=s=>`${s.wins} / ${s.losses} / ${s.draws}`,pct=s=>`${(100*s.wins/s.games).toFixed(1)}%`;
const md=['# v0.15.2 → v0.15.3 · 净化取舍','','净息需要自身有灼烧，清尽并恢复8气血；涤尘维持18回复、每回合一次，清除上限5→1层。首次付费水法仍清1层。所有配装、伤害、防御、五行、距离与AI沿用上一版。回顾不再将净息计为8点治疗溢出。','','以下为两项同时采用的完整新测：均衡936场、即时稳守468场；每派每控制器66个跨派情境，每格6场，镜像另列。'];
const result={before:old,after:root,finalExecutions:1404,controllers:{}};
for(const [suite,controller,title] of [['final','prepared','筹划均衡'],['final','immediate','即时均衡'],['defensive','immediate','即时稳守']]){
 const a=await json(`${old}/${suite}/summary.json`),b=await json(`${root}/${suite}/summary.json`);
 assert.deepEqual(a.builds,b.builds);assert.deepEqual(a.limits,b.limits);assert.equal(b.measurement.structurallyReused,0);
 const x=a.controllers[controller],y=b.controllers[controller],rows=a.builds.map(build=>({id:build.id,name:build.name,before:x.ranking.find(r=>r.id===build.id),after:y.ranking.find(r=>r.id===build.id)}));
 const extremes=[];for(let i=0;i<12;i++)for(let j=i+1;j<12;j++){const cell=y.matrix[i][j];if(cell.wins===0||cell.losses===0)extremes.push({a:a.builds[i].id,b:a.builds[j].id,...cell});}
 result.controllers[`${suite}/${controller}`]={rows,drawsBefore:x.draws,drawsAfter:y.draws,extremes};
 md.push('',`## ${title}`,'','| 流派 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 | 旧胜率 | 新胜率 |','| --- | ---: | ---: | ---: | ---: |');
 for(const r of rows)md.push(`| ${r.name} | ${row(r.before)} | ${row(r.after)} | ${pct(r.before)} | ${pct(r.after)} |`);
 md.push('',`全矩阵未决（含镜像）：${x.draws}→${y.draws}。`,'','### 烈焰、潮汐逐对手','','| 行流派 | 对手 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 |','| --- | --- | ---: | ---: |');
 for(const id of ['flame/fierce','water/tidal']){const i=a.builds.findIndex(b=>b.id===id);for(let j=0;j<12;j++)if(i!==j)md.push(`| ${a.builds[i].name} | ${a.builds[j].name} | ${row(x.matrix[i][j])} | ${row(y.matrix[i][j])} |`);}
}
// All actors lacking native burns must retain actual winners, HP and full traces.
let unchanged=0;for(const suite of ['final','defensive']){
 const a=await records(`${old}/${suite}/records.json.gz`),b=await records(`${root}/${suite}/records.json.gz`);assert.equal(a.length,b.length);
 for(let i=0;i<a.length;i++){for(const key of ['index','a','b','controller','tendency','distance','first','kind'])assert.deepEqual(a[i][key],b[i][key]);
 if([a[i].a,a[i].b].every(actor=>!['fire','flame'].includes(actor.key))){for(const key of ['winner','hp','rounds','trace','metrics'])assert.deepEqual(a[i][key],b[i][key],`Non-burn regression ${suite}/${i}/${key}`);unchanged++;}
 }
}
const context=r=>JSON.stringify([r.a,r.b,r.controller,r.tendency,r.distance,r.first]);
const finalRecords=[...await records(`${root}/final/records.json.gz`),...await records(`${root}/defensive/records.json.gz`)];
const byContext=new Map(finalRecords.map(r=>[context(r),r]));
const screened=await records(`${root}/rinse-clear-1/records.json.gz`);
const normalizePurifyLog=trace=>trace.map(event=>{const match=event.text.match(/(?:恢复 8 气血，清除灼烧|清除 \d+ 层灼烧(?:，恢复 \d+ 气血)?)。$/);return match?{...event,type:'purify',text:event.text.slice(0,match.index)+'净息清尽灼烧，恢复至多8气血。'}:event;});
for(const r of screened){const matched=byContext.get(context(r));assert.ok(matched);for(const field of ['winner','hp','rounds','metrics'])assert.deepEqual(matched[field],r[field],`Accepted clear1 differs from screened actual outcome: ${r.index}/${field}`);assert.deepEqual(normalizePurifyLog(matched.trace),normalizePurifyLog(r.trace),`Accepted clear1 normalized log differs: ${r.index}`);}
result.matchedIsolatedClearOneScenarios=screened.length;
result.unchangedNonBurnScenarios=unchanged;
md.push('',`不含火木／烈焰的${unchanged}个完整情境，其胜负、气血、回合、纪要和动作统计与旧版逐项一致。清1层首轮的90个情境与最终新测的实际胜负、气血、回合与统计逐项一致；净息日志由固定“恢复8”改为实际恢复和清除层数，规范化该条日志后完整纪要一致；两批记录仍各自归档，最终表使用新的完整组。其余对局不能从隔离候选拼接，均以最终新测为准。`,'','[均衡完整12×12](final/report.md) · [稳守完整12×12](defensive/report.md)。极端格完整清单见[comparison.json](comparison.json)，未决计入分母；这是固定AI六槽结果，不是真人胜率。','');
await writeFile(`${root}/comparison.md`,md.join('\n'));await writeFile(`${root}/comparison.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({unchangedNonBurnScenarios:unchanged,controllers:Object.fromEntries(Object.entries(result.controllers).map(([k,v])=>[k,{draws:v.drawsAfter,rows:v.rows.map(r=>({id:r.id,wins:r.after.wins,losses:r.after.losses,draws:r.after.draws}))}]))}));
