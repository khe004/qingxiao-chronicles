import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Test-only adapter: keep the shipped controller and its historical blob unchanged.
// Export its filters/reasons and allow its existing score to receive a forecast.
const source=readFileSync(fileURLToPath(new URL('../dist/auto.mjs',import.meta.url)),'utf8');
function once(text,from,to){assert.equal(text.split(from).length,2,'Planner adapter anchor changed: '+from);return text.replace(from,to);}
let code=once(source,"'./engine.mjs'",JSON.stringify(new URL('../dist/engine.mjs',import.meta.url).href));
for(const name of ['options','reasonFor','projectEnemyPhase'])code=once(code,`function ${name}(`,`export function ${name}(`);
code=once(code,
  'function planScore(start,leaf,tendency,path){\n  const t=TENDENCIES[tendency],future=projectEnemyPhase(leaf,tendency);',
  'export function planScore(start,leaf,tendency,path,future=projectEnemyPhase(leaf,tendency)){\n  const t=TENDENCIES[tendency];');
export const planner=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
