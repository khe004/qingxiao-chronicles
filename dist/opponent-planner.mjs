import {Battle,CLASSES,COMMON,total,payment} from './engine.mjs';

// Planning uses public board state only. All simulations are isolated and the
// selected sequence stays frozen throughout the actual player/enemy phases.
function clone(b){const {logs,stats,attack,...state}=b;const c=Object.assign(Object.create(Battle.prototype),structuredClone(state),{logs:[]});c.attack=function(a,s,raw){const e=this.other(a),physical=(a.key==='sword'&&s.id!=='expose')||s.id==='basic',damage=Math.round((raw+(s.id==='inferno'?e.burn*8:0))*100/(100+CLASSES[e.key][physical?'physical':'magical']));if(this.simulateEvade&&e===this.player&&e.reaction&&damage-e.shield>=18&&payment(e.qi,{any:2})){e.qi=payment(e.qi,{any:2});e.reaction=false;this.distance=Math.min(2,this.distance+1);this.resolveAttack(a,s,raw,.5);return;}if(e.reaction&&damage-e.shield>=18&&e.qi[CLASSES[e.key].reactionElement]){e.qi[CLASSES[e.key].reactionElement]--;e.reaction=false;e.shield=Math.min(60,e.shield+26);}this.resolveAttack(a,s,raw);};return c;}
function value(start,c,id){const a=c.enemy,e=c.player,p=start.enemy,q=start.player;if(c.result==='lose')return 10000;if(c.result==='win')return -10000;const weights={quick:{hp:.7,shield:.18,intent:7,seed:0,burn:3},heavy:{hp:1.35,shield:.65,intent:7,seed:0,burn:3},ignite:{hp:.7,shield:.2,intent:0,seed:5,burn:6},sustain:{hp:1.3,shield:.3,intent:0,seed:4,burn:5}}[id];return (q.hp-e.hp)*1.8+(a.hp-p.hp)*weights.hp+(a.shield-p.shield)*weights.shield+(a.intent-p.intent)*weights.intent+(e.seed-q.seed)*weights.seed+(e.burn-q.burn)*weights.burn-(a.burn-p.burn)*6+(Number(e.broken)-Number(q.broken))*7+(Number(a.edge)-Number(p.edge))*7+(total(a.qi)-total(p.qi))*.7;}
function available(c,a){return [...c.skills(a),...COMMON].filter(s=>!c.legal(a,s.id)&&!(s.kind==='heal'&&a.hp===a.maxHp&&!a.burn)&&!(s.kind==='purify'&&!a.burn)&&!(s.kind==='seed'&&c.other(a).seed>=5)&&!(s.id==='expose'&&c.other(a).broken)&&!(s.interrupt&&s.id!=='lunge'&&!c.other(a).charge)&&!(s.kind==='guard'&&a.shield>=44)&&!(s.id==='meditate'&&total(a.qi)>=7));}
function playerPressure(b,mode){const c=clone(b);c.phase='player';c.pending=null;
 if(mode==='retreat'&&c.distance<2&&c.player.ap>0&&!c.legal(c.player,'far'))c.act(c.player,'far');
 for(let n=0;n<3&&c.player.ap>0&&!c.result;n++){
  let best=null,score=0;for(const s of available(c,c.player)){const x=clone(c);if(!x.act(x.player,s.id).ok)continue;let v=(c.enemy.hp-x.enemy.hp)*1.3+(x.player.hp-c.player.hp)*1.1+(x.player.shield-c.player.shield)*.25+(x.player.intent-c.player.intent)*7+(x.enemy.seed-c.enemy.seed)*5+(x.enemy.burn-c.enemy.burn)*6+(Number(x.enemy.broken)-Number(c.enemy.broken))*8;
   if(c.enemy.charge&&!x.enemy.charge)v+=65;if(s.kind==='charge')v+=22;if(s.id==='near'&&c.distance===2&&c.player.key==='sword')v+=24;if(s.id==='meditate')v+=total(c.player.qi)<3?16:1;if(v>score){best=x;score=v;}}
  if(!best)break;Object.assign(c,best);
 }
 if(!c.result)c.endTurn();return c;
}
function execute(b,path){const c=clone(b);c.phase='enemy';for(const id of path){if(c.result)break;c.act(c.enemy,id);}c.expireEdge(c.enemy);return c;}
function afterResponse(b){const c=clone(b);if(c.result)return c;c.beginRound();if(c.result)return c;return playerPressure(c,'attack');}
const cache=new Map();
export function planQuestioning(b,id){
 const cacheKey=JSON.stringify([id,b.round,b.distance,b.player,b.enemy]);if(cache.has(cacheKey))return structuredClone(cache.get(cacheKey));
 const scenarios=[playerPressure(b,'attack'),playerPressure(b,'retreat')],base=clone(b);scenarios[1].simulateEvade=true;base.phase='enemy';base.pending=null;if(base.enemy.charge)base.release(base.enemy);
 const candidates=new Map();function search(c,path){candidates.set(path.join(','),path);if(path.length>=3||c.enemy.ap===0||c.result)return;for(const s of available(c,c.enemy)){if(s.kind==='guard'&&path.includes(s.id))continue;if(s.id==='purify'&&(c.enemy.burn<2||c.enemy.hp>c.enemy.maxHp-12))continue;if(['heal','purify'].includes(s.kind)&&path.some(id=>['heal','nourish','purify'].includes(id)))continue;const x=clone(c);if(x.act(x.enemy,s.id).ok)search(x,[...path,s.id]);}}
 search(base,[]);for(const s of scenarios)if(!s.result)search(clone(s),[]);
 const shortlisted=[...candidates.values()].map(path=>{const leaves=scenarios.map(s=>execute(s,path));const values=leaves.map(c=>value(b,c,id));const score=Math.min(...values)*.65+values.reduce((a,x)=>a+x,0)/values.length*.35+value(b,execute(base,path),id)*.12-path.length*.12;return {path,leaves,score};}).sort((a,c)=>c.score-a.score).slice(0,16);
 let best=[],bestScore=-Infinity;for(const {path,leaves} of shortlisted){
  const scores=leaves.map(leaf=>value(b,afterResponse(leaf),id)+value(b,leaf,id)*.3);const score=Math.min(...scores)*.65+scores.reduce((a,x)=>a+x,0)/scores.length*.35-path.length*.12;
  if(score>bestScore){bestScore=score;best=path;}
 }
 const result=best.map(skillId=>({id:skillId,reason:({quick:'兼顾接近成本和后续追击，按预告压制。',heavy:'估量承接后的反击收益，留出应对与出剑的资源。',ignite:'比较种灵引爆与直接施压，留意打断和距离风险。',sustain:'兼顾受伤后的恢复与持续火法，不把行动全用在回血。'})[id]}));
 if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(cacheKey,result);return structuredClone(result);
}
