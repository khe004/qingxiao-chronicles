import {predictiveDuel} from './predictive-arena.mjs';
import {MAJORS} from '../dist/engine.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const out=process.argv[2]??'/tmp/qingxiao-six-school',keys=['fire','sword','flame','water','wood','earth'];
const build=(key,major=Object.keys(MAJORS[key])[0])=>({key,config:{major}}),scenarios=[];
for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)for(const first of [0,1])scenarios.push({a:build(keys[i]),b:build(keys[j]),first,distance:1,tendency:'balanced',kind:'cross'});
for(const key of keys)for(const major of Object.keys(MAJORS[key]))for(const first of [0,1])scenarios.push({a:build(key,major),b:build(key,major),first,distance:1,tendency:'balanced',kind:'mirror'});
const records=[];
for(const controller of ['immediate','prepared'])for(const s of scenarios){const start=performance.now(),r=predictiveDuel(s.a,s.b,{first:s.first,distance:s.distance,prefs:[s.tendency,s.tendency],controllers:[controller,controller],trace:true});records.push({...s,controller,...r,ms:performance.now()-start});if(records.length%12===0)console.log(`${records.length}/108 games complete`);}
const groups={};for(const r of records){const g=groups[r.controller]??={games:0,draws:0,firstWins:0,rounds:0,schools:{}};g.games++;g.rounds+=r.rounds;if(r.winner===null)g.draws++;else{if(r.winner===r.first)g.firstWins++;}for(const [seat,b] of [r.a,r.b].entries()){const p=g.schools[b.key]??={games:0,wins:0,draws:0,actions:{}};p.games++;if(r.winner===seat)p.wins++;if(r.winner===null)p.draws++;for(const [id,n] of Object.entries(r.metrics[seat].actions))p.actions[id]=(p.actions[id]||0)+n;}}
await mkdir(out,{recursive:true});await writeFile(`${out}/records.json.gz`,gzipSync(JSON.stringify(records)));await writeFile(`${out}/summary.json`,JSON.stringify({baseline:'54559c891e5796900adb8a525b1ae047dce2fca9',limits:{rounds:30,distance:1,tendency:'balanced',cross:'six default majors with both initiatives',mirrors:'all twelve majors with both initiatives',preparedBoundary:'fixed public script; actual rival chooses again'},groups},null,2));console.log(JSON.stringify(groups));
