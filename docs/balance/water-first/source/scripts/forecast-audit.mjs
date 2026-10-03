import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
import {Battle,MAJORS} from '../dist/engine.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const blobHash=s=>createHash('sha1').update(`blob ${Buffer.byteLength(s)}\0`).update(s).digest('hex');
// Exercise the production predictor without adding a testing API to the shipped module.
// Only its export visibility and relative import URL change; all decisions stay intact.
export async function loadForecastModel(){
  const source=readFileSync(resolve(root,'dist/auto.mjs'),'utf8');
  assert.equal(source.split('function projectEnemyPhase(').length,2);
  assert.equal(source.split("'./engine.mjs'").length,2);
  const instrumented=source.replace('function projectEnemyPhase(','export function projectEnemyPhase(')
    .replace("'./engine.mjs'",JSON.stringify(pathToFileURL(resolve(root,'dist/engine.mjs')).href));
  return import('data:text/javascript;base64,'+Buffer.from(instrumented).toString('base64'));
}
const boundaries=new WeakMap();
class AuditedBattle extends Battle{
  beginRound(){boundaries.set(this,auditState(this));return super.beginRound();}
}
export function auditState(b){const {logs,...state}=b;return structuredClone(state);}
export function cloneForAudit(b){return Object.assign(Object.create(AuditedBattle.prototype),auditState(b),{logs:[]});}
export function advanceActual(b,tendency,chooseReaction){
  boundaries.delete(b);
  assert.ok(b.endTurn().ok);
  for(let steps=0;!b.result&&b.phase!=='player';steps++){
    assert.ok(steps<32,'Enemy phase did not finish');
    if(b.phase==='reaction')assert.ok(b.react(chooseReaction(b,tendency).response).ok);
    else{assert.equal(b.phase,'enemy');b.enemyStep();}
  }
  return {enemyEnd:boundaries.get(b)??auditState(b),nextPlayer:auditState(b)};
}
export async function auditForecast(){
  const model=await loadForecastModel(),rows=[],games=[];
  for(const key of ['fire','sword'])for(const major of Object.keys(MAJORS[key])){
    const enemyKey=key==='fire'?'sword':'fire';
    for(const enemyMajor of Object.keys(MAJORS[enemyKey]))for(const distance of [0,1,2])for(const tendency of Object.keys(model.TENDENCIES)){
      const b=new Battle(key,{major},{major:enemyMajor});Object.setPrototypeOf(b,AuditedBattle.prototype);
      b.distance=distance;b.planEnemy();const label={key,major,enemyMajor,distance,tendency};
      for(let steps=0;!b.result;steps++){
        assert.ok(steps<600,'Public-plan duel did not terminate');assert.equal(b.phase,'player');
        const choice=model.chooseAction(b,tendency);assert.ok(choice);
        if(choice.action==='skill'){assert.ok(b.act(b.player,choice.skillId).ok);continue;}
        const before=JSON.stringify(b),prediction=model.projectEnemyPhase(b,tendency);
        assert.equal(JSON.stringify(b),before,'Prediction mutated the live duel');
        const actual=advanceActual(b,tendency,model.chooseReaction);
        assert.deepEqual(auditState(prediction),actual.nextPlayer,'Public-plan forecast must match every combat field at the same horizon');
        const effects=b.logs.filter(l=>l.id>JSON.parse(before).serial);
        rows.push({...label,round:JSON.parse(before).round,plan:JSON.parse(before).enemyQueue,
          predicted:{hp:[prediction.player.hp,prediction.enemy.hp],shield:[prediction.player.shield,prediction.enemy.shield],distance:prediction.distance,result:prediction.result},
          enemyEnd:{hp:[actual.enemyEnd.player.hp,actual.enemyEnd.enemy.hp],shield:[actual.enemyEnd.player.shield,actual.enemyEnd.enemy.shield],distance:actual.enemyEnd.distance,result:actual.enemyEnd.result},
          actual:{hp:[b.player.hp,b.enemy.hp],shield:[b.player.shield,b.enemy.shield],distance:b.distance,result:b.result},
          fullStateEqual:true,effects:effects.map(l=>l.text)});
      }
      games.push({...label,result:b.result,rounds:b.round});
    }
  }
  const difference=rows.filter(r=>JSON.stringify(r.enemyEnd.hp)!==JSON.stringify(r.actual.hp)||JSON.stringify(r.enemyEnd.shield)!==JSON.stringify(r.actual.shield));
  const stats={duels:games.length,enemyPhases:rows.length,completeStateMatches:rows.filter(r=>r.fullStateEqual).length,
    playerHpMAE:rows.reduce((n,r)=>n+Math.abs(r.predicted.hp[0]-r.actual.hp[0]),0)/rows.length,
    enemyHpMAE:rows.reduce((n,r)=>n+Math.abs(r.predicted.hp[1]-r.actual.hp[1]),0)/rows.length,
    distanceMatches:rows.filter(r=>r.predicted.distance===r.actual.distance).length,
    differentHpOrShieldAcrossHorizons:difference.length,
    skippedRange:rows.filter(r=>r.effects.some(t=>t.includes('距离不适合'))).length,
    evades:rows.filter(r=>r.effects.some(t=>t.includes('闪身避让'))).length,
    releases:rows.filter(r=>r.effects.some(t=>t.includes('释放「'))).length};
  return {summary:{engineHash:blobHash(readFileSync(resolve(root,'dist/engine.mjs'))),autoHash:blobHash(readFileSync(resolve(root,'dist/auto.mjs'))),
    horizon:'Current player action end through next player phase start, including both regeneration, player burn and free charge release; stop immediately on victory/defeat.',
    scope:'Public fixed enemy queue, both schools/four majors, recommended loadouts, three starting distances and four player tendencies. Same automatic reaction policy; deterministic rule consistency, not AI optimality or human win rates.',...stats},games,rows};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await auditForecast();
  const output=process.argv.indexOf('--out');
  if(output!==-1){
    assert.ok(process.argv[output+1],'Provide an output directory');const dir=resolve(process.argv[output+1]);mkdirSync(dir,{recursive:true});
    writeFileSync(resolve(dir,'summary.json'),JSON.stringify(result.summary,null,2)+'\n');
    writeFileSync(resolve(dir,'cases.json.gz'),gzipSync(JSON.stringify(result)+'\n',{level:9}));
  }
  console.log(JSON.stringify(result.summary,null,2));
}
