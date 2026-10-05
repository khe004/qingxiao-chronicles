import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
const root=process.argv[2]??'docs/balance/pressure-v0152',reference=process.argv[3]??root;
const read=async f=>JSON.parse(await readFile(f));
const records=async f=>JSON.parse(gunzipSync(await readFile(f)));
const list=await records(`${root}/guard/records.json.gz`),plan=await read(`${root}/guard/plan.json`),hashes=await read(`${root}/guard/source-hashes.json`);
assert.equal(list.length,198);assert.equal(plan.jobs.length,198);
for(const [file,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(`${root}/guard/source/${file}`)).digest('hex'),hash);
const refs={};for(const suite of ['final','defensive']){refs[suite]=await records(`${reference}/${suite}/records.json.gz`);const h=await read(`${reference}/${suite}/source-hashes.json`);for(const file of Object.keys(hashes).filter(f=>f!=='scripts/review-tactics.mjs'))assert.equal(hashes[file],h[file]);}
const groups={},baselines=[],seen=new Set();
const sum=(g,r,seat)=>{g.games++;g[r.winner===null?'unresolved':r.winner===seat?'wins':'losses']++;for(const [id,n]of Object.entries(r.metrics[seat].actions))g.actions[id]=(g.actions[id]??0)+n;};
const blank=()=>({games:0,wins:0,losses:0,unresolved:0,actions:{}});
for(const r of list){for(const k of Object.keys(plan.jobs[r.index]))assert.deepEqual(r[k],plan.jobs[r.index][k]);
 const suite=r.tendency==='defensive'?'defensive':'final',seat=r.a.id==='water/tidal'?0:1,target=r[seat?'b':'a'],original=structuredClone(target);assert.ok(original.config.skillIds.includes('mirrorwater')&&original.config.skillIds.includes('rinse'));original.config.skillIds=original.config.skillIds.map(id=>id==='mirrorwater'?'waterwall':id);
 const ref=refs[suite].find(h=>h.a.id===r.a.id&&h.b.id===r.b.id&&h.controller===r.controller&&h.tendency===r.tendency&&h.distance===r.distance&&h.first===r.first);assert.ok(ref);
 assert.deepEqual(ref[seat?'b':'a'],original);assert.deepEqual(ref[seat?'a':'b'],r[seat?'a':'b']);const unique=`${suite}/${ref.index}`;assert.ok(!seen.has(unique));seen.add(unique);baselines.push({...ref,referenceSuite:`${reference}/${suite}`});
 const key=`${r.controller}/${r.tendency}`,g=groups[key]??={before:blank(),after:blank(),foes:{}};sum(g.before,ref,seat);sum(g.after,r,seat);const foe=r[seat?'a':'b'].id,f=g.foes[foe]??={before:blank(),after:blank()};sum(f.before,ref,seat);sum(f.after,r,seat);
}
for(const g of Object.values(groups)){assert.equal(g.before.games,66);assert.equal(g.after.games,66);assert.equal(Object.keys(g.foes).length,11);for(const f of Object.values(g.foes)){assert.equal(f.before.games,6);assert.equal(f.after.games,6);}}
const result={newExecutions:198,referenceRecords:198,referenceNewExecutions:0,reference,scope:'Further one-slot waterwall→mirrorwater trade on the rinse kit, with the same newly combined rivals and unchanged combat source. Baseline entries point to existing final/defensive runs, never add another execution.',groups};
await writeFile(`${root}/guard/baselines.json.gz`,gzipSync(JSON.stringify(baselines)));await writeFile(`${root}/guard/report.json`,JSON.stringify(result,null,2));
const md=['# 潮汐涤尘组合 · 护盾槽代价复查','','涤尘组合的稳守偏强后，单独测试御水槽换玄水镜屏。三组各66场，全部11个同版本对手，三距离、交换先手；新执行198场。基线198条引用来自已执行的涤尘组合矩阵，新增执行0场。相同座次、完整对手六槽、控制器、倾向与边界；战斗源码字节一致。','','| 控制器 / 倾向 | 御水版本胜 / 负 / 未决 | 镜屏版本胜 / 负 / 未决 | 旧胜率 | 新胜率 |','| --- | ---: | ---: | ---: | ---: |'];
for(const [key,g]of Object.entries(groups)){const row=s=>`${s.wins} / ${s.losses} / ${s.unresolved}`,pct=s=>(100*s.wins/s.games).toFixed(1)+'%';md.push(`| ${key} | ${row(g.before)} | ${row(g.after)} | ${pct(g.before)} | ${pct(g.after)} |`);}
md.push('','逐对手和实际出招数见[report.json](report.json)，完整逐场纪要见records.json.gz。镜屏是一次有限反击，不能反持续伤害；它支付1水1任意，主动护盾10，不能将其反击当作必定造成的伤害。','');await writeFile(`${root}/guard/report.md`,md.join('\n'));console.log(Object.fromEntries(Object.entries(groups).map(([k,g])=>[k,{before:g.before,after:g.after}])));
