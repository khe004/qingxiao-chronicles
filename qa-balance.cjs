// Browser verification against an explicit measured dataset. An optional
// fixture path is for local QA only; it is never copied into dist.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
const raw=fs.readFileSync(process.argv[2]||'dist/balance-data.json');
const data=JSON.parse(raw);
const server=http.createServer((req,res)=>{
 if(req.url==='/balance-data.json'){res.setHeader('Content-Type','application/json');return res.end(raw);}
 if(req.url==='/favicon.ico'){res.statusCode=204;return res.end();}
 if(req.url==='/balance.html'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fs.readFileSync('dist/balance.html'));}
 res.statusCode=404;res.end();
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[];
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}/balance.html`);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('468 场'));
  assert.equal(await page.locator('#matrix table').count(),2);
  assert.equal(await page.locator('#matrix button').count(),132);
  assert.equal(await page.locator('#mirrors tbody tr').count(),36);
  for(const controller of ['prepared','immediate','combined']){
   await page.selectOption('#controller',controller);
   for(const [row,col] of [[0,1],[1,0],[4,7],[7,4],[9,11],[11,9]]){
    const cases=data.records.filter(r=>r.kind==='cross'&&(controller==='combined'||r.controller===controller)&&r.a===Math.min(row,col)&&r.b===Math.max(row,col));
    const wins=cases.filter(r=>r.winner!==null&&(r.winner===0?r.a:r.b)===row).length;
    const button=page.locator(`#matrix button[data-row="${row}"][data-col="${col}"]`);
    assert.equal(await button.textContent(),`${(100*wins/cases.length).toFixed(1).replace('.0','')}%`);
    await button.click();assert.equal(await page.locator('#pair tbody tr').count(),cases.length);
    assert.equal(await page.locator('#pair h2').textContent(),`${data.builds[row].name} 对 ${data.builds[col].name}`);
    const actual=await page.locator('#pair tbody tr').evaluateAll(rows=>rows.map(r=>Array.from(r.cells).map(c=>c.textContent)));
    for(let i=0;i<cases.length;i++){
     const r=cases[i],seat=r.a===row?0:1;
     assert.equal(actual[i][4],`${r.hp[seat]} / ${r.hp[1-seat]}`);
     assert.equal(actual[i][1],data.builds[r.first===0?r.a:r.b].name);
     assert.equal(actual[i][2],r.winner===null?'未决':`${data.builds[r.winner===0?r.a:r.b].name}胜`);
    }
    await page.locator('#close-pair').click();assert.ok(await button.evaluate(e=>e===document.activeElement));
   }
  }
  for(const [tendency,dataset] of Object.entries(data.datasets??{})){
   await page.selectOption('#tendency',tendency);
   assert.equal(await page.locator('#controller').inputValue(),'prepared');
   assert.equal(await page.locator('#controller option:disabled').count(),2);
   assert.ok((await page.locator('#status').textContent()).includes('468 场'));
   assert.ok((await page.locator('#version').textContent()).includes(tendency==='aggressive'?'强攻倾向':'稳守倾向'));
   for(const [row,col] of [[0,7],[7,0],[10,11],[11,10]]){
    const cases=dataset.records.filter(r=>r.kind==='cross'&&r.a===Math.min(row,col)&&r.b===Math.max(row,col));
    const wins=cases.filter(r=>r.winner!==null&&(r.winner===0?r.a:r.b)===row).length;
    const button=page.locator(`#matrix button[data-row="${row}"][data-col="${col}"]`);
    assert.equal(await button.textContent(),`${(100*wins/cases.length).toFixed(1).replace('.0','')}%`);
    await button.click();assert.equal(await page.locator('#pair tbody tr').count(),6);
    const hp=await page.locator('#pair tbody tr').evaluateAll(rows=>rows.map(r=>r.cells[4].textContent));
    cases.forEach((r,i)=>{const seat=r.a===row?0:1;assert.equal(hp[i],`${r.hp[seat]} / ${r.hp[1-seat]}`);});
    await page.locator('#close-pair').click();
   }
  }
  await page.selectOption('#tendency','balanced');
  assert.equal(await page.locator('#controller option:disabled').count(),0);
  await page.uncheck('#split');assert.equal(await page.locator('#matrix table').count(),1);
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:900});
   for(const split of [true,false]){
    await page.locator('#split').setChecked(split);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Page overflow at ${width}, split=${split}`);
    await page.locator('#matrix button[data-row="11"][data-col="0"]').click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Detail overflow at ${width}`);
    await page.locator('#close-pair').click();
   }
  }
  assert.deepEqual(errors,[]);
  console.log('Balance browser: all controllers, 12×12 split/full, reversed row/column counts/HP/initiative, pair details/focus, range-separated mirrors, 1440/390/320 layouts and no runtime/HTTP errors passed.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
