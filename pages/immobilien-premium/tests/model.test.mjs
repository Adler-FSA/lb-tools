import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject, validateProject, assertValidProject, SCHEMA_VERSION, STORAGE_NAMESPACE } from '../assets/js/model.js';

function fixture() {
  const project = createEmptyProject('project_mh01');
  project.properties.push({ id: 'house01', label: 'Musterhaus' });
  project.units.push(
    { id: 'unitA', propertyId: 'house01', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 12000 }] },
    { id: 'unitB', propertyId: 'house01', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }] }
  );
  project.tenancies.push({ id: 'leaseB', unitId: 'unitB', startDate: '2026-01-01', endDate: null });
  project.usagePeriods.push(
    { id: 'ownerA', unitId: 'unitA', kind: 'owner', startDate: '2026-01-01', endDate: null },
    { id: 'tenantB', unitId: 'unitB', kind: 'tenant', tenancyId: 'leaseB', startDate: '2026-01-01', endDate: null }
  );
  project.accountingPeriods.push({ id: 'year2026', propertyId: 'house01', startDate: '2026-01-01', endDate: '2026-12-31' });
  project.contractTerms.push({ id: 'termsB', tenancyId: 'leaseB', startDate: '2026-01-01', endDate: null, operatingCostsModel: 'advance', advanceCents: 10000 });
  project.expenses.push({ id: 'invoice01', propertyId: 'house01', startDate: '2026-01-01', endDate: '2026-12-31', amountCents: 60000, classification: 'allocatable' });
  project.allocationRules.push({ id: 'rule01', expenseId: 'invoice01', accountingPeriodId: 'year2026', method: 'area' });
  project.cashflows.push(
    { id: 'tenantPaid', tenancyId: 'leaseB', kind: 'tenant_payment', amountCents: 10000, date: '2026-01-05' },
    { id: 'providerPaid', propertyId: 'house01', kind: 'provider_payment', amountCents: 5000, date: '2026-01-05' }
  );
  return project;
}

function includesCode(project, code) {
  assert.ok(validateProject(project).some(error => error.code === code), `Fehler ${code} erwartet`);
}

test('Leeres Projekt hat eigenes Schema ohne Datenübernahme', () => {
  const p = createEmptyProject('new_project');
  assert.equal(p.schemaVersion, SCHEMA_VERSION);
  assert.equal(STORAGE_NAMESPACE, 'akademie:nebenskosten-premium:v1');
  assert.equal(p.expenses.length, 0);
  assert.equal(p.tenancies.length, 0);
  assert.deepEqual(validateProject(p), []);
});
test('Gültige Stammdaten und getrennte Zahlungskreise werden akzeptiert', () => {
  assert.equal(assertValidProject(fixture()).projectId, 'project_mh01');
});
test('Doppelte IDs werden abgewiesen, auch über Sammlungen hinweg', () => {
  const p = fixture(); p.meters.push({ id: 'unitA', propertyId: 'house01' }); includesCode(p, 'DUPLICATE_ID');
});
test('Fehlerhafte Referenzen werden angezeigt', () => {
  const p = fixture(); p.expenses[0].propertyId = 'unknown'; includesCode(p, 'BROKEN_REFERENCE');
});
test('Ungültige Daten und umgekehrte Zeiträume werden nicht korrigiert', () => {
  const p = fixture(); p.tenancies[0].startDate = '2026-02-30'; includesCode(p, 'INVALID_DATE');
  p.tenancies[0].startDate = '2026-09-01'; p.tenancies[0].endDate = '2026-01-01'; includesCode(p, 'INVERTED_PERIOD');
});
test('Überlappende Nutzungszeiträume derselben Wohnung sind ein Fehler', () => {
  const p = fixture(); p.usagePeriods[1].endDate = '2026-06-30';
  p.usagePeriods.push({ id: 'vacantB', unitId: 'unitB', kind: 'vacant', startDate: '2026-06-30', endDate: '2026-07-31' });
  includesCode(p, 'OVERLAPPING_USAGE');
});
test('Mietverhältnis einer anderen Wohnung wird nicht zugeordnet', () => {
  const p = fixture(); p.usagePeriods[1].unitId = 'unitA'; includesCode(p, 'MISMATCHED_UNIT');
});
test('Geldwerte müssen ganzzahlige Cent sein', () => {
  const p = fixture(); p.expenses[0].amountCents = 100.12; includesCode(p, 'INVALID_MONEY');
});
test('Eine Pauschale bleibt als eigenes Vertragsmodell erkennbar', () => {
  const p = fixture(); p.contractTerms[0].operatingCostsModel = 'flat';
  assert.deepEqual(validateProject(p), []);
});
test('Freigegebenes Dokument ohne Snapshot wird abgewiesen', () => {
  const p = fixture(); p.documents.push({ id: 'pdf01', status: 'released', releasedOn: '2026-12-31' });
  includesCode(p, 'MISSING_RELEASE_SNAPSHOT');
});
test('Fehlende Sammlung wird nicht still ergänzt', () => {
  const p = fixture(); delete p.cashflows; includesCode(p, 'MISSING_COLLECTION');
});
