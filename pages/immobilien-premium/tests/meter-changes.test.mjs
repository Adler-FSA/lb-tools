import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { calculatePeriod } from '../assets/js/calculation.js';

// Fiktive Messwerte. Der technische Prüflauf ist keine mietrechtliche Freigabe.
function fixture() {
  const p = createEmptyProject('meter_swap_test');
  p.properties.push({ id: 'house', label: 'Testhaus' });
  p.units.push(
    { id: 'own', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 12000 }] },
    { id: 'rent', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }] }
  );
  p.usagePeriods.push(
    { id: 'own_use', unitId: 'own', kind: 'owner', startDate: '2026-01-01', endDate: null },
    { id: 'rent_use', unitId: 'rent', kind: 'tenant', tenancyId: 'lease1', startDate: '2026-01-01', endDate: null }
  );
  p.tenancies.push({ id: 'lease1', unitId: 'rent', startDate: '2026-01-01', endDate: null });
  p.contractTerms.push({ id: 'lease1_terms', tenancyId: 'lease1', startDate: '2026-01-01', endDate: null,
    advanceCents: 10000, operatingCostsModel: 'advance', allowedCostTypes: ['cold_water'] });
  p.accountingPeriods.push({ id: 'year2026', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31',
    confirmedTenancyIds: ['lease1'] });
  p.expenses.push({ id: 'water_bill', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31',
    amountCents: 50000, category: 'cold_water', classification: 'allocatable', confirmedForAllocation: true });
  p.allocationRules.push({ id: 'water_rule', expenseId: 'water_bill', accountingPeriodId: 'year2026',
    method: 'consumption', methodConfirmed: true, meterSwapConfirmed: true,
    meterChainsByUnit: { own: [['own_meter']], rent: [['old_meter', 'new_meter']] } });
  p.meters.push(
    { id: 'own_meter', propertyId: 'house', unitId: 'own', installedAt: '2025-01-01' },
    { id: 'old_meter', propertyId: 'house', unitId: 'rent', installedAt: '2025-01-01', removedAt: '2026-07-01' },
    { id: 'new_meter', propertyId: 'house', unitId: 'rent', installedAt: '2026-07-01' }
  );
  p.readings.push(
    { id: 'own_start', meterId: 'own_meter', date: '2026-01-01', value: 100 },
    { id: 'own_end', meterId: 'own_meter', date: '2026-12-31', value: 155 },
    { id: 'old_start', meterId: 'old_meter', date: '2026-01-01', value: 10 },
    { id: 'old_final', meterId: 'old_meter', date: '2026-07-01', value: 30 },
    { id: 'new_initial', meterId: 'new_meter', date: '2026-07-01', value: 5 },
    { id: 'new_end', meterId: 'new_meter', date: '2026-12-31', value: 30 }
  );
  p.cashflows.push({ id: 'paid_advance', kind: 'tenant_payment', tenancyId: 'lease1',
    accountingPeriodId: 'year2026', purpose: 'operating_cost_advance', date: '2026-12-31', amountCents: 120000 });
  return p;
}
function blocked(p, code) {
  const result = calculatePeriod(p, 'year2026');
  assert.equal(result.status, 'blocked', JSON.stringify(result));
  assert.equal(result.report, null);
  assert.ok(result.issues.some(issue => issue.code === code), `${code}: ${JSON.stringify(result.issues)}`);
}

test('MH-05: Zählerwechsel mit zwei echten Schluss-/Anfangswerten wird exakt summiert', () => {
  const p = fixture();
  const before = JSON.stringify(p);
  const result = calculatePeriod(p, 'year2026');
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.deepEqual(result.report.expenseLines[0].weights, [{ id: 'own', weight: 55000 }, { id: 'rent', weight: 45000 }]);
  assert.deepEqual(result.report.expenseLines[0].unitShares.map(share => share.cents), [27500, 22500]);
  assert.equal(result.report.tenants[0].costsCents, 22500);
  assert.equal(result.report.legalRelease, false);
  assert.equal(JSON.stringify(p), before, 'Weder Zähler noch Ablesungen dürfen überschrieben werden');
});

test('Wechsel und Mieterwechsel am gleichen Tag: getrennte Zählerstände, kein Doppelverbrauch', () => {
  const p = fixture();
  p.usagePeriods[1].endDate = '2026-06-30';
  p.usagePeriods.push({ id: 'rent_use2', unitId: 'rent', kind: 'tenant', tenancyId: 'lease2',
    startDate: '2026-07-01', endDate: null });
  p.tenancies[0].endDate = '2026-06-30';
  p.tenancies.push({ id: 'lease2', unitId: 'rent', startDate: '2026-07-01', endDate: null });
  p.contractTerms[0].endDate = '2026-06-30';
  p.contractTerms.push({ id: 'lease2_terms', tenancyId: 'lease2', startDate: '2026-07-01', endDate: null,
    advanceCents: 10000, operatingCostsModel: 'advance', allowedCostTypes: ['cold_water'] });
  p.accountingPeriods[0].confirmedTenancyIds.push('lease2');
  p.allocationRules[0].temporalConfirmed = true;
  p.allocationRules[0].temporalMethod = 'readings';
  p.cashflows.push({ id: 'paid_advance2', kind: 'tenant_payment', tenancyId: 'lease2',
    accountingPeriodId: 'year2026', purpose: 'operating_cost_advance', date: '2026-12-31', amountCents: 60000 });
  const result = calculatePeriod(p, 'year2026');
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.deepEqual(result.report.tenants.map(x => x.costsCents), [10000, 12500]);
  assert.equal(result.report.ownerCostsCents, 27500);
  assert.equal(result.report.totalCostsCents, 50000);
});

test('Zählerwechsel innerhalb eines Mietabschnitts plus separate spätere Zwischenablesung', () => {
  const p = fixture();
  p.meters[1].removedAt = '2026-05-01';
  p.meters[2].installedAt = '2026-05-01';
  p.readings.find(x => x.id === 'old_final').date = '2026-05-01';
  p.readings.find(x => x.id === 'new_initial').date = '2026-05-01';
  p.readings.push({ id: 'new_intermediate', meterId: 'new_meter', date: '2026-07-01', value: 15 });
  p.usagePeriods[1].endDate = '2026-06-30';
  p.usagePeriods.push({ id: 'rent_use2', unitId: 'rent', kind: 'tenant', tenancyId: 'lease2',
    startDate: '2026-07-01', endDate: null });
  p.tenancies[0].endDate = '2026-06-30';
  p.tenancies.push({ id: 'lease2', unitId: 'rent', startDate: '2026-07-01', endDate: null });
  p.contractTerms[0].endDate = '2026-06-30';
  p.contractTerms.push({ id: 'lease2_terms', tenancyId: 'lease2', startDate: '2026-07-01', endDate: null,
    advanceCents: 10000, operatingCostsModel: 'advance', allowedCostTypes: ['cold_water'] });
  p.accountingPeriods[0].confirmedTenancyIds.push('lease2');
  p.allocationRules[0].temporalConfirmed = true;
  p.allocationRules[0].temporalMethod = 'readings';
  const result = calculatePeriod(p, 'year2026');
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.deepEqual(result.report.tenants.map(x => x.costsCents), [15000, 7500]);
});

test('Fehlender Schlussstand am ausgebauten Zähler sperrt statt zu schätzen', () => {
  const p = fixture(); p.readings = p.readings.filter(x => x.id !== 'old_final');
  blocked(p, 'METER_SWAP_READING_REQUIRED');
});
test('Fehlender Anfangsstand am eingebauten Zähler sperrt statt zu schätzen', () => {
  const p = fixture(); p.readings = p.readings.filter(x => x.id !== 'new_initial');
  blocked(p, 'METER_SWAP_READING_REQUIRED');
});
test('Doppelte Schlussablesung am Wechseltag wird nicht still ausgewählt', () => {
  const p = fixture(); p.readings.push({ id: 'duplicate_swap', meterId: 'old_meter', date: '2026-07-01', value: 30 });
  blocked(p, 'METER_SWAP_READING_REQUIRED');
});
test('Unbestätigter Zählerwechsel bleibt gesperrt', () => {
  const p = fixture(); p.allocationRules[0].meterSwapConfirmed = false;
  blocked(p, 'METER_SWAP_UNCONFIRMED');
});
test('Zeitlücke zwischen Ausbau und Einbau bleibt gesperrt', () => {
  const p = fixture(); p.meters[2].installedAt = '2026-07-02';
  blocked(p, 'METER_CHAIN_GAP_OR_OVERLAP');
});
test('Überlappende Installationszeiten bleiben gesperrt', () => {
  const p = fixture(); p.meters[2].installedAt = '2026-06-30';
  blocked(p, 'METER_CHAIN_GAP_OR_OVERLAP');
});
test('Unvollständige Jahresabdeckung bleibt gesperrt', () => {
  const p = fixture(); p.meters[2].removedAt = '2026-11-01';
  blocked(p, 'METER_CHANGE_UNSUPPORTED');
});
test('Rückläufiger Wert am neuen Zähler wird nicht mit altem Stand saldiert', () => {
  const p = fixture(); p.readings.find(x => x.id === 'new_end').value = 4;
  blocked(p, 'METER_READING_INVALID');
});
test('Ein Zähler darf nicht parallel in zwei Ketten gezählt werden', () => {
  const p = fixture(); p.allocationRules[0].meterChainsByUnit.rent.push(['old_meter']);
  blocked(p, 'METER_DUPLICATED');
});
test('Gleichzeitige alte und neue Mappingform ist wegen Mehrdeutigkeit unzulässig', () => {
  const p = fixture(); p.allocationRules[0].meterIdsByUnit = { own: ['own_meter'], rent: ['old_meter', 'new_meter'] };
  blocked(p, 'METER_MAPPING_REQUIRED');
});
test('Ein kurzlebiger Zähler allein darf nicht als ganzjähriger Zähler durchgehen', () => {
  const p = fixture(); p.allocationRules[0].meterChainsByUnit.rent = [['old_meter']];
  blocked(p, 'METER_CHANGE_UNSUPPORTED');
});
test('Zwei aufeinanderfolgende Zählerwechsel bilden drei Verbrauchsabschnitte ohne Differenz der Geräte-Startwerte', () => {
  const p = fixture();
  p.meters[1].removedAt = '2026-05-01';
  p.meters[2].installedAt = '2026-07-01';
  p.meters.push({ id: 'middle_meter', propertyId: 'house', unitId: 'rent',
    installedAt: '2026-05-01', removedAt: '2026-07-01' });
  p.allocationRules[0].meterChainsByUnit.rent = [['old_meter', 'middle_meter', 'new_meter']];
  p.readings.find(x => x.id === 'old_final').date = '2026-05-01';
  p.readings.find(x => x.id === 'old_final').value = 20;
  p.readings.push(
    { id: 'middle_first', meterId: 'middle_meter', date: '2026-05-01', value: 100 },
    { id: 'middle_last', meterId: 'middle_meter', date: '2026-07-01', value: 110 }
  );
  const result = calculatePeriod(p, 'year2026');
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.deepEqual(result.report.expenseLines[0].weights, [{ id: 'own', weight: 55000 }, { id: 'rent', weight: 45000 }]);
  assert.equal(result.report.tenants[0].costsCents, 22500);
});

test('Zusätzlicher unabhängiger Wohnungszähler wird separat summiert, nicht als Wechsel fehlinterpretiert', () => {
  const p = fixture();
  p.meters.push({ id: 'extra_meter', propertyId: 'house', unitId: 'rent', installedAt: '2025-01-01' });
  p.readings.push(
    { id: 'extra_start', meterId: 'extra_meter', date: '2026-01-01', value: 0 },
    { id: 'extra_end', meterId: 'extra_meter', date: '2026-12-31', value: 5 }
  );
  p.allocationRules[0].meterChainsByUnit.rent.push(['extra_meter']);
  const result = calculatePeriod(p, 'year2026');
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.deepEqual(result.report.expenseLines[0].weights, [{ id: 'own', weight: 55000 }, { id: 'rent', weight: 50000 }]);
  assert.equal(result.report.ownerCostsCents + result.report.tenantCostsCents, 50000);
});
