import {Battle,CLASSES,COMMON,ELEMENTS,ELEMENT_NAMES,total,payment} from './engine.mjs';
import {TENDENCIES,SPEEDS,chooseAction,chooseReaction,describeAutoChoice} from './auto.mjs';
const $=id=>document.getElementById(id);
let battle=new Battle('fire'),generation=0,lastHit=0,lastLog=0,combatTimer=null;
const automation={enabled:false,tendency:'balanced',speed:'normal'};
const guide=$('guide-dialog'),reaction=$('reaction-dialog');
function costHtml(cost){return Object.entries(cost).map(([k,n])=>`<span class="cost-element" style="--element:var(--${k})">${n} ${k==='any'?'任意':ELEMENT_NAMES[k]}</span>`).join('<span class="cost-separator">·</span>')||'<span>无需灵气</span>';}
function fighterHtml(a,player){const c=CLASSES[a.key];let states=[];if(a.intent)states.push(`<span class="status-chip intent" title="每层剑意为重剑增加8基础伤害">剑意 ${a.intent}</span>`);if(a.seed)states.push(`<span class="status-chip seed" title="每层灵种使焚炎术增伤20%">灵种 ${a.seed}</span>`);if(a.burn)states.push(`<span class="status-chip burn" title="每层每次灼烧结算扣4气血，剩余${a.burnTurns}次结算">灼烧 ${a.burn} · ${a.burnTurns}回合</span>`);if(a.broken)states.push('<span class="status-chip" title="下一次重剑伤害提高25%">破绽</span>');if(a.charge)states.push(`<span class="status-chip charge">蓄势 · ${a.charge.name}</span>`);return `<div class="fighter-heading"><span class="side-tag">${player?'你':'对手'}</span><h2>${player?'无名道友':c.person}</h2><span class="fighter-sect">${c.sect}</span></div><div class="hp-line"><span>${c.name} · 气血</span><b>${a.hp} <span>/ ${a.maxHp}</span></b></div><div class="hp-track" role="meter" aria-label="${player?'你的':'对手'}气血" aria-valuemin="0" aria-valuemax="${a.maxHp}" aria-valuenow="${a.hp}"><div class="hp-fill" style="--hp:${a.hp/a.maxHp*100}%"></div></div><div class="shield-line">${a.shield?`护盾 ${a.shield}`:'护盾 —'} <span>· ${a.reaction?'应对可用':'应对已用'}</span></div><div class="statuses">${states.join('')}</div>`;}
function render(){
  const b=battle,p=b.player,e=b.enemy,c=CLASSES[p.key];
  if(b.result)automation.enabled=false;
  $('auto-toggle').textContent=automation.enabled?'暂停自动 · 转手动':'开启自动战斗';
  $('auto-toggle').setAttribute('aria-pressed',String(automation.enabled));
  $('auto-toggle').disabled=!!b.result;
  $('auto-tendency').value=automation.tendency;$('auto-speed').value=automation.speed;
  $('auto-status').textContent=b.result?'本场斗法已结束':automation.enabled?`${TENDENCIES[automation.tendency].name} · 自动出招与应对中`:'可随时暂停，切回手动出招';
  $('auto-description').textContent=`${TENDENCIES[automation.tendency].description}选择理由会写入斗法纪要。`;
  $('player-info').innerHTML=fighterHtml(p,true);$('enemy-info').innerHTML=fighterHtml(e,false);
  document.querySelector('.arena').dataset.distance=b.distance;
  $('round-label').textContent=`第 ${String(b.round).padStart(2,'0')} 回合`;
  $('phase-label').textContent={player:p.charge?'你正在蓄势':'你的行动阶段',enemy:'敌方行动阶段',reaction:'择招应对',over:b.result==='win'?'论道告捷':'本场惜败'}[b.phase];
  $('distance-display').innerHTML=['近','中','远'].map((n,i)=>`<span class="distance-node ${i===b.distance?'active':''}">${n}</span>`).join('');
  $('distance-caption').textContent=['近身交锋','中距斗法','远距对峙'][b.distance];
  $('qi-total').textContent=`${total(p.qi)} / 10`;
  $('generation-label').textContent=`每回合 +${Object.entries(c.gen).map(([k,n])=>n+ELEMENT_NAMES[k]).join(' · ')}`;
  $('qi-pool').innerHTML=ELEMENTS.map(k=>`<div class="qi-item ${p.qi[k]?'':'empty'}" style="--element:var(--${k})" aria-label="${ELEMENT_NAMES[k]}灵气${p.qi[k]}点"><span class="qi-orb"><span>${k==='any'?'灵':ELEMENT_NAMES[k]}</span></span><span class="qi-count">${p.qi[k]}</span></div>`).join('');
  $('action-points').innerHTML=`<div class="ap-dots" aria-label="剩余${p.ap}行动点">${[0,1,2].map(i=>`<span class="ap-dot ${i<p.ap?'':'spent'}"></span>`).join('')}</div>`;
  $('reaction-status').textContent=p.reaction?'应对机会可用':'应对机会已用';$('reaction-status').className=`reaction-status ${p.reaction?'':'used'}`;
  $('passive-label').textContent=`${c.passive} · ${p.key==='fire'?(p.woodTriggered?'本回合已触发':'首次木法凝火'):`剑意 ${p.intent} / 5`}`;
  $('skills-grid').innerHTML=c.skills.map((s,i)=>{let reason=b.legal(p,s.id);const disabled=b.phase!=='player'||!!reason;return `<button class="skill-card" data-skill="${s.id}" style="--element:var(--${s.element})" ${disabled?'disabled':''} title="${reason||s.desc}" aria-label="${s.name}，${s.desc}${reason?'。'+reason:''}"><div class="skill-head"><span class="skill-symbol">${s.symbol}</span><h3>${s.name}</h3><span class="skill-tag">${s.tag}</span></div><p>${s.desc}</p><div class="skill-cost"><span>${s.ap} 行动</span><span class="cost-separator">|</span>${costHtml(s.cost)}</div><div class="skill-cost">${s.power?`<span class="damage-preview">预计 ${b.preview(s)} 伤害${s.kind==='charge'?' · 下回合':''}</span>`:`<span>${s.id==='seed'?'最多 5 层灵种':s.id==='heal'?'恢复 26 气血':'护盾 +22'}</span>`}${reason&&b.phase==='player'?`<span class="skill-reason">${reason}</span>`:''}</div></button>`;}).join('');
  $('utility-actions').innerHTML=COMMON.map(s=>`<button class="utility" data-skill="${s.id}" ${b.phase!=='player'||b.legal(p,s.id)?'disabled':''} title="${b.legal(p,s.id)||({basic:'无需灵气，造成基础伤害',near:'消耗1行动点，距离缩短一档',far:'消耗1行动点，距离拉开一档',meditate:'每回合限一次，凝聚1主属性和1通灵',purify:'消耗1任意灵气，恢复8气血并清除灼烧'}[s.id])}">${s.name}<small>${s.id==='meditate'?'+2灵气':s.id==='purify'?'1灵气':'1行动'}</small></button>`).join('')+(p.charge&&b.phase==='player'?'<button class="utility" id="cancel-charge">取消蓄势</button>':'');
  $('end-turn').disabled=b.phase!=='player';
  $('end-turn').innerHTML=b.phase==='player'?`${p.charge?'完成蓄势':'结束回合'} <span>${p.charge?'下次行动阶段释放':'保留剩余灵气'}</span>`:`${b.phase==='over'?'本场已结束':'敌方出招中'} <span>${b.phase==='over'?'可重新论道':'观察并准备应对'}</span>`;
  const intent=e.charge?`正在蓄势「${e.charge.name}」 · 下一次敌方行动开始时释放`:(b.enemyPlan||[]).map(id=>b.skill(e,id).name).join(' · ');
  $('intent-text').textContent=b.result?'本场斗法已结束':intent;
  $('intent-note').textContent=e.charge?'可打断 / 拉开距离':'提前观其势';
  $('passive-seal').textContent=p.key==='fire'?'生':'剑';$('passive-name').textContent=c.passive;$('passive-description').textContent=c.passiveText;
  $('stat-list').innerHTML=[['境界','筑基初期'],['肉身防御',c.physical],['灵力防御',c.magical],['灵气容量','10'],['每回合纳气','5'],['先手','固定你先手']].map(([k,v])=>`<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join('');
  $('tip-line').textContent=p.charge?'正在蓄势。敌人可能打断；确认距离后结束回合。':p.ap===0?'行动点已用尽。结束回合，让对手出招。':p.key==='fire'?'小诀：先催生、再焚炎，留下 1 木灵气用于御木诀。':'小诀：照隙识破，掠影养意，再以断岳破势。';
  const logView=$('battle-log');
  const followLatest=logView.scrollHeight-logView.clientHeight-logView.scrollTop<=32;
  for(const l of b.logs.filter(l=>l.id>lastLog)){const div=document.createElement('div');div.className=`log-entry ${l.type}`;div.textContent=l.text;logView.append(div);lastLog=l.id;}
  if(followLatest)logView.scrollTop=logView.scrollHeight;
  $('log-round').textContent=`${b.logs.length} 条`;
  $('log-round').title='本场完整记录，重新论道或切换流派时清空';
  if(b.lastHit&&b.lastHit.id!==lastHit){lastHit=b.lastHit.id;const f=$('floating-hit');f.textContent=b.lastHit.damage?`−${b.lastHit.damage}`:'护盾抵御';f.className=`floating-hit ${b.lastHit.target}`;void f.offsetWidth;f.classList.add('animate');const art=$(b.lastHit.target==='player'?'player-art':'enemy-art');art.classList.remove('hit');void art.offsetWidth;art.classList.add('hit');}
  if(b.result){$('result-overlay').hidden=false;$('result-overlay').innerHTML=`<span class="small-label">第 ${b.round} 回合 · 切磋结束</span><div class="result-mark">${b.result==='win'?'论道告捷':'胜负有时'}</div><p>${b.result==='win'?'对手拱手认输，你的道法更进一步。':'此番惜败。观其招式，调整灵气，再论一场。'}</p><div class="result-buttons"><button data-reset="same">再战一场</button><button data-reset="other">换个流派</button></div>`;}else $('result-overlay').hidden=true;
  if(automation.enabled){document.querySelectorAll('[data-skill], #end-turn, #cancel-charge').forEach(el=>el.disabled=true);}
  if(b.phase==='reaction'&&!automation.enabled)showReaction();else if(reaction.open)reaction.close();
}
function showReaction(){const p=battle.player,c=CLASSES[p.key],s=battle.pending.s;const damage=Math.round((battle.pending.raw+(s.id==='inferno'?p.burn*8:0))*100/(100+c[(battle.enemy.key==='sword'&&s.id!=='expose')||s.id==='basic'?'physical':'magical']));$('reaction-title').textContent=`${CLASSES[battle.enemy.key].person} · ${s.name}`;$('reaction-description').textContent=`这一招预计造成 ${damage} 伤害（护盾吸收前）。选择应对，或保留机会。`;$('reaction-options').innerHTML=`<button class="reaction-choice" data-reaction="shield" ${p.qi[c.reactionElement]<1?'disabled':''}><span>${c.reaction}<small>获得 26 护盾</small></span><span style="color:var(--${c.reactionElement})">1 ${ELEMENT_NAMES[c.reactionElement]}</span></button><button class="reaction-choice" data-reaction="evade" ${!payment(p.qi,{any:2})?'disabled':''}><span>闪身避让<small>本次减伤 50%，距离拉开一档</small></span><span>2 任意</span></button><button class="reaction-choice" data-reaction="none"><span>承受此招<small>保留本回合应对机会</small></span><span>无消耗</span></button>`;if(!reaction.open)reaction.showModal();}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2500);}
function reset(key=battle.player.key){
  generation++;clearTimeout(combatTimer);combatTimer=null;automation.enabled=false;
  $('floating-hit').className='floating-hit';$('floating-hit').textContent='';
  $('player-art').classList.remove('hit');$('enemy-art').classList.remove('hit');
  if(reaction.open)reaction.close();battle=new Battle(key);lastLog=0;lastHit=0;
  $('battle-log').replaceChildren();$('player-art').src=`assets/${key}.png`;$('player-art').alt=CLASSES[key].name;
  const enemy=key==='fire'?'sword':'fire';$('enemy-art').src=`assets/${enemy}.png`;$('enemy-art').alt=CLASSES[enemy].name;
  $('player-art').style.transform=key==='sword'?'scaleX(-1)':'';$('enemy-art').style.transform=enemy==='fire'?'scaleX(-1)':'';
  document.querySelectorAll('[data-class]').forEach(el=>{el.classList.toggle('active',el.dataset.class===key);el.setAttribute('aria-pressed',String(el.dataset.class===key));});render();
}
function scheduleCombat(){
  clearTimeout(combatTimer);combatTimer=null;
  if(battle.result||guide.open)return;
  const phase=battle.phase;
  if(phase!=='enemy'&&!automation.enabled)return;
  const token=generation;
  combatTimer=setTimeout(()=>{
    combatTimer=null;
    if(token!==generation||battle.phase!==phase||battle.result||guide.open)return;
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
  if(enabled&&battle.result)return {ok:false,error:'本场已结束，请先重新论道'};
  const old={...automation};Object.assign(automation,{enabled,tendency,speed});
  if(enabled&&!old.enabled)battle.log(`【自动·${TENDENCIES[tendency].name}】开始自动斗法：${TENDENCIES[tendency].description}`,'decision');
  else if(!enabled&&old.enabled)battle.log('自动斗法已暂停，下一次出招与应对交由你决定。','decision');
  else if(enabled&&old.tendency!==tendency)battle.log(`自动打法改为「${TENDENCIES[tendency].name}」：${TENDENCIES[tendency].description}`,'decision');
  render();scheduleCombat();return {ok:true};
}
function readState(){return {...battle.snapshot(),automation:{...automation},logCount:battle.logs.length};}
function perform(id){
  if(automation.enabled)return {ok:false,error:'请先暂停自动斗法，再手动出招'};
  const r=battle.act(battle.player,id);if(!r.ok){toast(r.error);return r;}render();scheduleCombat();return r;
}
function runEnemy(){scheduleCombat();}
document.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target)return;
  if(target.dataset.skill)perform(target.dataset.skill);
  if(target.dataset.class&&target.dataset.class!==battle.player.key)reset(target.dataset.class);
  if(target.dataset.reaction&&!automation.enabled){const r=battle.react(target.dataset.reaction);if(!r.ok)toast(r.error);render();scheduleCombat();}
  if(target.dataset.reset)reset(target.dataset.reset==='other'?(battle.player.key==='fire'?'sword':'fire'):battle.player.key);
  if(target.id==='cancel-charge'&&!automation.enabled){battle.cancelCharge();render();scheduleCombat();}
});
$('end-turn').addEventListener('click',()=>{if(automation.enabled)return;const r=battle.endTurn();if(!r.ok)return;render();scheduleCombat();});
$('auto-toggle').addEventListener('click',()=>configureAutomation({enabled:!automation.enabled}));
$('auto-tendency').addEventListener('change',event=>configureAutomation({tendency:event.target.value}));
$('auto-speed').addEventListener('change',event=>configureAutomation({speed:event.target.value}));
$('restart-button').addEventListener('click',()=>reset());
$('guide-button').addEventListener('click',()=>{guide.showModal();scheduleCombat();});
$('close-guide').addEventListener('click',()=>guide.close());$('guide-done').addEventListener('click',()=>guide.close());
guide.addEventListener('close',()=>scheduleCombat());
reaction.addEventListener('cancel',event=>{event.preventDefault();if(automation.enabled)return;battle.react('none');render();scheduleCombat();});
guide.addEventListener('click',event=>{if(event.target===guide){const rect=guide.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)guide.close();}});
const context=document.modelContext;
if(context?.registerTool){const lifecycle=new AbortController();const register=t=>{try{Promise.resolve(context.registerTool(t,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_duel_state',description:'读取当前斗法的气血、灵气、距离、行动阶段与敌方意图。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>readState()});
  register({name:'perform_duel_action',description:'施展已装备神通或通用行动，与页面按钮共用规则；不会自动结束回合。',inputSchema:{type:'object',properties:{skillId:{type:'string'}},required:['skillId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input.skillId!=='string')throw new Error('skillId 必须为字符串');const r=perform(input.skillId);if(!r.ok)throw new Error(r.error);return readState();}});
  register({name:'respond_to_duel_attack',description:'在敌方攻击应对窗口选择护盾、闪身或承受此招。',inputSchema:{type:'object',properties:{response:{type:'string',enum:['shield','evade','none']}},required:['response'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(automation.enabled)throw Error('请先暂停自动斗法，再手动应对');const r=battle.react(input?.response);if(!r.ok)throw new Error(r.error);render();runEnemy();return readState();}});
  register({name:'configure_duel_automation',description:'开启、暂停自动斗法，或切换均衡、强攻、稳守、蓄势打法与出招节奏。与页面设置共用逻辑。',inputSchema:{type:'object',properties:{enabled:{type:'boolean'},tendency:{type:'string',enum:Object.keys(TENDENCIES)},speed:{type:'string',enum:Object.keys(SPEEDS)}},additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input!=='object'||Object.keys(input).some(key=>!['enabled','tendency','speed'].includes(key)))throw Error('自动斗法设置无效');const r=configureAutomation(input);if(!r.ok)throw Error(r.error);return readState();}});
  addEventListener('pagehide',()=>{clearTimeout(combatTimer);lifecycle.abort();},{once:true});
}
reset('fire');
