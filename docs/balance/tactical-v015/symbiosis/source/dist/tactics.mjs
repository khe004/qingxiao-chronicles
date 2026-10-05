// Additional six-slot choices. Resources are paid once and shared with old skills.
const all=[0,1,2],close=[0,1];
const skill=(id,name,symbol,element,kind,ap,cost,details)=>({id,name,symbol,element,kind,ap,cost,range:all,...details});
export const TACTICAL_SKILLS={
 fire:[
  skill('sproutguard','灵芽护身','芽','wood','guard',1,{wood:1},{shield:14,intent:0,seedGain:1,once:true,tag:'护体种灵',desc:'获得14护盾，在对手身上积累1灵种；每回合一次。'}),
  skill('rootdrink','摄灵回春','摄','wood','heal',1,{wood:1,any:1},{heal:10,clearBurn:0,minSeed:1,consumeSeed:2,seedHeal:8,once:true,tag:'种灵恢复',desc:'消费至多2灵种，每层恢复8气血，基础恢复10；不清异常，每回合一次。'}),
  skill('seedburst','千种燎原','燎','fire','attack',2,{fire:3,any:1},{power:42,minSeed:2,consumeSeed:5,seedPower:16,tag:'全距收种',desc:'消费全部灵种，每层增加16基础伤害，基础42；至少2灵种，2行动，全距。'}),
  skill('sapflow','青木引火','引','wood','channel',1,{wood:1},{minSeed:1,consumeSeed:1,refund:{fire:2},once:true,tag:'种灵换气',desc:'消费1灵种，凝聚2火气；支付1木气与1行动，每回合一次，受容量限制。'}),
 ],
 sword:[
  skill('temper','静心养剑','养','metal','intent',1,{metal:1,water:1},{intent:2,once:true,tag:'无伤养意',desc:'积累2剑意，上限5；不攻击，不触发快剑额外养意，每回合一次。'}),
  skill('riposte','回锋剑屏','返','metal','guard',1,{metal:1,water:1},{shield:12,intent:0,reflect:12,reflectHits:1,once:true,tag:'一次反击',desc:'获得12护盾，下一次承受直接攻击反击至多12基础金伤；下次自身阶段到期，不递归反伤。'}),
  skill('pierce','穿甲剑','穿','metal','attack',1,{metal:2},{power:32,intentCost:1,sword:true,shieldPierce:.5,range:close,tag:'破盾轻剑',desc:'支付1剑意，造成32基础金伤；一半伤害越过护盾，仍按兵刃防御减免，命中后养意。'}),
  skill('cleave','碎垒重剑','垒','metal','attack',2,{metal:3,any:1},{power:42,finisher:true,intentLimit:3,shieldBonus:20,range:close,tag:'承盾重剑',desc:'消费至多3剑意，每层按重剑规则增伤；目标有护盾时额外20基础伤害，基础42，2行动。'}),
 ],
 flame:[
  skill('stoke','燃血聚火','血','fire','sacrifice',1,{}, {hpCost:18,refund:{fire:2,any:1},once:true,tag:'气血换气',desc:'损失18气血，凝聚2火气与1通灵；每回合一次，不可致死，受灵气容量限制。'}),
  skill('ashenward','烬火反障','烬','fire','guard',1,{fire:1},{shield:10,intent:0,reflect:10,reflectHits:2,once:true,tag:'两次反伤',desc:'获得10护盾，至下次自身阶段前可反击两次直接攻击，每次至多10基础火伤；不递归。'}),
  skill('quench','敛焰复元','敛','fire','heal',1,{fire:1,any:1},{heal:14,clearBurn:2,once:true,tag:'有限恢复',desc:'恢复14气血，清除自身至多2层灼烧；每回合一次，不清其他异常。'}),
  skill('firestorm','焰海横流','海','fire','attack',2,{fire:3,any:1},{power:52,minBurn:2,consumeBurn:2,burnPower:10,burn:2,tag:'全距焚灼',desc:'至少2层灼烧，消费至多2层各增10基础伤害，基础52；命中再附加2层，2行动，全距。'}),
 ],
 water:[
  skill('tidespear','贯潮长虹','虹','water','attack',2,{water:3,any:1},{power:44,minTide:1,consumeTide:3,tidePower:12,tag:'全距潮击',desc:'消费全部潮势，每层增加12基础伤害，基础44；至少1潮势，2行动，全距。'}),
  skill('mirrorwater','玄水镜屏','镜','water','guard',1,{water:1,any:1},{shield:10,intent:0,consumeTide:1,reflect:12,reflectPrepPower:8,reflectHits:1,once:true,tag:'潮势反击',desc:'获得10护盾；消费至多1潮势强化一次反击，12基础水伤加每潮势8，至下次自身阶段。'}),
  skill('mendingtide','润脉回潮','润','water','heal',1,{water:1},{heal:8,clearBurn:0,minTide:1,consumeTide:2,tideHeal:8,once:true,tag:'潮势恢复',desc:'消费至多2潮势，每层恢复8气血，基础恢复8；不清异常，每回合一次。'}),
  skill('icebreaker','碎冰矢','碎','water','attack',1,{water:2},{power:34,minChill:true,consumeChill:true,chillPower:18,tag:'凝滞兑现',desc:'需要并消费凝滞，34基础水伤加18强化；不迫退，与寒凝增伤和逐浪争用同一次凝滞。'}),
 ],
 wood:[
  skill('thornscreen','荆棘护幕','棘','wood','guard',1,{wood:1,any:1},{shield:12,intent:0,consumeGrowth:1,reflect:10,reflectPrepPower:6,reflectHits:2,once:true,tag:'生长反伤',desc:'获得12护盾；消费至多1生长强化两次反击，每次10基础木伤加每生长6，至下次自身阶段。'}),
  skill('leafmend','噬藤回生','生','wood','heal',1,{wood:2},{heal:16,clearBurn:0,minParasite:1,consumeParasite:1,parasiteHeal:8,once:true,tag:'寄生恢复',desc:'消费目标1寄生，恢复24气血；不清自身异常，放弃这层后续侵蚀，每回合一次。'}),
  skill('graft','接枝催荣','枝','wood','cultivate',1,{wood:2},{instantGrowth:2,once:true,tag:'即时积累',desc:'立即积累2生长，上限3；不额外产生待成熟，支付2木气与1行动，每回合一次。培植与接枝共用每回合一次培育，收获后也不重置。'}),
  skill('twinvine','双藤绞杀','绞','wood','attack',2,{wood:3,any:1},{power:32,minGrowth:1,minParasite:1,consumeGrowth:1,consumeParasite:2,growthPower:12,parasitePower:12,tag:'双储备配合',desc:'需要自身生长和目标寄生；消费1生长、至多2寄生，每层各增12，基础32，2行动，全距。'}),
 ],
 earth:[
  skill('stoneback','磐甲反震','震','earth','guard',1,{earth:1,any:1},{shield:12,intent:0,consumeTerrain:1,reflect:12,reflectPrepPower:6,reflectHits:2,once:true,tag:'地势反震',desc:'获得12护盾；消费至多1地势强化两次反击，每次12基础土伤加每地势6，至下次自身阶段。'}),
  skill('earthmend','地脉养元','脉','earth','heal',1,{earth:2},{heal:6,clearBurn:0,minTerrain:1,consumeTerrain:2,terrainHeal:8,once:true,tag:'地势恢复',desc:'消费至多2地势，每层恢复8气血，基础恢复6；不清异常，每回合一次。'}),
  skill('faultline','裂岩破阵','裂','earth','attack',2,{earth:3,any:1},{power:46,minTerrain:1,consumeTerrain:1,terrainPower:16,breakPrep:true,shieldPierce:.25,tag:'全距破阵',desc:'消费1地势，46基础土伤加16；四分之一伤害越过护盾，再破除1地势或2生长，2行动，全距。'}),
  skill('gravel','叠岩诀','叠','earth','attack',1,{earth:1},{power:16,gainTerrain:1,once:true,tag:'直攻积势',desc:'造成16基础土伤，积累1地势，上限3；每回合一次，不免移动损阵。'}),
 ],
};
export const CULTIVATION_IDS=['cultivate','graft'];
export function tacticalLegal(b,a,s){const e=b.other(a);
 if(CULTIVATION_IDS.includes(s.id)&&a.usedSkills.some(id=>CULTIVATION_IDS.includes(id)))return '培植与接枝共用每回合一次培育，收获后也不重置';
 if(s.minSeed&&e.seed<s.minSeed)return `目标需要至少${s.minSeed}灵种`;
 if(s.minChill&&!e.chilled)return '目标需要凝滞';
 if(s.kind==='intent'&&a.intent>=5)return '剑意已经充盈';
 if(s.hpCost&&a.hp<=s.hpCost)return '燃血不可使自己气血耗尽';
 if(['channel','sacrifice'].includes(s.kind)&&Object.values(a.qi).reduce((n,x)=>n+x,0)>=10)return '灵气已经充盈';
 return null;
}
export function extraBonus(b,a,s){const e=b.other(a);return Math.min(e.seed,s.consumeSeed??0)*(s.seedPower??0)+(s.consumeChill&&e.chilled?(s.chillPower??0):0)+(s.shieldBonus&&e.shield>0?s.shieldBonus:0);}
export function spendExtra(b,a,s){const e=b.other(a),seed=Math.min(e.seed,s.consumeSeed??0);if(seed){e.seed-=seed;b.log(`${a.name}消费${seed}灵种，剩余${e.seed}；进攻、恢复与换气不能重复兑现。`,'resource');}if(s.consumeChill)b.clearChill(e,'碎冰消费');return {seed};}
export function tacticalAction(b,a,s){
 if(s.kind==='intent'){a.intent=Math.min(5,a.intent+s.intent);b.log(`${a.name}静心养意，现有${a.intent} / 5剑意。`,'resource');}
 else if(['channel','sacrifice'].includes(s.kind)){spendExtra(b,a,s);if(s.hpCost)b.hurt(a,s.hpCost,'燃血聚火的主动代价',false);const n=b.gain(a,s.refund);b.log(`${a.name}以「${s.name}」凝聚${n}灵气；溢出不返还代价。`,'resource');}
 else return false;
 return true;
}
export function startTacticalPhase(b,a){if(a.counter){a.counter=null;b.log(`${a.name}上一阶段的反击准备到期。`,'resource');}}

export const TACTICAL_LOADOUTS={
 "fire": {
  "ignite": [
   "seed",
   "spark",
   "blaze",
   "heal",
   "sproutguard",
   "seedburst"
  ],
  "sustain": [
   "seed",
   "spark",
   "blaze",
   "heal",
   "nourish",
   "sproutguard"
  ]
 },
 "sword": {
  "quick": [
   "swift",
   "pierce",
   "strike",
   "temper",
   "cut",
   "unity"
  ],
  "heavy": [
   "swift",
   "expose",
   "strike",
   "riposte",
   "cleave",
   "unity"
  ]
 },
 "flame": {
  "fierce": [
   "flare",
   "kindle",
   "eruption",
   "stoke",
   "ashenward",
   "quench"
  ],
  "smolder": [
   "flare",
   "kindle",
   "cinder",
   "firestorm",
   "ashenward",
   "solar"
  ]
 },
 "water": {
  "cold": [
   "waterbolt",
   "frost",
   "icebreaker",
   "mirrorwater",
   "rinse",
   "repulse"
  ],
  "tidal": [
   "waterbolt",
   "gather",
   "surge",
   "tidespear",
   "mendingtide",
   "waterwall"
  ]
 },
 "wood": {
  "symbiosis": [
   "wooddart",
   "cultivate",
   "graft",
   "bloomstrike",
   "bloomheal",
   "thornscreen"
  ],
  "parasitic": [
   "wooddart",
   "parasite",
   "reap",
   "bloomheal",
   "cultivate",
   "twinvine"
  ]
 },
 "earth": {
  "bastion": [
   "stonebolt",
   "foundation",
   "landbreak",
   "stoneback",
   "earthmend",
   "gravel"
  ],
  "mountain": [
   "stonebolt",
   "foundation",
   "mountain",
   "landbreak",
   "earthmend",
   "gravel"
  ]
 }
};
