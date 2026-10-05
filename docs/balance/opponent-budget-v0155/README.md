# 问道应对预算 · v0.15.5

[两档对照](report.md) · [逐对手／资源与轨迹差异](report.json) · [采用理由与限制](../../问道应对预算复查-v0155.md)。

新增264次完整研究对局：旧版132、新版132。十一位NPC，每人对烈焰样例和一套轮换指定样例，三距离、两档难度，固定玩家先手、均衡自动、上限30回合。两版明确的132个输入完全相同，统计按玩家或NPC方向命名。没有历史完整对局复用。

- before/games/、after/games/：plan.json、records.json.gz、完整日志和统计、逐条checkpoint、source/与source-hashes.json。
- before/audit.json、after/audit.json：3个同棋面反例，包含全部输入、真实结果与模拟结果。夹具不作为完整胜率样本。
- before/source/：编辑前完整模块；与before/games/source/内容一致。
- 独立回归／浏览器片段和确定性重放属于验证，不计作新研究样本。

冻结source/含runner和历史样例summary。示例复现：

```sh
node docs/balance/opponent-budget-v0155/before/games/source/scripts/check-opponent-tiers.mjs docs/balance/opponent-budget-v0155/before/games/source /tmp/qingxiao-opponent-before-new
node docs/balance/opponent-budget-v0155/after/games/source/scripts/check-opponent-tiers.mjs docs/balance/opponent-budget-v0155/after/games/source /tmp/qingxiao-opponent-after-new
```

两版只有opponent-planner.mjs和opponents.mjs不同：前者修正问道模拟及缓存公开输入，后者更新问道说明。切磋66个对应完整轨迹相同，问道55/66改变，65/66仍由玩家获胜。不能以此宣称所有NPC都更难或整体平衡完成。
