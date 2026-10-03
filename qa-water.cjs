const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'dist');
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.duelTools={};Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.duelTools[t.name]=t;}}});});
  await page.clock.install();await page.goto('http://127.0.0.1:'+server.address().port);
  const state=()=>page.evaluate(()=>window.duelTools.read_duel_state.execute({}));
  await page.locator('#cancel-loadout').click();assert.equal(await page.locator('[data-class]').count(),6);
  await page.locator('[data-class="water"]').click();assert.equal(await page.locator('[data-major]').count(),2);assert.equal(await page.locator('[data-equip]').count(),8);assert.equal(await page.locator('[data-equip][aria-pressed="true"]').count(),6);
  await page.locator('#apply-loadout').click();assert.equal((await state()).player.key,'water');assert.ok(await page.locator('[data-skill="repulse"]').isDisabled());
  await page.locator('[data-skill="frost"]').click();assert.equal((await state()).enemy.chilled,true);assert.ok((await page.locator('#enemy-info').textContent()).includes('凝滞'));
  await page.locator('[data-skill="repulse"]').click();assert.equal((await state()).enemy.chilled,false);assert.equal((await state()).distance,'远距');assert.ok(await page.locator('[data-skill="surge"]').isDisabled());assert.ok((await page.locator('#battle-log').textContent()).includes('被迫退开'));
  const saved=(await state()).player;await page.locator('#edit-loadout').click();await page.locator('[data-major="tidal"]').click();await page.locator('#cancel-loadout').click();assert.deepEqual((await state()).player,saved);
  await page.locator('[data-class="water"]').click();await page.locator('[data-major="tidal"]').click();await page.locator('#apply-loadout').click();
  await page.locator('[data-skill="gather"]').click();assert.equal((await state()).player.tide,3);await page.locator('[data-skill="surge"]').click();assert.equal((await state()).player.tide,1);await page.locator('[data-skill="waterwall"]').click();assert.equal((await state()).player.tide,0);assert.equal((await state()).player.shield,30);assert.ok((await page.locator('#player-info').textContent()).includes('潮势 0 / 3'));
  assert.ok((await page.locator('#player-art').getAttribute('src')).endsWith('water-female.webp'));
  for(const id of ['cold','tidal']){
   await page.locator('#trial-button').click();assert.equal(await page.locator('[data-practice]').count(),11);await page.locator('[data-difficulty="questioning"]').click();await page.locator(`[data-practice="${id}"]`).click();await page.locator('[data-loadout-class="water"]').click();await page.locator(`[data-major="${id}"]`).click();await page.locator('#apply-loadout').click();
   const ready=await state();assert.equal(ready.opponentId,id);assert.equal(ready.enemy.key,'water');assert.equal(ready.difficulty,'questioning');assert.ok((await page.locator('#enemy-art').getAttribute('src')).endsWith('water-male.webp'));
   await page.locator('#auto-speed').selectOption('fast');await page.locator('#auto-toggle').click();await page.clock.runFor(120000);const done=await state();assert.ok(done.result);assert.equal(done.automation.enabled,false);assert.equal(await page.locator('#battle-log .log-entry').count(),done.logCount);
   await page.locator('#history-button').click();assert.ok((await page.locator('#history-review').textContent()).includes('潮势消费'));assert.ok((await page.locator('#history-log').textContent()).includes(ready.enemy.name));await page.locator('#close-history').click();
  }
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:width===1440?1050:844});await page.locator('[data-class="water"]').click();await page.locator('[data-major="cold"]').click();assert.ok(await page.evaluate(()=>document.querySelector('#loadout-dialog').scrollWidth<=document.querySelector('#loadout-dialog').clientWidth+1));
   await page.locator('#apply-loadout').click();await page.locator('[data-skill="frost"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const hud=await page.locator('.arena-hud').boundingBox(),art=await page.locator('#player-art').boundingBox();assert.ok(hud.y+hud.height<=art.y,'States and portraits do not overlap');
   assert.equal(await page.locator('#player-art').evaluate(el=>getComputedStyle(el).transform),'none');assert.equal(await page.locator('#enemy-art').evaluate(el=>getComputedStyle(el).transform),'matrix(-1, 0, 0, 1, 0, 0)');
   await page.screenshot({path:`/workspace/qingxiao-water-${width}.png`,fullPage:true});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-skill="waterbolt"]').click();assert.ok(await page.evaluate(()=>[...document.images].every(im=>im.complete&&im.naturalWidth>0)));assert.deepEqual(errors,[]);
  console.log('Water browser: four schools, two majors, eight-select-six, manual condensation/control/tide, cancel isolation, both questioning NPCs, complete history metrics and 1440/390/320 layouts/portrait orientation passed.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
