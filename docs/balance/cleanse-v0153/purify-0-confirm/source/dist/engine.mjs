import {RULES} from './rules.mjs';
export {RULES};
import {PREPARED_CLASSES,PREPARED_MAJORS,PREPARED_COMMON,preparedFields,preparedLegal,startPreparedPhase,finishPreparedPhase,paidPreparedCast,preparedBonus,spendPrepared,breakPreparation,preparedAction,preparedMove} from './prepared.mjs';
import {TACTICAL_SKILLS,tacticalLegal,extraBonus,spendExtra,tacticalAction} from './tactics.mjs';
import {activeFallback,AI_POLICY} from './active-policy.mjs';
export const ELEMENTS = ['metal','wood','water','fire','earth','any'];
export const ELEMENT_NAMES = {metal:'金',wood:'木',water:'水',fire:'火',earth:'土',any:'通灵'};
export const SUSTAIN_RECOVERY = 2;
export const HEAL_RECOVERY = 18;
export const HEAL_CLEAR_BURN = 5;
export const CLASSES = {
  ...PREPARED_CLASSES,
  water: {name:'玄水法修',nameShort:'水法',art:'water',person:'江寒汀',sect:'玄水阁',title:'寒凝留隙 · 潮起有时',hp:210,physical:22,magical:30,gen:{water:4,any:1},passive:'玄水心诀',passiveText:'凝滞不叠层，不限制行动或普通移动；目标下次行动结束时消散。潮势上限 3，跨回合保留，攻击、防护与回潮共用并消耗储备。',reaction:'水幕诀',reactionElement:'water',skills:[
    {id:'waterbolt',name:'玄水矢',symbol:'水',element:'water',ap:1,cost:{water:1},kind:'attack',power:26,desc:'低耗全距术法。寒凝主修可消耗凝滞强化本回合首次玄水矢，或保留凝滞用于逐浪。',tag:'直攻',range:[0,1,2]},
    {id:'frost',name:'凝霜诀',symbol:'寒',element:'water',ap:1,cost:{water:1},kind:'attack',power:16,chill:true,desc:'造成术法伤害，施加一次凝滞，不叠层；可被净息或目标自己移动消解，至目标下次行动结束消散。',tag:'铺垫',range:[0,1,2]},
    {id:'repulse',name:'逐浪术',symbol:'逐',element:'water',ap:1,cost:{water:1,any:1},kind:'force',delta:1,once:true,desc:'需要目标凝滞且不在远距。消耗凝滞，迫使目标退开一档；每回合限一次，不直接打断蓄势，也不扣对手行动。',tag:'控距',range:[0,1]},
    {id:'gather',name:'纳潮诀',symbol:'潮',element:'water',ap:1,cost:{water:1},kind:'tide',once:true,desc:'凝聚 2 潮势，上限 3，每回合限一次。潮汐主修改为 3 潮势；不回复气血或灵气。',tag:'储备',range:[0,1,2]},
    {id:'surge',name:'沧澜击',symbol:'澜',element:'water',ap:1,cost:{water:2},kind:'attack',power:28,minTide:1,consumeTide:2,tidePower:14,desc:'需要至少 1 潮势。消耗至多 2 潮势，每层增加 14 基础伤害；同一储备不能再用于防护或回潮。',tag:'兑现',range:[0,1]},
    {id:'waterwall',name:'回流障',symbol:'幕',element:'water',ap:1,cost:{water:1},kind:'guard',shield:18,intent:0,consumeTide:1,tideShield:12,desc:'获得 18 护盾；有潮势时额外消耗 1 层，增加 12 护盾。总护盾上限 60，水气也用于进攻与应对。',tag:'护体',range:[0,1,2]},
    {id:'rinse',name:'涤尘诀',symbol:'净',element:'water',ap:1,cost:{water:1},kind:'heal',heal:12,clearBurn:5,once:true,desc:'恢复 12 气血并清除自身灼烧，每回合限一次；不清除凝滞。凝滞可用通用「净息·凝滞」单独处理。',tag:'净化',range:[0,1,2]},
    {id:'ebb',name:'回潮调息',symbol:'息',element:'water',ap:1,cost:{},kind:'ebb',minTide:1,consumeTide:2,once:true,desc:'消耗至多 2 潮势，每层凝聚 1 水灵气；每回合限一次，受 10 点容量限制。回潮占行动，不触发纳潮或免费续转。',tag:'周转',range:[0,1,2]},
  ]},
  fire: {name:'火木法修',nameShort:'火木',person:'沈知微',sect:'丹霞谷',title:'木引星火 · 生息不绝',hp:210,physical:22,magical:30,gen:{fire:2,wood:2,any:1},passive:'生息诀',passiveText:'每回合第一次施展木系神通，额外凝聚 1 火灵气。',reaction:'御木诀',reactionElement:'wood',skills:[
    {id:'seed',name:'催生术',symbol:'生',element:'wood',ap:1,cost:{wood:1},kind:'seed',desc:'种下 2 层灵种。焚炎术每引燃一层，伤害提高 20%。',tag:'铺垫',range:[0,1,2]},
    {id:'spark',name:'流火诀',symbol:'焰',element:'fire',ap:1,cost:{fire:1},kind:'attack',power:24,burn:1,desc:'造成术法伤害，附加 1 层灼烧。',tag:'术法',range:[0,1,2]},
    {id:'blaze',name:'焚炎术',symbol:'燃',element:'fire',ap:1,cost:{fire:2,any:1},kind:'attack',power:46,burn:2,ignite:true,desc:'引燃全部灵种，附加 2 层灼烧。',tag:'引爆',range:[0,1]},
    {id:'heal',name:'青木回春',symbol:'愈',element:'wood',ap:1,cost:{wood:2},kind:'heal',heal:HEAL_RECOVERY,clearBurn:HEAL_CLEAR_BURN,desc:`恢复 ${HEAL_RECOVERY} 气血，${HEAL_CLEAR_BURN>=5?'清除自身灼烧':`清除至多 ${HEAL_CLEAR_BURN} 层自身灼烧`}。`,tag:'恢复',range:[0,1,2]},
    {id:'vine',name:'缠灵藤',symbol:'缚',element:'wood',ap:1,cost:{wood:1},kind:'attack',power:12,interrupt:true,desc:'造成术法伤害，打断敌人蓄势。',tag:'打断',range:[0,1]},
    {id:'ember',name:'星火引',symbol:'引',element:'fire',ap:1,cost:{fire:1},kind:'attack',power:18,partialIgnite:2,desc:'消耗至多 2 层灵种，每层增加 10 基础伤害；保留剩余灵种。',tag:'分燃',range:[0,1,2]},
    {id:'nourish',name:'枯荣转生',symbol:'荣',element:'wood',ap:1,cost:{wood:1,any:1},kind:'heal',heal:14,clearBurn:1,refund:{any:1},once:true,desc:'恢复 14 气血，清除 1 层灼烧，凝聚 1 通灵。每回合限一次。',tag:'生息',range:[0,1,2]},
    {id:'inferno',name:'离火焚天',symbol:'燎',element:'fire',ap:2,cost:{fire:3,any:1},kind:'charge',power:86,burn:2,desc:'蓄势至下次行动阶段。引爆灼烧，每层额外造成 8 基础伤害。',tag:'蓄势',range:[1,2]},
  ]},
  sword: {name:'太玄剑修',nameShort:'剑修',person:'陆青玄',sect:'太玄剑宗',title:'一剑照雪 · 破势而行',hp:230,physical:28,magical:40,gen:{metal:3,water:1,any:1},passive:'养剑诀',passiveText:'非重剑剑招命中后积累 1 层剑意，上限 5 层。重剑按各自规则消耗剑意强化伤害。',reaction:'横剑式',reactionElement:'metal',skills:[
    {id:'swift',name:'掠影剑',symbol:'斩',element:'metal',ap:1,cost:{metal:1},kind:'attack',power:30,sword:true,desc:'造成兵刃伤害，积累 1 层剑意。',tag:'快剑',range:[0,1]},
    {id:'expose',name:'照隙诀',symbol:'隙',element:'water',ap:1,cost:{water:1},kind:'attack',power:12,expose:true,desc:'制造破绽，使下一次重剑伤害提高 25%。',tag:'识破',range:[0,1,2]},
    {id:'strike',name:'断岳剑',symbol:'破',element:'metal',ap:1,cost:{metal:2,any:1},kind:'attack',power:52,finisher:true,sword:true,desc:'消耗全部剑意，每层增加 8 基础伤害。利用破绽增伤 25%。',tag:'重剑',range:[0,1]},
    {id:'guard',name:'藏锋式',symbol:'守',element:'metal',ap:1,cost:{metal:1},kind:'guard',desc:'获得 22 护盾与 1 层剑意。护盾保留，最多 60。',tag:'防守',range:[0,1,2]},
    {id:'cut',name:'截脉剑',symbol:'截',element:'metal',ap:1,cost:{metal:1,water:1},kind:'attack',power:20,interrupt:true,sword:true,desc:'造成兵刃伤害，打断敌人蓄势。',tag:'打断',range:[0,1]},
    {id:'lunge',name:'追风剑',symbol:'追',element:'metal',ap:1,cost:{metal:1},kind:'attack',power:48,intentCost:2,sword:true,interrupt:true,desc:'消耗 2 剑意，近身出剑并打断蓄势；命中后积累 1 剑意。',tag:'追击',range:[0]},
    {id:'return',name:'回澜剑',symbol:'澜',element:'metal',ap:1,cost:{metal:1,water:1},kind:'attack',power:24,finisher:true,intentLimit:2,desc:'消耗至多 2 剑意，每层增加 8 基础伤害；保留剩余剑意，利用破绽增伤 25%。',tag:'小重剑',range:[0,1]},
    {id:'unity',name:'万剑归一',symbol:'极',element:'metal',ap:2,cost:{metal:3,any:1},kind:'charge',power:86,finisher:true,desc:'消耗剑意蓄势，每层增加 8 基础伤害。下次行动阶段释放。',tag:'蓄势',range:[1,2]},
  ]},
  flame: {name:'离火法修',nameShort:'纯火',art:'flame',person:'祝燃灯',sect:'离火宫',title:'烈焰逐隙 · 焚灼有度',hp:210,physical:22,magical:30,gen:{fire:4,any:1},passive:'离火心诀',passiveText:'以火灵气施法与护体；灼烧最多 5 层，每层每次结算造成 4 伤害，绕过护盾，刷新后持续 3 次结算。',reaction:'御火诀',reactionElement:'fire',skills:[
    {id:'flare',name:'炎矢诀',symbol:'矢',element:'fire',ap:1,cost:{fire:1},kind:'attack',power:26,desc:'造成术法伤害。低耗全距施压，可参与烈焰连续施法。',tag:'直攻',range:[0,1,2]},
    {id:'kindle',name:'附焰术',symbol:'灼',element:'fire',ap:1,cost:{fire:1},kind:'attack',power:18,burn:2,desc:'造成术法伤害，附加 2 层灼烧，刷新为 3 次结算。',tag:'叠烧',range:[0,1,2]},
    {id:'eruption',name:'烈火冲',symbol:'烈',element:'fire',ap:1,cost:{fire:2,any:1},kind:'attack',power:48,desc:'造成术法伤害。强火力限近中距，消耗较多火气。',tag:'强攻',range:[0,1]},
    {id:'cinder',name:'摘烬诀',symbol:'烬',element:'fire',ap:1,cost:{fire:1},kind:'attack',power:18,consumeBurn:2,burnPower:10,minBurn:1,desc:'需要目标有灼烧。消耗至多 2 层，每层增加 10 基础伤害；保留剩余层数与期限。',tag:'分燃',range:[0,1,2]},
    {id:'combust',name:'焚身引',symbol:'焚',element:'fire',ap:1,cost:{fire:2,any:1},kind:'attack',power:30,consumeBurn:5,burnPower:12,minBurn:1,desc:'需要目标有灼烧。消耗全部灼烧，每层增加 12 基础伤害；放弃这些层数后续的持续伤害。',tag:'兑现',range:[0,1]},
    {id:'firewall',name:'离火障',symbol:'障',element:'fire',ap:1,cost:{fire:1},kind:'guard',shield:22,intent:0,desc:'获得 22 护盾，最多 60。消耗的火气也可用于攻击或御火应对。',tag:'护体',range:[0,1,2]},
    {id:'scorchcut',name:'断焰指',symbol:'断',element:'fire',ap:1,cost:{fire:1,any:1},kind:'attack',power:18,interrupt:true,desc:'造成术法伤害，打断敌方蓄势。限近中距，费用不返还。',tag:'打断',range:[0,1]},
    {id:'solar',name:'赤日临空',symbol:'日',element:'fire',ap:2,cost:{fire:3,any:1},kind:'charge',power:84,consumeBurn:5,burnPower:8,desc:'先支付 2 行动蓄势，下次己方行动开始释放；届时消耗全部灼烧，每层增加 8 基础伤害。可被打断、净化铺垫或近身化解。',tag:'蓄势',range:[1,2]},
  ]},
};
export const MAJORS = {
  ...PREPARED_MAJORS,
  water: {
    cold:{name:'寒凝控距',symbol:'寒',focus:'凝滞 · 控距 · 择机反击',effect:'每回合首次玄水矢命中凝滞目标，消耗凝滞并增加 ${RULES.edgePower} 基础伤害。也可将凝滞用于逐浪，二者不能共用一次准备；免费结算与应对不触发。',tip:'凝霜后选择逐浪控距或玄水矢增伤；对手自己移动、净息都能消解凝滞。',recommended:['waterbolt','frost','repulse','gather','surge','waterwall']},
    tidal:{name:'潮汐调息',symbol:'汐',focus:'纳潮 · 攻守 · 有限回潮',effect:'纳潮诀每回合限一次，凝聚 3 潮势而非 2，上限仍为 3。沧澜、回流与回潮共用并消费这份储备；不通过应对、返气或免费释放再次纳潮。',tip:'先投入行动纳潮，再选择进攻、防护或补水；储备耗尽后仍可用玄水矢直接出手。',recommended:['waterbolt','frost','gather','surge','waterwall','ebb']},
  },
  flame: {
    fierce:{name:'烈焰强攻',symbol:'烈',focus:'连续施法 · 即时压制',effect:'每回合第 2 次主动支付灵气的即时火法攻击，增加 10 基础伤害；仅一次。调息、护体、应对、灼烧结算、蓄势及免费释放均不计数。',tip:'连续进攻仍需逐招付费；多打一招，也就少一份护体火气。',recommended:['flare','kindle','eruption','cinder','firewall','scorchcut']},
    smolder:{name:'焚灼消耗',symbol:'灼',focus:'维护灼烧 · 取舍兑现',effect:'每回合第一次主动施展附焰术，额外附加 1 层灼烧；上限仍为 5。消费灼烧会失去相应持续伤害，不返还灵气。',tip:'摘烬分批兑现，焚身集中引爆；对手净息也能消解铺垫。',recommended:['flare','kindle','cinder','combust','firewall','solar']},
  },
  fire: {
    ignite:{name:'引燃爆发',symbol:'燃',focus:'种灵 · 分燃 · 引爆',effect:'每回合首次引燃至少 1 层灵种，额外凝聚 1 火灵气。',tip:'灵种可分批引燃，也可留给焚炎一次引爆。',recommended:['seed','spark','blaze','heal','vine','inferno']},
    sustain:{name:'生息消耗',symbol:'生',focus:'灼烧 · 回春 · 周转',effect:`每回合首次施展木系神通，额外恢复 ${SUSTAIN_RECOVERY} 气血；可与生息诀同时触发。`,tip:'以灼烧持续施压，木法兼顾恢复与灵气周转。',recommended:['seed','spark','blaze','heal','nourish','vine']},
  },
  sword: {
    quick:{name:'快剑压制',symbol:'疾',focus:'养意 · 追击 · 打断',effect:'每回合首次命中非重剑剑招，额外积累 1 剑意，上限仍为 5。',tip:'剑意可用于近身追风打断，也可留给重剑。',recommended:['swift','expose','strike','guard','cut','unity']},
    heavy:{name:'藏锋重剑',symbol:'藏',focus:'护体 · 藏锋 · 破势',effect:'护盾吸收攻击后获得藏锋：下一次重剑增加 12 基础伤害，不叠加，至下回合己方行动结束失效。',tip:'承接攻击后及时出剑；藏锋也可用于蓄势大招。',recommended:['swift','expose','strike','guard','return','unity']},
  },
};
const affinity={sword:{metal:1},wood:{wood:1},water:{water:1},flame:{fire:1},earth:{earth:1},fire:{fire:.7,wood:.3}};
const overcomes={metal:'wood',wood:'earth',earth:'water',water:'fire',fire:'metal'};
export function elementMultiplier(element,key){
  if(!RULES.elements||!overcomes[element])return 1;
  return Object.entries(affinity[key]).reduce((n,[e,w])=>n+w*(overcomes[element]===e?RULES.advantage:overcomes[e]===element?RULES.disadvantage:1),0);
}
export function damageType(actor,s){return s.damageType??(((actor.key==='sword'&&s.id!=='expose')||s.id==='basic')?'physical':'magical');}
export function damageAmount(actor,target,s,raw,reduction=1,includeBurn=true){
  const power=raw+(includeBurn?burnBonus(s,target):0);
  return Math.max(0,Math.round(power*elementMultiplier(s.element,target.key)*100/(100+CLASSES[target.key][damageType(actor,s)])*reduction));
}
for(const [key,skills] of Object.entries(TACTICAL_SKILLS))CLASSES[key].skills.push(...skills);
for(const [key,patch] of Object.entries(RULES.stats))Object.assign(CLASSES[key],patch);
for(const [key,skills] of Object.entries(RULES.skills))for(const [id,patch] of Object.entries(skills))Object.assign(CLASSES[key].skills.find(s=>s.id===id),patch);
for(const [key,majors] of Object.entries(RULES.loadouts))for(const [major,ids] of Object.entries(majors))MAJORS[key][major].recommended=[...ids];
// Derive explanations from the same parameters used in combat.
const skillOf=(key,id)=>CLASSES[key].skills.find(s=>s.id===id);
const setupText=s=>s.setupShield?`同时获得${s.setupShield}护盾；` : '';
const percent=Math.round((RULES.brokenMultiplier-1)*100);
Object.assign(skillOf('sword','expose'),{desc:`制造破绽，使下一次重剑伤害提高${percent}%。`});
for(const id of ['strike','return','unity']){const s=skillOf('sword',id);s.desc=id==='unity'?`消耗剑意蓄势，每层增加${RULES.intentPower}基础伤害，下次自身阶段释放。`:`消耗${s.intentLimit?'至多'+s.intentLimit+'层':'全部'}剑意，每层增加${RULES.intentPower}基础伤害；利用破绽增伤${percent}%。`;}
const g=skillOf('sword','guard');g.desc=`获得${g.shield??22}护盾${g.intent?'与'+g.intent+'层剑意':''}，总盾上限60。`;
MAJORS.sword.heavy.effect=`护盾实际吸收攻击后获得藏锋：下一次重剑增加${RULES.edgePower}基础伤害，不叠加，至下回合己方行动结束失效。`;
MAJORS.water.cold.effect=`每回合首次玄水矢命中凝滞目标，消耗凝滞并增加${RULES.coldPower}基础伤害。凝滞也可用于逐浪，二者不能共用一次准备。`;
MAJORS.flame.fierce.effect=`每回合第2次主动支付灵气的即时火法攻击，增加${RULES.chainPower}基础伤害；应对、灼烧与免费释放不计数。`;
CLASSES.flame.passiveText=`灼烧最多5层，每层每次结算${RULES.burnLayer}基础火伤，绕过普通护盾${RULES.burnDefense?'，经术法防御与五行减免':''}；刷新后持续${RULES.burnTurns}次结算。`;
skillOf('flame','kindle').desc=`造成术法伤害，附加2层灼烧，刷新为${RULES.burnTurns}次结算。`;
CLASSES.water.passiveText=`${RULES.waterCleanse?'每回合首次主动付费水法清自身'+RULES.waterCleanse+'层灼烧。':''}凝滞不叠层，不限制行动或普通移动；目标下次行动结束消散。潮势上限3，攻击、防护与回潮共用。`;
const rep=skillOf('water','repulse');rep.desc=`需要目标凝滞且不在远距。消耗凝滞${rep.power?'，造成'+rep.power+'基础水伤后':''}将存活目标推远一档；每回合一次，不打断蓄势或扣行动。`;
const gather=skillOf('water','gather');gather.desc=`${setupText(gather)}凝聚2潮势，潮汐主修为3，上限3，每回合一次；不回复气血或灵气。`;
const surge=skillOf('water','surge');surge.desc=`至少1潮势；消耗至多2层，每层增加${surge.tidePower}基础伤害，与防护／回潮共用储备。`;
const ww=skillOf('water','waterwall');ww.desc=`获得${ww.shield}护盾，有潮势时消费1层再增加${ww.tideShield}；总盾上限60。`;
const rinse=skillOf('water','rinse');rinse.desc=`恢复${rinse.heal}气血，清除自身灼烧，每回合一次；不清凝滞或寄生。`;
const cultivate=skillOf('wood','cultivate');cultivate.desc=`${setupText(cultivate)}生长+1，上限3，每回合一次；下次自身阶段再+1，共生再+2。收尽或全破除会取消成熟。培植与接枝共用每回合一次培育，收获后也不重置。`;
const bs=skillOf('wood','bloomstrike');bs.desc=`消费全部生长，每层增加${bs.growthPower}基础伤害，基础${bs.power}；不同时回血或补盾；满3生长可远距，未满限近中距。`;
const bg=skillOf('wood','bloomguard');bg.desc=`消费全部生长，每层增加${bg.growthShield}护盾，基础${bg.shield}；总盾上限60，不返培育费用。`;
const bh=skillOf('wood','bloomheal');bh.desc=`消费全部生长，每层增加${bh.growthHeal}恢复，基础${bh.heal}，清至多${bh.clearBurn}层灼烧；每回合一次，不清凝滞或寄生。`;
const reap=skillOf('wood','reap');reap.desc=`消费全部寄生，每层增加${reap.parasitePower}基础傷害，基础${reap.power}；已收获层数不再侵蚀；满3寄生可远距，未满限近中距。`;
const parasite=skillOf('wood','parasite');parasite.desc=`付费附着造成${parasite.initialPower??0}基础木伤；目标寄生+1，上限3，维持两次目标阶段。目标每阶段首次付费施法使寄生+1（寄生主修+2），${RULES.parasitePower?'每层造成'+RULES.parasitePower+'基础木伤':'侵蚀每层4护盾'}并破除至多1地势；可单独净化，不扣灵气或行动。`;
const foundation=skillOf('earth','foundation');foundation.desc=`${setupText(foundation)}建立2地势，壁垒主修为3，上限3，每回合一次，不因承伤免费增长。`;
const rampart=skillOf('earth','rampart');rampart.desc=`消费至多2地势，每层增加${rampart.terrainShield}护盾，基础${rampart.shield}；总盾上限60；壁垒主修每回合首次以地势防守额外${RULES.bastionShield??0}盾。`;
const lb=skillOf('earth','landbreak');lb.desc=`消费至多2地势，每层增加${lb.terrainPower}基础伤害，基础${lb.power}；消耗后防守／稳固可用地势减少。`;
const m=skillOf('earth','mountain');m.desc=`支付2行动、3土气与1任意气、2地势蓄势，基础${m.power}，每地势增加${m.terrainPower}；启动锁定，下次自身阶段近中距释放，可退距或打断，费用不返。`;
if(RULES.anchorReaction){skillOf('earth','anchor').desc='装备后，在强制位移的应对窗口花1土气、1地势和本回合应对机会挡一次位移；不耗行动，不减伤或免打断。';CLASSES.earth.passiveText='地势上限3，主动布置后供攻防与稳固共同消费。自己实际移动损失1地势，对手移动不损失；稳固仅在应对窗口取消一次强制位移。';}
MAJORS.earth.mountain.effect=`每回合首次主动付费且消费地势的攻击或蓄势增加${RULES.mountainBonus}基础伤害；启动锁定，免费释放不再触发。`;MAJORS.earth.bastion.effect=`筑垒建立3地势，上限3；每回合首次以地势防守额外${RULES.bastionShield}护盾，地势供攻防与稳固共用。`;MAJORS.wood.parasitic.tip='首次付费施法触发有限木伤并破除地势；提前收获放弃后续侵蚀，目标可单独净化。';
const ew=skillOf('earth','earthenwall');ew.desc=`获得${ew.shield}护盾，上限60；不需要或增加地势。`;
export function normalizeLoadout(key,config={}){
  if(!Object.hasOwn(CLASSES,key))throw Error('未知流派');
  if(!config||typeof config!=='object')throw Error('配装格式无效');
  const major=config.major??Object.keys(MAJORS[key])[0];
  if(!Object.hasOwn(MAJORS[key],major))throw Error('主修不属于当前流派');
  const skillIds=config.skillIds??MAJORS[key][major].recommended;
  if(!Array.isArray(skillIds)||skillIds.length!==6||new Set(skillIds).size!==6)throw Error('请装备 6 个不同的神通');
  if(skillIds.some(id=>!CLASSES[key].skills.some(s=>s.id===id)))throw Error('神通不属于当前流派');
  return {major,skillIds:[...skillIds]};
}
export const COMMON = [
  ...PREPARED_COMMON,
  {id:'basic',name:'基础攻击',ap:1,cost:{},kind:'attack',power:12,range:[0,1,2]},
  {id:'near',name:'接近',ap:1,cost:{},kind:'move',delta:-1},
  {id:'far',name:'拉开',ap:1,cost:{},kind:'move',delta:1},
  {id:'meditate',name:'调息',ap:1,cost:{},kind:'meditate'},
  {id:'purify',name:'净息',ap:1,cost:{any:1},kind:'purify'},
  {id:'dispel',name:'净息·凝滞',ap:1,cost:{any:1},kind:'dispel',desc:'恢复 8 气血，只清除自身凝滞；不清除灼烧。'},
];
export function tideBonus(s,actor){return Math.min(actor.tide??0,s.consumeTide??0)*(s.tidePower??0);}
export function burnBonus(s,target){return s.id==='inferno'?target.burn*8:Math.min(target.burn,s.consumeBurn??0)*(s.burnPower??0);}
export function total(qi){return ELEMENTS.reduce((n,k)=>n+(qi[k]||0),0)}
export function payment(qi,cost){
  const next={...qi};
  for(const k of ELEMENTS.filter(k=>k!=='any')) { const n=cost[k]||0;if((next[k]||0)<n)return null;next[k]=(next[k]||0)-n; }
  let rest=cost.any||0;
  // 通灵优先；其次消耗数量最多的灵气，尽量保留稀缺属性。
  const order=['any',...ELEMENTS.filter(k=>k!=='any').sort((a,b)=>(next[b]||0)-(next[a]||0))];
  for(const k of order){const n=Math.min(rest,next[k]||0);next[k]=(next[k]||0)-n;rest-=n;}
  return rest===0?next:null;
}
function fighter(key,player,config){const c=CLASSES[key],loadout=normalizeLoadout(key,config);return {key,major:loadout.major,skillIds:loadout.skillIds,igniteTriggered:false,quickTriggered:false,edge:false,edgeExpires:0,usedSkills:[],name:player?'你':c.person,hp:c.hp,maxHp:c.hp,qi:Object.fromEntries(ELEMENTS.map(k=>[k,0])),shield:0,counter:null,intent:0,seed:0,burn:0,burnTurns:0,chilled:false,broken:false,charge:null,ap:3,reaction:true,meditated:false,woodTriggered:false,waterCleanseTriggered:false,bastionTriggered:false,...(key==='flame'?{fireCasts:0,smolderTriggered:false}:{}),...(key==='water'?{tide:0,coldTriggered:false}:{}),...preparedFields(key)};}
export class Battle {
  constructor(key='fire',config={},enemyConfig={}) {if(!Object.hasOwn(CLASSES,key))throw new Error('未知流派');this.round=0;this.phase='player';this.distance=1;this.player=fighter(key,true,config);this.enemy=fighter(enemyConfig.key??(key==='fire'?'sword':'fire'),false,enemyConfig);this.logs=[];this.pending=null;this.enemyQueue=[];this.result=null;this.serial=0;this.enemyPolicy=AI_POLICY;this.enemy.shield=RULES.secondShield;for(const a of [this.player,this.enemy])this.log(`${a.name}主修「${MAJORS[a.key][a.major].name}」，装备：${this.skills(a).map(s=>s.name).join('、')}。`,'setup');this.beginRound();}
  log(text,type='normal'){this.logs.push({id:++this.serial,round:this.round,text,type});}
  skills(actor){return actor.skillIds.map(id=>CLASSES[actor.key].skills.find(s=>s.id===id));}
  skill(actor,id){return [...this.skills(actor),...COMMON].find(s=>s.id===id);}
  other(actor){return actor===this.player?this.enemy:this.player;}
  gain(actor,amount){let room=10-total(actor.qi);let count=0;for(const [k,n] of Object.entries(amount)){let m=Math.min(room,n);actor.qi[k]+=m;room-=m;count+=m;}return count;}
  resetActor(a){a.ap=3;a.reaction=true;a.meditated=false;a.woodTriggered=false;a.waterCleanseTriggered=false;a.bastionTriggered=false;a.igniteTriggered=false;a.quickTriggered=false;a.usedSkills=[];if(a.key==='flame'){a.fireCasts=0;a.smolderTriggered=false;}if(a.key==='water')a.coldTriggered=false;a.parasiteFed=false;if(a.key==='earth')a.mountainTriggered=false;this.gain(a,CLASSES[a.key].gen);}
  clearChill(a,reason){if(a.chilled){a.chilled=false;this.log(`${a.name}的凝滞因${reason}消解。`,'resource');}}
  moveActor(a,delta,{forced=false}={}){const from=this.distance,to=Math.max(0,Math.min(2,from+delta));if(!preparedMove(this,a,from,to,forced)){this.lastMove={actor:a===this.player?'player':'enemy',forced,from,to:from,blocked:true};return;}this.distance=to;if(!forced)this.clearChill(a,'主动移动');this.lastMove={actor:a===this.player?'player':'enemy',forced,from,to:this.distance};this.log(`${a.name}${forced?'被迫':'主动'}${delta>0?'退开':'接近'}，双方距离变为${['近身','中距','远距'][this.distance]}。`);}
  spendTide(a,s){const n=Math.min(a.tide??0,s.consumeTide??0);if(n){a.tide-=n;this.log(`${a.name}以「${s.name}」消耗 ${n} 潮势，剩余 ${a.tide}；同一储备不能再次兑现。`,'resource');}return n;}
  legal(actor,id){
    const s=this.skill(actor,id);if(!s)return '神通未装备或不存在';if(s.kind==='reaction')return '稳固需在被迫位移的应对窗口使用';const preparedError=preparedLegal(this,actor,s)||tacticalLegal(this,actor,s);if(preparedError)return preparedError;if(this.result)return '本场斗法已结束';if(actor.ap<s.ap)return '行动点不足';if(actor.charge&&!['move','meditate','guard'].includes(s.kind))return '蓄势中仅可移动、调息或防守，也可结束回合或取消蓄势';if(s.range&&!s.range.includes(this.distance))return '距离不适合';if(s.delta&&!(this.distance+s.delta>=0&&this.distance+s.delta<=2))return '已到距离边界';if(s.kind==='meditate'&&actor.meditated)return '本回合已经调息';if(s.kind==='meditate'&&total(actor.qi)>=10)return '灵气已经充盈';if(s.kind==='force'&&!this.other(actor).chilled)return '目标需要凝滞';if(s.minTide&&(actor.tide??0)<s.minTide)return `需要至少 ${s.minTide} 潮势`;if(s.kind==='tide'&&actor.tide>=3)return '潮势已经充盈';if(s.kind==='ebb'&&total(actor.qi)>=10)return '灵气已经充盈';if(s.kind==='dispel'&&!actor.chilled)return '自身没有凝滞';if(s.minBurn&&this.other(actor).burn<s.minBurn)return `目标需要至少 ${s.minBurn} 层灼烧`;if(s.intentCost&&actor.intent<s.intentCost)return `需要 ${s.intentCost} 层剑意`;if(s.once&&actor.usedSkills.includes(id))return '本回合已经施展';if(!payment(actor.qi,s.cost))return '所需灵气不足';return null;
  }
  beginRound(){
    if(this.result)return;this.round++;this.phase='player';this.pending=null;this.enemyWaitReason=null;
    for(const a of [this.player,this.enemy])this.resetActor(a);
    this.log(`第 ${this.round} 回合 · 双方纳气，轮到你行动。`,'round');
    startPreparedPhase(this,this.player);this.tickBurn(this.player);if(this.result)return;
    if(this.player.charge)this.release(this.player);
    if(!this.result)this.planEnemy();
  }
  tickBurn(a){if(a.burn>0){const raw=a.burn*RULES.burnLayer,n=RULES.burnDefense?this.damage(this.other(a),{id:'burn',element:'fire',damageType:'magical'},raw,1,a):raw;this.hurt(a,n,`${a.name}的灼烧`,false);a.burnTurns--;if(a.burnTurns<=0)a.burn=0;}}
  planEnemy(){
    if(['wood','earth'].includes(this.enemy.key)){
      const c=Object.assign(Object.create(Battle.prototype),JSON.parse(JSON.stringify({...this,logs:[]})),{phase:'enemy',pending:null});c.attack=function(a,s,raw){this.resolveAttack(a,s,raw);};
      const order=this.enemy.key==='wood'?(this.enemy.major==='parasitic'?['parasite','reap','wooddart','cultivate','bloomguard']:['cultivate','bloomstrike','wooddart','bloomguard','bloomheal']):(this.enemy.major==='mountain'?['foundation','mountain','landbreak','stonebolt','rampart']:['foundation','landbreak','rampart','stonebolt','anchor']);
      startPreparedPhase(c,c.enemy);if(c.enemy.charge)c.release(c.enemy);if(c.enemy.key==='earth'&&c.enemy.chilled)order.splice(1,0,'anchor');const chosen=[];
      for(const id of [...order,...this.enemy.skillIds,'basic','basic','basic']){const skill=c.skill(c.enemy,id);if(!skill||!c.enemy.ap||c.result||c.legal(c.enemy,id))continue;if(skill.kind==='heal'&&c.enemy.hp===c.enemy.maxHp&&!c.enemy.burn)continue;if(skill.consumeGrowth&&c.enemy.growthPending&&c.enemy.growth<3&&c.enemy.hp>70)continue;if(skill.consumeParasite&&c.player.parasite===1&&c.player.parasiteTurns>1)continue;if(c.act(c.enemy,id).ok)chosen.push(id);}
      this.enemyPlan=chosen;this.enemyQueue=[...chosen];return;
    }
    if(this.enemy.key==='water'){
      const c=Object.assign(Object.create(Battle.prototype),JSON.parse(JSON.stringify({...this,logs:[]})),{phase:'enemy',pending:null});c.attack=function(a,s,raw){this.resolveAttack(a,s,raw);};
      const candidates=this.enemy.major==='cold'?['rinse','frost','repulse','waterbolt','gather','surge','waterbolt','waterwall']:['rinse','gather','surge','waterbolt','ebb','waterwall'];const chosen=[];
      for(const id of candidates){if(c.enemy.ap===0||c.result)break;if(id==='rinse'&&!c.enemy.burn&&c.enemy.hp>c.enemy.maxHp-12)continue;if(!c.legal(c.enemy,id)&&c.act(c.enemy,id).ok)chosen.push(id);}
      this.enemyPlan=chosen;this.enemyQueue=[...chosen];return;
    }
    const e=this.enemy,copy=JSON.parse(JSON.stringify(e));copy.charge=null;const chosen=[];
    const candidates=e.key==='flame'?['kindle','eruption','flare','firewall'] : e.key==='sword'
      ? (this.round%3===0?['unity','guard','expose','swift']:['expose','strike','swift','guard'])
      : (e.hp<95?['heal','seed','blaze','spark']:this.round%3===0?['inferno','seed','blaze','spark']:['seed','blaze','spark']);
    if(this.distance===2&&e.key==='sword'&&this.round%3!==0)candidates.unshift('near');
    // 预告主招固定；失效后按公开备用规则付费接近、换招或存气。
    let d=this.distance;
    for(const id of candidates){if(chosen.length>=3)break;const s=this.skill(copy,id);if(!s)continue;const paid=payment(copy.qi,s.cost);if(s.ap>copy.ap||!paid||(copy.charge&&!['move','meditate','guard'].includes(s.kind))||(s.intentCost&&copy.intent<s.intentCost)||(s.once&&copy.usedSkills.includes(id))||(s.range&&!s.range.includes(d)))continue;chosen.push(id);copy.ap-=s.ap;copy.qi=paid;if(s.delta)d+=s.delta;if(s.kind==='charge')copy.charge=s;if(copy.key==='fire'&&s.element==='wood'&&!copy.woodTriggered){copy.woodTriggered=true;copy.qi.fire++;}}
    while(copy.ap>0){
      // 蓄势余下的行动只用于护体或补气；保持预告固定，不临时追加攻击。
      const id=copy.charge?(d===1?'far':!copy.meditated&&total(copy.qi)<10?'meditate':null):'basic';
      if(!id)break;chosen.push(id);copy.ap--;if(id==='far')d++;if(id==='meditate')copy.meditated=true;
    }
    this.enemyQueue=chosen;this.enemyPlan=[...chosen];
  }
  raw(actor,s){let n=(s.power||0)+tideBonus(s,actor)+preparedBonus(this,actor,s)+extraBonus(this,actor,s);if(actor.key==='flame'&&actor.major==='fierce'&&s.kind==='attack'&&s.element==='fire'&&actor.fireCasts===1)n+=RULES.chainPower;const target=this.other(actor);if(actor.major==='cold'&&s.id==='waterbolt'&&target.chilled&&!actor.coldTriggered)n+=RULES.coldPower;if(s.ignite)n*=1+.2*target.seed;if(s.partialIgnite)n+=Math.min(s.partialIgnite,target.seed)*10;if(s.finisher)n+=Math.min(actor.intent,s.intentLimit??5)*RULES.intentPower+(actor.edge?RULES.edgePower:0);if((s.finisher||s.kind==='charge')&&target.broken)n*=RULES.brokenMultiplier;return Math.round(n);}
  damage(actor,s,raw=this.raw(actor,s),reduction=1,target=this.other(actor)){return damageAmount(actor,target,s,raw,reduction);}
  preview(s){return this.damage(this.player,s);}
  evadeAvoidance(attacker,pending){
    if(!RULES.reactionRange)return 0;
    const normal=Math.min(2,this.distance+(pending.kind==='force'?pending.delta:0)),evaded=Math.min(2,normal+1);
    if(normal===evaded)return 0;
    return Math.max(0,...this.skills(attacker).filter(s=>s.kind==='attack'&&s.power&&s.range.includes(normal)&&!s.range.includes(evaded)&&!this.legal(attacker,s.id)).map(s=>this.damage(attacker,s)));
  }
  canAnchor(a,s){return RULES.anchorReaction&&s.kind==='force'&&a.key==='earth'&&a.skillIds.includes('anchor')&&a.reaction&&a.qi.earth>=1&&a.terrain>=1;}
  useAnchor(a){a.qi.earth--;a.terrain--;a.reaction=false;this.log(`${a.name}以稳固应对，消费1土气和1地势，抵消本次强制位移；不减免伤害。`,'reaction');}
  tickParasite(a,raw){this.hurt(a,this.damage(this.other(a),{id:'parasite',element:'wood',damageType:'magical'},raw,1,a),'寄生侵蚀');}

  act(actor,id){
    if(actor===this.player&&this.phase!=='player')return {ok:false,error:'现在不是你的行动阶段'};
    if(actor===this.enemy&&this.phase!=='enemy')return {ok:false,error:'现在不是敌方行动阶段'};
    const error=this.legal(actor,id);if(error)return {ok:false,error};
    const s=this.skill(actor,id),target=this.other(actor);actor.qi=payment(actor.qi,s.cost);actor.ap-=s.ap;if(s.intentCost){actor.intent-=s.intentCost;this.log(`${actor.name}消耗 ${s.intentCost} 层剑意用于追击。`,'resource');}if(s.once)actor.usedSkills.push(id);
    this.log(`${actor.name}施展「${s.name}」。`,actor===this.player?'player':'enemy');
    if(actor.key==='fire'&&s.element==='wood'&&!actor.woodTriggered){actor.woodTriggered=true;const n=this.gain(actor,{fire:1});if(n)this.log(`生息诀 · ${actor.name}凝聚 ${n} 火灵气。`,'resource');if(actor.major==='sustain'){const heal=Math.min(SUSTAIN_RECOVERY,actor.maxHp-actor.hp);actor.hp+=heal;this.log(`生息消耗 · ${actor.name}恢复 ${heal} 气血。`,'heal');}}
    if(s.setupShield){actor.shield=Math.min(60,actor.shield+s.setupShield);this.log(`${actor.name}付费准备，获得${s.setupShield}护盾，现有${actor.shield}。`,'resource');}
    if(actor.key==='water'&&s.element==='water'&&Object.values(s.cost).some(n=>n>0)&&!actor.waterCleanseTriggered&&RULES.waterCleanse){actor.waterCleanseTriggered=true;const n=Math.min(actor.burn,RULES.waterCleanse);actor.burn-=n;if(!actor.burn)actor.burnTurns=0;if(n)this.log(`玄水心诀 · ${actor.name}首次付费水法清除${n}层灼烧。`,'resource');}
    if(tacticalAction(this,actor,s)||preparedAction(this,actor,s)){}
    else if(s.kind==='seed'){const before=target.seed;target.seed=Math.min(5,target.seed+2);this.log(`${target.name}增加 ${target.seed-before} 层灵种，现有 ${target.seed} 层。`,'resource');}
    else if(s.kind==='heal'){const power=this.healPower(actor,s);spendPrepared(this,actor,s);spendExtra(this,actor,s);this.spendTide(actor,s);const n=Math.min(power,actor.maxHp-actor.hp);actor.hp+=n;const cleared=Math.min(actor.burn,s.clearBurn??5);actor.burn-=cleared;if(!actor.burn)actor.burnTurns=0;this.log(`${actor.name}恢复 ${n} 气血，清除 ${cleared} 层灼烧。`,'heal');if(s.refund){const gain=this.gain(actor,s.refund);this.log(`${actor.name}以「${s.name}」凝聚 ${gain} 灵气。`,'resource');}}
    else if(s.kind==='guard'){const tide=this.spendTide(actor,s),prep=spendPrepared(this,actor,s);actor.shield=Math.min(60,actor.shield+(s.shield??22)+tide*(s.tideShield??0)+prep.growth*(s.growthShield??0)+prep.terrain*(s.terrainShield??0)+(actor.major==='bastion'&&prep.terrain&&!actor.bastionTriggered?(RULES.bastionShield??0):0));if(actor.major==='bastion'&&prep.terrain)actor.bastionTriggered=true;actor.intent=Math.min(5,actor.intent+(s.intent??1));if(s.seedGain)target.seed=Math.min(5,target.seed+s.seedGain);if(s.reflect){actor.counter={power:s.reflect+(s.reflectPrepPower??0)*(tide+prep.growth+prep.terrain),hits:s.reflectHits,element:s.element,name:s.name};this.log(`${actor.name}准备${actor.counter.hits}次反击，每次至多${actor.counter.power}基础${ELEMENT_NAMES[s.element]}伤，下次自身阶段到期。`,'resource');}this.log(`${actor.name}获得护盾，现有 ${actor.shield} 护盾${actor.key==='sword'?`、${actor.intent} 剑意`:''}${s.seedGain?`；目标灵种${target.seed}`:''}。`,'resource');}
    else if(s.kind==='move')this.moveActor(actor,s.delta);
    else if(s.kind==='force'){this.clearChill(target,'逐浪消费');if(s.power)this.attack(actor,s,this.raw(actor,s));else this.moveActor(target,s.delta,{forced:true});}
    else if(s.kind==='tide'){const n=actor.major==='tidal'?3:2,before=actor.tide;actor.tide=Math.min(3,actor.tide+n);this.log(`${actor.name}纳潮增加 ${actor.tide-before} 潮势，现有 ${actor.tide} / 3；未恢复气血或灵气。`,'resource');}
    else if(s.kind==='ebb'){const n=this.spendTide(actor,s),gain=this.gain(actor,{water:n});this.log(`${actor.name}回潮凝聚 ${gain} 水灵气；溢出 ${n-gain} 点，潮势不返还。`,'resource');}
    else if(s.kind==='dispel'){actor.hp=Math.min(actor.maxHp,actor.hp+8);this.clearChill(actor,'净息');this.log(`${actor.name}恢复 8 气血，只处理凝滞，灼烧保留。`,'heal');}
    else if(s.kind==='meditate'){actor.meditated=true;const key=actor.key==='sword'?'metal':['water','wood','earth'].includes(actor.key)?actor.key:'fire';const n=this.gain(actor,{[key]:1,any:1});this.log(`${actor.name}调息，凝聚 ${n} 灵气。`,'resource');}
    else if(s.kind==='purify'){actor.hp=Math.min(actor.maxHp,actor.hp+0);actor.burn=0;actor.burnTurns=0;this.log(`${actor.name}恢复 0 气血，清除灼烧。`,'heal');}
    else if(s.kind==='charge'){actor.charge={...s,storedPower:this.raw(actor,s)};spendPrepared(this,actor,s);if(s.finisher)this.spendFinisher(actor,s);this.log(`${actor.name}开始蓄势「${s.name}」，下次行动阶段释放。`,'charge');}
    else {const raw=this.raw(actor,s);spendPrepared(this,actor,s);spendExtra(this,actor,s);this.spendTide(actor,s);if(actor.major==='cold'&&s.id==='waterbolt'&&target.chilled&&!actor.coldTriggered){actor.coldTriggered=true;this.clearChill(target,'寒凝增伤消费');this.log(`寒凝控距 · ${actor.name}消费凝滞，为玄水矢增加 ${RULES.coldPower} 基础伤害；本回合不再触发。`,'resource');}if(actor.key==='flame'&&s.kind==='attack'&&s.element==='fire'){actor.fireCasts++;if(actor.major==='fierce'&&actor.fireCasts===2)this.log(`烈焰强攻 · ${actor.name}第二次付费火法增加 ${RULES.chainPower} 基础伤害。`,'resource');}this.attack(actor,s,raw);}
    paidPreparedCast(this,actor,s);return {ok:true};
  }
  planBudget(qi=this.enemy.qi){
    const {logs,stats,attack,...state}=this;
    const c=Object.assign(Object.create(Battle.prototype),structuredClone(state),{logs:[]});
    c.phase='enemy';c.pending=null;c.result=null;c.enemy.qi={...qi};c.player.hp=c.player.maxHp=1000000;
    c.attack=function(a,s,raw){this.resolveAttack(a,s,raw);};
    if(this.phase==='player')startPreparedPhase(c,c.enemy);
    if(c.enemy.charge)c.release(c.enemy);
    const failures=[];
    for(const id of this.enemyQueue??this.enemyPlan??[]){let error=c.legal(c.enemy,id);for(let steps=0;error==='距离不适合'&&steps<2;steps++){const fix=activeFallback(c,c.enemy,{blockedId:id});if(!fix.retry)break;c.act(c.enemy,fix.id);error=c.legal(c.enemy,id);}if(error){if(error==='所需灵气不足')failures.push(id);continue;}c.act(c.enemy,id);}
    return {failures,qi:{...c.enemy.qi}};
  }
  reactionDecision(s,raw,{threshold=15,reserveHeavy=true}={}){
    const a=this.enemy,p=this.player,k=CLASSES[a.key].reactionElement;
    const damageOf=(s,raw)=>this.damage(p,s,raw,1,a);
    const damage=damageOf(s,raw),net=this.healthDamage(damage,a.shield,s),shieldNet=this.healthDamage(damage,Math.min(60,a.shield+26),s),evadeNet=this.healthDamage(this.damage(p,s,raw,.5,a),a.shield,s);
    if(this.canAnchor(a,s)&&net<a.hp&&(a.charge&&!a.charge.range.includes(Math.min(2,this.distance+1))||this.distance===1&&a.terrain>=2))return {response:'anchor'};
    if(!a.reaction||!net)return {response:'none'};
    const shield=a.qi[k]>=1&&shieldNet<net,evade=payment(a.qi,{any:2})&&evadeNet<net;
    if(!shield&&!evade)return {response:'none'};
    if(net>=a.hp){if(shield&&shieldNet<a.hp)return {response:'shield'};if(evade&&evadeNet<a.hp)return {response:'evade'};if(shield||evade)return {response:evade&&(!shield||evadeNet<shieldNet)?'evade':'shield'};}
    if(evade&&this.evadeAvoidance(p,s)*.6+net-evadeNet>(shield?net-shieldNet:0)+3){const before=this.planBudget().failures,after=this.planBudget(payment(a.qi,{any:2})).failures,counts=new Map();for(const id of before)counts.set(id,(counts.get(id)||0)+1);const conflict=after.filter(id=>{const n=counts.get(id)||0;if(n){counts.set(id,n-1);return false;}return true;});if(conflict.length)return {response:'none',reason:`留气：闪身会使已预告的${conflict.map(id=>this.skill(a,id)?.name??id).join('、')}无法付费。`};return {response:'evade',reason:'退距可避开仍可施展的近中距后续重招。'};}
    if(net<threshold)return {response:'none'};
    // Only remaining legal, equipped attacks are public threats. Do not infer a
    // private next action or reserve against a charge which cannot release now.
    const next=reserveHeavy?Math.max(0,...this.skills(p).filter(x=>x.kind==='attack'&&!this.legal(p,x.id)).map(x=>damageOf(x,this.raw(p,x)))):0;
    if(net<a.hp*.3&&next>damage*1.8)return {response:'none',reason:'小招伤害可承受，保留本阶段应对给仍可施展的重招。'};
    const response=shield?'shield':evade&&net>=Math.max(30,a.hp*.4)?'evade':'none';
    if(response==='none')return {response};
    const cost=response==='shield'?{[k]:1}:{any:2};
    if(net<a.hp*.45){const before=this.planBudget().failures,after=this.planBudget(payment(a.qi,cost)).failures,counts=new Map();for(const id of before)counts.set(id,(counts.get(id)||0)+1);const blocked=after.filter(id=>{const n=counts.get(id)||0;if(n){counts.set(id,n-1);return false;}return true;});if(blocked.length)return {response:'none',reason:`应对会令预告中的「${blocked.map(id=>this.skill(a,id).name).join('、')}」缺气，承受此击保留出招资源。`};}
    return {response};
  }
  attack(actor,s,raw){
    if(actor===this.enemy&&this.player.reaction){this.pending={s,raw};this.phase='reaction';return;}
    let response='none';
    if(actor===this.player&&this.enemy.reaction){const e=this.enemy,k=CLASSES[e.key].reactionElement,decision=this.reactionDecision(s,raw);response=decision.response;if(decision.reason)this.log(`${e.name}留气：${decision.reason}`,'decision');if(response==='shield'){e.qi[k]--;e.reaction=false;e.shield=Math.min(60,e.shield+26);this.log(`${e.name}以「${CLASSES[e.key].reaction}」应对，获得 26 护盾。`,'reaction');}else if(response==='evade'){e.qi=payment(e.qi,{any:2});e.reaction=false;this.moveActor(e,1);this.log(`${e.name}避让减伤，距离拉开一档。`,'reaction');}else if(response==='anchor')this.useAnchor(e);}
    this.resolveAttack(actor,s,raw,response==='evade'?.5:1,response==='anchor');
  }
  resolveAttack(actor,s,raw,reduction=1,blockForce=false){
    const target=this.other(actor),damage=this.damage(actor,s,raw,reduction);
    if(s.id==='inferno'){target.burn=0;target.burnTurns=0;}else if(s.consumeBurn){const spent=Math.min(target.burn,s.consumeBurn);target.burn-=spent;if(!target.burn)target.burnTurns=0;this.log(`${actor.name}消耗 ${spent} 层灼烧，剩余 ${target.burn} 层；已消耗层数不再结算持续伤害。`,'resource');}
    this.hurt(target,damage,`${actor.name}的${s.name}`,true,s.shieldPierce??0);
    const ignited=s.ignite?target.seed:s.partialIgnite?Math.min(s.partialIgnite,target.seed):0;
    if(ignited){target.seed-=ignited;this.log(`${actor.name}引燃 ${ignited} 层灵种，剩余 ${target.seed} 层。`,'resource');if(actor.major==='ignite'&&!actor.igniteTriggered){actor.igniteTriggered=true;const n=this.gain(actor,{fire:1});this.log(`引燃爆发 · ${actor.name}凝聚 ${n} 火灵气。`,'resource');}}
    if(s.finisher){if(s.kind!=='charge')this.spendFinisher(actor,s);target.broken=false;}
    if(s.breakPrep)breakPreparation(this,target,target.terrain?'terrain':'growth',target.terrain?1:2);
    if(s.expose)target.broken=true;
    if(s.sword&&!s.finisher){let n=1;if(actor.major==='quick'&&!actor.quickTriggered){actor.quickTriggered=true;n++;this.log(`快剑压制 · ${actor.name}额外养剑 1 层。`,'resource');}actor.intent=Math.min(5,actor.intent+n);this.log(`${actor.name}现有 ${actor.intent} 层剑意。`,'resource');}
    if(s.burn){let n=s.burn;if(actor.key==='flame'&&actor.major==='smolder'&&s.kind==='attack'&&!actor.smolderTriggered){actor.smolderTriggered=true;n++;this.log(`焚灼消耗 · ${actor.name}首次附焰额外增加 1 层灼烧。`,'resource');}target.burn=Math.min(5,target.burn+n);target.burnTurns=RULES.burnTurns;}
    if(s.chill){target.chilled=true;this.log(`${target.name}陷入凝滞，不叠层；下次行动结束消散，可主动移动或单独净息。`,'resource');}
    if(s.kind==='force'&&!this.result){if(blockForce)this.lastMove={actor:target===this.player?'player':'enemy',forced:true,from:this.distance,to:this.distance,blocked:true};else this.moveActor(target,s.delta,{forced:true});}
    if(s.interrupt&&target.charge){this.log(`${target.name}的「${target.charge.name}」被打断！`,'charge');target.charge=null;}
    if(s.gainTerrain&&!this.result){actor.terrain=Math.min(3,(actor.terrain??0)+s.gainTerrain);this.log(`${actor.name}直攻积势，现有${actor.terrain} / 3地势。`,'resource');}
    if(!this.result&&target.counter&&damage>0)this.reflectHit(target,actor,Math.min(damage,target.counter.power));
  }
  healPower(actor,s){return (s.heal??0)+Math.min(actor.growth??0,s.consumeGrowth??0)*(s.growthHeal??0)+Math.min(actor.terrain??0,s.consumeTerrain??0)*(s.terrainHeal??0)+Math.min(this.other(actor).parasite??0,s.consumeParasite??0)*(s.parasiteHeal??0)+Math.min(this.other(actor).seed,s.consumeSeed??0)*(s.seedHeal??0)+Math.min(actor.tide??0,s.consumeTide??0)*(s.tideHeal??0);}
  reflectHit(defender,attacker,raw){const c=defender.counter;c.hits--;if(!c.hits)defender.counter=null;const d=this.damage(defender,{id:'reflection',element:c.element,damageType:'magical'},raw,1,attacker);this.hurt(attacker,d,`${defender.name}的${c.name}反击`);}
  spendFinisher(actor,s){const n=Math.min(actor.intent,s.intentLimit??5);actor.intent-=n;if(actor.edge){this.log(`藏锋重剑 · ${actor.name}消耗藏锋，为「${s.name}」增加 ${RULES.edgePower} 基础伤害。`,'resource');actor.edge=false;}this.log(`${actor.name}消耗 ${n} 层剑意，剩余 ${actor.intent} 层。`,'resource');}
  expireEdge(actor){if(actor.edge&&actor.edgeExpires<=this.round){actor.edge=false;this.log(`${actor.name}的藏锋超过时限，强化消散。`,'resource');}}
  healthDamage(n,shield,s={}){return n-Math.min(shield,Math.floor(n*(1-(s.shieldPierce??0))));}
  hurt(target,n,source,useShield=true,pierce=0){
    const absorbed=useShield?Math.min(target.shield,Math.floor(n*(1-pierce))):0;target.shield-=absorbed;const actual=Math.min(target.hp,n-absorbed);target.hp-=actual;
    this.log(`${source}：${target.name}受到 ${actual} 伤害${absorbed?`，护盾吸收 ${absorbed}`:''}。`,target===this.player?'damage':'hit');
    if(absorbed>0&&target.major==='heavy'){target.edge=true;target.edgeExpires=this.round+1;this.log(`藏锋重剑 · ${target.name}承接攻击，获得藏锋，下一次重剑强化；至第 ${target.edgeExpires} 回合己方行动结束失效。`,'resource');}
    this.lastHit={target:target===this.player?'player':'enemy',damage:actual,absorbed,id:this.serial};
    if(target.hp<=0){this.result=target===this.enemy?'win':'lose';this.phase='over';this.pending=null;this.log(this.result==='win'?'论道告捷 · 对手拱手认输。':'本场惜败 · 调整招式，再试一场。','result');}
  }
  react(kind){
    if(this.phase!=='reaction'||!this.pending)return {ok:false,error:'当前没有可应对的招式'};
    const p=this.player,k=CLASSES[p.key].reactionElement;
    if(!['shield','evade','none','anchor'].includes(kind))return {ok:false,error:'未知应对方式'};
    if(kind==='anchor'&&!this.canAnchor(p,this.pending.s))return {ok:false,error:'稳固需要已装备，且有土气、地势和应对机会'};
    if(kind==='shield'&&p.qi[k]<1)return {ok:false,error:'应对灵气不足'};
    if(kind==='evade'&&!payment(p.qi,{any:2}))return {ok:false,error:'需要 2 任意灵气'};
    if(kind==='shield'){p.qi[k]--;p.shield=Math.min(60,p.shield+26);p.reaction=false;this.log(`你施展「${CLASSES[p.key].reaction}」，获得 26 护盾。`,'reaction');}
    if(kind==='evade'){p.qi=payment(p.qi,{any:2});p.reaction=false;this.moveActor(p,1);this.log('你闪身避让，本次伤害降低 50%，距离拉开一档。','reaction');}
    if(kind==='anchor')this.useAnchor(p);
    const pending=this.pending;this.pending=null;this.phase='enemy';this.resolveAttack(this.enemy,pending.s,pending.raw,kind==='evade'?.5:1,kind==='anchor');return {ok:true};
  }
  cancelCharge(){if(this.phase!=='player'||!this.player.charge)return {ok:false,error:'没有可以取消的蓄势'};this.log(`你取消「${this.player.charge.name}」，费用不返还。`);this.player.charge=null;return {ok:true};}
  release(actor){const s=actor.charge;actor.charge=null;if(s.range&&!s.range.includes(this.distance)){this.log(`${actor.name}的「${s.name}」因距离不适合而落空。`,'charge');return;}this.log(`${actor.name}释放「${s.name}」！`,'charge');this.attack(actor,s,s.storedPower);}
  endTurn(){if(this.phase!=='player'||this.result)return {ok:false,error:'现在不能结束回合'};this.expireEdge(this.player);this.clearChill(this.player,'行动结束');finishPreparedPhase(this,this.player);this.phase='enemy';this.log('你结束行动，敌方开始出招。','round');startPreparedPhase(this,this.enemy);this.tickBurn(this.enemy);if(!this.result&&this.enemy.charge)this.release(this.enemy);return {ok:true};}
  enemyStep(){
    if(this.phase!=='enemy'||this.result)return false;
    while(this.enemyQueue.length){const id=this.enemyQueue.shift();const error=this.legal(this.enemy,id);if(error){const fix=activeFallback(this,this.enemy,{blockedId:id});if(fix.retry){this.enemyQueue.unshift(id);this.log(`【备用策略】${fix.reason}`,'decision');this.event?.('adapt',1,{skillId:fix.id,reason:fix.reason});this.act(this.enemy,fix.id);return true;}}const r=this.act(this.enemy,id);if(r.ok)return true;this.log(`敌方未能施展「${this.skill(this.enemy,id)?.name}」：${r.error}。`);}
    if(this.enemy.ap>0){const fix=activeFallback(this,this.enemy);if(fix.id){this.log(`【备用策略】${fix.reason}`,'decision');this.event?.('adapt',1,{skillId:fix.id,reason:fix.reason});const r=this.act(this.enemy,fix.id);if(r.ok)return true;}else{this.enemyWaitReason=fix.reason;this.log(`【有意等待】${fix.reason}`,'decision');this.event?.('wait',1,{reason:fix.reason,ap:this.enemy.ap});}}
    this.expireEdge(this.enemy);this.clearChill(this.enemy,'行动结束');finishPreparedPhase(this,this.enemy);this.beginRound();return false;
  }
  snapshot(){return {round:this.round,phase:this.phase,distance:['近身','中距','远距'][this.distance],player:JSON.parse(JSON.stringify(this.player)),enemy:JSON.parse(JSON.stringify(this.enemy)),enemyPlan:this.enemyPlan,result:this.result,pending:this.pending?{name:this.pending.s.name,raw:this.pending.raw}:null};}
}
