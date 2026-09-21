import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject, STORAGE_NAMESPACE } from '../assets/js/model.js';
import { BACKUP_FORMAT, PROJECT_KEY, RECOVERY_PREFIX, StorageError, loadProject, saveProject, createBackup, previewBackup, restoreBackup } from '../assets/js/storage.js';

function memoryStorage() {
  const map = new Map();
  return {
    map,
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); }
  };
}
const project = (id = 'new01') => createEmptyProject(id);
const backup = (p = project()) => createBackup(p, { now: () => new Date('2026-09-21T10:00:00.000Z') });
const failure = (code, work) => assert.throws(work, error => error instanceof StorageError && error.code === code);

test('Only uses new namespace and never initializes or reads legacy keys', () => {
  const store = memoryStorage();
  store.setItem('nebk_archive_v1', 'PRIVATE');
  assert.equal(loadProject({ storage: store }), null);
  saveProject(project(), { storage: store });
  assert.equal(store.map.get('nebk_archive_v1'), 'PRIVATE');
  assert.deepEqual([...store.map.keys()].sort(), ['nebk_archive_v1', PROJECT_KEY].sort());
  assert.equal(PROJECT_KEY, `${STORAGE_NAMESPACE}:project`);
});

test('Save and load preserve independent copies; no in-memory alias', () => {
  const store = memoryStorage();
  const input = project();
  saveProject(input, { storage: store });
  input.properties.push({ id: 'notSaved' });
  const read = loadProject({ storage: store });
  assert.equal(read.properties.length, 0);
  read.properties.push({ id: 'notStoredEither' });
  assert.equal(loadProject({ storage: store }).properties.length, 0);
});

test('Invalid writes do not overwrite an existing valid project', () => {
  const store = memoryStorage();
  saveProject(project(), { storage: store });
  const old = store.getItem(PROJECT_KEY);
  const invalid = project(); invalid.units.push({ id: 'broken', propertyId: 'missing', areaHistory: [] });
  failure('INVALID_PROJECT', () => saveProject(invalid, { storage: store }));
  assert.equal(store.getItem(PROJECT_KEY), old);
});

test('Corrupted saved data is not replaced by normal save', () => {
  const store = memoryStorage(); store.setItem(PROJECT_KEY, '{ broken json');
  failure('CORRUPT_PROJECT', () => loadProject({ storage: store }));
  failure('CORRUPT_PROJECT', () => saveProject(project(), { storage: store }));
  assert.equal(store.getItem(PROJECT_KEY), '{ broken json');
});

test('Another project cannot silently replace saved project', () => {
  const store = memoryStorage(); saveProject(project('original'), { storage: store });
  failure('PROJECT_CONFLICT', () => saveProject(project('different'), { storage: store }));
  assert.equal(loadProject({ storage: store }).projectId, 'original');
});

test('Previously released document may not be changed or deleted', () => {
  const store = memoryStorage(); const p = project();
  p.documents.push({ id: 'doc01', status: 'released', releasedOn: '2026-09-20', snapshot: { cost: 1 } });
  saveProject(p, { storage: store });
  const altered = loadProject({ storage: store }); altered.documents[0].snapshot.cost = 2;
  failure('RELEASED_IMMUTABLE', () => saveProject(altered, { storage: store }));
  const deleted = loadProject({ storage: store }); deleted.documents = [];
  failure('RELEASED_IMMUTABLE', () => saveProject(deleted, { storage: store }));
  assert.equal(loadProject({ storage: store }).documents[0].snapshot.cost, 1);
});

test('Backup preview is read-only, versioned and explicit about excluded files', () => {
  const store = memoryStorage(); const p = project(); p.properties.push({ id: 'house01' });
  const text = backup(p);
  const parsed = JSON.parse(text);
  assert.equal(parsed.format, BACKUP_FORMAT);
  assert.equal(parsed.containsAttachmentFiles, false);
  assert.equal(parsed.containsPdfFiles, false);
  assert.equal(previewBackup(text).recordCounts.properties, 1);
  assert.equal(store.map.size, 0);
});

test('Invalid backup or wrong version cannot reach storage', () => {
  const store = memoryStorage();
  failure('INVALID_BACKUP', () => restoreBackup('{invalid', { storage: store, confirmation: 'REPLACE_PROJECT' }));
  const parsed = JSON.parse(backup()); parsed.backupVersion = 999;
  failure('UNSUPPORTED_BACKUP', () => restoreBackup(JSON.stringify(parsed), { storage: store, confirmation: 'REPLACE_PROJECT' }));
  assert.equal(store.map.size, 0);
});

test('Restore requires explicit approval and preserves old raw snapshot before replacement', () => {
  const store = memoryStorage(); saveProject(project('old'), { storage: store });
  const previous = store.getItem(PROJECT_KEY);
  failure('CONFIRMATION_REQUIRED', () => restoreBackup(backup(project('new')), { storage: store }));
  assert.equal(store.getItem(PROJECT_KEY), previous);
  const result = restoreBackup(backup(project('new')), {
    storage: store, confirmation: 'REPLACE_PROJECT', now: () => new Date('2026-09-21T11:00:00.000Z')
  });
  assert.ok(result.recoveryKey.startsWith(RECOVERY_PREFIX));
  assert.equal(store.getItem(result.recoveryKey), previous);
  assert.equal(loadProject({ storage: store }).projectId, 'new');
});

test('Restore protects even damaged existing data and never modifies unrelated keys', () => {
  const store = memoryStorage();
  store.setItem(PROJECT_KEY, 'damaged data'); store.setItem('unrelated_app_key', 'DO NOT TOUCH');
  const result = restoreBackup(backup(), { storage: store, confirmation: 'REPLACE_PROJECT' });
  assert.equal(store.getItem(result.recoveryKey), 'damaged data');
  assert.equal(store.getItem('unrelated_app_key'), 'DO NOT TOUCH');
  assert.equal(loadProject({ storage: store }).projectId, 'new01');
});

test('If recovery write fails, original data stays intact', () => {
  const store = memoryStorage(); saveProject(project('old'), { storage: store });
  const old = store.getItem(PROJECT_KEY);
  const originalSet = store.setItem;
  store.setItem = (key, value) => {
    if (key.startsWith(RECOVERY_PREFIX)) throw new Error('QuotaExceeded');
    originalSet(key, value);
  };
  failure('WRITE_FAILED', () => restoreBackup(backup(project('new')), { storage: store, confirmation: 'REPLACE_PROJECT' }));
  assert.equal(store.getItem(PROJECT_KEY), old);
});

test('If primary restore write fails, previous primary and recovery stay', () => {
  const store = memoryStorage(); saveProject(project('old'), { storage: store });
  const old = store.getItem(PROJECT_KEY);
  const originalSet = store.setItem;
  store.setItem = (key, value) => {
    if (key === PROJECT_KEY) throw new Error('QuotaExceeded');
    originalSet(key, value);
  };
  failure('WRITE_FAILED', () => restoreBackup(backup(project('new')), { storage: store, confirmation: 'REPLACE_PROJECT' }));
  assert.equal(store.getItem(PROJECT_KEY), old);
  assert.equal([...store.map.keys()].filter(k => k.startsWith(RECOVERY_PREFIX)).length, 1);
});

test('Inline attachment payloads cannot be incorrectly declared excluded', () => {
  const p = project(); p.attachments.push({ id: 'attachment01', dataUrl: 'data:image/png;base64,...' });
  failure('INLINE_FILE_UNSUPPORTED', () => createBackup(p));
});

test('Unusable storage is reported, not silently faked', () => {
  failure('STORAGE_UNAVAILABLE', () => saveProject(project(), { storage: {} }));
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  failure('READ_FAILED', () => loadProject({ storage: denied }));
});
