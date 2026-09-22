import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject, validateProject } from '../assets/js/model.js';
import { runAnnualWorkflow } from '../assets/js/year-workflow.js';
function fixture() {
  const project = createEmptyProject('workflow');
  project.properties.push({ id: 'house' });
  project.units.push({ id: 'flat', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 5000 }] });
  project.accountingPeriods.push({ id: 'year', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31' });
  project.expenses.push({ id: 'tax', propertyId: 'house', category: 'property_tax', classification: 'owner',
    amountCents: 12000, startDate: '2026-01-01', endDate: '2026-12-31' });
  const calls = [];
  const engines = {
    validate: validateProject,
    standard(p) { calls.push(['standard', p]); return { status: 'calculated', issues: [], report: { totalCostsCents: 12000 } }; },
    thermalSeparate(p) { calls.push(['thermalSeparate', p]); return { status: 'calculated', issues: [], report: {} }; },
    thermalLinked(p) { calls.push(['thermalLinked', p]); return { status: 'calculated', issues: [], report: {} }; },
    co2Tenants(p) { calls.push(['co2', p]); return { status: 'preview', issues: [], report: {} }; },
    supply(p) { calls.push(['supply', p]); return { status: 'reviewed', issues: [], report: { unreviewedProviderAccountIds: [] } }; },
    audit(p, id, reports) { calls.push(['audit', p, reports]); return { status: 'preview', issues: [], report: {
      scope: 'period_integrity_preview_only', periodId: id, propertyId: 'house',
      originalExpenseIds: p.expenses.map(e => e.id).sort(), legalRelease: false,
      pdfGenerated: false, combinedForPosting: false, providerPaymentsIncludedInCosts: false,
      forecastsIncluded: false, co2Posted: false,
      originalCostsCents: p.expenses.reduce((n, e) => n + e.amountCents, 0),
      ownerCostsCents: p.expenses.reduce((n, e) => n + e.amountCents, 0), tenantCostsCents: 0 } }; }
  };
  return { project, engines, calls };
}
const run = (f, plans = {}) => runAnnualWorkflow(f.project, 'year', plans, f.engines);
function expectCode(f, code, plans = {}) {
  const before = JSON.stringify(f.project);
  const result = run(f, plans);
  assert.equal(result.status, 'blocked', JSON.stringify(result));
  assert.equal(result.issues[0].code, code);
  assert.equal(result.report, null);
  assert.equal(JSON.stringify(f.project), before);
}
test('standard-only year calls injected workflow stages in order without posting', () => {
  const f = fixture(), before = JSON.stringify(f.project);
  const r = run(f);
  assert.equal(r.status, 'preview');
  assert.deepEqual(f.calls.map(c => c[0]), ['standard', 'audit']);
  assert.equal(r.report.originalCostsCents, 12000);
  assert.equal(r.report.combinedForPosting, false);
  assert.equal(r.report.legalRelease, false);
  assert.equal(JSON.stringify(f.project), before);
});
test('new year cannot calculate before confirmation', () => {
  const f = fixture(); f.project.accountingPeriods[0].reviewRequired = true;
  expectCode(f, 'WORKFLOW_YEAR_UNCONFIRMED');
  assert.equal(f.calls.length, 0);
});
test('heating needs plan and fails closed for unsupported oil and mixed originals', () => {
  const f = fixture(); f.project.expenses.push({ id: 'heat', propertyId: 'house', category: 'heating',
    classification: 'allocatable', amountCents: 20000, startDate: '2026-01-01', endDate: '2026-12-31' });
  expectCode(f, 'WORKFLOW_PLAN_REQUIRED');
  f.project.expenses.push({ id: 'shared', propertyId: 'house', category: 'thermal_shared',
    classification: 'allocatable', amountCents: 30000, startDate: '2026-01-01', endDate: '2026-12-31' });
  expectCode(f, 'WORKFLOW_MIXED_THERMAL_UNSUPPORTED', { thermal: {}, linked: {} });
  f.project.expenses.push({ id: 'oil', propertyId: 'house', category: 'heating_oil',
    classification: 'owner', amountCents: 1000, startDate: '2026-01-01', endDate: '2026-12-31' });
  expectCode(f, 'WORKFLOW_HEATING_OIL_UNSUPPORTED', { thermal: {}, linked: {} });
});
test('separate thermal calculation omits co2 only in temporary copy; original audit receives all', () => {
  const f = fixture();
  for (const [id, category] of [['heat', 'heating'], ['carbon', 'co2']]) f.project.expenses.push({ id, propertyId: 'house',
    category, classification: category === 'co2' ? 'unresolved' : 'allocatable',
    amountCents: 5000, startDate: '2026-01-01', endDate: '2026-12-31' });
  const before = JSON.stringify(f.project);
  const result = run(f, { thermal: {}, co2Building: {}, co2Tenants: {} });
  assert.equal(result.status, 'preview', JSON.stringify(result));
  assert.deepEqual(f.calls.map(c => c[0]), ['standard', 'thermalSeparate', 'co2', 'audit']);
  assert.deepEqual(f.calls[0][1].expenses.map(e => e.id), ['tax']);
  assert.deepEqual(f.calls[1][1].expenses.map(e => e.id), ['tax', 'heat']);
  assert.deepEqual(f.calls[3][1].expenses.map(e => e.id), ['tax', 'heat', 'carbon']);
  assert.equal(JSON.stringify(f.project), before);
});
test('linked heating original data remains unchanged, no second synthetic invoices', () => {
  const f = fixture(); f.project.expenses.push({ id: 'shared', propertyId: 'house', category: 'thermal_shared',
    classification: 'allocatable', amountCents: 30000, startDate: '2026-01-01', endDate: '2026-12-31' });
  const r = run(f, { thermal: {}, linked: {} });
  assert.equal(r.status, 'preview');
  assert.deepEqual(f.calls.map(c => c[0]), ['standard', 'thermalLinked', 'audit']);
  assert.equal(f.calls[1][1].expenses.length, 2);
});
test('co2 cannot run without proper thermal plan and must preserve failed specialist errors', () => {
  const f = fixture(); f.project.expenses.push({ id: 'carbon', propertyId: 'house', category: 'co2',
    classification: 'unresolved', amountCents: 5000, startDate: '2026-01-01', endDate: '2026-12-31' });
  expectCode(f, 'WORKFLOW_CO2_THERMAL_REQUIRED', { co2Building: {}, co2Tenants: {} });
  f.project.expenses.push({ id: 'heat', propertyId: 'house', category: 'heating',
    classification: 'allocatable', amountCents: 20000, startDate: '2026-01-01', endDate: '2026-12-31' });
  f.engines.thermalSeparate = () => ({ status: 'blocked', issues: [{ code: 'MISSING_READINGS' }], report: null });
  expectCode(f, 'WORKFLOW_THERMAL_BLOCKED', { thermal: {}, co2Building: {}, co2Tenants: {} });
  assert.equal(f.calls.some(c => c[0] === 'co2'), false);
});
test('supplier preview is separate, draft and missing registry are blocked', () => {
  const f = fixture();
  f.project.expenses[0].supplyManaged = true;
  expectCode(f, 'SUPPLY_UNASSIGNED_EXPENSE');
  f.project.expenses[0].supplyManaged = false;
  f.project.supplyRegistry.push({ id: 'draft', propertyId: 'house', accountingPeriodId: 'year',
    confirmed: false, contract: { providerAccountId: 'provider', service: 'water', contractHolder: 'owner', confirmed: false } });
  expectCode(f, 'WORKFLOW_SUPPLY_UNCONFIRMED');
});
test('annual audit rejects inflated, unreconciled or releasable results', () => {
  const f = fixture();
  f.engines.audit = () => ({ status: 'blocked', issues: [{ code: 'INTEGRITY_SOURCE_MISMATCH' }], report: null });
  expectCode(f, 'WORKFLOW_INTEGRITY_BLOCKED');
  f.engines.audit = () => ({ status: 'preview', issues: [], report: {
    scope: 'period_integrity_preview_only', legalRelease: true, pdfGenerated: false, combinedForPosting: false } });
  expectCode(f, 'WORKFLOW_INTEGRITY_BLOCKED');
});
test('missing engine and incomplete source year block before any calculation', () => {
  const f = fixture(); delete f.engines.audit;
  expectCode(f, 'WORKFLOW_ENGINE_MISSING');
  f.engines.audit = () => { throw Error('not used'); };
  f.project.expenses[0].endDate = null;
  expectCode(f, 'WORKFLOW_SOURCE_PERIOD_INVALID');
});

test('annual output rejects missing invoices, wrong property and inflated reconciled totals', () => {
  const f = fixture();
  const genuineAudit = f.engines.audit;
  for (const alter of [
    r => { r.originalExpenseIds = []; },
    r => { r.periodId = 'otherYear'; },
    r => { r.propertyId = 'otherHouse'; },
    r => { r.originalCostsCents += 1; },
    r => { r.ownerCostsCents += 1; },
    r => { r.providerPaymentsIncludedInCosts = true; },
    r => { r.forecastsIncluded = true; },
    r => { r.co2Posted = true; }
  ]) {
    f.engines.audit = (...args) => {
      const result = genuineAudit(...args);
      alter(result.report);
      return result;
    };
    expectCode(f, 'WORKFLOW_FINAL_RECONCILIATION');
  }
});

test('annual source sum over safe integer range blocks even if an audit claims success', () => {
  const f = fixture();
  f.project.expenses[0].amountCents = Number.MAX_SAFE_INTEGER;
  f.project.expenses.push({ id: 'extra', propertyId: 'house', category: 'property_tax',
    classification: 'owner', amountCents: 1, startDate: '2026-01-01', endDate: '2026-12-31' });
  expectCode(f, 'WORKFLOW_FINAL_RECONCILIATION');
});

test('even mutating calculation stages cannot alter caller data or later stage inputs', () => {
  const f = fixture();
  f.project.expenses.push({ id: 'heat', propertyId: 'house', category: 'heating',
    classification: 'allocatable', amountCents: 5000, startDate: '2026-01-01', endDate: '2026-12-31' });
  f.project.expenses.push({ id: 'carbon', propertyId: 'house', category: 'co2',
    classification: 'unresolved', amountCents: 200, startDate: '2026-01-01', endDate: '2026-12-31' });
  const plans = { thermal: { real: 'thermal' }, co2Building: { real: 'building' },
    co2Tenants: { real: 'tenant' } };
  const original = JSON.stringify({ project: f.project, plans });
  f.engines.validate = p => { p.properties[0].label = 'changed'; return []; };
  f.engines.standard = p => { p.expenses[0].amountCents = 999999; return {
    status: 'calculated', issues: [], report: { totalCostsCents: 999999 } }; };
  f.engines.thermalSeparate = (p, id, plan) => {
    assert.equal(p.properties[0].label, undefined, 'validator changes are isolated');
    assert.equal(p.expenses[0].amountCents, 12000, 'standard changes are isolated');
    plan.real = 'changed';
    p.expenses[1].amountCents = 1;
    return { status: 'calculated', issues: [], report: { totalCostsCents: 1 } };
  };
  f.engines.co2Tenants = (p, id, cPlan, thermal, tPlan) => {
    assert.equal(p.expenses[1].amountCents, 5000, 'thermal changes are isolated');
    assert.equal(thermal.report.totalCostsCents, 1);
    p.expenses[0].amountCents = 7;
    cPlan.real = 'changed'; tPlan.real = 'changed'; thermal.report.totalCostsCents = 2;
    return { status: 'preview', issues: [], report: { originalInvoiceCents: 200 } };
  };
  const genuineAudit = f.engines.audit;
  f.engines.audit = (p, id, reports) => {
    assert.equal(p.expenses[0].amountCents, 12000, 'CO2 changes are isolated');
    assert.equal(reports.thermal.report.totalCostsCents, 1, 'CO2 cannot mutate audited thermal report');
    return genuineAudit(p, id, reports);
  };
  const result = runAnnualWorkflow(f.project, 'year', plans, f.engines);
  assert.equal(result.status, 'preview', JSON.stringify(result.issues));
  assert.equal(JSON.stringify({ project: f.project, plans }), original);
});

test('real supplier registry review runs in annual sequence without copying supplier payments into costs', async () => {
  const { reviewSupplyRegistry } = await import('../assets/js/supply-registry.js');
  const f = fixture();
  f.project.expenses.push({ id: 'gas', propertyId: 'house', category: 'heating',
    classification: 'allocatable', amountCents: 218000, supplyManaged: true,
    providerAccountId: 'supplier', invoiceReference: 'GAS2026', invoiceLineId: 'delivery',
    startDate: '2026-01-01', endDate: '2026-12-31' });
  f.project.cashflows.push({ id: 'providerPaid', propertyId: 'house',
    providerAccountId: 'supplier', kind: 'provider_payment', amountCents: 240000,
    date: '2026-09-01', accountingPeriodId: 'year' });
  f.project.supplyRegistry.push({ id: 'contract2026', propertyId: 'house',
    accountingPeriodId: 'year', confirmed: true,
    contract: { providerAccountId: 'supplier', service: 'gas', contractHolder: 'owner', confirmed: true,
      priceVersions: [{ validFrom: '2026-01-01', validTo: '2026-12-31', confirmed: true,
        referenceId: 'priceEvidence', baseCentsPerPeriod: 18000, plannedWholeUnits: 20000,
        workPriceNumeratorCents: 10, workPriceDenominatorUnits: 1, measurementUnit: 'kWh' }],
      expenseIds: ['gas'], invoiceTotalsCentsByReference: { GAS2026: 218000 } } });
  const original = JSON.stringify(f.project);
  f.engines.supply = (project, periodId, records) => {
    const reviewed = reviewSupplyRegistry(project, periodId, records);
    assert.equal(reviewed.status, 'reviewed', JSON.stringify(reviewed.issues));
    assert.equal(reviewed.report.accounts[0].actualOwnerCostsCents, 218000);
    assert.equal(reviewed.report.accounts[0].netProviderPaidCents, 240000);
    assert.equal(reviewed.report.accounts[0].forecastCents, 218000);
    return reviewed;
  };
  const result = run(f, { thermal: {} });
  assert.equal(result.status, 'preview', JSON.stringify(result.issues));
  assert.equal(result.report.originalCostsCents, 230000);
  assert.equal(result.report.supplyReviewed, true);
  assert.deepEqual(f.calls.map(x => x[0]), ['standard', 'thermalSeparate', 'audit']);
  assert.equal(JSON.stringify(f.project), original);
});
