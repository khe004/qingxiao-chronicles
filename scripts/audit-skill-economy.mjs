import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CLASSES,MAJORS,total,RULES} from '../dist/engine.mjs';
import {DuelBattle} from '../dist/duel-setup.mjs';
const out=process.argv[2]??'/tmp/qingxiao-economy';
const rows=[];
for(const [key,c] of Object.entries(CLASSES))for(const major of Object.keys(MAJORS[key]))for(const s of c.skills){
 const ids=[s.id,...c.skills.map(x=>x.id).filter(id=>id!==s.id)].slice(0,6);
 const b=new DuelBattle(key,{major,skillIds:ids},{key:'water'}),a=b.player,e=b.enemy;
 b.distance=s.range.includes(1)?1:s.range[0];
 a.hp=100;a.shield=0;a.qi={metal:0,wood:0,water:0,fire:0,earth:0,any:2};
 if(key==='fire'){a.qi.wood=4;a.qi.fire=4;}else if(key==='sword'){a.qi.metal=6;a.qi.water=2;}else a.qi[key==='flame'?'fire':key]=8;
 a.intent=s.kind==='intent'?0:5;a.edge=major==='heavy';a.growth=s.kind==='cultivate'?0:3;a.growthPending=false;
 a.terrain=s.kind==='terrain'?0:3;a.tide=s.kind==='tide'?0:3;a.fireCasts=1;
 e.hp=e.maxHp=1000;e.shield=20;e.seed=5;e.burn=5;e.burnTurns=2;e.parasite=3;e.parasiteTurns=2;e.chilled=true;e.broken=true;e.reaction=false;
 if(['channel','sacrifice','ebb'].includes(s.kind)){for(const k of Object.keys(a.qi))a.qi[k]=0;a.qi[key==='fire'?'wood':key==='water'?'water':'fire']=2;}
 if(s.kind==='reaction'){
  b.phase='reaction';b.pending={s:b.skill(e,'repulse'),raw:18};a.chilled=true;
  assert.ok(b.canAnchor(a,b.pending.s));const qi=a.qi.earth,terrain=a.terrain,ap=a.ap;assert.ok(b.react('anchor').ok);
  assert.equal(a.qi.earth,qi-1);assert.equal(a.terrain,terrain-1);assert.equal(a.ap,ap);assert.equal(b.distance,1);assert.equal(a.reaction,false);
  rows.push({key,major,id:s.id,name:s.name,kind:s.kind,ap:0,cost:s.cost,preparation:'1地势及本回合应对',raw:0,hpChange:a.hp-100});continue;
 }
 assert.equal(b.legal(a,s.id),null,`${key}/${major}/${s.id}`);
 const before=structuredClone(a),target=structuredClone(e),raw=['attack','charge','force'].includes(s.kind)?b.raw(a,s):0;
 assert.ok(b.act(a,s.id).ok);assert.equal(a.ap,before.ap-s.ap);assert.ok(total(a.qi)<=10);assert.ok(Object.values(a.qi).every(n=>n>=0&&Number.isInteger(n)));
 assert.ok(a.shield<=60&&a.intent<=5&&a.growth<=3&&a.terrain<=3&&a.tide<=3&&e.seed<=5&&e.burn<=5&&e.parasite<=3);
 for(const [field,cap] of [['Growth',3],['Terrain',3],['Tide',3]])if(s['consume'+field])assert.equal(a[field.toLowerCase()],before[field.toLowerCase()]-Math.min(before[field.toLowerCase()],s['consume'+field]));
 if(s.consumeParasite)assert.equal(e.parasite,target.parasite-Math.min(target.parasite,s.consumeParasite));
 if(s.once&&a.ap>=s.ap){const state=JSON.stringify(b);assert.equal(b.act(a,s.id).ok,false);assert.equal(JSON.stringify(b),state,'A repeat cannot spend any state');}
 rows.push({key,major,id:s.id,name:s.name,kind:s.kind,ap:s.ap,cost:s.cost,raw,hpChange:a.hp-before.hp,enemyHpLoss:target.hp-e.hp,shieldGain:a.shield-before.shield,qiChange:total(a.qi)-total(before.qi),remainingQi:a.qi,prepared:{growth:a.growth,terrain:a.terrain,tide:a.tide,parasite:e.parasite,seed:e.seed,burn:e.burn},counter:a.counter,desc:s.desc});
}
assert.equal(rows.length,144);assert.equal(new Set(rows.map(r=>r.key+'/'+r.id)).size,72);
const wood=new DuelBattle('wood',{major:'symbiosis'},{key:'sword'});wood.player.hp=100;wood.player.growth=3;wood.player.qi.wood=1;const before=JSON.stringify(wood);assert.equal(wood.act(wood.player,'bloomheal').ok,false);assert.equal(JSON.stringify(wood),before,'Two-wood recovery is atomically rejected with one wood');
wood.player.qi.wood=2;assert.ok(wood.act(wood.player,'bloomheal').ok);assert.equal(wood.player.hp,142);assert.equal(wood.player.qi.wood,0);assert.equal(wood.player.growth,0);
const blood=new DuelBattle('flame',{skillIds:['stoke','quench','flare','kindle','eruption','ashenward']});blood.player.hp=100;for(const k of Object.keys(blood.player.qi))blood.player.qi[k]=0;
assert.ok(blood.act(blood.player,'stoke').ok);assert.ok(blood.act(blood.player,'quench').ok);assert.equal(blood.player.hp,96);assert.equal(total(blood.player.qi),1);assert.equal(blood.player.ap,1);assert.ok(blood.legal(blood.player,'stoke'));
const tide=new DuelBattle('water',{major:'tidal'});for(const k of Object.keys(tide.player.qi))tide.player.qi[k]=0;tide.player.qi.water=1;assert.ok(tide.act(tide.player,'gather').ok);assert.ok(tide.act(tide.player,'ebb').ok);assert.equal(total(tide.player.qi),2);assert.equal(tide.player.tide,1);assert.equal(tide.player.ap,1);
await mkdir(out,{recursive:true});const hashes={};for(const f of ['rules','engine','prepared','tactics'])hashes[f]=createHash('sha256').update(await readFile(new URL(`../dist/${f}.mjs`,import.meta.url))).digest('hex');
await writeFile(`${out}/audit.json`,JSON.stringify({rules:RULES.label,sourceHashes:hashes,scope:'144 manual legal casts, 72 skills and both majors; maximum stored preparations are independent fixtures, not a feasible single-turn combo',rows},null,2));
const md=['# 72神通消耗与出口审计','','共144个合法施展片段，覆盖每个神通在两主修下的结算。满准备为各招独立夹具，不是一次回合能同时得到的资源。原始伤害未计防御、五行、护盾或应对；数值不能直接当作实战输出。','','| 职业 / 主修 | 神通 | 行动 | 灵气 | 满准备原始伤害 | 实际自回 / 盾增 / 净气 |','| --- | --- | ---: | --- | ---: | --- |'];
for(const r of rows)md.push(`| ${CLASSES[r.key].nameShort} / ${MAJORS[r.key][r.major].name} | ${r.name} | ${r.kind==='reaction'?'应对':r.ap} | ${Object.entries(r.cost).map(([k,n])=>n+k).join('+')||'0'} | ${r.raw} | ${r.hpChange} / ${r.shieldGain??0} / ${r.qiChange??-1} |`);
md.push('','专项检查：1木气不能支付灵植回春，成功2木气仍恢复42并消费全部生长；燃血＋敛焰损4气血、用2行动净得1气；纳潮＋回潮用2行动净得1气并消费2潮势。有限反伤、到期、互不递归和溢出不返准备由战术回归另行验证。','', '有限行动与资源上限保证一个阶段不能无限操作；长期守御可能形成可持续对峙，不能据此排除跨回合拖延。30回合未决另在完整对阵表列出。','');
await writeFile(`${out}/report.md`,md.join('\n'));console.log('Economy audit: 72 skills × both majors, shared payment/AP/preparation caps, atomic recovery rejection and costly blood/tide cycles passed.');
