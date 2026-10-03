// Offline experiment only. The browser still uses the fixed public enemy plan.
import assert from 'node:assert/strict';
import {Battle,CLASSES,total} from '../dist/engine.mjs';
import {startPreparedPhase,finishPreparedPhase} from '../dist/prepared.mjs';
import {planner} from './planner-internals.mjs';

export const CONTROLLERS=['legacy','immediate','script','adaptive','prepared'];
export const ADAPTIVE_CANDIDATE_LIMIT=12;
const contexts=new WeakMap();
class SimBattle extends Battle{
  log(text,type='normal'){
    this.serial++;const w=contexts.get(this);
    if(w?.record)w.trace.push({round:this.round,seat:w.seat,type,text});
  }
  attack(actor,skill,raw){
    const defender=this.other(actor),w=contexts.get(this),phase=this.phase;
    if(defender.reaction){
      this.player=defender;this.enemy=actor;this.phase='reaction';this.pending={s:skill,raw};
      // Same reaction policy as the old symmetric arena, including its script hint.
      this.planEnemy();
      const seat=w.actors.indexOf(defender),choice=planner.chooseReaction(this,w.prefs[seat]);
      assert.ok(super.react(choice.response).ok);
      if(w.record){const counts=w.metrics[seat].reactions;counts[choice.response]=(counts[choice.response]||0)+1;}
      this.player=actor;this.enemy=defender;this.phase=phase;
      this.result=defender.hp<=0?'win':actor.hp<=0?'lose':null;
      if(this.result)this.phase='over';
    }else this.resolveAttack(actor,skill,raw);
  }
}
const metric=()=>({actions:{},reactions:{},unusedAP:0});
export const winner=w=>w.actors[0].hp<=0?1:w.actors[1].hp<=0?0:null;
function bind(w,seat=w.seat){
  w.battle.player=w.actors[seat];w.battle.enemy=w.actors[1-seat];
  w.battle.result=winner(w)===null?null:winner(w)===seat?'win':'lose';
  w.battle.phase=w.battle.result?'over':w.ended?'between':'player';
  w.battle.pending=null;
}
export function createPredictiveArena(a,b,{first=0,distance=1,prefs=['balanced','balanced'],controllers=['legacy','legacy'],trace=false}={}){
  assert.ok([0,1].includes(first));assert.ok([0,1,2].includes(distance));
  assert.ok(prefs.length===2&&prefs.every(p=>Object.hasOwn(planner.TENDENCIES,p)));
  assert.ok(controllers.length===2&&controllers.every(c=>CONTROLLERS.includes(c)));
  const battle=new Battle(a.key,a.config),second=new Battle(b.key,b.config).player;
  Object.setPrototypeOf(battle,SimBattle.prototype);battle.enemy=second;battle.distance=distance;battle.logs=[];battle.serial=0;
  battle.player.name='甲';battle.enemy.name='乙';
  const w={battle,actors:[battle.player,battle.enemy],first,seat:first,ended:false,prefs:[...prefs],controllers:[...controllers],record:true,trace:[],metrics:[metric(),metric()],includeTrace:trace};
  contexts.set(battle,w);bind(w);battle.planEnemy();return w;
}
export function cloneWorld(w){
  const {logs,...state}=w.battle;
  const battle=Object.assign(Object.create(SimBattle.prototype),JSON.parse(JSON.stringify(state)),{logs:[]});
  // Search and forecast clones are always made between synchronous attacks.
  assert.equal(w.battle.pending,null);
  const actors=w.battle.player===w.actors[0]?[battle.player,battle.enemy]:[battle.enemy,battle.player];
  const copy={...w,battle,actors,prefs:[...w.prefs],controllers:[...w.controllers],record:false,trace:[],metrics:[metric(),metric()]};
  contexts.set(battle,copy);return copy;
}
export function worldState(w){return {round:w.battle.round,first:w.first,seat:w.seat,ended:w.ended,distance:w.battle.distance,winner:winner(w),actors:structuredClone(w.actors)};}
function stateKey(w){return JSON.stringify([worldState(w),w.battle.enemyQueue,w.battle.enemyPlan]);}
export function actWorld(w,id){
  assert.ok(!w.ended&&winner(w)===null);const b=w.battle;
  const result=b.act(b.player,id);
  if(result.ok&&w.record){const counts=w.metrics[w.seat].actions;counts[id]=(counts[id]||0)+1;}
  if(result.ok)for(const a of w.actors){assert.ok(a.ap>=0&&a.ap<=3);assert.ok(total(a.qi)<=10);assert.ok(Object.values(a.qi).every(n=>Number.isInteger(n)&&n>=0));}
  return result;
}
export function endPhase(w){
  assert.ok(!w.ended&&winner(w)===null);
  if(w.record)w.metrics[w.seat].unusedAP+=w.actors[w.seat].ap;
  w.battle.expireEdge(w.actors[w.seat]);w.battle.clearChill(w.actors[w.seat],'行动结束');finishPreparedPhase(w.battle,w.actors[w.seat]);w.ended=true;bind(w);
}
export function advancePhase(w){
  assert.ok(w.ended&&winner(w)===null);
  if(w.seat!==w.first){
    w.battle.round++;
    for(const a of w.actors)w.battle.resetActor(a);
  }
  w.seat=1-w.seat;w.ended=false;bind(w);
  const a=w.actors[w.seat];startPreparedPhase(w.battle,a);w.battle.tickBurn(a);
  if(winner(w)===null&&a.charge)w.battle.release(a);
  if(winner(w)===null)w.battle.planEnemy();
}
function asPerspective(w,seat){
  const b=Object.assign(Object.create(Battle.prototype),w.battle);
  b.player=w.actors[seat];b.enemy=w.actors[1-seat];
  b.result=winner(w)===null?null:winner(w)===seat?'win':'lose';return b;
}
function announcedActorQueue(w){
  const b=w.battle,[p,e]=[b.player,b.enemy];b.player=e;b.enemy=p;b.planEnemy();
  const queue=[...b.enemyQueue];b.player=p;b.enemy=e;return queue;
}
function playScript(w){
  const queue=announcedActorQueue(w);
  for(const id of queue){if(winner(w)!==null)break;actWorld(w,id);}
  if(winner(w)===null)endPhase(w);
}
export function forecastWorld(w,{mode='adaptive',depth=0,horizon='next-player'}={}){
  assert.ok(['script','adaptive'].includes(mode));assert.ok(Number.isInteger(depth)&&depth>=0&&depth<=1);
  assert.ok(['enemy-end','next-player'].includes(horizon));
  const copy=cloneWorld(w),origin=w.seat;
  if(winner(copy)!==null)return {world:copy,future:asPerspective(copy,origin),enemyEnd:worldState(copy),assumedController:null};
  if(!copy.ended)endPhase(copy);advancePhase(copy);
  const foeController=copy.controllers[copy.seat];
  // One decision layer: an adaptive opponent at the boundary uses immediate score.
  // Known legacy/immediate/script controllers can be executed without recursion.
  const assumed=mode==='script'?'fixed-script':['adaptive','prepared'].includes(foeController)&&depth===0?'immediate':foeController;
  if(winner(copy)===null){
    if(mode==='script')playScript(copy);
    else playCurrentPhase(copy,{controller:assumed,depth});
  }
  const enemyEnd=worldState(copy);
  if(horizon==='next-player'&&winner(copy)===null)advancePhase(copy);
  return {world:copy,future:asPerspective(copy,origin),enemyEnd,assumedController:assumed};
}
export function chooseArenaAction(w,{controller=w.controllers[w.seat],depth=1}={}){
  assert.ok(CONTROLLERS.includes(controller));assert.ok(depth===0||depth===1);
  const b=w.battle,tendency=w.prefs[w.seat];
  if(winner(w)!==null||w.ended)return null;
  if(controller==='legacy')return planner.chooseAction(b,tendency);
  if(controller==='prepared')return planner.choosePreparedAction(b,tendency,{
    clone:s=>cloneWorld(contexts.get(s)).battle,
    project:s=>forecastWorld(contexts.get(s),{mode:'script',depth:0}).world.battle,
  });
  if(b.player.ap===0)return {action:'end',reason:'行动点已用尽。'};
  const mode=controller==='adaptive'&&depth===0?'immediate':controller;
  const visited=new Set(),candidates=[];let best={score:-Infinity,path:[]};
  function search(leaf,path){
    const key=stateKey(leaf);if(visited.has(key))return;visited.add(key);
    if(mode==='adaptive'){
      candidates.push({leaf,path,score:planner.planScore(b,leaf.battle,tendency,path,leaf.battle)});
    }
    let future=leaf.battle;
    if(mode==='script'&&winner(leaf)===null){
      future=forecastWorld(leaf,{mode,depth:0}).future;
    }
    if(mode!=='adaptive'){
      const score=planner.planScore(b,leaf.battle,tendency,path,future);
      if(score>best.score)best={score,path};
    }
    if(winner(leaf)!==null||leaf.battle.player.ap===0||path.length>=3)return;
    for(const s of planner.options(leaf.battle,tendency)){
      const next=cloneWorld(leaf);if(actWorld(next,s.id).ok)search(next,[...path,s.id]);
    }
  }
  search(cloneWorld(w),[]);
  if(mode==='adaptive'){
    // Reserve tactical candidates so immediate ranking cannot discard every charge,
    // recovery or movement response before enemy-phase evaluation.
    const ranked=candidates.toSorted((a,b)=>b.score-a.score),selected=[];
    const add=c=>{if(c&&!selected.includes(c))selected.push(c);};
    add(candidates.find(c=>c.path.length===0));
    for(const test of [
      c=>Boolean(c.leaf.battle.player.charge),
      c=>c.path.some(id=>['heal','purify'].includes(w.battle.skill(w.battle.player,id)?.kind)),
      c=>c.path.some(id=>w.battle.skill(w.battle.player,id)?.kind==='move'),
      c=>c.path.some(id=>w.battle.skill(w.battle.player,id)?.kind==='guard'),
      c=>c.path.some(id=>w.battle.skill(w.battle.player,id)?.interrupt),
    ])add(ranked.find(test));
    for(const c of ranked){if(selected.length>=ADAPTIVE_CANDIDATE_LIMIT)break;add(c);}
    for(const {leaf,path} of selected){
      const future=winner(leaf)===null?forecastWorld(leaf,{mode:'adaptive',depth:0}).future:leaf.battle;
      const score=planner.planScore(b,leaf.battle,tendency,path,future);
      if(score>best.score)best={score,path};
    }
  }
  const id=best.path[0];
  return id?{action:'skill',skillId:id,reason:planner.reasonFor(b,id)}:{action:'end',reason:'在当前预测范围内，继续行动收益较低。'};
}
export function playCurrentPhase(w,{controller=w.controllers[w.seat],depth=1}={}){
  for(let steps=0;winner(w)===null&&!w.ended;steps++){
    assert.ok(steps<8,'Controller phase did not terminate');w.battle.planEnemy();
    const choice=chooseArenaAction(w,{controller,depth});assert.ok(choice);
    if(choice.action==='end')endPhase(w);
    else{assert.ok(actWorld(w,choice.skillId).ok);}
  }
}
export function predictiveDuel(a,b,{limit=30,...options}={}){
  const w=createPredictiveArena(a,b,options);
  while(w.battle.round<=limit&&winner(w)===null){
    playCurrentPhase(w);if(winner(w)!==null||(w.battle.round===limit&&w.seat!==w.first))break;
    advancePhase(w);
  }
  return {winner:winner(w),rounds:w.battle.round,hp:w.actors.map(a=>a.hp),metrics:w.metrics,trace:w.includeTrace?w.trace:null};
}
