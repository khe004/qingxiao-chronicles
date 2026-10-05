import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=process.argv[2]??'docs/balance/cleanse-v0153';
const json=async f=>JSON.parse(await readFile(f)),records=async f=>JSON.parse(gunzipSync(await readFile(f)));
const manifest=await json(`${root}/screen-manifest.json`),baseline=await records(`${root}/baseline-records.json.gz`);
assert.equal(baseline.length,manifest.historicalUniqueRecords);
const hash=b=>createHash('sha256').update(b).digest('hex');
const context=r=>JSON.stringify([r.a,r.b,r.controller,r.tendency,r.distance,r.first]);
const refs=new Map(baseline.map(r=>[context(r),r]));assert.equal(refs.size,baseline.length);
const blank=()=>({games:0,wins:0,losses:0,unresolved:0,actions:{}});
const add=(s,r,seat)=>{s.games++;s[r.winner===null?'unresolved':r.winner===seat?'wins':'losses']++;for(const [id,n]of Object.entries(r.metrics[seat].actions))s.actions[id]=(s.actions[id]??0)+n;};
const result={scope:'Isolated purify healing and rinse healing screens, not the simultaneously adopted final version. Same ordered actors/full six slots, controllers, tendencies, ranges and initiatives. Historical references are not newly executed.',newExecutions:0,historicalUniqueRecords:baseline.length,historicalNewExecutions:0,variants:{}};
for(const {id,games}of manifest.specs){const path=`${root}/${id}`,spec=await json(`${path}/variant.json`),plan=await json(`${path}/plan.json`),list=await records(`${path}/records.json.gz`),hashes=await json(`${path}/source-hashes.json`);
 assert.equal(list.length,games);assert.equal(plan.jobs.length,games);assert.deepEqual(hashes,spec.hashes);
 for(const [file,digest]of Object.entries(hashes)){const data=await readFile(`${path}/source/${file}`);assert.equal(hash(data),digest);
  if(spec.kind==='purify'&&file==='dist/engine.mjs'){assert.equal(spec.patches.length,1);const patch=spec.patches[0],source=await readFile(`${spec.sourceBaseline}/final/source/${file}`,'utf8');assert.equal(source.split(patch.before).length,2);assert.equal(data.toString(),source.replace(patch.before,patch.after));}
  else if(file!=='scripts/review-tactics.mjs')assert.equal(digest,spec.baselineHashes[file]);
 }
 const groups={},seen=new Set();for(const r of list){const job=plan.jobs[r.index];assert.ok(job);for(const k of Object.keys(job))assert.deepEqual(r[k],job[k]);assert.ok(!seen.has(context(r)));seen.add(context(r));const ref=refs.get(context(r));assert.ok(ref);
  if(spec.kind==='rinse')assert.deepEqual(r.skillOverrides,{water:{rinse:{heal:spec.heal}}});else assert.equal(r.skillOverrides,undefined);
  const target=spec.kind==='purify'?r.a.id:[r.a.id,r.b.id].includes('water/tidal')?'water/tidal':'water/cold',seat=r.a.id===target?0:1,foe=r[seat?'a':'b'].id,key=`${target}/${r.controller}/${r.tendency}`,g=groups[key]??={target,controller:r.controller,tendency:r.tendency,before:blank(),after:blank(),foes:{}};
  add(g.before,ref,seat);add(g.after,r,seat);const f=g.foes[foe]??={before:blank(),after:blank()};add(f.before,ref,seat);add(f.after,r,seat);
 }
 for(const g of Object.values(groups)){const expected=g.target==='flame/fierce'?24:g.target==='water/tidal'?36:12;assert.equal(g.after.games,expected);assert.equal(g.before.games,expected);for(const f of Object.values(g.foes)){assert.equal(f.before.games,6);assert.equal(f.after.games,6);}}
 result.variants[id]={kind:spec.kind,heal:spec.heal,newExecutions:games,groups};result.newExecutions+=list.length;
}
assert.equal(result.newExecutions,408);
await writeFile(`${root}/screen-report.json`,JSON.stringify(result,null,2));
const row=s=>`${s.wins} / ${s.losses} / ${s.unresolved}`,pct=s=>(100*s.wins/s.games).toFixed(1)+'%';
const md=['# 净息与涤尘 · 单因素筛选','','新增408场：净息回血4／0各72场，涤尘回血14／12各132场。原净息8、涤尘18。180场唯一旧对局只作为相同情境引用，新增执行0；不把重复引用、检查点或重放增加到分母。','','净息候选只改其硬编码回血和对应纪要文字；涤尘候选使用每场显式`skillOverrides`，有效回复值见计划，冻结规则仍是基线18。技能费用、清除强度、配装与AI不变。并发测量不用于比较选招延迟。'];
for(const [id,v]of Object.entries(result.variants)){md.push('',`## ${id}`,'','| 目标 | 控制器 / 倾向 | 旧胜 / 负 / 未决 | 新胜 / 负 / 未决 | 旧胜率 | 新胜率 |','| --- | --- | ---: | ---: | ---: | ---: |');for(const g of Object.values(v.groups))md.push(`| ${g.target} | ${g.controller} / ${g.tendency} | ${row(g.before)} | ${row(g.after)} | ${pct(g.before)} | ${pct(g.after)} |`);}
md.push('','逐对手、六格与实际出招见[screen-report.json](screen-report.json)。筛选只覆盖指定配置，采用前须补全部对手及其他控制器／倾向，不能当作最终12×12。','');
await writeFile(`${root}/screen-report.md`,md.join('\n'));console.log(Object.fromEntries(Object.entries(result.variants).map(([id,v])=>[id,Object.fromEntries(Object.entries(v.groups).map(([key,g])=>[key,{before:[g.before.wins,g.before.unresolved],after:[g.after.wins,g.after.unresolved]}]))])));
