import test from 'node:test';
import assert from 'node:assert/strict';
import { runAnnualWorkflow } from '../assets/js/year-workflow.js';

// Genuine annual orchestrator and source/date guard. Specialist engines are
// deliberately injected test doubles; this is NOT a full real-engine test.
function fixture() {
  const project = {
    accountingPeriods: [{ id: 'y26', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31' }],
    units: [{ id: 'flat', propertyId: 'house' }],
    tenancies: [{ id: 'lease', unitId: 'flat' }],
    expenses: [{ id: 'tax', propertyId: 'house', amountCents: 5000, category: 'property_tax',
      startDate: '2026-01-01', endDate: '2026-12-31' }],
    allocationRules: [], cashflows: [], supplyRegistry: []
  };
  const calls = [];
  const engines = {
    validate() { calls.push('validate'); return []; },
    standard() { calls.push('standard'); return { status: 'calculated', issues: [], report: {} }; },
    thermalSeparate() { throw Error('unexpected heating'); },
    thermalLinked() { throw Error('unexpected linked heating'); },
    co2Tenants() { throw Error('unexpected CO2'); },
    supply() { throw Error('unexpected supply'); },
    audit(p, id) {
      calls.push('audit');
      return { status: 'preview', issues: [], report: {
        scope: 'period_integrity_preview_only', periodId: id, propertyId: 'house',
        originalExpenseIds: ['tax'], originalCostsCents: 5000, ownerCostsCents: 5000,
        tenantCostsCents: 0, providerPaymentsIncludedInCosts: false, forecastsIncluded: false,
        co2Posted: false, legalRelease: false, pdfGenerated: false, combinedForPosting: false
      } };
    }
  };
  return { project, calls, engines };
}
function run(f, expected) {
  const initial = JSON.stringify(f.project);
  const result = runAnnualWorkflow(f.project, 'y26', {}, f.engines);
  assert.equal(result.status, expected === 'preview' ? 'preview' : 'blocked', JSON.stringify(result));
  if (expected !== 'preview') {
    assert.equal(result.issues[0].code, expected);
    assert.deepEqual(f.calls, ['validate'], 'No expense calculator runs after a provenance failure');
    assert.equal(result.report, null);
  } else {
    assert.deepEqual(f.calls, ['validate', 'standard', 'audit']);
    assert.equal(result.report.calculationReady, undefined);
    assert.equal(result.calculationReady, false);
    assert.equal(result.report.legalRelease, false);
  }
  assert.equal(JSON.stringify(f.project), initial);
}

test('genuine workflow reaches year preview with valid source and payment dates', () => {
  const f = fixture();
  f.project.cashflows.push({ id: 'paid', kind: 'tenant_payment', tenancyId: 'lease',
    accountingPeriodId: 'y26', purpose: 'operating_cost_advance', date: '2026-09-01', amountCents: 500 });
  run(f, 'preview');
});

test('paid-after-year tenant advance is blocked before any specialist calculation', () => {
  const f = fixture();
  f.project.cashflows.push({ id: 'paid', kind: 'tenant_payment', tenancyId: 'lease',
    accountingPeriodId: 'y26', purpose: 'operating_cost_advance', date: '2027-01-02', amountCents: 500 });
  run(f, 'YEAR_SCOPE_PAYMENT_DATE');
});

test('paid-before-year supplier advance cannot be silently counted as current-year payment', () => {
  const f = fixture();
  f.project.cashflows.push({ id: 'paid', kind: 'provider_payment', propertyId: 'house',
    accountingPeriodId: 'y26', date: '2025-12-30', amountCents: 500 });
  run(f, 'YEAR_SCOPE_PAYMENT_DATE');
});

test('unassigned tenant and supplier flows within year block at workflow entry', () => {
  for (const props of [{ tenancyId: 'lease', kind: 'tenant_payment' },
    { propertyId: 'house', kind: 'provider_payment' }]) {
    const f = fixture();
    f.project.cashflows.push({ id: 'unassigned', ...props, date: '2026-06-01', amountCents: 500 });
    run(f, 'YEAR_SCOPE_PAYMENT_UNASSIGNED');
  }
});

test('missing, null or partial original invoice end dates block the real annual workflow', () => {
  for (const end of [undefined, null, '2026-06-30']) {
    const f = fixture(); f.project.expenses[0].endDate = end;
    run(f, 'WORKFLOW_SOURCE_PERIOD_INVALID');
  }
});

test('unrelated house has no impact on the selected year', () => {
  const f = fixture();
  f.project.expenses.push({ id: 'other', propertyId: 'otherHouse', amountCents: 4000,
    startDate: '2026-01-01', endDate: undefined });
  f.project.cashflows.push({ id: 'otherPaid', propertyId: 'otherHouse', date: '2026-06-01' });
  run(f, 'preview');
});

test('unconfirmed successor year remains blocked without reaching the entry calculations', () => {
  const f = fixture(); f.project.accountingPeriods[0].reviewRequired = true;
  run(f, 'WORKFLOW_YEAR_UNCONFIRMED');
});
