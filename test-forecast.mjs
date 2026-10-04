import assert from 'node:assert/strict';
import {Battle} from './dist/engine.mjs';
import {loadForecastModel,auditState,cloneForAudit,advanceActual} from './scripts/forecast-audit.mjs';
const {projectEnemyPhase,chooseReaction}=await loadForecastModel();
function check(b,tendency='balanced'){
  const before=JSON.stringify(b),predicted=projectEnemyPhase(b,tendency);
  assert.equal(JSON.stringify(b),before);
  const actual=advanceActual(cloneForAudit(b),tendency,chooseReaction);
  assert.deepEqual(auditState(predicted),actual.nextPlayer);
  return {...actual,predicted};
}
// The queue announced at mid range remains fixed after the player moves away.
const far=new Battle('sword');assert.deepEqual(far.enemyQueue,['seed','blaze','spark']);
assert.ok(far.act(far.player,'far').ok);
const skipped=check(far).enemyEnd;
assert.equal(skipped.enemy.ap,0,'Paid approach repairs blaze range and spends the final AP');
assert.equal(skipped.enemy.qi.fire,2,'Paid blaze receives the once-per-round ignition refund');
assert.equal(skipped.enemy.qi.any,0);
assert.equal(skipped.player.seed,0,'Repaired blaze consumes the actual seeds');

// An actual evade changes distance before later announced skills are validated.
const evade=new Battle('sword');evade.player.qi={metal:0,wood:0,water:2,fire:0,earth:0,any:0};
evade.enemyQueue=['spark','blaze'];evade.enemyPlan=[...evade.enemyQueue];
const moved=check(evade).enemyEnd;
assert.equal(moved.distance,2);assert.equal(moved.player.reaction,false);
assert.equal(moved.player.qi.water,0);assert.equal(moved.enemy.ap,0,'Insufficient AP to approach+blaze uses legal spark and basic instead');
assert.equal(moved.enemy.qi.fire,0);

// A forecast includes the next own burn tick, unlike an enemy-phase-only measurement.
const burn=new Battle('sword');burn.enemyQueue=[];burn.enemy.ap=0;burn.player.burn=2;burn.player.burnTurns=2;
const burned=check(burn);
assert.equal(burned.enemyEnd.player.hp,220);assert.equal(burned.nextPlayer.player.hp,215);
assert.equal(burned.nextPlayer.player.burnTurns,1);assert.equal(burned.nextPlayer.round,2);

// Guard intent gained after casting is reserved for later; release uses paid power.
const charged=new Battle('sword');charged.player.intent=3;
charged.player.qi={metal:4,wood:0,water:0,fire:0,earth:0,any:1};
assert.ok(charged.act(charged.player,'unity').ok);assert.equal(charged.player.charge.storedPower,107);
assert.ok(charged.act(charged.player,'guard').ok);charged.enemyQueue=[];charged.enemy.ap=0;
const released=check(charged);
assert.equal(released.enemyEnd.player.charge.storedPower,107);
assert.equal(released.nextPlayer.player.charge,null);assert.equal(released.nextPlayer.player.intent,1);
assert.equal(released.nextPlayer.player.ap,3,'Free release leaves the new three actions untouched');
assert.equal(released.nextPlayer.player.qi.metal,3,'Release does not pay its cast cost again');
assert.equal(released.nextPlayer.enemy.hp,184,'Evade halves the locked metal hit after five-element reduction; opening shield absorbs 16');
const tooClose=new Battle('sword');assert.ok(tooClose.act(tooClose.player,'unity').ok);
assert.ok(tooClose.act(tooClose.player,'near').ok);tooClose.enemyQueue=[];tooClose.enemy.ap=0;
const missed=check(tooClose).nextPlayer;assert.equal(missed.player.charge,null);assert.equal(missed.enemy.hp,210);

// A lethal burn ends the prediction immediately, before regeneration or enemy actions.
const deadEnemy=new Battle('fire');deadEnemy.enemy.hp=1;deadEnemy.enemy.burn=1;deadEnemy.enemy.burnTurns=1;
const win=check(deadEnemy).predicted;assert.equal(win.result,'win');assert.equal(win.round,1);
assert.equal(win.enemy.ap,3);assert.equal(win.player.ap,3);
const deadPlayer=new Battle('sword');deadPlayer.player.hp=1;deadPlayer.player.burn=1;deadPlayer.player.burnTurns=1;deadPlayer.enemyQueue=[];deadPlayer.enemy.ap=0;
const lose=check(deadPlayer).predicted;assert.equal(lose.result,'lose');assert.equal(lose.round,2);assert.equal(lose.phase,'over');
console.log('Public forecast: public range repair/replacement/costs, evade movement, burn timing, stored charge power, free release, missed range, lethal stops and read-only state passed.');
