# 净息与涤尘 · 单因素筛选

新增408场：净息回血4／0各72场，涤尘回血14／12各132场。原净息8、涤尘18。180场唯一旧对局只作为相同情境引用，新增执行0；不把重复引用、检查点或重放增加到分母。

净息候选只改其硬编码回血和对应纪要文字；涤尘候选使用每场显式`skillOverrides`，有效回复值见计划，冻结规则仍是基线18。技能费用、清除强度、配装与AI不变。并发测量不用于比较选招延迟。

## purify-4

| 目标 | 控制器 / 倾向 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 | 旧胜率 | 新胜率 |
| --- | --- | ---: | ---: | ---: | ---: |
| flame/fierce | immediate / balanced | 6 / 18 / 0 | 6 / 18 / 0 | 25.0% | 25.0% |
| flame/fierce | prepared / balanced | 2 / 22 / 0 | 3 / 21 / 0 | 8.3% | 12.5% |
| fire/ignite | immediate / balanced | 6 / 6 / 0 | 6 / 6 / 0 | 50.0% | 50.0% |
| fire/ignite | prepared / balanced | 5 / 7 / 0 | 6 / 6 / 0 | 41.7% | 50.0% |

## purify-0

| 目标 | 控制器 / 倾向 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 | 旧胜率 | 新胜率 |
| --- | --- | ---: | ---: | ---: | ---: |
| flame/fierce | immediate / balanced | 6 / 18 / 0 | 6 / 18 / 0 | 25.0% | 25.0% |
| flame/fierce | prepared / balanced | 2 / 22 / 0 | 8 / 16 / 0 | 8.3% | 33.3% |
| fire/ignite | immediate / balanced | 6 / 6 / 0 | 6 / 6 / 0 | 50.0% | 50.0% |
| fire/ignite | prepared / balanced | 5 / 7 / 0 | 9 / 3 / 0 | 41.7% | 75.0% |

## rinse-14

| 目标 | 控制器 / 倾向 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 | 旧胜率 | 新胜率 |
| --- | --- | ---: | ---: | ---: | ---: |
| water/tidal | immediate / balanced | 24 / 12 / 0 | 19 / 17 / 0 | 66.7% | 52.8% |
| water/tidal | prepared / balanced | 22 / 14 / 0 | 17 / 19 / 0 | 61.1% | 47.2% |
| water/tidal | immediate / defensive | 29 / 1 / 6 | 26 / 4 / 6 | 80.6% | 72.2% |
| water/cold | immediate / balanced | 11 / 1 / 0 | 11 / 1 / 0 | 91.7% | 91.7% |
| water/cold | prepared / balanced | 11 / 1 / 0 | 11 / 1 / 0 | 91.7% | 91.7% |

## rinse-12

| 目标 | 控制器 / 倾向 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 | 旧胜率 | 新胜率 |
| --- | --- | ---: | ---: | ---: | ---: |
| water/tidal | immediate / balanced | 24 / 12 / 0 | 19 / 17 / 0 | 66.7% | 52.8% |
| water/tidal | prepared / balanced | 22 / 14 / 0 | 14 / 22 / 0 | 61.1% | 38.9% |
| water/tidal | immediate / defensive | 29 / 1 / 6 | 23 / 7 / 6 | 80.6% | 63.9% |
| water/cold | immediate / balanced | 11 / 1 / 0 | 11 / 1 / 0 | 91.7% | 91.7% |
| water/cold | prepared / balanced | 11 / 1 / 0 | 12 / 0 / 0 | 91.7% | 100.0% |

逐对手、六格与实际出招见[screen-report.json](screen-report.json)。筛选只覆盖指定配置，采用前须补全部对手及其他控制器／倾向，不能当作最终12×12。
