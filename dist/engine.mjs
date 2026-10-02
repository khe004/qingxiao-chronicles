export const ELEMENTS = ['metal','wood','water','fire','earth','any'];
export const ELEMENT_NAMES = {metal:'金',wood:'木',water:'水',fire:'火',earth:'土',any:'通灵'};
export const CLASSES = {
  fire: {name:'火木法修',nameShort:'火木',person:'沈知微',sect:'丹霞谷',title:'木引星火 · 生息不绝',hp:210,physical:22,magical:30,gen:{fire:2,wood:2,any:1},passive:'生息诀',passiveText:'每回合第一次施展木系神通，额外凝聚 1 火灵气。',reaction:'御木诀',reactionElement:'wood',skills:[
    {id:'seed',name:'催生术',symbol:'生',element:'wood',ap:1,cost:{wood:1},kind:'seed',desc:'种下 2 层灵种。焚炎术每引燃一层，伤害提高 20%。',tag:'铺垫',range:[0,1,2]},
    {id:'spark',name:'流火诀',symbol:'焰',element:'fire',ap:1,cost:{fire:1},kind:'attack',power:24,burn:1,desc:'造成术法伤害，附加 1 层灼烧。',tag:'术法',range:[0,1,2]},
    {id:'blaze',name:'焚炎术',symbol:'燃',element:'fire',ap:1,cost:{fire:2,any:1},kind:'attack',power:46,burn:2,ignite:true,desc:'引燃全部灵种，附加 2 层灼烧。',tag:'引爆',range:[0,1,2]},
    {id:'heal',name:'青木回春',symbol:'愈',element:'wood',ap:1,cost:{wood:2},kind:'heal',heal:26,desc:'恢复 26 气血，清除自身灼烧。',tag:'恢复',range:[0,1,2]},
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
};
export const MAJORS = {
  fire: {
    ignite:{name:'引燃爆发',symbol:'燃',focus:'种灵 · 分燃 · 引爆',effect:'每回合首次引燃至少 1 层灵种，额外凝聚 1 火灵气。',tip:'灵种可分批引燃，也可留给焚炎一次引爆。',recommended:['seed','spark','blaze','heal','vine','inferno']},
    sustain:{name:'生息消耗',symbol:'生',focus:'灼烧 · 回春 · 周转',effect:'每回合首次施展木系神通，额外恢复 6 气血；可与生息诀同时触发。',tip:'以灼烧持续施压，木法兼顾恢复与灵气周转。',recommended:['seed','spark','blaze','heal','nourish','vine']},
  },
  sword: {
    quick:{name:'快剑压制',symbol:'疾',focus:'养意 · 追击 · 打断',effect:'每回合首次命中非重剑剑招，额外积累 1 剑意，上限仍为 5。',tip:'剑意可用于近身追风打断，也可留给重剑。',recommended:['swift','expose','strike','guard','cut','unity']},
    heavy:{name:'藏锋重剑',symbol:'藏',focus:'护体 · 藏锋 · 破势',effect:'护盾吸收攻击后获得藏锋：下一次重剑增加 12 基础伤害，不叠加，至下回合己方行动结束失效。',tip:'承接攻击后及时出剑；藏锋也可用于蓄势大招。',recommended:['swift','expose','strike','guard','return','unity']},
  },
};
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
  {id:'basic',name:'基础攻击',ap:1,cost:{},kind:'attack',power:12,range:[0,1,2]},
  {id:'near',name:'接近',ap:1,cost:{},kind:'move',delta:-1},
  {id:'far',name:'拉开',ap:1,cost:{},kind:'move',delta:1},
  {id:'meditate',name:'调息',ap:1,cost:{},kind:'meditate'},
  {id:'purify',name:'净息',ap:1,cost:{any:1},kind:'purify'},
];
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
function fighter(key,player,config){const c=CLASSES[key],loadout=normalizeLoadout(key,config);return {key,major:loadout.major,skillIds:loadout.skillIds,igniteTriggered:false,quickTriggered:false,edge:false,edgeExpires:0,usedSkills:[],name:player?'你':c.person,hp:c.hp,maxHp:c.hp,qi:Object.fromEntries(ELEMENTS.map(k=>[k,0])),shield:0,intent:0,seed:0,burn:0,burnTurns:0,broken:false,charge:null,ap:3,reaction:true,meditated:false,woodTriggered:false};}
export class Battle {
  constructor(key='fire',config={},enemyConfig={}) {if(!Object.hasOwn(CLASSES,key))throw new Error('未知流派');this.round=0;this.phase='player';this.distance=1;this.player=fighter(key,true,config);this.enemy=fighter(key==='fire'?'sword':'fire',false,enemyConfig);this.logs=[];this.pending=null;this.enemyQueue=[];this.result=null;this.serial=0;for(const a of [this.player,this.enemy])this.log(`${a.name}主修「${MAJORS[a.key][a.major].name}」，装备：${this.skills(a).map(s=>s.name).join('、')}。`,'setup');this.beginRound();}
  log(text,type='normal'){this.logs.push({id:++this.serial,round:this.round,text,type});}
  skills(actor){return actor.skillIds.map(id=>CLASSES[actor.key].skills.find(s=>s.id===id));}
  skill(actor,id){return [...this.skills(actor),...COMMON].find(s=>s.id===id);}
  other(actor){return actor===this.player?this.enemy:this.player;}
  gain(actor,amount){let room=10-total(actor.qi);let count=0;for(const [k,n] of Object.entries(amount)){let m=Math.min(room,n);actor.qi[k]+=m;room-=m;count+=m;}return count;}
  legal(actor,id){
    const s=this.skill(actor,id);if(!s)return '神通未装备或不存在';if(this.result)return '本场斗法已结束';if(actor.ap<s.ap)return '行动点不足';if(actor.charge&&!['move','meditate','guard'].includes(s.kind))return '蓄势中仅可移动、调息或防守，也可结束回合或取消蓄势';if(s.range&&!s.range.includes(this.distance))return '距离不适合';if(s.delta&&!(this.distance+s.delta>=0&&this.distance+s.delta<=2))return '已到距离边界';if(s.kind==='meditate'&&actor.meditated)return '本回合已经调息';if(s.kind==='meditate'&&total(actor.qi)>=10)return '灵气已经充盈';if(s.intentCost&&actor.intent<s.intentCost)return `需要 ${s.intentCost} 层剑意`;if(s.once&&actor.usedSkills.includes(id))return '本回合已经施展';if(!payment(actor.qi,s.cost))return '所需灵气不足';return null;
  }
  beginRound(){
    if(this.result)return;this.round++;this.phase='player';this.pending=null;
    for(const a of [this.player,this.enemy]){a.ap=3;a.reaction=true;a.meditated=false;a.woodTriggered=false;a.igniteTriggered=false;a.quickTriggered=false;a.usedSkills=[];this.gain(a,CLASSES[a.key].gen);}
    this.log(`第 ${this.round} 回合 · 双方纳气，轮到你行动。`,'round');
    this.tickBurn(this.player);if(this.result)return;
    if(this.player.charge)this.release(this.player);
    if(!this.result)this.planEnemy();
  }
  tickBurn(a){if(a.burn>0){const n=a.burn*4;this.hurt(a,n,`${a.name}的灼烧`,false);a.burnTurns--;if(a.burnTurns<=0)a.burn=0;}}
  planEnemy(){
    const e=this.enemy,copy=JSON.parse(JSON.stringify(e));copy.charge=null;const chosen=[];
    const candidates=e.key==='sword'
      ? (this.round%3===0?['unity','guard','expose','swift']:['expose','strike','swift','guard'])
      : (e.hp<95?['heal','seed','blaze','spark']:this.round%3===0?['inferno','seed','blaze','spark']:['seed','blaze','spark']);
    if(this.distance===2&&e.key==='sword'&&this.round%3!==0)candidates.unshift('near');
    // 预告中的核心招式固定；费用不足或距离改变时只能跳过，不能偷换大招。
    let d=this.distance;
    for(const id of candidates){if(chosen.length>=3)break;const s=this.skill(copy,id);if(!s)continue;const paid=payment(copy.qi,s.cost);if(s.ap>copy.ap||!paid||(copy.charge&&!['move','meditate','guard'].includes(s.kind))||(s.intentCost&&copy.intent<s.intentCost)||(s.once&&copy.usedSkills.includes(id))||(s.range&&!s.range.includes(d)))continue;chosen.push(id);copy.ap-=s.ap;copy.qi=paid;if(s.delta)d+=s.delta;if(s.kind==='charge')copy.charge=s;if(copy.key==='fire'&&s.element==='wood'&&!copy.woodTriggered){copy.woodTriggered=true;copy.qi.fire++;}}
    while(copy.ap>0){
      // 蓄势余下的行动只用于护体或补气；保持预告固定，不临时追加攻击。
      const id=copy.charge?(d===1?'far':!copy.meditated&&total(copy.qi)<10?'meditate':null):'basic';
      if(!id)break;chosen.push(id);copy.ap--;if(id==='far')d++;if(id==='meditate')copy.meditated=true;
    }
    this.enemyQueue=chosen;this.enemyPlan=[...chosen];
  }
  raw(actor,s){let n=s.power||0;const target=this.other(actor);if(s.ignite)n*=1+.2*target.seed;if(s.partialIgnite)n+=Math.min(s.partialIgnite,target.seed)*10;if(s.finisher)n+=Math.min(actor.intent,s.intentLimit??5)*8+(actor.edge?12:0);if((s.finisher||s.kind==='charge')&&target.broken)n*=1.25;return Math.round(n);}
  preview(s){const raw=this.raw(this.player,s)+(s.id==='inferno'?this.enemy.burn*8:0);const type=(this.player.key==='sword'&&s.id!=='expose')||s.id==='basic'?'physical':'magical';const def=CLASSES[this.enemy.key][type];return Math.round(raw*100/(100+def));}
  act(actor,id){
    if(actor===this.player&&this.phase!=='player')return {ok:false,error:'现在不是你的行动阶段'};
    if(actor===this.enemy&&this.phase!=='enemy')return {ok:false,error:'现在不是敌方行动阶段'};
    const error=this.legal(actor,id);if(error)return {ok:false,error};
    const s=this.skill(actor,id),target=this.other(actor);actor.qi=payment(actor.qi,s.cost);actor.ap-=s.ap;if(s.intentCost){actor.intent-=s.intentCost;this.log(`${actor.name}消耗 ${s.intentCost} 层剑意用于追击。`,'resource');}if(s.once)actor.usedSkills.push(id);
    this.log(`${actor.name}施展「${s.name}」。`,actor===this.player?'player':'enemy');
    if(actor.key==='fire'&&s.element==='wood'&&!actor.woodTriggered){actor.woodTriggered=true;const n=this.gain(actor,{fire:1});if(n)this.log(`生息诀 · ${actor.name}凝聚 ${n} 火灵气。`,'resource');if(actor.major==='sustain'){const heal=Math.min(6,actor.maxHp-actor.hp);actor.hp+=heal;this.log(`生息消耗 · ${actor.name}恢复 ${heal} 气血。`,'heal');}}
    if(s.kind==='seed'){const before=target.seed;target.seed=Math.min(5,target.seed+2);this.log(`${target.name}增加 ${target.seed-before} 层灵种，现有 ${target.seed} 层。`,'resource');}
    else if(s.kind==='heal'){const n=Math.min(s.heal,actor.maxHp-actor.hp);actor.hp+=n;const cleared=Math.min(actor.burn,s.clearBurn??5);actor.burn-=cleared;if(!actor.burn)actor.burnTurns=0;this.log(`${actor.name}恢复 ${n} 气血，清除 ${cleared} 层灼烧。`,'heal');if(s.refund){const gain=this.gain(actor,s.refund);this.log(`${actor.name}以枯荣转生凝聚 ${gain} 通灵。`,'resource');}}
    else if(s.kind==='guard'){actor.shield=Math.min(60,actor.shield+22);actor.intent=Math.min(5,actor.intent+1);this.log(`${actor.name}获得护盾，现有 ${actor.shield} 护盾、${actor.intent} 剑意。`,'resource');}
    else if(s.kind==='move'){this.distance+=s.delta;this.log(`双方距离变为${['近身','中距','远距'][this.distance]}。`);}
    else if(s.kind==='meditate'){actor.meditated=true;const key=actor.key==='fire'?'fire':'metal';const n=this.gain(actor,{[key]:1,any:1});this.log(`${actor.name}调息，凝聚 ${n} 灵气。`,'resource');}
    else if(s.kind==='purify'){actor.hp=Math.min(actor.maxHp,actor.hp+8);actor.burn=0;actor.burnTurns=0;this.log(`${actor.name}恢复 8 气血，清除灼烧。`,'heal');}
    else if(s.kind==='charge'){actor.charge={...s,storedPower:this.raw(actor,s)};if(s.finisher)this.spendFinisher(actor,s);this.log(`${actor.name}开始蓄势「${s.name}」，下次行动阶段释放。`,'charge');}
    else this.attack(actor,s,this.raw(actor,s));
    return {ok:true};
  }
  attack(actor,s,raw){
    if(actor===this.enemy&&this.player.reaction){this.pending={s,raw};this.phase='reaction';return;}
    if(actor===this.player&&this.enemy.reaction&&raw>=35){const e=this.enemy,k=CLASSES[e.key].reactionElement;if(e.qi[k]>=1){e.qi[k]--;e.reaction=false;e.shield=Math.min(60,e.shield+26);this.log(`${e.name}以「${CLASSES[e.key].reaction}」应对，获得 26 护盾。`,'reaction');}}
    this.resolveAttack(actor,s,raw);
  }
  resolveAttack(actor,s,raw,reduction=1){
    const target=this.other(actor);const type=(actor.key==='sword'&&s.id!=='expose')||s.id==='basic'?'physical':'magical';
    let power=raw;if(s.id==='inferno'){power+=target.burn*8;target.burn=0;target.burnTurns=0;}
    const damage=Math.round(power*100/(100+CLASSES[target.key][type])*reduction);
    this.hurt(target,damage,`${actor.name}的${s.name}`);
    const ignited=s.ignite?target.seed:s.partialIgnite?Math.min(s.partialIgnite,target.seed):0;
    if(ignited){target.seed-=ignited;this.log(`${actor.name}引燃 ${ignited} 层灵种，剩余 ${target.seed} 层。`,'resource');if(actor.major==='ignite'&&!actor.igniteTriggered){actor.igniteTriggered=true;const n=this.gain(actor,{fire:1});this.log(`引燃爆发 · ${actor.name}凝聚 ${n} 火灵气。`,'resource');}}
    if(s.finisher){if(s.kind!=='charge')this.spendFinisher(actor,s);target.broken=false;}
    if(s.expose)target.broken=true;
    if(s.sword&&!s.finisher){let n=1;if(actor.major==='quick'&&!actor.quickTriggered){actor.quickTriggered=true;n++;this.log(`快剑压制 · ${actor.name}额外养剑 1 层。`,'resource');}actor.intent=Math.min(5,actor.intent+n);this.log(`${actor.name}现有 ${actor.intent} 层剑意。`,'resource');}
    if(s.burn){target.burn=Math.min(5,target.burn+s.burn);target.burnTurns=3;}
    if(s.interrupt&&target.charge){this.log(`${target.name}的「${target.charge.name}」被打断！`,'charge');target.charge=null;}
  }
  spendFinisher(actor,s){const n=Math.min(actor.intent,s.intentLimit??5);actor.intent-=n;if(actor.edge){this.log(`藏锋重剑 · ${actor.name}消耗藏锋，为「${s.name}」增加 12 基础伤害。`,'resource');actor.edge=false;}this.log(`${actor.name}消耗 ${n} 层剑意，剩余 ${actor.intent} 层。`,'resource');}
  expireEdge(actor){if(actor.edge&&actor.edgeExpires<=this.round){actor.edge=false;this.log(`${actor.name}的藏锋超过时限，强化消散。`,'resource');}}
  hurt(target,n,source,useShield=true){
    const absorbed=useShield?Math.min(target.shield,n):0;target.shield-=absorbed;const actual=Math.min(target.hp,n-absorbed);target.hp-=actual;
    this.log(`${source}：${target.name}受到 ${actual} 伤害${absorbed?`，护盾吸收 ${absorbed}`:''}。`,target===this.player?'damage':'hit');
    if(absorbed>0&&target.major==='heavy'){target.edge=true;target.edgeExpires=this.round+1;this.log(`藏锋重剑 · ${target.name}承接攻击，获得藏锋，下一次重剑强化；至第 ${target.edgeExpires} 回合己方行动结束失效。`,'resource');}
    this.lastHit={target:target===this.player?'player':'enemy',damage:actual,absorbed,id:this.serial};
    if(target.hp<=0){this.result=target===this.enemy?'win':'lose';this.phase='over';this.pending=null;this.log(this.result==='win'?'论道告捷 · 对手拱手认输。':'本场惜败 · 调整招式，再试一场。','result');}
  }
  react(kind){
    if(this.phase!=='reaction'||!this.pending)return {ok:false,error:'当前没有可应对的招式'};
    const p=this.player,k=CLASSES[p.key].reactionElement;
    if(!['shield','evade','none'].includes(kind))return {ok:false,error:'未知应对方式'};
    if(kind==='shield'&&p.qi[k]<1)return {ok:false,error:'应对灵气不足'};
    if(kind==='evade'&&!payment(p.qi,{any:2}))return {ok:false,error:'需要 2 任意灵气'};
    if(kind==='shield'){p.qi[k]--;p.shield=Math.min(60,p.shield+26);p.reaction=false;this.log(`你施展「${CLASSES[p.key].reaction}」，获得 26 护盾。`,'reaction');}
    if(kind==='evade'){p.qi=payment(p.qi,{any:2});p.reaction=false;this.distance=Math.min(2,this.distance+1);this.log('你闪身避让，本次伤害降低 50%，距离拉开一档。','reaction');}
    const pending=this.pending;this.pending=null;this.phase='enemy';this.resolveAttack(this.enemy,pending.s,pending.raw,kind==='evade'?.5:1);return {ok:true};
  }
  cancelCharge(){if(this.phase!=='player'||!this.player.charge)return {ok:false,error:'没有可以取消的蓄势'};this.log(`你取消「${this.player.charge.name}」，费用不返还。`);this.player.charge=null;return {ok:true};}
  release(actor){const s=actor.charge;actor.charge=null;if(s.range&&!s.range.includes(this.distance)){this.log(`${actor.name}的「${s.name}」因距离不适合而落空。`,'charge');return;}this.log(`${actor.name}释放「${s.name}」！`,'charge');this.attack(actor,s,s.storedPower);}
  endTurn(){if(this.phase!=='player'||this.result)return {ok:false,error:'现在不能结束回合'};this.expireEdge(this.player);this.phase='enemy';this.log('你结束行动，敌方开始出招。','round');this.tickBurn(this.enemy);if(!this.result&&this.enemy.charge)this.release(this.enemy);return {ok:true};}
  enemyStep(){
    if(this.phase!=='enemy'||this.result)return false;
    while(this.enemyQueue.length){const id=this.enemyQueue.shift();const r=this.act(this.enemy,id);if(r.ok)return true;this.log(`敌方未能施展「${this.skill(this.enemy,id)?.name}」：${r.error}。`);}
    this.expireEdge(this.enemy);this.beginRound();return false;
  }
  snapshot(){return {round:this.round,phase:this.phase,distance:['近身','中距','远距'][this.distance],player:JSON.parse(JSON.stringify(this.player)),enemy:JSON.parse(JSON.stringify(this.enemy)),enemyPlan:this.enemyPlan,result:this.result,pending:this.pending?{name:this.pending.s.name,raw:this.pending.raw}:null};}
}
