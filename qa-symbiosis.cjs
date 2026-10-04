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
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:844});if(!await page.locator('#duel-dialog').isVisible())await open();
   for(const side of ['player','enemy'])for(const key of ['fire','sword','flame','water','wood','earth']){
    await page.locator(`[data-duel-class="${side}"]`).selectOption(key);
    await page.locator(`[data-duel-tactics="${side}"]`).click();
    assert.equal(await page.locator(`#duel-${side} [data-duel-equip][aria-pressed="true"]`).count(),6);
    assert.equal(await page.locator(`#duel-${side} [data-duel-equip]`).count(),12);
   }
   assert.ok(await page.locator('#duel-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   await page.locator('[data-duel-class="player"]').selectOption('wood');await page.locator('[data-duel-tactics="player"]').click();
   await page.locator('[data-duel-class="enemy"]').selectOption('sword');await page.locator('#apply-duel').click();
   assert.ok((await page.locator('#enemy-policy').textContent()).includes('超距'));
   for(const first of ['cultivate','graft']){
    if(first==='graft'){
     await open();await page.locator('#apply-duel').click();
    }
    const second=first==='graft'?'cultivate':'graft';
    await page.locator(`[data-skill="${first}"]`).click();
    assert.ok(await page.locator(`[data-skill="${second}"]`).isDisabled());
    assert.ok((await page.locator(`[data-skill="${second}"]`).textContent()).includes('共用'));
    await page.locator('[data-skill="bloomstrike"]').click();
    assert.ok(await page.locator(`[data-skill="${second}"]`).isDisabled(),'Harvest does not reset cultivation');
   }
   await open();await page.locator('#apply-duel').click();
   await page.locator('[data-skill="thornscreen"]').click();
   assert.ok((await page.locator('#player-info .counter').textContent()).includes('2次'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`/workspace/qingxiao-tactics-${width}.png`,fullPage:true});
  }
  await page.locator('#edit-loadout').click();await page.locator('#tactical-loadout').click();
  assert.equal(await page.locator('[data-equip][aria-pressed="true"]').count(),6);await page.locator('#apply-loadout').click();
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('Shared cultivation browser: both skill orders and harvest keep other cultivation disabled with public reason; both sides six schools twelve-select-six, sample buttons, finite reflection chip, public fallback policy and 1440/390/320 layouts passed.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
