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
  const original=await state();
  const majors={fire:['ignite','sustain'],sword:['quick','heavy'],flame:['fierce','smolder'],water:['cold','tidal'],wood:['symbiosis','parasitic'],earth:['bastion','mountain']};
  let choices=0;
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:844});await page.locator('#duel-button').click();
   for(const side of ['player','enemy'])for(const [key,ids] of Object.entries(majors))for(const major of ids){
    await page.locator(`[data-duel-class="${side}"]`).selectOption(key);
    await page.locator(`[data-duel-major="${side}"]`).selectOption(major);
    for(const preset of ['core','tactical']){
     await page.locator(`[data-duel-build="${side}"]`).selectOption(preset);
     assert.equal(await page.locator(`#duel-${side} [data-duel-equip][aria-pressed="true"]`).count(),6);
     assert.equal(await page.locator(`#duel-${side} .build-costs>span`).count(),6);
     assert.equal(await page.locator(`#duel-${side} .build-guide dt`).count(),3);choices++;
     assert.ok(await page.locator(`#duel-${side} .build-panel`).evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    }
   }
   await page.locator('#duel-player [data-duel-equip][aria-pressed="true"]').first().click();
   assert.equal(await page.locator('[data-duel-build="player"]').inputValue(),'custom');assert.ok(await page.locator('#apply-duel').isDisabled());
   await page.locator('[data-duel-build="player"]').selectOption('core');assert.ok(await page.locator('#apply-duel').isEnabled());
   assert.ok(await page.locator('#duel-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   await page.locator('#duel-body').evaluate(el=>el.scrollTop=0);await page.screenshot({path:`/workspace/qingxiao-builds-${width}.png`});await page.locator('#duel-player .build-panel').scrollIntoViewIfNeeded();await page.screenshot({path:`/workspace/qingxiao-build-guide-${width}.png`});
   await page.locator('#cancel-duel').click();assert.deepEqual(await state(),original,'All draft build selections and cancellation leave live fight unchanged');
  }
  await page.locator('#duel-button').click();
  await page.locator('[data-duel-class="player"]').selectOption('wood');await page.locator('[data-duel-major="player"]').selectOption('parasitic');await page.locator('[data-duel-build="player"]').selectOption('tactical');
  await page.locator('[data-portrait="female"][data-side="player"]').click();
  await page.locator('[data-duel-class="enemy"]').selectOption('earth');await page.locator('[data-duel-build="enemy"]').selectOption('tactical');
  await page.locator('[data-portrait="male"][data-side="enemy"]').click();await page.locator('#apply-duel').click();let applied=await state();
  assert.ok(applied.player.skillIds.includes('bloomheal')&&!applied.player.skillIds.includes('leafmend'));assert.ok(applied.enemy.skillIds.includes('quakesunder')&&!applied.enemy.skillIds.includes('earthmend'));assert.deepEqual(applied.portraits,{player:'female',enemy:'male'});
  await page.locator('#edit-loadout').click();await page.locator('[data-loadout-class="sword"]').click();await page.locator('#build-select').selectOption('tactical');
  assert.ok((await page.locator('#build-guide').textContent()).includes('穿甲追风'));assert.equal(await page.locator('[data-equip="lunge"]').getAttribute('aria-pressed'),'true');await page.locator('#cancel-loadout').click();assert.deepEqual(await state(),applied);
  await page.locator('#edit-loadout').click();await page.locator('[data-loadout-class="sword"]').click();await page.locator('#build-select').selectOption('tactical');await page.locator('#apply-loadout').click();applied=await state();assert.equal(applied.player.key,'sword');assert.ok(applied.player.skillIds.includes('guard')&&applied.player.skillIds.includes('lunge'));
  await page.reload();if(!await page.locator('#loadout-dialog').isVisible())await page.locator('#edit-loadout').click();assert.equal(await page.locator('#build-select').inputValue(),'tactical');await page.locator('#cancel-loadout').click();assert.deepEqual((await state()).player.skillIds,applied.player.skillIds);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log(`Named builds browser: ${choices} selections, twelve majors × two profiles × both sides at 1440/390/320, six-slot costs/guides, custom edits, live/draft isolation, both portraits, apply and saved profile reload passed.`);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
