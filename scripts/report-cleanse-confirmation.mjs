import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=process.argv[2]??'docs/balance/cleanse-v0153';
const json=async f=>JSON.parse(await readFile(f)),records=async f=>JSON.parse(gunzipSync(await readFile(f))),hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=await json(`${root}/confirmation-manifest.json`),baseline=await records(`${root}/confirmation-baseline-records.json.gz`);
assert.equal(baseline.length,manifest.historicalUniqueRecords);const context=r=>JSON.stringify([r.a,r.b,r.controller,r.tendency,r.distance,r.first]),refs=new Map(baseline.map(r=>[context(r),r]));assert.equal(refs.size,baseline.length);
const blank=()=>({games:0,wins:0,losses:0,unresolved:0,actions:{}}),add=(s,r,seat)=>{s.games++;s[r.winner===null?'unresolved':r.winner===seat?'wins':'losses']++;for(const [id,n]of Object.entries(r.metrics[seat].actions))s.actions[id]=(s.actions[id]??0)+n;};
const result={newExtensionExecutions:660,totalScreenAndExtensionExecutions:1068,historicalUniqueRecords:baseline.length,historicalNewExecutions:0,scope:'Isolated whole-rival confirmations. Each shared target-versus-target scenario executes once and counts in both row totals; only unscreened contexts are newly executed. Not a final simultaneous-parameter matrix.',variants:{}};
for(const spec of manifest.specs){const original=await json(`${root}/${spec.id}/variant.json`),list=[],seen=new Set();
 for(const directory of [`${root}/${spec.id}`,spec.directory]){const plan=await json(`${directory}/plan.json`),data=await records(`${directory}/records.json.gz`),hashes=await json(`${directory}/source-hashes.json`);assert.equal(data.length,plan.jobs.length);assert.deepEqual(hashes,original.hashes);
  for(const [file,h]of Object.entries(hashes))assert.equal(hash(await readFile(`${directory}/source/${file}`)),h);
  for(const r of data){for(const k of Object.keys(plan.jobs[r.index]))assert.deepEqual(r[k],plan.jobs[r.index][k]);assert.ok(!seen.has(context(r)));seen.add(context(r));list.push(r);}
 }
 assert.equal(list.length,spec.combinedUniqueScenarios);const groups={};for(const r of list){const ref=refs.get(context(r));assert.ok(ref);if(original.kind==='rinse')assert.deepEqual(r.skillOverrides,{water:{rinse:{heal:original.heal}}});else assert.equal(r.skillOverrides,undefined);
  for(const id of spec.targets){const seat=r.a.id===id?0:r.b.id===id?1:-1;if(seat<0||r.tendency==='defensive'&&id!=='water/tidal')continue;const foe=r[seat?'a':'b'].id,key=`${id}/${r.controller}/${r.tendency}`,g=groups[key]??={target:id,controller:r.controller,tendency:r.tendency,before:blank(),after:blank(),foes:{}};add(g.before,ref,seat);add(g.after,r,seat);const f=g.foes[foe]??={before:blank(),after:blank()};add(f.before,ref,seat);add(f.after,r,seat);
  }
 }
 for(const g of Object.values(groups)){assert.equal(g.before.games,66);assert.equal(g.after.games,66);assert.equal(Object.keys(g.foes).length,11);for(const f of Object.values(g.foes)){assert.equal(f.before.games,6);assert.equal(f.after.games,6);}}
 result.variants[spec.id]={kind:original.kind,heal:original.heal,newExtensionExecutions:spec.newExecutions,combinedUniqueScenarios:list.length,groups};
}
await writeFile(`${root}/confirmation-report.json`,JSON.stringify(result,null,2));
const row=s=>`${s.wins} / ${s.losses} / ${s.unresolved}`,pct=s=>(100*s.wins/s.games).toFixed(1)+'%';
const md=['# 净化回复 · 全对手隔离确认','','新增660场：净息0补288，涤尘14／12各补186。三个候选合并各自首轮后的唯一情境分别360、318、318；目标对目标场次仅执行一次，供两行总计引用。首轮含未扩展的净息4，全部首轮与扩展合计1068次新运行。历史606场唯一对局作为同情境参照，新增0。','','每个主修／控制器／倾向66个跨派情境。净息0仍保留原涤尘18，涤尘14／12仍保留原净息8；不能将单项结果相加或拼成最终组合。共享配装、射程、费用、清除强度与AI保持基线。'];
for(const [id,v]of Object.entries(result.variants)){md.push('',`## ${id}`,'','| 目标 | 控制器 / 倾向 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 | 旧胜率 | 新胜率 |','| --- | --- | ---: | ---: | ---: | ---: |');for(const g of Object.values(v.groups))md.push(`| ${g.target} | ${g.controller} / ${g.tendency} | ${row(g.before)} | ${row(g.after)} | ${pct(g.before)} | ${pct(g.after)} |`);}
md.push('','逐对手六格和动作见[confirmation-report.json](confirmation-report.json)，原计划与完整纪要分别保留于各批次；检查点不另计。固定AI结果不能作为真人胜率或所有六槽已平衡的结论。','');
await writeFile(`${root}/confirmation-report.md`,md.join('\n'));console.log(Object.fromEntries(Object.entries(result.variants).map(([id,v])=>[id,Object.fromEntries(Object.entries(v.groups).map(([key,g])=>[key,[g.after.wins,g.after.losses,g.after.unresolved]]))])));
