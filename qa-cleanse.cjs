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
  async function nextRound(){const before=(await state()).round;await page.locator('#end-turn').click();for(let n=0;(await state()).round===before&&!(await state()).result;n++){assert.ok(n<24);if((await state()).phase==='reaction')await page.locator('[data-reaction="none"]').click();else await page.clock.runFor(700);}}
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:844});await page.locator('#duel-button').click();
   await page.locator('[data-duel-class="player"]').selectOption('water');await page.locator('[data-duel-major="player"]').selectOption('tidal');await page.locator('[data-duel-build="player"]').selectOption('tactical');
   assert.ok((await page.locator('#duel-player .build-guide').textContent()).includes('清至多1层'));
   await page.locator('[data-duel-class="enemy"]').selectOption('flame');await page.locator('[data-duel-major="enemy"]').selectOption('smolder');await page.locator('[data-duel-build="enemy"]').selectOption('tactical');await page.locator('#duel-enemy [data-duel-equip="cinder"]').click();await page.locator('#duel-enemy [data-duel-equip="firewall"]').click();await page.locator('#apply-duel').click();
   assert.ok(await page.locator('[data-skill="purify"]').isDisabled());assert.equal(await page.locator('[data-skill="purify"]').getAttribute('title'),'自身没有灼烧');
   assert.ok((await page.locator('[data-skill="rinse"]').textContent()).includes('至多1层'));
   await nextRound();const before=await state();assert.ok(before.player.burn>=3);assert.ok(before.player.hp<=before.player.maxHp-18);
   assert.ok(await page.locator('[data-skill="purify"]').isEnabled());const title=await page.locator('[data-skill="purify"]').getAttribute('title');assert.ok(title.includes('恢复8气血'));
   await page.locator('[data-skill="rinse"]').click();const rinsed=await state();assert.equal(rinsed.player.hp,before.player.hp+18);assert.equal(rinsed.player.burn,before.player.burn-2);assert.ok(await page.locator('[data-skill="rinse"]').isDisabled());
   await page.locator('[data-skill="purify"]').click();const cleaned=await state();assert.equal(cleaned.player.hp,Math.min(rinsed.player.maxHp,rinsed.player.hp+8));assert.equal(cleaned.player.burn,0);assert.ok(await page.locator('[data-skill="purify"]').isDisabled());
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`/workspace/qingxiao-cleanse-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('Cleanse browser: actual enemy burns, 18 healing with two combined clears, paid conditional-heal full cleanse, disabled empty/repeat actions, current tooltips/guides, no errors/404 and 1440/390/320 layouts passed.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
