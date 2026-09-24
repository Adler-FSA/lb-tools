import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DEMO_LEARNING_STEPS} from '../assets/js/demo-guide.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repoPages=path.resolve(root,'..');

test('Lernreise hat 13 vollständige DE/EN-Schritte',()=>{
 assert.equal(DEMO_LEARNING_STEPS.length,13);
 for(const [index,step] of DEMO_LEARNING_STEPS.entries()){
  for(const key of ['title','short','copy','why']){
   assert.equal(typeof step[key]?.de,'string',index+': '+key+' de');
   assert.equal(typeof step[key]?.en,'string',index+': '+key+' en');
   assert.ok(step[key].de.trim()&&step[key].en.trim(),index+': '+key);
  }
  assert.ok(Array.isArray(step.facts?.de)&&step.facts.de.length>0,index+': facts de');
  assert.ok(Array.isArray(step.facts?.en)&&step.facts.en.length>0,index+': facts en');
 }
});
test('Alle Lernschritte zeigen auf vorhandene Produktseiten',()=>{
 for(const step of DEMO_LEARNING_STEPS){
  const page=step.url.split('?')[0];
  assert.ok(fs.existsSync(path.join(root,page)),page);
 }
});
test('Vertragswerkstatt aus dem Mietservice-Lernschritt existiert wirklich',()=>{
 const step=DEMO_LEARNING_STEPS.find(x=>x.extraUrl);
 assert.ok(step);
 const target=path.resolve(root,step.extraUrl);
 assert.ok(fs.existsSync(target),target);
 assert.equal(typeof step.extraLabel.de,'string');
 assert.equal(typeof step.extraLabel.en,'string');
});
test('Demo und Bedienungsanleitung verwenden dieselbe Lernquelle',()=>{
 const demo=fs.readFileSync(path.join(root,'assets/js/demo-shell.js'),'utf8');
 const manual=fs.readFileSync(path.join(root,'assets/js/bedienungsanleitung-ui.js'),'utf8');
 assert.ok(demo.includes("from './demo-guide.js'"));
 assert.ok(manual.includes("from './demo-guide.js'"));
 const html=fs.readFileSync(path.join(root,'demo.html'),'utf8');
 assert.ok(html.includes('data-lang="de"'));
 assert.ok(html.includes('data-lang="en"'));
 assert.equal(/(?:src|href)=["']https?:\/\//i.test(html),false);
});

test('Zentrale bietet eigenes Projekt, Demo und Bedienungsanleitung direkt an',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.includes('href="immobilien.html"'));
 assert.ok(html.includes('href="demo.html"'));
 assert.ok(html.includes('href="bedienungsanleitung.html"'));
});
test('Käuferoberflächen enthalten keine sichtbaren Entwicklungs-Bausteine mehr',()=>{
 const files=[
  'index.html','immobilien.html','kosten.html','verbrauch.html','abrechnung-eigentuemer.html',
  'abrechnung-vermieter.html','mietservice.html','schutzcheck.html','vermietungscheck.html',
  'pdf-zentrale.html','archiv.html','einstellungen.html','hilfe.html','bedienungsanleitung.html',
  'assets/js/demo-guide.js','assets/js/bedienungsanleitung-ui.js','assets/js/pdf-zentrale-ui.js'
 ];
 for(const file of files){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  assert.equal(/Baustein\s+\d/i.test(text),false,file);
  assert.equal(/Bausteingrenze/i.test(text),false,file);
 }
});
