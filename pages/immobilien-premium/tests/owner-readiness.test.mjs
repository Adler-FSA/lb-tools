import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { inspectOwnerAnnualReadiness } from '../assets/js/owner-readiness.js';

function ownerOnlyFixture() {
  const p = createEmptyProject('ready_owner');
  p.properties.push({ id: 'house' });
  p.units.push({
    id: 'unit', propertyId: 'house',
    areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }]
  });
  p.usagePeriods.push({
    id: 'usage', unitId: 'unit', kind: 'owner',
    startDate: '2026-01-01', endDate: null
  });
  p.accountingPeriods.push({
    id: 'year2026', propertyId: 'house',
    startDate: '2026-01-01', endDate: '2026-12-31',
    confirmedTenancyIds: []
  });
  p.expenses.push({
    id: 'repair', propertyId: 'house', category: 'repair',
    classification: 'owner', amountCents: 125000,
    startDate: '2026-01-01', endDate: '2026-12-31',
    invoiceReference: 'R-1'
  });
  return p;
}

test('owner-only supported year reaches real non-posting annual preview', () => {
  const p = ownerOnlyFixture();
  const original = JSON.stringify(p);
  const r = inspectOwnerAnnualReadiness(p, 'year2026');
  assert.equal(r.status, 'preview', JSON.stringify(r));
  assert.equal(r.preview.originalCostsCents, 125000);
  assert.equal(r.preview.ownerCostsCents, 125000);
  assert.equal(r.preview.tenantCostsCents, 0);
  assert.equal(r.preview.legalRelease, false);
  assert.equal(r.preview.pdfGenerated, false);
  assert.equal(JSON.stringify(p), original);
});

test('unresolved cost produces guided blocker toward costs', () => {
  const p = ownerOnlyFixture();
  p.expenses[0].classification = 'unresolved';
  const r = inspectOwnerAnnualReadiness(p, 'year2026');
  assert.equal(r.status, 'blocked');
  assert.ok(r.blockers.length > 0);
  assert.equal(r.blockers[0].section, 'kosten');
  assert.equal(r.blockers[0].action.href, 'kosten.html');
});

test('missing allocation rule is routed to later landlord allocation flow', () => {
  const p = ownerOnlyFixture();
  p.expenses[0] = {
    ...p.expenses[0],
    category: 'property_tax',
    classification: 'allocatable',
    confirmedForAllocation: true
  };
  const r = inspectOwnerAnnualReadiness(p, 'year2026');
  assert.equal(r.status, 'blocked');
  assert.ok(r.blockers.some(x => x.code === 'WORKFLOW_STANDARD_BLOCKED'));
});

test('partial annual invoice is blocked before calculation and points to costs', () => {
  const p = ownerOnlyFixture();
  p.expenses[0].endDate = '2026-06-30';
  const r = inspectOwnerAnnualReadiness(p, 'year2026');
  assert.equal(r.status, 'blocked');
  assert.equal(r.blockers[0].code, 'WORKFLOW_SOURCE_PERIOD_INVALID');
  assert.equal(r.blockers[0].section, 'kosten');
});
