// Create an isolated, reviewable runtime. Candidate rules never mutate dist.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,readdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [manifestPath,out]=process.argv.slice(2);assert.ok(manifestPath&&out);
const candidate=JSON.parse(await readFile(manifestPath,'utf8'));
assert.ok(candidate.label&&candidate.rules);
// After adoption, historical candidates still start from their recorded base,
// rather than applying a second set of patches to the shipped candidate.
const currentEngine=await readFile(new URL('../dist/engine.mjs',import.meta.url),'utf8');
const sourceRoot=candidate.sourceRoot?resolve(candidate.sourceRoot):currentEngine.includes('// Balance descriptions share the actual patched skill parameters.')?resolve('docs/balance/goal-v0160/base/source'):null;
const baseMetadata=sourceRoot?JSON.parse(await readFile(`${sourceRoot}/../metadata.json`,'utf8')):null;
const files=[];
for(const dir of ['dist','scripts']){
 await mkdir(`${out}/${dir}`,{recursive:true});
 for(const name of await readdir(new URL(`../${dir}/`,import.meta.url)))if(name.endsWith('.mjs')){
  const path=`${dir}/${name}`;files.push(path);await copyFile(new URL('../'+path,import.meta.url),`${out}/${path}`);
 }
}
if(sourceRoot){
 for(const file of ['dist/rules.mjs','dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs','dist/tactics.mjs','dist/active-policy.mjs','dist/recorded-battle.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs']){
  const data=await readFile(`${sourceRoot}/${file}`);
  assert.equal(createHash('sha256').update(data).digest('hex'),baseMetadata.hashes[file],`Frozen base changed: ${file}`);
  await writeFile(`${out}/${file}`,data);
 }
}
const base=(await import(sourceRoot?pathToFileURL(`${sourceRoot}/dist/rules.mjs`).href:'../dist/rules.mjs')).RULES;
function merge(a,b){const result=structuredClone(a);for(const [k,v] of Object.entries(b))result[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(result[k]??{},v):v;return result;}
const rules=merge(base,candidate.rules);rules.label=candidate.label;
if(candidate.deriveSkillDescriptions&&candidate.deriveRuleDescriptions!==false){
 const {CLASSES}=await import(sourceRoot?pathToFileURL(`${sourceRoot}/dist/engine.mjs`).href:'../dist/engine.mjs');
 const patched=(key,id)=>({...CLASSES[key].skills.find(s=>s.id===id),...rules.skills[key]?.[id]});
 const describe=(key,id)=>!Array.isArray(candidate.deriveRuleDescriptions)||candidate.deriveRuleDescriptions.includes(`${key}/${id}`);
 // Store descriptions derived from the same candidate values in RULES. This
 // keeps skill-only iterations honest without editing combat source code.
 if(rules.skills.earth?.quakesunder&&describe('earth','quakesunder')){const s=patched('earth','quakesunder');rules.skills.earth.quakesunder.desc=`支付${s.cost.earth}土气与${s.cost.any}任意气，造成${s.power}基础土伤${s.shieldPierce?'，'+Math.round(s.shieldPierce*100)+'%越过护盾，仍受防御与五行减免':''}；破除1地势或${s.breakPrepAmount??2}生长，不打断；${s.ap}行动，${s.range.length===3?'全距':'近中距'}。`;}
 if(rules.skills.fire?.heal&&describe('fire','heal')){const s=patched('fire','heal');rules.skills.fire.heal.desc=`恢复${s.heal}气血，清除自身至多${s.clearBurn}层灼烧${s.once?'；每回合一次':''}。`;}
 if(rules.skills.flame?.ashenward&&describe('flame','ashenward')){const s=patched('flame','ashenward');rules.skills.flame.ashenward.desc=`获得${s.shield}护盾，准备${s.reflectHits}次反击，每次至多${s.reflect}基础火伤，至下次自身阶段到期；每回合一次，不递归反伤。`;}
 if(rules.skills.water?.mirrorwater&&describe('water','mirrorwater')){const s=patched('water','mirrorwater');rules.skills.water.mirrorwater.desc=`获得${s.shield}护盾；消费至多${s.consumeTide}潮势，准备${s.reflectHits}次反击，每次${s.reflect}基础水伤加每潮势${s.reflectPrepPower}，至下次自身阶段到期；每回合一次，不递归反伤。`;}
 if(rules.skills.water?.waterwall&&describe('water','waterwall')){const s=patched('water','waterwall');rules.skills.water.waterwall.desc=`获得${s.shield}护盾，有潮势时消费${s.consumeTide}层再增加${s.tideShield}；总盾上限60。`;}
}
await writeFile(`${out}/dist/rules.mjs`,'// Isolated numerical candidate.\nexport const RULES = '+JSON.stringify(rules,null,2)+';\n');
if(candidate.sustainRecovery!==undefined){
 const path=`${out}/dist/engine.mjs`,source=await readFile(path,'utf8');
 assert.equal(source.split('export const SUSTAIN_RECOVERY = 2;').length,2);
 await writeFile(path,source.replace('export const SUSTAIN_RECOVERY = 2;',`export const SUSTAIN_RECOVERY = ${candidate.sustainRecovery};`));
}
if(candidate.reserveReactionWeight!==undefined){
 assert.ok(Number.isFinite(candidate.reserveReactionWeight)&&candidate.reserveReactionWeight>=0);
 const path=`${out}/dist/auto.mjs`,source=await readFile(path,'utf8');
 const anchor='  score+=(total(future.player.qi)-total(start.player.qi))*.35;';
 assert.equal(source.split(anchor).length,2);
 const patch=`  // Immediate/root estimates must value a paid reaction before the rival acts.
  // Completed forecasts already execute the reaction and must not count it twice.
  if(future===leaf&&leaf.player.reaction&&leaf.enemy.ap>0){
    const p=leaf.player,k=CLASSES[p.key].reactionElement;
    const threat=Math.max(0,...leaf.skills(leaf.enemy).filter(s=>s.power&&!leaf.legal(leaf.enemy,s.id)).map(s=>leaf.damage(leaf.enemy,s,leaf.raw(leaf.enemy,s),1,p)));
    if(p.qi[k]>=1)score+=Math.min(26,60-p.shield,Math.max(0,threat-p.shield))*t.health*${candidate.reserveReactionWeight};
  }
`;
 await writeFile(path,source.replace(anchor,patch+anchor));
}
if(candidate.preparedReflectionCandidate){
 const path=`${out}/dist/auto.mjs`,source=await readFile(path,'utf8');
 const anchor='  add(ranked[0]);add(candidates.find(c=>c.path.length===0));';
 assert.equal(source.split(anchor).length,2);
 const patch="\n  // Reflection has no immediate damage; retain one paid guard route for the forecast.\n  // The candidate budget stays at twelve and the forecast may still reject it.\n  add(ranked.find(c=>c.path.some(id=>Boolean(c.leaf.skill(c.leaf.player,id)?.reflect))));";
 await writeFile(path,source.replace(anchor,anchor+patch));
}
if(candidate.preparedControlCandidates){
 const path=`${out}/dist/auto.mjs`,source=await readFile(path,'utf8');
 const anchor='    c=>Boolean(c.leaf.player.charge&&c.leaf.player.anchored),';
 assert.equal(source.split(anchor).length,2);
 const patch=`    // Compare a paid escape/control line and stored tide before pruning
    // the forecast shortlist to immediate damage. The same budget applies.
    c=>c.path.some(id=>c.leaf.skill(c.leaf.player,id)?.kind==='force')&&c.leaf.distance===2,
    c=>c.path.includes('gather')&&c.leaf.player.tide>0,
`;
 await writeFile(path,source.replace(anchor,patch+anchor));
}
if(candidate.preparationBreakAmount){
 const path=`${out}/dist/engine.mjs`,source=await readFile(path,'utf8');
 const anchor="if(s.breakPrep)breakPreparation(this,target,target.terrain?'terrain':'growth',target.terrain?1:2);";
 assert.equal(source.split(anchor).length,2);
 await writeFile(path,source.replace(anchor,"if(s.breakPrep)breakPreparation(this,target,target.terrain?'terrain':'growth',target.terrain?1:(s.breakPrepAmount??2));"));
}
if(candidate.parasiteCleanseCost){
 const path=`${out}/dist/prepared.mjs`,source=await readFile(path,'utf8');
 const anchor="cost:{any:1},kind:'unparasite'";
 assert.equal(source.split(anchor).length,2);
 await writeFile(path,source.replace(anchor,"cost:{any:RULES.unparasiteCost??1},kind:'unparasite'"));
}
if(candidate.deriveSkillDescriptions){
 const path=`${out}/dist/engine.mjs`,source=await readFile(path,'utf8');
 const anchor='export function normalizeLoadout(key,config={}){';
 assert.equal(source.split(anchor).length,2);
 const patch=`// Balance descriptions share the actual patched skill parameters.
const nourish=skillOf('fire','nourish');nourish.desc=\`恢复\${nourish.heal}气血，清除\${nourish.clearBurn}层灼烧，凝聚1通灵；每回合一次。\`;
const sprout=skillOf('fire','sproutguard');sprout.desc=\`获得\${sprout.shield}护盾，在对手身上积累\${sprout.seedGain}灵种；每回合一次。\`;
const riposte=skillOf('sword','riposte');riposte.desc=\`获得\${riposte.shield}护盾\${riposte.intent?'与'+riposte.intent+'剑意':''}，准备一次至多\${riposte.reflect}基础金伤的反击；下次自身阶段到期，不递归反伤。\`;
const cleave=skillOf('sword','cleave');cleave.desc=\`消费至多\${cleave.intentLimit}剑意，每层增加\${RULES.intentPower}基础伤害；目标有盾时额外\${cleave.shieldBonus}，基础\${cleave.power}，2行动。\`;
const eruption=skillOf('flame','eruption');eruption.desc=\`造成\${eruption.power}基础火伤\${eruption.breakPrep?'，再破除'+(eruption.breakPrepAmount??2)+'生长（有地势则改破除1地势）':''}；限近中距，支付2火气与1任意气。\`;
const firestorm=skillOf('flame','firestorm');firestorm.desc=\`至少\${firestorm.minBurn}层灼烧，消费至多\${firestorm.consumeBurn}层各增\${firestorm.burnPower}基础伤害，基础\${firestorm.power}；命中再附加\${firestorm.burn}层，2行动，全距。\`;
const tidespear=skillOf('water','tidespear');tidespear.desc=\`至少\${tidespear.minTide}潮势，消费至多\${tidespear.consumeTide}层，每层增加\${tidespear.tidePower}基础伤害，基础\${tidespear.power}；\${tidespear.ap}行动，全距\${tidespear.shieldPierce?'，'+Math.round(tidespear.shieldPierce*100)+'%伤害越过护盾，仍受防御与五行减免':''}。\`;
surge.desc=\`至少1潮势，消费至多\${surge.consumeTide}层，每层增加\${surge.tidePower}基础伤害，基础\${surge.power}\${surge.farPrep?'；满3潮势可远距，未满限近中距':'；限近中距'}。同一储备不能再用于防护或回潮。\`;
const icebreaker=skillOf('water','icebreaker');icebreaker.desc=\`需要并消费凝滞，\${icebreaker.power}基础水伤加\${icebreaker.chillPower}强化；不迫退，与寒凝增伤和逐浪争用同一次凝滞\${icebreaker.shieldPierce?'；'+Math.round(icebreaker.shieldPierce*100)+'%伤害越过护盾，仍受防御与五行减免':''}。\`;
const swordguard=skillOf('sword','guard');swordguard.desc=\`获得\${swordguard.shield}护盾\${swordguard.intent?'与'+swordguard.intent+'剑意':''}；金气也用于进攻和横剑应对。\`;
const pierce=skillOf('sword','pierce');pierce.desc=\`支付\${pierce.intentCost}剑意，造成\${pierce.power}基础金伤；\${Math.round(pierce.shieldPierce*100)}%伤害越过护盾，仍按兵刃防御减免，命中后养意。\`;
const lunge=skillOf('sword','lunge');lunge.desc=\`消耗\${lunge.intentCost}剑意，近身造成\${lunge.power}基础金伤并打断蓄势；命中后积累1剑意。\`;
const earthmend=skillOf('earth','earthmend');earthmend.desc=\`消费至多\${earthmend.consumeTerrain}地势，每层恢复\${earthmend.terrainHeal}气血，基础\${earthmend.heal}\${earthmend.clearBurn?'，清除至多'+earthmend.clearBurn+'层灼烧':'，不清异常'}；每回合一次。\`;
const stoneback=skillOf('earth','stoneback');stoneback.desc=\`获得\${stoneback.shield}护盾，消费至多\${stoneback.consumeTerrain}地势，准备\${stoneback.reflectHits}次反击；每次\${stoneback.reflect}基础土伤，每层地势增加\${stoneback.reflectPrepPower}，至下次自身阶段；每回合一次。\`;
const gravel=skillOf('earth','gravel');gravel.desc=\`造成\${gravel.power}基础土伤，积累\${gravel.gainTerrain}地势，上限3\${gravel.breakPrep?'，再破除'+(gravel.breakPrepAmount??2)+'生长（有地势则改破除1地势）':''}；每回合一次，不免移动损阵。\`;
if(reap.shieldPierce)reap.desc+=\` \${Math.round(reap.shieldPierce*100)}%伤害越过护盾，仍受防御与五行减免。\`;
`;
 const commonAnchor='export function tideBonus(s,actor){';assert.equal(source.split(commonAnchor).length,2);
 const commonPatch="const unparasite=COMMON.find(s=>s.id==='unparasite');unparasite.desc=`支付1行动、${unparasite.cost.any}任意灵气，只清除自身寄生；不回血，不清其他异常。`;\n";
 await writeFile(path,source.replace(anchor,patch+anchor).replace(commonAnchor,commonPatch+commonAnchor));
}
if(candidate.dynamicFirestormDescription){
 assert.ok(candidate.deriveSkillDescriptions);
 const path=`${out}/dist/engine.mjs`,source=await readFile(path,'utf8');
 const anchor='层，2行动，全距。`;';
 assert.equal(source.split(anchor).length,2);
 await writeFile(path,source.replace(anchor,"层，${firestorm.ap}行动，全距${firestorm.once?'；每回合一次':''}。`;"));
}
if(candidate.dynamicTideInterruptDescription){
 assert.ok(candidate.deriveSkillDescriptions);
 const path=`${out}/dist/engine.mjs`,source=await readFile(path,'utf8');
 const anchor="全距${tidespear.shieldPierce?";
 assert.equal(source.split(anchor).length,2);
 await writeFile(path,source.replace(anchor,"全距${tidespear.interrupt?'；命中打断蓄势':''}${tidespear.shieldPierce?"));
}
if(candidate.deriveAIReasons){
 const path=`${out}/dist/auto.mjs`;let source=await readFile(path,'utf8');
 for(const [before,after] of [
  ["case 'gather':return `投入行动与水气积累", "case 'gather':return `投入行动与灵气积累"],
  ["case 'surge':return `消费 ${Math.min(2,p.tide)} 潮势", "case 'surge':return `消费 ${Math.min(b.skill(p,'surge').consumeTide??0,p.tide)} 潮势"],
 ]){assert.equal(source.split(before).length,2);source=source.replace(before,after);}
 await writeFile(path,source);
}
if(candidate.majorHpSupport){
 const path=`${out}/dist/engine.mjs`;let source=await readFile(path,'utf8');
 const anchor='const c=CLASSES[key],loadout=normalizeLoadout(key,config);return {';
 assert.equal(source.split(anchor).length,2);
 assert.equal(source.split('hp:c.hp,maxHp:c.hp').length,2);
 source=source.replace(anchor,'const c=CLASSES[key],loadout=normalizeLoadout(key,config),hp=RULES.majorHp?.[key]?.[loadout.major]??c.hp;return {').replace('hp:c.hp,maxHp:c.hp','hp,maxHp:hp');
 const description='export function normalizeLoadout(key,config={}){';assert.equal(source.split(description).length,2);
 const patch="// A specialization may trade initial durability for its tactical advantages.\nfor(const [key,majors] of Object.entries(RULES.majorHp??{}))for(const [major,hp] of Object.entries(majors)){if(!MAJORS[key]?.[major]||!Number.isInteger(hp)||hp<1||hp>500)throw Error('主修气血配置无效');MAJORS[key][major].effect+=` 气血上限为${hp}。`;}\n";
 await writeFile(path,source.replace(description,patch+description));
}
if(candidate.deriveHealthDescription){
 const path=`${out}/dist/engine.mjs`,source=await readFile(path,'utf8');
 const anchor='export function normalizeLoadout(key,config={}){';
 assert.equal(source.split(anchor).length,2);
 const patch="const fireheal=skillOf('fire','heal');fireheal.desc=`恢复 ${fireheal.heal} 气血，清除自身至多 ${fireheal.clearBurn} 层灼烧${fireheal.once?'；每回合一次':''}。`;\n";
 await writeFile(path,source.replace(anchor,patch+anchor));
}
await mkdir(`${out}/.git`,{recursive:true});
let commit=(await readFile(new URL('../.git/HEAD',import.meta.url),'utf8')).trim();
if(commit.startsWith('ref: '))commit=(await readFile(new URL('../.git/'+commit.slice(5),import.meta.url),'utf8')).trim();
if(sourceRoot)commit=baseMetadata.baseCommit;
await writeFile(`${out}/.git/HEAD`,commit+'\n');
const hashes={};for(const f of files)hashes[f]=createHash('sha256').update(await readFile(`${out}/${f}`)).digest('hex');
await writeFile(`${out}/candidate.json`,JSON.stringify({manifest:candidate,baseCommit:commit,baseSource:sourceRoot,rules,hashes},null,2)+'\n');
console.log(JSON.stringify({out,label:rules.label,baseCommit:commit}));
