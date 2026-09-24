import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'wohnraum-vertragswerkstatt.html'),'utf8');

test('alter Wohnraum-Werkstatt-Pfad ist nur noch Kompatibilitätsweiterleitung',()=>{
 assert.ok(html.includes('url=mietvertragswerkstatt.html'));
 assert.ok(html.includes("location.replace(target)"));
 assert.equal(html.includes('wohnraum-vertragswerkstatt-ui.js'),false);
 assert.equal(html.includes('wohnraum-vertragswerkstatt.css'),false);
});
test('Weiterleitung bewahrt Query und Hash',()=>{
 assert.ok(html.includes("'mietvertragswerkstatt.html'+location.search+location.hash"));
});
