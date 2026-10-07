import {OPPONENTS,ROUTES,DIFFICULTIES} from './opponents.mjs';
export class Trial{
 constructor(){this.route=null;this.difficulty='practice';this.index=0;this.status='idle';this.run=0;this.stages=[];this.history=[];this.captured=new WeakMap();}
 get active(){return this.route!==null;}
 get opponentId(){return this.active?ROUTES[this.route].opponents[this.index]:null;}
 start(route,difficulty='practice'){if(!DIFFICULTIES[difficulty])throw Error('未知难度');if(!ROUTES[route])throw Error('未知论道路线');this.difficulty=difficulty;this.route=route;this.index=0;this.status='preparing';this.run++;this.stages=[null,null,null];}
 begin(){if(this.status!=='preparing')throw Error('当前不能入场');this.status='fighting';}
 archive(b,{abandoned=false}={}){if(this.captured.has(b))return this.captured.get(b);if(typeof b.review!=='function')return null;if(!b.result&&!abandoned)throw Error('本场尚未结束');const record={id:Math.max(0,...this.history.map(r=>r.id))+1,run:this.active?this.run:null,stage:this.active?this.index+1:null,route:this.route,mode:b.opponentId?'challenge':'duel',opponentId:b.opponentId??null,difficulty:b.difficulty??'practice',opponent:b.opponentId?OPPONENTS[b.opponentId].name:b.enemy.name,enemy:{key:b.enemy.key,major:b.enemy.major,skillIds:[...b.enemy.skillIds]},player:{key:b.player.key,major:b.player.major,skillIds:[...b.player.skillIds]},result:abandoned&&!b.result?'abandoned':b.result,review:structuredClone(b.review()),logs:structuredClone(b.logs)};this.history.push(record);this.captured.set(b,record);return record;}
 finish(b){const record=this.archive(b);if(record&&this.active&&record.run===this.run&&record.stage===this.index+1){this.stages[this.index]=record.id;this.status=this.index===2?'complete':'between';}return record;}
 next(){if(!this.active||this.status!=='between')throw Error('本场结束后才能继续');this.index++;this.status='preparing';}
 retry(){if(!this.active)throw Error('当前没有论道');this.stages[this.index]=null;this.status='preparing';}
 leave(){this.route=null;this.status='idle';this.stages=[];}
 get currentRecords(){return this.stages.map(id=>this.history.find(r=>r.id===id)).filter(Boolean);}
 snapshot(){return {route:this.route,difficulty:this.difficulty,index:this.index,status:this.status,run:this.run,opponentId:this.opponentId,completed:this.currentRecords.length,wins:this.currentRecords.filter(r=>r.result==='win').length,historyCount:this.history.length};}
}
export const resultLabel=result=>({win:'告捷',lose:'惜败',draw:'未决',abandoned:'中止'}[result]||'进行中');
export function recordText(record){const r=record.review,p=r.actors[0],e=r.actors[1];return `${record.run?`第${record.run}轮 · 第${record.stage}场`:record.mode==='duel'?'自选 1 对 1':'单场切磋'} · ${DIFFICULTIES[record.difficulty??'practice'].name} · ${record.opponent} · ${resultLabel(record.result)}\n${r.rounds}回合 · 气血 ${p.hp}/${p.maxHp} : ${e.hp}/${e.maxHp}\n\n`+record.logs.map(l=>`[第${l.round}回合] ${l.text}`).join('\n');}
export function historyText(records){return records.map(recordText).join('\n\n────────────────────\n\n');}
