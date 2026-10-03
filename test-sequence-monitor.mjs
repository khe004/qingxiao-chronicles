import assert from 'node:assert/strict';
import {sequenceVariants} from './scripts/sequence-variants.mjs';
import {build,monitoredDuel} from './scripts/sequence-review.mjs';
const v=await sequenceVariants([{id:'base'}]);
try{const c=v.list[0];for(const controller of ['immediate','adaptive','script'])for(const first of [0,1]){const opts={controller,first,limit:3,distance:1};const monitored=monitoredDuel(c,build('ignite'),build('heavy'),opts),original=c.runtime.predictiveDuel(build('ignite'),build('heavy'),{first,limit:3,distance:1,controllers:[controller,controller],trace:true});for(const k of ['winner','rounds','hp','metrics','trace'])assert.deepEqual(monitored[k],original[k],'Observer must not change battle: '+k);assert.ok(monitored.events.length);for(const d of monitored.detail){const q=d.charge;assert.equal(q.started,q.released+q.interrupted+q.rangeMiss+q.pending);}}
 console.log('monitor parity: six paired games preserve outcomes, actions, reactions and traces; charge lifecycle complete');}finally{v.cleanup();}
