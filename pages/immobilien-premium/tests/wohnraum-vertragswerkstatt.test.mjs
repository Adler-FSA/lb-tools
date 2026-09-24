import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'wohnraum-vertragswerkstatt.html'),'utf8');
const js=fs.readFileSync(path.join(root,'assets/js/wohnraum-vertragswerkstatt-ui.js'),'utf8');

test('Wohnraum-Werkstatt nutzt bestehende generische Vertrags-PDF-Engine und Akademie-Zentrale',()=>{
 assert.ok(html.includes('../vertraege/contract-pdf-engine-v2.js?v=2'));
 assert.ok(html.includes('../merchant-kompass/akademie-pdf-uebergabe.js?v=1'));
 assert.equal(/club-marktplatz/i.test(html),false);
});
test('Prüfbereich liegt technisch außerhalb beider PDF-Dokumente',()=>{
 assert.ok(html.includes('data-paper="review" data-pdf-exclude'));
 assert.ok(html.includes('id="leaseEditor"'));
 assert.ok(html.includes('id="rulesEditor"'));
 assert.ok(js.includes("const editor=kind==='lease'?leaseEditor:rulesEditor;"));
 assert.ok(js.includes('contentRoot:editor'));
 assert.equal(js.includes('contentRoot:reviewHost'),false);
});
test('Standard-Mietvertrag baut riskante Sonderklauseln nicht automatisch ein',()=>{
 const start=js.indexOf('function leaseHtml');
 const end=js.indexOf('function rulesHtml',start);
 const lease=js.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.equal(/Kleinreparatur/i.test(lease),false);
 assert.equal(/Schönheitsreparatur/i.test(lease),false);
 assert.equal(/Staffelmiete|Indexmiete|Befristung/i.test(lease),false);
 assert.ok(/unbestimmte Zeit/.test(lease));
});
test('Kaution über drei Nettokaltmieten sperrt die PDF-Ausgabe',()=>{
 assert.ok(js.includes('s.depositEuro<=s.baseRentEuro*3'));
 assert.ok(js.includes('pdfLease.disabled=pdfRules.disabled=!(v.required&&v.depositOk)'));
});
test('Alle sichtbaren Werkstatt-Schlüssel besitzen DE und EN',()=>{
 const used=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
 const declared=[...js.matchAll(/(?:^|[,\n\s])([A-Za-z][A-Za-z0-9_]*)\s*:\s*\{\s*de\s*:\s*'[^']*'\s*,\s*en\s*:\s*'[^']*'/g)].map(m=>m[1]);
 for(const key of new Set(used))assert.ok(declared.includes(key),key);
});
