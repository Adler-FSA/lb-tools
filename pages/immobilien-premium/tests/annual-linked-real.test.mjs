/** Real production runner: linked heating, direct maintenance and original invoices. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { previewAnnualPeriod } from '../assets/js/year-workflow-runner.js';

function fixture() {
  const p = createEmptyProject('linked_2026');
  p.properties.push({ id: 'house' });
  for (const [id, area, kind, tenancyId] of [
    ['A', 12000, 'owner', null], ['B', 8000, 'tenant', 'leaseB']
  ]) {
    p.units.push({ id, propertyId: 'house',
      areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: area }] });
    p.usagePeriods.push({ id: `use${id}`, unitId: id, kind, tenancyId,
      startDate: '2026-01-01', endDate: null });
  }
  p.tenancies.push({ id: 'leaseB', unitId: 'B', startDate: '2026-01-01', endDate: null });
  p.contractTerms.push({ id: 'termsB', tenancyId: 'leaseB', startDate: '2026-01-01',
    endDate: null, operatingCostsModel: 'advance', advanceCents: 10000,
    allowedCostTypes: ['heating', 'hot_water'] });
  p.accountingPeriods.push({ id: 'year', propertyId: 'house',
    startDate: '2026-01-01', endDate: '2026-12-31', confirmedTenancyIds: ['leaseB'] });
  p.expenses.push({ id: 'tax', propertyId: 'house', category: 'property_tax',
    classification: 'owner', amountCents: 10000, startDate: '2026-01-01',
    endDate: '2026-12-31', invoiceReference: 'invTax', invoiceLineId: 'original' });
  p.expenses.push({ id: 'shared', propertyId: 'house', category: 'thermal_shared',
    classification: 'allocatable', confirmedForAllocation: true, amountCents: 180000,
    startDate: '2026-01-01', endDate: '2026-12-31',
    invoiceReference: 'invHeat', invoiceLineId: 'original' });
  for (const [id, unitId, service, first, last] of [
    ['heatA', 'A', 'heating', 100, 400], ['heatB', 'B', 'heating', 20, 120],
    ['waterA', 'A', 'hot_water', 1, 11], ['waterB', 'B', 'hot_water', 4, 34]
  ]) {
    p.meters.push({ id, propertyId: 'house', unitId, service,
      installedAt: '2025-01-01', measurementKind: service === 'heating'
        ? 'heat_energy' : 'hot_water_volume',
      measurementUnit: service === 'heating' ? 'kWh' : 'm3' });
    p.readings.push({ id: `${id}_start`, meterId: id,
      date: '2026-01-01', value: first, readingType: 'measured' },
    { id: `${id}_end`, meterId: id, date: '2026-12-31', value: last,
      readingType: 'measured' });
  }
  p.cashflows.push({ id: 'paid', kind: 'tenant_payment', tenancyId: 'leaseB',
    accountingPeriodId: 'year', purpose: 'operating_cost_advance',
    amountCents: 70000, date: '2026-12-20' });
  const plans = {
    linked: {
      system: 'linked', plantType: 'gas_boiler', scopeConfirmed: true,
      invoiceInventoryConfirmed: true, co2ExcludedConfirmed: true,
      sharedExpenseIds: ['shared'], heatingOnlyExpenseIds: [],
      hotWaterOnlyExpenseIds: [], co2ExpenseIds: [],
      invoiceTotalsCentsByReference: { invHeat: 180000 },
      basis: { kind: 'fuel_energy', unit: 'milli_kWh',
        totalMilliKWh: 3000, hotWaterMilliKWh: 1000,
        totalEvidenceRef: 'totalMeter', hotWaterEvidenceRef: 'hotWaterMeter',
        samePhysicalBasisConfirmed: true, methodReviewed: true }
    },
    thermal: {
      system: 'separate', scopeConfirmed: true, costBasisConfirmed: true,
      co2CostsSeparateConfirmed: true, exceptionStatus: 'reviewed_standard',
      groupPreallocationRequired: false, linkedTransferConfirmed: true,
      streams: [
        { kind: 'heating', expenseIds: [], consumptionPercent: 70,
          mandatory70Applies: true, rateConfirmed: true, readingsConfirmed: true,
          measurementBasisConfirmed: true, measurementKind: 'heat_energy',
          canonicalUnit: 'kWh', meterIdsByUnit: { A: ['heatA'], B: ['heatB'] } },
        { kind: 'hot_water', expenseIds: [], consumptionPercent: 60,
          mandatory70Applies: false, rateConfirmed: true, readingsConfirmed: true,
          measurementBasisConfirmed: true, measurementKind: 'hot_water_volume',
          canonicalUnit: 'm3', meterIdsByUnit: { A: ['waterA'], B: ['waterB'] } }
      ]
    }
  };
  return { p, plans };
}

test('real linked annual runner counts shared invoice exactly once and reconciles tenants', () => {
  const { p, plans } = fixture();
  const before = JSON.stringify({ p, plans });
  const result = previewAnnualPeriod(p, 'year', plans);
  assert.equal(result.status, 'preview', JSON.stringify(result.issues));
  assert.deepEqual(result.report.originalExpenseIds, ['shared', 'tax']);
  assert.equal(result.report.originalCostsCents, 190000);
  assert.equal(result.report.ownerCostsCents, 118000);
  assert.equal(result.report.tenantCostsCents, 72000);
  assert.equal(result.report.tenants[0].advancesActuallyPaidCents, 70000);
  assert.equal(result.report.tenants[0].additionalCents, 2000);
  assert.equal(result.report.legalRelease, false);
  assert.equal(result.report.combinedForPosting, false);
  assert.equal(result.report.pdfGenerated, false);
  assert.equal(JSON.stringify({ p, plans }), before);
});

test('real linked annual runner accepts separately evidenced heating maintenance', () => {
  const { p, plans } = fixture();
  p.expenses.push({ id: 'maintenance', propertyId: 'house', category: 'heating',
    classification: 'allocatable', confirmedForAllocation: true,
    amountCents: 6000, startDate: '2026-01-01', endDate: '2026-12-31',
    invoiceReference: 'invMaintenance', invoiceLineId: 'original' });
  plans.linked.heatingOnlyExpenseIds = ['maintenance'];
  plans.linked.invoiceTotalsCentsByReference.invMaintenance = 6000;
  const result = previewAnnualPeriod(p, 'year', plans);
  assert.equal(result.status, 'preview', JSON.stringify(result.issues));
  assert.deepEqual(result.report.originalExpenseIds, ['maintenance', 'shared', 'tax']);
  assert.equal(result.report.originalCostsCents, 196000);
  assert.equal(result.report.ownerCostsCents + result.report.tenantCostsCents, 196000);
});

test('real linked runner blocks unassigned maintenance and duplicate original invoice lines', () => {
  const { p, plans } = fixture();
  p.expenses.push({ id: 'maintenance', propertyId: 'house', category: 'heating',
    classification: 'allocatable', confirmedForAllocation: true, amountCents: 6000,
    startDate: '2026-01-01', endDate: '2026-12-31',
    invoiceReference: 'invMaintenance', invoiceLineId: 'original' });
  let result = previewAnnualPeriod(p, 'year', plans);
  assert.equal(result.status, 'blocked');
  assert.equal(result.report, null);
  plans.linked.heatingOnlyExpenseIds = ['maintenance'];
  plans.linked.invoiceTotalsCentsByReference.invMaintenance = 6000;
  p.expenses.at(-1).invoiceReference = 'invHeat';
  result = previewAnnualPeriod(p, 'year', plans);
  assert.equal(result.status, 'blocked');
  assert.equal(result.report, null);
});

test('real linked runner blocks unconfirmed intermediate metering', () => {
  const { p, plans } = fixture();
  plans.thermal.streams[1].readingsConfirmed = false;
  const result = previewAnnualPeriod(p, 'year', plans);
  assert.equal(result.status, 'blocked');
  assert.equal(result.report, null);
});
