import assert from 'node:assert/strict';import {writeFile,mkdir} from 'node:fs/promises';
import {DuelBattle} from '../docs/balance/tactical-v015/ai/cached/dist/duel-setup.mjs';import {choosePreparedAction,PREPARED_SEARCH_BUDGET} from '../docs/balance/tactical-v015/ai/cached/dist/auto.mjs';
import {choosePreparedAction as before} from '../docs/balance/tactical-v015/ai/before/dist/auto.mjs';
import {TACTICAL_LOADOUTS as T} from '../docs/balance/tactical-v015/ai/cached/dist/tactics.mjs';
const pairs=[['wood','symbiosis','wood','symbiosis'],['wood','parasitic','earth','bastion'],['earth','bastion','wood','symbiosis'],['earth','mountain','water','cold'],['fire','ignite','wood','symbiosis'],['sword','quick','wood','parasitic'],['water','cold','earth','mountain'],['flame','smolder','wood','symbiosis']];
const bld=(key,major)=>({major,skillIds:T[key][major]});const results=[];
for(const [index,[key,major,foe,fm]] of pairs.entries()){
 const b=new DuelBattle(key,bld(key,major),{key:foe,...bld(foe,fm)});b.distance=index%3;b.player.hp-=50;b.enemy.hp-=30;b.player.growth=2;b.player.growthPending=key==='wood';b.player.terrain=3;b.player.intent=3;b.player.tide=2;b.enemy.parasite=2;b.enemy.parasiteTurns=2;b.enemy.growth=3;b.enemy.terrain=2;b.enemy.burn=3;b.enemy.burnTurns=2;b.planEnemy();
 const oldStats={trace:true},newStats={trace:true},live=JSON.stringify(b);const old=before(b,'balanced',{stats:oldStats}),now=choosePreparedAction(b,'balanced',{stats:newStats});
 assert.deepEqual(now,old);assert.deepEqual(newStats.plans,oldStats.plans);assert.equal(JSON.stringify(b),live);assert.ok(newStats.rootStates<=PREPARED_SEARCH_BUDGET.rootStates);
 const timing={before:[],after:[]};for(let n=0;n<6;n++)for(const which of n%2?['after','before']:['before','after']){const t=performance.now();(which==='before'?before:choosePreparedAction)(b,'balanced');timing[which].push(performance.now()-t);}
 results.push({key,major,foe,fm,distance:b.distance,choice:now,plans:oldStats.plans,stats:{before:oldStats.continuationStates,after:newStats.continuationStates,hits:newStats.continuationCacheHits},timing});
}
const sum=k=>results.flatMap(r=>r.timing[k]).reduce((n,x)=>n+x,0);const summary={fixtures:results.length,timedDecisions:96,meanBefore:sum('before')/48,meanAfter:sum('after')/48,cacheHits:results.reduce((n,r)=>n+r.stats.hits,0),note:'Same complete root/follow-up scores and choices; six interleaved runs per fixture after parity warmups; local Node timing, not browser SLA',results};
const out=process.argv[2]??'/tmp/qingxiao-ai-cache';await mkdir(out,{recursive:true});await writeFile(`${out}/results.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify({fixtures:summary.fixtures,meanBefore:summary.meanBefore,meanAfter:summary.meanAfter,cacheHits:summary.cacheHits}));
