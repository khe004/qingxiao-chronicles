const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'dist'),server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],missing=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1'))missing.push(r.url());});
  await page.addInitScript(()=>{window.duelTools={};Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.duelTools[t.name]=t;}}});});
  await page.clock.install();await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#cancel-loadout').click();
  const state=()=>page.evaluate(()=>window.duelTools.read_duel_state.execute({}));
  const open=()=>page.locator('#duel-button').click();
  await open();
  for(const side of ['player','enemy']){
   assert.equal(await page.locator(`[data-duel-class="${side}"] option`).count(),6);
   for(const key of ['wood','earth','fire','sword','flame','water']){
    await page.locator(`[data-duel-class="${side}"]`).selectOption(key);
    assert.equal(await page.locator(`#duel-${side} [data-duel-equip]`).count(),12);
    for(const gender of ['male','female']){
     await page.locator(`[data-side="${side}"][data-portrait="${gender}"]`).click();
     assert.equal(await page.locator(`#duel-${side} [data-portrait][aria-pressed="true"]`).count(),1);
     await page.waitForFunction(()=>[...document.querySelectorAll('#duel-dialog img')].every(im=>im.complete&&im.naturalWidth>0));
    }
   }
  }
  await page.locator('[data-duel-major="player"]').selectOption('cold');await page.locator('[data-duel-major="enemy"]').selectOption('tidal');
  await page.locator('[data-side="player"][data-portrait="male"]').click();await page.locator('[data-side="enemy"][data-portrait="female"]').click();
  await page.locator('#duel-enemy [data-duel-equip="ebb"]').click();assert.ok(await page.locator('#apply-duel').isDisabled());
  await page.locator('#duel-enemy [data-duel-equip="frost"]').click();assert.ok(await page.locator('#apply-duel').isEnabled());
  await page.locator('#apply-duel').click();let s=await state();assert.equal(s.player.key,'water');assert.equal(s.enemy.key,'water');assert.equal(s.player.major,'cold');assert.equal(s.enemy.major,'tidal');assert.ok(s.enemy.skillIds.includes('rinse'));assert.ok(s.enemy.skillIds.includes('frost')&& !s.enemy.skillIds.includes('ebb'));assert.deepEqual(s.portraits,{player:'male',enemy:'female'});
  assert.ok((await page.locator('#enemy-loadout').textContent()).includes('涤尘诀'));assert.ok((await page.locator('#enemy-major').textContent()).includes('潮汐'));
  assert.equal(await page.locator('#player-art').getAttribute('src'),'assets/characters/water-male.webp');assert.equal(await page.locator('#enemy-art').getAttribute('src'),'assets/characters/water-female.webp');
  await page.locator('[data-skill="frost"]').click();const before=await state();await open();await page.locator('[data-duel-class="enemy"]').selectOption('flame');await page.locator('[data-duel-major="player"]').selectOption('tidal');await page.locator('#cancel-duel').click();assert.deepEqual(await state(),before,'Cancel leaves both fighters, portraits and combat unchanged');
  await page.locator('#restart-button').click();s=await state();assert.equal(s.round,1);assert.equal(s.enemy.major,'tidal');assert.deepEqual(s.enemy.skillIds,before.enemy.skillIds);assert.deepEqual(s.portraits,before.portraits);
  await page.locator('#end-turn').click();await open();const paused=await state();await page.clock.runFor(5000);assert.deepEqual(await state(),paused,'Editor pauses pending enemy actions');await page.locator('#duel-dialog').press('Escape');await page.clock.runFor(1000);assert.ok((await state()).phase!=='enemy'||(await state()).logCount>paused.logCount);
  if(await page.locator('#reaction-dialog').isVisible())await page.locator('[data-reaction="none"]').click();
  await page.locator('#restart-button').click();
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:width===1440?1050:844});await open();
   await page.locator('[data-duel-class="player"]').selectOption('fire');await page.locator('[data-duel-class="enemy"]').selectOption('flame');
   await page.locator('[data-side="player"][data-portrait="female"]').click();await page.locator('[data-side="enemy"][data-portrait="male"]').click();
   assert.ok(await page.evaluate(()=>{const d=document.querySelector('#duel-dialog');return d.scrollWidth<=d.clientWidth+1;}));
   await page.locator('#duel-body').evaluate(el=>el.scrollTop=0);await page.screenshot({path:`/workspace/qingxiao-duel-setup-${width}.png`});await page.locator('#apply-duel').click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const hud=await page.locator('.arena-hud').boundingBox(),art=await page.locator('#player-art').boundingBox();assert.ok(hud.y+hud.height<=art.y);
   await page.waitForFunction(()=>[...document.querySelectorAll('.character')].every(im=>im.complete&&im.naturalWidth>0));await page.screenshot({path:`/workspace/qingxiao-duel-${width}.png`,fullPage:true});
  }
  await page.locator('#auto-speed').selectOption('fast');await page.locator('#auto-toggle').click();await page.clock.runFor(120000);s=await state();assert.ok(s.result,'Custom duel reaches a real result');assert.equal(s.automation.enabled,false);assert.equal(s.enemy.key,'flame');
  await page.locator('#trial-button').click();await page.locator('#start-trial').click();await page.locator('#apply-loadout').click();assert.equal((await state()).trial.status,'fighting');
  await open();await page.locator('[data-duel-class="enemy"]').selectOption('water');await page.locator('#apply-duel').click();s=await state();assert.equal(s.trial.status,'idle');assert.equal(s.opponentId,null);assert.equal(s.enemy.key,'water');assert.ok(s.trial.historyCount>0,'Leaving a trial preserves its archived record');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('Duel browser: all class/gender choices, same-school asymmetric builds, custom six-slot validation, cancel/escape isolation, paused enemy timers, reset persistence, automatic result, trial exit/history and 1440/390/320 layouts passed.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
