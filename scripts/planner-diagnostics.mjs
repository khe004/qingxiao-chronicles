// Read-only audit of the frozen adaptive controller; never changes its policy.
import assert from 'node:assert/strict';

export function diagnose(c,w){
  const {runtime:r,planner:p,engine:e}=c,b=w.battle,tendency=w.prefs[w.seat],before=JSON.stringify(w),pressure=Math.max(0,b.round-8)*.07;
  assert.equal(w.controllers[w.seat],'adaptive');assert.equal(r.winner(w),null);assert.ok(!w.ended&&b.player.ap>0);
  const visited=new Set(),candidates=[];
  function search(leaf,path){
    const key=JSON.stringify([r.worldState(leaf),leaf.battle.enemyQueue,leaf.battle.enemyPlan]);
    if(visited.has(key))return;visited.add(key);
    candidates.push({leaf,path,immediate:p.planScore(b,leaf.battle,tendency,path,leaf.battle)});
    if(r.winner(leaf)!==null||leaf.battle.player.ap===0||path.length>=3)return;
    for(const s of p.options(leaf.battle,tendency)){
      const next=r.cloneWorld(leaf);if(r.actWorld(next,s.id).ok)search(next,[...path,s.id]);
    }
  }
  search(r.cloneWorld(w),[]);
  const ranked=candidates.toSorted((a,b)=>b.immediate-a.immediate),selected=[],reasons=new Map();
  function add(c,reason){if(c&&!selected.includes(c)){selected.push(c);reasons.set(c,reason);}}
  add(candidates.find(c=>c.path.length===0),'stop');
  const reserved=[
    ['charge',c=>Boolean(c.leaf.battle.player.charge)],
    ['recovery',c=>c.path.some(id=>['heal','purify'].includes(b.skill(b.player,id)?.kind))],
    ['move',c=>c.path.some(id=>b.skill(b.player,id)?.kind==='move')],
    ['guard',c=>c.path.some(id=>b.skill(b.player,id)?.kind==='guard')],
    ['interrupt',c=>c.path.some(id=>b.skill(b.player,id)?.interrupt)],
  ];
  for(const [reason,test] of reserved)add(ranked.find(test),reason);
  for(const c of ranked){if(selected.length>=r.ADAPTIVE_CANDIDATE_LIMIT)break;add(c,'rank');}
  let best={score:-Infinity,path:[]},unlimited={score:-Infinity,path:[]};
  const rows=[];
  // Selected order matters for ties. Evaluate those first, then audit discarded leaves.
  for(const candidate of [...selected,...candidates.filter(c=>!selected.includes(c))]){
    const {leaf,path}=candidate,forecast=r.winner(leaf)===null?r.forecastWorld(leaf,{mode:'adaptive',depth:0}):null;
    const future=forecast?.future??leaf.battle,score=p.planScore(b,leaf.battle,tendency,path,future);
    const t=p.TENDENCIES[tendency];
    let components=null;
    if(!leaf.battle.result&&!future.result){
      components={damage:(b.enemy.hp-future.enemy.hp)*(t.attack+pressure),health:(future.player.hp-b.player.hp)*t.health,
        ownShield:(future.player.shield-b.player.shield)*t.shield,enemyShield:(b.enemy.shield-future.enemy.shield)*t.shield*c.ratio,
        intent:(future.player.intent-b.player.intent)*t.intent,edge:(Number(future.player.edge)-Number(b.player.edge))*8,
        seed:(future.enemy.seed-b.enemy.seed)*t.seed,burn:(future.enemy.burn-b.enemy.burn)*t.burn,
        broken:(Number(future.enemy.broken)-Number(b.enemy.broken))*t.broken,qi:(e.total(future.player.qi)-e.total(b.player.qi))*.35,
        charge:leaf.battle.player.charge?t.charge:0,path:-path.length*.2};
      assert.ok(Math.abs(Object.values(components).reduce((a,v)=>a+v,0)-score)<1e-8,'Score breakdown disagrees with frozen scorer');
    }
    const isSelected=selected.includes(candidate);
    if(isSelected&&score>best.score)best={score,path};if(score>unlimited.score)unlimited={score,path};
    rows.push({path,rank:ranked.indexOf(candidate)+1,selected:isSelected,reserved:reasons.get(candidate)??null,immediate:candidate.immediate,score,components,
      leaf:r.worldState(leaf),future:forecast?r.worldState(forecast.world):r.worldState(leaf),assumedController:forecast?.assumedController??null});
  }
  const actual=r.chooseArenaAction(w);
  assert.equal(actual.action,best.path.length?'skill':'end');if(best.path.length)assert.equal(actual.skillId,best.path[0]);
  assert.equal(JSON.stringify(w),before,'Diagnostics changed the real world');
  const allowed=new Set(p.options(b,tendency).map(s=>s.id));
  const filters=[...b.skills(b.player),...e.COMMON].map(s=>({id:s.id,legalError:b.legal(b.player,s.id),allowed:allowed.has(s.id)}));
  return {state:r.worldState(w),variant:c.id,ratio:c.ratio,tendency,pressure,filters,candidates:rows,selectedCount:selected.length,totalCount:candidates.length,best,unlimited,actual,
    missedGain:unlimited.score-best.score,changesFirstAction:(unlimited.path[0]??null)!==(best.path[0]??null)};
}
