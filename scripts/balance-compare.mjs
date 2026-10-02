import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const base='docs/balance',next=base+'/charge-window';
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const raw=dir=>JSON.parse(gunzipSync(readFileSync(dir+'/matches.json.gz')));
const a=json(base+'/summary.json'),b=json(next+'/summary.json'),old=raw(base),now=raw(next);
assert.deepEqual(a.scenarioCounts,b.scenarioCounts);
const signature=r=>JSON.stringify([r.group,r.a,r.b,r.prefs,r.distance,r.first]);
assert.equal(old.matches.length,now.matches.length);
for(let i=0;i<old.matches.length;i++)assert.equal(signature(old.matches[i]),signature(now.matches[i]),'Paired scenarios must match');
for(const s of a.skills){const updated=b.skills.find(x=>x.id===s.id);for(const key of ['ap','grossQi','cost','intentCost','range','kind','basePower','typicalImmediate','nominalBurn','heal'])assert.deepEqual(s[key],updated[key],s.id+' numeric change: '+key);}
for(const r of now.matches)for(const m of r.metrics)for(const c of Object.values(m.charges))assert.equal(c.started,c.released+c.interrupted+c.outOfRange+c.unresolved);
const names={ignite:'引燃',sustain:'生息',quick:'快剑',heavy:'藏锋'},pct=n=>(n*100).toFixed(1)+'%',ratio=(n,d)=>`${n}/${d}（${pct(n/d)}）`;
function win(list,seat=0){return {n:list.length,w:list.filter(r=>r.winner===seat).length};}
const matrix=[];
for(const f of ['ignite','sustain'])for(const s of ['quick','heavy']){
  const filter=r=>r.group==='core'&&r.distance===1&&r.a.config.major===f&&r.b.config.major===s;
  const x=win(old.matches.filter(filter)),y=win(now.matches.filter(filter));matrix.push({fire:f,sword:s,before:x,after:y});
}
const tactical=[];
for(const key of ['fire','sword'])for(const distance of [1,2]){
  const filter=r=>r.key===key&&r.distance===distance;
  const summarize=list=>({n:list.length,released:list.filter(r=>Object.values(r.charge.metrics[0].charges)[0]?.released>0).length,chargeSwing:list.reduce((s,r)=>s+r.charge.hpSwing,0)/list.length,alternativeSwing:list.reduce((s,r)=>s+r.alternative.hpSwing,0)/list.length,better:list.filter(r=>r.charge.hpSwing>r.alternative.hpSwing).length,worse:list.filter(r=>r.charge.hpSwing<r.alternative.hpSwing).length,equal:list.filter(r=>r.charge.hpSwing===r.alternative.hpSwing).length});
  tactical.push({key,distance,before:summarize(old.tactical.filter(filter)),after:summarize(now.tactical.filter(filter))});
}
for(let i=0;i<old.tactical.length;i++)assert.deepEqual(['key','major','distance','ap','layers','defender'].map(k=>old.tactical[i][k]),['key','major','distance','ap','layers','defender'].map(k=>now.tactical[i][k]));
const flips={};for(const group of ['core','mirror','loadout']){
  const pairs=now.matches.map((r,i)=>[old.matches[i],r]).filter(([,r])=>r.group===group);
  flips[group]={n:pairs.length,changedWinner:pairs.filter(([x,y])=>x.winner!==y.winner).length};
}
const comparison={baseline:{sourceCommit:a.sourceCommit,engineHash:a.engineHash,autoHash:a.autoHash},revision:{sourceCommit:b.sourceCommit,engineHash:b.engineHash,autoHash:b.autoHash},scenarioCounts:b.scenarioCounts,matrix,tactical,flips,charges:{before:a.chargeTotals,after:b.chargeTotals},initiative:{before:a.initiative,after:b.initiative}};
writeFileSync(next+'/comparison.json',JSON.stringify(comparison,null,2)+'\n');
let report=`# 青霄论道 · 蓄势行动窗口修订对照\n\n日期：2026-10-02。旧规则源提交：\`${a.sourceCommit}\`；新规则源提交：\`${b.sourceCommit}\`。引擎与规划器的精确内容哈希见 [comparison.json](balance/charge-window/comparison.json)。\n\n本轮只修改蓄势的行动窗口，并同步支持它的自动规划与敌方预告；技能伤害、灵气费用、行动费用、主修奖励、回血、护盾和回合纳气全部不变。它是规则和相应控制器一起更新的配对比较，不能拆解为纯规则变化的独立因果估计。\n\n## 规则与纪要\n\n- 蓄势支付 2 行动点后，剩余行动仍可用于接近、拉开、调息或已装备的藏锋式；费用、距离边界、容量与调息次数照常检查。\n- 蓄势中不能攻击、铺灵种、回血、净息或再次蓄势。取消仍不返还费用。\n- 下次己方行动开始自动免费释放，释放检查距离；对手仍能打断、近身化解或提前击败施术者。移动到近身也可能让自己的大招落空。\n- 归一在开始蓄势时锁定剑意和藏锋增伤。蓄势后新增的剑意留给后续招式，不增加本次大招伤害，释放也不二次消费。\n- 自动规划继续搜索合法的剩余行动，纪要说明拉远保护蓄势、补气或护体的目的。敌方执行公开预告中的蓄势后防守 / 移动 / 调息，不临时偷换攻击。\n\n## 相同场景与数值检查\n\n逐场核对 384 个推荐配置对局、96 个镜像对局、1344 个八选六配装对局，以及 192 组蓄势与即时打法对照（384 个战术场景），另检查 16 个原网页脚本对局。配置、倾向、初始距离、先手及战术初始状态保持一致；所有技能数值表字段自动核对无变化。旧数据保留在 [原基线](balance/summary.json)，新数据在 [本轮数据](balance/charge-window/summary.json)。\n\n这些是确定性 AI 场景占比，不是真人胜率或独立随机样本。双方控制器一致，但其收益预测仍使用公开脚本，不能代表最优对抗。超过 30 回合算平局：旧版 ${a.draws} 场，新版 ${b.draws} 场。\n\n## 蓄势实际兑现\n\n推荐配置的全部距离与倾向汇总；直接扣血不含离火随后新灼烧。每次发起均值还包含最终未释放的发起。\n\n| 神通 | 版本 | 发起 | 成功释放 | 打断 | 距离落空 | 未兑现 | 每次发起直接扣血 | 每次发起闲置行动 |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
for(const id of ['inferno','unity'])for(const [label,s] of [['旧版',a],['本轮',b]]){const c=s.chargeTotals[id];report+=`| ${id==='inferno'?'离火焚天':'万剑归一'} | ${label} | ${c.started} | ${ratio(c.released,c.started)} | ${c.interrupted} | ${c.outOfRange} | ${c.unresolved} | ${(c.hpDamage/c.started).toFixed(1)} | ${(c.unusedAP/c.started).toFixed(2)} |\n`;}
report+='\n发起次数也会因规划改变，所以释放比例和每次发起伤害不是同一批发起的纯提升；下面固定起始状态的战术对照更适合判断窗口变化。闲置行动包含 AI 主动保留的行动，开放窗口不等于要求每次用尽。\n\n## 固定状态的战术对照\n\n每行 48 组状态：两种主修 × 初始 2/3 行动 × 0/2/5 层 × 对手四倾向。火木生息为装备离火，用离火替换枯荣，与原基线相同。比较强制第一手蓄势与本行动阶段禁用蓄势、其后恢复正常规划的即时打法，观察至己方第二次行动结束或死亡。气血净交换 = 对手失血 − 自己失血；不计残余护盾、灵气和未来灼烧。\n\n| 招式 / 起始距离 | 版本 | 初次蓄势释放 | 蓄势平均气血净交换 | 即时打法平均净交换 | 蓄势优 / 平 / 劣 |\n| --- | --- | ---: | ---: | ---: | ---: |\n';
for(const t of tactical)for(const [label,c] of [['旧版',t.before],['本轮',t.after]])report+=`| ${t.key==='fire'?'离火':'归一'} / ${t.distance===1?'中距':'远距'} | ${label} | ${ratio(c.released,c.n)} | ${c.chargeSwing.toFixed(1)} | ${c.alternativeSwing.toFixed(1)} | ${c.better} / ${c.equal} / ${c.worse} |\n`;
report+='\n## 中距主修对局\n\n火木方胜出占比；每格 32 个情境，双方四倾向交叉并交换先手。\n\n| 火木 / 剑修 | 旧版 | 本轮 |\n| --- | ---: | ---: |\n';
for(const m of matrix)report+=`| ${names[m.fire]} / ${names[m.sword]} | ${ratio(m.before.w,m.before.n)} | ${ratio(m.after.w,m.after.n)} |\n`;
report+=`\n先手获胜：旧版 ${ratio(a.initiative.overall.wins,a.initiative.overall.n)}，本轮 ${ratio(b.initiative.overall.wins,b.initiative.overall.n)}。交换先手改变赢家：旧版 ${a.pairedInitiativeFlips}/${a.pairedCases}，本轮 ${b.pairedInitiativeFlips}/${b.pairedCases}。不能据总体值认定每个主修都具有相同先手优势。\n\n| 主修 | 旧版先手 / 后手胜出 | 本轮先手 / 后手胜出 |\n| --- | ---: | ---: |\n`;
for(let i=0;i<a.initiative.byMajor.length;i++){const x=a.initiative.byMajor[i],y=b.initiative.byMajor[i];report+=`| ${names[x.major]} | ${pct(x.first.winRate)} / ${pct(x.second.winRate)} | ${pct(y.first.winRate)} / ${pct(y.second.winRate)} |\n`;}
const fm=tactical.find(t=>t.key==='fire'&&t.distance===1),su=tactical.find(t=>t.key==='sword'&&t.distance===2);
report+=`\n## 本轮结论与下一步\n\n本轮去掉了蓄势后硬性锁住剩余行动的限制，形成补气、护体和保持距离的选择。固定中距离火的初次释放由 ${ratio(fm.before.released,fm.before.n)} 变为 ${ratio(fm.after.released,fm.after.n)}，但蓄势净交换 ${fm.after.chargeSwing.toFixed(1)} 仍低于即时打法 ${fm.after.alternativeSwing.toFixed(1)}。归一远距蓄势净交换 ${su.before.chargeSwing.toFixed(1)}→${su.after.chargeSwing.toFixed(1)}，其远距优势仍有用途。推荐配置的总体释放率需独立观察，不能据局部改善宣称蓄势平衡已经解决。\n\n首次复测发现，蓄势后花最后 1 金施展藏锋式虽然获得 22 护盾，却失去提供 26 护盾的应对资源；后续闪身改变距离又可能耽误近中距剑招。因此最终自动规则在应对仍可用时，蓄势护体至少保留 1 份应对属性灵气；可以调息、移动或结束。手动防守仍然合法，费用和数值没有改。这是一条规划启发式，尚未扩展为对抗最优控制器。\n\n生息的推荐配置优势仍明显，下一步单独测试首次木法额外回血 6→4→2；之后再复查恢复与周转。先手也尚未补偿，避免同时改多个因素。\n\n## 复现与验证\n\n\`\`\`sh\nnode test-engine.mjs\nnode test-auto.mjs\nnode test-loadout.mjs\nnode test-charge-window.mjs\nnode test-balance-harness.mjs\nnode scripts/balance.mjs --out docs/balance/charge-window\nnode scripts/balance-compare.mjs\n\`\`\`\n\n原基线数据不覆盖；本轮另存 [逐场 CSV](balance/charge-window/matches.csv)、[原始压缩记录](balance/charge-window/matches.json.gz)、[汇总](balance/charge-window/summary.json) 和 [配对核对](balance/charge-window/comparison.json)。浏览器另验证桌面与手机的蓄势按钮状态、提示、移动、取消和调息，配装、自动暂停恢复、人物布局与完整纪要沿用原回归。\n`;
writeFileSync('docs/蓄势行动窗口修订对照.md',report);
console.log(JSON.stringify({matrix,tactical,flips,charges:b.chargeTotals,initiative:b.initiative.overall},null,2));
