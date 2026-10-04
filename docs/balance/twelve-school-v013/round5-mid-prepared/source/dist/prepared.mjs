import {RULES} from './rules.mjs';
// Wood and earth share the existing qi/AP budget. Preparation is finite and
// every harvest spends it before reactions; no independent summon turns exist.
export const PREPARED_CLASSES={
 wood:{name:'灵木法修',nameShort:'木法',art:'wood',person:'林栖萝',sect:'长春谷',title:'培植共生 · 寄藤收获',hp:210,physical:22,magical:30,gen:{wood:4,any:1},passive:'灵植心诀',passiveText:'生长上限3。培植投入木气，下次自身行动开始才成熟；收获共用并消费生长。寄生仅在目标每阶段首次主动耗气施法时成长、侵蚀准备，可单独净化。',reaction:'青叶障',reactionElement:'wood',skills:[
  {id:'wooddart',name:'青叶矢',symbol:'叶',element:'wood',ap:1,cost:{wood:1},kind:'attack',power:26,tag:'直攻',range:[0,1,2],desc:'低耗全距木法，不需要生长或寄生。'},
  {id:'cultivate',name:'培植诀',symbol:'苗',element:'wood',ap:1,cost:{wood:1},kind:'cultivate',once:true,tag:'培育',range:[0,1,2],desc:'生长+1，上限3，每回合一次；下次自身行动开始再+1，共生改为再+2。生长被全破除或收尽后取消这次成熟。'},
  {id:'bloomstrike',name:'繁花击',symbol:'绽',element:'wood',ap:1,cost:{wood:2},kind:'attack',power:24,minGrowth:1,consumeGrowth:3,growthPower:12,tag:'收获',range:[0,1],desc:'需要生长。消费全部生长，每层增加12基础伤害；不同时回血或补盾。'},
  {id:'bloomguard',name:'蔓生屏',symbol:'蔓',element:'wood',ap:1,cost:{wood:1},kind:'guard',shield:10,intent:0,minGrowth:1,consumeGrowth:3,growthShield:10,tag:'收获',range:[0,1,2],desc:'消费全部生长，每层增加10护盾，基础10；盾上限60，不返还培育费用。'},
  {id:'bloomheal',name:'灵植回春',symbol:'荣',element:'wood',ap:1,cost:{wood:1},kind:'heal',heal:8,clearBurn:0,minGrowth:1,consumeGrowth:3,growthHeal:8,once:true,tag:'收获',range:[0,1,2],desc:'消费全部生长，每层增加8恢复，基础8，每回合一次。不清除灼烧、凝滞或寄生，溢出不返生长。'},
  {id:'parasite',name:'寄藤诀',symbol:'寄',element:'wood',ap:1,cost:{wood:1},kind:'parasite',once:true,tag:'寄生',range:[0,1,2],desc:'目标寄生+1，上限3，并刷新为目标两次行动结束后消散。每阶段首次主动耗气施法使寄生+1、侵蚀每层4护盾和1地势；寄生主修改为+2，不扣气血、灵气或行动。'},
  {id:'reap',name:'噬藤收获',symbol:'噬',element:'wood',ap:1,cost:{wood:2},kind:'attack',power:22,minParasite:1,consumeParasite:3,parasitePower:14,tag:'兑现',range:[0,1],desc:'需要目标寄生，消费全部寄生，每层增加14基础伤害；已收获的寄生不再侵蚀。'},
  {id:'prune',name:'截根术',symbol:'剪',element:'wood',ap:1,cost:{wood:1,any:1},kind:'attack',power:18,breakPrep:true,tag:'破除',range:[0,1],desc:'攻击后破除1地势；目标没有地势时改为破除2生长。只处理一种准备，不清异常、不打断蓄势。'},
 ]},
 earth:{name:'厚土法修',nameShort:'土法',art:'earth',person:'岳沉璧',sect:'镇岳门',title:'地势筑垒 · 镇岳破阵',hp:220,physical:30,magical:26,gen:{earth:4,any:1},passive:'厚土心诀',passiveText:'地势上限3，主动布置后供攻击、防护和稳固共同消费。自己实际移动或被迫迁移损失1地势；对手移动不损失地势。稳固仅抵消一次强制位移，不免疫打断或侵蚀。',reaction:'岩甲诀',reactionElement:'earth',skills:[
  {id:'stonebolt',name:'飞岩诀',symbol:'岩',element:'earth',ap:1,cost:{earth:1},kind:'attack',power:26,tag:'直攻',range:[0,1,2],desc:'低耗全距土法，不需要地势；地势耗尽后仍可进攻。'},
  {id:'foundation',name:'筑垒诀',symbol:'垒',element:'earth',ap:1,cost:{earth:1},kind:'terrain',once:true,tag:'布置',range:[0,1,2],desc:'建立2地势，壁垒主修改为3；上限3，每回合一次，不因承伤免费增长。'},
  {id:'rampart',name:'磐石壁',symbol:'壁',element:'earth',ap:1,cost:{earth:1},kind:'guard',shield:14,intent:0,minTerrain:1,consumeTerrain:2,terrainShield:10,tag:'守御',range:[0,1,2],desc:'需要地势，消费至多2层，每层增加10护盾，基础14；盾上限60，不能无损回收地势。'},
  {id:'landbreak',name:'裂地击',symbol:'裂',element:'earth',ap:1,cost:{earth:2},kind:'attack',power:28,minTerrain:1,consumeTerrain:2,terrainPower:12,tag:'兑现',range:[0,1],desc:'需要地势，消费至多2层，每层增加12基础伤害；消耗后防守与稳固可用地势减少。'},
  {id:'mountain',name:'镇岳印',symbol:'岳',element:'earth',ap:2,cost:{earth:3,any:1},kind:'charge',power:66,minTerrain:2,consumeTerrain:2,terrainPower:12,tag:'蓄势',range:[0,1],desc:'支付2行动、灵气和2地势蓄势；地势增伤启动时锁定。下次自身行动开始释放，仅近中距；退到远距或打断可化解，费用不返还。'},
  {id:'anchor',name:'稳固诀',symbol:'定',element:'earth',ap:1,cost:{earth:1},kind:'anchor',minTerrain:1,consumeTerrain:1,once:true,tag:'稳固',range:[0,1,2],desc:'消费1地势准备一次抵消强制位移；自己实际移动、成功抵消或下次自身行动结束时消失。不同时免打断、侵蚀或伤害。'},
  {id:'quakesunder',name:'碎阵诀',symbol:'碎',element:'earth',ap:1,cost:{earth:1,any:1},kind:'attack',power:18,breakPrep:true,tag:'破除',range:[0,1],desc:'攻击后破除1地势；无地势时改为破除2生长。只处理一种准备，不附带打断。'},
  {id:'earthenwall',name:'岩衣术',symbol:'衣',element:'earth',ap:1,cost:{earth:1},kind:'guard',shield:18,intent:0,tag:'护体',range:[0,1,2],desc:'获得18护盾，上限60，不需要也不增加地势；土气与进攻、岩甲应对共用。'},
 ]},
};
export const PREPARED_MAJORS={
 wood:{symbiosis:{name:'灵植共生',symbol:'生',focus:'延迟成熟 · 收获取舍',effect:'主动培植后，下次自身行动开始的成熟增加2生长，而非1，上限3。收获或全破除会取消尚未兑现的成熟。',tip:'成熟需要跨越自身阶段；可提前收获保命，也可留给繁花进攻。',recommended:['wooddart','cultivate','bloomstrike','bloomguard','bloomheal','prune']},parasitic:{name:'毒藤寄生',symbol:'寄',focus:'施法侵蚀 · 有限收获',effect:'目标每阶段首次主动耗气施法时，寄生增加2层而非1，上限3；仍需付费寄藤维护，移动、应对、被动和免费释放不触发。',tip:'寄生主要侵蚀护盾与地势；收获转为攻击，目标可以单独净化或暂缓施法。',recommended:['wooddart','cultivate','bloomguard','parasite','reap','prune']}},
 earth:{bastion:{name:'壁垒守御',symbol:'壁',focus:'主动布阵 · 有限守御',effect:'筑垒建立3地势，而非2，上限3；地势供守御、攻击与稳固共同消费，不由承伤增长。',tip:'对手退远不损阵地；自己追击损失1地势，保存阵地也可能够不到强招。',recommended:['stonebolt','foundation','rampart','landbreak','anchor','earthenwall']},mountain:{name:'镇岳压制',symbol:'岳',focus:'消费地势 · 公开镇压',effect:'每回合首次主动支付费用、消费地势的攻击或蓄势，增加10基础伤害。大招启动时锁定，不因免费释放再次触发。',tip:'镇岳印只有近中距，预告后对手退远或打断都能化解。',recommended:['stonebolt','foundation','rampart','landbreak','mountain','quakesunder']}},
};
export const PREPARED_COMMON=[
 {id:'unparasite',name:'净息·寄生',ap:1,cost:{any:1},kind:'unparasite',desc:'只清除自身寄生，不回血，不清其他异常。'},
 {id:'sever-growth',name:'破除·生长',ap:1,cost:{any:1},kind:'breakprep',prep:'growth',amount:2,desc:'削减对手2生长，不伤气血，不打断。'},
 {id:'sever-terrain',name:'破除·地势',ap:1,cost:{any:1},kind:'breakprep',prep:'terrain',amount:1,desc:'削减对手1地势，不伤气血，不打断。'},
];
export function preparedFields(key){return {parasite:0,parasiteTurns:0,parasiteFed:false,...(key==='wood'?{growth:0,growthPending:false}:{}),...(key==='earth'?{terrain:0,anchored:false,anchorExpires:0,mountainTriggered:false}:{})};}
export function preparedLegal(b,a,s){const e=b.other(a);
 if(s.farPrep&&b.distance===2&&(s.farPrep==='parasite'?(e.parasite??0):(a[s.farPrep]??0))<3)return '远距收获需要对应准备满3层';
 if(s.minGrowth&&(a.growth??0)<s.minGrowth)return '需要至少1生长';
 if(s.minTerrain&&(a.terrain??0)<s.minTerrain)return `需要至少${s.minTerrain}地势`;
 if(s.minParasite&&(e.parasite??0)<s.minParasite)return '目标需要寄生';
 if(s.kind==='cultivate'&&a.growth>=3)return '生长已经成熟';
 if(s.kind==='terrain'&&a.terrain>=3)return '地势已经充盈';
 if(s.kind==='anchor'&&a.anchored)return '稳固已经准备';
 if(s.kind==='unparasite'&&!a.parasite)return '自身没有寄生';
 if(s.kind==='breakprep'&&!(e[s.prep]>0))return '目标没有对应准备';
 return null;
}
export function startPreparedPhase(b,a){
 if(a.growthPending){a.growthPending=false;if(a.growth){const n=a.major==='symbiosis'?2:1,before=a.growth;a.growth=Math.min(3,a.growth+n);b.log(`${a.name}的付费培植跨过阶段，成熟增加${a.growth-before}生长，现有${a.growth} / 3。`,'resource');}}
}
export function finishPreparedPhase(b,a){
 if(a.parasite){a.parasiteTurns--;if(a.parasiteTurns<=0){a.parasite=0;a.parasiteTurns=0;b.log(`${a.name}的寄生超过维护时限，消散。`,'resource');}}
 if(a.anchored&&a.anchorExpires<=b.round){a.anchored=false;b.log(`${a.name}的稳固到期。`,'resource');}
}
export function paidPreparedCast(b,a,s){
 if(b.result||!a.parasite||a.parasiteFed||!Object.values(s.cost).some(n=>n>0)||['move','unparasite','breakprep'].includes(s.kind))return;
 a.parasiteFed=true;const n=b.other(a).major==='parasitic'?2:1;a.parasite=Math.min(3,a.parasite+n);
 const shield=RULES.parasitePower?0:Math.min(a.shield,a.parasite*4),terrain=Math.min(a.terrain??0,1);a.shield-=shield;if(terrain)a.terrain-=terrain;
 b.log(`${a.name}本阶段首次耗气施法，寄生成长至${a.parasite}，${RULES.parasitePower?'每层'+RULES.parasitePower+'基础木伤':'侵蚀'+shield+'护盾'}、破除${terrain}地势；不扣灵气或行动。`,'resource');
 if(RULES.parasitePower)b.tickParasite(a,a.parasite*RULES.parasitePower);
}
export function preparedBonus(b,a,s){return Math.min(a.growth??0,s.consumeGrowth??0)*(s.growthPower??0)+Math.min(a.terrain??0,s.consumeTerrain??0)*(s.terrainPower??0)+Math.min(b.other(a).parasite??0,s.consumeParasite??0)*(s.parasitePower??0)+(a.major==='mountain'&&!a.mountainTriggered&&s.consumeTerrain&&['attack','charge'].includes(s.kind)?(RULES.mountainBonus??10):0);}
export function spendPrepared(b,a,s){
 const spent={growth:Math.min(a.growth??0,s.consumeGrowth??0),terrain:Math.min(a.terrain??0,s.consumeTerrain??0),parasite:Math.min(b.other(a).parasite??0,s.consumeParasite??0)};
 for(const key of ['growth','terrain','parasite'])if(spent[key]){const owner=key==='parasite'?b.other(a):a;owner[key]-=spent[key];if(key==='growth'&&!owner.growth)owner.growthPending=false;if(key==='parasite'&&!owner.parasite)owner.parasiteTurns=0;b.log(`${a.name}以「${s.name}」消费${spent[key]}${{growth:'生长',terrain:'地势',parasite:'寄生'}[key]}，同一准备不能重复兑现。`,'resource');}
 if(spent.terrain&&a.major==='mountain'&&!a.mountainTriggered&&['attack','charge'].includes(s.kind)){a.mountainTriggered=true;b.log(`镇岳压制 · ${a.name}主动消费地势，兑现本回合首次进攻+${RULES.mountainBonus??10}。`,'resource');}
 return spent;
}
export function breakPreparation(b,a,key,amount){const n=Math.min(a[key]??0,amount);if(n){a[key]-=n;if(key==='growth'&&!a.growth)a.growthPending=false;b.log(`${a.name}被破除${n}${key==='growth'?'生长':'地势'}，剩余${a[key]}。`,'resource');}return n;}
export function preparedAction(b,a,s){const e=b.other(a);
 if(s.kind==='cultivate'){a.growth=Math.min(3,a.growth+1);a.growthPending=true;b.log(`${a.name}培植至${a.growth}生长，等待下次自身阶段成熟。`,'resource');}
 else if(s.kind==='parasite'){e.parasite=Math.min(3,e.parasite+1);e.parasiteTurns=2;if(s.initialPower)b.tickParasite(e,s.initialPower);b.log(`${e.name}附着${e.parasite} / 3寄生，须在两次自身行动结束前付费维护。`,'resource');}
 else if(s.kind==='terrain'){a.terrain=Math.min(3,a.terrain+(a.major==='bastion'?3:2));b.log(`${a.name}主动布置，现有${a.terrain} / 3地势。`,'resource');}
 else if(s.kind==='anchor'){spendPrepared(b,a,s);a.anchored=true;a.anchorExpires=b.round+1;b.log(`${a.name}准备一次稳固，可抵消被迫迁移，至下次自身行动结束失效。`,'resource');}
 else if(s.kind==='unparasite'){a.parasite=0;a.parasiteTurns=0;b.log(`${a.name}付费净息，只清除寄生。`,'resource');}
 else if(s.kind==='breakprep')breakPreparation(b,e,s.prep,s.amount);
 else return false;
 return true;
}
export function preparedMove(b,a,from,to,forced){
 if(forced&&a.anchored){a.anchored=false;b.log(`${a.name}消耗已准备稳固，抵消本次强制位移；不免伤或打断。`,'resource');return false;}
 if(from!==to&&a.key==='earth'){a.terrain=Math.max(0,a.terrain-1);a.anchored=false;b.log(`${a.name}${forced?'被迫迁移':'自己移动'}，损失1地势，剩余${a.terrain}；对手自己移动不影响此阵地。`,'resource');}
 return true;
}
