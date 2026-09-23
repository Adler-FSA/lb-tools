import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { buildOwnerSummary } from '../assets/js/owner-summary.js';

function fixture() {
  const p = createEmptyProject('owner_summary');
  p.properties.push({ id: 'house' });
  p.accountingPeriods.push({
    id: 'year2026', propertyId: 'house',
    startDate: '2026-01-01', endDate: '2026-12-31'
  });
  p.expenses.push(
    { id: 'tax', propertyId: 'house', category: 'property_tax',
      classification: 'allocatable', amountCents: 60000,
      startDate: '2026-01-01', endDate: '2026-12-31',
      invoiceReference: 'tax-2026' },
    { id: 'roof', propertyId: 'house', category: 'repair',
      classification: 'owner', amountCents: 100000,
      startDate: '2026-01-01', endDate: '2026-12-31',
      invoiceReference: 'roof-2026' },
    { id: 'open', propertyId: 'house', category: 'other',
      classification: 'unresolved', amountCents: 5000,
      startDate: '2026-01-01', endDate: '2026-12-31' }
  );
  p.cashflows.push(
    { id: 'pay', kind: 'provider_payment', propertyId: 'house',
      accountingPeriodId: 'year2026', providerAccountId: 'water',
      amountCents: 70000, date: '2026-06-01' },
    { id: 'refund', kind: 'provider_refund', propertyId: 'house',
      accountingPeriodId: 'year2026', providerAccountId: 'water',
      amountCents: 10000, date: '2026-12-20' }
  );
  return p;
}

test('owner summary keeps actual costs and provider payments separate', () => {
  const r = buildOwnerSummary(fixture(), 'house', 'year2026');
  assert.equal(r.status, 'summary');
  assert.equal(r.report.actualCostsCents, 165000);
  assert.equal(r.report.ownerClassifiedCents, 100000);
  assert.equal(r.report.allocatableClassifiedCents, 60000);
  assert.equal(r.report.unresolvedCents, 5000);
  assert.equal(r.report.providerPaymentsCents, 70000);
  assert.equal(r.report.providerRefundsCents, 10000);
  assert.equal(r.report.providerNetPaidCents, 60000);
  assert.equal(r.report.postingReady, false);
  assert.equal(r.report.legalRelease, false);
});

test('owner summary reports missing invoice evidence without inventing release', () => {
  const r = buildOwnerSummary(fixture(), 'house', 'year2026');
  assert.ok(r.issues.some(issue => issue.code === 'INVOICE_REFERENCE_MISSING'));
  assert.equal(r.report.expenseCount, 3);
});

test('owner summary does not include foreign property or foreign period cashflows', () => {
  const p = fixture();
  p.properties.push({ id: 'other' });
  p.accountingPeriods.push({
    id: 'otherYear', propertyId: 'other',
    startDate: '2026-01-01', endDate: '2026-12-31'
  });
  p.expenses.push({ id: 'foreign', propertyId: 'other', category: 'repair',
    classification: 'owner', amountCents: 999999,
    startDate: '2026-01-01', endDate: '2026-12-31', invoiceReference: 'x' });
  p.cashflows.push({ id: 'foreignpay', kind: 'provider_payment', propertyId: 'other',
    accountingPeriodId: 'otherYear', providerAccountId: 'x',
    amountCents: 999999, date: '2026-03-01' });
  const r = buildOwnerSummary(p, 'house', 'year2026');
  assert.equal(r.report.actualCostsCents, 165000);
  assert.equal(r.report.providerNetPaidCents, 60000);
});

test('owner summary blocks open or mismatched periods', () => {
  const p = fixture();
  p.accountingPeriods[0].endDate = null;
  let r = buildOwnerSummary(p, 'house', 'year2026');
  assert.equal(r.status, 'blocked');

  p.accountingPeriods[0].endDate = '2026-12-31';
  r = buildOwnerSummary(p, 'house', 'missing');
  assert.equal(r.status, 'blocked');
});
