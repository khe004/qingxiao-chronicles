import {readFileSync,writeFileSync} from 'node:fs';
import {CLASSES,MAJORS,ELEMENT_NAMES} from '../dist/engine.mjs';
const TENDENCY_NAME={balanced:'均衡',aggressive:'强攻',defensive:'稳守',burst:'蓄势'};
const s=JSON.parse(readFileSync('docs/balance/summary.json','utf8'));
const passive=JSON.parse(readFileSync('docs/balance/passive.json','utf8')).summary;
const data=JSON.parse(readFileSync('docs/balance/matches.json','utf8')),core=data.matches.filter(r=>r.group==='core');
const percent=v=>(100*v).toFixed(1)+'%',number=v=>Number(v).toFixed(1),major=(key,id)=>MAJORS[key][id].name;
function stats(rows,seat=0){const n=rows.length,wins=rows.filter(r=>r.winner===seat).length,draws=rows.filter(r=>r.winner===null).length;return {n,wins,draws,rate:n?wins/n:0};}
const result=x=>`${percent(x.rate??x.winRate)}（${x.wins}/${x.n}；平 ${x.draws}）`;
const line=[];const put=(...x)=>line.push(...x);
put('# 青霄论道 v0.2 · 平衡性基线报告','',`日期：2026-10-02。被测代码提交：\`${s.sourceCommit}\`。本轮测量与记录结果，没有修改线上技能数值或战斗规则。`,'',
'## 结论与测试范围','',
'之前的测试验证了规则、配装、资源约束和对局能否结束，没有验证竞争性平衡。原网页的玩家规划器对固定脚本敌人，而且固定玩家先手；此前玩家全胜不能解释为某个流派有 100% 公平胜率。','',
`本轮枚举 ${s.scenarioCounts.core} 个推荐配置交叉对局、${s.scenarioCounts.mirror} 个同配置同倾向镜像对局、${s.scenarioCounts.loadout} 个六槽配装对局，另做 ${s.scenarioCounts.tactical} 个蓄势战术场景（${s.scenarioCounts.tactical/2} 组配对）及 ${s.scenarioCounts.campaign} 个原网页脚本对照。`,
`对等擂台共 ${data.matches.length} 个对局场景，超过 30 回合未决的有 ${s.draws} 个，保留为平局。推荐配置先手获胜 ${s.initiative.overall.wins}/${s.initiative.overall.n}；交换先手改变赢家的有 ${s.pairedInitiativeFlips}/${s.pairedCases} 组。`,'',
'这些比例是指定配置、AI、距离、先手的**确定性场景占比**，不是独立随机样本，也不是真人胜率；没有重复相同场景来扩大样本，没有计算随机抽样置信区间。','',
'优先问题：中距生息主修对两种剑修分别获胜 28/32、27/32，表现偏强；引燃对快剑 13/32、对藏锋 21/32，已经呈现方向不同的对局。蓄势在推荐配置对局中仅约三成释放，但归一在远距战术对照中有优势，不应一概提高所有蓄势伤害。','',
'## 一、招式消耗、伤害与机会成本','',
'下表使用生产引擎计算防御后的直接伤害：火木攻击剑修（灵防 40），剑修攻击火木（肉防 22，照隙使用灵防 30）；示例有 2 层灵种、2 层剑意、2 层旧灼烧，无破绽、藏锋、护盾或闪避。恢复按气血缺口足够计算。此表只用于比较账面结构，不能直接相加得到真实连招收益。','',
'| 神通 | 行动点 | 卡面灵气费用 | 示例直接伤害 / 恢复 | 还需计入 |','| --- | ---: | --- | --- | --- |');
const note={seed:'铺垫 2 灵种；首次木法 +1 火，不能直接按零伤害判弱',spark:'1 层新灼烧，理论最多 12 点；可能被净化或覆盖',blaze:'消耗全部灵种；2 层新灼烧理论最多 24 点',heal:'清空灼烧；首次木法回气，生息主修还可恢复 6',vine:'打断；首次木法可回气，生息可恢复气血',ember:'消耗至多 2 灵种；引燃主修首次可返 1 火',nourish:'返 1 通灵；首次木法再生成 1 火，生息主修再恢复 6；每回合一次',inferno:'延迟、锁定行动、打断、距离、死亡风险；消耗旧灼烧并重新施加 2 层',swift:'普通养意 +1；快剑首次另 +1，后续兑换伤害不能重复记账',expose:'下一次重剑 +25%；需后续能兑现',strike:'消耗全部剑意；可利用破绽 / 藏锋',guard:'22 护盾 +1 剑意；护盾持久，可能触发藏锋，灼烧绕过护盾',cut:'打断并养意；价值取决于是否面对蓄势',lunge:'另花 2 剑意；仅近身，可能先花移动行动；命中后养意',return:'消耗至多 2 剑意；保留余量，可利用破绽 / 藏锋',unity:'延迟、锁定行动、打断、距离、死亡风险；剑意在蓄势时消费'};
for(const x of s.skills){const cost=Object.entries(x.cost).map(([k,n])=>`${n}${k==='any'?'任意':ELEMENT_NAMES[k]}`).join('＋');const output=x.kind==='heal'?`恢复 ${x.heal}`:x.id==='guard'?'护盾 22':x.typicalImmediate?`${x.typicalImmediate} 伤害`:'无直接伤害';put(`| ${x.name} | ${x.ap} | ${cost} | ${output} | ${note[x.id]} |`);}
put('','### 蓄势不能只除以 2 行动点','',
'- 回合开始蓄势：支付 2 行动点，但剩余 1 点被锁住，当前回合实际失去 3 点可行动空间。',
'- 先做 1 点行动再蓄势：能用完 3 点，蓄势的额外闲置成本为 0。',
'- 下一次自身行动开始时自动释放，不再花行动点，随后仍有 3 点正常行动。因此它并非额外跳过整个下回合。',
'- 延迟期间可能被打断、贴近至近身导致释放落空、被击败，且已支付的灵气和剑意不返还。',
'- 蓄势被化解后，下次行动阶段前的剩余行动点仍无法追回，因为对方已经进入行动；成功率必须与实际伤害、行动闲置一起看。','',
'例如两层剑意的归一约 84 伤害，断岳约 56。相同 3 金＋1 任意的总灵气支出，快剑主修先掠影再断岳约为 25＋69＝94 点直接伤害（无应对时），而且只用 2 点行动、立即兑现，还保留第 3 点。这个比较包含掠影新增的剑意，不能再把这两层剑意算作留存收益。归一目前主要依靠中远距范围与特定窗口，而不能凭大招名称假定它更划算。','',
'离火示例的 73 点已经包含旧灼烧引爆。旧灼烧本来还能持续扣血，被消费的未来伤害也是机会成本；重新施加的 24 点理论灼烧总值不能与旧灼烧未来收益重复计算。','',
'恢复 / 回气同样有叠加成本：枯荣转生卡面 1 木＋1 任意，在首次木法且不溢出时返 1 通灵、再生成 1 火，总灵气数量净减少 0；生息主修可恢复 20 气血并清 1 灼烧。但木被转为火不等于保留了相同属性，且需要 1 行动点、每回合限一次。其可重复使用性和属性周转值得重点复测。','',
'### 推荐配置对局中的蓄势兑现','',
'“成功释放”包括被护盾或闪身减伤的释放；“未兑现”包含战斗先结束或超时的未释放，单列，不伪装为打断。这里的气血伤害不含随后新灼烧的伤害。','',
'| 神通 | 发起 | 释放 | 打断 | 距离落空 | 未兑现 | 每次发起平均直接扣血 | 平均闲置行动 |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for(const [id,c] of Object.entries(s.chargeTotals))put(`| ${s.skills.find(x=>x.id===id).name} | ${c.started} | ${c.released}（${percent(c.released/c.started)}） | ${c.interrupted} | ${c.outOfRange} | ${c.unresolved} | ${number(c.hpDamage/c.started)} | ${number(c.unusedAP/c.started)} |`);
put('','### 蓄势与即时打法的配对对照','',
'每组相同主修、六槽配置、双方气血与资源，从第一方当前阶段开始；己方初始灵气为主属性 4、次属性 2、通灵 1（共 7），行动点为 2 或 3，初始距离为中或远，旧灼烧 / 剑意为 0、2、5。生息主修为了测试离火，显式把推荐套中的枯荣转生替换为离火，配对双方使用相同改后配置。','',
'实验组第一招强制蓄势；对照组首阶段禁用蓄势并由相同控制器选择即时打法，此后恢复正常决策。观察至己方第二次行动结束或任一方败北。净气血交换＝对手失血－己方失血；可以为负。状态是合成战术切片，不属于常规开局胜率；残留灵气、护盾和后续灼烧不包含在这个单一指标里。','',
'| 神通 / 起始距离 | 配对数 | 首次蓄势释放率 | 蓄势净交换均值 | 即时打法净交换均值 | 蓄势更优 / 相等 / 更差 |','| --- | ---: | ---: | ---: | ---: | --- |');
for(const key of ['fire','sword'])for(const distance of [1,2]){
 const cases=data.tactical.filter(t=>t.key===key&&t.distance===distance),id=key==='fire'?'inferno':'unity',n=cases.length,release=cases.filter(t=>t.charge.metrics[0].charges[id].released>0).length;
 const sums=cases.reduce((x,t)=>[x[0]+t.charge.hpSwing,x[1]+t.alternative.hpSwing],[0,0]);
 const better=cases.filter(t=>t.charge.hpSwing>t.alternative.hpSwing).length,equal=cases.filter(t=>t.charge.hpSwing===t.alternative.hpSwing).length;
 put(`| ${key==='fire'?'离火焚天':'万剑归一'} / ${distance===1?'中距':'远距'} | ${n} | ${percent(release/n)} | ${number(sums[0]/n)} | ${number(sums[1]/n)} | ${better} / ${equal} / ${n-better-equal} |`);
}
put('','## 二、流派与主修胜率','',
'每个格子跨四种自身倾向、四种对手倾向与两个先手位置等权枚举。先列网页默认的中距开局，再列三档距离合并结果，避免远距优势掩盖默认开局。胜率分母包括平局，平局未算半胜。','',
'### 中距开局：火木主修对剑修主修','',
'| 火木主修 | 对快剑压制 | 对藏锋重剑 |','| --- | --- | --- |');
for(const fm of Object.keys(MAJORS.fire))put(`| ${major('fire',fm)} | ${Object.keys(MAJORS.sword).map(sm=>result(stats(core.filter(r=>r.distance===1&&r.a.config.major===fm&&r.b.config.major===sm)))).join(' | ')} |`);
put('','### 三档距离合并：同样以火木获胜计','',
'| 火木主修 | 剑修主修 | 火木胜率 | 平均回合数 |','| --- | --- | --- | ---: |');
for(const m of s.matrix)put(`| ${major('fire',m.fire)} | ${major('sword',m.sword)} | ${result(m)} | ${number(m.avgRounds)} |`);
put('','### 起始距离与打法的影响','',
'| 起始距离 | 火木胜率 |','| --- | --- |');
for(const x of s.byDistance)put(`| ${['近身','中距','远距'][x.distance]} | ${result(x)} |`);
put('','| 自身打法倾向 | 火木胜率 | 剑修胜率 |','| --- | --- | --- |');
for(const x of s.byStyle)put(`| ${TENDENCY_NAME[x.style]} | ${result(x.fire)} | ${result(x.sword)} |`);
put('','### 全部六槽配装与技能携带差异','',
'每派每主修枚举八选六的全部 28 个组合，对另一派两个推荐主修，双方均衡、三档距离、交换先手：每个主修 336 个场景。下表“携带 / 不携带”是不同配装集合的比较，**不是只改变单个技能的因果消融**；一个技能不携带时，总会携带另一套技能，不能把差值全归因于它。','',
'| 主修 | 技能 | 携带时胜率 | 不携带时胜率 | 差值（百分点） |','| --- | --- | --- | --- | ---: |');
for(const a of s.ablation)for(const x of a.includeExclude)put(`| ${major(a.key,a.major)} | ${x.name} | ${result(x.included)} | ${result(x.excluded)} | ${number(100*(x.included.winRate-x.excluded.winRate))} |`);
put('','### 每个主修胜率最高的配装（样本较小，不等于最优解）','',
'| 主修 | 配装 | 胜率 |','| --- | --- | --- |');
for(const a of s.ablation){const b=a.best[0];put(`| ${major(a.key,a.major)} | ${b.skillIds.map(id=>CLASSES[a.key].skills.find(x=>x.id===id).name).join('、')} | ${result(b)} |`);}
put('','### 只关闭生息额外 6 气血的单因素对照','',
`中距、推荐配置、四种双方倾向、两个剑修主修和交换先手的 ${passive.baseline.n} 组配对中，生息原始获胜 ${passive.baseline.wins}/${passive.baseline.n}（${percent(passive.baseline.wins/passive.baseline.n)}）；仅关闭额外 6 气血奖励后，获胜 ${passive.withoutBonus.wins}/${passive.withoutBonus.n}（${percent(passive.withoutBonus.wins/passive.withoutBonus.n)}），降低 ${number(100*(passive.baseline.wins/passive.baseline.n-passive.withoutBonus.wins/passive.withoutBonus.n))} 个百分点。`,
'基础木法生成火灵气、全部技能、初始属性、资源、应对、距离、先手和控制器保持一致。这里暂时关闭主修奖励是测试干预，线上没有这种可选配置。','',
'这说明额外恢复确实贡献了优势，但不能解释全部偏强；仅削这 6 点仍不能证明完成平衡。还需拆分基础火木连招、远距移动税、灼烧与净化、护盾打法和控制器差异。净消耗为零的枯荣转生也未在配装覆盖中呈现普遍正收益，不能只凭账面效率直接削弱。','');
put('','## 三、先手的影响','',
'推荐配置跨流派对局中，分别以每个主修本身的胜率计。先后手样本在配置、双方倾向和距离上成对匹配，不给予额外灵气或护盾。','',
'| 主修 | 先手胜率 | 后手胜率 | 先手－后手（百分点） |','| --- | --- | --- | ---: |');
for(const x of s.initiative.byMajor)put(`| ${major(x.key,x.major)} | ${result(x.first)} | ${result(x.second)} | ${number(100*(x.first.winRate-x.second.winRate))} |`);
put('',`同一配置与倾向组合交换先手后，赢家变化 ${s.pairedInitiativeFlips}/${s.pairedCases} 组（${percent(s.pairedInitiativeFlips/s.pairedCases)}）。这比混合全部流派后只看一个总先手率，更能看出行动顺序是否决定胜负。`,'',
'| 镜像主修（双方同配置、同倾向） | 场景数 | 先手胜 | 平局 |','| --- | ---: | ---: | ---: |');
for(const x of s.initiative.mirrors)put(`| ${major(x.key,x.major)} | ${x.n} | ${x.firstWins} | ${x.draws} |`);
put('','镜像没有随机波动，双方使用同一个确定性控制器；因此镜像中的先手比例只是一项顺序敏感性检查，不能转换成“真人先手就是这个胜率”。后续应加入不同控制器、真实玩家或有明确来源的决策扰动，再讨论概率意义的先手胜率。','',
'## 四、如何理解这些结果与下一轮调整','',
'1. 允许克制关系。目标不是所有格子都 55 开，而是强弱有原因、可识别、可通过换主修 / 技能 / 距离缓解；只有两大流派时还不能验证完整克制环。',
'2. 不先按胜率强行削整派。先分离先手、移动税、净化、防御类型、资源生成和规划器强弱，再调整具体技能。',
'3. 蓄势优先检查兑现条件：1 点行动的免费贴近能让中远距大招落空，1 点打断技能抵消 4 灵气和已支付剑意；这属于风险成本，不应靠只提高伤害掩盖。可比较“允许蓄势后再花剩余 1 行动点”、更明确的安全蓄势窗口、部分失败返还等候选方案，每次只改一个因素并跑同样的配对。',
'4. 枯荣转生的净数量零消耗与恢复叠加、藏锋式的护盾＋剑意＋藏锋收益应单独做有 / 无被动的配对消融。青木回春的清灼烧价值也不能只按 26 点回血衡量。',
'5. 先手补偿应作为独立变量试验，例如后手开场小额护盾或一份应对资源，不与伤害调整一起改。补偿是否有效以相同对局交换先手后的差值判断。',
'6. 对局难度与流派平衡分开维护：原网页脚本可以刻意让试玩玩家容易取胜；竞争性结论应使用双方同能力控制器。','',
'## 方法与局限','',
'- 生产 `Battle` 的费用、合法性、伤害、防御、护盾、状态、主修、打断、距离检查、蓄势储存 / 释放和应对结算被直接复用。测试擂台只负责轮流调度，并让双方都用 `chooseAction` / `chooseReaction`，消除固定脚本敌人的执行能力差异。',
'- 每全局回合双方同时纳气、重置行动点 / 应对 / 每回合标记；每个角色自身行动开始结算灼烧与蓄势，保持现有时序。交换先手时不交换流派或费用。',
'- 规划器的预测仍使用既有脚本预测队列，并非对手的真实最优反击；实际执行双方使用相同规划器。四种倾向是四套启发式权重，不能代表所有玩家水平，控制器也可能偏爱某些技能。',
'- 测试擂台让双方都能用同等应对决策；线上敌人仍是固定脚本与另一套阈值应对。线上没有改成公平 PvP，也没有新增先手选择。',
'- 出招搜索只有当前回合与脚本未来的近视规划；远期蓄势、资源保留和换距博弈可能被低估。某技能使用率低不等于技能一定弱。',
'- 配装胜率只对两个推荐对手测量，没有枚举全部 56×56 双方配装对，也未覆盖境界、装备、真人操作或隐藏信息。',
'- 无随机机制，无重复随机试验；极端 0% / 100% 在小集合里可能由确定性策略导致，不应包装成精确的真实胜率。','',
'## 复现与数据','',
'```sh','node test-balance-harness.mjs','node scripts/balance.mjs','node scripts/balance-passive.mjs','node scripts/balance-report.mjs','```','',
'- [summary.json](balance/summary.json)：聚合数据、被测提交和引擎哈希。',
'- [matches.csv](balance/matches.csv)：逐场配置、倾向、距离、先手、赢家、回合与剩余气血。',
'- [passive.json.gz](balance/passive.json.gz)：生息奖励的 64 组单因素配对与结果。',
'- [matches.json.gz](balance/matches.json.gz)：完整逐场动作计数、蓄势结果、战术配对与原网页对照；解压后读取。','',
`运行时间：${number(s.elapsedSeconds)} 秒。引擎 blob：\`${s.engineHash}\`，自动规划器 blob：\`${s.autoHash}\`。`,'');
writeFileSync('docs/平衡性基线报告.md',line.join('\n'));
console.log('Balance report generated.');
