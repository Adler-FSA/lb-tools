import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { buildDocumentedConsumption, buildOwnerYearComparison } from '../assets/js/owner-insights.js';

function fixture() {
  const p = createEmptyProject('owner_insights');
  p.properties.push({ id: 'house' });
  p.units.push({
    id: 'unit1', propertyId: 'house',
    areaHistory: [{ from: '2025-01-01', to: null, hundredthsM2: 8000 }]
  });
  p.usagePeriods.push({
    id: 'usage1', unitId: 'unit1', kind: 'owner',
    startDate: '2025-01-01', endDate: null
  });
  p.accountingPeriods.push(
    { id: 'year2025', propertyId: 'house', startDate: '2025-01-01', endDate: '2025-12-31' },
    { id: 'year2026', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31' }
  );
  p.expenses.push(
    { id: 'e25', propertyId: 'house', category: 'repair', classification: 'owner',
      amountCents: 100000, startDate: '2025-01-01', endDate: '2025-12-31', invoiceReference: '25' },
    { id: 'e26', propertyId: 'house', category: 'property_tax', classification: 'allocatable',
      amountCents: 120000, startDate: '2026-01-01', endDate: '2026-12-31', invoiceReference: '26' }
  );
  p.cashflows.push(
    { id: 'c25', kind: 'provider_payment', propertyId: 'house', accountingPeriodId: 'year2025',
      providerAccountId: 'provider1', amountCents: 90000, date: '2025-06-01' },
    { id: 'c26', kind: 'provider_payment', propertyId: 'house', accountingPeriodId: 'year2026',
      providerAccountId: 'provider1', amountCents: 110000, date: '2026-06-01' }
  );
  p.meters.push(
    { id: 'water1', propertyId: 'house', unitId: 'unit1', service: 'cold_water',
      measurementKind: 'water_volume', measurementUnit: 'm3', installedAt: '2025-01-01' },
    { id: 'heat1', propertyId: 'house', unitId: 'unit1', service: 'heating',
      measurementKind: 'heat_energy', measurementUnit: 'kWh', installedAt: '2026-01-01' }
  );
  p.readings.push(
    { id: 'w25a', meterId: 'water1', date: '2025-01-01', value: 10, readingType: 'measured' },
    { id: 'w25b', meterId: 'water1', date: '2025-12-31', value: 30.5, readingType: 'measured' },
    { id: 'w26a', meterId: 'water1', date: '2026-01-01', value: 30.5, readingType: 'measured' },
    { id: 'w26b', meterId: 'water1', date: '2026-12-31', value: 54.75, readingType: 'measured' },
    { id: 'h26a', meterId: 'heat1', date: '2026-01-01', value: 1000, readingType: 'measured' },
    { id: 'h26b', meterId: 'heat1', date: '2026-12-31', value: 4500, readingType: 'measured' }
  );
  return p;
}

test('year comparison keeps yearly costs and provider payments separate', () => {
  const r = buildOwnerYearComparison(fixture(), 'house');
  assert.equal(r.status, 'comparison');
  assert.deepEqual(r.years.map(y => [y.yearLabel, y.actualCostsCents, y.providerNetPaidCents]), [
    ['2025', 100000, 90000],
    ['2026', 120000, 110000]
  ]);
});

test('documented consumption sums only first-to-last measured delta per meter in selected year', () => {
  const r = buildDocumentedConsumption(fixture(), 'house', 'year2026');
  assert.equal(r.status, 'consumption');
  assert.equal(r.report.estimated, false);
  assert.equal(r.report.meterCount, 2);
  assert.equal(r.report.readingCount, 4);
  assert.equal(r.report.metersWithDelta, 2);
  assert.deepEqual(r.report.totals, [
    { service: 'cold_water', unit: 'm3', value: 24.25, meterCount: 1 },
    { service: 'heating', unit: 'kWh', value: 3500, meterCount: 1 }
  ]);
});

test('meter with only one selected-year reading is not guessed', () => {
  const p = fixture();
  p.readings = p.readings.filter(x => x.id !== 'h26b');
  const r = buildDocumentedConsumption(p, 'house', 'year2026');
  assert.equal(r.report.metersWithDelta, 1);
  assert.deepEqual(r.report.totals, [
    { service: 'cold_water', unit: 'm3', value: 24.25, meterCount: 1 }
  ]);
});

test('foreign property and wrong period are blocked or excluded', () => {
  const p = fixture();
  p.properties.push({ id: 'other' });
  p.accountingPeriods.push({
    id: 'other2026', propertyId: 'other', startDate: '2026-01-01', endDate: '2026-12-31'
  });
  let r = buildDocumentedConsumption(p, 'house', 'other2026');
  assert.equal(r.status, 'blocked');
  r = buildOwnerYearComparison(p, 'house');
  assert.equal(r.years.length, 2);
});
