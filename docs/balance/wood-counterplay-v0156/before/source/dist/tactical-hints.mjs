import {CLASSES,payment} from './engine.mjs';

const pairs={
 fire:[['seed','blaze'],['seed','seedburst']],
 sword:[['expose','strike'],['swift','lunge'],['temper','pierce']],
 flame:[['kindle','firestorm'],['kindle','combust'],['kindle','cinder']],
 water:[['frost','icebreaker'],['gather','tidespear'],['frost','repulse'],['gather','surge']],
 wood:[['graft','bloomstrike'],['graft','bloomheal']],
 earth:[['foundation','landbreak'],['foundation','mountain'],['gravel','faultline']],
};
const shared={fire:'灵种用于进攻、恢复或换气后，不能重复消费。',sword:'重剑会消费剑意；留意剩余剑意是否足够追风。',flame:'兑现会消费灼烧；剩余层数才继续造成持续伤害。',water:'攻击、防护与回潮共用潮势；凝滞也只能兑现一次。',wood:'攻击、恢复与护幕共用生长；培植和接枝共用本回合一次培育。',earth:'裂地、护体与稳固共用地势；自己移动会损失1地势。'};
const names={metal:'金',wood:'木',water:'水',fire:'火',earth:'土'};
function lessonCopy(b){const {logs,events,stats,...state}=b;return Object.assign(Object.create(Object.getPrototypeOf(b)),JSON.parse(JSON.stringify(state)),{logs:[],events:[]});}

// Read-only lessons. Two-step legality uses an isolated copy of this exact
// battle, including the opponent's actual reaction policy.
export function tacticalHints(b){
 const p=b.player,e=b.enemy,hints=[];
 const add=(id,title,text,skillIds=[])=>hints.push({id,title,text,skillIds});
 if(b.result){add('over','复盘这一场','打开「本场打法回顾」，对照恢复、准备消费与蓄势是否兑现；换招后再战一次。');return hints;}
 if(b.phase==='reaction'){
  const s=b.pending?.s,k=CLASSES[p.key].reactionElement;
  if(s){
   const options=[];
   if(p.reaction&&p.qi[k]>=1)options.push(`护盾花1${names[k]}气，保持距离`);
   if(p.reaction&&payment(p.qi,{any:2}))options.push('闪身花2任意灵气，减伤并尝试拉开一档');
   if(b.canAnchor(p,s))options.push('稳固花1土气和1地势，抵消位移但不减伤');
   add('reaction','应对只有一次',options.length?`${options.join('；')}。这次使用后，本回合不能再应对下一招。`:'本次没有可支付的应对；观察后续主招，下回合提前留气。');
  }
  return hints;
 }
 if(b.phase!=='player'){add('observe','观察公开主招','对手正在行动。主招失效时仍可按备用策略接近、调息或换已装备招式。');return hints;}
 if(p.ap===0){add('spent','行动已用尽','结束回合后剩余灵气保留到下回合；应对也从这份灵气中支付。');return hints;}
 if(e.charge){
  const cuts=b.skills(p).filter(s=>s.interrupt&&!b.legal(p,s.id));
  const moves=['near','far'].filter(id=>!b.legal(p,id)&&!e.charge.range.includes(b.distance+b.skill(p,id).delta));
  add('charge','处理敌方蓄势',`${cuts.length?`现在可用${cuts.map(s=>`「${s.name}」`).join('、')}打断。`:'当前没有可直接施展的打断招。'}${moves.length?`「${b.skill(p,moves[0]).name}」可让其当前蓄势超距。`:'移动未必一步就能让其超距。'}对手之后仍可能调整距离。`,[...cuts.map(s=>s.id),...moves]);
 }
 if(p.charge){add('charging','蓄势后仍可行动','剩余行动可移动、调息或施展护体；普通攻击、净化和回血暂不可用。释放时还会检查距离。');return hints;}
 if(p.parasite&&!b.legal(p,'unparasite'))add('parasite','净寄生也占行动',`「净息·寄生」花1行动和1任意灵气，不回血。保留寄生时，本阶段首次主动耗气施法可能使它成长并侵蚀；反制与进攻需要取舍。`,['unparasite']);
 if(p.burn&&!b.legal(p,'purify'))add('burn','清烧与回血的取舍',`「净息」花1行动和1任意灵气，清尽当前${p.burn}层灼烧，最多恢复${Math.min(b.skill(p,'purify').heal,p.maxHp-p.hp)}气血；新附加的灼烧仍需再次处理。`,['purify']);
 if(e.growth&&!b.legal(p,'sever-growth'))add('growth','破除不等于打断',`「破除·生长」削减至多${Math.min(e.growth,b.skill(p,'sever-growth').amount)}生长，花1行动和1任意灵气，不伤气血。${e.growthPending?'部分破除仍可能留下待成熟；只有全部破除才取消成熟。':'对手以后仍可付费重新培育。'}`,['sever-growth']);
 const blocked=b.skills(p).filter(s=>s.kind==='attack'&&b.legal(p,s.id)==='距离不适合');
 for(const id of ['near','far']){
  if(!blocked.length||b.legal(p,id))continue;
  const c=lessonCopy(b);
  c.act(c.player,id);
  const ready=blocked.filter(s=>!c.legal(c.player,s.id));
  if(ready.length){add('range','移动后还能出招',`「${b.skill(p,id).name}」花1行动；按当前灵气和准备，移动后还能施展「${ready[0].name}」。追击会占用原本可防守或净化的行动。`,[id,ready[0].id]);break;}
 }
 for(const [first,second] of pairs[p.key]??[]){
  if(b.legal(p,first))continue;
  const c=lessonCopy(b);
  if(!c.act(c.player,first).ok||c.result||c.legal(c.player,second))continue;
  const a=b.skill(p,first),z=b.skill(p,second);
  add('combo','当前可接的两招',`「${a.name}」→「${z.name}」此刻可接，共${a.ap+z.ap}行动。${shared[p.key]}若先花行动净化或移动，需要重新核对。`,[first,second]);break;
 }
 const outlets=b.skills(p).filter(s=>!b.legal(p,s.id)&&((s.consumeSeed&&e.seed)||(s.consumeBurn&&e.burn)||(s.consumeTide&&p.tide)||(s.consumeGrowth&&p.growth)||(s.consumeParasite&&e.parasite)||(s.consumeTerrain&&p.terrain)||(s.finisher&&p.intent)||(s.consumeChill&&e.chilled)));
 if(outlets.length)add('outlet','当前准备有这些出口',`${outlets.slice(0,3).map(s=>`「${s.name}」`).join('、')}现在满足施展条件。${shared[p.key]}各招仍按卡片支付行动和灵气。`,outlets.slice(0,3).map(s=>s.id));
 if(e.counter)add('counter','反击有次数与期限',`对手剩${e.counter.hits}次反击，只回应直接攻击，下次对手自身阶段到期；灼烧、寄生与反伤不会触发。连打小招也可能逐次承受反击。`);
 const k=CLASSES[p.key].reactionElement;
 add('reserve','从同一池灵气留应对',p.reaction?`「${CLASSES[p.key].reaction}」需要1${names[k]}气。当前${p.qi[k]>=1?'仍可支付':'不足'}；出招若用掉最后一点，下个敌方阶段就不能用它护盾。应对最多一次。`:'本回合应对已用；结束回合不会立刻返还，等下次己方阶段刷新。');
 if(hints.length===1)add('shared','准备只兑现一次',shared[p.key]);
 return hints;
}
