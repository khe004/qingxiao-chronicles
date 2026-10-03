import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Battle,CLASSES,MAJORS,COMMON,total} from './dist/engine.mjs';
import {DuelBattle,normalizeDuel,portraitPath} from './dist/duel-setup.mjs';

const builds=Object.entries(CLASSES).flatMap(([key,c])=>Object.keys(MAJORS[key]).map((major,i)=>({key,major,skillIds:c.skills.slice(i?2:0,i?8:6).map(s=>s.id),gender:i?'female':'male'})));
const input={player:builds[0],enemy:builds[0]},config=normalizeDuel(input);
config.player.skillIds.pop();assert.equal(input.player.skillIds.length,6);assert.equal(config.enemy.skillIds.length,6);
assert.throws(()=>normalizeDuel({player:{...builds[0],gender:'unknown'},enemy:builds[1]}));
assert.throws(()=>normalizeDuel({player:builds[0],enemy:{...builds[1],skillIds:['basic']}}));
assert.throws(()=>new Battle('fire',{}, {key:'unknown'}));
assert.equal(new Battle('fire').enemy.key,'sword');assert.equal(new Battle('sword').enemy.key,'fire');
for(const key of Object.keys(CLASSES))for(const gender of ['male','female']){
  const path='dist/'+portraitPath(key,gender);assert.ok(existsSync(path));assert.equal(readFileSync(path).subarray(8,12).toString(),'WEBP');
}
let duels=0;
for(const p of builds)for(const e of builds){
  const b=new DuelBattle(p.key,p,{...e});assert.equal(b.player.key,p.key);assert.equal(b.enemy.key,e.key);assert.equal(b.enemy.major,e.major);assert.deepEqual(b.enemy.skillIds,e.skillIds);
  const common=new Set(COMMON.map(s=>s.id));
  for(let n=0;n<180&&!b.result&&b.round<=12;n++){
    if(b.phase==='player'){
      const before=structuredClone([b.player,b.enemy,b.logs]);b.planEnemy();assert.deepEqual([b.player,b.enemy,b.logs],before,'Planning does not alter live fighters or logs');
      assert.ok(b.enemyPlan.every(id=>e.skillIds.includes(id)||common.has(id)),'Custom opponents only plan equipped or common skills');
      if(b.player.ap&&!b.player.charge)assert.ok(b.act(b.player,'basic').ok);else assert.ok(b.endTurn().ok);
    }else if(b.phase==='reaction')assert.ok(b.react('none').ok);else b.enemyStep();
    for(const a of [b.player,b.enemy]){assert.ok(a.ap>=0&&a.ap<=3);assert.ok(total(a.qi)<=10);assert.ok(a.hp>=0&&a.hp<=a.maxHp);assert.ok(a.shield>=0&&a.shield<=60);assert.ok((a.tide??0)<=3);}
  }
  duels++;
}
console.log(`Custom duel: ${duels} class/major pairs with custom six-skill loadouts, same-class matches, immutable inputs/planning, twelve portrait assets and resource invariants passed.`);
