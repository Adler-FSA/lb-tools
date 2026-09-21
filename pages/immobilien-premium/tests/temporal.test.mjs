import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { calculatePeriod } from '../assets/js/calculation.js';

// Fictitious year-only figures, not a legal or contractual allocation endorsement.
function fixture() {
  const p = createEmptyProject('temporal_case');
  p.properties.push({ id: 'home', label: 'Musterhaus' });
  p.units.push(
    { id: 'ownerUnit', propertyId: 'home', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 12000 }] },
    { id: 'rentalUnit', propertyId: 'home', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }] }
  );
  p.accountingPeriods.push({ id: '2026', propertyId: 'home', startDate: '2026-01-01', endDate: '2026-12-31',
    confirmedTenancyIds: ['tenant1', 'tenant2'] });
  p.tenancies.push(
    { id: 'tenant1', unitId: 'rentalUnit', startDate: '2026-01-01', endDate: '2026-06-30' },
    { id: 'tenant2', unitId: 'rentalUnit', startDate: '2026-07-01', endDate: null }
  );
  p.usagePeriods.push(
    { id: 'ownerOccupied', kind: 'owner', unitId: 'ownerUnit', startDate: '2026-01-01', endDate: null },
    { id: 'tenantFirst', kind: 'tenant', tenancyId: 'tenant1', unitId: 'rentalUnit', startDate: '2026-01-01', endDate: '2026-06-30' },
    { id: 'tenantSecond', kind: 'tenant', tenancyId: 'tenant2', unitId: 'rentalUnit', startDate: '2026-07-01', endDate: null }
  );
  for (const [id, startDate, endDate] of [['tenant1', '2026-01-01', '2026-06-30'], ['tenant2', '2026-07-01', null]]) {
    p.contractTerms.push({ id: `${id}_terms`, tenancyId: id, startDate, endDate, operatingCostsModel: 'advance',
      advanceCents: 10000, allowedCostTypes: ['property_tax', 'cold_water'] });
    p.cashflows.push({ id: `${id}_paid`, kind: 'tenant_payment', purpose: 'operating_cost_advance', tenancyId: id,
      accountingPeriodId: '2026', date: id === 'tenant1' ? '2026-06-30' : '2026-12-31', amountCents: 10000 });
  }
  p.expenses.push({ id: 'propertyTax', propertyId: 'home', startDate: '2026-01-01', endDate: '2026-12-31',
    amountCents: 36500, category: 'property_tax', classification: 'allocatable', confirmedForAllocation: true });
  p.allocationRules.push({ id: 'taxRule', expenseId: 'propertyTax', accountingPeriodId: '2026', method: 'area',
    methodConfirmed: true, temporalMethod: 'days', temporalConfirmed: true });
  return p;
}
const run = p => calculatePeriod(p, '2026');
const blocked = (p, code) => {
  const actual = run(p);
  assert.equal(actual.status, 'blocked', JSON.stringify(actual));
  assert.equal(actual.report, null);
  assert.ok(actual.issues.some(x => x.code === code), `${code}: ${JSON.stringify(actual.issues)}`);
};
function withWater(p) {
  p.expenses.push({ id: 'water', propertyId: 'home', startDate: '2026-01-01', endDate: '2026-12-31',
    amountCents: 50000, category: 'cold_water', classification: 'allocatable', confirmedForAllocation: true });
  p.allocationRules.push({ id: 'waterRule', expenseId: 'water', accountingPeriodId: '2026', method: 'consumption',
    methodConfirmed: true, temporalMethod: 'readings', temporalConfirmed: true,
    meterIdsByUnit: { ownerUnit: ['ownMeter'], rentalUnit: ['rentMeter'] } });
  p.meters.push({ id: 'ownMeter', propertyId: 'home', unitId: 'ownerUnit', installedAt: '2025-01-01' },
    { id: 'rentMeter', propertyId: 'home', unitId: 'rentalUnit', installedAt: '2025-01-01' });
  p.readings.push(
    { id: 'ownStart', meterId: 'ownMeter', date: '2026-01-01', value: 100 },
    { id: 'ownEnd', meterId: 'ownMeter', date: '2026-12-31', value: 155 },
    { id: 'rentStart', meterId: 'rentMeter', date: '2026-01-01', value: 10 },
    { id: 'rentMid', meterId: 'rentMeter', date: '2026-07-01', value: 30 },
    { id: 'rentEnd', meterId: 'rentMeter', date: '2026-12-31', value: 55 }
  );
  return p;
}

test('MH-02: Vor- und Nachmieter erhalten getrennte tagesgenaue Kosten und Zahlungen', () => {
  const p = fixture(); const before = JSON.stringify(p);
  const result = run(p);
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  const { report } = result;
  assert.deepEqual(report.tenants, [
    { tenancyId: 'tenant1', costsCents: 7240, advancesCents: 10000, balanceCents: -2760, creditCents: 2760, additionalCents: 0 },
    { tenancyId: 'tenant2', costsCents: 7360, advancesCents: 10000, balanceCents: -2640, creditCents: 2640, additionalCents: 0 }
  ]);
  assert.equal(report.ownerCostsCents, 21900);
  assert.equal(report.totalCostsCents, 36500);
  assert.equal(report.expenseLines[0].unitShares.reduce((n, x) => n + x.cents, 0), 36500);
  assert.deepEqual(report.expenseLines[0].unitShares.filter(x => x.tenancyId).map(x => x.days), [181, 184]);
  assert.equal(JSON.stringify(p), before, 'Berechnung darf Nutzungsdaten nicht verändern');
});

test('MH-03: Leerstand mit zwei Mietern wird als Eigentümeranteil erhalten', () => {
  const p = fixture();
  p.tenancies[0].endDate = '2026-04-30'; p.usagePeriods[1].endDate = '2026-04-30';
  p.contractTerms[0].endDate = '2026-04-30';
  p.usagePeriods.push({ id: 'vacantMiddle', kind: 'vacant', unitId: 'rentalUnit', startDate: '2026-05-01', endDate: '2026-06-30' });
  const result = run(p);
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  const { report } = result;
  assert.equal(report.ownerCostsCents, 24340); // 21,900 + 61 days * 40 cents
  assert.equal(report.tenantCostsCents, 12160);
  assert.deepEqual(report.tenants.map(x => x.costsCents), [4800, 7360]);
  const vacant = report.expenseLines[0].unitShares.find(x => x.kind === 'vacant');
  assert.equal(vacant.cents, 2440);
  assert.equal(vacant.tenancyId, null);
  assert.equal(report.totalCostsCents, report.ownerCostsCents + report.tenantCostsCents);
});

test('Nutzungslücke wird nicht stillschweigend als Leerstand ergänzt', () => {
  const p = fixture(); p.usagePeriods[1].endDate = '2026-05-31';
  blocked(p, 'USAGE_GAP');
});

test('Überlappende Mieterintervalle werden vor der Berechnung abgelehnt', () => {
  const p = fixture(); p.usagePeriods[1].endDate = '2026-07-01';
  blocked(p, 'OVERLAPPING_USAGE');
});

test('Mietvertrag muss den tatsächlichen Nutzungszeitraum decken', () => {
  const p = fixture(); p.tenancies[0].endDate = '2026-06-01';
  blocked(p, 'TENANCY_PERIOD_INVALID');
});

test('Kein tagesgenaues Ergebnis ohne explizit bestätigten Zeitmaßstab', () => {
  const p = fixture(); p.allocationRules[0].temporalConfirmed = false;
  blocked(p, 'TEMPORAL_RULE_REQUIRED');
});

test('Wasser nach Zwischenablesung statt pauschal nach Kalendertagen aufgeteilt', () => {
  const p = withWater(fixture()); const before = JSON.stringify(p);
  const result = run(p);
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.equal(result.report.ownerCostsCents, 49400);
  assert.equal(result.report.totalCostsCents, 86500);
  assert.deepEqual(result.report.tenants.map(t => t.costsCents), [17240, 19860]);
  const waterShares = result.report.expenseLines.find(x => x.expenseId === 'water').unitShares;
  assert.deepEqual(waterShares.map(x => x.cents), [27500, 10000, 12500]);
  assert.equal(JSON.stringify(p), before);
});

test('Fehlende Zwischenablesung sperrt verbrauchsabhängige Aufteilung', () => {
  const p = withWater(fixture()); p.readings = p.readings.filter(x => x.id !== 'rentMid');
  blocked(p, 'METER_INTERMEDIATE_READING_REQUIRED');
});

test('Rückläufiger Zwischenzählerstand wird nicht als Verbrauch null behandelt', () => {
  const p = withWater(fixture()); p.readings.find(x => x.id === 'rentMid').value = 4;
  blocked(p, 'METER_READING_INVALID');
});

test('Verbrauchsanteil erfordert ausdrücklich bestätigte Zwischenablesungsmethode', () => {
  const p = withWater(fixture()); p.allocationRules.find(x => x.id === 'waterRule').temporalMethod = 'days';
  blocked(p, 'TEMPORAL_RULE_REQUIRED');
});

test('Leistungszeitraum außerhalb des Jahres bleibt trotz Zeitaufteilung gesperrt', () => {
  const p = fixture(); p.expenses[0].startDate = '2025-12-01';
  blocked(p, 'EXPENSE_CROSSES_PERIOD');
});

test('Teiljahreskosten brauchen gesonderte Bestätigung des Leistungsbezugs', () => {
  const p = fixture(); p.expenses[0].startDate = '2026-04-01';
  blocked(p, 'TEMPORAL_EXPENSE_REVIEW');
});

test('Schaltjahr: echte Tage statt Monatsanzahl', () => {
  const p = fixture();
  p.accountingPeriods[0].startDate = '2028-01-01'; p.accountingPeriods[0].endDate = '2028-12-31';
  p.usagePeriods[0].startDate = '2028-01-01';
  p.usagePeriods[1].startDate = '2028-01-01'; p.usagePeriods[1].endDate = '2028-02-29';
  p.usagePeriods[2].startDate = '2028-03-01';
  p.tenancies[0].startDate = '2028-01-01'; p.tenancies[0].endDate = '2028-02-29';
  p.tenancies[1].startDate = '2028-03-01';
  p.contractTerms[0].startDate = '2028-01-01'; p.contractTerms[0].endDate = '2028-02-29';
  p.contractTerms[1].startDate = '2028-03-01';
  p.expenses[0].startDate = '2028-01-01'; p.expenses[0].endDate = '2028-12-31';
  p.expenses[0].amountCents = 36600;
  const result = run(p);
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.deepEqual(result.report.tenants.map(x => x.costsCents), [2400, 12240]);
  assert.equal(result.report.ownerCostsCents, 21960);
  assert.equal(result.report.totalCostsCents, 36600);
});
