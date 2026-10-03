import {Battle,CLASSES,burnBonus,MAJORS,COMMON,ELEMENTS,ELEMENT_NAMES,total,payment} from './engine.mjs';
import {ChallengeBattle} from './challenge-battle.mjs';
import {OPPONENTS,ROUTES,DIFFICULTIES} from './opponents.mjs';
import {Trial,resultLabel,recordText,historyText} from './trial.mjs';
import {createLoadoutEditor} from './loadout.mjs';
import {TENDENCIES,SPEEDS,chooseAction,chooseReaction,describeAutoChoice} from './auto.mjs';
const $=id=>document.getElementById(id);
let battle=new Battle('fire'),generation=0,lastHit=0,lastLog=0,combatTimer=null;
const automation={enabled:false,tendency:'balanced',speed:'normal'};
const guide=$('guide-dialog'),reaction=$('reaction-dialog'),trialDialog=$('trial-dialog'),historyDialog=$('history-dialog');
const trial=new Trial();let selectedRoute='sword',selectedDifficulty='practice',practiceDifficulty='practice',practiceOpponent=null,pendingOpponent=null;
function pauseCombat(){generation++;clearTimeout(combatTimer);combatTimer=null;if(reaction.open)reaction.close();}
const loadout=createLoadoutEditor({getBattle:()=>battle,onApply:(key,config)=>reset(key,config),onPause:pauseCombat,onResume:()=>{if(trial.status==='preparing'||pendingOpponent)reset();render();scheduleCombat();},getPreparation:()=>OPPONENTS[trial.status==='preparing'?trial.opponentId:pendingOpponent],rangeLabel,costHtml});

function costHtml(cost){return Object.entries(cost).map(([k,n])=>`<span class="cost-element" style="--element:var(--${k})">${n} ${k==='any'?'任意':ELEMENT_NAMES[k]}</span>`).join('<span class="cost-separator">·</span>')||'<span>无需灵气</span>';}
function rangeLabel(skill){
  if(['heal','guard','purify','dispel','meditate','tide','ebb'].includes(skill.kind))return '自身 · 不限距离';
  return (skill.range||[0,1,2]).map(distance=>['近身','中距','远距'][distance]).join(' / ');
}
function fighterHtml(a,player){const c=CLASSES[a.key];let states=[];if(a.chilled)states.push('<span class="status-chip chill" title="一次凝滞：主动移动或净息可消解，下次自身行动结束消散">凝滞 · 可解</span>');if(a.key==='water')states.push(`<span class="status-chip tide" title="潮势上限3，攻击、防护和回潮共同消耗">潮势 ${a.tide} / 3</span>`);if(a.intent)states.push(`<span class="status-chip intent" title="每层剑意为重剑增加8基础伤害">剑意 ${a.intent}</span>`);if(a.seed)states.push(`<span class="status-chip seed" title="每层灵种使焚炎术增伤20%">灵种 ${a.seed}</span>`);if(a.burn)states.push(`<span class="status-chip burn" title="每层每次灼烧结算扣4气血，剩余${a.burnTurns}次结算">灼烧 ${a.burn} · ${a.burnTurns}回合</span>`);if(a.broken)states.push('<span class="status-chip" title="下一次重剑伤害提高25%">破绽</span>');if(a.edge)states.push(`<span class="status-chip charge" title="下一次重剑增加12基础伤害，至第${a.edgeExpires}回合己方行动结束失效">藏锋 +12</span>`);if(a.charge)states.push(`<span class="status-chip charge">蓄势 · ${a.charge.name}</span>`);return `<div class="fighter-heading"><span class="side-tag">${player?'你':'对手'}</span><h2>${player?'无名道友':a.name}</h2><span class="fighter-sect">${c.sect}</span></div><div class="fighter-major">${MAJORS[a.key][a.major].name}</div><div class="hp-line"><span>${c.name} · 气血</span><b>${a.hp} <span>/ ${a.maxHp}</span></b></div><div class="hp-track" role="meter" aria-label="${player?'你的':'对手'}气血" aria-valuemin="0" aria-valuemax="${a.maxHp}" aria-valuenow="${a.hp}"><div class="hp-fill" style="--hp:${a.hp/a.maxHp*100}%"></div></div><div class="shield-line">${a.shield?`护盾 ${a.shield}`:'护盾 —'} <span>· ${a.reaction?'应对可用':'应对已用'}</span></div><div class="statuses">${states.join('')}</div>`;}
function render(){
  const b=battle,p=b.player,e=b.enemy,c=CLASSES[p.key],major=MAJORS[p.key][p.major];
  $('current-major').textContent=`${c.name} · ${major.name}`;
  $('current-loadout').textContent=b.skills(p).map(s=>s.name).join(' · ');
  if(b.result){automation.enabled=false;if(b.opponentId)trial.finish(b);}
  renderTrial();
  $('auto-toggle').textContent=automation.enabled?'暂停自动 · 转手动':'开启自动战斗';
  $('auto-toggle').setAttribute('aria-pressed',String(automation.enabled));
  $('auto-toggle').disabled=!!b.result;
  $('auto-tendency').value=automation.tendency;$('auto-speed').value=automation.speed;
  $('auto-status').textContent=b.result?'本场斗法已结束':automation.enabled?`${TENDENCIES[automation.tendency].name} · 自动出招与应对中`:'可随时暂停，切回手动出招';
  $('auto-description').textContent=`${TENDENCIES[automation.tendency].description}选择理由会写入斗法纪要。`;
  $('player-info').innerHTML=fighterHtml(p,true);$('enemy-info').innerHTML=fighterHtml(e,false);
  document.querySelector('.arena').dataset.distance=b.distance;
  $('round-label').textContent=`第 ${String(b.round).padStart(2,'0')} 回合`;
  $('phase-label').textContent={player:p.charge?'你正在蓄势':'你的行动阶段',enemy:'敌方行动阶段',reaction:'择招应对',over:b.result==='win'?'论道告捷':b.result==='draw'?'难分高下':'本场惜败'}[b.phase];
  $('distance-display').innerHTML=['近','中','远'].map((n,i)=>`<span class="distance-node ${i===b.distance?'active':''}">${n}</span>`).join('');
  $('distance-caption').textContent=['近身交锋','中距斗法','远距对峙'][b.distance];
  $('distance-current').textContent=['近身','中距','远距'][b.distance];
  $('distance-explanation').textContent=[
    '近身可施展追风剑、普通剑招与打断技；中远距蓄势大招会落空。',
    '多数神通适合中距；追风剑仅限近身。仍需满足灵气、剑意与行动点要求。',
    '远程铺垫、玄水矢、凝霜、低耗火法与蓄势大招可用；沧澜与逐浪超距；焚炎术、烈火冲、焚身引、普通剑招和打断技超出距离。'
  ][b.distance];
  $('qi-total').textContent=`${total(p.qi)} / 10`;
  $('generation-label').textContent=`每回合 +${Object.entries(c.gen).map(([k,n])=>n+ELEMENT_NAMES[k]).join(' · ')}`;
  $('qi-pool').innerHTML=ELEMENTS.map(k=>`<div class="qi-item ${p.qi[k]?'':'empty'}" style="--element:var(--${k})" aria-label="${ELEMENT_NAMES[k]}灵气${p.qi[k]}点"><span class="qi-orb"><span>${k==='any'?'灵':ELEMENT_NAMES[k]}</span></span><span class="qi-count">${p.qi[k]}</span></div>`).join('');
  $('action-points').innerHTML=`<div class="ap-dots" aria-label="剩余${p.ap}行动点">${[0,1,2].map(i=>`<span class="ap-dot ${i<p.ap?'':'spent'}"></span>`).join('')}</div>`;
  $('reaction-status').textContent=p.reaction?'应对机会可用':'应对机会已用';$('reaction-status').className=`reaction-status ${p.reaction?'':'used'}`;
  $('passive-label').textContent=`${c.passive} · ${p.key==='fire'?(p.woodTriggered?'本回合已触发':'首次木法凝火'):p.key==='water'?`潮势 ${p.tide} / 3 · ${p.major==='cold'?(p.coldTriggered?'寒凝已兑现':'凝滞可择机消费'):'纳潮每回合一次'}`:p.key==='flame'?(p.major==='fierce'?`付费火法 ${p.fireCasts} 次 · ${p.fireCasts>=2?'强化已兑现':'第2次强化'}`:p.smolderTriggered?'首次附焰已触发':'首次附焰 +1层'):`剑意 ${p.intent} / 5`}`;
  $('skills-grid').innerHTML=b.skills(p).map((s,i)=>{let reason=b.legal(p,s.id);const rangeOK=s.range.includes(b.distance);const disabled=b.phase!=='player'||!!reason;return `<button class="skill-card" data-skill="${s.id}" style="--element:var(--${s.element})" ${disabled?'disabled':''} title="有效距离：${rangeLabel(s)}。${reason||s.desc}" aria-label="${s.name}，有效距离：${rangeLabel(s)}。${s.desc}${reason?'。'+reason:''}"><div class="skill-head"><span class="skill-symbol">${s.symbol}</span><h3>${s.name}</h3><span class="skill-tag">${s.tag}</span></div><p>${s.desc}</p><div class="skill-range ${rangeOK?'':'out-of-range'}"><span>有效：${rangeLabel(s)}</span><b>${rangeOK?'距离可用':'超出距离'}</b></div><div class="skill-cost"><span>${s.ap} 行动</span><span class="cost-separator">|</span>${costHtml(s.cost)}${s.intentCost?`<span class="intent-price">＋ ${s.intentCost} 剑意</span>`:''}</div><div class="skill-cost">${s.power?`<span class="damage-preview">预计 ${b.preview(s)} 伤害${s.kind==='charge'?' · 下回合':''}</span>`:`<span>${s.id==='seed'?'最多 5 层灵种':s.kind==='heal'?`恢复 ${s.heal} 气血`:s.kind==='tide'?`潮势 +${p.major==='tidal'?3:2} · 上限3`:s.kind==='ebb'?'消费潮势补水':s.kind==='force'?'消费凝滞 · 目标退开':`护盾 +${s.shield??22}${s.consumeTide?' · 可消费潮势 +12':''}`}</span>`}${reason&&b.phase==='player'?`<span class="skill-reason">${reason}</span>`:''}</div></button>`;}).join('');
  $('utility-actions').innerHTML=COMMON.filter(s=>s.id!=='dispel'||p.chilled).map(s=>`<button class="utility" data-skill="${s.id}" ${b.phase!=='player'||b.legal(p,s.id)?'disabled':''} title="${b.legal(p,s.id)||({basic:'近身 / 中距 / 远距均有效；无需灵气，造成基础伤害',near:'消耗1行动点，距离缩短一档',far:'消耗1行动点，距离拉开一档',meditate:'每回合限一次，凝聚1主属性和1通灵',purify:'消耗1任意灵气，恢复8气血，只清除灼烧',dispel:'消耗1任意灵气，恢复8气血，只清除凝滞'}[s.id])}">${s.name}<small>${s.id==='meditate'?'+2灵气':['purify','dispel'].includes(s.id)?'1灵气':'1行动'}</small></button>`).join('')+(p.charge&&b.phase==='player'?'<button class="utility" id="cancel-charge">取消蓄势</button>':'');
  $('end-turn').disabled=b.phase!=='player';
  $('end-turn').innerHTML=b.phase==='player'?`${p.charge?'完成蓄势':'结束回合'} <span>${p.charge?'下次行动阶段释放':'保留剩余灵气'}</span>`:`${b.phase==='over'?'本场已结束':'敌方出招中'} <span>${b.phase==='over'?'可重新论道':'观察并准备应对'}</span>`;
  const intent=e.charge?`正在蓄势「${e.charge.name}」 · 有效：${rangeLabel(e.charge)} · 下次敌方行动开始时释放`:(b.enemyPlan||[]).map(id=>b.skill(e,id).name).join(' · ');
  $('intent-text').textContent=b.result?'本场斗法已结束':intent;
  $('intent-note').textContent=e.charge?'可打断 / 近身化解':'提前观其势';
  $('passive-seal').textContent=p.key==='fire'?'生':p.key==='flame'?'火':p.key==='water'?'水':'剑';$('passive-name').textContent=major.name;$('passive-description').textContent=`${major.effect} 基础心法「${c.passive}」：${c.passiveText}`;
  $('stat-list').innerHTML=[['境界','筑基初期'],['肉身防御',c.physical],['灵力防御',c.magical],['灵气容量','10'],['每回合纳气','5'],['先手','固定你先手']].map(([k,v])=>`<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join('');
  $('tip-line').textContent=p.charge?'蓄势中仍可用剩余行动移动、调息或防守，其他神通暂不可用。下次行动开始免费释放，仍需中远距；近身或打断可化解。':p.ap===0?'行动点已用尽。结束回合，让对手出招。':`主修小诀：${major.tip}`;
  const logView=$('battle-log');
  const followLatest=logView.scrollHeight-logView.clientHeight-logView.scrollTop<=32;
  for(const l of b.logs.filter(l=>l.id>lastLog)){const div=document.createElement('div');div.className=`log-entry ${l.type}`;div.textContent=l.text;logView.append(div);lastLog=l.id;}
  if(followLatest)logView.scrollTop=logView.scrollHeight;
  $('log-round').textContent=`${b.logs.length} 条`;
  $('log-round').title='本场完整记录，重新论道或切换流派时清空';
  if(b.lastHit&&b.lastHit.id!==lastHit){lastHit=b.lastHit.id;const f=$('floating-hit');f.textContent=b.lastHit.damage?`−${b.lastHit.damage}`:'护盾抵御';f.className=`floating-hit ${b.lastHit.target}`;void f.offsetWidth;f.classList.add('animate');const art=$(b.lastHit.target==='player'?'player-art':'enemy-art');art.classList.remove('hit');void art.offsetWidth;art.classList.add('hit');}
  if(b.result){
    $('result-overlay').hidden=false;const inTrial=trial.active,done=trial.status==='complete',review=b.opponentId?b.review():null;
    $('result-overlay').innerHTML=`<span class="small-label">${inTrial?`第 ${trial.index+1} / 3 场 · `:''}第 ${b.round} 回合 · 切磋结束</span><div class="result-mark">${b.result==='win'?'论道告捷':b.result==='draw'?'难分高下':'胜负有时'}</div><p>${done?`三场论道已完成 · ${trial.snapshot().wins} 胜`:(b.result==='draw'?'双方收招，本场记为未决。':b.result==='win'?'对手拱手认输。':'此番惜败，观其招式再作调整。')}</p>${review?`<p class="result-recap">你的蓄势 ${review.actors[0].charges.started} 次 · 释放 ${review.actors[0].charges.released} 次<br>恢复 ${review.actors[0].healing} 气血 · ${p.key==='water'?`消费 ${review.actors[0].tideSpent??0} 潮势`:p.key==='flame'?`兑现 ${review.actors[0].burnConsumed??0} 层灼烧`:`消费 ${review.actors[0].intentSpent} 剑意`}</p>`:''}<div class="result-buttons">${inTrial?`<button id="next-trial">${done?'查看本轮结算':'备战下一场'}</button><button id="review-current">本场打法回顾</button>`:'<button data-reset="same">再战一场</button><button data-reset="other">换个流派</button>'}</div>`;
  }else $('result-overlay').hidden=true;
  if(automation.enabled){document.querySelectorAll('[data-skill], #end-turn, #cancel-charge').forEach(el=>el.disabled=true);}
  if(b.phase==='reaction'&&!automation.enabled&&!loadout.isOpen()&&!trialDialog.open&&!historyDialog.open)showReaction();else if(reaction.open)reaction.close();
}
function showReaction(){const p=battle.player,c=CLASSES[p.key],s=battle.pending.s;const damage=Math.round((battle.pending.raw+burnBonus(s,p))*100/(100+c[(battle.enemy.key==='sword'&&s.id!=='expose')||s.id==='basic'?'physical':'magical']));$('reaction-title').textContent=`${battle.enemy.name} · ${s.name}`;$('reaction-description').textContent=`这一招预计造成 ${damage} 伤害（护盾吸收前）。选择应对，或保留机会。`;$('reaction-options').innerHTML=`<button class="reaction-choice" data-reaction="shield" ${p.qi[c.reactionElement]<1?'disabled':''}><span>${c.reaction}<small>获得 26 护盾</small></span><span style="color:var(--${c.reactionElement})">1 ${ELEMENT_NAMES[c.reactionElement]}</span></button><button class="reaction-choice" data-reaction="evade" ${!payment(p.qi,{any:2})?'disabled':''}><span>闪身避让<small>本次减伤 50%，距离拉开一档</small></span><span>2 任意</span></button><button class="reaction-choice" data-reaction="none"><span>承受此招<small>保留本回合应对机会</small></span><span>无消耗</span></button>`;if(!reaction.open)reaction.showModal();}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2500);}
function reset(key=battle.player.key,config=key===battle.player.key?{major:battle.player.major,skillIds:battle.player.skillIds}:{}){
  pauseCombat();automation.enabled=false;
  if(battle.opponentId&&!battle.result)trial.archive(battle,{abandoned:true});
  if(pendingOpponent){practiceOpponent=pendingOpponent;practiceDifficulty=selectedDifficulty;pendingOpponent=null;}
  const profile=trial.active?trial.opponentId:practiceOpponent;
  if(trial.active&&trial.status!=='preparing')trial.retry();
  $('floating-hit').className='floating-hit';$('floating-hit').textContent='';
  $('player-art').classList.remove('hit');$('enemy-art').classList.remove('hit');
  if(reaction.open)reaction.close();battle=profile?new ChallengeBattle(key,config,profile,{distance:trial.active&&trial.index===1?2:1,difficulty:trial.active?trial.difficulty:practiceDifficulty}):new Battle(key,config);if(trial.active)trial.begin();lastLog=0;lastHit=0;
  $('battle-log').replaceChildren();$('player-art').src=`assets/${CLASSES[key].art??key}.png`;$('player-art').alt=CLASSES[key].name;
  const enemy=battle.enemy.key;$('enemy-art').src=`assets/${CLASSES[enemy].art??enemy}.png`;$('enemy-art').alt=CLASSES[enemy].name;
  $('player-art').style.transform=key==='sword'?'scaleX(-1)':'';$('enemy-art').style.transform=enemy!=='sword'?'scaleX(-1)':'';
  document.querySelectorAll('[data-class]').forEach(el=>{el.classList.toggle('active',el.dataset.class===key);el.setAttribute('aria-pressed',String(el.dataset.class===key));});render();
}
function scheduleCombat(){
  clearTimeout(combatTimer);combatTimer=null;
  if(battle.result||guide.open||loadout.isOpen()||trialDialog.open||historyDialog.open)return;
  const phase=battle.phase;
  if(phase!=='enemy'&&!automation.enabled)return;
  const token=generation;
  combatTimer=setTimeout(()=>{
    combatTimer=null;
    if(token!==generation||battle.phase!==phase||battle.result||guide.open||loadout.isOpen()||trialDialog.open||historyDialog.open)return;
    try{
      if(phase==='enemy')battle.enemyStep();
      else if(automation.enabled&&phase==='reaction'){
        const choice=chooseReaction(battle,automation.tendency);
        if(choice){battle.log(`【自动·${TENDENCIES[automation.tendency].name}】应对：${choice.reason}`,'decision');const r=battle.react(choice.response);if(!r.ok)throw Error(r.error);}
      }else if(automation.enabled&&phase==='player'){
        const choice=chooseAction(battle,automation.tendency);
        if(choice){battle.log(describeAutoChoice(battle,choice,automation.tendency),'decision');const r=choice.action==='end'?battle.endTurn():battle.act(battle.player,choice.skillId);if(!r.ok)throw Error(r.error);}
      }
    }catch(error){automation.enabled=false;battle.log(`自动斗法暂停：${error.message}，可继续手动出招。`,'decision');}
    render();scheduleCombat();
  },automation.enabled?SPEEDS[automation.speed].delay:650);
}
function configureAutomation({enabled=automation.enabled,tendency=automation.tendency,speed=automation.speed}={}){
  if(typeof enabled!=='boolean'||!TENDENCIES[tendency]||!SPEEDS[speed])return {ok:false,error:'自动斗法设置无效'};
  if(loadout.isOpen()||trialDialog.open||historyDialog.open)return {ok:false,error:'请先完成配装或关闭论道记录'};
  if(enabled&&battle.result)return {ok:false,error:'本场已结束，请先重新论道'};
  const old={...automation};Object.assign(automation,{enabled,tendency,speed});
  if(enabled&&!old.enabled)battle.log(`【自动·${TENDENCIES[tendency].name}】开始自动斗法：${TENDENCIES[tendency].description}`,'decision');
  else if(!enabled&&old.enabled)battle.log('自动斗法已暂停，下一次出招与应对交由你决定。','decision');
  else if(enabled&&old.tendency!==tendency)battle.log(`自动打法改为「${TENDENCIES[tendency].name}」：${TENDENCIES[tendency].description}`,'decision');
  render();scheduleCombat();return {ok:true};
}
function readState(){return {...battle.snapshot(),automation:{...automation},logCount:battle.logs.length,preparing:loadout.isOpen(),trial:trial.snapshot(),opponentId:battle.opponentId??null,difficulty:battle.difficulty??'practice'};}
function perform(id){
  if(loadout.isOpen()||trialDialog.open||historyDialog.open)return {ok:false,error:'请先完成配装或关闭论道记录'};
  if(automation.enabled)return {ok:false,error:'请先暂停自动斗法，再手动出招'};
  const r=battle.act(battle.player,id);if(!r.ok){toast(r.error);return r;}render();scheduleCombat();return r;
}
function runEnemy(){scheduleCombat();}
document.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target)return;
  if(target.dataset.skill)perform(target.dataset.skill);
  if(target.dataset.class&&!(trial.active&&trial.status==='fighting'))loadout.open(target.dataset.class);
  if(target.dataset.reaction&&!automation.enabled){const r=battle.react(target.dataset.reaction);if(!r.ok)toast(r.error);render();scheduleCombat();}
  if(target.dataset.reset==='other')loadout.open(['fire','sword','flame'][(['fire','sword','flame'].indexOf(battle.player.key)+1)%3]);else if(target.dataset.reset==='same')reset();
  if(target.id==='next-trial'){if(trial.status==='complete')openHistory(true);else{trial.next();loadout.open();}}
  if(target.id==='review-current')openHistory(false);
  if(target.id==='cancel-charge'&&!automation.enabled){battle.cancelCharge();render();scheduleCombat();}
});
$('end-turn').addEventListener('click',()=>{if(automation.enabled)return;const r=battle.endTurn();if(!r.ok)return;render();scheduleCombat();});
$('auto-toggle').addEventListener('click',()=>configureAutomation({enabled:!automation.enabled}));
$('auto-tendency').addEventListener('change',event=>configureAutomation({tendency:event.target.value}));
$('auto-speed').addEventListener('change',event=>configureAutomation({speed:event.target.value}));
$('edit-loadout').addEventListener('click',()=>{if(trial.active&&trial.status==='fighting')return;loadout.open();});
$('restart-button').addEventListener('click',()=>reset());
$('guide-button').addEventListener('click',()=>{guide.showModal();scheduleCombat();});
$('close-guide').addEventListener('click',()=>guide.close());$('guide-done').addEventListener('click',()=>guide.close());
guide.addEventListener('close',()=>scheduleCombat());
reaction.addEventListener('cancel',event=>{event.preventDefault();if(automation.enabled)return;battle.react('none');render();scheduleCombat();});
guide.addEventListener('click',event=>{if(event.target===guide){const rect=guide.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)guide.close();}});
function skillNames(key,ids){return ids.map(id=>CLASSES[key].skills.find(s=>s.id===id).name).join(' · ');}
function opponentHtml(id){const p=OPPONENTS[id];return `<span class="opponent-seal" aria-hidden="true">${p.seal}</span><div><h3>${p.name} <small>${p.title}</small></h3><p>${p.description}</p><p class="opponent-equipment">${MAJORS[p.key][p.major].name} · ${skillNames(p.key,p.skills)}</p><p class="opponent-counter">应对思路：${p.counter}</p></div>`;}
function renderTrial(){
 const fighting=trial.active&&trial.status==='fighting';document.querySelectorAll('[data-class],#edit-loadout').forEach(el=>el.disabled=fighting);
 $('restart-button').textContent=trial.active?'重开本场':'重新论道';$('history-button').textContent=`论道记录${trial.history.length?` · ${trial.history.length}`:''}`;
 $('trial-progress').hidden=!trial.active;
 if(trial.active){const route=ROUTES[trial.route];$('trial-progress').innerHTML=`<div class="trial-heading"><h2>${route.name} · ${DIFFICULTIES[trial.difficulty].name}</h2><span>${trial.status==='complete'?`已完成 · ${trial.snapshot().wins} 胜`:'第 '+(trial.index+1)+' / 3 场'} · 场间可换装</span></div><ol>${route.opponents.map((id,i)=>{const record=trial.history.find(r=>r.id===trial.stages[i]);return `<li class="${i===trial.index?'current':''}"><span>${i+1}</span><b>${OPPONENTS[id].name}</b><small>${record?resultLabel(record.result):i===trial.index?'当前场次':OPPONENTS[id].title}</small></li>`;}).join('')}</ol>`;}
 $('opponent-brief').hidden=!battle.opponentId;if(battle.opponentId)$('opponent-brief').innerHTML=`<span class="small-label">${DIFFICULTIES[battle.difficulty].name}</span>`+opponentHtml(battle.opponentId);
}
function renderLobby(){
 $('trial-difficulties').innerHTML=Object.entries(DIFFICULTIES).map(([id,d])=>`<button data-difficulty="${id}" aria-pressed="${selectedDifficulty===id}" class="${selectedDifficulty===id?'selected':''}"><b>${d.name}</b><span>${d.description}</span></button>`).join('');
 $('trial-routes').innerHTML=Object.entries(ROUTES).map(([id,r])=>`<button data-route="${id}" aria-pressed="${selectedRoute===id}" class="${selectedRoute===id?'selected':''}"><b>${r.name}</b><span>${r.description}</span></button>`).join('');
 $('trial-preview').innerHTML=`<ol class="trial-lineup">${ROUTES[selectedRoute].opponents.map((id,i)=>`<li><span class="small-label">第 ${i+1} 场 · ${i===1?'远距':'中距'}开局</span><div class="opponent-brief">${opponentHtml(id)}</div></li>`).join('')}</ol>`;
 $('start-trial').textContent=trial.active?'准备新一轮 · 第一场':'准备第一场';
 $('opponent-catalog').innerHTML=Object.values(OPPONENTS).map(p=>`<button data-practice="${p.id}"><b>${p.name}</b><span>${p.title}</span><small>${p.style}</small></button>`).join('');
}
function openLobby(){pauseCombat();renderLobby();trialDialog.showModal();}
function reviewHtml(record){const r=record.review,[p,e]=r.actors,q=a=>a.charges;return `<div class="review-heading"><h3>${record.opponent} · ${DIFFICULTIES[record.difficulty??'practice'].name} · ${resultLabel(record.result)}</h3><p>${r.rounds} 回合 · ${MAJORS[p.key][p.major].name}对${MAJORS[e.key][e.major].name}</p><p>你的配置：${skillNames(record.player.key,record.player.skillIds)}</p></div><table class="review-table"><thead><tr><th>打法回顾</th><th>你</th><th>${record.opponent}</th></tr></thead><tbody>${[
 ['剩余气血',`${p.hp} / ${p.maxHp}`,`${e.hp} / ${e.maxHp}`],['招式气血伤害 / 盾伤',`${p.hpDamage} / ${p.shieldDamage}`,`${e.hpDamage} / ${e.shieldDamage}`],['恢复 / 溢出',`${p.healing} / ${p.overheal}`,`${e.healing} / ${e.overheal}`],['剑意消费',p.intentSpent,e.intentSpent],['灼烧兑现（层）',p.burnConsumed??0,e.burnConsumed??0],['潮势消费',p.tideSpent??0,e.tideSpent??0],['迫退 / 凝滞消解',`${p.forcedMoves??0} / ${p.chillCleared??0}`,`${e.forcedMoves??0} / ${e.chillCleared??0}`],['移动行动 / 闲置行动',`${p.movement} / ${p.unusedAP}`,`${e.movement} / ${e.unusedAP}`],['跳招次数',Object.values(p.skipped??{}).reduce((a,n)=>a+n,0),Object.values(e.skipped??{}).reduce((a,n)=>a+n,0)],['留气保招',p.reactionPreserved??0,e.reactionPreserved??0],['蓄势开始 / 释放',`${q(p).started} / ${q(p).released}`,`${q(e).started} / ${q(e).released}`],['打断 / 距离落空',`${q(p).interrupted} / ${q(p).rangeMiss}`,`${q(e).interrupted} / ${q(e).rangeMiss}`],['取消 / 未释放',`${q(p).canceled} / ${q(p).pending}`,`${q(e).canceled} / ${q(e).pending}`],['蓄势气血伤害 / 盾伤',`${q(p).hpDamage} / ${q(p).shieldDamage}`,`${q(e).hpDamage} / ${q(e).shieldDamage}`]
 ].map(([k,a,b])=>`<tr><th>${k}</th><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table><p class="review-note">招式伤害已计防御与应对，灼烧另在纪要结算；溢出指恢复潜力超过缺失气血。未释放包括战斗结束时仍在蓄势；留气保招指为避免预告招式缺气而承伤的次数。</p>`;}
function renderHistory(id){
 const records=trial.history,current=records.find(r=>r.id===Number(id))??records.at(-1);$('history-select').innerHTML=records.map(r=>`<option value="${r.id}" ${current?.id===r.id?'selected':''}>${r.run?`第${r.run}轮 第${r.stage}场`:'单场'} · ${r.opponent} · ${resultLabel(r.result)}</option>`).join('');
 $('history-select').disabled=!records.length;$('copy-history').disabled=!records.length;$('history-export').hidden=true;
 $('history-review').innerHTML=current?reviewHtml(current):'<p class="history-empty">完成一场论道后，可在这里查看打法与完整纪要。</p>';
 $('history-log').replaceChildren();if(current)for(const l of current.logs){const div=document.createElement('div');div.className=`log-entry ${l.type}`;div.textContent=`[第${l.round}回合] ${l.text}`;$('history-log').append(div);}
 $('history-status').textContent=`已保留 ${records.length} 场 · ${records.reduce((n,r)=>n+r.logs.length,0)} 条纪要${trial.active?` · 本轮 ${trial.snapshot().completed}/3 场，${trial.snapshot().wins} 胜`:''}`;
}
function openHistory(wholeRound=false){pauseCombat();const current=wholeRound?trial.currentRecords[0]:trial.captured.get(battle);renderHistory(current?.id);historyDialog.showModal();}
$('trial-button').addEventListener('click',openLobby);$('close-trial').addEventListener('click',()=>{trialDialog.close();render();scheduleCombat();});
trialDialog.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.difficulty){selectedDifficulty=b.dataset.difficulty;renderLobby();}if(b.dataset.route){selectedRoute=b.dataset.route;renderLobby();}if(b.id==='start-trial'){if(battle.opponentId&&!battle.result)trial.archive(battle,{abandoned:true});trial.start(selectedRoute,selectedDifficulty);trialDialog.close();loadout.open();}if(b.dataset.practice){if(battle.opponentId&&!battle.result)trial.archive(battle,{abandoned:true});trial.leave();pendingOpponent=b.dataset.practice;trialDialog.close();loadout.open();}});
trialDialog.addEventListener('cancel',event=>{event.preventDefault();trialDialog.close();render();scheduleCombat();});
trialDialog.addEventListener('close',()=>{render();scheduleCombat();});
$('history-button').addEventListener('click',()=>openHistory());$('close-history').addEventListener('click',()=>{historyDialog.close();render();scheduleCombat();});historyDialog.addEventListener('cancel',event=>{event.preventDefault();historyDialog.close();render();scheduleCombat();});
historyDialog.addEventListener('close',()=>{render();scheduleCombat();});
$('history-select').addEventListener('change',event=>renderHistory(event.target.value));
$('copy-history').addEventListener('click',async()=>{const text=historyText(trial.history);try{await navigator.clipboard.writeText(text);$('history-status').textContent=`已复制 ${trial.history.length} 场完整纪要。`;}catch{$('history-export').value=text;$('history-export').hidden=false;$('history-export').focus();$('history-export').select();$('history-status').textContent='请全选下方文本后复制，全部纪要已展开。';}});

const context=document.modelContext;
if(context?.registerTool){const lifecycle=new AbortController();const register=t=>{try{Promise.resolve(context.registerTool(t,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_duel_state',description:'读取当前斗法的气血、灵气、距离、行动阶段与敌方意图。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>readState()});
  register({name:'perform_duel_action',description:'施展已装备神通或通用行动，与页面按钮共用规则；不会自动结束回合。',inputSchema:{type:'object',properties:{skillId:{type:'string'}},required:['skillId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input.skillId!=='string')throw new Error('skillId 必须为字符串');const r=perform(input.skillId);if(!r.ok)throw new Error(r.error);return readState();}});
  register({name:'respond_to_duel_attack',description:'在敌方攻击应对窗口选择护盾、闪身或承受此招。',inputSchema:{type:'object',properties:{response:{type:'string',enum:['shield','evade','none']}},required:['response'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(loadout.isOpen()||trialDialog.open||historyDialog.open)throw Error('请先完成配装或关闭论道记录');if(automation.enabled)throw Error('请先暂停自动斗法，再手动应对');const r=battle.react(input?.response);if(!r.ok)throw new Error(r.error);render();runEnemy();return readState();}});
  register({name:'configure_duel_automation',description:'开启、暂停自动斗法，或切换均衡、强攻、稳守、蓄势打法与出招节奏。与页面设置共用逻辑。',inputSchema:{type:'object',properties:{enabled:{type:'boolean'},tendency:{type:'string',enum:Object.keys(TENDENCIES)},speed:{type:'string',enum:Object.keys(SPEEDS)}},additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input!=='object'||Object.keys(input).some(key=>!['enabled','tendency','speed'].includes(key)))throw Error('自动斗法设置无效');const r=configureAutomation(input);if(!r.ok)throw Error(r.error);return readState();}});
  addEventListener('pagehide',()=>{clearTimeout(combatTimer);lifecycle.abort();},{once:true});
}
reset('fire');
loadout.open();
