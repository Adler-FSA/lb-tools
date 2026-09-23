/** Nebenkosten Premium — explicit historical changes for Baustein 3.
 * Pure functions: clone first, never overwrite an existing period silently.
 */
import { validateProject } from './model.js';

const DAY_MS = 86_400_000;
const validDay = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};
const previousDay = iso => new Date(Date.parse(`${iso}T00:00:00.000Z`) - DAY_MS).toISOString().slice(0, 10);
const nonNegativeReading = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
  /^\d+(?:\.\d{1,3})?$/.test(String(value));

export class HistoryChangeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HistoryChangeError';
    this.code = code;
  }
}

function validBase(project) {
  const errors = validateProject(project);
  if (errors.length) {
    throw new HistoryChangeError('INVALID_PROJECT', 'Die gespeicherten Projektdaten müssen vor einer Historienänderung gültig sein.');
  }
}

function uniqueId(project, id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id)) {
    throw new HistoryChangeError('INVALID_ID', 'Für den neuen Historieneintrag wird eine gültige Kennung benötigt.');
  }
  const collections = [
    'properties','units','usagePeriods','tenancies','contractTerms','accountingPeriods','expenses',
    'allocationRules','meters','readings','cashflows','documents','checkItems','attachments'
  ];
  if (collections.some(name => (project[name] ?? []).some(record => record.id === id))) {
    throw new HistoryChangeError('DUPLICATE_ID', 'Die neue Kennung ist bereits im Projekt vorhanden.');
  }
}

function assertResult(project) {
  const errors = validateProject(project);
  if (errors.length) {
    throw new HistoryChangeError('RESULT_INVALID', 'Die gewünschte Historienänderung würde ungültige Projektdaten erzeugen.');
  }
  return project;
}

export function changeUnitArea(project, { unitId, effectiveFrom, hundredthsM2 }) {
  validBase(project);
  if (!validDay(effectiveFrom) || !Number.isSafeInteger(hundredthsM2) || hundredthsM2 <= 0) {
    throw new HistoryChangeError('AREA_CHANGE_INVALID', 'Neues Flächendatum und positive Fläche werden benötigt.');
  }
  const copy = structuredClone(project);
  const unit = copy.units.find(item => item.id === unitId);
  if (!unit) throw new HistoryChangeError('UNIT_NOT_FOUND', 'Nutzungseinheit wurde nicht gefunden.');

  const covering = (unit.areaHistory ?? []).filter(item =>
    item.from <= effectiveFrom && (item.to == null || item.to >= effectiveFrom));
  if (covering.length !== 1) {
    throw new HistoryChangeError('AREA_HISTORY_AMBIGUOUS', 'Das Änderungsdatum ist keinem eindeutigen Flächenzeitraum zugeordnet.');
  }
  const current = covering[0];
  if (effectiveFrom === current.from) {
    throw new HistoryChangeError('AREA_CHANGE_REWRITE', 'Eine bestehende Fläche wird nicht still überschrieben. Bitte ein späteres Gültigkeitsdatum wählen.');
  }
  const oldTo = current.to ?? null;
  current.to = previousDay(effectiveFrom);
  unit.areaHistory.push({ from: effectiveFrom, to: oldTo, hundredthsM2 });
  unit.areaHistory.sort((a, b) => a.from.localeCompare(b.from));

  return { project: assertResult(copy), unitId, effectiveFrom, hundredthsM2 };
}

export function changeUnitUsage(project, {
  unitId, effectiveFrom, kind, usageId, tenancyId = null, partyLabel = ''
}) {
  validBase(project);
  if (!validDay(effectiveFrom) || !['owner','tenant','vacant'].includes(kind)) {
    throw new HistoryChangeError('USAGE_CHANGE_INVALID', 'Gültiges Änderungsdatum und Nutzungsart werden benötigt.');
  }
  uniqueId(project, usageId);
  if (kind === 'tenant') uniqueId(project, tenancyId);

  const copy = structuredClone(project);
  const unit = copy.units.find(item => item.id === unitId);
  if (!unit) throw new HistoryChangeError('UNIT_NOT_FOUND', 'Nutzungseinheit wurde nicht gefunden.');
  const covering = copy.usagePeriods.filter(item =>
    item.unitId === unitId && item.startDate <= effectiveFrom && (item.endDate == null || item.endDate >= effectiveFrom));
  if (covering.length !== 1) {
    throw new HistoryChangeError('USAGE_HISTORY_AMBIGUOUS', 'Das Änderungsdatum ist keinem eindeutigen Nutzungszeitraum zugeordnet.');
  }
  const current = covering[0];
  if (effectiveFrom === current.startDate) {
    throw new HistoryChangeError('USAGE_CHANGE_REWRITE', 'Eine bestehende Nutzung wird nicht still überschrieben. Bitte ein späteres Gültigkeitsdatum wählen.');
  }
  if (current.kind === kind && kind !== 'tenant') {
    throw new HistoryChangeError('USAGE_CHANGE_NOOP', 'Die gewählte Nutzungsart ist bereits aktiv.');
  }

  const oldEnd = current.endDate ?? null;
  const closedOn = previousDay(effectiveFrom);
  current.endDate = closedOn;
  if (current.kind === 'tenant' && current.tenancyId) {
    const oldTenancy = copy.tenancies.find(item => item.id === current.tenancyId);
    if (!oldTenancy) throw new HistoryChangeError('TENANCY_NOT_FOUND', 'Bisheriges Mietverhältnis wurde nicht gefunden.');
    if (oldTenancy.endDate == null || oldTenancy.endDate >= effectiveFrom) oldTenancy.endDate = closedOn;
  }

  let newTenancyId = null;
  if (kind === 'tenant') {
    newTenancyId = tenancyId;
    copy.tenancies.push({
      id: tenancyId,
      unitId,
      startDate: effectiveFrom,
      endDate: oldEnd,
      partyLabel: String(partyLabel || '').trim() || 'Mietverhältnis'
    });
  }
  copy.usagePeriods.push({
    id: usageId,
    unitId,
    kind,
    ...(newTenancyId ? { tenancyId: newTenancyId } : {}),
    startDate: effectiveFrom,
    endDate: oldEnd
  });

  return {
    project: assertResult(copy),
    unitId,
    effectiveFrom,
    previousKind: current.kind,
    newKind: kind,
    tenancyId: newTenancyId
  };
}

export function replaceMeter(project, {
  oldMeterId, swapDate, newMeterId, newLabel,
  oldFinalReadingId, newInitialReadingId, oldFinalValue, newInitialValue
}) {
  validBase(project);
  if (!validDay(swapDate) || !nonNegativeReading(oldFinalValue) || !nonNegativeReading(newInitialValue)) {
    throw new HistoryChangeError('METER_SWAP_INVALID', 'Wechseldatum sowie alter End- und neuer Anfangsstand werden benötigt.');
  }
  uniqueId(project, newMeterId);
  uniqueId(project, oldFinalReadingId);
  uniqueId(project, newInitialReadingId);

  const copy = structuredClone(project);
  const oldMeter = copy.meters.find(item => item.id === oldMeterId);
  if (!oldMeter) throw new HistoryChangeError('METER_NOT_FOUND', 'Bisheriger Zähler wurde nicht gefunden.');
  if (oldMeter.removedAt && oldMeter.removedAt < swapDate) {
    throw new HistoryChangeError('METER_ALREADY_REMOVED', 'Der bisherige Zähler war vor diesem Datum bereits ausgebaut.');
  }
  if (oldMeter.installedAt && swapDate <= oldMeter.installedAt) {
    throw new HistoryChangeError('METER_SWAP_DATE', 'Der Wechsel muss nach dem Einbaudatum des bisherigen Zählers liegen.');
  }
  const laterOldReadings = copy.readings.filter(item => item.meterId === oldMeterId && item.date >= swapDate);
  if (laterOldReadings.length) {
    throw new HistoryChangeError('METER_SWAP_READING_CONFLICT', 'Am oder nach dem Wechseltag existieren bereits Ablesungen des alten Zählers.');
  }
  const latestBefore = copy.readings
    .filter(item => item.meterId === oldMeterId && item.date < swapDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (latestBefore && oldFinalValue < latestBefore.value) {
    throw new HistoryChangeError('METER_SWAP_NON_MONOTONIC', 'Der Endstand des alten Zählers liegt unter der letzten gespeicherten Ablesung.');
  }

  oldMeter.removedAt = swapDate;
  const replacement = {
    ...oldMeter,
    id: newMeterId,
    label: String(newLabel || '').trim() || `${oldMeter.label || 'Zähler'} – neu`,
    installedAt: swapDate,
    removedAt: null
  };
  copy.meters.push(replacement);
  copy.readings.push(
    { id: oldFinalReadingId, meterId: oldMeterId, date: swapDate, value: oldFinalValue, readingType: 'measured' },
    { id: newInitialReadingId, meterId: newMeterId, date: swapDate, value: newInitialValue, readingType: 'measured' }
  );

  return {
    project: assertResult(copy),
    oldMeterId,
    newMeterId,
    swapDate,
    oldFinalValue,
    newInitialValue
  };
}
