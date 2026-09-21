import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { calculatePeriod } from '../assets/js/calculation.js';

function fixture() {
  const p = createEmptyProject('quality_case');
  p.properties.push({ id: 'home', label: 'Fiktive Immobilie' });
  p.units.push(
    { id: 'owner', propertyId: 'home', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 10000 }] },
    { id: 'rental', propertyId: 'home', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 10000 }] }
  );
  p.usagePeriods.push(
    { id: 'owner_use', unitId: 'owner', kind: 'owner', startDate: '2026-01-01', endDate: null },
    { id: 'rental_use', unitId: 'rental', kind: 'tenant', tenancyId: 'lease', startDate: '2026-01-01', endDate: null }
  );
  p.tenancies.push({ id: 'lease', unitId: 'rental', startDate: '2026-01-01', endDate: null });
  p.contractTerms.push({ id: 'contract', tenancyId: 'lease', startDate: '2026-01-01', endDate: null,
    operatingCostsModel: 'advance', advanceCents: 10000, allowedCostTypes: ['cold_water'] });
  p.accountingPeriods.push({ id: 'year', propertyId: 'home', startDate: '2026-01-01', endDate: '2026-12-31', confirmedTenancyIds: ['lease'] });
  p.expenses.push({ id: 'water_bill', propertyId: 'home', startDate: '2026-01-01', endDate: '2026-12-31',
    amountCents: 50000, category: 'cold_water', classification: 'allocatable', confirmedForAllocation: true });
  p.allocationRules.push({ id: 'water_rule', expenseId: 'water_bill', accountingPeriodId: 'year',
    method: 'consumption', methodConfirmed: true, meterIdsByUnit: { owner: ['own_meter'], rental: ['rent_meter'] } });
  p.meters.push(
    { id: 'own_meter', propertyId: 'home', unitId: 'owner', installedAt: '2025-01-01' },
    { id: 'rent_meter', propertyId: 'home', unitId: 'rental', installedAt: '2025-01-01' }
  );
  p.readings.push(
    { id: 'owner_start', meterId: 'own_meter', date: '2026-01-01', value: 100 },
    { id: 'owner_end', meterId: 'own_meter', date: '2026-12-31', value: 155 },
    { id: 'rent_start', meterId: 'rent_meter', date: '2026-01-01', value: 10 },
    { id: 'rent_end', meterId: 'rent_meter', date: '2026-12-31', value: 55 }
  );
  p.cashflows.push({ id: 'paid', kind: 'tenant_payment', tenancyId: 'lease', purpose: 'operating_cost_advance',
    accountingPeriodId: 'year', amountCents: 120000, date: '2026-12-31' });
  return p;
}
function blocked(p, code) {
  const result = calculatePeriod(p, 'year');
  assert.equal(result.status, 'blocked', JSON.stringify(result));
  assert.equal(result.report, null);
  assert.ok(result.issues.some(entry => entry.code === code), `${code} fehlt: ${JSON.stringify(result.issues)}`);
}

test('MH-06 Baseline: nachvollziehbare Messwerte bleiben unverändert berechenbar', () => {
  const p = fixture(); const before = JSON.stringify(p);
  const result = calculatePeriod(p, 'year');
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.equal(result.report.tenants[0].costsCents, 22500);
  assert.equal(JSON.stringify(p), before);
});

test('Zusätzlicher Zwischenstand vor dem Endwert darf nicht rückläufig sein', () => {
  const p = fixture(); p.readings.push({ id: 'outlier', meterId: 'rent_meter', date: '2026-07-01', value: 90 });
  blocked(p, 'METER_READING_NON_MONOTONIC');
});

test('Doppelter Messwert an nicht benötigtem Datum wird trotzdem gemeldet', () => {
  const p = fixture();
  p.readings.push({ id: 'extra1', meterId: 'rent_meter', date: '2026-05-01', value: 20 },
    { id: 'extra2', meterId: 'rent_meter', date: '2026-05-01', value: 20 });
  blocked(p, 'METER_READING_DUPLICATE');
});

test('Explizite Schätzung wird nicht als echte Messung verwendet', () => {
  const p = fixture(); p.readings[3].readingType = 'estimated';
  blocked(p, 'METER_READING_NOT_MEASURED');
});

test('Berechneter oder unklarer zusätzlicher Wert bleibt ebenfalls gesperrt', () => {
  const p = fixture(); p.readings.push({ id: 'calculated', meterId: 'rent_meter', date: '2026-07-01', value: 40, readingType: 'calculated' });
  blocked(p, 'METER_READING_NOT_MEASURED');
});

test('Strittige Ablesung erfordert Klärung', () => {
  const p = fixture(); p.readings[2].disputed = true;
  blocked(p, 'METER_READING_DISPUTED');
});

test('Fehlende erforderliche Ablesung bleibt weiterhin gesperrt', () => {
  const p = fixture(); p.readings = p.readings.filter(x => x.id !== 'rent_end');
  blocked(p, 'METER_READING_REQUIRED');
});

test('Ungültiger Zwischenwert mit zu vielen Nachkommastellen sperrt', () => {
  const p = fixture(); p.readings.push({ id: 'too_precise', meterId: 'rent_meter', date: '2026-07-01', value: 20.0001 });
  blocked(p, 'METER_READING_INVALID');
});

test('Optionaler bestätigter Tages-Orientierungswert erkennt einen auffälligen Sprung', () => {
  const p = fixture(); p.meters[1].plausibilityLimitMilliPerDay = 100;
  p.meters[1].plausibilityLimitConfirmed = true;
  blocked(p, 'METER_PLAUSIBILITY_REVIEW');
});

test('Messwerte innerhalb eines bestätigten Orientierungswerts bleiben berechenbar', () => {
  const p = fixture(); p.meters[1].plausibilityLimitMilliPerDay = 200;
  p.meters[1].plausibilityLimitConfirmed = true;
  assert.equal(calculatePeriod(p, 'year').status, 'calculated');
});

test('Ein unbelegter oder ungültiger Schwellenwert wird nicht still ignoriert', () => {
  const p = fixture(); p.meters[1].plausibilityLimitMilliPerDay = 100;
  blocked(p, 'METER_PLAUSIBILITY_LIMIT_UNCONFIRMED');
  p.meters[1].plausibilityLimitConfirmed = true;
  p.meters[1].plausibilityLimitMilliPerDay = -1;
  blocked(p, 'METER_PLAUSIBILITY_LIMIT_UNCONFIRMED');
});

test('Überschreiten eines dokumentierten Zählerregisters wird nicht als Überlauf berechnet', () => {
  const p = fixture(); p.meters[1].registerMaxMilli = 50000;
  blocked(p, 'METER_REGISTER_LIMIT_EXCEEDED');
});

test('Eine Ablesung nach der dokumentierten Außerbetriebnahme wird erkannt', () => {
  const p = fixture(); p.meters[1].removedAt = '2026-11-01';
  blocked(p, 'METER_READING_OUTSIDE_OPERATION');
});

test('Nullverbrauch mit identischen korrekten Anfangs- und Endständen ist zulässig, wenn anderer Zähler Verbrauch zeigt', () => {
  const p = fixture(); p.readings[3].value = 10;
  assert.equal(calculatePeriod(p, 'year').status, 'calculated');
  assert.equal(calculatePeriod(p, 'year').report.tenants[0].costsCents, 0);
});

test('Ein Zwischenwert mit echtem Verlauf wird nicht fälschlich beanstandet', () => {
  const p = fixture(); p.readings.push({ id: 'middle', meterId: 'rent_meter', date: '2026-07-01', value: 30, readingType: 'measured' });
  assert.equal(calculatePeriod(p, 'year').status, 'calculated');
});
