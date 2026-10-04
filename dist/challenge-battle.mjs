import {Battle,RULES,MAJORS,ELEMENTS} from './engine.mjs';
import {OPPONENTS,DIFFICULTIES,opponentConfig,planOpponent,opponentReactionDecision} from './opponents.mjs';
import {RecordedBattle} from './recorded-battle.mjs';
export class ChallengeBattle extends RecordedBattle{
 constructor(key,config,id,{distance=1,limit=30,difficulty='practice'}={}){
  if(!DIFFICULTIES[difficulty])throw Error('未知难度');if(!OPPONENTS[id])throw Error('未知论道对手');if(![0,1,2].includes(distance)||!Number.isInteger(limit)||limit<1)throw Error('论道参数无效');
  super(key,config);this.opponentId=id;this.difficulty=difficulty;this.limit=limit;const p=OPPONENTS[id];this.enemy=new Battle(p.key,opponentConfig(id)).player;this.enemy.name=p.name;this.enemy.shield=RULES.secondShield;
  for(const a of [this.player,this.enemy])a.qi=Object.fromEntries(ELEMENTS.map(k=>[k,0]));
  this.round=0;this.distance=distance;this.logs=[];this.serial=0;this.events=[];
  this.log(`难度「${DIFFICULTIES[difficulty].name}」· 招式预告固定，距离或费用改变时跳过，不临时替换。`,'setup');
  this.log(`对手「${p.name}」· ${p.title}：${p.description}`,'setup');
  for(const a of [this.player,this.enemy])this.log(`${a.name}主修「${MAJORS[a.key][a.major].name}」，装备：${this.skills(a).map(s=>s.name).join('、')}。`,'setup');this.beginRound();
 }
 planEnemy(){if(this.forecastOnly){this.enemyPlan=[];this.enemyQueue=[];return;}if(!this.opponentId)return super.planEnemy();const choices=planOpponent(this,this.opponentId);this.enemyPlan=choices.map(c=>c.id);this.enemyQueue=[...this.enemyPlan];this.enemyReasons=choices;}
 reactionDecision(s,raw){if(!this.opponentId)return super.reactionDecision(s,raw);const d=opponentReactionDecision(this,this.opponentId,s,raw);if(d.reason&&this.stats)this.stats[1].reactionPreserved++;return d;}
 enemyStep(){const next=this.enemyQueue[0];if(next)this.log(`【${OPPONENTS[this.opponentId].title}】${this.enemyReasons.find(c=>c.id===next)?.reason||'按公开计划出招。'}`,'decision');return super.enemyStep();}
}
