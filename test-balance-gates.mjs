import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
const fixture=process.argv[2]??'docs/balance/goal-v0160/full-h';
const temp=await mkdtemp(join(tmpdir(),'qingxiao-gates-'));
const run=(script,args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
try{
 const valid=`${temp}/valid`;await cp(fixture,valid,{recursive:true});
 const initial=run('scripts/balance-gates.mjs',[valid]);assert.equal(initial.status,0,initial.stderr);
 const summary=JSON.parse(await readFile(`${valid}/summary.json`));
 const rows=JSON.parse(gunzipSync(await readFile(`${valid}/records.json.gz`)));
 for(const [name,mutate,pattern] of [
  ['duplicate',async root=>{const r=structuredClone(rows);r[1]=r[0];await writeFile(`${root}/records.json.gz`,gzipSync(JSON.stringify(r)));},/Duplicate scenario/],
  ['tendency',async root=>{const s=structuredClone(summary);s.limits.tendency='aggressive';await writeFile(`${root}/summary.json`,JSON.stringify(s));},/balanced/],
  ['summary',async root=>{const s=structuredClone(summary);s.controllers.prepared.matrix[0][1].wins++;await writeFile(`${root}/summary.json`,JSON.stringify(s));},/Summary matrix differs/],
  ['hp',async root=>{const r=structuredClone(rows),winner=r.find(x=>x.winner!==null);winner.hp[1-winner.winner]=1;await writeFile(`${root}/records.json.gz`,gzipSync(JSON.stringify(r)));},/AssertionError/],
  ['max-hp',async root=>{const r=structuredClone(rows),winner=r.find(x=>x.winner!==null);winner.hp[winner.winner]=1000;await writeFile(`${root}/records.json.gz`,gzipSync(JSON.stringify(r)));},/HP outside/],
  ['fractional-hp',async root=>{const r=structuredClone(rows),winner=r.find(x=>x.winner!==null);winner.hp[winner.winner]=10.5;await writeFile(`${root}/records.json.gz`,gzipSync(JSON.stringify(r)));},/HP outside/],
  ['loadout',async root=>{const s=structuredClone(summary);s.builds[0].config.skillIds.reverse();await writeFile(`${root}/summary.json`,JSON.stringify(s));},/original twelve tactical loadouts/],
  ['source',async root=>{await writeFile(`${root}/source/dist/rules.mjs`,'export const RULES = {};');},/Frozen source changed/],
 ]){
  const root=`${temp}/${name}`;await cp(valid,root,{recursive:true});await mutate(root);
  const result=run('scripts/balance-gates.mjs',[root]);assert.notEqual(result.status,0,name);assert.match(result.stderr,pattern,name);
 }
 // A copied "passed" flag cannot publish a failed real matrix.
 const failed=JSON.parse(await readFile(`${valid}/gates.json`));assert.equal(failed.passed,false,'Use a complete rejected candidate for the stale-gate regression');
 await writeFile(`${valid}/gates.json`,JSON.stringify({...failed,passed:true}));
 const destination=`${temp}/forbidden.json`,exported=run('scripts/export-balance.mjs',[valid,destination]);
 assert.notEqual(exported.status,0);assert.match(exported.stderr,/Frozen numerical acceptance gates failed/);
 await assert.rejects(access(destination));
 console.log('Balance acceptance: complete rejected matrix remains rejected; duplicate/missing scenarios, wrong tendency, changed original loadout, summary/raw mismatch, invalid/fractional/over-limit winner HP, corrupt frozen source and stale passing export flag rejected.');
}finally{await rm(temp,{recursive:true,force:true});}
