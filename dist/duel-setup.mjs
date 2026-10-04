import {Battle,CLASSES,MAJORS,normalizeLoadout} from './engine.mjs';
import {RecordedBattle} from './recorded-battle.mjs';

export const GENDERS={male:'男',female:'女'};
const portraitClass={fire:'firewood',sword:'sword',flame:'flame',water:'water',wood:'wood',earth:'earth'};
export function portraitPath(key,gender){
  if(!Object.hasOwn(portraitClass,key)||!Object.hasOwn(GENDERS,gender))throw Error('立绘选择无效');
  return `assets/characters/${portraitClass[key]}-${gender}.webp`;
}
export function normalizeDuel(config){
  const result={};
  for(const side of ['player','enemy']){
    const a=config?.[side];
    if(!a||!Object.hasOwn(GENDERS,a.gender))throw Error('请选择双方立绘');
    result[side]={key:a.key,...normalizeLoadout(a.key,a),gender:a.gender};
  }
  return result;
}

// Simulate the chosen six skills so every custom loadout has a legal public plan.
// The real turn retains that plan, skipping invalid moves after player responses.
export class DuelBattle extends RecordedBattle{
  constructor(...args){super(...args);this.customDuel=true;this.limit=30;}
  planEnemy(){
    if(['wood','earth'].includes(this.enemy.key))return super.planEnemy();
    const state=Object.assign(Object.create(Battle.prototype),structuredClone({...this,logs:[]}),{phase:'enemy',pending:null});
    state.attack=function(a,s,raw){this.resolveAttack(a,s,raw);};
    const e=state.enemy,order={
      fire:e.major==='sustain'?['heal','nourish','seed','blaze','ember','spark']:['seed','blaze','ember','spark','heal'],
      sword:['expose','swift','strike','return','lunge','guard'],
      flame:e.major==='smolder'?['kindle','combust','cinder','flare','firewall']:['kindle','eruption','flare','cinder','firewall'],
      water:e.major==='cold'?['rinse','frost','repulse','waterbolt','gather','surge','waterwall']:['rinse','gather','surge','waterbolt','ebb','waterwall'],
    }[e.key];
    if(this.round%3===0)order.unshift({fire:'inferno',sword:'unity',flame:'solar'}[e.key]);
    if(e.key==='sword'&&this.distance===2)order.unshift('near');
    if(state.player.charge)order.unshift(...this.skills(e).filter(s=>s.interrupt).map(s=>s.id));
    const chosen=[];
    for(const id of [...order,...e.skillIds,'basic','basic','basic']){
      if(!id||!e.ap||state.result)continue;
      const s=state.skill(e,id);if(!s||state.legal(e,id))continue;
      if(s.kind==='heal'&&e.hp===e.maxHp&&!e.burn)continue;
      if(s.chill&&state.player.chilled)continue;
      if(s.id==='expose'&&state.player.broken)continue;
      if(s.interrupt&&!s.power&&!state.player.charge)continue;
      if(state.act(e,id).ok)chosen.push(id);
    }
    this.enemyPlan=chosen;this.enemyQueue=[...chosen];
  }
}

export function createDuelSetup({getConfig,onApply,onPause,onResume,rangeLabel}){
  const $=id=>document.getElementById(id),dialog=$('duel-dialog');
  let draft,resumePending=false;
  function resume(){if(resumePending){resumePending=false;onResume();}}
  function renderSide(side,focus){
    const a=draft[side],c=CLASSES[a.key],major=MAJORS[a.key][a.major],count=a.skillIds.length,box=$(`duel-${side}`);
    box.innerHTML=`<div class="duel-config-heading"><h3>${side==='player'?'左方 · 你':'右方 · AI 对手'}</h3><span>${c.sect}</span></div>
      <div class="portrait-choices" role="group" aria-label="${side==='player'?'左方':'右方'}立绘">${Object.entries(GENDERS).map(([gender,label])=>`<button type="button" class="portrait-choice ${a.gender===gender?'selected':''}" data-portrait="${gender}" data-side="${side}" aria-pressed="${a.gender===gender}"><img src="${portraitPath(a.key,gender)}" alt="${c.name} · ${label}立绘"><span>${label}立绘${a.gender===gender?' · 已选':''}</span></button>`).join('')}</div>
      <div class="duel-config-selects"><label>职业<select data-duel-class="${side}">${Object.entries(CLASSES).map(([key,value])=>`<option value="${key}" ${key===a.key?'selected':''}>${value.name}</option>`).join('')}</select></label><label>主修功法<select data-duel-major="${side}">${Object.entries(MAJORS[a.key]).map(([id,m])=>`<option value="${id}" ${id===a.major?'selected':''}>${m.name}</option>`).join('')}</select></label></div>
      <p class="duel-major-effect">${major.effect}</p>
      <div class="duel-config-heading"><h4>神通 · 八选六</h4><span role="status" aria-live="polite">已装 ${count} / 6</span></div>
      <div class="duel-skill-choices" role="group" aria-label="${side==='player'?'左方':'右方'}神通">${c.skills.map(s=>{const selected=a.skillIds.includes(s.id);return `<button type="button" data-duel-equip="${s.id}" data-side="${side}" class="duel-equip ${selected?'selected':''}" aria-pressed="${selected}" ${!selected&&count===6?'disabled':''} title="${s.desc} 有效距离：${rangeLabel(s)}"><b>${s.name}</b><span>${selected?'已装备':'未装备'} · ${s.kind==='reaction'?'应对':s.ap+' 行动'}</span></button>`;}).join('')}</div>
      <div class="duel-recommend"><span>${count===6?'先卸下一道，再装入新神通。':`还需装备 ${6-count} 道神通。`}</span><button type="button" class="quiet" data-duel-recommend="${side}">推荐搭配</button></div>`;
    $('apply-duel').disabled=['player','enemy'].some(s=>draft[s].skillIds.length!==6);
    $('duel-error').textContent='';
    if(focus)box.querySelector(focus)?.focus({preventScroll:true});
  }
  function close(){dialog.close();resume();}
  function open(){
    draft=normalizeDuel(getConfig());onPause();resumePending=true;
    renderSide('player');renderSide('enemy');dialog.showModal();$('duel-body').scrollTop=0;
  }
  dialog.addEventListener('change',event=>{
    const el=event.target,side=el.dataset.duelClass??el.dataset.duelMajor;if(!side)return;
    const old=draft[side],key=el.dataset.duelClass?el.value:old.key;
    draft[side]={key,...normalizeLoadout(key,el.dataset.duelMajor?{major:el.value}:{}),gender:old.gender};
    renderSide(side,el.dataset.duelClass?'[data-duel-class]':'[data-duel-major]');
  });
  dialog.addEventListener('click',event=>{
    const el=event.target.closest('button');if(!el||el.disabled)return;
    const side=el.dataset.side;
    if(el.dataset.portrait){draft[side].gender=el.dataset.portrait;renderSide(side,`[data-portrait="${el.dataset.portrait}"]`);}
    if(el.dataset.duelEquip){const ids=draft[side].skillIds,id=el.dataset.duelEquip,index=ids.indexOf(id);if(index>=0)ids.splice(index,1);else if(ids.length<6)ids.push(id);renderSide(side,`[data-duel-equip="${id}"]`);}
    if(el.dataset.duelRecommend){const s=el.dataset.duelRecommend,a=draft[s];draft[s]={...a,...normalizeLoadout(a.key,{major:a.major})};renderSide(s,'[data-duel-recommend]');}
    if(el.id==='cancel-duel'||el.id==='close-duel')close();
    if(el.id==='apply-duel'){try{const next=normalizeDuel(draft);onApply(next);close();}catch(error){$('duel-error').textContent=error.message;}}
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',resume);
  return {open,isOpen:()=>dialog.open};
}
