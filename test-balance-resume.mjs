import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {gzipSync,gunzipSync} from 'node:zlib';import {spawnSync} from 'node:child_process';
// Replays a subset of the ongoing/full report to exercise a real interrupted
// measurement. These validations are not new win-rate samples.
const temp=await mkdtemp(join(tmpdir(),'qingxiao-resume-'));const run=dir=>spawnSync(process.execPath,['scripts/check-twelve-school.mjs',dir,'--loadouts=tactics','--controllers=immediate','--distances=0','--resume'],{encoding:'utf8'});
try{
 // Generate a small current-rule fixture; historical reports may have valid
 // but different combat hashes and cannot serve as current-rule checkpoints.
 const root=process.argv[2]??`${temp}/seed`;
 if(!process.argv[2]){const seed=spawnSync(process.execPath,['scripts/check-twelve-school.mjs',root,'--loadouts=tactics','--controllers=immediate','--distances=0'],{encoding:'utf8'});assert.equal(seed.status,0,seed.stderr);}
 const list=JSON.parse(gunzipSync(await readFile(`${root}/checkpoint.json.gz`)));const first=list.find(r=>r.index===0);assert.ok(first);
 for(const dir of ['valid','duplicate','changed']){await cp(`${root}/source`,`${temp}/${dir}/source`,{recursive:true});await cp(`${root}/source-hashes.json`,`${temp}/${dir}/source-hashes.json`);await writeFile(`${temp}/${dir}/checkpoint.json.gz`,gzipSync(JSON.stringify(dir==='duplicate'?[first,first]:[first])));}
 const valid=run(`${temp}/valid`);assert.equal(valid.status,0,valid.stdout+valid.stderr);const records=JSON.parse(gunzipSync(await readFile(`${temp}/valid/records.json.gz`)));assert.equal(records.length,156);assert.deepEqual(records[0],first,'Saved scenario preserved without rerun');assert.equal(new Set(records.map(r=>r.index)).size,156);
 const repeat=run(`${temp}/valid`);assert.equal(repeat.status,0,repeat.stderr);assert.deepEqual(JSON.parse(gunzipSync(await readFile(`${temp}/valid/records.json.gz`))),records,'Completed export does not run new games');
 const duplicate=run(`${temp}/duplicate`);assert.notEqual(duplicate.status,0);assert.match(duplicate.stderr,/duplicate checkpoint index/);
 const hashes=JSON.parse(await readFile(`${temp}/changed/source-hashes.json`));hashes['dist/engine.mjs']='0'.repeat(64);await writeFile(`${temp}/changed/source-hashes.json`,JSON.stringify(hashes));const changed=run(`${temp}/changed`);assert.notEqual(changed.status,0);assert.match(changed.stderr,/Resume rules changed/);
 const reused=spawnSync(process.execPath,['scripts/check-twelve-school.mjs',`${temp}/reused`,'--loadouts=tactics','--controllers=immediate','--distances=0',`--reuse-from=${temp}/valid`,'--skill-rule-reuse'],{encoding:'utf8'});assert.equal(reused.status,0,reused.stderr);
 const before=JSON.parse(await readFile(`${temp}/reused/summary.json`));assert.equal(before.measurement.structurallyReused,156);assert.equal(before.measurement.executed,0);
 const resumed=run(`${temp}/reused`);assert.equal(resumed.status,0,resumed.stderr);const after=JSON.parse(await readFile(`${temp}/reused/summary.json`));assert.deepEqual(after.measurement,before.measurement,'Resume preserves verified reuse origin and boundary');
 // Expanding a screen preserves saved candidate results and also imports
 // previously measured unaffected scenarios from the same verified origin.
 await cp(`${temp}/reused`,`${temp}/expanded`,{recursive:true});
 const checkpoint=JSON.parse(gunzipSync(await readFile(`${temp}/expanded/checkpoint.json.gz`))).slice(0,2);
 await writeFile(`${temp}/expanded/checkpoint.json.gz`,gzipSync(JSON.stringify(checkpoint)));
 const args=['scripts/check-twelve-school.mjs',`${temp}/expanded`,'--loadouts=tactics','--controllers=immediate','--distances=0,1','--resume','--skill-rule-reuse',`--reuse-from=${temp}/valid`];
 const expanded=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(expanded.status,0,expanded.stdout+expanded.stderr);
 const expandedSummary=JSON.parse(await readFile(`${temp}/expanded/summary.json`));
 assert.equal(expandedSummary.measurement.structurallyReused,156);assert.equal(expandedSummary.measurement.executed,156);
 const expandedRows=JSON.parse(gunzipSync(await readFile(`${temp}/expanded/records.json.gz`)));
 assert.deepEqual(expandedRows.slice(0,2),checkpoint);assert.equal(expandedRows.length,312);
 args[args.length-1]=`--reuse-from=${root}`;
 const wrongOrigin=spawnSync(process.execPath,args,{encoding:'utf8'});assert.notEqual(wrongOrigin.status,0);assert.match(wrongOrigin.stderr,/reuse origin or boundary changed/);
 console.log('Balance checkpoint: 1/156 partial run resumes only missing scenarios, completed export preserves all records, duplicate indices and changed combat hashes rejected. Validation replays excluded from new measurement counts.');
}finally{await rm(temp,{recursive:true,force:true});}
