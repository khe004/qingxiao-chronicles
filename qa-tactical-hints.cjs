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
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1'))missing.push(r.url());});
  await page.addInitScript(()=>{window.duelTools={};Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.duelTools[t.name]=t;}}});});
  await page.clock.install();await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#cancel-loadout').click();
  const state=()=>page.evaluate(()=>window.duelTools.read_duel_state.execute({}));
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:844});await page.locator('#duel-button').click();
   await page.locator('[data-duel-class="player"]').selectOption('flame');await page.locator('[data-duel-major="player"]').selectOption('fierce');await page.locator('[data-duel-build="player"]').selectOption('tactical');
   await page.locator('[data-duel-class="enemy"]').selectOption('wood');await page.locator('[data-duel-major="enemy"]').selectOption('symbiosis');await page.locator('[data-duel-build="enemy"]').selectOption('tactical');await page.locator('#apply-duel').click();
   const before=await state(),log=await page.locator('#battle-log').textContent();
   if(!await page.locator('#tactical-hints').evaluate(el=>el.open))await page.locator('#tactical-hints summary').click();
   await page.clock.runFor(1);await page.waitForFunction(()=>document.querySelector('[data-hint="combo"]'));
   assert.deepEqual(await state(),before);assert.equal(await page.locator('#battle-log').textContent(),log);
   assert.ok((await page.locator('[data-hint="combo"]').textContent()).includes('3行动'));
   await page.locator('[data-skill="kindle"]').click();await page.clock.runFor(1);
   assert.ok(await page.locator('[data-skill="firestorm"]').isEnabled());assert.ok((await page.locator('[data-hint="outlet"]').textContent()).includes('焰海横流'));
   assert.equal(await page.locator('[data-hint="combo"]').count(),0,'Hints refresh after spending setup AP');
   await page.locator('[data-skill="firestorm"]').click();assert.equal((await state()).player.ap,0);assert.ok(await page.locator('[data-hint="spent"]').isVisible());
   await page.locator('#end-turn').click();for(let n=0;(await state()).phase!=='player'&&!(await state()).result;n++){
    assert.ok(n<24);if((await state()).phase==='reaction'){assert.ok(await page.locator('[data-hint="reaction"]').isVisible());await page.locator('[data-reaction="none"]').click();}else await page.clock.runFor(700);
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`/workspace/qingxiao-hints-${width}.png`,fullPage:true});
   await page.locator('#tactical-hints summary').click();await page.clock.runFor(1);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('Tactical hints browser: immutable opening, legal three-AP combo, actual follow-up after setup, live AP and reaction updates, no errors/404 and 1440/390/320 layouts passed.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
