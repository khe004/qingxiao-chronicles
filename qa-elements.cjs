const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'dist'),server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.duelTools={};Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.duelTools[t.name]=t;}}});});
  await page.clock.install();await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#cancel-loadout').click();
  const state=()=>page.evaluate(()=>window.duelTools.read_duel_state.execute({}));
  await page.locator('#duel-button').click();await page.locator('[data-duel-class="player"]').selectOption('earth');await page.locator('[data-duel-major="player"]').selectOption('bastion');
  await page.locator('#duel-player [data-duel-equip="quakesunder"]').click();await page.locator('#duel-player [data-duel-equip="anchor"]').click();
  assert.ok((await page.locator('#duel-player [data-duel-equip="anchor"]').textContent()).includes('应对'));
  await page.locator('[data-duel-class="enemy"]').selectOption('water');await page.locator('[data-duel-major="enemy"]').selectOption('cold');await page.locator('#apply-duel').click();
  const start=await state();assert.equal(start.enemy.shield,16);assert.equal(start.player.shield,0);assert.ok(await page.locator('[data-skill="anchor"]').isDisabled());
  await page.locator('[data-skill="foundation"]').click();await page.locator('[data-skill="basic"]').click();await page.locator('[data-skill="basic"]').click();await page.locator('#end-turn').click();
  for(let i=0;!await page.locator('[data-reaction="anchor"]').count();i++){
   assert.ok(i<20);if((await state()).phase==='reaction')await page.locator('[data-reaction="none"]').click();else await page.clock.runFor(750);
  }
  const before=await state();assert.ok(await page.locator('[data-reaction="anchor"]').isEnabled());await page.locator('[data-reaction="anchor"]').click();
  const after=await state();assert.equal(after.distance,'中距');assert.equal(after.player.terrain,before.player.terrain-1);assert.equal(after.player.qi.earth,before.player.qi.earth-1);assert.equal(after.player.ap,before.player.ap);assert.equal(after.player.reaction,false);assert.ok(after.player.hp<before.player.hp);
  assert.ok((await page.locator('#battle-log').textContent()).includes('稳固应对'));assert.ok((await page.locator('#reaction-description').textContent()).includes('受克'));
  await page.clock.runFor(4000);await page.screenshot({path:'/workspace/qingxiao-v013-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok((await page.locator('footer a').getAttribute('href')).endsWith('/twelve-school-v013/final/report.md'));
  assert.deepEqual(errors,[]);console.log('Browser elements: opening compensation, equipped reaction label, disabled active anchor, actual displacement window/payment/damage/AP, five-element attack explanation, matrix link and mobile layout passed.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
