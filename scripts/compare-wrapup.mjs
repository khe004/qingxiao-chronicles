import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';
const root=process.argv[2]??'docs/balance/wrapup-v0151',old=JSON.parse(await readFile('docs/balance/tactical-v015/final/summary.json')),current=JSON.parse(await readFile(`${root}/final/summary.json`)),defense=JSON.parse(await readFile(`${root}/defensive/summary.json`));
assert.equal(current.measurement.executed,936);assert.equal(defense.measurement.executed,468);
const md=['# v0.15 → v0.15.1最终采用组合对照','','两版均为均衡、新招样例、三距离、交换先手。每个流派每控制器66个跨流派固定情境，未决计入分母；镜像另列，不加入这里。新版本同含反伤判断与两套配装调整，不把全部变化归因于单项。','','单项隔离筛选见[采用与放弃理由](../../反伤与火系套路收尾-v0151.md)；最终[完整12×12](final/report.md)另含每格数据。'];
const changes={};for(const controller of ['prepared','immediate']){
 const before=old.controllers[controller],after=current.controllers[controller];md.push('',`## ${controller==='prepared'?'筹划':'即时'}均衡`,'','| 流派 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 | 旧胜率 | 新胜率 |','| --- | ---: | ---: | ---: | ---: |');changes[controller]={};
 for(const b of current.builds){const a=before.ranking.find(r=>r.id===b.id),n=after.ranking.find(r=>r.id===b.id);assert.equal(a.games,66);assert.equal(n.games,66);changes[controller][b.id]={before:a,after:n};md.push(`| ${b.name} | ${a.wins} / ${a.losses} / ${a.draws} | ${n.wins} / ${n.losses} / ${n.draws} | ${(a.wins/66*100).toFixed(1)}% | ${(n.wins/66*100).toFixed(1)}% |`);}
 md.push('',`新矩阵共${after.draws}场未决；上表跨流派部分与镜像未决分别见完整表。`);
}
const g=defense.controllers.immediate;md.push('','## 稳守','','即时稳守468场中'+g.draws+'场未决；跨流派'+g.ranking.reduce((n,r)=>n+r.draws,0)/2+'、镜像'+g.mirrors.reduce((n,m)=>n+m.draws,0)+'。原v0.15稳守同为39场，数量相同不代表具体状态或每一格不变。','');
await writeFile(`${root}/comparison.md`,md.join('\n'));await writeFile(`${root}/comparison.json`,JSON.stringify({scope:'Final combined version, old versus new, not isolated causal effects',changes,defensiveDraws:g.draws},null,2));console.log(Object.fromEntries(Object.entries(changes.prepared).map(([id,c])=>[id,[c.before.wins,c.after.wins]])));
