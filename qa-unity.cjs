const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'dist'),errors=[],server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [1440,390,320])for(const gender of ['female','male']){
   const page=await browser.newPage({viewport:{width,height:1050}});page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.duelTools={};Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.duelTools[t.name]=t;}}});});
   await page.clock.install();await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('[data-loadout-class="sword"]').click();await page.locator('#apply-loadout').click();
   await page.locator('#duel-button').click();await page.locator('[data-duel-class="enemy"]').selectOption('fire');await page.locator(`[data-side="player"][data-portrait="${gender}"]`).click();await page.locator('#apply-duel').click();
   await page.locator('[data-skill="unity"]').click();assert.equal(await page.locator('.unity-charge.player').count(),1);
   await page.locator('#guide-button').click();await page.locator('#close-guide').click();assert.equal(await page.locator('.unity-charge.player').count(),1,'Read-only renders retain one charge');
   const frame=async time=>page.locator('.skill-effects').evaluate((el,t)=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=t;}},time);
   await frame(1000);await page.locator('.arena').screenshot({path:`/tmp/unity-charge-${width}-${gender}.png`});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.skill-effects').evaluate(el=>el.getAnimations({subtree:true}).length),0);await page.emulateMedia({reducedMotion:'no-preference'});
   await page.locator('#end-turn').click();
   for(let i=0;i<12&&await page.locator('.unity-cast').count()===0;i++){
    await page.clock.runFor(850);if(await page.locator('#reaction-dialog').evaluate(el=>el.open))await page.evaluate(()=>window.duelTools.respond_to_duel_attack.execute({response:'none'}));
   }
   assert.equal(await page.locator('.unity-charge').count(),0);assert.equal(await page.locator('.unity-cast.player').count(),1,'Real next-round release launches swords');
   await frame(350);await page.locator('.arena').screenshot({path:`/tmp/unity-flight-${width}-${gender}.png`});
   await frame(680);await page.locator('.arena').screenshot({path:`/tmp/unity-impact-${width}-${gender}.png`});
   await page.locator('#restart-button').click();assert.equal(await page.locator('.skill-effects>*').count(),0,'Restart removes charge, flights and timers');
   await page.locator('[data-skill="unity"]').click();await page.locator('#cancel-charge').click();assert.equal(await page.locator('.unity-cast').count(),0);assert.equal(await page.locator('.unity-charge').count(),0);await page.clock.runFor(1600);assert.equal(await page.locator('.skill-effects>*').count(),0);
   // Exercise real recorded outcomes on a separate stage without changing the app.
   const results=await page.evaluate(async()=>{
    const {DuelBattle}=await import('./duel-setup.mjs'),{createSkillEffects}=await import('./skill-effects.mjs');
    const stage=document.querySelector('.duel-stage').cloneNode(true);stage.querySelector('.skill-effects').remove();document.querySelector('.arena').append(stage);const fx=createSkillEffects(stage);
    const charge=(b,a)=>{b.phase=a===b.player?'player':'enemy';a.qi={metal:8,any:2,fire:0,water:0,wood:0,earth:0};a.ap=3;const r=b.act(a,'unity');if(!r.ok)throw Error(r.error);fx.sync(b);};
    const count=s=>stage.querySelectorAll(s).length,out={};
    let b=new DuelBattle('sword',{}, {key:'sword'});charge(b,b.enemy);out.enemyCharge=count('.unity-charge.enemy');b.release(b.enemy);fx.sync(b);out.pendingCast=count('.unity-cast');out.pendingCharge=count('.unity-charge.enemy');b.react('none');fx.sync(b);out.enemyCast=count('.unity-cast.enemy');out.enemyDirection=Number.parseFloat(stage.querySelector('.unity-cast').style.getPropertyValue('--flight-x'))<0;fx.sync(b);out.noReplay=count('.unity-cast');
    b=new DuelBattle('sword',{}, {key:'sword'});charge(b,b.player);b.distance=0;b.release(b.player);fx.sync(b);out.missCast=count('.unity-cast');out.missCharge=count('.unity-charge');
    b=new DuelBattle('sword',{}, {key:'sword'});charge(b,b.player);b.resolveAttack(b.enemy,{id:'lunge',element:'metal',power:1,interrupt:true},1);fx.sync(b);out.interruptedCast=count('.unity-cast');out.interruptedCharge=count('.unity-charge');
    b=new DuelBattle('sword',{}, {key:'sword'});charge(b,b.player);b.enemy.shield=60;b.player.charge.storedPower=1;b.enemy.reaction=false;b.release(b.player);fx.sync(b);out.shield=stage.querySelector('.unity-cast').dataset.outcome;
    fx.destroy();out.destroyed=count('.skill-effects');stage.remove();return out;
   });
   assert.deepEqual(results,{enemyCharge:1,pendingCast:0,pendingCharge:1,enemyCast:1,enemyDirection:true,noReplay:1,missCast:0,missCharge:0,interruptedCast:0,interruptedCharge:0,shield:'shield',destroyed:0});
   await page.close();
  }
  // Capture with the browser's native animation clock as well as virtual timers.
  const visual=await browser.newPage({viewport:{width:1440,height:1050}});await visual.goto('http://127.0.0.1:'+server.address().port);await visual.locator('[data-loadout-class="sword"]').click();await visual.locator('#apply-loadout').click();
  await visual.evaluate(async()=>{
   const {DuelBattle}=await import('./duel-setup.mjs'),{createSkillEffects}=await import('./skill-effects.mjs');
   const stage=document.querySelector('.duel-stage');stage.querySelector('.skill-effects').remove();window.visualFX=createSkillEffects(stage);window.visualBattle=new DuelBattle('sword');window.visualBattle.act(window.visualBattle.player,'unity');window.visualFX.sync(window.visualBattle);
  });
  await visual.waitForTimeout(750);await visual.locator('.arena').screenshot({path:'/tmp/unity-native-charge.png'});
  await visual.evaluate(()=>{window.visualBattle.release(window.visualBattle.player);window.visualFX.sync(window.visualBattle);});
  await visual.waitForTimeout(280);await visual.locator('.arena').screenshot({path:'/tmp/unity-native-flight.png'});
  await visual.waitForTimeout(250);assert.ok(await visual.locator('.unity-impact').evaluate(el=>Number(getComputedStyle(el).opacity)>0),'Native clock shows the impact');await visual.locator('.arena').screenshot({path:'/tmp/unity-native-impact.png'});
  await visual.close();
  assert.deepEqual(errors,[]);console.log('Unity animation: real charge/release/cancel; both genders at 1440/390/320px; enemy reaction and mirrored launch; range miss, interrupt, shield, no replay, reset cleanup and reduced motion passed.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
