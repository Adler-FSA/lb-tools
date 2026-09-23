import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import {
  SupplyManagementError, addSupplyPriceVersion, confirmSupplyRecord,
  createSupplyDraft, previewSupplyPlan
} from '../assets/js/supply-management.js';

function baseProject() {
  const p = createEmptyProject('supply_manage');
  p.properties.push({ id: 'house' });
  p.units.push({
    id: 'flat', propertyId: 'house',
    areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }]
  });
  p.usagePeriods.push({
    id: 'owner_use', unitId: 'flat', kind: 'owner',
    startDate: '2026-01-01', endDate: null
  });
  p.accountingPeriods.push({
    id: 'year2026', propertyId: 'house',
    startDate: '2026-01-01', endDate: '2026-12-31'
  });
  return p;
}

const fullVersion = {
  validFrom: '2026-01-01', validTo: '2026-12-31',
  referenceId: 'tariff_2026', baseCentsPerPeriod: 18000,
  plannedWholeUnits: 20000, workPriceNumeratorCents: 21,
  workPriceDenominatorUnits: 2, measurementUnit: 'kWh'
};

test('owner supply draft stores documented plan without creating invoice costs', () => {
  const p = baseProject();
  const r = createSupplyDraft(p, {
    recordId: 'gas_contract', propertyId: 'house', accountingPeriodId: 'year2026',
    providerAccountId: 'gas_supplier', providerLabel: 'Stadtwerke',
    service: 'gas', contractHolder: 'owner', priceVersion: fullVersion
  });
  assert.equal(p.supplyRegistry.length, 0);
  assert.equal(r.project.supplyRegistry.length, 1);
  assert.equal(r.project.supplyRegistry[0].confirmed, false);
  assert.equal(r.project.expenses.length, 0);
  const plan = previewSupplyPlan(r.project, 'gas_contract');
  assert.equal(plan.status, 'planning');
  assert.equal(plan.report.coverageComplete, true);
  assert.equal(plan.report.forecastCents, 228000);
  assert.equal(plan.report.planningOnly, true);
});

test('under-year price versions can be added only without overlap and confirm complete coverage', () => {
  const p = baseProject();
  let r = createSupplyDraft(p, {
    recordId: 'power_contract', propertyId: 'house', accountingPeriodId: 'year2026',
    providerAccountId: 'power_supplier', service: 'electricity', contractHolder: 'owner',
    priceVersion: {
      ...fullVersion, validTo: '2026-06-30', referenceId: 'h1',
      baseCentsPerPeriod: 9000, plannedWholeUnits: 10000
    }
  });
  assert.equal(previewSupplyPlan(r.project, 'power_contract').report.coverageComplete, false);
  assert.throws(() => confirmSupplyRecord(r.project, 'power_contract'),
    error => error instanceof SupplyManagementError && error.code === 'PRICE_HISTORY_INCOMPLETE');
  r = addSupplyPriceVersion(r.project, 'power_contract', {
    ...fullVersion, validFrom: '2026-07-01', referenceId: 'h2',
    baseCentsPerPeriod: 9500, plannedWholeUnits: 10500
  });
  const plan = previewSupplyPlan(r.project, 'power_contract');
  assert.equal(plan.report.coverageComplete, true);
  assert.equal(plan.report.parts.length, 2);

  assert.throws(() => addSupplyPriceVersion(r.project, 'power_contract', {
    ...fullVersion, validFrom: '2026-06-01', validTo: '2026-08-01', referenceId: 'overlap'
  }), error => error instanceof SupplyManagementError && error.code === 'PRICE_OVERLAP');
});

test('owner contract confirmation binds existing annual invoice and payments without duplicating them', () => {
  let p = baseProject();
  p.expenses.push({
    id: 'gas_invoice', propertyId: 'house', providerAccountId: 'gas_supplier',
    supplyManaged: true, category: 'heating', classification: 'allocatable',
    amountCents: 218000, startDate: '2026-01-01', endDate: '2026-12-31',
    invoiceReference: 'GAS2026', invoiceLineId: 'delivery'
  });
  p.cashflows.push({
    id: 'gas_paid', kind: 'provider_payment', propertyId: 'house',
    providerAccountId: 'gas_supplier', accountingPeriodId: 'year2026',
    amountCents: 240000, date: '2026-10-01'
  });
  p = createSupplyDraft(p, {
    recordId: 'gas_contract', propertyId: 'house', accountingPeriodId: 'year2026',
    providerAccountId: 'gas_supplier', service: 'gas', contractHolder: 'owner',
    priceVersion: fullVersion
  }).project;
  assert.deepEqual(p.supplyRegistry[0].contract.expenseIds, ['gas_invoice']);

  const beforeExpense = structuredClone(p.expenses);
  const beforeCashflow = structuredClone(p.cashflows);
  const r = confirmSupplyRecord(p, 'gas_contract');
  const record = r.project.supplyRegistry[0];
  assert.equal(record.confirmed, true);
  assert.equal(record.contract.confirmed, true);
  assert.deepEqual(record.contract.expenseIds, ['gas_invoice']);
  assert.deepEqual(record.contract.invoiceTotalsCentsByReference, { GAS2026: 218000 });
  assert.equal(r.review.status, 'reviewed');
  assert.equal(r.review.report.forecastCents, 228000);
  assert.equal(r.review.report.actualOwnerCostsCents, 218000);
  assert.equal(r.review.report.netProviderPaidCents, 240000);
  assert.deepEqual(r.project.expenses, beforeExpense);
  assert.deepEqual(r.project.cashflows, beforeCashflow);
});

test('owner contract cannot be confirmed without an actual annual invoice', () => {
  let p = baseProject();
  p = createSupplyDraft(p, {
    recordId: 'gas_contract', propertyId: 'house', accountingPeriodId: 'year2026',
    providerAccountId: 'gas_supplier', service: 'gas', contractHolder: 'owner',
    priceVersion: fullVersion
  }).project;
  assert.throws(() => confirmSupplyRecord(p, 'gas_contract'),
    error => error instanceof SupplyManagementError && error.code === 'INVOICE_REQUIRED');
});

test('tenant direct supply confirms only when no owner cost or payment uses that account', () => {
  let p = baseProject();
  p = createSupplyDraft(p, {
    recordId: 'direct_contract', propertyId: 'house', accountingPeriodId: 'year2026',
    providerAccountId: 'tenant_power', providerLabel: 'Direktversorger',
    service: 'electricity', contractHolder: 'tenant_direct', unitId: 'flat'
  }).project;
  let r = confirmSupplyRecord(p, 'direct_contract');
  assert.equal(r.review.status, 'reviewed');
  assert.equal(r.review.report.addedOwnerCostsCents, 0);
  assert.equal(r.project.supplyRegistry[0].contract.directSupplyConfirmed, true);

  p = baseProject();
  p.expenses.push({
    id: 'wrong_owner_cost', propertyId: 'house', providerAccountId: 'tenant_power',
    category: 'common_electricity', classification: 'allocatable',
    amountCents: 1000, startDate: '2026-01-01', endDate: '2026-12-31'
  });
  assert.throws(() => createSupplyDraft(p, {
    recordId: 'direct_contract', propertyId: 'house', accountingPeriodId: 'year2026',
    providerAccountId: 'tenant_power', service: 'electricity',
    contractHolder: 'tenant_direct', unitId: 'flat'
  }), error => error instanceof SupplyManagementError);
});


test('draft binding does not excuse an unrelated orphan supply invoice', () => {
  const p = baseProject();
  p.expenses.push(
    {
      id: 'gas_invoice', propertyId: 'house', providerAccountId: 'gas_supplier',
      supplyManaged: true, category: 'heating', classification: 'allocatable',
      amountCents: 218000, startDate: '2026-01-01', endDate: '2026-12-31',
      invoiceReference: 'GAS2026', invoiceLineId: 'delivery'
    },
    {
      id: 'power_orphan', propertyId: 'house', providerAccountId: 'power_supplier',
      supplyManaged: true, category: 'common_electricity', classification: 'allocatable',
      amountCents: 1000, startDate: '2026-01-01', endDate: '2026-12-31',
      invoiceReference: 'POWER2026', invoiceLineId: 'delivery'
    }
  );
  assert.throws(() => createSupplyDraft(p, {
    recordId: 'gas_contract', propertyId: 'house', accountingPeriodId: 'year2026',
    providerAccountId: 'gas_supplier', service: 'gas', contractHolder: 'owner',
    priceVersion: fullVersion
  }), error => error instanceof SupplyManagementError && error.code === 'INVALID_PROJECT');
});
