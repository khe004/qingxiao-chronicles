const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'dist'),server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],missing=[];page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.addInitScript(()=>{window.duelTools={};Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.duelTools[t.name]=t;}}});});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#cancel-loadout').click();
  const timings=await page.evaluate(async()=>{
   const {DuelBattle}=await import('./duel-setup.mjs'),{choosePreparedAction}=await import('./auto.mjs'),samples=[];
   for(const [key,major] of [['wood','symbiosis'],['wood','parasitic'],['earth','bastion'],['earth','mountain']])for(const distance of [0,1,2]){
    const b=new DuelBattle(key,{major},{key:'wood',major:'parasitic'});b.distance=distance;b.player.qi[key]=8;b.player.qi.any=2;if(key==='wood')b.player.growth=2;else b.player.terrain=3;b.planEnemy();
    const start=performance.now(),stats={};choosePreparedAction(b,'balanced',{stats});samples.push({key,major,distance,ms:performance.now()-start,forecasts:stats.forecasts});
   }
   return samples;
  });
  assert.ok(timings.every(s=>s.forecasts<=48));await page.clock.install();
  await page.locator('#duel-button').click();await page.locator('[data-duel-class="player"]').selectOption('wood');await page.locator('[data-duel-major="player"]').selectOption('symbiosis');await page.locator('[data-duel-class="enemy"]').selectOption('sword');await page.locator('[data-duel-major="enemy"]').selectOption('quick');await page.locator('#apply-duel').click();
  await page.locator('#auto-tendency').selectOption('defensive');await page.locator('#auto-speed').selectOption('fast');await page.locator('#auto-toggle').click();await page.clock.runFor(120000);
  const state=await page.evaluate(()=>window.duelTools.read_duel_state.execute({}));assert.ok(state.result,'Browser autoplay completes');
  const log=await page.locator('#battle-log').textContent();assert.ok(log.includes('【自动·稳守】'));assert.ok(log.includes('选择「培植诀」'));assert.ok(log.includes('付费培植跨过阶段'));assert.ok(/选择「(灵植回春|蔓生屏|繁花击)」/.test(log));assert.ok(log.includes('已比较下次自身行动的兑现'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#restart-button').click();
  const restarted=await page.evaluate(()=>window.duelTools.read_duel_state.execute({}));assert.equal(restarted.player.major,'symbiosis');assert.equal(restarted.enemy.major,'quick');assert.equal(restarted.round,1);assert.equal(restarted.player.growth,0);
  await page.locator('#auto-toggle').click();await page.clock.runFor(500);await page.locator('#auto-toggle').click();const paused=await page.evaluate(()=>window.duelTools.read_duel_state.execute({}));await page.clock.runFor(5000);assert.deepEqual(await page.evaluate(()=>window.duelTools.read_duel_state.execute({})),paused);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log(JSON.stringify({checks:'Prepared AI browser: bounded native decision timing, mobile natural cultivation/maturity/harvest, readable reasons, completed autoplay, reset persistence and pause immutability passed.',maxMs:Math.max(...timings.map(s=>s.ms)),timings}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
