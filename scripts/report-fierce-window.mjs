import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/balance/fierce-window-v0154';
const json=async file=>JSON.parse(await readFile(file)),records=async file=>JSON.parse(gunzipSync(await readFile(file))),hash=data=>createHash('sha256').update(data).digest('hex');
const manifest=await json(`${root}/manifest.json`),baseline=await records(`${root}/baseline-records.json.gz`),screen=await records(`${root}/screen/records.json.gz`),publicRecords=await records(`${root}/public/records.json.gz`);
assert.equal(screen.length,48);assert.equal(baseline.length,12);assert.equal(publicRecords.length,12);
const context=r=>JSON.stringify([r.a.id,r.b.id,r.controller,r.tendency,r.distance,r.first]),refs=new Map(baseline.map(r=>[context(r),r]));assert.equal(refs.size,12);
for(const suite of ['screen','public']){
 const hashes=await json(`${root}/${suite}/source-hashes.json`),plan=await json(`${root}/${suite}/plan.json`),list=suite==='screen'?screen:publicRecords;
 assert.equal(plan.jobs.length,list.length);
 for(const [file,value]of Object.entries(hashes)){assert.equal(hash(await readFile(`${root}/${suite}/source/${file}`)),value);assert.equal(hash(await readFile(file)),value);if(manifest.sourceHashes[file])assert.equal(value,manifest.sourceHashes[file]);}
 for(const [index,r]of list.entries()){assert.equal(r.index,index);for(const k of Object.keys(plan.jobs[index]))assert.deepEqual(r[k],plan.jobs[index][k]);assert.ok(r.hp.every(Number.isInteger));}
}
const groups={};for(const [tag,remove,add]of manifest.specs){
 const group=groups[tag]={remove,add,foes:{}};
 for(const foe of ['wood/symbiosis','wood/parasitic']){
  const list=screen.filter(r=>r.tag===tag&&r.b.id===foe);assert.equal(list.length,6);assert.equal(new Set(list.map(context)).size,6);
  for(const r of list){const ref=refs.get(context(r));assert.ok(ref);assert.deepEqual(r.b,ref.b);assert.deepEqual(r.a.config.skillIds,ref.a.config.skillIds.map(id=>id===remove?add:id));assert.equal(r.a.config.major,ref.a.config.major);}
  const count=list=>({games:list.length,wins:list.filter(r=>r.winner===0).length,losses:list.filter(r=>r.winner===1).length,unresolved:list.filter(r=>r.winner===null).length});
  group.foes[foe]={before:count(list.map(r=>refs.get(context(r)))),after:count(list),wins:list.filter(r=>r.winner===0).map(r=>({distance:r.distance,first:r.first,rounds:r.rounds,hp:r.hp}))};
 }
}
const publicGroups={};for(const r of publicRecords){const id=r.a.id+' vs '+r.b.id,g=publicGroups[id]??={player:r.a.id,enemy:r.b.id,games:0,wins:0,losses:0,unresolved:0};g.games++;g[r.result==='win'?'wins':r.result==='lose'?'losses':'unresolved']++;}
for(const g of Object.values(publicGroups))assert.equal(g.games,3);
const report={newResearchExecutions:60,screenExecutions:48,publicExecutions:12,historicalReferences:12,historicalNewExecutions:0,initialUnfrozenProbeExecutions:12,initialProbeInFinalDenominator:false,decision:'No kit adopted: both symbiosis and parasitic are at best 1/6 per candidate; all three wins are close-range, one flame-first versus parasitic and two wood-first versus symbiosis. No full-rival or non-balanced confirmation, so no global improvement claimed.',groups,publicGroups};
await writeFile(`${root}/report.json`,JSON.stringify(report,null,2));
const text=['# 烈焰对木修：配装与实际公开对手','','规则、AI、默认六招保持 v0.15.3。研究新增60场：单槽筛选48，冻结源码的实际页面引擎对照12。历史12条引用新增0；最初未冻结的12场诊断不计入正式60场或胜率分母。确定性场景占比不是真人胜率。','','## 双方筹划 AI：单槽筛选','','双方均衡，近／中／远交换先手；每对手6场，上限30回合。原烈焰已有焰海、反伤和回血；每次只换一个槽。','','| 烈焰配装 | 对共生 胜/场 | 对寄生 胜/场 | 未决 |','| --- | ---: | ---: | ---: |','| v0.15.3 原样例 | 0/6 | 0/6 | 0 |'];
const labels={'eruption-to-combust':'烈火冲 → 焚身引','eruption-to-cinder':'烈火冲 → 摘烬术','quench-to-combust':'敛焰复元 → 焚身引','ward-to-combust':'烬火反障 → 焚身引'};
for(const [id,g]of Object.entries(groups))text.push(`| ${labels[id]} | ${g.foes['wood/symbiosis'].after.wins}/6 | ${g.foes['wood/parasitic'].after.wins}/6 | ${Object.values(g.foes).reduce((n,f)=>n+f.after.unresolved,0)} |`);
text.push('','不采用四个候选。三个1/6均只来自近身：烈火冲换焚身引对寄生的胜局为烈焰先手；舍弃回血或反伤对共生的两个胜局为木方先手。未形成稳定反制。没有补齐全对手或其他倾向，因此也不宣称替换的全局代价已经确认。反复净寄生、破生长、回血压缩进攻窗口的问题仍在。','','## 页面同款公开预告对手','','实际调用 DuelBattle，玩家侧均衡自动；右侧按公开主招及合法备用执行。页面固定玩家先手、对手开场护盾。交换职业只是换玩家侧，不是对等模型交换同局先手。','','| 玩家侧 | 对手侧 | 玩家侧 胜/场 | 未决 |','| --- | --- | ---: | ---: |');
for(const g of Object.values(publicGroups))text.push(`| ${g.player} | ${g.enemy} | ${g.wins}/3 | ${g.unresolved} |`);
text.push('','四组全部是玩家侧3/3。由此不能断言烈焰克木，也不能把双筹划烈焰0/6直接解释成页面木修数值过强：双方控制器和预告约束不同，交换角色后的玩家侧优势仍很明显。这是指定两组对阵诊断，尚非公开对手完整12×12表；不与原对等矩阵合并。','','实际页面对手仍执行预告，不能为提高离线胜率悄悄改预测模型。下一步应对照同一公开局面，检查对手队列如何分配准备、兑现与恢复，再单独验证合法的分级决策。','','## 可复现证据','','- [计划与源码指纹](manifest.json)、[逐候选/角色统计](report.json)。','- [筹划完整记录](screen/records.json.gz)、[实际页面引擎完整纪要](public/records.json.gz)。','- 两个 source/ 目录保存实测代码；重跑输出新目录，不覆盖历史。','- 页面新增局面提示，战斗核心源码指纹与v0.15.3完整矩阵一致；该表继续有效。','');
await writeFile(`${root}/report.md`,text.join('\n'));console.log({research:60,groups,publicGroups});
