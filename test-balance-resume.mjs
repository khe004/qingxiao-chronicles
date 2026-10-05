import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {gzipSync,gunzipSync} from 'node:zlib';import {spawnSync} from 'node:child_process';
// Replays a subset of the ongoing/full report to exercise a real interrupted
// measurement. These validations are not new win-rate samples.
const root=process.argv[2]??'docs/balance/cleanse-v0153/final';const list=JSON.parse(gunzipSync(await readFile(`${root}/checkpoint.json.gz`)));const first=list.find(r=>r.index===0);assert.ok(first);
const temp=await mkdtemp(join(tmpdir(),'qingxiao-resume-'));const run=dir=>spawnSync(process.execPath,['scripts/check-twelve-school.mjs',dir,'--loadouts=tactics','--controllers=immediate','--distances=0','--resume'],{encoding:'utf8'});
try{
 for(const dir of ['valid','duplicate','changed']){await cp(`${root}/source`,`${temp}/${dir}/source`,{recursive:true});await cp(`${root}/source-hashes.json`,`${temp}/${dir}/source-hashes.json`);await writeFile(`${temp}/${dir}/checkpoint.json.gz`,gzipSync(JSON.stringify(dir==='duplicate'?[first,first]:[first])));}
 const valid=run(`${temp}/valid`);assert.equal(valid.status,0,valid.stdout+valid.stderr);const records=JSON.parse(gunzipSync(await readFile(`${temp}/valid/records.json.gz`)));assert.equal(records.length,156);assert.deepEqual(records[0],first,'Saved scenario preserved without rerun');assert.equal(new Set(records.map(r=>r.index)).size,156);
 const repeat=run(`${temp}/valid`);assert.equal(repeat.status,0,repeat.stderr);assert.deepEqual(JSON.parse(gunzipSync(await readFile(`${temp}/valid/records.json.gz`))),records,'Completed export does not run new games');
 const duplicate=run(`${temp}/duplicate`);assert.notEqual(duplicate.status,0);assert.match(duplicate.stderr,/duplicate checkpoint index/);
 const hashes=JSON.parse(await readFile(`${temp}/changed/source-hashes.json`));hashes['dist/engine.mjs']='0'.repeat(64);await writeFile(`${temp}/changed/source-hashes.json`,JSON.stringify(hashes));const changed=run(`${temp}/changed`);assert.notEqual(changed.status,0);assert.match(changed.stderr,/Resume rules changed/);
 console.log('Balance checkpoint: 1/156 partial run resumes only missing scenarios, completed export preserves all records, duplicate indices and changed combat hashes rejected. Validation replays excluded from new measurement counts.');
}finally{await rm(temp,{recursive:true,force:true});}
