import test from 'node:test';
import assert from 'node:assert/strict';
import { auditPeriodPreview } from '../assets/js/period-integrity.js';

function scenario() {
  const project = {
    accountingPeriods: [{ id: 'year', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31' }],
    units: [{ id: 'A', propertyId: 'house' }, { id: 'B', propertyId: 'house' }],
    tenancies: [{ id: 'leaseB', unitId: 'B' }],
    expenses: [
      { id: 'tax', propertyId: 'house', category: 'property_tax', amountCents: 10000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'allocatable',
        providerAccountId: 'city', invoiceReference: 'tax2026', invoiceLineId: 'tax' },
      { id: 'heat', propertyId: 'house', category: 'heating', amountCents: 20000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'allocatable',
        providerAccountId: 'gas', invoiceReference: 'gas2026', invoiceLineId: 'energy' },
      { id: 'carbon', propertyId: 'house', category: 'co2', amountCents: 1000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'unresolved',
        providerAccountId: 'gas', invoiceReference: 'gas2026', invoiceLineId: 'co2' }
    ],
    cashflows: [
      { id: 'gasPay', propertyId: 'house', kind: 'provider_payment', providerAccountId: 'gas', accountingPeriodId: 'year', amountCents: 25000 },
      { id: 'gasRefund', propertyId: 'house', kind: 'provider_refund', providerAccountId: 'gas', accountingPeriodId: 'year', amountCents: 1000 },
      { id: 'actualTenantAdvance', kind: 'tenant_payment', tenancyId: 'leaseB',
        accountingPeriodId: 'year', purpose: 'operating_cost_advance', amountCents: 5000 },
      { id: 'tenantDueIsNotPaid', kind: 'tenant_advance_due', tenancyId: 'leaseB',
        accountingPeriodId: 'year', amountCents: 10000 }
    ]
  };
  const standard = { status: 'calculated', report: {
    periodId: 'year', propertyId: 'house', totalCostsCents: 10000,
    ownerCostsCents: 6000, tenantCostsCents: 4000, legalRelease: false, pdfGenerated: false,
    expenseLines: [{ expenseId: 'tax', amountCents: 10000, ownerDirectCents: 0,
      unitShares: [{ unitId: 'A', kind: 'owner', cents: 6000 },
        { unitId: 'B', kind: 'tenant', tenancyId: 'leaseB', cents: 4000 }] }],
    tenants: [{ tenancyId: 'leaseB', costsCents: 4000, advancesCents: 5000 }]
  } };
  const thermal = { status: 'calculated', report: {
    scope: 'thermal_subreport_only', periodId: 'year', propertyId: 'house',
    totalCostsCents: 20000, ownerCostsCents: 8000,
    legalRelease: false, pdfGenerated: false, co2Calculated: false, combinedWithOtherCosts: false,
    streams: [{ kind: 'heating', totalCents: 20000, lines: [{ expenseId: 'heat', amountCents: 20000,
      unitShares: [{ unitId: 'A', kind: 'owner', cents: 8000 },
        { unitId: 'B', kind: 'tenant', tenancyId: 'leaseB', cents: 12000 }] }] }],
    tenants: [{ tenancyId: 'leaseB', costsCents: 12000 }]
  } };
  const co2 = { status: 'preview', report: {
    scope: 'co2_tenant_allocation_preview_only', periodId: 'year', propertyId: 'house',
    originalExpenseIds: ['carbon'], originalInvoiceCents: 1000,
    landlordPortionCents: 300, tenantPoolCents: 700,
    tenants: [{ tenancyId: 'leaseB', provisionalCo2Cents: 700 }],
    actualCostsPosted: false, legalRelease: false, pdfGenerated: false, combinedWithOtherCosts: false
  } };
  return { project, reports: { standard, thermal, co2 } };
}
const blocked = (mutate, code) => {
  const { project, reports } = scenario(); mutate(project, reports);
  const actual = auditPeriodPreview(project, 'year', reports);
  assert.equal(actual.status, 'blocked', JSON.stringify(actual));
  assert.equal(actual.report, null);
  assert.equal(actual.issues[0].code, code, JSON.stringify(actual.issues));
};

test('MH-01/07/08: sums 3 distinct ORIGINAL costs, real tenant advances and separate supplier credit', () => {
  const { project, reports } = scenario(); const before = JSON.stringify({ project, reports });
  const r = auditPeriodPreview(project, 'year', reports);
  assert.equal(r.status, 'preview', JSON.stringify(r.issues));
  assert.equal(r.calculationReady, false);
  assert.equal(r.report.originalCostsCents, 31000);
  assert.equal(r.report.ownerCostsCents, 14300);
  assert.equal(r.report.tenantCostsCents, 16700);
  assert.deepEqual(r.report.tenants, [{ tenancyId: 'leaseB', costsCents: 16700,
    advancesActuallyPaidCents: 5000, balanceCents: 11700, creditCents: 0, additionalCents: 11700 }]);
  assert.deepEqual(r.report.providerBalances, [
    { providerAccountId: 'city', invoicedCents: 10000, netPaidCents: 0, differenceCents: -10000,
      scope: 'original_invoices_and_recorded_supplier_payments_only' },
    { providerAccountId: 'gas', invoicedCents: 21000, netPaidCents: 24000, differenceCents: 3000,
      scope: 'original_invoices_and_recorded_supplier_payments_only' }
  ]);
  assert.equal(r.report.forecastsIncluded, false);
  assert.equal(r.report.providerPaymentsIncludedInCosts, false);
  assert.equal(r.report.legalRelease, false);
  assert.equal(JSON.stringify({ project, reports }), before);
});

test('invoices absent from one subreport, extra or repeated IDs block the full period', () => {
  blocked((p, r) => { r.standard.report.expenseLines = []; }, 'INTEGRITY_STANDARD_REQUIRED');
  blocked((p, r) => { r.standard.report.expenseLines[0].expenseId = 'heat'; }, 'INTEGRITY_SOURCE_MISMATCH');
  blocked((p, r) => { r.thermal.report.streams[0].lines[0].expenseId = 'tax'; }, 'INTEGRITY_THERMAL_INVENTORY');
  blocked((p, r) => { r.co2.report.originalExpenseIds = []; }, 'INTEGRITY_CO2_INVENTORY');
  blocked((p, r) => { p.expenses.push({ ...p.expenses[0], id: 'extra', invoiceReference: 'extra' }); }, 'INTEGRITY_STANDARD_REQUIRED');
  blocked((p, r) => { p.expenses.push({ ...p.expenses[0] }); }, 'INTEGRITY_DUPLICATE');
  blocked((p, r) => { p.expenses[1].invoiceReference = 'tax2026'; p.expenses[1].invoiceLineId = 'tax'; }, 'INTEGRITY_DUPLICATE_INVOICE');
});

test('false cent balances, altered tenant shares and heat line totals are rejected', () => {
  blocked((p, r) => { r.standard.report.expenseLines[0].unitShares[1].cents++; }, 'INTEGRITY_LINE_MISMATCH');
  blocked((p, r) => { r.standard.report.ownerCostsCents++; }, 'INTEGRITY_STANDARD_MISMATCH');
  blocked((p, r) => { r.standard.report.tenants[0].costsCents++; }, 'INTEGRITY_STANDARD_MISMATCH');
  blocked((p, r) => { r.thermal.report.streams[0].lines[0].unitShares[0].cents++; }, 'INTEGRITY_LINE_MISMATCH');
  blocked((p, r) => { r.thermal.report.tenants[0].costsCents++; }, 'INTEGRITY_THERMAL_MISMATCH');
  blocked((p, r) => { r.co2.report.tenantPoolCents++; }, 'INTEGRITY_CO2_MISMATCH');
});

test('provider transactions do not disappear or manufacture a fake provider balance', () => {
  blocked((p) => { p.cashflows[0].accountingPeriodId = undefined; }, 'INTEGRITY_PROVIDER_INVALID');
  blocked((p) => { p.cashflows[0].providerAccountId = 'unlisted'; }, 'INTEGRITY_PROVIDER_INVALID');
  blocked((p) => { p.cashflows[0].amountCents = -1; }, 'INTEGRITY_PROVIDER_INVALID');
  blocked((p) => { p.cashflows[0].amountCents = Number.MAX_SAFE_INTEGER; p.cashflows[1].kind = 'provider_payment'; }, 'INTEGRITY_OVERFLOW');
});

test('unconfirmed year, overlapping dates and unsupported oil block before showing balances', () => {
  blocked((p) => { p.accountingPeriods[0].reviewRequired = true; }, 'INTEGRITY_YEAR_UNCONFIRMED');
  blocked((p) => { p.expenses[0].endDate = null; }, 'INTEGRITY_SOURCE_UNCONFIRMED');
  blocked((p) => { p.expenses[0].endDate = '2027-01-01'; }, 'INTEGRITY_SOURCE_UNCONFIRMED');
  blocked((p) => { p.expenses[0].category = 'heating_oil'; }, 'INTEGRITY_STANDARD_UNEXPECTED');
});

test('linked heat sources are originals; derived pools never count as original invoices', () => {
  const { project, reports } = scenario();
  reports.thermal.report.scope = 'thermal_linked_subreport_only';
  reports.thermal.report.linkedCosts = {
    sourceExpenseIds: ['heat'], originalCents: 20000, excludedCo2Cents: 1000,
    excludedCo2ExpenseIds: ['carbon'],
    derivedExpenseIds: { heating: 'derived_linked_heating', hot_water: 'derived_linked_hot_water' }
  };
  reports.thermal.report.streams = [
    { kind: 'heating', totalCents: 15000, lines: [{ expenseId: 'derived_linked_heating', amountCents: 15000,
      unitShares: [{ unitId: 'A', kind: 'owner', cents: 6000 }, { unitId: 'B', kind: 'tenant', tenancyId: 'leaseB', cents: 9000 }] }] },
    { kind: 'hot_water', totalCents: 5000, lines: [{ expenseId: 'derived_linked_hot_water', amountCents: 5000,
      unitShares: [{ unitId: 'A', kind: 'owner', cents: 2000 }, { unitId: 'B', kind: 'tenant', tenancyId: 'leaseB', cents: 3000 }] }] }
  ];
  assert.equal(auditPeriodPreview(project, 'year', reports).status, 'preview');
  reports.thermal.report.linkedCosts.originalCents++;
  assert.equal(auditPeriodPreview(project, 'year', reports).issues[0].code, 'INTEGRITY_LINKED_SOURCES');
  reports.thermal.report.linkedCosts.originalCents--;
  reports.thermal.report.linkedCosts.excludedCo2Cents++;
  assert.equal(auditPeriodPreview(project, 'year', reports).issues[0].code, 'INTEGRITY_CO2_LINKED_MISMATCH');
});

test('positive zero payment and real prepaid tenant credit remain distinct', () => {
  const { project, reports } = scenario();
  reports.standard.report.tenants[0].advancesCents = 20000;
  project.cashflows.find(f => f.id === 'actualTenantAdvance').amountCents = 20000;
  const r = auditPeriodPreview(project, 'year', reports);
  assert.equal(r.status, 'preview');
  assert.equal(r.report.tenants[0].creditCents, 3300);
  assert.equal(r.report.providerBalances.find(p => p.providerAccountId === 'city').differenceCents, -10000);
});

test('fabricated tenant advance, rent and due entries never count as paid advances', () => {
  blocked((p) => { p.cashflows.find(f => f.id === 'actualTenantAdvance').amountCents = 0; },
    'INTEGRITY_PAYMENT_LEDGER_MISMATCH');
  blocked((p) => { p.cashflows.find(f => f.id === 'actualTenantAdvance').purpose = 'base_rent'; },
    'INTEGRITY_PAYMENT_LEDGER_MISMATCH');
  const { project, reports } = scenario();
  project.cashflows.find(f => f.id === 'tenantDueIsNotPaid').amountCents = 500000;
  const result = auditPeriodPreview(project, 'year', reports);
  assert.equal(result.status, 'preview');
  assert.equal(result.report.tenants[0].advancesActuallyPaidCents, 5000);
});

test('undocumented advance purpose, missing period and tenant refund block', () => {
  blocked((p) => { p.cashflows.find(f => f.id === 'actualTenantAdvance').purpose = 'misc'; },
    'INTEGRITY_PAYMENT_ASSIGNMENT_REQUIRED');
  blocked((p) => { delete p.cashflows.find(f => f.id === 'actualTenantAdvance').accountingPeriodId; },
    'INTEGRITY_PAYMENT_PERIOD_REQUIRED');
  blocked((p) => { p.cashflows.find(f => f.id === 'actualTenantAdvance').kind = 'tenant_refund'; },
    'INTEGRITY_REFUND_REVIEW_REQUIRED');
});
