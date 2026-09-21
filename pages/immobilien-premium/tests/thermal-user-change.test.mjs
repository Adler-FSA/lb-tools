import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { calculateThermalPeriod } from '../assets/js/thermal.js';

function sample({ vacancy = false } = {}) {
  const p = createEmptyProject('thermal_switch_2026');
  p.properties.push({ id: 'house', label: 'Testhaus mit zwei Wohnungen' });
  p.units.push({ id: 'A', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 12000 }] },
    { id: 'B', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }] });
  p.usagePeriods.push({ id: 'ownerA', unitId: 'A', kind: 'owner', startDate: '2026-01-01', endDate: null },
    { id: 'first', unitId: 'B', kind: 'tenant', tenancyId: 'lease1', startDate: '2026-01-01', endDate: vacancy ? '2026-04-30' : '2026-06-30' },
    ...(vacancy ? [{ id: 'empty', unitId: 'B', kind: 'vacant', startDate: '2026-05-01', endDate: '2026-06-30' }] : []),
    { id: 'second', unitId: 'B', kind: 'tenant', tenancyId: 'lease2', startDate: '2026-07-01', endDate: null });
  p.tenancies.push({ id: 'lease1', unitId: 'B', startDate: '2026-01-01', endDate: vacancy ? '2026-04-30' : '2026-06-30' },
    { id: 'lease2', unitId: 'B', startDate: '2026-07-01', endDate: null });
  p.contractTerms.push({ id: 'term1', tenancyId: 'lease1', startDate: '2026-01-01', endDate: vacancy ? '2026-04-30' : '2026-06-30',
    operatingCostsModel: 'advance', allowedCostTypes: ['heating', 'hot_water'] },
    { id: 'term2', tenancyId: 'lease2', startDate: '2026-07-01', endDate: null,
      operatingCostsModel: 'advance', allowedCostTypes: ['heating', 'hot_water'] });
  p.accountingPeriods.push({ id: 'year2026', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31' });
  for (const [kind, cost] of [['heating', 120000], ['hot_water', 60000]]) {
    p.expenses.push({ id: `expense_${kind}`, propertyId: 'house', category: kind, amountCents: cost,
      classification: 'allocatable', confirmedForAllocation: true,
      startDate: '2026-01-01', endDate: '2026-12-31' });
  }
  for (const [id, unitId, service, start, mid, end, optional] of [
    ['heatA', 'A', 'heating', 100, null, 400],
    ['heatB', 'B', 'heating', 20, 60, 120, vacancy ? 40 : null],
    ['hotA', 'A', 'hot_water', 1, null, 11],
    ['hotB', 'B', 'hot_water', 4, 14, 34, vacancy ? 9 : null]
  ]) {
    p.meters.push({ id, unitId, propertyId: 'house', service, installedAt: '2025-01-01',
      measurementKind: service === 'heating' ? 'heat_energy' : 'hot_water_volume',
      measurementUnit: service === 'heating' ? 'kWh' : 'm3' });
    for (const [suffix, date, value] of [
      ['start', '2026-01-01', start],
      ...(vacancy && unitId === 'B' ? [['empty', '2026-05-01', optional]] : []),
      ...(mid !== null ? [['mid', '2026-07-01', mid]] : []),
      ['end', '2026-12-31', end]
    ]) p.readings.push({ id: `${id}_${suffix}`, meterId: id, date, value, readingType: 'measured' });
  }
  const plan = { system: 'separate', scopeConfirmed: true, costBasisConfirmed: true,
    co2CostsSeparateConfirmed: true, exceptionStatus: 'reviewed_standard', groupPreallocationRequired: false,
    streams: [
      { kind: 'heating', expenseIds: ['expense_heating'], consumptionPercent: 70, mandatory70Applies: true,
        rateConfirmed: true, readingsConfirmed: true, measurementBasisConfirmed: true,
        measurementKind: 'heat_energy', canonicalUnit: 'kWh', meterIdsByUnit: { A: ['heatA'], B: ['heatB'] },
        userChange: { confirmed: true, consumptionMethod: 'intermediate_reading', baseMethod: 'days' } },
      { kind: 'hot_water', expenseIds: ['expense_hot_water'], consumptionPercent: 60, mandatory70Applies: false,
        rateConfirmed: true, readingsConfirmed: true, measurementBasisConfirmed: true,
        measurementKind: 'hot_water_volume', canonicalUnit: 'm3', meterIdsByUnit: { A: ['hotA'], B: ['hotB'] },
        userChange: { confirmed: true, consumptionMethod: 'intermediate_reading', baseMethod: 'days' } }
    ] };
  return { p, plan };
}
function expectBlocked(p, plan, code) {
  const r = calculateThermalPeriod(p, 'year2026', plan);
  assert.equal(r.status, 'blocked', JSON.stringify(r));
  assert.equal(r.report, null);
  assert.ok(r.issues.some(x => x.code === code), `${code}: ${JSON.stringify(r.issues)}`);
}

test('MH-07: Mieterwechsel getrennt nach Zwischenablesung und bestätigtem Wärme-Grundkostenmaßstab', () => {
  const { p, plan } = sample();
  const frozen = JSON.stringify({ p, plan });
  const r = calculateThermalPeriod(p, 'year2026', plan);
  assert.equal(r.status, 'calculated', JSON.stringify(r.issues));
  assert.equal(r.report.totalCostsCents, 180000);
  assert.equal(r.report.ownerCostsCents, 108000);
  assert.equal(r.report.tenants.length, 2);
  assert.equal(r.report.tenants.reduce((n, x) => n + x.costsCents, 0), 72000);
  const heating = r.report.streams.find(s => s.kind === 'heating').lines[0];
  const firstHeat = heating.unitShares.find(x => x.tenancyId === 'lease1');
  const secondHeat = heating.unitShares.find(x => x.tenancyId === 'lease2');
  assert.equal(firstHeat.baseCents, 7141);
  assert.equal(firstHeat.consumptionCents, 8400);
  assert.equal(secondHeat.baseCents, 7259);
  assert.equal(secondHeat.consumptionCents, 12600);
  assert.equal(firstHeat.consumptionWeight, 40000);
  assert.equal(secondHeat.consumptionWeight, 60000);
  const hot = r.report.streams.find(s => s.kind === 'hot_water').lines[0];
  assert.equal(hot.unitShares.find(x => x.tenancyId === 'lease1').consumptionCents, 9000);
  assert.equal(hot.unitShares.find(x => x.tenancyId === 'lease2').consumptionCents, 18000);
  assert.equal(r.report.combinedWithOtherCosts, false);
  assert.equal(r.report.legalRelease, false);
  assert.equal(JSON.stringify({ p, plan }), frozen);
});

test('Nutzerwechsel ist pro Wärmeart gesondert zu bestätigen; Kaltwasserfreigabe genügt nicht', () => {
  const { p, plan } = sample();
  delete plan.streams[0].userChange;
  expectBlocked(p, plan, 'THERMAL_USER_CHANGE_UNCONFIRMED');
  plan.streams[0].userChange = { confirmed: true, consumptionMethod: 'days', baseMethod: 'days' };
  expectBlocked(p, plan, 'THERMAL_USER_CHANGE_UNCONFIRMED');
  plan.streams[0].userChange.consumptionMethod = 'intermediate_reading';
  plan.streams[1].userChange.confirmed = false;
  expectBlocked(p, plan, 'THERMAL_USER_CHANGE_UNCONFIRMED');
});

test('Fehlende und doppelte Heiz-/Warmwasser-Zwischenablesungen führen zur Sperre', () => {
  const { p, plan } = sample();
  p.readings = p.readings.filter(x => x.id !== 'heatB_mid');
  expectBlocked(p, plan, 'METER_INTERMEDIATE_READING_REQUIRED');
  p.readings.push({ id: 'heatB_mid', meterId: 'heatB', date: '2026-07-01', value: 60, readingType: 'measured' },
    { id: 'heatB_mid_duplicate', meterId: 'heatB', date: '2026-07-01', value: 60, readingType: 'measured' });
  expectBlocked(p, plan, 'METER_READING_DUPLICATE');
});

test('Warmwasser-Grundkosten: Gradtagszahlen sind kein zulässiger bestätigter Zeitmaßstab', () => {
  const { p, plan } = sample();
  plan.streams[1].userChange.baseMethod = 'degree_days';
  expectBlocked(p, plan, 'THERMAL_USER_CHANGE_UNCONFIRMED');
});

test('Heizungsgrundkosten: Gradtaggewichte nur mit Nachweis und vollständiger Erfassung', () => {
  const { p, plan } = sample();
  const change = plan.streams[0].userChange;
  change.baseMethod = 'degree_days';
  expectBlocked(p, plan, 'THERMAL_DEGREE_DAYS_REQUIRED');
  change.degreeDayWeightsBySegmentId = {
    first: { weight: 300, confirmed: true, referenceId: 'DIN-Nachweis-Abschnitt-1' },
    second: { weight: 700, confirmed: true, referenceId: 'DIN-Nachweis-Abschnitt-2' }
  };
  const r = calculateThermalPeriod(p, 'year2026', plan);
  assert.equal(r.status, 'calculated', JSON.stringify(r.issues));
  const shares = r.report.streams[0].lines[0].unitShares;
  assert.equal(shares.find(x => x.tenancyId === 'lease1').baseCents, 4320);
  assert.equal(shares.find(x => x.tenancyId === 'lease2').baseCents, 10080);
  change.degreeDayWeightsBySegmentId.second.referenceId = '';
  expectBlocked(p, plan, 'THERMAL_DEGREE_DAYS_UNCONFIRMED');
  change.degreeDayWeightsBySegmentId.second.referenceId = 'Nachweis';
  change.degreeDayWeightsBySegmentId.third = { weight: 1, confirmed: true, referenceId: 'zusatz' };
  expectBlocked(p, plan, 'THERMAL_DEGREE_DAYS_REQUIRED');
});

test('Leerstand zwischen zwei Mietverhältnissen ist Eigentümerkosten, keine Umverteilung', () => {
  const { p, plan } = sample({ vacancy: true });
  const r = calculateThermalPeriod(p, 'year2026', plan);
  assert.equal(r.status, 'calculated', JSON.stringify(r.issues));
  const vacant = r.report.streams.flatMap(s => s.lines.flatMap(l => l.unitShares))
    .filter(s => s.kind === 'vacant');
  assert.equal(vacant.length, 2);
  assert.ok(vacant.every(x => x.cents > 0));
  assert.equal(r.report.ownerCostsCents + r.report.tenants.reduce((a, b) => a + b.costsCents, 0), 180000);
  assert.equal(r.report.tenants.length, 2);
});

test('Vertragsnachweis für Nachmieter muss die tatsächliche Nutzungsdauer umfassen', () => {
  const { p, plan } = sample();
  p.contractTerms[1].startDate = '2026-08-01';
  expectBlocked(p, plan, 'THERMAL_CONTRACT_UNCONFIRMED');
  p.contractTerms[1].startDate = '2026-07-01';
  p.contractTerms[1].allowedCostTypes = ['hot_water'];
  expectBlocked(p, plan, 'THERMAL_CONTRACT_UNCONFIRMED');
});

test('Beschädigte oder nicht lückenlose Nutzungsdaten werden nicht still ergänzt', () => {
  const { p, plan } = sample();
  p.usagePeriods[2].startDate = '2026-07-02';
  expectBlocked(p, plan, 'USAGE_GAP');
});

test('Messwerte eines Nutzerabschnitts mit 0 Einheiten bleiben 0, wenn keine Verbrauchskosten darauf entfallen', () => {
  const { p, plan } = sample();
  p.readings.find(x => x.id === 'heatB_mid').value = 20;
  p.readings.find(x => x.id === 'hotB_mid').value = 4;
  const r = calculateThermalPeriod(p, 'year2026', plan);
  assert.equal(r.status, 'calculated', JSON.stringify(r.issues));
  const before = r.report.streams[0].lines[0].unitShares.find(x => x.tenancyId === 'lease1');
  assert.equal(before.consumptionCents, 0);
  assert.ok(before.baseCents > 0);
});

test('Fehlende bestätigte Gradtaggewichte für einen dritten Nutzer blockieren', () => {
  const { p, plan } = sample({ vacancy: true });
  plan.streams[0].userChange.baseMethod = 'degree_days';
  plan.streams[0].userChange.degreeDayWeightsBySegmentId = {
    first: { weight: 300, confirmed: true, referenceId: 'Nachweis' },
    second: { weight: 600, confirmed: true, referenceId: 'Nachweis' }
  };
  expectBlocked(p, plan, 'THERMAL_DEGREE_DAYS_REQUIRED');
});
