/** Nebenkosten Premium v1: isolated, explicit local storage and JSON backups. */
import { assertValidProject, COLLECTIONS, SCHEMA_VERSION, STORAGE_NAMESPACE } from './model.js';

export const PROJECT_KEY = `${STORAGE_NAMESPACE}:project`;
export const RECOVERY_PREFIX = `${STORAGE_NAMESPACE}:before-restore:`;
export const BACKUP_FORMAT = 'akademie-nebenkosten-premium-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_CHARS = 8_000_000;

export class StorageError extends Error {
  constructor(code, message, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'StorageError';
    this.code = code;
  }
}

function storageOf(adapter) {
  let target = adapter;
  if (target === undefined) {
    try { target = globalThis.localStorage; } catch (cause) {
      throw new StorageError('STORAGE_UNAVAILABLE', 'Lokaler Speicher ist nicht zugänglich.', cause);
    }
  }
  if (!target || ['getItem', 'setItem'].some(method => typeof target[method] !== 'function')) {
    throw new StorageError('STORAGE_UNAVAILABLE', 'Ein zugänglicher Speicher wird benötigt.');
  }
  return target;
}

function readRaw(storage, key) {
  try { return storage.getItem(key); }
  catch (cause) { throw new StorageError('READ_FAILED', 'Lokale Daten konnten nicht gelesen werden.', cause); }
}

function writeRaw(storage, key, value) {
  try { storage.setItem(key, value); }
  catch (cause) { throw new StorageError('WRITE_FAILED', 'Lokaler Speicher konnte nicht beschrieben werden; vorhandene Daten wurden nicht bewusst gelöscht.', cause); }
}

function checkedProject(project) {
  try {
    assertValidProject(project);
    // Serialize and revalidate: the stored JSON is authoritative, not the live object.
    const json = JSON.stringify(project);
    if (typeof json !== 'string') throw new TypeError('Projekt kann nicht gespeichert werden.');
    const copy = JSON.parse(json);
    assertValidProject(copy);
    return { copy, json };
  } catch (cause) {
    throw new StorageError('INVALID_PROJECT', 'Projekt ist strukturell ungültig oder nicht als JSON speicherbar.', cause);
  }
}

function parseProject(raw) {
  try { return checkedProject(JSON.parse(raw)).copy; }
  catch (cause) { throw new StorageError('CORRUPT_PROJECT', 'Gespeicherte Projektdaten sind beschädigt; nichts wird automatisch überschrieben.', cause); }
}

function protectReleased(previous, next) {
  const nextDocs = new Map(next.documents.map(document => [document.id, document]));
  for (const oldDoc of previous.documents) {
    if (oldDoc.status !== 'released') continue;
    const current = nextDocs.get(oldDoc.id);
    if (!current || JSON.stringify(current) !== JSON.stringify(oldDoc)) {
      throw new StorageError('RELEASED_IMMUTABLE', 'Freigegebene Dokumente dürfen nicht verändert oder entfernt werden. Neue Fassung anlegen.');
    }
  }
}

/** Never creates a demo project or touches another application's keys. */
export function loadProject({ storage } = {}) {
  const raw = readRaw(storageOf(storage), PROJECT_KEY);
  return raw === null ? null : parseProject(raw);
}

/** Single-key save; no automatic replacement of another project or corrupt data. */
export function saveProject(project, { storage } = {}) {
  const target = storageOf(storage);
  const { copy, json } = checkedProject(project);
  const oldRaw = readRaw(target, PROJECT_KEY);
  if (oldRaw !== null) {
    const old = parseProject(oldRaw);
    if (old.projectId !== copy.projectId) throw new StorageError('PROJECT_CONFLICT', 'Anderes Projekt vorhanden: nur eine ausdrücklich bestätigte Wiederherstellung darf es ersetzen.');
    protectReleased(old, copy);
  }
  writeRaw(target, PROJECT_KEY, json);
  return { projectId: copy.projectId, bytesApprox: json.length };
}

function assertNoInlineBinary(project) {
  const forbidden = ['base64', 'blob', 'bytes', 'dataUrl', 'fileData', 'pdfBase64', 'binary'];
  for (const collection of ['attachments', 'documents']) {
    for (const record of project[collection]) {
      if (forbidden.some(key => Object.hasOwn(record, key))) {
        throw new StorageError('INLINE_FILE_UNSUPPORTED', 'Dateiinhalt im Datensatz erkannt: Sicherung von Belegen/PDF-Dateien ist hier nicht implementiert.');
      }
    }
  }
  // Contract and price-version records carry only references to original evidence.
  for (const record of project.supplyRegistry ?? []) {
    for (const item of [record, record.contract, ...(record.contract?.priceVersions ?? [])]) {
      if (item && forbidden.some(key => Object.hasOwn(item, key))) {
        throw new StorageError('INLINE_FILE_UNSUPPORTED',
          'Versorgungsverträge enthalten Dateiinhalte statt Belegreferenzen.');
      }
    }
  }
}

/** Exports JSON metadata and project data only, never actual attachment/PDF bytes. */
export function createBackup(project, { now = () => new Date() } = {}) {
  const { copy } = checkedProject(project);
  assertNoInlineBinary(copy);
  const date = now();
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) throw new StorageError('INVALID_CLOCK', 'Ungültiger Sicherungszeitpunkt.');
  const payload = {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdAt: date.toISOString(),
    projectId: copy.projectId,
    containsAttachmentFiles: false,
    containsPdfFiles: false,
    project: copy
  };
  const text = JSON.stringify(payload, null, 2);
  if (text.length > MAX_BACKUP_CHARS) throw new StorageError('BACKUP_TOO_LARGE', 'Sicherung überschreitet die derzeit unterstützte Größe.');
  return text;
}

/** Safe preview, without any write. Import is strictly v1, no legacy migration. */
export function previewBackup(text) {
  if (typeof text !== 'string' || text.length > MAX_BACKUP_CHARS) throw new StorageError('INVALID_BACKUP', 'Keine unterstützte JSON-Sicherungsdatei.');
  let payload;
  try { payload = JSON.parse(text); }
  catch (cause) { throw new StorageError('INVALID_BACKUP', 'Sicherungsdatei ist kein gültiges JSON.', cause); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
    || payload.format !== BACKUP_FORMAT || payload.backupVersion !== BACKUP_VERSION
    || payload.schemaVersion !== SCHEMA_VERSION
    || payload.containsAttachmentFiles !== false || payload.containsPdfFiles !== false
    || typeof payload.createdAt !== 'string' || !Number.isFinite(Date.parse(payload.createdAt))
    || new Date(payload.createdAt).toISOString() !== payload.createdAt) {
    throw new StorageError('UNSUPPORTED_BACKUP', 'Format, Version oder Dateiumfang dieser Sicherung wird nicht unterstützt.');
  }
  const { copy } = checkedProject(payload.project);
  assertNoInlineBinary(copy);
  if (payload.projectId !== copy.projectId) throw new StorageError('INVALID_BACKUP', 'Projektkennung der Sicherung widerspricht den Daten.');
  return {
    projectId: copy.projectId,
    createdAt: payload.createdAt,
    schemaVersion: SCHEMA_VERSION,
    recordCounts: {
      ...Object.fromEntries(COLLECTIONS.map(name => [name, copy[name].length])),
      ...(copy.supplyRegistry?.length ? { supplyRegistry: copy.supplyRegistry.length } : {})
    },
    containsAttachmentFiles: false,
    containsPdfFiles: false
  };
}

/** Explicit replacement only, with a preserved raw recovery snapshot before writing. */
export function restoreBackup(text, { storage, confirmation, now = () => new Date() } = {}) {
  if (confirmation !== 'REPLACE_PROJECT') throw new StorageError('CONFIRMATION_REQUIRED', 'Wiederherstellung muss nach der Vorschau ausdrücklich bestätigt werden.');
  const info = previewBackup(text);
  const target = storageOf(storage);
  const project = JSON.parse(text).project;
  const { json } = checkedProject(project);
  const previousRaw = readRaw(target, PROJECT_KEY);
  let recoveryKey = null;
  if (previousRaw !== null) {
    const moment = now();
    if (!(moment instanceof Date) || Number.isNaN(moment.valueOf())) throw new StorageError('INVALID_CLOCK', 'Ungültiger Wiederherstellungszeitpunkt.');
    const stem = `${RECOVERY_PREFIX}${moment.toISOString()}`;
    for (let index = 0; index < 1000; index++) {
      const candidate = `${stem}:${index}`;
      if (readRaw(target, candidate) === null) { recoveryKey = candidate; break; }
    }
    if (recoveryKey === null) throw new StorageError('RECOVERY_CONFLICT', 'Kein freier Platz für eine unveränderte Wiederherstellungskopie.');
    writeRaw(target, recoveryKey, previousRaw);
  }
  // setItem replaces one complete value; on failure, its previous value is retained by conforming Storage implementations.
  writeRaw(target, PROJECT_KEY, json);
  return { ...info, recoveryKey };
}
