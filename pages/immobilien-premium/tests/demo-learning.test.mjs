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
 const target=path.resolve(root,step.extraUrl.split('?')[0]);
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
  'pdf-zentrale.html','archiv.html','einstellungen.html','hilfe.html','bedienungsanleitung.html','mietvertragswerkstatt.html','hausordnung-konfigurator.html',
  'assets/js/demo-guide.js','assets/js/bedienungsanleitung-ui.js','assets/js/pdf-zentrale-ui.js'
 ];
 for(const file of files){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  assert.equal(/Baustein\s+\d/i.test(text),false,file);
  assert.equal(/Bausteingrenze/i.test(text),false,file);
 }
});

test('Demo startet als freies Anschauungsmodell und Lernreise bleibt optional',()=>{
 const html=fs.readFileSync(path.join(root,'demo.html'),'utf8');
 const shell=fs.readFileSync(path.join(root,'assets/js/demo-shell.js'),'utf8');
 assert.ok(html.includes('class="demo-shell free"'));
 assert.ok(html.includes('Lernreise starten'));
 assert.ok(shell.includes("let current=0,free=true"));
 assert.ok(shell.includes("from './demo-showcase.js'"));
});
test('Formularintensive Demoseiten erhalten eine Anschauungsbefüllung',async()=>{
 const {DEMO_SHOWCASE_PAGES}=await import('../assets/js/demo-showcase.js');
 assert.deepEqual(DEMO_SHOWCASE_PAGES,[
  'index.html','immobilien.html','kosten.html','verbrauch.html','abrechnung-vermieter.html',
  'mietservice.html','vermietungscheck.html','einstellungen.html'
 ]);
 for(const page of DEMO_SHOWCASE_PAGES)assert.ok(fs.existsSync(path.join(root,page)),page);
});

test('Demo kann sich nicht selbst verschachteln',()=>{
 const html=fs.readFileSync(path.join(root,'demo.html'),'utf8');
 const showcase=fs.readFileSync(path.join(root,'assets/js/demo-showcase.js'),'utf8');
 assert.ok(html.includes('window.self !== window.top'));
 assert.ok(html.includes("location.replace('index.html?demo=1'"));
 assert.ok(showcase.includes("if(page==='index.html')"));
 assert.ok(showcase.includes("a[href^=\"demo.html\"]"));
});
test('Zentrale enthält jeden direkten Hero-Einstieg nur einmal',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.equal((html.match(/href="demo\.html"/g)||[]).length,1);
 assert.equal((html.match(/href="bedienungsanleitung\.html"/g)||[]).length,1);
});
test('Alter Wohnraum-Werkstattpfad ist nur Weiterleitung und kein aktiver Mietservice-Link',()=>{
 const service=fs.readFileSync(path.join(root,'mietservice.html'),'utf8');
 const legacy=fs.readFileSync(path.join(root,'wohnraum-vertragswerkstatt.html'),'utf8');
 assert.equal(service.includes('href="wohnraum-vertragswerkstatt.html"'),false);
 assert.ok(service.includes('href="mietvertragswerkstatt.html"'));
 assert.ok(legacy.includes("location.replace(target)"));
 assert.equal(legacy.includes('wohnraum-vertragswerkstatt-ui.js'),false);
});
