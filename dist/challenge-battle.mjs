import {Battle,CLASSES,MAJORS,ELEMENTS,payment,SUSTAIN_RECOVERY} from './engine.mjs';
import {OPPONENTS,DIFFICULTIES,opponentConfig,planOpponent,opponentReactionDecision} from './opponents.mjs';
const metric=()=>({actions:{},skipped:{},reactionPreserved:0,spentAP:0,unusedAP:0,healing:0,overheal:0,intentSpent:0,burnConsumed:0,tideSpent:0,forcedMoves:0,chillCleared:0,movement:0,hpDamage:0,shieldDamage:0,burnTaken:0,charges:{started:0,released:0,interrupted:0,rangeMiss:0,canceled:0,hpDamage:0,shieldDamage:0}});
export class ChallengeBattle extends Battle{
 constructor(key,config,id,{distance=1,limit=30,difficulty='practice'}={}){
  if(!DIFFICULTIES[difficulty])throw Error('未知难度');if(!OPPONENTS[id])throw Error('未知论道对手');if(![0,1,2].includes(distance)||!Number.isInteger(limit)||limit<1)throw Error('论道参数无效');
  super(key,config);this.opponentId=id;this.difficulty=difficulty;this.limit=limit;const p=OPPONENTS[id];this.enemy=new Battle(p.key,opponentConfig(id)).player;this.enemy.name=p.name;
  for(const a of [this.player,this.enemy])a.qi=Object.fromEntries(ELEMENTS.map(k=>[k,0]));
  this.round=0;this.distance=distance;this.logs=[];this.serial=0;this.stats=[metric(),metric()];
  this.log(`难度「${DIFFICULTIES[difficulty].name}」· 招式预告固定，距离或费用改变时跳过，不临时替换。`,'setup');
  this.log(`对手「${p.name}」· ${p.title}：${p.description}`,'setup');
  for(const a of [this.player,this.enemy])this.log(`${a.name}主修「${MAJORS[a.key][a.major].name}」，装备：${this.skills(a).map(s=>s.name).join('、')}。`,'setup');this.beginRound();
 }
 seat(a){return a===this.player?0:1;}
 beginRound(){if(this.opponentId&&this.round>=this.limit&&!this.result){this.result='draw';this.phase='over';this.pending=null;this.log(`${this.limit} 回合已至，双方收招，本场暂未分出胜负。`,'result');return;}return super.beginRound();}
 planEnemy(){if(this.forecastOnly){this.enemyPlan=[];this.enemyQueue=[];return;}if(!this.opponentId)return super.planEnemy();const choices=planOpponent(this,this.opponentId);this.enemyPlan=choices.map(c=>c.id);this.enemyQueue=[...this.enemyPlan];this.enemyReasons=choices;}
 attack(a,s,raw){if(a===this.player&&this.enemy.reaction){const e=this.enemy,decision=opponentReactionDecision(this,this.opponentId,s,raw),response=decision.response;if(decision.reason){this.stats[1].reactionPreserved++;this.log(`${e.name}留气：${decision.reason}`,'decision');}if(response==='shield'){e.qi[CLASSES[e.key].reactionElement]--;e.reaction=false;e.shield=Math.min(60,e.shield+26);this.log(`${e.name}以${CLASSES[e.key].reaction}应对，获得 26 护盾。`,'reaction');}else if(response==='evade'){e.qi=payment(e.qi,{any:2});e.reaction=false;this.moveActor(e,1);this.log(`${e.name}避让减伤，距离拉开一档。`,'reaction');}this.resolveAttack(a,s,raw,response==='evade'?.5:1);return;}return super.attack(a,s,raw);}
 spendTide(a,s){const n=super.spendTide(a,s);if(this.stats)this.stats[this.seat(a)].tideSpent+=n;return n;}
 moveActor(a,d,o={}){super.moveActor(a,d,o);if(this.stats&&o.forced)this.stats[this.seat(this.other(a))].forcedMoves++;}
 clearChill(a,reason){const had=a.chilled;super.clearChill(a,reason);if(this.stats&&had&&['净息','主动移动'].includes(reason))this.stats[this.seat(a)].chillCleared++;}
 act(a,id){const s=this.skill(a,id),hp=a.hp,intent=a.intent,growth=a.growth??0,firstWood=a.key==='fire'&&s?.element==='wood'&&!a.woodTriggered;
  const r=super.act(a,id);if(r.ok&&this.stats){const m=this.stats[this.seat(a)];m.actions[id]=(m.actions[id]||0)+1;m.spentAP+=s.ap;m.movement+=s.kind==='move'?s.ap:0;m.healing+=Math.max(0,a.hp-hp);const potential=(s.heal||0)+Math.min(growth,s.consumeGrowth??0)*(s.growthHeal??0)+(['purify','dispel'].includes(s.kind)?8:0)+(firstWood&&a.major==='sustain'?SUSTAIN_RECOVERY:0);m.overheal+=Math.max(0,potential-Math.max(0,a.hp-hp));m.intentSpent+=(s.intentCost||0)+(s.finisher?Math.min(intent,s.intentLimit??5):0);if(s.kind==='charge')m.charges.started++;}return r;}
 resolveAttack(a,s,raw,reduction=1){const e=this.other(a),hp=e.hp,shield=e.shield,charge=e.charge,burn=e.burn;super.resolveAttack(a,s,raw,reduction);if(this.stats){const m=this.stats[this.seat(a)],d=hp-e.hp,absorbed=shield-e.shield;m.burnConsumed+=s.id==='inferno'?burn:Math.min(burn,s.consumeBurn??0);m.hpDamage+=d;m.shieldDamage+=absorbed;if(s.kind==='charge'){m.charges.hpDamage+=d;m.charges.shieldDamage+=absorbed;}if(charge&&!e.charge&&s.interrupt)this.stats[this.seat(e)].charges.interrupted++;}}
 tickBurn(a){const hp=a.hp;super.tickBurn(a);if(this.stats)this.stats[this.seat(a)].burnTaken+=hp-a.hp;}
 release(a){if(this.stats){const m=this.stats[this.seat(a)].charges;if(a.charge.range.includes(this.distance))m.released++;else m.rangeMiss++;}return super.release(a);}
 cancelCharge(){const r=super.cancelCharge();if(r.ok)this.stats[0].charges.canceled++;return r;}
 endTurn(){const ap=this.player.ap,r=super.endTurn();if(r.ok)this.stats[0].unusedAP+=ap;return r;}
 enemyStep(){const logStart=this.logs.length;const old=this.round,ap=this.enemy.ap,next=this.enemyQueue[0];if(next)this.log(`【${OPPONENTS[this.opponentId].title}】${this.enemyReasons.find(c=>c.id===next)?.reason||'按公开计划出招。'}`,'decision');const r=super.enemyStep();for(const l of this.logs.slice(logStart)){if(l.text.startsWith('敌方未能施展')){const reason=l.text.split('：').at(-1).replace(/。$/,'');const m=this.stats[1].skipped;m[reason]=(m[reason]||0)+1;}}if(this.round!==old||this.result==='draw')this.stats[1].unusedAP+=ap;return r;}
 review(){return {rounds:this.round,result:this.result,opponentId:this.opponentId,difficulty:this.difficulty,distance:this.distance,actors:[this.player,this.enemy].map((a,i)=>({name:a.name,key:a.key,major:a.major,hp:a.hp,maxHp:a.maxHp,...structuredClone(this.stats[i]),charges:{...this.stats[i].charges,pending:Number(Boolean(a.charge))}}))};}
}
