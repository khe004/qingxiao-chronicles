import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const root=process.argv[2]??'docs/balance/pressure-v0152',old='docs/balance/wrapup-v0151';
const read=async f=>JSON.parse(await readFile(f));
const before=await read(`${old}/final/summary.json`),after=await read(`${root}/final/summary.json`),defense=await read(`${root}/defensive/summary.json`),oldDefense=await read(`${old}/defensive/summary.json`);
assert.equal(after.measurement.executed,936);assert.equal(after.measurement.structurallyReused,0);assert.equal(defense.measurement.executed,468);assert.equal(defense.measurement.structurallyReused,0);
const {label:oldLabel,...oldRules}=before.rules,{label:newLabel,...newRules}=after.rules;assert.deepEqual(newRules,oldRules);
const oldHashes=await read(`${old}/final/source-hashes.json`),newHashes=await read(`${root}/final/source-hashes.json`);
for(const file of ['dist/engine.mjs','dist/auto.mjs','dist/prepared.mjs','dist/active-policy.mjs','dist/recorded-battle.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs'])assert.equal(oldHashes[file],newHashes[file]);
const marker='export const TACTICAL_LOADOUTS=',oldTactics=(await readFile(`${old}/final/source/dist/tactics.mjs`,'utf8')).split(marker),newTactics=(await readFile(`${root}/final/source/dist/tactics.mjs`,'utf8')).split(marker);assert.equal(oldTactics.length,2);assert.equal(newTactics.length,2);assert.equal(newTactics[0],oldTactics[0]);
for(let i=0;i<12;i++){assert.equal(after.builds[i].id,before.builds[i].id);const id=after.builds[i].id;if(!['flame/fierce','water/tidal'].includes(id))assert.deepEqual(after.builds[i],before.builds[i]);else{const previous=before.builds[i].config.skillIds,current=after.builds[i].config.skillIds;assert.equal(previous.filter(x=>!current.includes(x)).length,1);assert.equal(current.filter(x=>!previous.includes(x)).length,1);}}
const pct=r=>(100*r.wins/r.games).toFixed(1)+'%',score=r=>`${r.wins} / ${r.losses} / ${r.draws}`;
const result={scope:'Final combined kits, all 936 balanced and 468 defensive games newly executed; unchanged skill parameters, rules except version label, and AI. Isolated candidate effects are reported separately.',versions:[oldLabel,newLabel],changes:{},targets:{},defensive:{}};
const md=['# v0.15.1 → v0.15.2 · 最终同时采用组合','','本轮只替换烈焰、潮汐各一个新招样例槽位。技能数值与AI字节保持上一版；规则只改版本标签。最终均衡936场和即时稳守468场全部新执行，历史记录不混入新增计数。每个跨派格6场、每派66场；未决也计分母，镜像另列。','','隔离筛选见[candidate-report.md](candidate-report.md)；以下同时采用组合包括两项配装对彼此及其他流派的影响。'];
for(const controller of ['prepared','immediate']){
 result.changes[controller]={};result.targets[controller]={};const b=before.controllers[controller],a=after.controllers[controller];
 md.push('',`## ${controller==='prepared'?'筹划均衡':'即时均衡'}`,'','| 流派 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 | 旧胜率 | 新胜率 |','| --- | ---: | ---: | ---: | ---: |');
 for(const build of after.builds){const previous=b.ranking.find(r=>r.id===build.id),current=a.ranking.find(r=>r.id===build.id);assert.equal(previous.games,66);assert.equal(current.games,66);result.changes[controller][build.id]={before:previous,after:current};md.push(`| ${build.name} | ${score(previous)} | ${score(current)} | ${pct(previous)} | ${pct(current)} |`);}
 md.push('',`全矩阵30回合未决：${b.draws}→${a.draws}场（含镜像）。`,'','### 烈焰、潮汐逐对手变化','','| 行流派 | 对手 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 |','| --- | --- | ---: | ---: |');
 for(const id of ['flame/fierce','water/tidal']){const i=after.builds.findIndex(x=>x.id===id);const foes=result.targets[controller][id]={};for(let j=0;j<12;j++){if(i===j)continue;foes[after.builds[j].id]={before:b.matrix[i][j],after:a.matrix[i][j]};md.push(`| ${after.builds[i].name} | ${after.builds[j].name} | ${score(b.matrix[i][j])} | ${score(a.matrix[i][j])} |`);}}
}
const totals=g=>({games:g.games,unresolved:g.draws,crossUnresolved:g.ranking.reduce((n,r)=>n+r.draws,0)/2,mirrorUnresolved:g.mirrors.reduce((n,r)=>n+r.draws,0)});
result.defensive={before:totals(oldDefense.controllers.immediate),after:totals(defense.controllers.immediate)};
md.push('','## 即时稳守','','| 版本 | 总场数 | 跨派未决 | 镜像未决 | 总未决 |','| --- | ---: | ---: | ---: | ---: |');
for(const [key,g]of Object.entries(result.defensive))md.push(`| ${key==='before'?'v0.15.1':'v0.15.2'} | ${g.games} | ${g.crossUnresolved} | ${g.mirrorUnresolved} | ${g.unresolved} |`);
md.push('','[完整均衡12×12](final/report.md) · [完整稳守12×12](defensive/report.md)。固定配装、固定AI、三距离与交换先手的结果，不能视为真人或所有六槽的胜率；总体范围改善不能替代0/6、6/6极端格与长局检查。','');
await writeFile(`${root}/comparison.json`,JSON.stringify(result,null,2));await writeFile(`${root}/comparison.md`,md.join('\n'));
console.log({prepared:result.changes.prepared['flame/fierce'],tidal:result.changes.prepared['water/tidal'],defensive:result.defensive});
