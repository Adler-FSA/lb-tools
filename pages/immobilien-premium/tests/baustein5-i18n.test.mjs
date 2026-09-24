import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pairs = [
  ['mietservice.html', 'assets/js/mietservice-ui.js'],
  ['schutzcheck.html', 'assets/js/schutzcheck-ui.js'],
  ['vermietungscheck.html', 'assets/js/vermietungscheck-ui.js']
];

test('Baustein-5-Seiten haben für jeden data-i18n-Schlüssel DE und EN', () => {
  for (const [htmlPath, jsPath] of pairs) {
    const html = fs.readFileSync(path.join(root, htmlPath), 'utf8');
    const js = fs.readFileSync(path.join(root, jsPath), 'utf8');
    const used = [...html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)].map(match => match[1]);
    const declared = [...js.matchAll(/(?:^|[,\n\s])([A-Za-z][A-Za-z0-9_]*)\s*:\s*\{\s*de\s*:\s*'[^']*'\s*,\s*en\s*:\s*'[^']*'/g)].map(match => match[1]);
    for (const key of new Set(used)) {
      assert.ok(declared.includes(key), htmlPath + ': DE/EN-Schlüssel fehlt: ' + key);
    }
  }
});
