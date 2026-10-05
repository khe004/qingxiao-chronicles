# v0.15 测量索引

本轮按顺序先筛选配装与费用，再修正AI，再测量采用的组合。固定情境、槽位顺序、准备预测边界与30回合上限均公开。测试中的胜出比例不是真人胜率，也不覆盖所有十二选六组合。

采用的组合以[完整12×12主表](final/report.md)为准；即时与筹划各468场，近中远各交换先手，每格6场，镜像另列。所有场景新执行，无历史结果复用。

## 四种倾向

| 倾向 | 即时12×12全表 | 筹划测量范围 |
| --- | --- | --- |
| 均衡 | [主表](final/report.md) | [同一完整主表](final/report.md) |
| 强攻 | [完整即时矩阵](aggressive/report.md) | [指定原推荐→新招对局](build-cohort/report.md) |
| 稳守 | [完整即时矩阵](defensive/report.md) | [指定原推荐→新招对局](build-cohort/report.md) |
| 蓄势 | [完整即时矩阵](burst/report.md) | [指定原推荐→新招对局](build-cohort/report.md) |

原推荐对指定新招对手共12种组合，四倾向、两种控制器、近中远、双方先手，共576场；该采样不代表原推荐拥有完整跨流派矩阵。配装名称便于阅读，实际六槽在plan.json逐场明确保存。

扩大测量共936＋3×468＋576＝2916场；前置筛选600场，合计3516场新增测量执行。另外[4场稳守长局延长到90回合](long-defense/report.md)独立计数，不替换30回合单元格；连同这4场诊断，共3520次研究运行。神通片段、计时、回归和确定性重放不混入胜率场数。未决留在分母，不视作双方各半胜。

## 前置配对试验

| 项目 | 场数 | 数据 |
| --- | ---: | --- |
| 寄生四种配装 | 96 | [摘要](parasite/summary.json) |
| 双藤加值候选（不采用） | 48 | [摘要](parasite-value/summary.json) |
| 生长回血与反伤竞争 | 24 | [摘要](parasite-final/summary.json) |
| 快剑四种配装 | 96 | [摘要](quick/summary.json) |
| 共生恢复三项单因素 | 80 | [摘要](symbiosis/summary.json) |
| 火系原推荐反制 | 16 | [摘要](sym-counter/summary.json) |
| 引燃、生息换招 | 120 | [摘要](fire-review/summary.json) |
| 寒凝、壁垒原推荐与新招 | 96 | [摘要](other-review/summary.json) |
| 壁垒回血换碎阵 | 24 | [摘要](earth-counter/summary.json) |

[采用与放弃理由](../../十二流派套路与资源复查-v015.md)包含对照表、局部限制、技能审计与AI性能证据。每组records.json.gz包含真实逐场完整纪要，source/与source-hashes.json冻结执行源码；候选仅在隔离工作线程内按plan.json修改，不污染线上数值。

## 复跑

```sh
node scripts/check-twelve-school.mjs /tmp/qingxiao-final --loadouts=tactics
node scripts/check-twelve-school.mjs /tmp/qingxiao-aggressive --loadouts=tactics --controllers=immediate --tendency=aggressive
node scripts/check-twelve-school.mjs /tmp/qingxiao-defensive --loadouts=tactics --controllers=immediate --tendency=defensive
node scripts/check-twelve-school.mjs /tmp/qingxiao-burst --loadouts=tactics --controllers=immediate --tendency=burst
node scripts/plan-build-cohort.mjs /tmp/qingxiao-cohort-plan.json
node scripts/review-tactics.mjs /tmp/qingxiao-cohort-plan.json /tmp/qingxiao-cohort
node scripts/audit-skill-economy.mjs /tmp/qingxiao-economy
node test-twelve-school.mjs --sample-replays
```

主表生成器每24场保存一个原子检查点，使用相同参数加--resume可继续；配置、场景和源码哈希不匹配会拒绝继续。源提交是开始测量时的基线，实际采用修订由冻结模块哈希确认。
