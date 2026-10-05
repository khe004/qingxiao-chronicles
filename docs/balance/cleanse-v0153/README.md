# v0.15.3 · 净化与恢复复查

本轮沿用v0.15.2的十二套新招六槽。净息的回血与涤尘的回血／清除上限分开筛选、逐对手检查后，才测同时采用组合。最终保留净息8回复但需有灼烧，涤尘18回复、清至多1层；零回复组合因木修与寒凝退步不采用。完整表均分为两组6列，行列十二流派；每跨派格三距离交换先手6场，未决也计分母，镜像单列。

- [最终均衡12×12](final/report.md)：936场，均衡即时、筹划两控制器，各468，全部新执行。
- [最终稳守12×12](defensive/report.md)：468场，双方即时稳守，全部新执行。
- [最终前后对照](comparison.md)：所有流派、烈焰／潮汐逐对手、非灼烧对局实际结算核对及极端格。
- [净化回复首轮](screen-report.md)：408场，净息附带回复8→4／0，涤尘18→14／12，四候选独立。
- [回复全对手确认](confirmation-report.md)：新增660场，只补尚未测过的情境；候选合并首轮后各360／318／318个唯一情境，目标互相对打仅执行一次、可供两行引用。
- [涤尘清烧上限](clear-report.md)：180场，两种水修对引燃、烈焰、焚灼三对手；涤尘仍回18，独立清至多1／2层；潮汐另测稳守。
- [未采用的净息0完整组合](combined-zero/report.md)／[稳守](combined-zero-defensive/report.md)／[前后对照](combined-zero-comparison.md)：936+468场，木修／寒凝退步与焚灼优势扩大，不能拿烈焰一行改善就采用。
- [决策片段](choices/audit.json)：四个只读第3回合决策点，实际路径、预算、预测／重新选招后的实际状态；水修两点是稳守即时轨迹上的强制筹划诊断，不是即时AI的真实选招。
- [旧手动净息](choices/manual-baseline.json)：无灼烧、100气血时，同轮三次合法净息使气血到124，证明通用恢复可以重复使用。
- [回顾修正前留档](pre-recap-manifest.json)：均衡已完成552场后停止，稳守468场完成；冻结源码与检查点保留于pre-recap-partial／pre-recap-defensive，仍错误将净息计作8点治疗溢出，不作为最终表。修正后零回复组合1404场重新执行，最终8回复组合再新测1404场。

研究采用4056次运行：隔离候选408+660+180，未采用的零回复完整组合936+468，最终保留8回复组合936+468。另保留回顾修正前1020次额外完成记录（552+468），总留档5076；这1020次不再计作新增胜率证据，也不加入最终版本分母。停止时尚未完成／未保存的工作不作为证据。历史606个唯一情境引用、四个决策片段、手动操作及验证重放均不算新增胜率样本。screen的180历史引用包含于confirmation的606引用中，不能重复相加。

所有候选保留显式计划、冻结源码／SHA-256、完整纪要、动作统计与检查点。净息候选只改引擎回复常量及日志，涤尘候选使用计划内skillOverrides；候选规则文件仍是基线，必须结合覆盖字段读取有效参数。候选程序不改变线上源文件。最终源码、计数、镜像与六场完整重放由test-twelve-school.mjs核对。

固定AI与固定六槽结果不能作为真人胜率，也不能声称其他六槽或每个极端格已平衡。采用理由与剩余问题见[中文调整说明](../../净化与恢复复查-v0153.md)。

复现最终表：

```sh
node scripts/check-twelve-school.mjs /tmp/qingxiao-cleanse-final --loadouts=tactics
node scripts/check-twelve-school.mjs /tmp/qingxiao-cleanse-defensive --loadouts=tactics --controllers=immediate --tendency=defensive
node test-twelve-school.mjs docs/balance/cleanse-v0153/final --sample-replays
node scripts/compare-cleanse.mjs
```

历史源码仍冻结于各候选source中；要复现隔离候选，请在v0.15.2基线运行plan-cleanse-review.mjs、extend-cleanse-review.mjs、plan-rinse-cleanse.mjs，再执行各source/scripts/review-tactics.mjs及对应报告脚本。不要在v0.15.3上把这些候选当作旧版单因素实验。
