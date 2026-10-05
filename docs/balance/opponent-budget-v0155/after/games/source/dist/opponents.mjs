import {Battle,CLASSES,burnBonus,total,payment} from './engine.mjs';
import {planQuestioning} from './opponent-planner.mjs';
import {startPreparedPhase} from './prepared.mjs';
export const DIFFICULTIES={practice:{name:'切磋',description:'按性格直观出招，适合熟悉招式和反制。'},questioning:{name:'问道',description:'比较施压、退距、准备与回复；按真实费用估量应对留气和稳固，预告仍固定，气血与伤害相同。'}};

export const OPPONENTS={
 symbiosis:{id:'symbiosis',name:'林栖萝',key:'wood',major:'symbiosis',title:'灵植共生',seal:'荣',style:'培植待熟 · 按需收获',description:'培植后等待下次自身阶段成熟；繁花、蔓屏与回春消费同一份生长，受伤时会提前收获保命。',counter:'趁成熟前施压，或付费破除生长；灵植回春不清灼烧，退远可限制繁花击。',skills:['wooddart','cultivate','bloomstrike','bloomguard','bloomheal','prune'],reactionThreshold:16},
 parasitic:{id:'parasitic',name:'苏缠枝',key:'wood',major:'parasitic',title:'毒藤寄生',seal:'藤',style:'寄藤侵蚀 · 择机收获',description:'寄藤附着后，目标每阶段首次耗气施法使其成长，造成有限木伤并破除地势；噬藤收获会消耗寄生，不能同时保留侵蚀。',counter:'净息·寄生只清寄生；退远限制噬藤。暂缓付费施法不会催长，但仍需面对青叶矢。',skills:['wooddart','cultivate','bloomguard','parasite','reap','prune'],reactionThreshold:18},
 bastion:{id:'bastion',name:'岳沉璧',key:'earth',major:'bastion',title:'壁垒守御',seal:'垒',style:'筑垒承压 · 裂地反击',description:'付费建立三层地势，受压时用磐石壁，出现窗口则裂地反击；追击和稳固都会消耗阵地。',counter:'寄生或破除·地势削弱准备。退远能逼其选择保阵直攻或付出追击成本，不会直接拆掉地势。',skills:['stonebolt','foundation','rampart','landbreak','anchor','earthenwall'],reactionThreshold:12},
 mountain:{id:'mountain',name:'陆镇川',key:'earth',major:'mountain',title:'镇岳压制',seal:'岳',style:'积势压阵 · 公开蓄势',description:'筑垒后保留地势，寻找近中距镇岳窗口；公开蓄势会锁定地势增伤，护体与追击仍占用行动和灵气。',counter:'镇岳限近中距，退远或打断可化解；启动前破除地势可阻止蓄势，启动后拆阵不会抹去已锁定伤害。',skills:['stonebolt','foundation','rampart','landbreak','mountain','quakesunder'],reactionThreshold:18},
 cold:{id:'cold',name:'江寒汀',key:'water',major:'cold',title:'寒凝控距',seal:'寒',style:'凝霜铺垫 · 逐浪择隙',description:'凝霜后选择消费凝滞退距或强化玄水矢；逐浪每回合仅一次，不阻止普通移动，不直接打断蓄势。',counter:'自己移动或净息·凝滞可消解准备；近身与净化占行动，留意对手随后进攻的射程。',skills:['waterbolt','frost','repulse','gather','surge','waterwall'],reactionThreshold:18},
 tidal:{id:'tidal',name:'江听澜',key:'water',major:'tidal',title:'潮汐调息',seal:'汐',style:'纳潮储备 · 攻守争势',description:'纳潮积累至多三层，沧澜、回流与回潮共用这份储备；调节占行动，水气也要留给应对。',counter:'在纳潮或补气时施压，逼其提前防守；退远限制沧澜，储备耗尽后无法免费重用。',skills:['waterbolt','frost','gather','surge','waterwall','ebb'],reactionThreshold:16},
 fierce:{id:'fierce',name:'祝燃灯',key:'flame',major:'fierce',title:'烈焰强攻',seal:'烈',style:'连施火法 · 攻守争气',description:'以附焰和炎矢施压，第二次付费火法强化；射程合适时出烈火，御火应对也要消耗同一份火气。',counter:'观察连续施法与剩余火气；净息能清除铺垫，退距限制烈火与打断。',skills:['flare','kindle','eruption','cinder','firewall','scorchcut'],reactionThreshold:20},
 quick:{id:'quick',name:'顾追风',key:'sword',major:'quick',title:'快剑压制',seal:'疾',style:'主动接近 · 养意追击',description:'靠近后以快剑养意，及时追击、出重剑；你蓄势时优先打断。',counter:'留意近身追击；先防住剑意爆发，再找施法窗口。',skills:['swift','expose','strike','guard','cut','lunge'],reactionThreshold:25},
 heavy:{id:'heavy',name:'裴藏锋',key:'sword',major:'heavy',title:'藏锋重剑',seal:'藏',style:'留气承接 · 藏锋反击',description:'保留横剑应对的金灵气，承接攻击后用重剑兑现藏锋；不会无限补盾。',counter:'小招试探，观察藏锋与破绽；近身可化解万剑归一。',skills:['swift','expose','strike','guard','return','unity'],reactionThreshold:8},
 ignite:{id:'ignite',name:'温照夜',key:'fire',major:'ignite',title:'引燃爆发',seal:'燃',style:'种灵分燃 · 寻隙引爆',description:'先种灵，再以分燃或焚炎兑现；射程不合适时接近，有灼烧铺垫才择机蓄势。',counter:'观察灵种与距离；引爆之前施压，或留住打断机会。',skills:['seed','spark','blaze','ember','vine','inferno'],reactionThreshold:20},
 sustain:{id:'sustain',name:'林知春',key:'fire',major:'sustain',title:'生息消耗',seal:'生',style:'灼烧施压 · 回春周转',description:'持续施加灼烧，受伤后选择回春或枯荣；留出进攻行动，避免只回血。',counter:'恢复也占行动；抓住出招窗口集中爆发，按需清除灼烧。',skills:['seed','spark','blaze','heal','nourish','vine'],reactionThreshold:14},
};
export const ROUTES={
 sword:{name:'试剑问火',description:'先试快剑，再战生息，最后面对藏锋重剑。',opponents:['quick','sustain','heavy']},
 fire:{name:'观火问剑',description:'先观引燃，再试快剑，最后面对生息消耗。',opponents:['ignite','quick','sustain']},
 wood:{name:'寻木破阵',description:'先观共生成熟，再辨寄藤侵蚀，最后退远化解镇岳。',opponents:['symbiosis','parasitic','mountain']},
 earth:{name:'镇岳问生',description:'先破壁垒阵地，再应共生收获，最后面对镇岳蓄势。',opponents:['bastion','symbiosis','mountain']},
};
export const opponentConfig=id=>{const p=OPPONENTS[id];if(!p)throw Error('未知论道对手');return {major:p.major,skillIds:[...p.skills]};};
function preview(b){const {logs,stats,...state}=b;const copy=Object.assign(Object.create(Battle.prototype),JSON.parse(JSON.stringify(state)),{logs:[]});copy.phase='enemy';copy.pending=null;copy.result=null;copy.attack=function(a,s,raw){this.resolveAttack(a,s,raw);};startPreparedPhase(copy,copy.enemy);copy.tickBurn(copy.enemy);if(!copy.result&&copy.enemy.charge)copy.release(copy.enemy);return copy;}
function select(b,p,path){
 const a=b.enemy,e=b.player,legal=id=>{if(b.legal(a,id))return false;const s=b.skill(a,id);return !(p.id==='heavy'&&a.reaction&&s.cost.metal&&(payment(a.qi,s.cost)?.metal??0)<1);},take=(ids,reason)=>{const id=ids.find(legal);return id?{id,reason}:null;};
 const hit=id=>{const s=b.skill(a,id);if(!s||!legal(id)||!s.power)return 0;return Math.max(0,b.damage(a,s)-e.shield-(e.reaction&&e.qi[CLASSES[e.key].reactionElement]>0?26:0));};
 const attacks=b.skills(a).filter(s=>s.kind==='attack'&&legal(s.id)).toSorted((x,y)=>hit(y.id)-hit(x.id));
 const lethal=attacks.find(s=>hit(s.id)>=e.hp);if(lethal)return {id:lethal.id,reason:'已有可兑现的斩杀机会，直接出招。'};
 if(a.charge)return take([...(a.key==='sword'&&a.shield<22&&a.qi.metal>=2?['guard']:[]),...(a.key==='earth'&&a.shield<22?['rampart']:[]),...(b.distance===1&&a.charge.range.includes(2)?['far']:[]),'meditate'],'蓄势后用剩余行动护体、调整射程或补气。');
 if(e.charge){const counter=take(['lunge',a.key==='sword'?'cut':a.key==='flame'?'scorchcut':'vine'],'对手正在蓄势，先打断。');if(counter)return counter;const escape=['near','far'].find(id=>legal(id)&&!e.charge.range.includes(b.distance+b.skill(a,id).delta));if(escape)return {id:escape,reason:'移动到对手蓄势的射程之外，付出行动化解。'};}
 if(['wood','earth'].includes(a.key)){
  if(a.parasite>=2&&a.ap>=2&&legal('unparasite'))return {id:'unparasite',reason:'先清自身寄生，避免下一次耗气施法侵蚀准备。'};
  if(a.burn>=3&&!path.includes('purify')&&legal('purify'))return {id:'purify',reason:'单独清除高层灼烧，准备收获不能代替净化。'};
  if(e.terrain>=2&&legal(a.key==='wood'?'prune':'quakesunder'))return {id:a.key==='wood'?'prune':'quakesunder',reason:'攻击并削减一层地势，限制对手下一招准备消费。'};
  if(a.key==='wood'){
   if(a.growth&&a.hp<=a.maxHp-24&&legal('bloomheal'))return {id:'bloomheal',reason:'消费生长恢复气血，放弃同一储备的进攻和护盾。'};
   if(a.growth&&a.hp<75&&a.shield<20&&legal('bloomguard'))return {id:'bloomguard',reason:'提前收获生长护体，保命优先于等待成熟。'};
   if(p.id==='parasitic'){
    if(e.parasite>=2&&legal('reap'))return {id:'reap',reason:'寄藤已成长，消费寄生集中进攻，不再保留侵蚀。'};
    if((!e.parasite||e.parasiteTurns<=1)&&legal('parasite'))return {id:'parasite',reason:'付费维护寄藤，等待目标首次耗气施法催长并侵蚀准备。'};
    if(e.parasite>=2&&b.distance===2&&a.ap>=2&&legal('near')&&payment(a.qi,{wood:2}))return {id:'near',reason:'付出接近行动，为噬藤收获争取射程。'};
   }else{
    if(a.growth>=2&&legal('bloomstrike'))return {id:'bloomstrike',reason:'生长已成熟，消费储备以繁花击兑现。'};
    if(a.growth>=2&&b.distance===2&&a.ap>=2&&legal('near')&&payment(a.qi,{wood:2}))return {id:'near',reason:'进入繁花射程，生长不会因移动损失。'};
    if(!a.growthPending&&a.growth<2&&a.ap>=2&&legal('cultivate'))return {id:'cultivate',reason:'培植后保留生长，等待下一次自身阶段成熟，不立刻收尽。'};
   }
   const s=take(['wooddart'],'培育或寄藤等待期间，用低耗青叶矢维持压力。');if(s)return s;
  }else{
   if(b.distance===2&&a.ap>=2&&a.terrain>=2&&payment(a.qi,{earth:2})&&legal('near'))return {id:'near',reason:'付出接近行动与一层地势，进入准备攻击射程。'};
   if(p.id==='mountain'&&a.terrain>=2&&legal('mountain'))return {id:'mountain',reason:'支付两行动和两层地势公开镇岳蓄势；退远或打断仍可化解。'};
   if(a.terrain&&a.hp<90&&a.shield<22&&!path.includes('rampart')&&legal('rampart'))return {id:'rampart',reason:'受压时消费地势护体，留出行动继续反击。'};
   if(a.terrain>=1&&legal('landbreak')&&(p.id==='bastion'||a.terrain<2))return {id:'landbreak',reason:'消费地势以裂地兑现，放弃同份储备的护体或镇岳。'};
   if(a.terrain<(p.id==='mountain'?2:1)&&a.ap>=2&&legal('foundation'))return {id:'foundation',reason:'主动付费筑垒，储备由进攻、防守和稳固共同消费。'};
   if(a.chilled&&!a.anchored&&a.terrain&&a.ap>=2&&legal('anchor'))return {id:'anchor',reason:'消费一层地势稳固，仅抵消一次迫退，不免疫打断。'};
   const s=take(['stonebolt'],'没有合适准备窗口，飞岩直攻保持压力。');if(s)return s;
  }
 }else
 if(a.key==='water'){
  if(a.burn>=2&&legal('rinse'))return {id:'rinse',reason:'用水气净化灼烧，凝滞仍需单独处理。'};
  if(p.id==='cold'&&e.chilled&&b.distance===1&&a.ap>=2&&e.key==='sword'&&legal('repulse'))return {id:'repulse',reason:'消费凝滞迫使对手退远，避开近中距剑招；对方仍可主动接近。'};
  if(p.id==='cold'&&e.chilled&&!a.coldTriggered&&legal('waterbolt'))return {id:'waterbolt',reason:'消费凝滞强化玄水矢，放弃这次逐浪控距机会。'};
  if(p.id==='cold'&&!e.chilled&&!a.coldTriggered&&a.ap>=2&&legal('frost'))return {id:'frost',reason:'凝霜铺垫一次控距或玄水增伤，对方移动与净息仍可消解。'};
  if(a.tide>=1&&legal('surge'))return {id:'surge',reason:'消费潮势集中进攻，这份储备不再用于护体或回潮。'};
  if(a.tide===0&&a.ap>=2&&a.qi.water>=3&&legal('gather'))return {id:'gather',reason:'花行动与水气纳潮，为本阶段进攻或后续防护准备储备。'};
  if(a.tide&&total(a.qi)<3&&a.ap>=2&&legal('ebb'))return {id:'ebb',reason:'消耗潮势补水，保留后续行动出招，不重复使用同一储备。'};
  if(a.hp<80&&a.shield<18&&!path.includes('waterwall')&&a.qi.water>=2&&legal('waterwall'))return {id:'waterwall',reason:'支付水气和可用潮势护体，保留水幕应对余量。'};
  const s=take(['waterbolt','frost'],'以低耗水法施压，控距或调息后仍需进攻兑现。');if(s)return s;
 }else if(a.key==='flame'){
  if(e.burn<3&&legal('kindle'))return {id:'kindle',reason:'附焰维持灼烧，随后仍可保留持续伤害或摘烬。'};
  if(a.fireCasts===1&&legal('eruption'))return {id:'eruption',reason:'第二次付费火法用烈火兑现强化，与御火防守争用火气。'};
  if(e.burn>=3&&legal('cinder'))return {id:'cinder',reason:'消耗两层灼烧集中出伤，保留其余持续压力。'};
  if(!path.includes('firewall')&&a.hp<80&&a.shield<22&&a.qi.fire>=2&&legal('firewall'))return {id:'firewall',reason:'受伤后用一次离火障护体，并留出御火应对火气。'};
  const s=take(['flare','kindle','eruption'],'用付费火法维持压力，观察火气攻守余量。');if(s)return s;
 }else if(a.key==='sword'){
  if(b.distance===2){if(legal('unity')&&a.intent>=3&&p.id==='heavy')return {id:'unity',reason:'远距已有剑意，蓄势逼迫对手应对。'};return take(['near'],'先进入普通剑招射程。');}
  if(p.id==='quick'){
   if(b.distance===1&&a.ap>=2&&a.intent>=2&&legal('near')&&legal('swift')&&!path.includes('near'))return {id:'near',reason:'贴近，为追风剑和后续压制争取窗口。'};
   if(a.intent>=2&&legal('lunge'))return {id:'lunge',reason:'消费剑意近身追击，再以快剑继续养意。'};
   if(a.intent>=3&&legal('strike'))return {id:'strike',reason:'剑意已经积累，及时以断岳兑现。'};
   const s=take(['swift','strike','expose'],'以低耗剑招持续压制。');if(s)return s;
  }else{
   if((a.edge||a.intent>=3)&&legal('strike'))return {id:'strike',reason:a.edge?'用重剑兑现承接攻击获得的藏锋。':'消费已养成的剑意，避免只守不攻。'};
   if(a.edge&&legal('return'))return {id:'return',reason:'以小重剑兑现藏锋，留下部分剑意。'};
   if(a.intent>=3&&b.distance===1&&legal('unity')&&!legal('strike'))return {id:'unity',reason:'剑意与距离适合，开始归一蓄势。'};
   if(!path.includes('guard')&&a.shield<22&&a.qi.metal>=2&&legal('guard')&&(a.intent<2||a.hp<140))return {id:'guard',reason:'护体养意，同时留下横剑应对的灵气。'};
   if(!e.broken&&a.qi.water>0&&a.qi.metal>=2&&a.ap>=2&&legal('expose'))return {id:'expose',reason:'看破对手，为下一招重剑制造破绽。'};
   const s=take(['swift','return','strike'],'已有进攻窗口，出剑而非继续补盾。');if(s)return s;
  }
 }else{
  if(p.id==='sustain'){
   const healed=path.some(id=>['heal','nourish','purify'].includes(id));
   if(!healed&&(a.burn>=2||(a.hp<=a.maxHp-60&&(a.qi.wood>=3||a.hp<=40)))&&legal('heal'))return {id:'heal',reason:a.burn?'回春恢复并清除灼烧，随后继续进攻。':'受伤较重，用一次回春恢复。'};
   if(!healed&&a.hp<=a.maxHp-24&&legal('nourish'))return {id:'nourish',reason:'枯荣恢复与返气，本阶段仍留出进攻机会。'};
  }
  if(p.id==='ignite'&&b.distance===2&&e.seed>=4&&a.ap>=2&&payment(a.qi,{fire:2,any:1})&&legal('near'))return {id:'near',reason:'灵种已有多层，进入焚炎射程集中引爆。'};
  if(p.id==='ignite'&&e.seed===0&&e.burn>=2&&b.distance>=1&&legal('inferno')&&!path.length)return {id:'inferno',reason:'灼烧已有铺垫，离火蓄势寻找爆发。'};
  if(e.seed>=2&&legal('blaze'))return {id:'blaze',reason:'射程合适，引燃已种下的灵种。'};
  if(p.id==='ignite'&&e.seed>=2&&legal('ember')&&(b.distance===2||!legal('blaze')))return {id:'ember',reason:'焚炎暂不可用，先分燃兑现部分灵种。'};
  if(e.seed<2&&a.ap>=2&&a.qi.fire>=2&&legal('seed'))return {id:'seed',reason:'先种灵，保留行动用于后续引燃。'};
  if(p.id==='ignite'&&e.burn>=2&&b.distance>=1&&legal('inferno')&&!path.length)return {id:'inferno',reason:'灼烧已有铺垫，离火蓄势寻找爆发。'};
  if(b.distance===2&&e.seed>=2&&a.ap>=2&&a.qi.fire>=2&&legal('near'))return {id:'near',reason:'进入焚炎射程，让灵种有兑现机会。'};
  const s=take(['spark','ember','blaze'],'以火法持续施压，不把行动全部用于恢复。');if(s)return s;
 }
 if(!a.meditated&&total(a.qi)<4&&a.ap>=2&&legal('meditate'))return {id:'meditate',reason:'灵气不足，调息后再找进攻机会。'};
 return take(['basic'],'缺少合适灵气，以基础攻击保持压力。');
}
export function planOpponent(b,id){if(b.difficulty==='questioning')return planQuestioning(b,id);const p=OPPONENTS[id];if(!p)throw Error('未知论道对手');const copy=preview(b),choices=[];for(let i=0;i<3&&!copy.result&&copy.enemy.ap>0;i++){const choice=select(copy,p,choices.map(c=>c.id));if(!choice||!copy.act(copy.enemy,choice.id).ok)break;choices.push(choice);}return choices;}
export function opponentReactionDecision(b,id,s,raw){
 return Battle.prototype.reactionDecision.call(b,s,raw,{threshold:OPPONENTS[id].reactionThreshold,reserveHeavy:id!=='heavy'});
}
export const opponentReaction=(b,id,s,raw)=>opponentReactionDecision(b,id,s,raw).response;
