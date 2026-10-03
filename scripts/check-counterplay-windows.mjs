import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {ChallengeBattle} from '../dist/challenge-battle.mjs';
import {COUNTERS,directChoice,counterReaction} from './counterplay-policies.mjs';
const files=['dist/engine.mjs','dist/auto.mjs','dist/opponents.mjs','dist/opponent-planner.mjs','dist/opponent-resources.mjs','dist/challenge-battle.mjs','scripts/counterplay-policies.mjs'],sources=Object.fromEntries(files.map(p=>[p,readFileSync(p,'utf8')])),rows=[],windows=[],started=performance.now();
const zero={metal:0,wood:0,water:0,fire:0,earth:0,any:0};
function assertCharges(b){for(const a of b.review().actors){const q=a.charges;assert.equal(q.started,q.released+q.interrupted+q.rangeMiss+q.canceled+q.pending);}}
for(const major of ['quick','heavy','ignite','sustain'])for(const opponentId of ['heavy','ignite'])for(const distance of [0,1,2])for(const route of COUNTERS){
 const key=['quick','heavy'].includes(major)?'sword':'fire',b=new ChallengeBattle(key,{major},opponentId,{distance,difficulty:'questioning'});let n=0;
 while(!b.result){assert.ok(n++<700);if(b.phase==='player'){const c=directChoice(b,route);assert.ok((c.action==='end'?b.endTurn():b.act(b.player,c.skillId)).ok);}else if(b.phase==='reaction')assert.ok(b.react(counterReaction(b,route)).ok);else b.enemyStep();}
 assertCharges(b);rows.push({major,opponentId,distance,route,first:'player',...b.review(),logs:b.logs});if(rows.length%24===0)console.log(`${rows.length}/96 natural counterplay games`);
}
// Controlled paid-charge windows, not sampled natural games or win rates.
// Everything is paid through the normal engine. The prepared qi/intent/burn
// are declared explicitly, and no subsequent NPC attacks are added.
for(const opponentId of ['heavy','ignite'])for(const key of ['sword','fire'])for(const distance of [1,2])for(const enemyHp of ['healthy','finishable'])for(const route of COUNTERS){
 const b=new ChallengeBattle(key,{},opponentId,{distance,difficulty:'questioning'});b.logs=[];b.serial=0;b.round=3;
 b.player.qi={...zero,...(key==='sword'?{metal:5,water:2,any:3}:{fire:5,wood:2,any:3})};b.enemy.qi={...zero,...(opponentId==='heavy'?{metal:5,water:2,any:3}:{fire:5,wood:2,any:3})};b.enemy.intent=opponentId==='heavy'?5:0;b.enemy.hp=enemyHp==='finishable'?35:b.enemy.maxHp;
 if(opponentId==='ignite'){b.player.burn=3;b.player.burnTurns=3;}
 b.log(`固定试招：第3回合，两方各10灵气，${opponentId==='heavy'?'对手5剑意':'玩家3灼烧'}，对手${enemyHp==='finishable'?'35':'满'}气血；仅比较当前蓄势窗口。`,'setup');
 b.phase='enemy';const id=opponentId==='heavy'?'unity':'inferno';assert.ok(b.act(b.enemy,id).ok);assert.ok(b.act(b.enemy,opponentId==='heavy'?'guard':'meditate').ok);b.expireEdge(b.enemy);b.beginRound();b.enemyPlan=[];b.enemyQueue=[];b.enemyReasons=[];b.log('试招预告：释放当前大招后不追加攻击。','setup');
 const before=b.snapshot(),hp=b.player.hp;let n=0,counterAP=null;
 while(!b.result&&b.phase==='player'){assert.ok(n++<8);const wasInRange=b.enemy.charge?.range.includes(b.distance),c=directChoice(b,route);assert.ok((c.action==='end'?b.endTurn():b.act(b.player,c.skillId)).ok);if(counterAP===null&&(!b.enemy.charge||(wasInRange&&!b.enemy.charge?.range.includes(b.distance))||b.result==='win'))counterAP=b.stats[0].spentAP;}
 if(b.phase==='reaction')assert.ok(b.react(counterReaction(b,route)).ok);
 assertCharges(b);const review=b.review(),q=review.actors[1].charges;
 windows.push({opponentId,key,distance,enemyHp,route,before,...review,windowOutcome:q.interrupted?'interrupted':q.rangeMiss?'rangeMiss':q.released?'released':b.result==='win'?'killed':'pending',counterAP,playerHpLoss:hp-b.player.hp,logs:b.logs});
}
const sum=rs=>({n:rs.length,playerWins:rs.filter(r=>r.result==='win').length,opponentWins:rs.filter(r=>r.result==='lose').length,draws:rs.filter(r=>r.result==='draw').length,started:rs.reduce((n,r)=>n+r.actors[1].charges.started,0),released:rs.reduce((n,r)=>n+r.actors[1].charges.released,0),interrupted:rs.reduce((n,r)=>n+r.actors[1].charges.interrupted,0),rangeMiss:rs.reduce((n,r)=>n+r.actors[1].charges.rangeMiss,0),pending:rs.reduce((n,r)=>n+r.actors[1].charges.pending,0),chargeHpDamage:rs.reduce((n,r)=>n+r.actors[1].charges.hpDamage,0)});
const summary={naturalGames:rows.length,controlledWindows:windows.length,scope:'Natural games: four player majors, two NPCs, three distances, four intentionally simple counterplay policies, same recommended equipment and fixed player-first. Controlled windows are prepared paid-charge states, not natural win-rate samples. Shield/rush policies do not read the frozen queue; interrupt/movement inspect active charges. Common immediate attack/recovery policy and equipment otherwise unchanged.',elapsedSeconds:(performance.now()-started)/1000,natural:COUNTERS.map(route=>({route,...sum(rows.filter(r=>r.route===route))})),opponents:['heavy','ignite'].map(opponentId=>({opponentId,...sum(rows.filter(r=>r.opponentId===opponentId))})),windows:COUNTERS.map(route=>{const rs=windows.filter(r=>r.route===route);return {route,n:rs.length,outcomes:Object.fromEntries(['interrupted','rangeMiss','released','killed','pending'].map(k=>[k,rs.filter(r=>r.windowOutcome===k).length])),playerHpLoss:rs.reduce((n,r)=>n+r.playerHpLoss,0),spentAP:rs.reduce((n,r)=>n+r.actors[0].spentAP,0)};})};
for(const [p,s] of Object.entries(sources))assert.equal(readFileSync(p,'utf8'),s,'Source changed during benchmark');assert.equal(rows.length,96);assert.equal(windows.length,64);
const dir='docs/balance/counterplay-windows';mkdirSync(dir,{recursive:true});writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');writeFileSync(dir+'/games.json.gz',gzipSync(JSON.stringify({summary,rows,windows}),{level:9}));writeFileSync(dir+'/source.json.gz',gzipSync(JSON.stringify({sources,runner:readFileSync('scripts/check-counterplay-windows.mjs','utf8')}),{level:9}));console.log(JSON.stringify(summary));
