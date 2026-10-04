const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');
const cases=[{key:'fire',major:'ignite',id:'inferno'},{key:'flame',major:'smolder',id:'solar'},{key:'earth',major:'mountain',id:'mountain'}];
(async()=>{
 const root=path.resolve(__dirname,'dist'),errors=[],missing=[],server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const c of cases)for(const width of [1440,390,320])for(const gender of ['female','male']){
   const page=await browser.newPage({viewport:{width,height:1050}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1'))missing.push(r.url());});
   await page.addInitScript(()=>{window.duelTools={};Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.duelTools[t.name]=t;}}});});
   await page.clock.install();await page.goto('http://127.0.0.1:'+server.address().port);await page.locator(`[data-loadout-class="${c.key}"]`).click();await page.locator(`[data-major="${c.major}"]`).click();await page.locator('#apply-loadout').click();
   await page.locator('#duel-button').click();await page.locator('[data-duel-class="enemy"]').selectOption('earth');await page.locator('[data-duel-major="enemy"]').selectOption('bastion');await page.locator(`[data-side="player"][data-portrait="${gender}"]`).click();await page.locator(`[data-side="enemy"][data-portrait="${gender}"]`).click();await page.locator('#apply-duel').click();
   const act=id=>page.locator(`[data-skill="${id}"]`).click();
   async function charge(){if(c.id==='mountain')await act('foundation');if(await page.locator(`[data-skill="${c.id}"]`).isDisabled())await act('meditate');await act(c.id);}
   await charge();assert.equal(await page.locator(`.charge-aura[data-skill="${c.id}"].player`).count(),1);
   await page.locator('#guide-button').click();await page.locator('#close-guide').click();assert.equal(await page.locator('.charge-aura').count(),1,'No duplicated charge on render');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.skill-effects').evaluate(el=>el.getAnimations({subtree:true}).length),0);await page.emulateMedia({reducedMotion:'no-preference'});
   await page.locator('#end-turn').click();
   for(let i=0;i<16&&await page.locator('.charge-cast').count()===0;i++){await page.clock.runFor(700);if(await page.locator('#reaction-dialog').evaluate(el=>el.open))await page.evaluate(()=>window.duelTools.respond_to_duel_attack.execute({response:'none'}));}
   assert.equal(await page.locator(`.charge-cast[data-skill="${c.id}"].player`).count(),1,'Actual next-round release');assert.equal(await page.locator('.charge-aura').count(),0);
   await page.locator('#restart-button').click();assert.equal(await page.locator('.skill-effects>*').count(),0);await charge();await page.locator('#cancel-charge').click();assert.equal(await page.locator('.charge-cast').count(),0);assert.equal(await page.locator('.charge-aura').count(),0);await page.clock.runFor(1900);assert.equal(await page.locator('.skill-effects>*').count(),0);
   const result=await page.evaluate(async c=>{
    const {DuelBattle}=await import('./duel-setup.mjs'),{createSkillEffects}=await import('./skill-effects.mjs');
    const stage=document.querySelector('.duel-stage').cloneNode(true);stage.querySelector('.skill-effects').remove();document.querySelector('.arena').append(stage);const fx=createSkillEffects(stage),count=s=>stage.querySelectorAll(s).length;
    const fresh=()=>new DuelBattle(c.key,{major:c.major},{key:c.key,major:c.major});
    const charge=(b,a)=>{b.phase=a===b.player?'player':'enemy';a.qi={metal:0,any:2,fire:8,water:0,wood:0,earth:8};a.ap=3;if(c.id==='mountain')a.terrain=2;const r=b.act(a,c.id);if(!r.ok)throw Error(r.error);fx.sync(b);};
    let b=fresh(),out={};charge(b,b.enemy);out.enemyCharge=count('.charge-aura.enemy');b.release(b.enemy);fx.sync(b);out.pendingCast=count('.charge-cast');out.pendingCharge=count('.charge-aura.enemy');b.react('none');fx.sync(b);out.enemyCast=count('.charge-cast.enemy');out.direction=Number.parseFloat(stage.querySelector('.charge-cast').style.getPropertyValue('--flight-x'))<0;fx.sync(b);out.noReplay=count('.charge-cast');
    b=fresh();charge(b,b.player);b.distance=c.id==='mountain'?2:0;b.release(b.player);fx.sync(b);out.missCast=count('.charge-cast');out.missCharge=count('.charge-aura');out.missFizzle=count('.charge-fizzle');
    b=fresh();charge(b,b.player);b.resolveAttack(b.enemy,{id:'test-interrupt',power:1,interrupt:true},1);fx.sync(b);out.interruptedCast=count('.charge-cast');out.interruptedCharge=count('.charge-aura');
    b=fresh();charge(b,b.player);b.enemy.shield=60;b.player.charge.storedPower=1;b.enemy.reaction=false;b.release(b.player);fx.sync(b);out.shield=stage.querySelector('.charge-cast').dataset.outcome;
    fx.destroy();out.destroyed=count('.skill-effects');stage.remove();return out;
   },c);
   assert.deepEqual(result,{enemyCharge:1,pendingCast:0,pendingCharge:1,enemyCast:1,direction:true,noReplay:1,missCast:0,missCharge:0,missFizzle:1,interruptedCast:0,interruptedCharge:0,shield:'shield',destroyed:0});
   await page.close();console.log(`${c.id}: ${width}px ${gender} passed`);
  }
  // Native animation clock: inspect actual artwork at desktop and phone sizes.
  for(const c of cases)for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:1050}});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.locator(`[data-loadout-class="${c.key}"]`).click();await page.locator(`[data-major="${c.major}"]`).click();await page.locator('#apply-loadout').click();
   await page.evaluate(async c=>{
    const {DuelBattle}=await import('./duel-setup.mjs'),{createSkillEffects}=await import('./skill-effects.mjs');const stage=document.querySelector('.duel-stage');stage.querySelector('.skill-effects').remove();window.visualFX=createSkillEffects(stage);window.visualBattle=new DuelBattle(c.key,{major:c.major});const b=window.visualBattle;b.player.qi={fire:8,earth:8,any:2,water:0,metal:0,wood:0};b.player.terrain=2;b.act(b.player,c.id);window.visualFX.sync(b);
   },c);
   await page.waitForTimeout(700);await page.locator('.arena').screenshot({path:`/tmp/${c.id}-native-charge-${width}.png`});
   await page.evaluate(()=>{window.visualBattle.release(window.visualBattle.player);window.visualFX.sync(window.visualBattle);});await page.waitForTimeout(300);await page.locator('.arena').screenshot({path:`/tmp/${c.id}-native-release-${width}.png`});await page.waitForTimeout(230);
   assert.ok(await page.locator(`.${c.id}-cast`).evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.currentTime>0)),'Native clock advances');await page.locator('.arena').screenshot({path:`/tmp/${c.id}-native-impact-${width}.png`});await page.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('All three charge skills: real UI release/cancel, both sides/genders, desktop/390/320px, pending reactions, misses/interrupts/shields, no replay, reset, reduced motion and native animation artwork passed.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
