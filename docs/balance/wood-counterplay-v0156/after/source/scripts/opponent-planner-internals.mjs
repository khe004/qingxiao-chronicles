import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Test-only visibility adapter; the planner and its rule imports are unchanged.
export async function loadOpponentPlanner(root=new URL('../',import.meta.url)){
 const url=new URL('dist/opponent-planner.mjs',root);let code=await readFile(url,'utf8');
 code=code.replace(/from '(\.\/[^']+)'/g,(_,relative)=>`from ${JSON.stringify(new URL(relative,url).href)}`);
 for(const name of ['clone','playerPressure','execute']){
  assert.equal(code.split(`function ${name}(`).length,2);
  code=code.replace(`function ${name}(`,`export function ${name}(`);
 }
 return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
}
