// Test-only arena: production skill, payment, damage, status and reaction rules are reused.
// Both actors use the same public auto controller; initiative is independent of actor identity.
import assert from 'node:assert/strict';
import {Battle,CLASSES,MAJORS,normalizeLoadout,total} from '../dist/engine.mjs';
import {chooseAction,chooseReaction} from '../dist/auto.mjs';
const contexts=new WeakMap();
function metric(){return {actions:{},spentAP:0,unusedAP:0,chargeUnusedAP:0,hpDamage:0,shieldDamage:0,charges:{},reactions:{}};}
function chargeMetric(m,id){return m.charges[id]??= {started:0,released:0,interrupted:0,outOfRange:0,unresolved:0,hpDamage:0,shieldDamage:0,unusedAP:0};}
function validate(a){assert.ok(a.hp>=0&&a.hp<=a.maxHp);assert.ok(a.ap>=0&&a.ap<=3);assert.ok(total(a.qi)<=10);assert.ok(Object.values(a.qi).every(n=>Number.isInteger(n)&&n>=0));assert.ok(a.intent>=0&&a.intent<=5);assert.ok(a.shield>=0&&a.shield<=60);}
class ArenaBattle extends Battle {
  log(text,type){this.serial++;const c=contexts.get(this);if(c?.trace)c.trace.push({round:this.round,text,type});}
  attack(actor,skill,raw){
    const defender=this.other(actor),c=contexts.get(this),phase=this.phase;
    if(defender.reaction){
      this.player=defender;this.enemy=actor;this.phase='reaction';this.pending={s:skill,raw};
      // Queue contains only a public script forecast, not the other AI's private decision.
      this.planEnemy();
      const choice=chooseReaction(this,c.prefs[c.actors.indexOf(defender)]);
      assert.ok(super.react(choice.response).ok);
      const dm=c.metrics[c.actors.indexOf(defender)];dm.reactions[choice.response]=(dm.reactions[choice.response]||0)+1;
      this.player=actor;this.enemy=defender;this.phase=phase;
      this.result=defender.hp<=0?'win':actor.hp<=0?'lose':null;if(this.result)this.phase='over';
    }else this.resolveAttack(actor,skill,raw);
  }
  resolveAttack(actor,skill,raw,reduction=1){
    const target=this.other(actor),beforeHp=target.hp,beforeShield=target.shield,charge=target.charge,c=contexts.get(this),m=c.metrics[c.actors.indexOf(actor)];
    super.resolveAttack(actor,skill,raw,reduction);
    const hp=beforeHp-target.hp,shield=beforeShield-target.shield;m.hpDamage+=hp;m.shieldDamage+=shield;
    if(skill.kind==='charge'){const cm=chargeMetric(m,skill.id);cm.hpDamage+=hp;cm.shieldDamage+=shield;}
    if(charge&&!target.charge&&skill.interrupt)chargeMetric(c.metrics[c.actors.indexOf(target)],charge.id).interrupted++;
  }
  release(actor){
    const c=contexts.get(this),skill=actor.charge,cm=chargeMetric(c.metrics[c.actors.indexOf(actor)],skill.id);
    if(!skill.range.includes(this.distance))cm.outOfRange++;else cm.released++;
    return super.release(actor);
  }
}
export function createArena(a,b,{first=0,distance=1,prefs=['balanced','balanced'],trace=false,disableMajor}={}){
  assert.ok([0,1].includes(first));assert.ok([0,1,2].includes(distance));
  const initial=new Battle(a.key,normalizeLoadout(a.key,a.config));
  const second=new Battle(b.key,normalizeLoadout(b.key,b.config)).player;
  Object.setPrototypeOf(initial,ArenaBattle.prototype);initial.enemy=second;
  initial.player.name='甲';initial.enemy.name='乙';initial.distance=distance;initial.logs=[];initial.serial=0;
  const c={actors:[initial.player,initial.enemy],prefs,metrics:[metric(),metric()],first,trace:trace?[]:null};contexts.set(initial,c);
  if(disableMajor!==undefined)c.actors[disableMajor].major='test-disabled';
  return {battle:initial,context:c};
}
export function startRound(arena,round){
  const b=arena.battle;b.round=round;
  if(round>1)for(const a of arena.context.actors){a.ap=3;a.reaction=true;a.meditated=false;a.woodTriggered=false;a.igniteTriggered=false;a.quickTriggered=false;a.usedSkills=[];b.gain(a,CLASSES[a.key].gen);}
}
export function playPhase(arena,seat,{forceFirst,banCharge=false}={}){
  const b=arena.battle,c=arena.context,a=c.actors[seat],other=c.actors[1-seat],m=c.metrics[seat];
  b.player=a;b.enemy=other;b.phase='player';b.result=null;b.pending=null;
  b.tickBurn(a);if(a.hp<=0)return;if(a.charge)b.release(a);if(other.hp<=0)return;
  for(let n=0;n<8&&a.hp>0&&other.hp>0;n++){
    b.planEnemy();
    let choice;
    if(n===0&&forceFirst)choice={action:'skill',skillId:forceFirst};
    else if(banCharge){
      const copy=Object.assign(Object.create(Battle.prototype),JSON.parse(JSON.stringify(b)));copy.player.skillIds=copy.player.skillIds.filter(id=>copy.skill(copy.player,id)?.kind!=='charge');
      choice=chooseAction(copy,c.prefs[seat]);
    }else choice=chooseAction(b,c.prefs[seat]);
    assert.ok(choice);
    if(choice.action==='end'){m.unusedAP+=a.ap;if(a.charge){m.chargeUnusedAP+=a.ap;chargeMetric(m,a.charge.id).unusedAP+=a.ap;}b.expireEdge(a);break;}
    const s=b.skill(a,choice.skillId);assert.ok(s);const cost=s.ap,charged=s.kind==='charge';
    assert.equal(b.legal(a,s.id),null);assert.ok(b.act(a,s.id).ok);
    m.actions[s.id]=(m.actions[s.id]||0)+1;m.spentAP+=cost;if(charged)chargeMetric(m,s.id).started++;
    for(const actor of c.actors)validate(actor);
    if(n===7)throw Error('Phase did not terminate');
  }
}
export function finishArena(arena,round){
  const c=arena.context,winner=c.actors[0].hp<=0?1:c.actors[1].hp<=0?0:null;
  for(let i=0;i<2;i++)for(const metric of Object.values(c.metrics[i].charges))metric.unresolved=metric.started-metric.released-metric.interrupted-metric.outOfRange;
  return {winner,rounds:round,hp:c.actors.map(a=>a.hp),metrics:c.metrics,trace:c.trace};
}
export function duel(a,b,options={}){
  const arena=createArena(a,b,options),limit=options.limit??30;let round=0;
  for(round=1;round<=limit;round++){
    startRound(arena,round);
    for(const seat of [arena.context.first,1-arena.context.first]){playPhase(arena,seat);if(arena.context.actors.some(a=>a.hp<=0))return finishArena(arena,round);}
  }
  return finishArena(arena,limit);
}
export const build=(key,major,skillIds)=>({key,config:normalizeLoadout(key,{major,...(skillIds?{skillIds}:{})})});
export function tacticalCharge(key,major,{distance=1,ap=3,layers=2,defender='balanced',useCharge=true}={}){
  const own=build(key,major),chargeId=key==='fire'?'inferno':'unity';
  if(!own.config.skillIds.includes(chargeId))own.config.skillIds[own.config.skillIds.indexOf('nourish')]=chargeId;
  const enemyKey=key==='fire'?'sword':'fire',opponent=build(enemyKey,Object.keys(MAJORS[enemyKey])[0]);
  const arena=createArena(own,opponent,{distance,prefs:['balanced',defender]});const b=arena.battle,a=arena.context.actors[0],e=arena.context.actors[1];
  a.qi=key==='fire'?{fire:4,wood:2,water:0,metal:0,earth:0,any:1}:{metal:4,water:2,wood:0,fire:0,earth:0,any:1};a.ap=ap;
  if(key==='fire')e.burn=layers,e.burnTurns=layers?3:0;else a.intent=layers;
  const initialHp=[a.hp,e.hp];
  playPhase(arena,0,{forceFirst:useCharge?(key==='fire'?'inferno':'unity'):undefined,banCharge:!useCharge});
  if(arena.context.actors.every(actor=>actor.hp>0))playPhase(arena,1);
  if(arena.context.actors.every(actor=>actor.hp>0)){startRound(arena,2);playPhase(arena,0);}
  const result=finishArena(arena,b.round);
  return {...result,hpSwing:(initialHp[1]-e.hp)-(initialHp[0]-a.hp),initialHp};
}
