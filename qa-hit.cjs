const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');

(async()=>{
  const root=path.resolve(__dirname,'dist'),errors=[];
  const server=http.createServer((req,res)=>{
    const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
    catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const width of [1440,390])for(const key of ['fire','sword']){
      const page=await browser.newPage({viewport:{width,height:1000}});
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        window.duelTools={};
        Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.duelTools[t.name]=t;}}});
        window.sampleHit=id=>{
          const art=document.getElementById(id),animation=art.getAnimations().find(a=>a.animationName==='characterhit');
          if(!art.classList.contains('hit')||!animation)throw Error('Combat did not trigger '+id+' hit animation');
          animation.pause();
          const frames=[0,100,250,400,500].map(time=>{
            animation.currentTime=time;
            const css=getComputedStyle(art),matrix=new DOMMatrix(css.transform);
            return {time,facing:matrix.a,translate:css.translate};
          });
          animation.finish();
          return frames;
        };
      });
      await page.goto('http://127.0.0.1:'+server.address().port);
      if(key==='sword')await page.locator('[data-loadout-class="sword"]').click();
      await page.locator('#apply-loadout').click();
      const enemy=await page.evaluate(async()=>{
        await window.duelTools.perform_duel_action.execute({skillId:'basic'});
        return window.sampleHit('enemy-art');
      });
      await page.emulateMedia({reducedMotion:'reduce'});
      const quiet=await page.evaluate(async()=>{
        await window.duelTools.perform_duel_action.execute({skillId:'basic'});
        const art=document.getElementById('enemy-art');
        return {facing:new DOMMatrix(getComputedStyle(art).transform).a,animated:art.getAnimations().some(a=>a.animationName==='characterhit')};
      });
      assert.equal(quiet.facing,-1);assert.equal(quiet.animated,false);
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.locator('#end-turn').click();
      await page.locator('#reaction-dialog[open]').waitFor();
      const player=await page.evaluate(async()=>{
        await window.duelTools.respond_to_duel_attack.execute({response:'none'});
        return window.sampleHit('player-art');
      });
      for(const frames of [player,enemy]){
        for(const frame of frames)assert.equal(frame.facing,frames===player?1:-1,'Facing must remain unchanged throughout recoil');
        assert.equal(frames[1].translate,'6px');assert.equal(frames[3].translate,'-3px');
        assert.ok(['none','0px'].includes(frames[4].translate),'Portrait returns to its resting position');
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.locator('#restart-button').click();
      assert.equal(await page.locator('.character.hit').count(),0,'Restart clears hit animations');
      await page.close();
    }
    assert.deepEqual(errors,[]);
    console.log('Real combat hits: both portraits in fire/sword matches, desktop/mobile, fixed facing at five animation times, unchanged recoil offsets, reduced motion and restart cleanup passed.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
