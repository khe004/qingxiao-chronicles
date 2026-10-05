# 烈焰与潮汐配装复查 · v0.15.2

[最新均衡12×12](final/report.md) · [稳守12×12](defensive/report.md) · [最终组合前后对照](comparison.md) · [采用理由与剩余问题](../../烈焰与潮汐配装复查-v0152.md)。

## 保留的执行与引用

| 批次 | 新执行 | 内容 |
| --- | ---: | --- |
| screen | 384 | 两主修各四种单槽替换，四个指定对手，即时／筹划、近中远、交换先手 |
| extension | 252 | 三个入选候选各补七个其余对手；每候选84场，与首轮48场组成全对手132场 |
| guard | 198 | 涤尘组合稳守偏强后，单独测试御水槽换镜屏；全部11个对手，均衡即时／筹划与稳守即时各66场 |
| final | 936 | 两项同时采用后的完整均衡矩阵，各控制器468场，含镜像 |
| defensive | 468 | 最终组合即时稳守矩阵，含镜像 |
| 合计 | 2238 | 新执行的研究对局；不含下面的历史引用、决策片段和验证重放 |

`baseline-records.json.gz`为首轮96条旧引用；`baseline-provenance.json`列出九份相同战斗源码哈希及原记录索引。`confirmation-baseline-records.json.gz`是两主修各132条全对手引用，总264条，对应252场唯一旧对局（两主修之间12场双方各引用一次）。均来自v0.15.1，新增执行0场；两份基线文件的重叠不增加研究样本。

[candidate-report.md](candidate-report.md)分开给出首轮与全对手确认。`candidate-report.json`另含逐对手六格、实际技能使用次数及严格计数；原座次、对手完整六槽与情境保持一致。筛选均保持九份战斗源码与旧矩阵字节一致；仅候选演员一槽在计划里替换。

每批次保存`plan.json`（显式候选批次）、`records.json.gz`（完整纪要与动作统计）、`source/`及`source-hashes.json`。`checkpoint.json.gz`仅是同一批次的中途备份，不是另一组对局。根目录`screen-plan.json`和`extension-plan.json`是对应执行输入，不能将它们重复计为新批次。

显式运行器的原始`summary.json`按第一演员（a侧）计胜；扩展与镜屏复查保持原矩阵座次，目标主修可能在b侧。目标胜场与动作应读`candidate-report.json`／`guard/report.json`，两份报告已按真实座次转换，不能直接把原始a侧胜场当作烈焰或潮汐。

`choices/audit.json`另保存四个第3回合中距决策片段、候选评分、公开脚本预测与实际筹划对手下一阶段。`choices/source/`冻结对应代码。它们不是胜率样本，也不能证明浏览器执行固定公开计划时预测错误。

[镜屏代价复查](guard/report.md)另比较相同已采用对手下的两种护盾槽；`guard/baselines.json.gz`引用198条已在final／defensive执行的记录，新增执行0场，不重复加入合计。镜屏版本筹划20/66、即时39/66、稳守37/66（另2未决），未采用；均衡筹划退步，不能只按稳守降幅决定。

## 复现

当前版本可直接重新测量最终组合，输出至临时目录以保留历史文件：

```sh
node scripts/check-twelve-school.mjs /tmp/qingxiao-pressure-balanced --loadouts=tactics
node scripts/check-twelve-school.mjs /tmp/qingxiao-pressure-defensive --loadouts=tactics --controllers=immediate --tendency=defensive
node scripts/report-pressure-review.mjs
node scripts/compare-pressure.mjs
node scripts/report-pressure-guard.mjs
node test-twelve-school.mjs --sample-replays
```

重新执行隔离筛选须先使用其冻结源码，不能拿最终规则替换原快照。`review-tactics.mjs`可直接在冻结源码副本中执行：

```sh
task_repo_root="$(pwd)"
mkdir -p /tmp/qingxiao-pressure-screen-source
cp -R docs/balance/pressure-v0152/screen/source/. /tmp/qingxiao-pressure-screen-source/
cd /tmp/qingxiao-pressure-screen-source
node scripts/review-tactics.mjs "$task_repo_root/docs/balance/pressure-v0152/screen/plan.json" /tmp/qingxiao-pressure-screen-rerun
```

扩展同理，替换为`extension`的快照和计划。计划生成脚本`plan-pressure-review.mjs`、`extend-pressure-review.mjs`要求原v0.15.1源码；它们会拒绝用已修改的最终规则复用历史基线。分析脚本只验证原冻结材料，不将旧记录伪装成新执行。

镜屏复查用`guard`的源码和计划，同一运行器；本轮最终未采用该变体，因此其冻结战斗源码与最终御水组合相同。

六格是确定性AI情境，未决计入分母；固定样例不代表真人、所有倾向或十二选六最优解。完整矩阵采用两项调整后的实测值，不能将独立确认直接拼成最终表。
