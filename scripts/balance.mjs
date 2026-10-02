import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {Battle,CLASSES,MAJORS} from '../dist/engine.mjs';
import {TENDENCIES,chooseAction,chooseReaction} from '../dist/auto.mjs';
import {build,duel,tacticalCharge} from './balance-arena.mjs';
const out='docs/balance',pilot=process.argv.includes('--pilot'),rows=[],started=performance.now();
mkdirSync(out,{recursive:true});
const styles=Object.keys(TENDENCIES),majors=Object.keys(CLASSES).flatMap(key=>Object.keys(MAJORS[key]).map(major=>build(key,major)));
function add(group,a,b,options,extra={}){
  const result=duel(a,b,options);rows.push({group,a,b,...options,...result,...extra});
  if(rows.length%100===0)writeFileSync(`${out}/checkpoint.json`,JSON.stringify({matches:rows}));
  if(rows.length%100===0)console.log(`${rows.length} scenarios completed (${Math.round((performance.now()-started)/1000)} s)`);
}
for(const a of majors.filter(b=>b.key==='fire'))for(const b of majors.filter(b=>b.key==='sword'))for(const sa of styles)for(const sb of styles)for(const distance of pilot?[1]:[0,1,2])for(const first of [0,1])add('core',a,b,{prefs:[sa,sb],distance,first});
if(!pilot){
  for(const a of majors)for(const style of styles)for(const distance of [0,1,2])for(const first of [0,1])add('mirror',a,a,{prefs:[style,style],distance,first});
  for(const a of majors){
    const ids=CLASSES[a.key].skills.map(s=>s.id);
    for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)for(const b of majors.filter(b=>b.key!==a.key))for(const distance of [0,1,2])for(const first of [0,1]){
      add('loadout',build(a.key,a.config.major,ids.filter((_,n)=>n!==i&&n!==j)),b,{prefs:['balanced','balanced'],distance,first},{excluded:[ids[i],ids[j]]});
    }
  }
}
writeFileSync(`${out}/checkpoint.json`,JSON.stringify({matches:rows}));
const tactical=[];
if(!pilot)for(const a of majors)for(const distance of [1,2])for(const ap of [2,3])for(const layers of [0,2,5])for(const defender of styles){
  const options={distance,ap,layers,defender};
  tactical.push({key:a.key,major:a.config.major,...options,charge:tacticalCharge(a.key,a.config.major,{...options,useCharge:true}),alternative:tacticalCharge(a.key,a.config.major,{...options,useCharge:false})});
}
const campaign=[];
if(!pilot)for(const a of majors)for(const preference of styles){
  const b=new Battle(a.key,a.config);let steps=0;
  while(!b.result&&steps++<400){if(b.phase==='player'){const c=chooseAction(b,preference);if(c.action==='end')b.endTurn();else b.act(b.player,c.skillId);}else if(b.phase==='reaction')b.react(chooseReaction(b,preference).response);else b.enemyStep();}
  campaign.push({key:a.key,major:a.config.major,preference,result:b.result,rounds:b.round});
}
function aggregate(list,seat){const n=list.length,wins=list.filter(r=>r.winner===seat).length,draws=list.filter(r=>r.winner===null).length;return {n,wins,losses:n-wins-draws,draws,winRate:n?wins/n:0,drawRate:n?draws/n:0,avgRounds:n?list.reduce((s,r)=>s+r.rounds,0)/n:0};}
const core=rows.filter(r=>r.group==='core'),mirror=rows.filter(r=>r.group==='mirror'),loadouts=rows.filter(r=>r.group==='loadout');
const matrix=majors.filter(a=>a.key==='fire').flatMap(a=>majors.filter(b=>b.key==='sword').map(b=>({fire:a.config.major,sword:b.config.major,...aggregate(core.filter(r=>r.a.config.major===a.config.major&&r.b.config.major===b.config.major),0)})));
const initiative={overall:{n:core.length,wins:core.filter(r=>r.winner===r.first).length,draws:core.filter(r=>r.winner===null).length},byMajor:majors.map(a=>{
  const seat=a.key==='fire'?0:1,subset=core.filter(r=>(seat===0?r.a:r.b).config.major===a.config.major);
  return {key:a.key,major:a.config.major,first:aggregate(subset.filter(r=>r.first===seat),seat),second:aggregate(subset.filter(r=>r.first!==seat),seat)};
}),mirrors:majors.map(a=>{const subset=mirror.filter(r=>r.a.key===a.key&&r.a.config.major===a.config.major);return {key:a.key,major:a.config.major,n:subset.length,firstWins:subset.filter(r=>r.winner===r.first).length,draws:subset.filter(r=>r.winner===null).length};})};
const byDistance=[0,1,2].map(distance=>({distance,...aggregate(core.filter(r=>r.distance===distance),0)}));
const byStyle=styles.map(style=>({style,fire:aggregate(core.filter(r=>r.prefs[0]===style),0),sword:aggregate(core.filter(r=>r.prefs[1]===style),1)}));
const ablation=majors.map(a=>{
  const subset=loadouts.filter(r=>r.a.key===a.key&&r.a.config.major===a.config.major);
  const includeExclude=CLASSES[a.key].skills.map(s=>({id:s.id,name:s.name,included:aggregate(subset.filter(r=>r.a.config.skillIds.includes(s.id)),0),excluded:aggregate(subset.filter(r=>!r.a.config.skillIds.includes(s.id)),0)}));
  const groups=new Map();for(const r of subset){const k=r.a.config.skillIds.join(',');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
  const ranked=[...groups.values()].map(rs=>({skillIds:rs[0].a.config.skillIds,excluded:rs[0].excluded,...aggregate(rs,0)})).sort((x,y)=>y.winRate-x.winRate||x.avgRounds-y.avgRounds);
  return {key:a.key,major:a.config.major,includeExclude,best:ranked.slice(0,3),worst:ranked.slice(-3)};
});
const chargeTotals={};for(const r of core)for(let seat=0;seat<2;seat++)for(const [id,c] of Object.entries(r.metrics[seat].charges)){const item=chargeTotals[id]??={started:0,released:0,interrupted:0,outOfRange:0,unresolved:0,hpDamage:0,shieldDamage:0,unusedAP:0};for(const key of Object.keys(item))item[key]+=c[key];}
const skillUsage={};for(const r of core)for(let seat=0;seat<2;seat++)for(const [id,n] of Object.entries(r.metrics[seat].actions))skillUsage[id]=(skillUsage[id]||0)+n;
const skills=[];for(const key of Object.keys(CLASSES)){
  const b=new Battle(key);b.player.intent=2;b.enemy.seed=2;b.enemy.burn=2;b.enemy.burnTurns=3;
  for(const s of CLASSES[key].skills)skills.push({key,id:s.id,name:s.name,ap:s.ap,grossQi:Object.values(s.cost).reduce((n,v)=>n+v,0),cost:s.cost,intentCost:s.intentCost||0,range:s.range,kind:s.kind,basePower:s.power||0,typicalImmediate:s.power?b.preview(s):0,nominalBurn:s.burn?s.burn*4*3:0,heal:s.heal||0,usage:skillUsage[s.id]||0});
}
const pairedEffects=[];for(let i=0;i<core.length;i+=2){const a=core[i],b=core[i+1];pairedEffects.push({fire:a.a.config.major,sword:a.b.config.major,prefs:a.prefs,distance:a.distance,fireFirstWinner:a.winner,fireSecondWinner:b.winner,initiativeChangesWinner:a.winner!==b.winner});}
const gitHead=readFileSync('.git/HEAD','utf8').trim();
const sourceCommit=gitHead.startsWith('ref: ')?readFileSync('.git/'+gitHead.slice(5),'utf8').trim():gitHead;
const gitBlobHash=path=>{const bytes=readFileSync(path);return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');};
const summary={sourceCommit,engineHash:gitBlobHash('dist/engine.mjs'),autoHash:gitBlobHash('dist/auto.mjs'),deterministic:true,randomTrials:0,pilot,scenarioCounts:{core:core.length,mirror:mirror.length,loadout:loadouts.length,tactical:tactical.length*2,campaign:campaign.length},matrix,initiative,byDistance,byStyle,ablation,chargeTotals,skills,pairedInitiativeFlips:pairedEffects.filter(p=>p.initiativeChangesWinner).length,pairedCases:pairedEffects.length,draws:rows.filter(r=>r.winner===null).length,elapsedSeconds:(performance.now()-started)/1000};
mkdirSync(out,{recursive:true});const suffix=pilot?'-pilot':'';
writeFileSync(`${out}/summary${suffix}.json`,JSON.stringify(summary,null,2)+'\n');
const raw=JSON.stringify({method:'deterministic scenario enumeration; not independent random trials',matches:rows,tactical,campaign,pairedEffects})+'\n';writeFileSync(`${out}/matches${suffix}.json`,raw);writeFileSync(`${out}/matches${suffix}.json.gz`,gzipSync(raw,{level:9}));
writeFileSync(`${out}/matches${suffix}.csv`,['group,a_class,a_major,a_skills,b_class,b_major,b_skills,a_style,b_style,start_distance,first,winner,rounds,a_hp,b_hp',...rows.map(r=>[r.group,r.a.key,r.a.config.major,r.a.config.skillIds.join('|'),r.b.key,r.b.config.major,r.b.config.skillIds.join('|'),...r.prefs,r.distance,r.first,r.winner??'draw',r.rounds,...r.hp].join(','))].join('\n')+'\n');
console.log(JSON.stringify({counts:summary.scenarioCounts,matrix,initiative,charges:chargeTotals,flips:summary.pairedInitiativeFlips,paired:summary.pairedCases,draws:summary.draws,seconds:summary.elapsedSeconds},null,2));
