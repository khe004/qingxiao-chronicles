import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const directory=process.argv[2]??'docs/balance/adaptive-prediction';
const data=JSON.parse(gunzipSync(readFileSync(directory+'/cases.json.gz'))),s=data.summary;
assert.equal(s.duels,data.rows.length);assert.equal(s.probes,data.probes.length);assert.equal(s.duels,192);
for(const [field,path] of [['engineHash','dist/engine.mjs'],['autoHash','dist/auto.mjs'],['runtimeHash','scripts/predictive-arena.mjs'],['adapterHash','scripts/planner-internals.mjs'],['generatorHash','scripts/balance-prediction.mjs']]){
  const b=readFileSync(path),hash=createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');assert.equal(s[field],hash,path+' changed since experiment');
}
const names={legacy:'旧控制器',immediate:'即时评分',script:'统一时序的脚本预测',adaptive:'有限层重新决策'};
const forecastNames={legacy:'旧线上脚本模型',fixed:'统一应对与时序的脚本',adaptive:'按对手控制器重规划'};
const number=n=>Number.isInteger(n)?String(n):n.toFixed(2),percent=(n,d)=>(n/d*100).toFixed(1)+'%';
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','| '+heads.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.join(' | ')+' |')].join('\n');
const errors=table(['实际双方控制器','预测模型','片段','己方气血 MAE','敌方气血 MAE','完整状态一致','距离一致'],s.summaries.flatMap(c=>c.forecasts.map(f=>[names[c.controller],forecastNames[f.model],f.n,number(f.ownHpMAE),number(f.opponentHpMAE),`${f.fullStateMatches}/${f.n}`,`${f.distanceMatches}/${f.n}`])));
const matches=table(['双方控制器','跨派火木获胜','剑修获胜','30 回合未决','平均回合','引燃：先手 / 后手','生息：先手 / 后手'],s.summaries.map(c=>[names[c.controller],`${c.core.wins}/${c.core.n}`,c.core.losses,c.core.draws,number(c.core.avgRounds),...c.byMajor.map(m=>`${m.first.wins}/${m.first.n} / ${m.second.wins}/${m.second.n}`)]));
const mirrors=table(['双方控制器','引燃先手获胜','生息先手获胜','快剑先手获胜','重剑先手获胜','镜像未决'],s.summaries.map(c=>[names[c.controller],...c.mirrors.map(m=>`${m.firstWins}/${m.n}`),c.mirrors.reduce((n,m)=>n+m.draws,0)]));
const initiative=table(['实际双方控制器','预测模型','己方先手气血 MAE','己方后手气血 MAE'],s.summaries.flatMap(c=>c.forecasts.map(f=>[names[c.controller],forecastNames[f.model],...f.bySeat.map(g=>number(g.ownHpMAE))])));
const adaptive=s.summaries.find(c=>c.controller==='adaptive'),a=adaptive.forecasts.find(f=>f.model==='adaptive'),l=adaptive.forecasts.find(f=>f.model==='legacy');
const delta=(l.ownHpMAE-a.ownHpMAE).toFixed(2);
const grouped=table(['实际有限层控制器','预测模型','片段','己方气血 MAE','敌方气血 MAE','距离一致'],adaptive.forecasts.flatMap(f=>f.byGroup.map(g=>[g.group==='core'?'跨派':'镜像',forecastNames[f.model],g.n,number(g.ownHpMAE),number(g.opponentHpMAE),`${g.distanceMatches}/${g.n}`])));
const report=`# 离线双 AI 有限层预测对照

日期：2026-10-02。本轮新增离线实验擂台，没有修改网页、技能数值、费用、主修、射程或线上自动控制器。旧擂台与历史报告保留。

## 实现与验证

新擂台明确记录固定先手、当前行动者和回合边界。先手结束后，对方同回合行动；后手结束后，双方先纳气并刷新行动与应对，再由先手行动。各自的灼烧和免费蓄势释放仍发生在各自动作阶段开始，死亡立即停止。护盾、费用、距离、资源与伤害继续调用生产引擎。

自己的组合搜索和未来试算都使用与实际双 AI 相同的应对规则，修复旧搜索副本退回线上敌人应对策略的问题。应对仍沿用原有 chooseReaction 策略及其脚本提示，本轮没有给应对另加敌方重规划。

例如流火诀的 24 基础伤害，在剑修 40 术法防御下约为 17 伤害。旧副本因基础伤害小于 35，不触发线上敌人的护盾应对；实际双 AI 的稳守剑修可以花 1 金灵气获得 26 护盾，将这次气血伤害化为零并剩余 9 护盾。新搜索副本能复现这次费用、护盾及气血结算。

有限层控制器仍搜索本回合至多三步，使用原有四种倾向的过滤条件与评分权重。预测时会按对手的配置、灵气、距离和倾向重新选招；如果对手也是有限层控制器，在深度上限把它近似为即时评分。对手每次行动可以重新决策，不使用玩家不知道的未来选择，也没有无限递归。

为控制计算量，先按即时收益排列本回合所有合法候选，最多保留 ${s.candidateLimit} 个组合做敌方阶段预测。结束行动、蓄势、恢复、移动、防守和打断各预留一个最优即时候选（存在时），其余槽位按即时评分补齐。这个筛选可能漏掉真正最优组合；它与敌方深度截断是两种独立近似，不能描述成完整穷举未来。

另有一层完整控制器重放，仅用于检查既定算法的结算一致性。它不代表能预知真人决策，更不证明策略最优。对称控制器的界面选择尚未上线，线上敌人继续执行固定公开预告。

测试核对 24 场旧控制器对局的新旧擂台结果、出招和应对次数，全部一致；覆盖两种先后手边界、完整状态重放、实际与搜索副本的对称应对、灼烧致死、蓄势时序、深度上限、状态不可变性、交换人物身份，以及四种倾向的合法决策。

## 方法与范围

- 实际执行 **${s.duels} 场完整或到时限的对局**：四种控制器各 24 个跨派、24 个同配置镜像场景。
- 批次运行约 ${Math.round(s.elapsedSeconds/60)} 分钟，包含三个模型在同一对局中的额外预测；时间随运行环境变化，不作为严格性能基准。有限层组合试算明显更慢，暂不直接用于网页即时决策。
- 另有一次未限制己方候选数量的先导批次，因计算成本中止。最后打印进度为至少 180 场完成、2895 个片段、1139 秒；完整逐场记录未保存，因此不纳入以下比较。其源快照与中止信息另存于 unbounded-pilot 文件。这些计算是额外执行，不能宣称全部工作只运行了 192 次对局。
- 跨派覆盖引燃 / 生息 × 快剑 / 重剑 × 三种初始距离 × 两种先手。镜像覆盖四个主修 × 三种距离 × 两种先手。
- 使用推荐六槽配装，双方倾向均为均衡。没有穷举配装或所有倾向组合。
- 在同一场实际对局、同一阶段末尾采样，比较三种预测器；不能把预测片段当成新增独立对局。
- 共 **${s.probes} 个有效阶段片段**，${s.censoredProbes} 个跨越对局时限的预测未纳入误差统计。
- 所有误差比较到原行动者下一次行动开始，包含纳气、灼烧与免费释放；如提前死亡，以死亡为终点。终局不存在正在行动的角色，完整状态比较忽略终局的行动者标签。

旧线上模型按固定脚本与线上应对假设预测；统一脚本模型修正双 AI 应对、先手边界，并在对手实际行动开始的资源下生成脚本。新模型执行所假定的敌方控制器。三个模型因此同时区分行为假设和规则一致性。

本轮即时评分也统一了自己的攻击试算应对，和上一轮仅替换评分时间点的即时诊断不是同一个控制器。这里是控制器组合对照，不是只改变一个评分变量的数值实验。

## 预测结果

MAE 是每个片段的绝对气血误差取平均。完整状态包括双方全部战斗属性、资源、触发标记、蓄势快照、回合、距离与胜负，排除日志编号与 UI 动画信息。

${errors}

已知对手使用旧控制器、即时评分或统一脚本预测时，新预测器直接运行相同策略，规则与策略可以一致重放。这些零误差是工程验证，不能作为更高智能的证据。

双方实际使用有限层控制器时，新预测对手在边界采用即时评分近似。己方气血 MAE 从旧模型的 **${number(l.ownHpMAE)}** 变为 **${number(a.ownHpMAE)}**，差值为 ${delta}；完整状态一致 ${a.fullStateMatches}/${a.n}，距离一致 ${a.distanceMatches}/${a.n}。残余差异包含深度截断的选招变化，不能宣称已消除全部预测偏差。

同一批有限层实际对局中，旧模型距离一致为 ${l.distanceMatches}/${l.n}，新模型为 ${a.distanceMatches}/${a.n}。气血误差改善没有同时保证距离判断改善，不能只挑较好的指标。长镜像提供更多片段，以下另按跨派和镜像分组，避免总体误差掩盖样本构成：

${grouped}

先后手分组如下，帮助识别跨回合资源处理对误差的影响：

${initiative}

## 打法与先手

${matches}

镜像中的先手表现：

${mirrors}

这些是确定性场景的获胜计数，不是真人胜率。每个主修在每个控制器下的先手或后手仅 6 个跨派样本，镜像每派也仅 6 个样本。控制器选择会改变配装和流派的表观强弱，不能据此把技能统一拉成五五开。未决按未决统计，不能混入任何一方胜出。

本轮没有把实验控制器设为默认，也没有按这些小样本调整数值。应先确定用于后续平衡实验的控制器组合，再扩大配装与倾向覆盖，分别检验枯荣周转和先手补偿。

特别需要保留的问题：有限层控制器的快剑、重剑镜像各 6 个场景全部到 30 回合未决，共 12 个。距离选择与防守估值仍需诊断；较小的预测误差不等于更积极、更有趣或更强的打法。因此这版可作为对照工具，暂不选为唯一平衡控制器，更不直接替换线上自动战斗。

中距、甲先手的重剑镜像中，双方剩余 195 / 147 气血，却分别闲置 60 / 64 行动点（各自 30 回合共有 90 行动点）。同条件快剑镜像分别使用藏锋式 20 / 27 次，闲置 32 / 33 行动点。这说明未决不仅是气血偏高，也涉及控制器主动结束与防守选择。

原评分有一个应独立验证的缺口：奖励自身剩余护盾，但没有直接为削减敌方护盾计收益。某招只打掉护盾、同时消耗剑意时，可能被低估。这是代码可见的评分结构，并非已证明的唯一拖延原因。下一轮优先对这项评分做单因素比较，同时观察距离与候选筛选，先不削弱护盾技能本身。

## 后续工作

1. 检查有限层模型仍判断错误的具体片段；分别看行动选择、应对保留与射程移动，不只看总获胜计数。
2. 在几个固定代表场景中比较另一种边界策略，测量准确性和运行成本；暂不把递归层数无条件加深。
3. 同时保留旧控制器、即时评分和新预测器，扩展关键配装与四种倾向。新报告使用新目录，保留历史数据。
4. 单独验证枯荣的资源周转；先手补偿也独立设候选，不和恢复、伤害同时调整。

## 复现与原始数据

\`\`\`sh
node test-predictive-arena.mjs
node scripts/balance-prediction.mjs --out /tmp/qingxiao-adaptive-prediction
node scripts/prediction-report.mjs
\`\`\`

实验输出在 \`docs/balance/adaptive-prediction/\`：\`cases.json.gz\` 保存实际对局、预测、结算及部分完整纪要；\`summary.json\` 保存统计；\`duels.csv\` 可直接筛选场景。报告生成器仅重新汇总，不执行新对局。

\`node scripts/balance-prediction.mjs --recompute\` 只用已保存的片段重算统计，并核对规则与控制器源哈希，不计为新增执行。历史复现请检出报告对应提交；数值或控制器变更后应另设输出目录。

引擎 Git blob：\`${s.engineHash}\`；线上控制器 Git blob：\`${s.autoHash}\`。二者与射程修订及上一轮公开计划检查一致。离线擂台、适配器和生成器哈希另记在 summary 中。
`;
writeFileSync('docs/离线双AI有限层预测对照.md',report);
console.log(JSON.stringify({duels:s.duels,probes:s.probes,adaptiveComparison:{old:l.ownHpMAE,new:a.ownHpMAE},report:'docs/离线双AI有限层预测对照.md'}));
