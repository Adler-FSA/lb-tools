import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectAnnualSources } from '../assets/js/year-scope.js';
const fixture = () => ({
  accountingPeriods: [{ id: 'year', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31' }],
  units: [{ id: 'unit', propertyId: 'house' }], tenancies: [{ id: 'lease', unitId: 'unit' }],
  expenses: [{ id: 'tax', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31' }],
  cashflows: []
});
const check = (edit, expected) => { const p = fixture(); edit(p); const before = JSON.stringify(p);
  const r = inspectAnnualSources(p, 'year'); assert.equal(r.status, 'blocked');
  assert.equal(r.issues[0].code, expected); assert.equal(JSON.stringify(p), before); };
test('fully evidenced year and correctly dated payments verified without mutation', () => {
  const p = fixture(); p.cashflows.push({ id: 'paid', tenancyId: 'lease', accountingPeriodId: 'year', date: '2026-12-31' });
  const before = JSON.stringify(p), result = inspectAnnualSources(p, 'year');
  assert.equal(result.status, 'verified'); assert.deepEqual(result.originals.map(e => e.id), ['tax']);
  assert.equal(JSON.stringify(p), before);
});
test('undefined and null invoice end dates cannot disappear from annual inventory', () => {
  for (const endDate of [undefined, null]) check(p => {
    p.expenses.push({ id: 'heat', propertyId: 'house', startDate: '2026-01-01', endDate });
  }, 'WORKFLOW_SOURCE_PERIOD_INVALID');
});
test('invoice spanning the year or beginning midway is blocked', () => {
  check(p => { p.expenses[0].endDate = '2027-02-01'; }, 'WORKFLOW_SOURCE_PERIOD_INVALID');
  check(p => { p.expenses[0].startDate = '2026-02-01'; }, 'WORKFLOW_SOURCE_PERIOD_INVALID');
});
test('payment with same period but date in next year must not inflate tenant advances', () => {
  check(p => p.cashflows.push({ id: 'paid', tenancyId: 'lease', accountingPeriodId: 'year', date: '2027-01-02' }), 'YEAR_SCOPE_PAYMENT_DATE');
});
test('payment with same period but earlier year must not silently enter supplier account', () => {
  check(p => p.cashflows.push({ id: 'paid', propertyId: 'house', accountingPeriodId: 'year', date: '2025-12-31' }), 'YEAR_SCOPE_PAYMENT_DATE');
});
test('unassigned supplier and tenant payment dates in the selected year are blocked', () => {
  check(p => p.cashflows.push({ id: 'supplier', propertyId: 'house', date: '2026-03-01' }), 'YEAR_SCOPE_PAYMENT_UNASSIGNED');
  check(p => p.cashflows.push({ id: 'tenant', tenancyId: 'lease', date: '2026-06-01' }), 'YEAR_SCOPE_PAYMENT_UNASSIGNED');
});
test('explicit payment assigned to another period is not silently reassigned', () => {
  const p = fixture(); p.cashflows.push({ id: 'priorRefund', propertyId: 'house', accountingPeriodId: 'lastYear', date: '2026-01-10' });
  assert.equal(inspectAnnualSources(p, 'year').status, 'verified');
});
test('other houses do not contaminate selected building accounting', () => {
  const p = fixture(); p.expenses.push({ id: 'other', propertyId: 'different', startDate: '2026-05-01', endDate: null });
  p.cashflows.push({ id: 'otherPaid', propertyId: 'different', date: '2026-06-01' });
  assert.equal(inspectAnnualSources(p, 'year').status, 'verified');
});
test('missing lists, empty invoice inventory and unknown year fail closed', () => {
  check(p => { p.expenses = []; }, 'WORKFLOW_SOURCE_PERIOD_INVALID');
  check(p => { p.accountingPeriods[0].id = 'different'; }, 'YEAR_SCOPE_PERIOD_INVALID');
  check(p => { delete p.cashflows; }, 'YEAR_SCOPE_PROJECT_INVALID');
});
