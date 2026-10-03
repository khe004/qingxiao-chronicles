import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {ChallengeBattle} from '../dist/challenge-battle.mjs';
import {OPPONENTS} from '../dist/opponents.mjs';
import {chooseAction,chooseReaction} from '../dist/auto.mjs';
import {blobHash} from './shield-score-variants.mjs';
const dir='docs/balance/opponent-personalities';mkdirSync(dir,{recursive:true});const rows=[],started=performance.now();
for(const major of ['ignite','sustain','quick','heavy'])for(const opponentId of Object.keys(OPPONENTS))for(const distance of [0,1,2])for(const tendency of ['balanced','aggressive','defensive','burst']){
 const key=['ignite','sustain'].includes(major)?'fire':'sword',b=new ChallengeBattle(key,{major},opponentId,{distance});let steps=0;
 while(!b.result){assert.ok(steps++<700);if(b.phase==='player'){const c=chooseAction(b,tendency);assert.ok((c.action==='end'?b.endTurn():b.act(b.player,c.skillId)).ok);}else if(b.phase==='reaction')assert.ok(b.react(chooseReaction(b,tendency).response).ok);else b.enemyStep();}
 const review=b.review();for(const a of review.actors){const q=a.charges;assert.equal(q.started,q.released+q.interrupted+q.rangeMiss+q.canceled+q.pending);}
 rows.push({major,opponentId,distance,tendency,first:'player',...review,logs:b.logs});if(rows.length%24===0)console.log(`${rows.length}/192 personality games (${((performance.now()-started)/1000).toFixed(1)}s)`);
}
const files=['dist/engine.mjs','dist/auto.mjs','dist/opponents.mjs','dist/challenge-battle.mjs'],sources=Object.fromEntries(files.map(p=>[p,readFileSync(p,'utf8')]));
const summary={games:rows.length,first:'player',limit:30,variable:'Personality behavior acceptance using shipped fixed public plans, not a PvP balance or best-policy win-rate estimate.',elapsedSeconds:(performance.now()-started)/1000,hashes:Object.fromEntries(files.map(p=>[p,blobHash(sources[p])])),opponents:Object.keys(OPPONENTS).map(id=>{const rs=rows.filter(r=>r.opponentId===id),stats=rs.map(r=>r.actors[1]);return {id,n:rs.length,playerWins:rs.filter(r=>r.result==='win').length,opponentWins:rs.filter(r=>r.result==='lose').length,draws:rs.filter(r=>r.result==='draw').length,meanRounds:rs.reduce((n,r)=>n+r.rounds,0)/rs.length,movement:stats.reduce((n,a)=>n+a.movement,0),unusedAP:stats.reduce((n,a)=>n+a.unusedAP,0),charges:stats.reduce((n,a)=>n+a.charges.started,0),healing:stats.reduce((n,a)=>n+a.healing,0),intentSpent:stats.reduce((n,a)=>n+a.intentSpent,0),actions:Object.fromEntries([...new Set(stats.flatMap(a=>Object.keys(a.actions)))].map(s=>[s,stats.reduce((n,a)=>n+(a.actions[s]||0),0)]))};})};
assert.equal(rows.length,192);writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');writeFileSync(dir+'/games.json.gz',gzipSync(JSON.stringify({summary,rows}),{level:9}));writeFileSync(dir+'/source.json.gz',gzipSync(JSON.stringify({sources,runner:readFileSync('scripts/check-opponents.mjs','utf8')}),{level:9}));console.log(JSON.stringify(summary.opponents));
