# v0.15.1 收尾复查

本轮围绕三个已知反例：备用策略把护盾吸收的反伤当成气血损失；稳守生息/共生90回合未决；筹划引燃偏弱及木系对离火多个6/6格。

- [反伤原局复现](reflection/results.json)：原v0.15指定对照记录559，同一第4回合末行动状态，207气血、60护盾、敌方一次12基础金反击。原备用策略结束；修正后岩矢可合法出手，气血仍207，真实结算消费反击。另保留两版本完整走到该回合的状态，不能把已分歧的整局状态说成相同快照。
- [长局诊断](long-baseline/report.md)：使用原v0.15冻结源码，把原90回合未决的生息/共生延长至260上限；第197回合生息胜。多个后期回合木修受31、恢复30，尚在缓慢失血。没有用强制超时或暗加伤害制造胜者。该一次延长执行不加入胜率分母，也不能证明其他未决都会自行结束。
- [单槽候选与原推荐](screen/report.md)：384次执行，引燃四套对四个固定对手；烈焰与焚灼各四套对两种木修。原推荐是整套对照，其他为单槽替换。
- [引燃全对手确认](ignite-confirm/report.md)：264次执行，原新招样例与离火蓄势出口分别对其余11主修；每套/每控制器66场。首轮与扩展里重复的固定情境不合并增加样本权重。
- [引燃防守槽取舍](ignite-tradeoffs/report.md)：另264次执行，分别用回血槽或护体槽换蓄势，避免无代价堆叠。与引燃确认的基线共享相同冻结规则和所有对手配置。
- [焚灼全对手确认](smolder-confirm/report.md)：264次执行，赤日换敛焰；区分去除蓄势候选后的选招变化和实际恢复使用，不能把收益自动归因于回血。
- [集中进攻保留候选](attack-window/report.md)：24次执行，仅改变筹划AI短名单保留，在既定12候选预算内额外保留最高直接伤害方案；两种离火对两种木修仍0/12，放弃。
- [采用前后逐流派对照](comparison.md)：两个最终版本的组合差异；不等同于单项因果。
- [采用后完整12×12](final/report.md)：新测均衡、两控制器、近中远、交换先手；每格6场，镜像及30回合未决单列。
- [采用后稳守对照](defensive/report.md)：同一最终版本，稳守即时控制器完整矩阵。其他倾向的[v0.15历史结果](../tactical-v015/README.md)仍保留，不能当作当前版本新测量。

每一批保存显式配置、逐轮结果、冻结代码和SHA-256。候选、历史延长与最终矩阵有各自的代码版本；不得因为当前代码变化而重写旧数据的散列。确定性固定AI情境不代表真人胜率或最优十二选六。

复现历史长局：

```sh
node scripts/check-defense-tail.mjs docs/balance/tactical-v015/long-defense /tmp/qingxiao-defense-tail
node scripts/check-reflection-choice.mjs /tmp/qingxiao-reflection-choice
node scripts/review-tactics.mjs docs/balance/wrapup-v0151/screen/plan.json /tmp/qingxiao-wrapup-screen
node scripts/check-twelve-school.mjs /tmp/qingxiao-wrapup-final --loadouts=tactics
```

候选资料应在其冻结source目录用对应脚本与计划复现；根目录的最新脚本用于当前最终版本。复现同一固定情境不增加胜率证据。

本轮保留研究记录：1200筛选/确认 + 936最终均衡 + 468最终稳守 + 1历史延长 = 2605条。另有一次相同历史延长的预先复现、核心测试、检查点续跑验证和分层重放，不混入胜率分母。矩阵全部新执行，未以重复或结构复用冒充新增样本。
