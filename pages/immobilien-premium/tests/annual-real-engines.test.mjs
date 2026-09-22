/**
 * Full engine smoke test. Executes the real production entrypoint; no injected
 * fake calculators. Intentionally restricts scope to a supported no-CO2 case.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { previewAnnualPeriod } from '../assets/js/year-workflow-runner.js';

function fixture() {
  const p = createEmptyProject('real_annual_2026');
  p.properties.push({ id: 'house', label: 'Fiktives Zweifamilienhaus' });
  p.units.push(
    { id: 'unitA', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 12000 }] },
    { id: 'unitB', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }] }
  );
  p.usagePeriods.push(
    { id: 'ownerA', unitId: 'unitA', kind: 'owner', startDate: '2026-01-01', endDate: null },
    { id: 'tenantB', unitId: 'unitB', kind: 'tenant', tenancyId: 'leaseB', startDate: '2026-01-01', endDate: null }
  );
  p.tenancies.push({ id: 'leaseB', unitId: 'unitB', startDate: '2026-01-01', endDate: null });
  p.contractTerms.push({ id: 'termsB', tenancyId: 'leaseB', startDate: '2026-01-01', endDate: null,
    operatingCostsModel: 'advance', advanceCents: 10000,
    allowedCostTypes: ['property_tax', 'heating', 'hot_water'] });
  p.accountingPeriods.push({ id: 'year', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31',
    confirmedTenancyIds: ['leaseB'] });
  for (const [id, category, amountCents, classification] of [
    ['tax', 'property_tax', 10000, 'owner'],
    ['heat', 'heating', 120000, 'allocatable'],
    ['water', 'hot_water', 60000, 'allocatable']
  ]) p.expenses.push({ id, category, propertyId: 'house', amountCents, classification,
    ...(classification === 'allocatable' ? { confirmedForAllocation: true } : {}),
    invoiceReference: `invoice_${id}`, invoiceLineId: 'original',
    startDate: '2026-01-01', endDate: '2026-12-31' });
  for (const [id, unitId, service, begin, finish] of [
    ['heatA', 'unitA', 'heating', 100, 400], ['heatB', 'unitB', 'heating', 20, 120],
    ['waterA', 'unitA', 'hot_water', 1, 11], ['waterB', 'unitB', 'hot_water', 4, 34]
  ]) {
    p.meters.push({ id, propertyId: 'house', unitId, service, installedAt: '2025-01-01',
      measurementKind: service === 'heating' ? 'heat_energy' : 'hot_water_volume',
      measurementUnit: service === 'heating' ? 'kWh' : 'm3' });
    p.readings.push({ id: `${id}_begin`, meterId: id, date: '2026-01-01', value: begin,
      readingType: 'measured' },
    { id: `${id}_finish`, meterId: id, date: '2026-12-31', value: finish,
      readingType: 'measured' });
  }
  p.cashflows.push({ id: 'actuallyPaid', kind: 'tenant_payment', tenancyId: 'leaseB',
    accountingPeriodId: 'year', purpose: 'operating_cost_advance', amountCents: 70000,
    date: '2026-12-20' });
  const plans = { thermal: {
    system: 'separate', scopeConfirmed: true, costBasisConfirmed: true,
    co2CostsSeparateConfirmed: true, exceptionStatus: 'reviewed_standard',
    groupPreallocationRequired: false,
    streams: [
      { kind: 'heating', expenseIds: ['heat'], consumptionPercent: 70,
        mandatory70Applies: true, rateConfirmed: true, readingsConfirmed: true,
        measurementBasisConfirmed: true, measurementKind: 'heat_energy', canonicalUnit: 'kWh',
        meterIdsByUnit: { unitA: ['heatA'], unitB: ['heatB'] } },
      { kind: 'hot_water', expenseIds: ['water'], consumptionPercent: 60,
        mandatory70Applies: false, rateConfirmed: true, readingsConfirmed: true,
        measurementBasisConfirmed: true, measurementKind: 'hot_water_volume', canonicalUnit: 'm3',
        meterIdsByUnit: { unitA: ['waterA'], unitB: ['waterB'] } }
    ] }
  };
  return { p, plans };
}

test('MH-01/MH-07: genuine annual runner reconciles owner and tenant without duplicate heat invoices', () => {
  const { p, plans } = fixture();
  const before = JSON.stringify({ p, plans });
  const result = previewAnnualPeriod(p, 'year', plans);
  assert.equal(result.status, 'preview', JSON.stringify(result.issues));
  assert.equal(result.report.originalCostsCents, 190000);
  assert.deepEqual(result.report.originalExpenseIds, ['heat', 'tax', 'water']);
  assert.equal(result.report.ownerCostsCents, 118000);
  assert.equal(result.report.tenantCostsCents, 72000);
  assert.deepEqual(result.report.tenants.map(t => [t.tenancyId, t.costsCents,
    t.advancesActuallyPaidCents, t.additionalCents]), [['leaseB', 72000, 70000, 2000]]);
  assert.equal(result.report.combinedForPosting, false);
  assert.equal(result.report.legalRelease, false);
  assert.equal(result.report.pdfGenerated, false);
  assert.equal(JSON.stringify({ p, plans }), before);
});

test('unknown follow-up year is blocked, original prior year stays untouched', () => {
  const { p, plans } = fixture();
  p.accountingPeriods.push({ id: 'next', propertyId: 'house', startDate: '2027-01-01',
    endDate: '2027-12-31', reviewRequired: true });
  const before = JSON.stringify(p);
  const result = previewAnnualPeriod(p, 'next', plans);
  assert.equal(result.status, 'blocked');
  assert.equal(result.report, null);
  assert.equal(JSON.stringify(p), before);
});

test('missing thermal cost source or unconfirmed measurement never produces a final preview', () => {
  const { p, plans } = fixture();
  plans.thermal.streams[0].expenseIds = ['missing'];
  let result = previewAnnualPeriod(p, 'year', plans);
  assert.equal(result.status, 'blocked');
  assert.equal(result.report, null);
  plans.thermal.streams[0].expenseIds = ['heat'];
  plans.thermal.streams[0].readingsConfirmed = false;
  result = previewAnnualPeriod(p, 'year', plans);
  assert.equal(result.status, 'blocked');
  assert.equal(result.report, null);
});
