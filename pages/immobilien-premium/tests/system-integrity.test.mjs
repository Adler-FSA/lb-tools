import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repoRoot=path.resolve(root,'../..');

function walk(dir,predicate,out=[]){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full,predicate,out);
    else if(predicate(full))out.push(full);
  }
  return out;
}
function stripQueryHash(ref){return ref.split('#')[0].split('?')[0];}
function localTarget(base,ref){
  if(!ref||/^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref))return null;
  const clean=stripQueryHash(ref);
  return clean?path.resolve(path.dirname(base),clean):null;
}
function label(html){
  return html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}

test('alle internen HTML-, CSS- und Scriptziele existieren',()=>{
  const htmlFiles=walk(root,f=>f.endsWith('.html'));
  const missing=[];
  for(const file of htmlFiles){
    const text=fs.readFileSync(file,'utf8');
    for(const m of text.matchAll(/(?:href|src)=["']([^"']+)["']/gi)){
      const target=localTarget(file,m[1]);
      if(target&&!fs.existsSync(target))missing.push({file:path.relative(root,file),ref:m[1],target:path.relative(repoRoot,target)});
    }
  }
  assert.deepEqual(missing,[]);
});

test('alle relativen JavaScript-Imports existieren',()=>{
  const jsFiles=walk(path.join(root,'assets/js'),f=>f.endsWith('.js'));
  const missing=[];
  for(const file of jsFiles){
    const text=fs.readFileSync(file,'utf8');
    for(const m of text.matchAll(/(?:from\s+|import\(\s*)["']([^"']+)["']/g)){
      const ref=m[1];if(!ref.startsWith('.'))continue;
      const target=path.resolve(path.dirname(file),ref);
      if(!fs.existsSync(target))missing.push({file:path.relative(root,file),ref});
    }
  }
  assert.deepEqual(missing,[]);
});

test('Käuferseiten enthalten keine identischen doppelten Links',()=>{
  const files=walk(root,f=>f.endsWith('.html')&&!f.includes(path.sep+'dokumentvorlagen'+path.sep));
  const duplicates=[];
  for(const file of files){
    const text=fs.readFileSync(file,'utf8'),seen=new Set();
    for(const m of text.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
      const key=m[1]+'|'+label(m[2]);
      if(seen.has(key))duplicates.push({file:path.relative(root,file),href:m[1],label:label(m[2])});
      seen.add(key);
    }
  }
  assert.deepEqual(duplicates,[]);
});

test('nur eine produktive Mietvertragswerkstatt bleibt bestehen',()=>{
  const mietservice=fs.readFileSync(path.join(root,'mietservice.html'),'utf8');
  assert.ok(mietservice.includes('href="mietvertragswerkstatt.html"'));
  assert.equal(mietservice.includes('href="wohnraum-vertragswerkstatt.html"'),false);
  assert.equal(fs.existsSync(path.join(root,'assets/js/wohnraum-vertragswerkstatt-ui.js')),false);
  assert.equal(fs.existsSync(path.join(root,'assets/css/wohnraum-vertragswerkstatt.css')),false);
  const legacy=fs.readFileSync(path.join(root,'wohnraum-vertragswerkstatt.html'),'utf8');
  assert.ok(legacy.includes('url=mietvertragswerkstatt.html'));
});

test('Demo kann sich nicht in ihrem eigenen iframe verschachteln',()=>{
  const shell=fs.readFileSync(path.join(root,'assets/js/demo-shell.js'),'utf8');
  const showcase=fs.readFileSync(path.join(root,'assets/js/demo-showcase.js'),'utf8');
  assert.ok(shell.includes('guardAgainstNestedDemo'));
  assert.ok(shell.includes("raw.split('?')[0].split('#')[0]==='demo.html'"));
  assert.ok(showcase.includes("raw.split('?')[0].split('#')[0]==='demo.html'"));
  assert.ok(showcase.includes("link.hidden=true"));
});

test('Startseite enthält Demo und Bedienungsanleitung jeweils nur einmal',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.equal((html.match(/href="demo\.html"/g)||[]).length,1);
  assert.equal((html.match(/href="bedienungsanleitung\.html"/g)||[]).length,1);
});
