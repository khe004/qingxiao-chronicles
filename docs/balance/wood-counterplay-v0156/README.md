# 木修反制推演研究索引

- [采用与限制](../../木修反制推演复查-v0156.md)、[主对照报告](report.md)、[全部统计与逐局差异](report.json)。
- `before/`：v0.15.5基线重新执行132场；基线模块逐文件与Git提交核对，见`source-provenance.json`。
- `after/`：采用版重新执行132场。配置在`plan.json`，完整日志与统计在`records.json.gz`，模块与runner在`source/`，全部测量指纹在`source-hashes.json`。
- `rejected-empty-preview/`：未采用的132场完整候选。有可执行主招时可能选空预告，`regression-failure.txt`保存原回归失败依据。不能以它的结果替代采用版。
- `pilot/`：最初12场木修问道试跑，来源明确指向拒绝候选的冻结模块，与该候选相同输入的轨迹核对一致；是额外执行，不并入264场主对照。
- 基线与采用版各7个同输入手动夹具在`audit.json`：四个反制策略选择检查、两个付费退距检查、一个真实阶段备用招比较。采用版7项吻合参照动作／阶段，基线四项漏选反制、一项未执行完整备用招。夹具不是完整胜率样本。
- [回归输出](../../validation/wood-counterplay-v0156/)：包括595完整阶段对照、1590动作／释放对照、两档自然木土行为和浏览器检查。

主对照264场，拒绝候选132场，试跑12场，总新增408场。固定玩家先手、均衡自动、30回合上限；每位NPC只有两个指定玩家样例，不是十二流派全矩阵或真人胜率。NPC配装与独立双AI战斗规则保持原版。

从仓库根目录运行报告校验：

```sh
node scripts/report-wood-counterplay.mjs
```

冻结基线与采用版可分别复现到新目录，不能覆盖既有研究数据：

```sh
node docs/balance/wood-counterplay-v0156/before/source/scripts/check-opponent-tiers.mjs docs/balance/wood-counterplay-v0156/before/source /tmp/wood-before-replay
node docs/balance/wood-counterplay-v0156/after/source/scripts/check-opponent-tiers.mjs docs/balance/wood-counterplay-v0156/after/source /tmp/wood-after-replay
```

同输入夹具复现：

```sh
node docs/balance/wood-counterplay-v0156/after/source/scripts/audit-wood-counterplay.mjs docs/balance/wood-counterplay-v0156/after/source /tmp/wood-audit-replay
```

重放仅用于复现；不把已有记录或重新执行同场的回归算作新的独立随机样本。
