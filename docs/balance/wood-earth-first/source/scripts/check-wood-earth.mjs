// First-batch deterministic behavior sample; never a human win-rate estimate.
import assert from 'node:assert/strict';
import {mkdirSync,copyFileSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=resolve('docs/balance/wood-earth-first'),source=dir+'/source',replay=process.argv.includes('--replay');
const files=['dist/engine.mjs','dist/prepared.mjs','dist/auto.mjs','scripts/predictive-arena.mjs','scripts/planner-internals.mjs','scripts/check-wood-earth.mjs'];
if(!replay){assert.ok(!existsSync(dir+'/summary.json'),'Existing samples must be replayed, not overwritten');for(const name of files){mkdirSync(resolve(source,name,'..'),{recursive:true});copyFileSync(name,source+'/'+name);}}
const sourceHashes=Object.fromEntries(files.map(name=>[name,createHash('sha256').update(readFileSync(source+'/'+name)).digest('hex')]));
if(replay)assert.deepEqual(sourceHashes,JSON.parse(readFileSync(dir+'/summary.json')).sourceHashes);
const {predictiveDuel}=await import(pathToFileURL(source+'/scripts/predictive-arena.mjs').href);
const newcomers=[['wood','symbiosis'],['wood','parasitic'],['earth','bastion'],['earth','mountain']];
const old=[['fire','ignite'],['fire','sustain'],['sword','quick'],['sword','heavy'],['flame','fierce'],['flame','smolder'],['water','cold'],['water','tidal']],rows=[];
function run(a,b,first,distance,group){
 const result=predictiveDuel({key:a[0],config:{major:a[1]}},{key:b[0],config:{major:b[1]}},{controllers:['immediate','immediate'],prefs:['balanced','balanced'],first,distance,trace:true,limit:30});
 rows.push({a,b,first,distance,group,...result});if(rows.length%8===0)console.log(`Wood/earth sample ${rows.length}/96`);
}
for(const a of newcomers)for(const b of old)for(const first of [0,1])run(a,b,first,1,'old-schools');
for(const a of newcomers.filter(a=>a[0]==='wood'))for(const b of newcomers.filter(a=>a[0]==='earth'))for(const first of [0,1])for(const distance of [0,1,2])run(a,b,first,distance,'wood-earth');
for(const a of newcomers)for(const first of [0,1])run(a,a,first,1,'mirror');
assert.equal(rows.length,96);
const tally=data=>({games:data.length,wins:data.filter(r=>r.winner===0).length,losses:data.filter(r=>r.winner===1).length,unresolved:data.filter(r=>r.winner===null).length});
const group=key=>Object.fromEntries([...new Set(rows.map(key))].map(k=>[k,tally(rows.filter(r=>key(r)===k))]));
const actions={};for(const row of rows)for(let seat=0;seat<2;seat++)if(['wood','earth'].includes([row.a,row.b][seat][0])){const label=[row.a,row.b][seat].join('/');actions[label]??={};for(const [id,n] of Object.entries(row.metrics[seat].actions))actions[label][id]=(actions[label][id]??0)+n;}
const summary={schema:1,sourceHashes,method:'96 deterministic symmetric immediate-controller games, balanced reactions at both seats, recommended six skills, 30-round limit. 64 new-versus-old cases at middle distance with both initiatives; 24 wood-versus-earth cases across three ranges and both initiatives; 8 middle-distance mirrors. Counts concern seat 0 and are not human win rates. Unresolved limit cases are not wins or draws.',totals:tally(rows),groups:group(r=>r.group),byMatch:group(r=>r.a.join('/')+' vs '+r.b.join('/')),initiative:group(r=>r.group+'/'+r.first),actions};
if(replay){assert.deepEqual(summary,JSON.parse(readFileSync(dir+'/summary.json')));assert.deepEqual(rows,JSON.parse(gunzipSync(readFileSync(dir+'/games.json.gz'))));console.log('Frozen wood/earth replay matches every outcome, resource trace, action metric and summary.');}
else{writeFileSync(dir+'/games.json.gz',gzipSync(JSON.stringify(rows)));writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary.totals));}
