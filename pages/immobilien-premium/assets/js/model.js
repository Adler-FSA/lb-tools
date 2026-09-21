/**
 * Nebenkosten Premium — eigenständiges Datenmodell v1.
 * Keine Alt-Daten-Schnittstelle, keine Browser-Speicherzugriffe, keine Rechtsentscheidung.
 * Geldbeträge: ganzzahlige Cent; Flächen: Hundertstel Quadratmeter.
 */
export const SCHEMA_VERSION = 1;
export const STORAGE_NAMESPACE = 'akademie:nebenskosten-premium:v1';

export const COLLECTIONS = Object.freeze([
  'properties', 'units', 'usagePeriods', 'tenancies', 'contractTerms',
  'accountingPeriods', 'expenses', 'allocationRules', 'meters', 'readings',
  'cashflows', 'documents', 'checkItems', 'attachments'
]);

const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value);
const cents = value => Number.isSafeInteger(value) && value >= 0;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/** Returns a new, deliberately empty project: no sample or legacy values. */
export function createEmptyProject(projectId) {
  if (!validId(projectId)) throw new TypeError('Eine gültige Projekt-ID wird benötigt.');
  return {
    schemaVersion: SCHEMA_VERSION,
    projectId,
    ...Object.fromEntries(COLLECTIONS.map(name => [name, []]))
  };
}

/** Pure, non-mutating structural checks; no blanket legal release decision. */
export function validateProject(project) {
  const errors = [];
  const add = (path, code, message) => errors.push({ path, code, message });
  if (!plain(project)) return [{ path: '$', code: 'INVALID_PROJECT', message: 'Projekt muss ein Objekt sein.' }];
  if (project.schemaVersion !== SCHEMA_VERSION) add('schemaVersion', 'SCHEMA_VERSION', 'Unbekannte Schema-Version.');
  if (!validId(project.projectId)) add('projectId', 'INVALID_ID', 'Ungültige Projekt-ID.');

  const indexes = {};
  const globalIds = new Set();
  for (const name of COLLECTIONS) {
    if (!Array.isArray(project[name])) {
      add(name, 'MISSING_COLLECTION', 'Erforderliche Sammlung fehlt oder ist kein Array.');
      indexes[name] = new Map();
      continue;
    }
    const index = new Map();
    project[name].forEach((record, i) => {
      const path = `${name}[${i}]`;
      if (!plain(record)) { add(path, 'INVALID_RECORD', 'Datensatz muss ein Objekt sein.'); return; }
      if (!validId(record.id)) { add(`${path}.id`, 'INVALID_ID', 'Ungültige stabile Kennung.'); return; }
      if (globalIds.has(record.id)) add(`${path}.id`, 'DUPLICATE_ID', 'Kennung ist bereits im Projekt vergeben.');
      globalIds.add(record.id);
      index.set(record.id, record);
    });
    indexes[name] = index;
  }
  const exists = (collection, id, path) => {
    if (!validId(id) || !indexes[collection].has(id)) {
      add(path, 'BROKEN_REFERENCE', `Verweis auf ${collection} ist nicht vorhanden.`);
      return false;
    }
    return true;
  };
  const dates = (record, path, from = 'startDate', to = 'endDate') => {
    if (!validDay(record[from])) add(`${path}.${from}`, 'INVALID_DATE', 'Ungültiges ISO-Datum.');
    if (record[to] != null && !validDay(record[to])) add(`${path}.${to}`, 'INVALID_DATE', 'Ungültiges ISO-Datum.');
    if (validDay(record[from]) && validDay(record[to]) && record[from] > record[to]) {
      add(path, 'INVERTED_PERIOD', 'Beginn liegt nach dem Ende.');
    }
  };

  (project.units || []).forEach((unit, i) => {
    if (!plain(unit)) return;
    const path = `units[${i}]`;
    exists('properties', unit.propertyId, `${path}.propertyId`);
    if (!Array.isArray(unit.areaHistory)) add(`${path}.areaHistory`, 'MISSING_AREA_HISTORY', 'Flächenhistorie fehlt.');
    else unit.areaHistory.forEach((area, j) => {
      const p = `${path}.areaHistory[${j}]`;
      if (!plain(area)) { add(p, 'INVALID_RECORD', 'Flächeneintrag ist ungültig.'); return; }
      dates(area, p, 'from', 'to');
      if (!Number.isSafeInteger(area.hundredthsM2) || area.hundredthsM2 <= 0) {
        add(`${p}.hundredthsM2`, 'INVALID_AREA', 'Fläche muss positiv und ganzzahlig skaliert sein.');
      }
    });
  });
  (project.tenancies || []).forEach((tenancy, i) => {
    if (!plain(tenancy)) return;
    const path = `tenancies[${i}]`;
    exists('units', tenancy.unitId, `${path}.unitId`);
    dates(tenancy, path);
  });
  (project.usagePeriods || []).forEach((usage, i) => {
    if (!plain(usage)) return;
    const path = `usagePeriods[${i}]`;
    exists('units', usage.unitId, `${path}.unitId`);
    dates(usage, path);
    if (!['owner', 'tenant', 'vacant'].includes(usage.kind)) add(`${path}.kind`, 'INVALID_USAGE', 'Unbekannte Nutzungsart.');
    if (usage.kind === 'tenant' && exists('tenancies', usage.tenancyId, `${path}.tenancyId`)) {
      if (indexes.tenancies.get(usage.tenancyId)?.unitId !== usage.unitId) {
        add(`${path}.tenancyId`, 'MISMATCHED_UNIT', 'Mietverhältnis gehört zu einer anderen Einheit.');
      }
    }
  });
  // Intervals are inclusive; open end is treated as infinity.
  const usageByUnit = new Map();
  (project.usagePeriods || []).filter(plain).forEach(usage => {
    const list = usageByUnit.get(usage.unitId) || [];
    list.push(usage);
    usageByUnit.set(usage.unitId, list);
  });
  usageByUnit.forEach(list => {
    const sorted = list.filter(x => validDay(x.startDate) && (x.endDate == null || validDay(x.endDate)))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    for (let i = 1; i < sorted.length; i++) {
      if (!sorted[i - 1].endDate || sorted[i].startDate <= sorted[i - 1].endDate) {
        add(`usagePeriods:${sorted[i].id}`, 'OVERLAPPING_USAGE', 'Nutzungszeiträume derselben Einheit überschneiden sich.');
      }
    }
  });

  (project.contractTerms || []).forEach((term, i) => {
    if (!plain(term)) return;
    const path = `contractTerms[${i}]`;
    exists('tenancies', term.tenancyId, `${path}.tenancyId`);
    dates(term, path);
    if (!['advance', 'flat', 'unresolved'].includes(term.operatingCostsModel)) {
      add(`${path}.operatingCostsModel`, 'INVALID_COST_MODEL', 'Vorauszahlung, Pauschale oder ungeklärt angeben.');
    }
    if (term.advanceCents !== undefined && !cents(term.advanceCents)) add(`${path}.advanceCents`, 'INVALID_MONEY', 'Betrag muss ganzzahlige Cent enthalten.');
  });
  (project.accountingPeriods || []).forEach((period, i) => {
    if (!plain(period)) return;
    const path = `accountingPeriods[${i}]`;
    exists('properties', period.propertyId, `${path}.propertyId`);
    dates(period, path);
  });
  (project.expenses || []).forEach((expense, i) => {
    if (!plain(expense)) return;
    const path = `expenses[${i}]`;
    exists('properties', expense.propertyId, `${path}.propertyId`);
    dates(expense, path);
    if (!cents(expense.amountCents)) add(`${path}.amountCents`, 'INVALID_MONEY', 'Betrag muss in nichtnegativen ganzzahligen Cent vorliegen.');
    if (!['allocatable', 'owner', 'unresolved'].includes(expense.classification)) {
      add(`${path}.classification`, 'INVALID_CLASSIFICATION', 'Kostenklassifizierung fehlt.');
    }
    if (expense.unitId != null) exists('units', expense.unitId, `${path}.unitId`);
  });
  (project.allocationRules || []).forEach((rule, i) => {
    if (!plain(rule)) return;
    const path = `allocationRules[${i}]`;
    exists('expenses', rule.expenseId, `${path}.expenseId`);
    exists('accountingPeriods', rule.accountingPeriodId, `${path}.accountingPeriodId`);
    if (!['area', 'consumption', 'direct', 'unresolved', 'special'].includes(rule.method)) {
      add(`${path}.method`, 'INVALID_ALLOCATION', 'Verteilungsmaßstab fehlt oder ist unbekannt.');
    }
  });
  (project.meters || []).forEach((meter, i) => {
    if (!plain(meter)) return;
    const path = `meters[${i}]`;
    exists('properties', meter.propertyId, `${path}.propertyId`);
    if (meter.unitId != null) exists('units', meter.unitId, `${path}.unitId`);
    if (meter.installedAt != null && !validDay(meter.installedAt)) add(`${path}.installedAt`, 'INVALID_DATE', 'Ungültiges Einbaudatum.');
    if (meter.removedAt != null && !validDay(meter.removedAt)) add(`${path}.removedAt`, 'INVALID_DATE', 'Ungültiges Ausbaudatum.');
  });
  (project.readings || []).forEach((reading, i) => {
    if (!plain(reading)) return;
    const path = `readings[${i}]`;
    exists('meters', reading.meterId, `${path}.meterId`);
    if (!validDay(reading.date)) add(`${path}.date`, 'INVALID_DATE', 'Ungültiges Ablesedatum.');
    if (!Number.isFinite(reading.value) || reading.value < 0) add(`${path}.value`, 'INVALID_READING', 'Ablesung muss eine nichtnegative Zahl sein.');
  });
  (project.cashflows || []).forEach((flow, i) => {
    if (!plain(flow)) return;
    const path = `cashflows[${i}]`;
    if (!['provider_payment', 'provider_refund', 'tenant_advance_due', 'tenant_payment', 'tenant_refund'].includes(flow.kind)) {
      add(`${path}.kind`, 'INVALID_CASHFLOW', 'Unbekannter Zahlungskreis.');
    }
    if (!cents(flow.amountCents)) add(`${path}.amountCents`, 'INVALID_MONEY', 'Betrag muss ganzzahlige Cent enthalten.');
    if (!validDay(flow.date)) add(`${path}.date`, 'INVALID_DATE', 'Ungültiges Zahlungs-/Fälligkeitsdatum.');
    if (flow.kind?.startsWith('tenant_')) exists('tenancies', flow.tenancyId, `${path}.tenancyId`);
    if (flow.kind?.startsWith('provider_')) exists('properties', flow.propertyId, `${path}.propertyId`);
  });
  (project.documents || []).forEach((document, i) => {
    if (!plain(document)) return;
    const path = `documents[${i}]`;
    if (!['draft', 'review', 'ready', 'released'].includes(document.status)) add(`${path}.status`, 'INVALID_STATUS', 'Unbekannter Dokumentstatus.');
    if (document.status === 'released' && (!plain(document.snapshot) || !validDay(document.releasedOn))) {
      add(path, 'MISSING_RELEASE_SNAPSHOT', 'Freigabe braucht Daten-Snapshot und Freigabedatum.');
    }
  });
  return errors;
}

export function assertValidProject(project) {
  const errors = validateProject(project);
  if (errors.length) throw new Error(`Projektdaten ungültig: ${errors.slice(0, 3).map(x => `${x.path}: ${x.code}`).join('; ')}`);
  return project;
}
