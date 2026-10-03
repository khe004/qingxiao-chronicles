import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {blobHash} from './sustain-variants.mjs';

export const RANGE_CANDIDATES=[
  {id:'base',label:'现行规则',short:[],approachRefund:false},
  {id:'low_mid',label:'低耗火法限近中距',short:['spark','ember'],approachRefund:false},
  {id:'fire_mid',label:'普通火法限近中距',short:['seed','spark','blaze','ember'],approachRefund:false},
  {id:'approach',label:'剑修首次接近返还行动',short:[],approachRefund:true},
  {id:'blaze_mid',label:'焚炎术限近中距',short:['blaze'],approachRefund:false},
];
function replaceOnce(s,a,b){assert.equal(s.split(a).length,2,'Expected one source anchor: '+a);return s.replace(a,b);}
export function rangeEngine(source,c){
  let engine=source;
  for(const id of c.short){const re=new RegExp(`(\\{id:'${id}'[^\\n]*range:)\\[[^\\]]+\\]`,'g');assert.equal([...engine.matchAll(re)].length,1);engine=engine.replace(re,'$1[0,1]');}
  if(c.approachRefund){
    const refund="if(s.id==='near'&&actor.key==='sword'&&!actor.usedSkills.includes('approach-refund')){actor.ap++;actor.usedSkills.push('approach-refund');this.log('剑修本回合首次接近返还 1 行动。','resource');}";
    engine=replaceOnce(engine,'actor.ap-=s.ap;if(s.intentCost)','actor.ap-=s.ap;'+refund+'if(s.intentCost)');
    engine=replaceOnce(engine,'copy.ap-=s.ap;copy.qi=paid;','copy.ap-=s.ap;if(s.id===\'near\'&&copy.key===\'sword\'&&!copy.usedSkills.includes(\'approach-refund\')){copy.ap++;copy.usedSkills.push(\'approach-refund\');}copy.qi=paid;');
  }
  return engine;
}
export async function rangeVariants({snapshotPath}={}){
  const source=snapshotPath?JSON.parse(gunzipSync(readFileSync(snapshotPath))):{engine:readFileSync('dist/engine.mjs','utf8'),auto:readFileSync('dist/auto.mjs','utf8'),arena:readFileSync('scripts/balance-arena.mjs','utf8')};
  const root=mkdtempSync(join(tmpdir(),'qingxiao-range-')),list=[];
  // The diagnostic controller preserves search, legality and tendency weights,
  // but evaluates immediate state instead of forecasting the public enemy script.
  const immediate=replaceOnce(source.auto,'future=projectEnemyPhase(leaf,tendency)','future=leaf');
  let arena=replaceOnce(source.arena,"import {chooseAction,chooseReaction} from '../dist/auto.mjs';","import {chooseAction as chooseScript,chooseReaction} from '../dist/auto.mjs';\nimport {chooseAction as chooseImmediate} from '../dist/auto-immediate.mjs';\nfunction chooseAction(b,tendency){const c=contexts.get(b);return c?.controllers?.[c.actors.indexOf(b.player)]==='immediate'?chooseImmediate(b,tendency):chooseScript(b,tendency);}");
  arena=replaceOnce(arena,'trace=false,disableMajor}={}','trace=false,disableMajor,controllers}={}');
  arena=replaceOnce(arena,'prefs,metrics:[metric(),metric()]','prefs,controllers,metrics:[metric(),metric()]');
  arena+=`\nexport function forecastEnemyPhase(arena,seat){
    const b=arena.battle,c=arena.context;
    const copy=Object.assign(Object.create(Battle.prototype),JSON.parse(JSON.stringify(b)));copy.logs=[];
    copy.player=structuredClone(c.actors[seat]);copy.enemy=structuredClone(c.actors[1-seat]);copy.phase='player';copy.result=null;copy.pending=null;
    copy.endTurn();
    for(let i=0;i<12&&!copy.result;i++){
      if(copy.phase==='reaction')copy.react(chooseReaction(copy,c.prefs[seat]).response);
      else if(copy.phase==='enemy'&&copy.enemyQueue.length)copy.enemyStep();else break;
    }
    return {hp:[copy.player.hp,copy.enemy.hp],shield:[copy.player.shield,copy.enemy.shield],distance:copy.distance,actions:copy.logs.filter(l=>l.text.includes('施展「')).map(l=>l.text)};
  }\n`;
  try{
    for(const c of RANGE_CANDIDATES){
      const engine=rangeEngine(source.engine,c),dir=join(root,c.id);mkdirSync(join(dir,'dist'),{recursive:true});mkdirSync(join(dir,'scripts'));
      writeFileSync(join(dir,'dist/engine.mjs'),engine);if(engine.includes("'./prepared.mjs'"))copyFileSync('dist/prepared.mjs',join(dir,'dist/prepared.mjs'));writeFileSync(join(dir,'dist/auto.mjs'),source.auto);writeFileSync(join(dir,'dist/auto-immediate.mjs'),immediate);writeFileSync(join(dir,'scripts/balance-arena.mjs'),arena);
      list.push({...c,engineHash:blobHash(engine),autoHash:blobHash(source.auto),arenaHash:blobHash(arena),immediateHash:blobHash(immediate),engine:await import(pathToFileURL(join(dir,'dist/engine.mjs'))),arena:await import(pathToFileURL(join(dir,'scripts/balance-arena.mjs')))});
    }
    return {list,source,cleanup:()=>rmSync(root,{recursive:true,force:true})};
  }catch(e){rmSync(root,{recursive:true,force:true});throw e;}
}
