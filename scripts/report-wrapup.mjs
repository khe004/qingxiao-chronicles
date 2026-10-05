import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/balance/wrapup-v0151';
const shared=JSON.parse(await readFile(`${root}/ignite-confirm/source-hashes.json`));
for(const name of ['screen','ignite-confirm','attack-window','ignite-tradeoffs','smolder-confirm']){
 const dir=`${root}/${name}`,plan=JSON.parse(await readFile(`${dir}/plan.json`)),records=JSON.parse(gunzipSync(await readFile(`${dir}/records.json.gz`))),hashes=JSON.parse(await readFile(`${dir}/source-hashes.json`));assert.equal(records.length,plan.jobs.length);
 for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(`${dir}/source/${file}`)).digest('hex'),hash);
 if(name!=='attack-window')assert.deepEqual(hashes,shared,'Controlled kit comparisons must use identical combat sources');
 for(const [index,r] of records.entries()){assert.equal(r.index,index);for(const [key,value] of Object.entries(plan.jobs[index]))assert.deepEqual(r[key],value);assert.equal(r.winner===null?r.hp.every(x=>x>0):r.hp[1-r.winner]===0,true);}
 const groups={};for(const r of records){const key=`${r.tag}/${r.controller}`;const g=groups[key]??={games:0,wins:0,losses:0,unresolved:0};g.games++;g[r.winner===null?'unresolved':r.winner===0?'wins':'losses']++;}
 const md=[`# ${({screen:'单招与原推荐配装筛选','ignite-confirm':'引燃蓄势出口全对手确认','attack-window':'集中进攻候选保留试验','ignite-tradeoffs':'引燃回血/护体交换蓄势','smolder-confirm':'焚灼即时出口全对手确认'})[name]}`,'',`共${records.length}次执行；双方均衡、近中远、交换先手，两种控制器。反伤修正固定不变。每行汇总按左方构筑统计，未决保留在分母；${name==='attack-window'?'本组仅改变筹划AI的候选保留，没有改招式或配装。':'原推荐是整套对照，其他候选只换一槽。'}`,'','| 构筑 / 控制器 | 胜 / 负 / 未决 | 场数 |','| --- | ---: | ---: |'];
 for(const [key,g] of Object.entries(groups))md.push(`| ${key} | ${g.wins} / ${g.losses} / ${g.unresolved} | ${g.games} |`);
 md.push('','| 构筑 / 控制器 | 对手 | 胜 / 负 / 未决 |','| --- | --- | ---: |');
 for(const key of Object.keys(groups))for(const foe of new Set(records.filter(r=>`${r.tag}/${r.controller}`===key).map(r=>r.b.id))){const rows=records.filter(r=>`${r.tag}/${r.controller}`===key&&r.b.id===foe);assert.equal(rows.length,6);md.push(`| ${key} | ${foe} | ${rows.filter(r=>r.winner===0).length} / ${rows.filter(r=>r.winner===1).length} / ${rows.filter(r=>r.winner===null).length} |`);}
 md.push('','plan.json是显式配置；records.json.gz保留逐轮纪要。source与source-hashes冻结当时执行代码。后续采用后的完整矩阵另测，不能把这些候选资料当作当前全部十二流派胜率。','');await writeFile(`${dir}/report.md`,md.join('\n'));console.log(name,records.length,groups);
}
