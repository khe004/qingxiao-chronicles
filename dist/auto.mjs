import {Battle,CLASSES,COMMON,ELEMENT_NAMES,payment,total} from './engine.mjs';

export const TENDENCIES={
  balanced:{name:'均衡',description:'兼顾连招与生存，及时打断敌方蓄势。',attack:1,health:1.1,shield:.32,intent:5,seed:4,burn:5,broken:7,charge:0},
  aggressive:{name:'强攻',description:'优先即时伤害与击杀，少留灵气，防守较少。',attack:1.5,health:.5,shield:.1,intent:3,seed:3,burn:5,broken:6,charge:-12},
  defensive:{name:'稳守',description:'优先护盾、净化与回春，化解危险后反击。',attack:.85,health:1.8,shield:.8,intent:4,seed:3,burn:4,broken:5,charge:-5},
  burst:{name:'蓄势',description:'积累剑意、灵种与破绽，寻找大招爆发窗口。',attack:1,health:.9,shield:.2,intent:8,seed:5,burn:3,broken:9,charge:28},
};
export const SPEEDS={slow:{name:'从容',delay:1400},normal:{name:'标准',delay:750},fast:{name:'快速',delay:220}};
function copyBattle(b){const {logs,...state}=b;const copy=Object.assign(Object.create(b.opponentId?Object.getPrototypeOf(b):Battle.prototype),JSON.parse(JSON.stringify(state)));copy.logs=[];return copy;}
function incomingDamage(b){const s=b.pending?.s;if(!s)return 0;const physical=(b.enemy.key==='sword'&&s.id!=='expose')||s.id==='basic';const raw=b.pending.raw+(s.id==='inferno'?b.player.burn*8:0);return Math.round(raw*100/(100+CLASSES[b.player.key][physical?'physical':'magical']));}
export function chooseReaction(b,tendency='balanced'){
  if(!TENDENCIES[tendency])throw Error('未知打法倾向');
  if(b.phase!=='reaction'||!b.pending)return null;
  const p=b.player,c=CLASSES[p.key],damage=incomingDamage(b),net=Math.max(0,damage-p.shield);
  if(net===0)return {response:'none',reason:'现有护盾足以抵御，保留应对机会与灵气。'};
  const options=[{response:'none',loss:net,cost:0}];
  if(p.qi[c.reactionElement]>=1)options.push({response:'shield',loss:Math.max(0,damage-Math.min(60,p.shield+26)),cost:1});
  if(payment(p.qi,{any:2}))options.push({response:'evade',loss:Math.max(0,Math.round(damage*.5)-p.shield),cost:2});
  if(net>=p.hp){const best=options.reduce((a,x)=>x.loss<a.loss?x:a);return {...best,reason:best.response==='none'?'灵气不足，无法化解这一击。':'这一击可能致命，优先降低伤害。'};}
  const upcoming=(b.enemyQueue||[]).map(id=>b.skill(b.enemy,id)).filter(s=>s?.power&&s.range?.includes(b.distance)).map(s=>Math.round(b.raw(b.enemy,s)*100/(100+CLASSES[p.key][(b.enemy.key==='sword'&&s.id!=='expose')||s.id==='basic'?'physical':'magical'])));
  const larger=Math.max(0,...upcoming);
  if(net<=14&&larger>damage+12&&p.hp>net+larger)return {response:'none',reason:'这一击较轻，预留应对处理后续重招。'};
  const threshold={balanced:15,aggressive:30,defensive:1,burst:20}[tendency];
  if(net<threshold)return {response:'none',reason:tendency==='aggressive'?'承受轻伤，留下灵气继续强攻。':'当前伤害可承受，保留应对与后续施法资源。'};
  const best=options.reduce((a,x)=>(net-x.loss)*TENDENCIES[tendency].health-x.cost*3>(net-a.loss)*TENDENCIES[tendency].health-a.cost*3?x:a);
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
    if(s.kind==='heal'&&p.hp===p.maxHp&&!p.burn)return false;
    if(s.id==='purify'&&!p.burn)return false;
    if(s.kind==='guard'&&p.shield>=44&&p.intent>=5)return false;
    // 蓄势护体不能吃掉最后一份应对灵气，避免只能闪身后丢失出剑距离。
    if(p.charge&&s.kind==='guard'&&p.reaction){const k=CLASSES[p.key].reactionElement;if((payment(p.qi,s.cost)?.[k]??0)<1)return false;}
    if(s.interrupt&&s.id!=='lunge'&&!e.charge)return false;
    if(s.id==='meditate'&&total(p.qi)>=6)return false;
    if(s.id==='near'&&b.distance===1&&!e.charge&&!p.skillIds.includes('lunge'))return false;
    if(s.id==='far'&&b.distance===1&&p.key==='sword'&&!e.charge&&!p.charge)return false;
    return true;
  });
}
function planScore(start,leaf,tendency,path){
  const t=TENDENCIES[tendency],future=projectEnemyPhase(leaf,tendency);
  if(leaf.result==='win')return 100000-path.length;
  if(future.result==='win')return 90000-path.length;
  if(future.result==='lose')return -100000+future.enemy.hp*-1;
  const pressure=Math.max(0,start.round-8)*.07;
  let score=(start.enemy.hp-future.enemy.hp)*(t.attack+pressure)+(future.player.hp-start.player.hp)*t.health;
  score+=(future.player.shield-start.player.shield)*t.shield;
  score+=(future.player.intent-start.player.intent)*t.intent;
  score+=(Number(future.player.edge)-Number(start.player.edge))*8;
  score+=(future.enemy.seed-start.enemy.seed)*t.seed;
  score+=(future.enemy.burn-start.enemy.burn)*t.burn;
  score+=(Number(future.enemy.broken)-Number(start.enemy.broken))*t.broken;
  score+=(total(future.player.qi)-total(start.player.qi))*.35;
  if(leaf.player.charge)score+=t.charge;
  // 相近收益时优先完成有用动作，避免重复调息或原地等待。
  score-=path.length*.2;
  return score;
}
function reasonFor(b,id){
  const p=b.player,e=b.enemy;
  switch(id){
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
    case 'near':return e.charge&&b.distance===1?'贴近敌人，脱离其蓄势技能的适用距离。':b.distance===1?'接近到近身，为追风剑创造有效距离。':'接近到中距，让剑招与打断技能可以出手。';
    case 'far':return p.charge?'蓄势后拉到远距，增加敌人贴近化解或打断所需的行动。':'拉开距离，避开近中距剑招或准备远距斗法。';
    case 'meditate':return p.charge?'利用蓄势后的剩余行动补气，预留应对与下一回合的施法资源。':'调息补足灵气，为后续神通或大招准备费用。';
    case 'purify':return `净息清除 ${p.burn} 层灼烧，避免持续损血。`;
    default:return '用基础攻击补充伤害，不额外消耗灵气。';
  }
}
export function chooseAction(b,tendency='balanced'){
  if(!TENDENCIES[tendency])throw Error('未知打法倾向');
  if(b.phase!=='player'||b.result)return null;
  if(b.player.ap===0)return {action:'end',reason:'行动点已用尽，保留剩余灵气进入敌方行动。'};
  let best={score:-Infinity,path:[]};
  function search(state,path){
    const score=planScore(b,state,tendency,path);if(score>best.score)best={score,path};
    if(state.result||state.player.ap===0||path.length>=3)return;
    for(const s of options(state,tendency)){const next=copyBattle(state);const applied=next.act(next.player,s.id);if(applied.ok)search(next,[...path,s.id]);}
  }
  search(copyBattle(b),[]);
  const id=best.path[0];
  if(!id)return {action:'end',reason:b.player.charge?'蓄势后继续移动、调息或防守收益较低，保留资源等待释放。':'当前继续施法收益较低，保留灵气与应对资源。'};
  return {action:'skill',skillId:id,reason:reasonFor(b,id)};
}
export function describeAutoChoice(b,choice,tendency){
  const label=TENDENCIES[tendency].name;
  if(choice.action==='end')return `【自动·${label}】结束行动：${choice.reason}`;
  const s=b.skill(b.player,choice.skillId);
  const cost=Object.entries(s.cost).map(([k,n])=>`${n}${k==='any'?'任意':ELEMENT_NAMES[k]}`).join('＋')||'无需灵气';
  return `【自动·${label}】选择「${s.name}」：${choice.reason}（${s.ap}行动；${cost}${s.intentCost?`；${s.intentCost}剑意`:''}）`;
}
