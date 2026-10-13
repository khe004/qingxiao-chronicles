// Read partial checkpoints without interrupting measurements or counting reruns.
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
for(const root of process.argv.slice(2)){
 const records=JSON.parse(gunzipSync(await readFile(`${root}/checkpoint.json.gz`)));
 const distances=new Set(records.map(r=>r.distance)),perBuild=11*distances.size*2;
 const controllers={};
 for(const controller of ['immediate','prepared']){
  const list=records.filter(r=>r.controller===controller),cross=list.filter(r=>r.kind==='cross'),rows=new Map();
  for(const r of cross)for(const [seat,b] of [[0,r.a],[1,r.b]]){
   const row=rows.get(b.id)??{id:b.id,games:0,wins:0,draws:0};row.games++;row.wins+=r.winner===seat;row.draws+=r.winner===null;rows.set(b.id,row);
  }
  controllers[controller]={games:list.length,crossGames:cross.length,firstWins:cross.filter(r=>r.winner===r.first).length,draws:list.filter(r=>r.winner===null).length,
   completeRows:[...rows.values()].filter(r=>r.games===perBuild),partialRows:[...rows.values()].filter(r=>r.games!==perBuild)};
 }
 console.log(JSON.stringify({root,complete:records.length,controllers}));
}
