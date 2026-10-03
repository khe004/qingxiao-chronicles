import {Battle,CLASSES,total,payment} from './engine.mjs';
import {planQuestioning} from './opponent-planner.mjs';
export const DIFFICULTIES={practice:{name:'切磋',description:'按性格直观出招，适合熟悉招式和反制。'},questioning:{name:'问道',description:'提前考虑施压、退距与资源周转；预告仍固定，气血与伤害相同。'}};

export const OPPONENTS={
 quick:{id:'quick',name:'顾追风',key:'sword',major:'quick',title:'快剑压制',seal:'疾',style:'主动接近 · 养意追击',description:'靠近后以快剑养意，及时追击、出重剑；你蓄势时优先打断。',counter:'留意近身追击；先防住剑意爆发，再找施法窗口。',skills:['swift','expose','strike','guard','cut','lunge'],reactionThreshold:25},
 heavy:{id:'heavy',name:'裴藏锋',key:'sword',major:'heavy',title:'藏锋重剑',seal:'藏',style:'留气承接 · 藏锋反击',description:'保留横剑应对的金灵气，承接攻击后用重剑兑现藏锋；不会无限补盾。',counter:'小招试探，观察藏锋与破绽；近身可化解万剑归一。',skills:['swift','expose','strike','guard','return','unity'],reactionThreshold:8},
 ignite:{id:'ignite',name:'温照夜',key:'fire',major:'ignite',title:'引燃爆发',seal:'燃',style:'种灵分燃 · 寻隙引爆',description:'先种灵，再以分燃或焚炎兑现；射程不合适时接近，有灼烧铺垫才择机蓄势。',counter:'观察灵种与距离；引爆之前施压，或留住打断机会。',skills:['seed','spark','blaze','ember','vine','inferno'],reactionThreshold:20},
 sustain:{id:'sustain',name:'林知春',key:'fire',major:'sustain',title:'生息消耗',seal:'生',style:'灼烧施压 · 回春周转',description:'持续施加灼烧，受伤后选择回春或枯荣；留出进攻行动，避免只回血。',counter:'恢复也占行动；抓住出招窗口集中爆发，按需清除灼烧。',skills:['seed','spark','blaze','heal','nourish','vine'],reactionThreshold:14},
};
export const ROUTES={
 sword:{name:'试剑问火',description:'先试快剑，再战生息，最后面对藏锋重剑。',opponents:['quick','sustain','heavy']},
 fire:{name:'观火问剑',description:'先观引燃，再试快剑，最后面对生息消耗。',opponents:['ignite','quick','sustain']},
};
export const opponentConfig=id=>{const p=OPPONENTS[id];if(!p)throw Error('未知论道对手');return {major:p.major,skillIds:[...p.skills]};};
function preview(b){const {logs,stats,...state}=b;const copy=Object.assign(Object.create(Battle.prototype),JSON.parse(JSON.stringify(state)),{logs:[]});copy.phase='enemy';copy.pending=null;copy.result=null;copy.attack=function(a,s,raw){this.resolveAttack(a,s,raw);};if(copy.enemy.charge)copy.release(copy.enemy);return copy;}
function select(b,p,path){
 const a=b.enemy,e=b.player,legal=id=>{if(b.legal(a,id))return false;const s=b.skill(a,id);return !(p.id==='heavy'&&a.reaction&&s.cost.metal&&(payment(a.qi,s.cost)?.metal??0)<1);},take=(ids,reason)=>{const id=ids.find(legal);return id?{id,reason}:null;};
 const hit=id=>{const s=b.skill(a,id);if(!s||!legal(id)||!s.power)return 0;const raw=b.raw(a,s)+(id==='inferno'?e.burn*8:0),type=(a.key==='sword'&&id!=='expose')||id==='basic'?'physical':'magical';return Math.max(0,Math.round(raw*100/(100+CLASSES[e.key][type]))-e.shield-(e.reaction&&e.qi[CLASSES[e.key].reactionElement]>0?26:0));};
 const attacks=b.skills(a).filter(s=>s.kind==='attack'&&legal(s.id)).toSorted((x,y)=>hit(y.id)-hit(x.id));
 const lethal=attacks.find(s=>hit(s.id)>=e.hp);if(lethal)return {id:lethal.id,reason:'已有可兑现的斩杀机会，直接出招。'};
 if(a.charge)return take([...(a.key==='sword'&&a.shield<22&&a.qi.metal>=2?['guard']:[]),...(b.distance===1?['far']:[]),'meditate'],'蓄势后用剩余行动护体、拉开或补气。');
 if(e.charge){const counter=take(['lunge',a.key==='sword'?'cut':'vine'],'对手正在蓄势，先打断。');if(counter)return counter;if(b.distance===1&&legal('near'))return {id:'near',reason:'贴近到近身，化解中远距蓄势。'};}
 if(a.key==='sword'){
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
export function opponentReaction(b,id,s,raw){
 const p=OPPONENTS[id],a=b.enemy;const type=(b.player.key==='sword'&&s.id!=='expose')||s.id==='basic'?'physical':'magical';const damage=Math.round((raw+(s.id==='inferno'?a.burn*8:0))*100/(100+CLASSES[a.key][type]));const net=Math.max(0,damage-a.shield),k=CLASSES[a.key].reactionElement;
 if(!a.reaction||!net)return 'none';
 if(net>=a.hp){if(a.qi[k]>=1&&Math.max(0,damage-Math.min(60,a.shield+26))<a.hp)return 'shield';if(total(a.qi)>=2&&Math.max(0,Math.round(damage*.5)-a.shield)<a.hp)return 'evade';}
 if(b.difficulty==='questioning'&&net<a.hp*.45){const demand=(b.enemyPlan??[]).reduce((n,id)=>n+(b.skill(a,id)?.cost[k]??0)-(id==='meditate'&&CLASSES[a.key].gen[k]?1:0),0);if(demand>=a.qi[k]&&net<38)return 'none';}
 return net>=p.reactionThreshold&&a.qi[k]>=1?'shield':'none';
}
