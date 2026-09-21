import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { calculateThermalPeriod } from '../assets/js/thermal.js';

function fixture() {
  const p = createEmptyProject('thermal_sample');
  p.properties.push({ id: 'house', label: 'Fiktives Testhaus' });
  p.units.push({ id: 'A', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 12000 }] },
    { id: 'B', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }] });
  p.usagePeriods.push({ id: 'ownerA', unitId: 'A', kind: 'owner', startDate: '2026-01-01', endDate: null },
    { id: 'tenantB', unitId: 'B', kind: 'tenant', tenancyId: 'leaseB', startDate: '2026-01-01', endDate: null });
  p.tenancies.push({ id: 'leaseB', unitId: 'B', startDate: '2026-01-01', endDate: null });
  p.contractTerms.push({ id: 'termB', tenancyId: 'leaseB', startDate: '2026-01-01', endDate: null,
    operatingCostsModel: 'advance', allowedCostTypes: ['heating', 'hot_water'] });
  p.accountingPeriods.push({ id: 'year2026', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31' });
  for (const [kind, amountCents] of [['heating', 120000], ['hot_water', 60000]]) {
    p.expenses.push({ id: `expense_${kind}`, propertyId: 'house', category: kind, amountCents,
      classification: 'allocatable', confirmedForAllocation: true,
      startDate: '2026-01-01', endDate: '2026-12-31' });
  }
  for (const [id, unitId, service, start, end] of [
    ['heatA', 'A', 'heating', 100, 400], ['heatB', 'B', 'heating', 20, 120],
    ['hotA', 'A', 'hot_water', 1, 11], ['hotB', 'B', 'hot_water', 4, 34]
  ]) {
    p.meters.push({ id, unitId, propertyId: 'house', service, installedAt: '2025-01-01' });
    p.readings.push({ id: `${id}_start`, meterId: id, date: '2026-01-01', value: start, readingType: 'measured' },
      { id: `${id}_end`, meterId: id, date: '2026-12-31', value: end, readingType: 'measured' });
  }
  const plan = { system: 'separate', scopeConfirmed: true, costBasisConfirmed: true,
    co2CostsSeparateConfirmed: true, exceptionStatus: 'reviewed_standard', groupPreallocationRequired: false,
    streams: [
      { kind: 'heating', expenseIds: ['expense_heating'], consumptionPercent: 70, mandatory70Applies: true,
        rateConfirmed: true, readingsConfirmed: true, meterIdsByUnit: { A: ['heatA'], B: ['heatB'] } },
      { kind: 'hot_water', expenseIds: ['expense_hot_water'], consumptionPercent: 60, mandatory70Applies: false,
        rateConfirmed: true, readingsConfirmed: true, meterIdsByUnit: { A: ['hotA'], B: ['hotB'] } }
    ] };
  return { p, plan };
}
function expectsBlock(p, plan, code) {
  const result = calculateThermalPeriod(p, 'year2026', plan);
  assert.equal(result.status, 'blocked', JSON.stringify(result));
  assert.equal(result.report, null);
  assert.ok(result.issues.some(i => i.code === code), `${code}: ${JSON.stringify(result.issues)}`);
}

test('MH-07: separate Heizung und Warmwasser centgenau und ohne PDF-/Rechtsfreigabe', () => {
  const { p, plan } = fixture();
  const original = JSON.stringify(p);
  const actual = calculateThermalPeriod(p, 'year2026', plan);
  assert.equal(actual.status, 'calculated', JSON.stringify(actual.issues));
  assert.equal(actual.report.totalCostsCents, 180000);
  assert.equal(actual.report.ownerCostsCents, 108000);
  assert.deepEqual(actual.report.tenants, [{ tenancyId: 'leaseB', costsCents: 72000 }]);
  assert.equal(actual.report.streams[0].totalCents, 120000);
  assert.equal(actual.report.streams[0].lines[0].baseCents, 36000);
  assert.equal(actual.report.streams[0].lines[0].consumptionCents, 84000);
  assert.equal(actual.report.streams[1].totalCents, 60000);
  assert.equal(actual.report.scope, 'thermal_subreport_only');
  assert.equal(actual.report.combinedWithOtherCosts, false);
  assert.equal(actual.report.co2Calculated, false);
  assert.equal(actual.report.legalRelease, false);
  assert.equal(actual.report.pdfGenerated, false);
  assert.equal(JSON.stringify(p), original);
});

test('Einzel-Heizsystem nur mit explizit bestätigtem fehlendem Warmwasser-Dienst', () => {
  const { p, plan } = fixture();
  p.expenses.pop();
  plan.streams.pop();
  expectsBlock(p, plan, 'THERMAL_SERVICE_MISSING');
  plan.absentServicesConfirmed = true; plan.absentServices = ['hot_water'];
  assert.equal(calculateThermalPeriod(p, 'year2026', plan).report.totalCostsCents, 120000);
});

test('Weder kombinierte Heiz-/Warmwasserkosten noch unklare CO₂-Basis durchwinken', () => {
  const { p, plan } = fixture();
  plan.system = 'combined'; expectsBlock(p, plan, 'THERMAL_SCOPE_UNCONFIRMED');
  plan.system = 'separate'; plan.co2CostsSeparateConfirmed = false; expectsBlock(p, plan, 'THERMAL_SCOPE_UNCONFIRMED');
});

test('Ungeklärte Ausnahmen oder Gruppen-Vorverteilung bleiben gesperrt', () => {
  const { p, plan } = fixture();
  plan.exceptionStatus = 'unknown'; expectsBlock(p, plan, 'THERMAL_SCOPE_UNCONFIRMED');
  plan.exceptionStatus = 'reviewed_standard'; plan.groupPreallocationRequired = true;
  expectsBlock(p, plan, 'THERMAL_SCOPE_UNCONFIRMED');
});

test('Heizung mit festgestellter 70-Prozent-Anforderung darf nicht 60 verwenden', () => {
  const { p, plan } = fixture(); plan.streams[0].consumptionPercent = 60;
  expectsBlock(p, plan, 'THERMAL_RATE_INVALID');
});

test('Nicht bestätigte, zu niedrige und zu hohe Quoten werden abgewiesen', () => {
  const { p, plan } = fixture();
  for (const pct of [49, 71, 55.5]) { plan.streams[1].consumptionPercent = pct; expectsBlock(p, plan, 'THERMAL_RATE_INVALID'); }
  plan.streams[1].consumptionPercent = 60; plan.streams[1].rateConfirmed = false;
  expectsBlock(p, plan, 'THERMAL_RATE_INVALID');
});

test('Verwechslung oder Doppelnutzung der Heiz- und Warmwasserzähler wird abgewiesen', () => {
  const { p, plan } = fixture(); plan.streams[1].meterIdsByUnit.A = ['heatA'];
  expectsBlock(p, plan, 'THERMAL_METER_SERVICE_INVALID');
});

test('Fehlende Messwertbestätigung oder fehlender Zähler sperrt', () => {
  const { p, plan } = fixture(); plan.streams[0].readingsConfirmed = false;
  expectsBlock(p, plan, 'THERMAL_METER_MAPPING_INVALID');
  plan.streams[0].readingsConfirmed = true; p.readings = p.readings.filter(r => r.id !== 'heatB_end');
  expectsBlock(p, plan, 'METER_READING_REQUIRED');
});

test('Schätzwerte, rückläufige Werte und zusätzliche widersprüchliche Messwerte sperren', () => {
  const { p, plan } = fixture(); p.readings[0].readingType = 'estimated';
  expectsBlock(p, plan, 'METER_READING_NOT_MEASURED');
  p.readings[0].readingType = 'measured'; p.readings[1].value = 2;
  expectsBlock(p, plan, 'METER_READING_NON_MONOTONIC');
  p.readings[1].value = 400; p.readings.push({ id: 'duplicate', meterId: 'heatA', date: '2026-12-31', value: 400 });
  expectsBlock(p, plan, 'METER_READING_DUPLICATE');
});

test('Kosten dürfen nicht doppelt, falsch klassifiziert oder unbestätigt sein', () => {
  const { p, plan } = fixture();
  plan.streams[1].expenseIds = ['expense_heating']; expectsBlock(p, plan, 'THERMAL_EXPENSE_INVALID');
  plan.streams[1].expenseIds = ['expense_hot_water']; p.expenses[1].confirmedForAllocation = false;
  expectsBlock(p, plan, 'THERMAL_EXPENSE_INVALID');
});

test('Nicht erfasste Kosten, Heizöl und CO₂ blockieren statt still zu verschwinden', () => {
  const { p, plan } = fixture(); p.expenses.push({ id: 'moreHeat', propertyId: 'house', category: 'heating', amountCents: 1000,
    classification: 'allocatable', confirmedForAllocation: true, startDate: '2026-01-01', endDate: '2026-12-31' });
  expectsBlock(p, plan, 'THERMAL_EXPENSE_UNASSIGNED');
  p.expenses.pop(); p.expenses.push({ id: 'co2', propertyId: 'house', category: 'co2', amountCents: 2000,
    classification: 'allocatable', confirmedForAllocation: true, startDate: '2026-01-01', endDate: '2026-12-31' });
  expectsBlock(p, plan, 'THERMAL_SPECIAL_COST_UNSUPPORTED');
  p.expenses.pop(); p.expenses.push({ id: 'oil', propertyId: 'house', category: 'heating_oil', amountCents: 2000,
    classification: 'allocatable', confirmedForAllocation: true, startDate: '2026-01-01', endDate: '2026-12-31' });
  expectsBlock(p, plan, 'THERMAL_SPECIAL_COST_UNSUPPORTED');
});

test('Nutzerwechsel darf nicht über Kaltwasser-Tagesverteilung abgerechnet werden', () => {
  const { p, plan } = fixture(); p.usagePeriods[1].endDate = '2026-06-30';
  p.usagePeriods.push({ id: 'vacancy', unitId: 'B', kind: 'vacant', startDate: '2026-07-01', endDate: null });
  expectsBlock(p, plan, 'THERMAL_USER_CHANGE_UNSUPPORTED');
});

test('Änderung und Lücke in Flächen-/Vertragslaufzeit sperren', () => {
  const { p, plan } = fixture(); p.units[0].areaHistory[0].to = '2026-06-30';
  p.units[0].areaHistory.push({ from: '2026-07-01', to: null, hundredthsM2: 11900 });
  expectsBlock(p, plan, 'THERMAL_AREA_UNSUPPORTED');
  p.units[0].areaHistory = [{ from: '2026-01-01', to: null, hundredthsM2: 12000 }];
  p.contractTerms[0].endDate = '2026-06-30';
  expectsBlock(p, plan, 'THERMAL_CONTRACT_UNCONFIRMED');
});

test('Vertragskostenarten müssen pro Leistung ausdrücklich erlaubt sein', () => {
  const { p, plan } = fixture(); p.contractTerms[0].allowedCostTypes = ['heating'];
  expectsBlock(p, plan, 'THERMAL_CONTRACT_UNCONFIRMED');
});

test('Rundung jeder Rechnung stimmt exakt und verändert keine Beträge', () => {
  const { p, plan } = fixture(); p.expenses[0].amountCents = 101;
  p.expenses[1].amountCents = 101;
  const result = calculateThermalPeriod(p, 'year2026', plan);
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.equal(result.report.totalCostsCents, 202);
  for (const stream of result.report.streams) for (const line of stream.lines) {
    assert.equal(line.baseCents + line.consumptionCents, line.amountCents);
    assert.equal(line.unitShares.reduce((n, share) => n + share.cents, 0), line.amountCents);
  }
});

test('Fehlende Periode und defektes Projekt produzieren keinen Teilbericht', () => {
  const { p, plan } = fixture();
  const noPeriod = calculateThermalPeriod(p, 'unknown', plan);
  assert.equal(noPeriod.status, 'blocked');
  assert.ok(noPeriod.issues.some(i => i.code === 'THERMAL_PERIOD_REQUIRED'));
  delete p.units;
  const malformed = calculateThermalPeriod(p, 'year2026', plan);
  assert.equal(malformed.status, 'blocked');
  assert.equal(malformed.report, null);
});
