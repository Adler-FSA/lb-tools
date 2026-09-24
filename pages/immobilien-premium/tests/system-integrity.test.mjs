import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function walk(dir){
 const out=[];
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())out.push(...walk(full));
  else out.push(full);
 }
 return out;
}
function localTarget(base,ref){
 if(!ref||/^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref))return null;
 const clean=ref.split('#')[0].split('?')[0];
 if(!clean)return null;
 return path.resolve(path.dirname(base),clean);
}

test('alle lokalen HTML href/src Ziele im Immobilien-Premium-Bereich existieren',()=>{
 const pages=walk(root).filter(f=>f.endsWith('.html'));
 const missing=[];
 for(const file of pages){
  const html=fs.readFileSync(file,'utf8');
  for(const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)){
   const target=localTarget(file,match[1]);
   if(target&&!fs.existsSync(target))missing.push({file:path.relative(root,file),ref:match[1],target});
  }
 }
 assert.deepEqual(missing,[]);
});

test('alle relativen JavaScript-Imports der Produktionsmodule existieren',()=>{
 const files=walk(path.join(root,'assets/js')).filter(f=>f.endsWith('.js'));
 const missing=[];
 for(const file of files){
  const js=fs.readFileSync(file,'utf8');
  const refs=[
   ...[...js.matchAll(/from\s+["']([^"']+)["']/g)].map(m=>m[1]),
   ...[...js.matchAll(/^\s*import\s+["']([^"']+)["']/gm)].map(m=>m[1])
  ];
  for(const ref of refs){
   if(!ref.startsWith('.'))continue;
   const target=path.resolve(path.dirname(file),ref);
   if(!fs.existsSync(target))missing.push({file:path.relative(root,file),ref,target});
  }
 }
 assert.deepEqual(missing,[]);
});

test('Legacy-Wohnraumwerkstatt ist nur kompatible Weiterleitung zur aktuellen Mietvertragswerkstatt',()=>{
 const oldPage=fs.readFileSync(path.join(root,'wohnraum-vertragswerkstatt.html'),'utf8');
 const service=fs.readFileSync(path.join(root,'mietservice.html'),'utf8');
 assert.ok(oldPage.includes('mietvertragswerkstatt.html'));
 assert.ok(oldPage.includes('location.replace(target)'));
 assert.equal(oldPage.includes('wohnraum-vertragswerkstatt-ui.js'),false);
 assert.equal(service.includes('href="wohnraum-vertragswerkstatt.html"'),false);
});
