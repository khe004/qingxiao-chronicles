import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
const source=resolve(process.argv[2]??'.');
const {Battle,CLASSES,MAJORS,RULES,normalizeLoadout}=await import(pathToFileURL(join(source,'dist/engine.mjs')));
for(const key of Object.keys(MAJORS))for(const major of Object.keys(MAJORS[key])){
 const expected=RULES.majorHp?.[key]?.[major]??CLASSES[key].hp;
 const b=new Battle(key,{major});
 assert.equal(b.player.maxHp,expected);assert.equal(b.player.hp,expected);
 assert.equal(Object.values(b.player.qi).reduce((n,x)=>n+x,0),5);assert.equal(b.player.ap,3);
 const duel=new Battle(key,normalizeLoadout(key,{major}),{key,...normalizeLoadout(key,{major})});
 assert.equal(duel.enemy.maxHp,expected);assert.equal(duel.enemy.hp,expected);
 if(RULES.majorHp?.[key]?.[major])assert.ok(MAJORS[key][major].effect.includes(String(expected)));
}
// Exercise actual HP changes and the measurement boundary, including resume.
// This is a validation replay, not additional win-rate evidence.
const temp=await mkdtemp(join(tmpdir(),'qingxiao-hp-proof-'));
const run=(args)=>spawnSync(process.execPath,['scripts/check-twelve-school.mjs',...args,'--loadouts=tactics','--controllers=immediate','--distances=0'],{cwd:temp,encoding:'utf8'});
try{
 for(const dir of ['dist','scripts'])await cp(join(source,dir),join(temp,dir),{recursive:true});
 await mkdir(join(temp,'.git'));await writeFile(join(temp,'.git/HEAD'),'0'.repeat(40)+'\n');
 const seed=run([join(temp,'before')]);assert.equal(seed.status,0,seed.stdout+seed.stderr);
 const rules=structuredClone(RULES);rules.majorHp??={};rules.majorHp.earth??={};
 const hp=(RULES.majorHp?.earth?.mountain??CLASSES.earth.hp)+1;
 rules.majorHp.earth.mountain=hp;
 await writeFile(join(temp,'dist/rules.mjs'),'export const RULES = '+JSON.stringify(rules)+';\n');
 const updated=await import(pathToFileURL(join(temp,'dist/engine.mjs')));
 assert.equal(new updated.Battle('earth',{major:'mountain'}).player.maxHp,hp,'HP map must affect the executed constructor');
 const reuse=run([join(temp,'after'),'--reuse-from='+join(temp,'before'),'--actor-rule-reuse']);
 assert.equal(reuse.status,0,reuse.stdout+reuse.stderr);
 const summary=JSON.parse(await readFile(join(temp,'after/summary.json')));
 assert.equal(summary.measurement.executed,24);assert.equal(summary.measurement.structurallyReused,132);
 const rows=JSON.parse(gunzipSync(await readFile(join(temp,'after/records.json.gz'))));
 for(const r of rows){const affected=[r.a,r.b].some(b=>b.key==='earth'&&b.config.major==='mountain');assert.equal(Boolean(r.structurallyReused),!affected);}
 const resume=run([join(temp,'after'),'--resume']);assert.equal(resume.status,0,resume.stdout+resume.stderr);
 assert.deepEqual(JSON.parse(await readFile(join(temp,'after/summary.json'))).measurement,summary.measurement);
 console.log('Starting/max HP in both seats, fallback, descriptions and unchanged income/AP; real HP change reruns all 24 affected scenarios and preserves 132 unchanged scenarios with provenance across resume. Validation replays only.');
}finally{await rm(temp,{recursive:true,force:true});}
