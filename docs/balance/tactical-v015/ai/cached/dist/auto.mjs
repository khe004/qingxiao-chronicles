import {Battle,CLASSES,burnBonus,COMMON,ELEMENT_NAMES,payment,total,RULES} from './engine.mjs';
import {activePlayerChoice} from './active-policy.mjs';

export const TENDENCIES={
  balanced:{name:'均衡',description:'兼顾连招与生存，及时打断敌方蓄势。',attack:1,health:1.1,shield:.32,intent:5,seed:4,burn:5,broken:7,charge:0},
  aggressive:{name:'强攻',description:'优先即时伤害与击杀，少留灵气，防守较少。',attack:1.5,health:.5,shield:.1,intent:3,seed:3,burn:5,broken:6,charge:-12},
  defensive:{name:'稳守',description:'优先护盾、净化与回春，化解危险后反击。',attack:.85,health:1.8,shield:.8,intent:4,seed:3,burn:4,broken:5,charge:-5},
  burst:{name:'蓄势',description:'积累剑意、灵种与破绽，寻找大招爆发窗口。',attack:1,health:.9,shield:.2,intent:8,seed:5,burn:3,broken:9,charge:28},
};
export const SPEEDS={slow:{name:'从容',delay:1400},normal:{name:'标准',delay:750},fast:{name:'快速',delay:220}};
function copyBattle(b){const {logs,events,...state}=b;const copy=Object.assign(Object.create(b.opponentId||b.customDuel?Object.getPrototypeOf(b):Battle.prototype),JSON.parse(JSON.stringify(state)));copy.logs=[];if(events)copy.events=[];return copy;}
function incomingDamage(b){const s=b.pending?.s;if(!s)return 0;return b.damage(b.enemy,s,b.pending.raw,1,b.player);}
export function chooseReaction(b,tendency='balanced'){
  if(!TENDENCIES[tendency])throw Error('未知打法倾向');
  if(b.phase!=='reaction'||!b.pending)return null;
  const p=b.player,c=CLASSES[p.key],damage=incomingDamage(b),net=b.healthDamage(damage,p.shield,b.pending.s);
  if(b.canAnchor(p,b.pending.s)&&net<p.hp&&(p.charge&&!p.charge.range.includes(Math.min(2,b.distance+1))||b.distance===1&&p.terrain>=2))return {response:'anchor',reason:'付费稳固保住阵地与有效距离，承受这次水伤。'};
  if(net===0)return {response:'none',reason:'现有护盾足以抵御，保留应对机会与灵气。'};
  const options=[{response:'none',loss:net,cost:0}];
  if(p.qi[c.reactionElement]>=1)options.push({response:'shield',loss:b.healthDamage(damage,Math.min(60,p.shield+26),b.pending.s),cost:1});
  if(payment(p.qi,{any:2}))options.push({response:'evade',loss:b.healthDamage(b.damage(b.enemy,b.pending.s,b.pending.raw,.5,p),p.shield,b.pending.s),cost:2,avoided:b.evadeAvoidance(b.enemy,b.pending.s)*.6});
  if(net>=p.hp){const best=options.reduce((a,x)=>x.loss<a.loss?x:a);return {...best,reason:best.response==='none'?'灵气不足，无法化解这一击。':'这一击可能致命，优先降低伤害。'};}
  const upcoming=(b.enemyQueue||[]).map(id=>b.skill(b.enemy,id)).filter(s=>s?.power&&s.range?.includes(b.distance)).map(s=>b.damage(b.enemy,s,b.raw(b.enemy,s),1,p));
  const larger=Math.max(0,...upcoming);
  if(net<=14&&larger>damage+12&&p.hp>net+larger)return {response:'none',reason:'这一击较轻，预留应对处理后续重招。'};
  const threshold={balanced:15,aggressive:30,defensive:1,burst:20}[tendency];
  if(net<threshold&&!options.some(o=>o.avoided>0))return {response:'none',reason:tendency==='aggressive'?'承受轻伤，留下灵气继续强攻。':'当前伤害可承受，保留应对与后续施法资源。'};
  const best=options.reduce((a,x)=>(net-x.loss+(x.avoided||0))*TENDENCIES[tendency].health-x.cost*3>(net-a.loss+(a.avoided||0))*TENDENCIES[tendency].health-a.cost*3?x:a);
  return {...best,reason:best.response==='shield'?`以${c.reaction}减轻伤害，保留当前距离。`:best.response==='evade'?'闪身减伤，并拉开距离避开后续剑招。':'保留灵气，承受此招。'};
}
function projectEnemyPhase(b,tendency){
  const next=copyBattle(b);if(next.result)return next;if(next.opponentId)next.forecastOnly=true;
  next.endTurn();
  for(let steps=0;steps<12&&!next.result&&next.phase!=='player';steps++){
    if(next.phase==='reaction'){const choice=chooseReaction(next,tendency);next.react(choice.response);}else if(next.phase==='enemy')next.enemyStep();else break;
  }
  return next;
}
function options(b,tendency){
  const p=b.player,e=b.enemy;
  return [...b.skills(p),...COMMON].filter(s=>{
    if(b.legal(p,s.id))return false;
    if(s.id==='seed'&&e.seed>=5)return false;
    if(s.id==='expose'&&e.broken)return false;
    if(s.kind==='heal'&&p.hp===p.maxHp&&(!p.burn||s.clearBurn===0))return false;
    if(s.id==='purify'&&!p.burn)return false;
    if(s.id==='parasite'&&e.parasite>=3&&e.parasiteTurns>1)return false;
    if(s.breakPrep&&!s.power&&!e.growth&&!e.terrain)return false;
    if(s.chill&&e.chilled)return false;
    if(s.kind==='ebb'&&total(p.qi)>=8)return false;
    if(s.kind==='guard'&&p.shield>=44&&(p.key!=='sword'||p.intent>=5))return false;
    // 蓄势护体不能吃掉最后一份应对灵气，避免只能闪身后丢失出剑距离。
    if(p.charge&&s.kind==='guard'&&p.reaction){const k=CLASSES[p.key].reactionElement;if((payment(p.qi,s.cost)?.[k]??0)<1)return false;}
    if(s.interrupt&&s.id!=='lunge'&&!e.charge)return false;
    if(s.id==='meditate'&&total(p.qi)>=6)return false;
    if(s.id==='near'&&b.distance===1&&!e.charge&&!b.skills(p).some(x=>x.range?.includes(0)&&!x.range.includes(1))&&!(p.charge?.range.includes(0)&&!p.charge.range.includes(2)))return false;
    if(s.id==='far'&&b.distance===1&&p.key==='sword'&&!e.charge&&!p.charge)return false;
    return true;
  });
}
function planScore(start,leaf,tendency,path,future=projectEnemyPhase(leaf,tendency)){
  const t=TENDENCIES[tendency];
  if(leaf.result==='win')return 100000-path.length;
  if(future.result==='win')return 90000-path.length;
  if(future.result==='lose')return -100000+future.enemy.hp*-1;
  const pressure=Math.max(0,start.round-8)*.07;
  let score=(start.enemy.hp-future.enemy.hp)*(t.attack+pressure)+(future.player.hp-start.player.hp)*t.health;
  score+=(future.player.shield-start.player.shield)*t.shield;
  score+=(start.enemy.shield-future.enemy.shield)*t.shield;
  score+=(future.player.intent-start.player.intent)*t.intent;
  score+=(Number(future.player.edge)-Number(start.player.edge))*8;
  score+=(future.enemy.seed-start.enemy.seed)*t.seed;
  score+=RULES.burnScore?((a,b)=>b.damage(b.other(a),{id:'burn',element:'fire',damageType:'magical'},a.burn*RULES.burnLayer,1,a)*a.burnTurns)(future.enemy,future)*t.burn/5-((a,b)=>b.damage(b.other(a),{id:'burn',element:'fire',damageType:'magical'},a.burn*RULES.burnLayer,1,a)*a.burnTurns)(start.enemy,start)*t.burn/5:(future.enemy.burn-start.enemy.burn)*t.burn;
  score+=(Number(future.enemy.broken)-Number(start.enemy.broken))*t.broken;
  score+=((future.player.tide??0)-(start.player.tide??0))*(tendency==='defensive'?5:3);
  score+=((future.player.growth??0)-(start.player.growth??0))*5;
  score+=((future.player.terrain??0)-(start.player.terrain??0))*4;
  score+=((future.enemy.parasite??0)-(start.enemy.parasite??0))*3;
  score-=((future.enemy.growth??0)-(start.enemy.growth??0))*3;
  score-=((future.enemy.terrain??0)-(start.enemy.terrain??0))*3;
  score-=((future.player.parasite??0)-(start.player.parasite??0))*4;
  score+=(Number(future.player.anchored??false)-Number(start.player.anchored??false))*2;
  score+=(total(future.player.qi)-total(start.player.qi))*.35;
  if(leaf.player.charge)score+=t.charge;
  // 相近收益时优先完成有用动作，避免重复调息或原地等待。
  score-=path.length*.2;
  return score;
}
function reasonFor(b,id){
  const p=b.player,e=b.enemy;
  const selected=b.skill(p,id);if(selected&&['channel','sacrifice','intent'].includes(selected.kind))return selected.desc;if(selected?.reflect)return '付费准备有限反击，直接攻击可触发，持续伤害不触发；对手可试探或等待到期。';if(selected?.consumeSeed)return '按当前灵种储备选择进攻、恢复或换气，同一份积累不能重复兑现。';if(selected?.consumeChill)return '消费一次凝滞强化攻击，放弃同一凝滞的控距机会。';if(selected?.id==='graft')return '多付木气换取即时生长，提前收获仍会放弃尚未成熟的旧准备。';if(selected?.shieldPierce)return '支付额外费用或准备，部分伤害越过护盾，仍受对应防御与五行减免。';
  switch(id){
    case 'cultivate':return '付费培植，保留到下次自身阶段成熟；本阶段提前收获会放弃后续成熟。';
    case 'bloomstrike':case 'bloomguard':case 'bloomheal':return `消费 ${p.growth} 生长，选择一个收获出口，不同时进攻、回血与护盾。`;
    case 'parasite':return '付费附着或维护寄生，让目标耗气施法时侵蚀准备；目标仍能选择单独净化。';
    case 'reap':return `消费 ${e.parasite} 寄生转为攻击，放弃后续侵蚀。`;
    case 'foundation':return '投入土气与行动建立有限地势，后续攻击、防守与稳固共用储备。';
    case 'landbreak':case 'rampart':return `消费至多 ${Math.min(p.terrain,2)} 地势兑现，不再保留这份准备。`;
    case 'mountain':return '支付两行动、灵气与地势，准备近中距镇岳；对手可退远或打断。';
    case 'anchor':return '消费地势准备一次稳固，只抵消被迫迁移，不免打断、侵蚀或伤害。';
    case 'unparasite':return '付费净息只清除寄生，保留其他异常状态。';
    case 'sever-growth':case 'sever-terrain':return '付费破除一类准备，不额外伤害或取消蓄势。';
    case 'prune':case 'quakesunder':return '攻击并削减一类敌方准备，地势优先，否则处理生长。';
    case 'wooddart':case 'stonebolt':return '以本系低耗全距术法直接施压，不依靠准备。';
    case 'earthenwall':return '支付土气护体，不消耗地势；进攻与应对仍争用土气。';
    case 'waterbolt':return p.major==='cold'&&e.chilled&&!p.coldTriggered?'消费凝滞强化玄水矢，放弃这次逐浪控距机会。':'以低耗玄水矢直接施压，留水气用于护体或周转。';
    case 'frost':return '凝霜铺垫一次控距或玄水增伤；对手移动与净息仍可消解。';
    case 'repulse':return '消费凝滞迫使目标退开一档，限制后续射程；不取消蓄势，对手仍可接近。';
    case 'gather':return `投入行动与水气积累 ${p.major==='tidal'?3:2} 潮势，后续攻击、防护与回潮共用储备。`;
    case 'surge':return `消费 ${Math.min(2,p.tide)} 潮势集中进攻，不再保留这份储备用于防护或补水。`;
    case 'waterwall':return `支付水气护体${p.tide?'并消费一层潮势增强护盾':''}，与沧澜和回潮争用储备。`;
    case 'rinse':return '支付水气恢复气血、清除灼烧；凝滞仍需单独净息。';
    case 'ebb':return `消费 ${Math.min(2,p.tide)} 潮势补水，占用一次行动，不能再兑现同一储备。`;
    case 'dispel':return '付费净息只清除凝滞，保留当前距离；灼烧需要另行处理。';
    case 'flare':return p.major==='fierce'&&p.fireCasts===1?'第二次付费火法兑现烈焰强化，继续进攻会减少御火余量。':'以低耗炎矢直接施压，保留火气用于强招或护体。';
    case 'kindle':return `附着灼烧并刷新期限${p.major==='smolder'&&!p.smolderTriggered?'，兑现本回合首次附焰的额外一层':''}；也可保留持续伤害。`;
    case 'eruption':return `在有效射程内用烈火集中输出${p.major==='fierce'&&p.fireCasts===1?'，兑现第二次施法强化':''}，付费后防守火气减少。`;
    case 'cinder':return `消费 ${Math.min(2,e.burn)} 层灼烧立即出伤，保留 ${Math.max(0,e.burn-2)} 层及其剩余期限。`;
    case 'combust':return `消耗全部 ${e.burn} 层灼烧集中兑现，放弃这些层数的后续持续伤害。`;
    case 'firewall':return '支付火气主动护体，护盾跨回合保留；这些火气也能用于进攻或御火应对。';
    case 'scorchcut':return `支付火气与任意灵气，打断敌方「${e.charge?.name}」。`;
    case 'solar':return `先支付两行动与灵气准备赤日；释放时按届时灼烧兑现，仍可能被净化、打断或近身化解。`;
    case 'seed':return `先种下灵种，为焚炎术准备增伤${!p.woodTriggered?'，同时触发生息凝火':''}。`;
    case 'blaze':return e.seed?`引燃 ${e.seed} 层灵种，将铺垫转为爆发伤害。`:'直接以火法输出并叠加灼烧。';
    case 'ember':return `分燃 ${Math.min(2,e.seed)} 层灵种，保留剩余铺垫，用较少火灵气兑现伤害。`;
    case 'nourish':return '枯荣转生恢复气血、减轻灼烧，同时凝聚通灵。';
    case 'lunge':return `消耗 2 剑意近身追击${e.charge?'并打断敌方蓄势':''}，命中后重新养意。`;
    case 'return':return `消耗 ${Math.min(2,p.intent)} 剑意小幅爆发，保留剩余剑意${p.edge?'并兑现藏锋强化':''}。`;
    case 'spark':return '以低耗火法输出，叠加灼烧施压。';
    case 'heal':return `当前气血 ${p.hp}/${p.maxHp}，回春恢复${p.burn?'并清除灼烧':''}。`;
    case 'vine':case 'cut':return `打断敌方「${e.charge?.name}」，阻止蓄势大招释放。`;
    case 'inferno':return `开始离火蓄势，准备${e.burn?`引爆 ${e.burn} 层灼烧`:'下回合重击'}。`;
    case 'expose':return '先识破破绽，让后续重剑获得 25% 增伤。';
    case 'swift':return `快剑输出，积累剑意（当前 ${p.intent} 层）。`;
    case 'strike':return `消耗 ${p.intent} 层剑意${e.broken?'并利用破绽':''}，以断岳兑现爆发。`;
    case 'guard':return p.charge?'蓄势后以藏锋护体，积累的剑意留给后续招式，不追加本次大招伤害。':'藏锋护体，同时积累剑意，为下一轮反击准备。';
    case 'unity':return `以 ${p.intent} 层剑意${e.broken?'与破绽':''}蓄势，准备万剑归一。`;
    case 'near':return p.charge?.id==='mountain'?'镇岳蓄势后主动贴近，比较被逐浪迫退后是否仍能在近中距释放。':e.charge&&b.distance===1?'贴近敌人，脱离其蓄势技能的适用距离。':b.distance===1?'接近到近身，为追风剑创造有效距离。':'接近到中距，让剑招与打断技能可以出手。';
    case 'far':return e.charge?.range?.includes(b.distance)&&!e.charge.range.includes(Math.min(2,b.distance+1))?'退到敌方蓄势射程之外，化解已公开的大招。':p.charge?(p.charge.id==='mountain'?'为生存换距，可能放弃本次镇岳的近中距释放。':'蓄势后拉到远距，增加敌人贴近化解或打断所需的行动。'):'拉开距离，避开近中距剑招或准备远距斗法。';
    case 'meditate':return p.charge?'利用蓄势后的剩余行动补气，预留应对与下一回合的施法资源。':'调息补足灵气，为后续神通或大招准备费用。';
    case 'purify':return `净息清除 ${p.burn} 层灼烧，避免持续损血。`;
    default:return '用基础攻击补充伤害，不额外消耗灵气。';
  }
}
// Only prepared matchups use the extra horizon. Each forecast executes the
// public queue with real costs/reactions; future actions are tried, never added
// to the live queue. The offline arena can supply equally bounded real clones.
export const PREPARED_SEARCH_BUDGET={rootStates:768,candidates:12,continuationWidth:6,continuationFinals:3,discount:.75};
function preparedMatch(b){return ['wood','earth'].includes(b.player.key)||['wood','earth'].includes(b.enemy.key);}
function preparedStateKey(b){return JSON.stringify([b.round,b.phase,b.distance,b.player,b.enemy,b.enemyQueue,b.enemyPlan,b.result,b.pending]);}
function preparedScore(start,leaf,tendency,path,future){
  const score=planScore(start,leaf,tendency,path,future);
  if(leaf.result||future.result)return score;
  // Net shield removal matters for preparation/erosion, including replenishment
  // in the forecast. This never rewards merely touching a replenished shield.
  return score;
}
function shortlistPrepared(candidates,limit){
  const ranked=[...candidates].sort((a,b)=>b.score-a.score),chosen=[];
  const add=c=>{if(c&&!chosen.includes(c)&&chosen.length<limit)chosen.push(c);};
  add(ranked[0]);add(candidates.find(c=>c.path.length===0));
  for(const test of [
    c=>Boolean(c.leaf.player.charge&&c.leaf.player.anchored),
    c=>Boolean(c.leaf.player.charge)&&c.path.some(id=>id==='near'||id==='far'),
    c=>Boolean(c.leaf.player.charge),
    c=>Boolean(c.leaf.player.growthPending),
    c=>c.path.includes('parasite')&&c.leaf.enemy.parasite>0,
    c=>c.path.includes('foundation')&&c.leaf.player.terrain>0,
    c=>c.path.includes('anchor')&&c.leaf.player.anchored,
    c=>c.path.includes('unparasite'),
    c=>c.path.some(id=>id==='sever-growth'||id==='sever-terrain'||id==='prune'||id==='quakesunder'),
    c=>c.path.some(id=>id==='near'||id==='far'),
    c=>c.path.some(id=>id==='bloomheal'||id==='bloomguard'||id==='rampart'),
  ])add(ranked.find(test));
  for(const c of ranked)add(c);
  return chosen;
}
export function choosePreparedAction(b,tendency='balanced',{clone=copyBattle,project=s=>projectEnemyPhase(s,tendency),stats={}}={}){
  if(!TENDENCIES[tendency])throw Error('未知打法倾向');
  if(b.phase!=='player'||b.result)return null;
  if(!b.player.ap)return {action:'end',reason:'行动点已用尽，保留剩余灵气进入敌方行动。'};
  const budget=PREPARED_SEARCH_BUDGET,seen=new Set(),candidates=[],forecasts=new Map(),continuations=new Map();
  Object.assign(stats,{rootStates:0,candidates:0,continuationStates:0,forecasts:0,continuationCacheHits:0,rootTruncated:false});
  if(stats.trace){stats.plans=[];stats.lastFollow=[];}
  const forecast=s=>{const key=preparedStateKey(s);if(!forecasts.has(key)){forecasts.set(key,project(s));stats.forecasts++;}return forecasts.get(key);};
  function candidate(start,leaf,path){return {leaf,path,score:preparedScore(start,leaf,tendency,path,leaf)};}
  let frontier=[candidate(b,clone(b),[])];
  for(let depth=0;depth<=3&&frontier.length;depth++){
    const next=[];
    for(const c of frontier){
      const key=preparedStateKey(c.leaf);if(seen.has(key))continue;
      if(seen.size===budget.rootStates){stats.rootTruncated=true;break;}
      seen.add(key);candidates.push(c);
      if(depth===3||c.leaf.result||!c.leaf.player.ap)continue;
      for(const s of options(c.leaf,tendency)){const leaf=clone(c.leaf);if(leaf.act(leaf.player,s.id).ok)next.push(candidate(b,leaf,[...c.path,s.id]));}
    }
    if(stats.rootTruncated)break;frontier=next;
  }
  stats.rootStates=seen.size;
  const selected=shortlistPrepared(candidates,budget.candidates);stats.candidates=selected.length;
  function continuation(start){
    // Different root orders can reach the same next phase. Reuse only within
    // this decision, with the same complete combat key as the forecast cache.
    const key=preparedStateKey(start),cached=continuations.get(key);
    if(cached){stats.continuationCacheHits++;if(stats.trace)stats.lastFollow=cached.path;return cached.score;}
    const followSeen=new Set(),leaves=[candidate(start,clone(start),[])];let beam=[leaves[0]];
    for(let depth=0;depth<3&&beam.length;depth++){
      const next=[];
      for(const c of beam){
        if(c.leaf.result||!c.leaf.player.ap)continue;
        for(const s of options(c.leaf,tendency)){
          const leaf=clone(c.leaf);if(!leaf.act(leaf.player,s.id).ok)continue;
          const key=preparedStateKey(leaf);if(followSeen.has(key))continue;
          followSeen.add(key);next.push(candidate(start,leaf,[...c.path,s.id]));
        }
      }
      stats.continuationStates+=next.length;leaves.push(...next);
      beam=shortlistPrepared(next,budget.continuationWidth);
    }
    let best=-Infinity,bestPath=[];
    for(const c of shortlistPrepared(leaves,budget.continuationFinals)){
      const future=c.leaf.result?c.leaf:forecast(c.leaf);
      const score=preparedScore(start,c.leaf,tendency,c.path,future);if(score>best){best=score;bestPath=c.path;}
    }
    continuations.set(key,{score:best,path:bestPath});
    if(stats.trace)stats.lastFollow=bestPath;
    return best;
  }
  let best={score:-Infinity,path:[]};
  for(const c of selected){
    const future=c.leaf.result?c.leaf:forecast(c.leaf);
    let score=preparedScore(b,c.leaf,tendency,c.path,future);
    const follow=future.result?0:continuation(future);
    if(!future.result)score+=budget.discount*follow;
    if(stats.trace)stats.plans.push({path:c.path,firstScore:score-budget.discount*follow,follow,followPath:future.result?[]:stats.lastFollow,score,future:{hp:[future.player.hp,future.enemy.hp],shield:[future.player.shield,future.enemy.shield],growth:future.player.growth,parasite:future.enemy.parasite,terrain:future.player.terrain}});
    if(score>best.score)best={score,path:c.path};
  }
  const id=best.path[0];
  if(!id)return activePlayerChoice(b);
  return {action:'skill',skillId:id,reason:reasonFor(b,id)+' 已比较下次自身行动的兑现，以及随后敌方公开招式。'};
}
export function chooseAction(b,tendency='balanced'){
  if(!TENDENCIES[tendency])throw Error('未知打法倾向');
  if(b.phase!=='player'||b.result)return null;
  if(b.player.ap===0)return {action:'end',reason:'行动点已用尽，保留剩余灵气进入敌方行动。'};
  if(preparedMatch(b))return choosePreparedAction(b,tendency);
  let best={score:-Infinity,path:[]};
  function search(state,path){
    const score=planScore(b,state,tendency,path);if(score>best.score)best={score,path};
    if(state.result||state.player.ap===0||path.length>=3)return;
    for(const s of options(state,tendency)){const next=copyBattle(state);const applied=next.act(next.player,s.id);if(applied.ok)search(next,[...path,s.id]);}
  }
  search(copyBattle(b),[]);
  const id=best.path[0];
  if(!id)return activePlayerChoice(b);
  return {action:'skill',skillId:id,reason:reasonFor(b,id)};
}
export function describeAutoChoice(b,choice,tendency){
  const label=TENDENCIES[tendency].name;
  if(choice.action==='end'){b.playerWaitReason=choice.reason;return `【自动·${label}】结束行动：${choice.reason}`;}
  const s=b.skill(b.player,choice.skillId);
  const cost=Object.entries(s.cost).map(([k,n])=>`${n}${k==='any'?'任意':ELEMENT_NAMES[k]}`).join('＋')||'无需灵气';
  return `【自动·${label}】选择「${s.name}」：${choice.reason}（${s.ap}行动；${cost}${s.intentCost?`；${s.intentCost}剑意`:''}）`;
}
