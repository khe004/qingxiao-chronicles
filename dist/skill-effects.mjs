// Presentation only: consume the live battle's recorded outcomes, never simulate.
const sides=['player','enemy'];
const sword='<path d="M0-38 4-25 3 12 10 15 10 18 2 17 2 27-2 27-2 17-10 18-10 15-3 12-4-25Z" fill="currentColor"/><path d="M0-30V12" stroke="#fff7d9" stroke-width="1"/>';
const fan=Array.from({length:7},(_,i)=>`<g transform="rotate(${(i-3)*23}) translate(0 -70)"><g class="unity-sword" style="--delay:${i*80}ms">${sword}</g></g>`).join('');
const chargeArt=`<svg viewBox="-150 -155 300 300"><circle class="unity-orbit" r="105"/><circle class="unity-inner" r="85"/>${fan}<ellipse class="unity-ground" cy="91" rx="75" ry="14"/></svg><span class="unity-caption">万剑归一<span>凝 剑 · 蓄 势</span></span>`;
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
    const node=document.createElement('div');node.className=`unity-cast ${side}`;node.dataset.outcome=event.damage>0?'damage':'shield';
    node.style.left=`${from.x}px`;node.style.top=`${from.y}px`;node.style.setProperty('--flight-x',`${dx}px`);node.style.setProperty('--flight-y',`${dy}px`);node.style.setProperty('--heading',`${Math.atan2(dy,dx)*180/Math.PI+90}deg`);
    node.innerHTML=Array.from({length:5},(_,i)=>`<div class="unity-flight" style="--lane:${(i-2)*15}px;--delay:${i*45}ms"><svg viewBox="-12 -42 24 74">${sword}</svg></div>`).join('')+`<div class="unity-impact" style="left:${dx}px;top:${dy}px"><span class="unity-impact-ring"></span><span class="unity-impact-cut"></span>${Array.from({length:8},(_,i)=>`<i style="--angle:${i*45}deg"></i>`).join('')}</div>`;
    transient(node,1500);
  }
  function fade(side){const p=point(side),node=document.createElement('div');node.className='unity-fizzle';node.style.left=`${p.x}px`;node.style.top=`${p.y}px`;node.innerHTML=chargeArt;transient(node,450);}
  return {
    sync(battle){
      if(current!==battle){clear();current=battle;cursor=0;}
      const events=(battle.events??[]).slice(cursor);cursor=battle.events?.length??0;
      for(const event of events){if(event.skillId!=='unity')continue;if(event.type==='hit')cast(sides[event.seat],event);else if(['rangeMiss','interrupted'].includes(event.type))fade(sides[event.seat]);}
      for(const side of sides){
        const active=!battle.result&&(battle[side].charge?.id==='unity'||(side==='enemy'&&battle.pending?.s.id==='unity'));
        if(active&&!charges.has(side)){const node=document.createElement('div');node.className=`unity-charge ${side}`;node.innerHTML=chargeArt;charges.set(side,node);layer.append(node);}
        if(!active&&charges.has(side)){if(events.some(e=>e.type==='canceled'&&e.seat===sides.indexOf(side)))fade(side);charges.get(side).remove();charges.delete(side);}
      }
      positionCharges();
    },
    destroy(){clear();observer.disconnect();stage.removeEventListener('transitionend',positionCharges);layer.remove();}
  };
}
