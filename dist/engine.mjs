export const ELEMENTS = ['metal','wood','water','fire','earth','any'];
export const ELEMENT_NAMES = {metal:'金',wood:'木',water:'水',fire:'火',earth:'土',any:'通灵'};
export const CLASSES = {
  fire: {name:'火木法修',nameShort:'火木',person:'沈知微',sect:'丹霞谷',title:'木引星火 · 生息不绝',hp:210,physical:22,magical:30,gen:{fire:2,wood:2,any:1},passive:'生息诀',passiveText:'每回合第一次施展木系神通，额外凝聚 1 火灵气。',reaction:'御木诀',reactionElement:'wood',skills:[
    {id:'seed',name:'催生术',symbol:'生',element:'wood',ap:1,cost:{wood:1},kind:'seed',desc:'种下 2 层灵种。焚炎术每引燃一层，伤害提高 20%。',tag:'铺垫',range:[0,1,2]},
    {id:'spark',name:'流火诀',symbol:'焰',element:'fire',ap:1,cost:{fire:1},kind:'attack',power:24,burn:1,desc:'造成术法伤害，附加 1 层灼烧。',tag:'术法',range:[0,1,2]},
    {id:'blaze',name:'焚炎术',symbol:'燃',element:'fire',ap:1,cost:{fire:2,any:1},kind:'attack',power:46,burn:2,ignite:true,desc:'引燃全部灵种，附加 2 层灼烧。',tag:'引爆',range:[0,1,2]},
    {id:'heal',name:'青木回春',symbol:'愈',element:'wood',ap:1,cost:{wood:2},kind:'heal',heal:26,desc:'恢复 26 气血，清除自身灼烧。',tag:'恢复',range:[0,1,2]},
    {id:'vine',name:'缠灵藤',symbol:'缚',element:'wood',ap:1,cost:{wood:1},kind:'attack',power:12,interrupt:true,desc:'造成术法伤害，打断敌人蓄势。',tag:'打断',range:[0,1]},
    {id:'inferno',name:'离火焚天',symbol:'燎',element:'fire',ap:2,cost:{fire:3,any:1},kind:'charge',power:86,burn:2,desc:'蓄势至下次行动阶段。引爆灼烧，每层额外造成 8 基础伤害。',tag:'蓄势',range:[1,2]},
  ]},
  sword: {name:'太玄剑修',nameShort:'剑修',person:'陆青玄',sect:'太玄剑宗',title:'一剑照雪 · 破势而行',hp:230,physical:28,magical:40,gen:{metal:3,water:1,any:1},passive:'养剑诀',passiveText:'剑招命中后积累 1 层剑意，上限 5 层。断岳与归一消耗剑意强化伤害。',reaction:'横剑式',reactionElement:'metal',skills:[
    {id:'swift',name:'掠影剑',symbol:'斩',element:'metal',ap:1,cost:{metal:1},kind:'attack',power:30,sword:true,desc:'造成兵刃伤害，积累 1 层剑意。',tag:'快剑',range:[0,1]},
    {id:'expose',name:'照隙诀',symbol:'隙',element:'water',ap:1,cost:{water:1},kind:'attack',power:12,expose:true,desc:'制造破绽，使下一次重剑伤害提高 25%。',tag:'识破',range:[0,1,2]},
    {id:'strike',name:'断岳剑',symbol:'破',element:'metal',ap:1,cost:{metal:2,any:1},kind:'attack',power:52,finisher:true,sword:true,desc:'消耗全部剑意，每层增加 8 基础伤害。利用破绽增伤 25%。',tag:'重剑',range:[0,1]},
    {id:'guard',name:'藏锋式',symbol:'守',element:'metal',ap:1,cost:{metal:1},kind:'guard',desc:'获得 22 护盾与 1 层剑意。护盾保留，最多 60。',tag:'防守',range:[0,1,2]},
    {id:'cut',name:'截脉剑',symbol:'截',element:'metal',ap:1,cost:{metal:1,water:1},kind:'attack',power:20,interrupt:true,sword:true,desc:'造成兵刃伤害，打断敌人蓄势。',tag:'打断',range:[0,1]},
    {id:'unity',name:'万剑归一',symbol:'极',element:'metal',ap:2,cost:{metal:3,any:1},kind:'charge',power:86,finisher:true,desc:'消耗剑意蓄势，每层增加 8 基础伤害。下次行动阶段释放。',tag:'蓄势',range:[1,2]},
  ]},
};
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
function fighter(key,player){const c=CLASSES[key];return {key,name:player?'你':c.person,hp:c.hp,maxHp:c.hp,qi:Object.fromEntries(ELEMENTS.map(k=>[k,0])),shield:0,intent:0,seed:0,burn:0,burnTurns:0,broken:false,charge:null,ap:3,reaction:true,meditated:false,woodTriggered:false};}
export class Battle {
  constructor(key='fire') {if(!CLASSES[key])throw new Error('未知流派');this.round=0;this.phase='player';this.distance=1;this.player=fighter(key,true);this.enemy=fighter(key==='fire'?'sword':'fire',false);this.logs=[];this.pending=null;this.enemyQueue=[];this.result=null;this.serial=0;this.beginRound();}
  log(text,type='normal'){this.logs.push({id:++this.serial,round:this.round,text,type});if(this.logs.length>160)this.logs.shift();}
  skill(actor,id){return [...CLASSES[actor.key].skills,...COMMON].find(s=>s.id===id);}
  other(actor){return actor===this.player?this.enemy:this.player;}
  gain(actor,amount){let room=10-total(actor.qi);let count=0;for(const [k,n] of Object.entries(amount)){let m=Math.min(room,n);actor.qi[k]+=m;room-=m;count+=m;}return count;}
  legal(actor,id){
    const s=this.skill(actor,id);if(!s)return '未知神通';if(this.result)return '本场斗法已结束';if(actor.ap<s.ap)return '行动点不足';if(actor.charge)return '正在蓄势，可结束回合或取消蓄势';if(s.range&&!s.range.includes(this.distance))return '距离不适合';if(s.delta&&!(this.distance+s.delta>=0&&this.distance+s.delta<=2))return '已到距离边界';if(s.kind==='meditate'&&actor.meditated)return '本回合已经调息';if(s.kind==='meditate'&&total(actor.qi)>=10)return '灵气已经充盈';if(!payment(actor.qi,s.cost))return '所需灵气不足';return null;
  }
  beginRound(){
    if(this.result)return;this.round++;this.phase='player';this.pending=null;
    for(const a of [this.player,this.enemy]){a.ap=3;a.reaction=true;a.meditated=false;a.woodTriggered=false;this.gain(a,CLASSES[a.key].gen);}
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
    for(const id of candidates){if(chosen.length>=3)break;const s=this.skill(copy,id);const paid=payment(copy.qi,s.cost);if(s.ap>copy.ap||!paid||(s.range&&!s.range.includes(d)))continue;chosen.push(id);copy.ap-=s.ap;copy.qi=paid;if(s.delta)d+=s.delta;if(s.kind==='charge')break;if(copy.key==='fire'&&s.element==='wood'&&!copy.woodTriggered){copy.woodTriggered=true;copy.qi.fire++;}}
    while(copy.ap>0){chosen.push('basic');copy.ap--;}
    this.enemyQueue=chosen;this.enemyPlan=[...chosen];
  }
  raw(actor,s){let n=s.power||0;const target=this.other(actor);if(s.ignite)n*=1+.2*target.seed;if(s.finisher)n+=actor.intent*8;if((s.finisher||s.kind==='charge')&&target.broken)n*=1.25;return Math.round(n);}
  preview(s){const raw=this.raw(this.player,s)+(s.id==='inferno'?this.enemy.burn*8:0);const type=(this.player.key==='sword'&&s.id!=='expose')||s.id==='basic'?'physical':'magical';const def=CLASSES[this.enemy.key][type];return Math.round(raw*100/(100+def));}
  act(actor,id){
    if(actor===this.player&&this.phase!=='player')return {ok:false,error:'现在不是你的行动阶段'};
    if(actor===this.enemy&&this.phase!=='enemy')return {ok:false,error:'现在不是敌方行动阶段'};
    const error=this.legal(actor,id);if(error)return {ok:false,error};
    const s=this.skill(actor,id),target=this.other(actor);actor.qi=payment(actor.qi,s.cost);actor.ap-=s.ap;
    this.log(`${actor.name}施展「${s.name}」。`,actor===this.player?'player':'enemy');
    if(actor.key==='fire'&&s.element==='wood'&&!actor.woodTriggered){actor.woodTriggered=true;const n=this.gain(actor,{fire:1});if(n)this.log(`生息诀 · ${actor.name}凝聚 ${n} 火灵气。`,'resource');}
    if(s.kind==='seed'){target.seed=Math.min(5,target.seed+2);}
    else if(s.kind==='heal'){const n=Math.min(s.heal,actor.maxHp-actor.hp);actor.hp+=n;actor.burn=0;actor.burnTurns=0;this.log(`${actor.name}恢复 ${n} 气血，清除灼烧。`,'heal');}
    else if(s.kind==='guard'){actor.shield=Math.min(60,actor.shield+22);actor.intent=Math.min(5,actor.intent+1);}
    else if(s.kind==='move'){this.distance+=s.delta;this.log(`双方距离变为${['近身','中距','远距'][this.distance]}。`);}
    else if(s.kind==='meditate'){actor.meditated=true;const key=actor.key==='fire'?'fire':'metal';const n=this.gain(actor,{[key]:1,any:1});this.log(`${actor.name}调息，凝聚 ${n} 灵气。`,'resource');}
    else if(s.kind==='purify'){actor.hp=Math.min(actor.maxHp,actor.hp+8);actor.burn=0;actor.burnTurns=0;this.log(`${actor.name}恢复 8 气血，清除灼烧。`,'heal');}
    else if(s.kind==='charge'){actor.charge={...s,storedPower:this.raw(actor,s)};if(s.finisher)actor.intent=0;this.log(`${actor.name}开始蓄势「${s.name}」，下次行动阶段释放。`,'charge');}
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
    if(s.ignite)target.seed=0;
    if(s.finisher){actor.intent=0;target.broken=false;}
    if(s.expose)target.broken=true;
    if(s.sword&&!s.finisher)actor.intent=Math.min(5,actor.intent+1);
    if(s.burn){target.burn=Math.min(5,target.burn+s.burn);target.burnTurns=3;}
    if(s.interrupt&&target.charge){this.log(`${target.name}的「${target.charge.name}」被打断！`,'charge');target.charge=null;}
  }
  hurt(target,n,source,useShield=true){
    const absorbed=useShield?Math.min(target.shield,n):0;target.shield-=absorbed;const actual=Math.min(target.hp,n-absorbed);target.hp-=actual;
    this.log(`${source}：${target.name}受到 ${actual} 伤害${absorbed?`，护盾吸收 ${absorbed}`:''}。`,target===this.player?'damage':'hit');
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
  endTurn(){if(this.phase!=='player'||this.result)return {ok:false,error:'现在不能结束回合'};this.phase='enemy';this.log('你结束行动，敌方开始出招。','round');this.tickBurn(this.enemy);if(!this.result&&this.enemy.charge)this.release(this.enemy);return {ok:true};}
  enemyStep(){
    if(this.phase!=='enemy'||this.result)return false;
    if(this.enemy.charge){this.enemyQueue=[];this.beginRound();return false;}
    while(this.enemyQueue.length){const id=this.enemyQueue.shift();const r=this.act(this.enemy,id);if(r.ok)return true;this.log(`敌方未能施展「${this.skill(this.enemy,id)?.name}」：${r.error}。`);}
    this.beginRound();return false;
  }
  snapshot(){return {round:this.round,phase:this.phase,distance:['近身','中距','远距'][this.distance],player:JSON.parse(JSON.stringify(this.player)),enemy:JSON.parse(JSON.stringify(this.enemy)),enemyPlan:this.enemyPlan,result:this.result,pending:this.pending?{name:this.pending.s.name,raw:this.pending.raw}:null};}
}
