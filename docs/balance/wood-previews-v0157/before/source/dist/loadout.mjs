import {CLASSES,MAJORS,normalizeLoadout} from './engine.mjs';
import {TACTICAL_LOADOUTS} from './tactics.mjs';
import {buildProfiles,buildOptions,buildGuide} from './builds.mjs';

export function createLoadoutEditor({getBattle,onApply,onPause,onResume,rangeLabel,costHtml,getPreparation=()=>null}){
  const $=id=>document.getElementById(id),dialog=$('loadout-dialog');
  let key='fire',draft=null,resumePending=false;
  function resume(){if(!resumePending)return;resumePending=false;onResume();}
  function close(){if(getPreparation()){const p=getBattle().player;onApply(p.key,{major:p.major,skillIds:[...p.skillIds]});}dialog.close();resume();}
  function recommended(nextKey,major=Object.keys(MAJORS[nextKey])[0]){
    key=nextKey;draft=normalizeLoadout(key,{major});
  }
  function render(focus){
    const prep=getPreparation();$('loadout-title').textContent=prep?`备战 · ${prep.name} · ${prep.title}`:'择一门主修，备六道神通。';
    $('apply-loadout').textContent=prep?'应用配置 · 入场论道':'应用配置 · 开启新局';
    $('loadout-footer-note').textContent=prep?'本场恢复全部气血与灵气。关闭配装将沿用当前配置入场；已完成场次的纪要保留。':'应用配置将开启新一场斗法，并清空当前面板纪要。';
    const c=CLASSES[key],major=MAJORS[key][draft.major],count=draft.skillIds.length;
    $('loadout-classes').innerHTML=Object.entries(CLASSES).map(([id,value])=>`<button class="loadout-class ${id===key?'active':''}" data-loadout-class="${id}" aria-pressed="${id===key}">${value.name}</button>`).join('');
    $('major-choices').innerHTML=Object.entries(MAJORS[key]).map(([id,m])=>`<button class="major-choice ${id===draft.major?'active':''}" data-major="${id}" aria-pressed="${id===draft.major}"><span class="major-symbol" aria-hidden="true">${m.symbol}</span><span><b>${m.name}</b><small>${m.focus}</small><span class="major-effect">${m.effect}</span></span><span class="major-selected">${id===draft.major?'已主修':'选择'}</span></button>`).join('');
    $('loadout-passive').textContent=`基础心法 · ${c.passive}：${c.passiveText}`;
    $('loadout-count').textContent=`已装 ${count} / 6`;
    $('loadout-hint').textContent=count===6?'六个槽位已满。先卸下一个，再装入新神通。':`还需装备 ${6-count} 个神通，才能入场。`;
    $('loadout-slots').innerHTML=Array.from({length:6},(_,i)=>`<span class="loadout-slot ${draft.skillIds[i]?'filled':''}"><b>${i+1}</b>${draft.skillIds[i]?c.skills.find(s=>s.id===draft.skillIds[i]).name:'待装入'}</span>`).join('');
    $('loadout-skills').innerHTML=c.skills.map(s=>{
      const selected=draft.skillIds.includes(s.id);
      return `<button class="loadout-skill ${selected?'selected':''}" data-equip="${s.id}" aria-pressed="${selected}" aria-label="${s.name}，${selected?'已装备，点击卸下':'未装备，点击装入'}，有效距离：${rangeLabel(s)}。${s.desc}" ${!selected&&count===6?'disabled':''} style="--element:var(--${s.element})"><span class="loadout-skill-head"><span class="skill-symbol" aria-hidden="true">${s.symbol}</span><b>${s.name}</b><span class="equip-mark">${selected?'已装备':'未装备'}</span></span><span class="loadout-desc">${s.desc}</span><span class="loadout-range">有效：${rangeLabel(s)}</span><span class="loadout-cost">${s.kind==='reaction'?'应对':s.ap+' 行动'} <span class="cost-separator">|</span> ${costHtml(s.cost)}${s.intentCost?` <span class="intent-price">＋ ${s.intentCost} 剑意</span>`:''}</span></button>`;
    }).join('');
    $('loadout-style-tip').textContent=major.tip;
    $('build-select').innerHTML=buildOptions(key,draft);
    $('build-guide').innerHTML=buildGuide(key,draft);
    $('apply-loadout').disabled=count!==6;
    $('loadout-error').textContent='';
    if(focus)dialog.querySelector(focus)?.focus({preventScroll:true});
  }
  function open(nextKey=getBattle().player.key){
    const p=getBattle().player;
    if(nextKey===p.key){key=p.key;draft={major:p.major,skillIds:[...p.skillIds]};}else recommended(nextKey);
    onPause();resumePending=true;render();dialog.showModal();$('loadout-body').scrollTop=0;
  }
  dialog.addEventListener('change',event=>{
    if(event.target.id!=='build-select')return;
    const profile=buildProfiles(key,draft.major).find(p=>p.id===event.target.value);
    if(profile){draft={major:profile.major,skillIds:[...profile.skillIds]};render('#build-select');}
  });
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.loadoutClass&&button.dataset.loadoutClass!==key){recommended(button.dataset.loadoutClass);render(`[data-loadout-class="${key}"]`);}
    if(button.dataset.major&&button.dataset.major!==draft.major){recommended(key,button.dataset.major);render(`[data-major="${draft.major}"]`);}
    if(button.dataset.equip){const id=button.dataset.equip,index=draft.skillIds.indexOf(id);if(index>=0)draft.skillIds.splice(index,1);else if(draft.skillIds.length<6)draft.skillIds.push(id);render(`[data-equip="${id}"]`);}
    if(button.id==='recommend-loadout'){recommended(key,draft.major);render('#recommend-loadout');}
    if(button.id==='tactical-loadout'){draft=normalizeLoadout(key,{major:draft.major,skillIds:TACTICAL_LOADOUTS[key][draft.major]});render('#tactical-loadout');}
    if(button.id==='close-loadout'||button.id==='cancel-loadout')close();
    if(button.id==='apply-loadout'){
      try{const config=normalizeLoadout(key,draft);onApply(key,config);dialog.close();resume();}catch(error){$('loadout-error').textContent=error.message;}
    }
  });
  dialog.addEventListener('close',()=>{if(!dialog.open)resume();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  return {open,isOpen:()=>dialog.open};
}
