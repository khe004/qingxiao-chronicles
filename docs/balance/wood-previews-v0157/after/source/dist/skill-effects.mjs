// Presentation only: consume the live battle's recorded outcomes, never simulate.
import {CHARGED_ART} from './charged-effects-art.mjs';
const sides=['player','enemy'];
const sword='<path d="M0-38 4-25 3 12 10 15 10 18 2 17 2 27-2 27-2 17-10 18-10 15-3 12-4-25Z" fill="currentColor"/><path d="M0-30V12" stroke="#fff7d9" stroke-width="1"/>';
const fan=Array.from({length:7},(_,i)=>`<g transform="rotate(${(i-3)*23}) translate(0 -70)"><g class="unity-sword" style="--delay:${i*80}ms">${sword}</g></g>`).join('');
const chargeArt=`<svg viewBox="-150 -155 300 300"><circle class="unity-orbit" r="105"/><circle class="unity-inner" r="85"/>${fan}<ellipse class="unity-ground" cy="91" rx="75" ry="14"/></svg><span class="unity-caption">万剑归一<span>凝 剑 · 蓄 势</span></span>`;
const supported=id=>id==='unity'||Object.hasOwn(CHARGED_ART,id);
const artFor=id=>id==='unity'?chargeArt:`${CHARGED_ART[id].art}<span class="unity-caption">${CHARGED_ART[id].name}<span>${CHARGED_ART[id].subtitle}</span></span>`;
export function createSkillEffects(stage){
  const layer=document.createElement('div');layer.className='skill-effects';layer.setAttribute('aria-hidden','true');stage.append(layer);
  let current=null,cursor=0;const charges=new Map(),timers=new Set();
  const point=side=>{const s=stage.getBoundingClientRect(),a=stage.querySelector(`#${side}-art`).getBoundingClientRect();return {x:a.left+a.width/2-s.left,y:a.top+a.height*.48-s.top};};
  function positionCharges(){for(const [side,node] of charges){const p=point(side);node.style.left=`${p.x}px`;node.style.top=`${p.y}px`;}}
  const observer=new ResizeObserver(positionCharges);observer.observe(stage);
  stage.addEventListener('transitionend',positionCharges);
  function clear(){for(const timer of timers)clearTimeout(timer);timers.clear();charges.clear();layer.replaceChildren();}
  function transient(node,duration){layer.append(node);const timer=setTimeout(()=>{node.remove();timers.delete(timer);},duration);timers.add(timer);}
  function cast(side,event){
    const from=point(side),to=point(sides[1-sides.indexOf(side)]),dx=to.x-from.x,dy=to.y-from.y;
    const id=event.skillId,node=document.createElement('div');node.className=`charge-cast ${id}-cast ${side}`;node.dataset.skill=id;node.dataset.outcome=event.damage>0?'damage':'shield';
    node.style.left=`${from.x}px`;node.style.top=`${from.y}px`;node.style.setProperty('--flight-x',`${dx}px`);node.style.setProperty('--flight-y',`${dy}px`);node.style.setProperty('--heading',`${Math.atan2(dy,dx)*180/Math.PI+90}deg`);
    node.style.setProperty('--direction',dx<0?-1:1);
    node.innerHTML=id==='unity'?Array.from({length:5},(_,i)=>`<div class="unity-flight" style="--lane:${(i-2)*15}px;--delay:${i*45}ms"><svg viewBox="-12 -42 24 74">${sword}</svg></div>`).join('')+`<div class="unity-impact" style="left:${dx}px;top:${dy}px"><span class="unity-impact-ring"></span><span class="unity-impact-cut"></span>${Array.from({length:8},(_,i)=>`<i style="--angle:${i*45}deg"></i>`).join('')}</div>`:CHARGED_ART[id].cast({dx,dy});
    transient(node,id==='unity'?1500:1750);
  }
  function fade(side,id){const p=point(side),node=document.createElement('div');node.className=`charge-fizzle unity-fizzle ${id}-fizzle`;node.dataset.skill=id;node.style.left=`${p.x}px`;node.style.top=`${p.y}px`;node.innerHTML=artFor(id);transient(node,450);}
  return {
    sync(battle){
      if(current!==battle){clear();current=battle;cursor=0;}
      const events=(battle.events??[]).slice(cursor);cursor=battle.events?.length??0;
      for(const event of events){if(!supported(event.skillId))continue;if(event.type==='hit')cast(sides[event.seat],event);else if(['rangeMiss','interrupted'].includes(event.type))fade(sides[event.seat],event.skillId);}
      for(const side of sides){
        const id=battle[side].charge?.id??(side==='enemy'?battle.pending?.s.id:null),active=!battle.result&&supported(id);
        if(charges.has(side)&&(!active||charges.get(side).dataset.skill!==id)){const old=charges.get(side);if(events.some(e=>e.type==='canceled'&&e.seat===sides.indexOf(side)))fade(side,old.dataset.skill);old.remove();charges.delete(side);}
        if(active&&!charges.has(side)){const node=document.createElement('div');node.className=`charge-aura unity-charge ${id==='unity'?'':id+'-charge'} ${side}`;node.dataset.skill=id;node.innerHTML=artFor(id);charges.set(side,node);layer.append(node);}
      }
      positionCharges();
    },
    destroy(){clear();observer.disconnect();stage.removeEventListener('transitionend',positionCharges);layer.remove();}
  };
}
