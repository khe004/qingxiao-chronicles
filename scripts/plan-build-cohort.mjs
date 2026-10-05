import {writeFile} from 'node:fs/promises';
import {buildProfiles} from '../dist/builds.mjs';
const matchups=[['fire','ignite','wood','symbiosis'],['fire','sustain','flame','fierce'],['sword','quick','water','cold'],['sword','heavy','earth','bastion'],['flame','fierce','fire','sustain'],['flame','smolder','water','tidal'],['water','cold','earth','mountain'],['water','tidal','flame','fierce'],['wood','symbiosis','fire','ignite'],['wood','parasitic','sword','quick'],['earth','bastion','wood','parasitic'],['earth','mountain','sword','heavy']];
const build=(key,major,style)=>{const p=buildProfiles(key,major).find(p=>p.id===style);return {id:`${key}/${major}/${style}`,name:p.name,key,config:{major,skillIds:p.skillIds}};};
const jobs=[];
for(const [key,major,foe,fm] of matchups)for(const tendency of ['balanced','aggressive','defensive','burst'])for(const controller of ['immediate','prepared'])for(const distance of [0,1,2])for(const first of [0,1])jobs.push({tag:`${key}/${major}`,a:build(key,major,'core'),b:build(foe,fm,'tactical'),controller,tendency,distance,first});
await writeFile(process.argv[2]??'/tmp/qingxiao-build-cohort-plan.json',JSON.stringify({label:'8 twelve named core builds against specified tactical counter matchups; both controllers, four tendencies, three ranges and both initiatives; sampled configurations, not every core cross pair',jobs},null,2));
console.log(`Prepared ${jobs.length} explicit fresh scenarios.`);
