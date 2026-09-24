import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DOCUMENT_TEMPLATE_ROUTES,documentPreviewUrl} from '../assets/js/document-template-routes.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=['pdf-zentrale.html','archiv.html','einstellungen.html','hilfe.html'];
const scripts=['assets/js/pdf-master-core.js','assets/js/document-workflow.js','assets/js/document-sources.js','assets/js/document-pdf.js','assets/js/annual-rollover.js','assets/js/pdf-zentrale-ui.js','assets/js/archiv-ui.js','assets/js/einstellungen-ui.js','assets/js/hilfe-ui.js','assets/js/document-template-ui.js'];
const i18nPairs=[
 ['pdf-zentrale.html','assets/js/pdf-zentrale-ui.js'],['archiv.html','assets/js/archiv-ui.js'],
 ['einstellungen.html','assets/js/einstellungen-ui.js'],['hilfe.html','assets/js/hilfe-ui.js']
];

test('Baustein 6 verwendet keinen Browserdruck, keine externe PDF-Bibliothek und keine externen Laufzeitressourcen',()=>{
 for(const rel of [...pages,...scripts]){
  const text=fs.readFileSync(path.join(root,rel),'utf8');
  assert.equal(/window\.print\s*\(/.test(text),false,rel);
  assert.equal(/jspdf|pdf-lib|html2canvas/i.test(text),false,rel);
  assert.equal(/(?:src|href)=["']https?:\/\//i.test(text),false,rel);
 }
});
test('PDF-Zentrale und Archiv verwenden exakt die freigegebene gemeinsame Akademie-PDF-Übergabe',()=>{
 for(const page of ['pdf-zentrale.html','archiv.html']){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  assert.ok(html.includes('../merchant-kompass/akademie-pdf-uebergabe.js?v=1'),page);
  assert.equal((html.match(/akademie-pdf-uebergabe\.js/g)||[]).length,1,page);
 }
});
test('Neue Baustein-6-Seiten haben für jeden data-i18n-Schlüssel DE und EN',()=>{
 for(const [htmlPath,jsPath] of i18nPairs){
  const html=fs.readFileSync(path.join(root,htmlPath),'utf8'),js=fs.readFileSync(path.join(root,jsPath),'utf8');
  const used=[...html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)].map(m=>m[1]);
  const declared=[...js.matchAll(/(?:^|[,\n\s])([A-Za-z][A-Za-z0-9_]*)\s*:\s*\{\s*de\s*:\s*'[^']*'\s*,\s*en\s*:\s*'[^']*'/g)].map(m=>m[1]);
  for(const key of new Set(used))assert.ok(declared.includes(key),htmlPath+': '+key);
 }
});
test('Jeder unterstützte Dokumenttyp hat eine eigene spezialisierte DE/EN-HTML-Vorlage',()=>{
 const entries=Object.entries(DOCUMENT_TEMPLATE_ROUTES);assert.equal(entries.length,9);
 const ui=fs.readFileSync(path.join(root,'assets/js/document-template-ui.js'),'utf8');
 const declared=[...ui.matchAll(/(?:^|[,\n\s])([A-Za-z][A-Za-z0-9_]*)\s*:\s*\{\s*de\s*:\s*'[^']*'\s*,\s*en\s*:\s*'[^']*'/g)].map(m=>m[1]);
 for(const [type,route] of entries){
  const file=path.join(root,route);assert.ok(fs.existsSync(file),type);
  const html=fs.readFileSync(file,'utf8');assert.ok(html.includes('data-doc-type="'+type+'"'),type);
  assert.equal(/<img\b/i.test(html),false,type);assert.equal(/(?:src|href)=["']https?:\/\//i.test(html),false,type);
  const used=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
  for(const key of new Set(used))assert.ok(declared.includes(key),type+': '+key);
  assert.ok(documentPreviewUrl({id:'doc1',documentType:type}).endsWith('?id=doc1'));
 }
});
test('Alle Hauptseiten führen zum freigeschalteten Dokumentbereich',()=>{
 for(const page of ['index.html','immobilien.html','kosten.html','verbrauch.html','abrechnung-eigentuemer.html','abrechnung-vermieter.html','mietservice.html','schutzcheck.html','vermietungscheck.html']){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  assert.ok(html.includes('href="pdf-zentrale.html"'),page);
 }
});
