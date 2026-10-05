// Compare frozen one-slot experiments with exact historical scenarios; the
// historical references are never counted as freshly executed duels.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
const root=process.argv[2]??'docs/balance/pressure-v0152',old='docs/balance/wrapup-v0151/final';
const json=async f=>JSON.parse(await readFile(f));
const records=async f=>JSON.parse(gunzipSync(await readFile(f)));
const previous=await json(`${old}/summary.json`),historical=await records(`${old}/records.json.gz`);
const combat=['dist/rules.mjs','dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs','dist/tactics.mjs','dist/active-policy.mjs','dist/recorded-battle.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs'];
const historicalHashes=await json(`${old}/source-hashes.json`);
const target=r=>r.tag.split('/').slice(0,2).join('/');
const context=r=>JSON.stringify([r.a,r.b,r.controller,r.distance,r.first,r.tendency,r.limit??30]);
const suites={};
for(const suite of ['screen','extension']){
 const path=`${root}/${suite}`,plan=await json(`${path}/plan.json`),list=await records(`${path}/records.json.gz`),hashes=await json(`${path}/source-hashes.json`);
 assert.equal(list.length,plan.jobs.length);const indices=new Set(),contexts=new Set();
 for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(`${path}/source/${file}`)).digest('hex'),hash);
 for(const file of combat)assert.equal(hashes[file],historicalHashes[file],`Screening changed combat: ${file}`);
 for(const r of list){assert.ok(!indices.has(r.index));indices.add(r.index);const job=plan.jobs[r.index];for(const k of Object.keys(job))assert.deepEqual(r[k],job[k]);const key=r.tag+context(r);assert.ok(!contexts.has(key));contexts.add(key);}
 suites[suite]=list;
}
assert.equal(suites.screen.length,384);assert.equal(suites.extension.length,252);
function group(list){const groups={};for(const r of list){const id=target(r),seat=r.a.id===id?0:1;assert.equal([r.a,r.b][seat].id,id);const foe=[r.a,r.b][1-seat].id,key=`${r.tag}/${r.controller}`;
 const g=groups[key]??={target:id,variant:r.tag,games:0,wins:0,losses:0,unresolved:0,foes:{},actions:{}};
 const add=s=>{s.games++;s[r.winner===null?'unresolved':r.winner===seat?'wins':'losses']++;};add(g);add(g.foes[foe]??={games:0,wins:0,losses:0,unresolved:0});for(const [action,n]of Object.entries(r.metrics[seat].actions))g.actions[action]=(g.actions[action]??0)+n;
 }return groups;}
const baseline=[];
for(const id of ['flame/fierce','water/tidal'])for(const r of historical){if(r.a.id===r.b.id||![r.a.id,r.b.id].includes(id))continue;assert.equal(r.tendency,'balanced');baseline.push({...r,tag:`${id}/baseline`,baselineSource:old});}
assert.equal(baseline.length,264);
const uniqueHistoricalRecords=new Set(baseline.map(r=>r.index)).size;assert.equal(uniqueHistoricalRecords,252);
const combined=suites.screen.filter(r=>suites.extension.some(e=>e.tag===r.tag)).concat(suites.extension),seen=new Set();
for(const r of combined){const key=r.tag+context(r);assert.ok(!seen.has(key));seen.add(key);
 const id=target(r),actors=[r.a,r.b].map(b=>previous.builds.find(x=>x.id===b.id));assert.ok(actors.every(Boolean));const ref=historical.find(h=>context(h)===context({...r,a:actors[0],b:actors[1]}));assert.ok(ref,`Missing exact baseline ${r.tag}`);
 for(let i=0;i<2;i++){assert.equal(r[i?'b':'a'].id,actors[i].id);if(actors[i].id!==id)assert.deepEqual(r[i?'b':'a'],actors[i]);else{const before=actors[i].config.skillIds,after=r[i?'b':'a'].config.skillIds;assert.equal(before.filter(x=>!after.includes(x)).length,1);assert.equal(after.filter(x=>!before.includes(x)).length,1);}}
}
assert.equal(combined.length,396);
const result={newExecutions:636,historicalReferenceRecords:264,historicalUniqueRecords:uniqueHistoricalRecords,historicalNewExecutions:0,screen:group(suites.screen),confirmation:group(combined),baseline:group(baseline),scope:'One-slot isolated kits, unchanged nine combat modules, same ordered actors and full opponent config, both controllers, three ranges and both initiatives. Confirmation combines distinct frozen screening and extension scenarios; these are deterministic configurations, not independent random samples.'};
for(const g of Object.values(result.screen)){assert.equal(g.games,24);for(const f of Object.values(g.foes))assert.equal(f.games,6);}
for(const section of ['confirmation','baseline'])for(const g of Object.values(result[section])){assert.equal(g.games,66);assert.equal(Object.keys(g.foes).length,11);for(const f of Object.values(g.foes))assert.equal(f.games,6);}
await writeFile(`${root}/confirmation-baseline-records.json.gz`,gzipSync(JSON.stringify(baseline)));
await writeFile(`${root}/candidate-report.json`,JSON.stringify(result,null,2));
const names={'baseline':'v0.15.1样例','far-storm':'燃血槽→焰海','storm-trade':'烈火槽→焰海','far-combust':'燃血槽→焚尽（近中距）','cinder-trade':'烈火槽→焚灼','ebb-outlet':'贯潮槽→回潮','independent-heal':'润脉槽→涤尘','mirror-trade':'御水槽→镜屏','ebb-defense-trade':'御水槽→回潮'};
const md=['# 烈焰与潮汐 · 独立配装对照','','新执行636场：首轮384＋扩展252。确认表每个候选132场，来自首轮48＋七个其余对手84，未重复执行。264条历史基线引用来自v0.15.1的252场唯一对局（烈焰对潮汐12场供双方引用），相同九份战斗源码、配置、座次、控制器、距离、先手和30回合边界；历史引用新增执行为0。',''];
for(const [title,groups]of [['重点四对手筛选',result.screen],['全部11个对手确认',result.confirmation]]){
 md.push(`## ${title}`,'','| 主修与槽位替换 | 控制器 | 胜 / 负 / 未决 | 胜率 |','| --- | --- | ---: | ---: |');
 for(const [key,g] of Object.entries(groups))md.push(`| ${g.target} · ${names[g.variant.split('/')[2]]} | ${key.split('/').at(-1)} | ${g.wins} / ${g.losses} / ${g.unresolved} | ${(100*g.wins/g.games).toFixed(1)}% |`);
 md.push('');
}
md.push('## 全对手历史基线','','| 主修 | 控制器 | 胜 / 负 / 未决 | 胜率 |','| --- | --- | ---: | ---: |');
for(const [key,g]of Object.entries(result.baseline))md.push(`| ${g.target} | ${key.split('/').at(-1)} | ${g.wins} / ${g.losses} / ${g.unresolved} | ${(100*g.wins/g.games).toFixed(1)}% |`);
md.push('','逐对手六格和技能实际使用次数见[candidate-report.json](candidate-report.json)。`far-combust`是早期试验标签；焚尽实际只有近中距，不能视为远距技能。回潮出招次数为0时，也不能将换槽收益归因于返气。采用决定须再结合同时采用后的完整矩阵；隔离筛选不等于最终结果。','');
await writeFile(`${root}/candidate-report.md`,md.join('\n'));
console.log(Object.fromEntries(Object.entries(result.confirmation).map(([k,g])=>[k,[g.wins,g.losses,g.unresolved]])));
