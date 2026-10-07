# 木修预告兑现研究索引

- [采用与限制](../../木修预告兑现复查-v0157.md)、[研究报告与打法小表](report.md)、[机器统计与逐局差异](report.json)。
- `before/`与`after/`各180个新增实际NPC游戏，144问道、36切磋。每版`plan.json`冻结配装、打法、距离、先后与回合上限；`records.json.gz`包含完整日志、统计、每回合公开预告、玩家动作、固定槽实际尝试与备用动作。
- 每版`source/`冻结全部游戏模块和runner，`source-hashes.json`核对每份文件；基线模块与Git提交逐文件核对，见`source-provenance.json`。
- 每版`range-audit.json`记录12个同输入手动棋面：繁花／噬藤各测部分准备1／2层、零准备、满3层、仅1行动、灵气不足。4个部分准备棋面修复接近收获及应对预算，8个边界动作／棋面相同。夹具不进入自然胜率分母。
- `matrix-plan.json`与`matrix-check/`记录276条原均衡双AI涉及木修的独立兼容重放；胜方／回合／气血／统计／完整轨迹与原记录一致。未重跑其余660条或稳守历史矩阵，不将它们算作新增执行。
- [验证输出](../../validation/wood-previews-v0157/)包含32组合新边界回归、1590动作／释放与595完整阶段对照、相关功能回归、三种打法的实际网页检查。

本次新执行360实际NPC游戏＋276独立兼容重放＝636完整执行。24场与上一轮重合场景仅用于证明外部观察器不改变结果／日志，历史场数没有计入新增执行。固定玩家先手、有限自动打法与30回合上限；不是真人胜率，也不是新的十二流派全对阵表。

从仓库根目录校验完整报告：

```sh
node scripts/report-wood-previews.mjs
```

各冻结版本可复现到新目录，不覆盖历史：

```sh
node docs/balance/wood-previews-v0157/before/source/scripts/check-wood-previews.mjs docs/balance/wood-previews-v0157/before/source /tmp/wood-previews-before-replay
node docs/balance/wood-previews-v0157/after/source/scripts/check-wood-previews.mjs docs/balance/wood-previews-v0157/after/source /tmp/wood-previews-after-replay
node docs/balance/wood-previews-v0157/after/source/scripts/audit-prepared-range.mjs docs/balance/wood-previews-v0157/after/source /tmp/wood-previews-range-audit
node docs/balance/wood-previews-v0157/matrix-check/source/scripts/review-tactics.mjs docs/balance/wood-previews-v0157/matrix-plan.json /tmp/wood-previews-matrix-replay
```

外部观察器不写入战斗状态，使用不可枚举方法，实际规划与自动预测副本不会携带它。原因分类只依据记录字段与合法性错误：原远距错误遮住零准备时按实际准备归类；“补回应对支出可支付”是费用检查，不判断保命是否应该放弃。未尝试的预告槽与实际失败、移动修复和合法备用招分别计数。
