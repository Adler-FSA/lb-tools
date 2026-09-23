import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import {
  LandlordDataError, addInitialContractTerms, changeAdvance, recordTenantCashflow,
  confirmTenancyLedger, setStandardAllocationRule
} from '../assets/js/landlord-management.js';

function fixture() {
  const p = createEmptyProject('landlord');
  p.properties.push({ id:'house' });
  p.units.push(
    { id:'ownerUnit', propertyId:'house', areaHistory:[{ from:'2026-01-01', to:null, hundredthsM2:12000 }] },
    { id:'tenantUnit', propertyId:'house', areaHistory:[{ from:'2026-01-01', to:null, hundredthsM2:8000 }] }
  );
  p.usagePeriods.push(
    { id:'ownerUse', unitId:'ownerUnit', kind:'owner', startDate:'2026-01-01', endDate:null },
    { id:'tenantUse', unitId:'tenantUnit', kind:'tenant', tenancyId:'lease', startDate:'2026-01-01', endDate:null }
  );
  p.tenancies.push({ id:'lease', unitId:'tenantUnit', startDate:'2026-01-01', endDate:null, partyLabel:'Mieter' });
  p.accountingPeriods.push({ id:'year2026', propertyId:'house', startDate:'2026-01-01', endDate:'2026-12-31', confirmedTenancyIds:[] });
  p.expenses.push({ id:'tax', propertyId:'house', category:'property_tax', classification:'allocatable',
    amountCents:60000, startDate:'2026-01-01', endDate:'2026-12-31', invoiceReference:'TAX' });
  return p;
}

test('initial advance terms start with tenancy and keep allowed costs explicit', () => {
  const p = fixture();
  const r = addInitialContractTerms(p, {
    termId:'term1', tenancyId:'lease', operatingCostsModel:'advance',
    advanceCents:10000, allowedCostTypes:['property_tax','cold_water','property_tax']
  });
  assert.equal(p.contractTerms.length, 0);
  assert.deepEqual(r.project.contractTerms[0], {
    id:'term1', tenancyId:'lease', startDate:'2026-01-01', endDate:null,
    operatingCostsModel:'advance', advanceCents:10000,
    allowedCostTypes:['cold_water','property_tax']
  });
});

test('advance change splits contract history and confirms only the advance change', () => {
  let p = addInitialContractTerms(fixture(), {
    termId:'term1', tenancyId:'lease', operatingCostsModel:'advance',
    advanceCents:10000, allowedCostTypes:['property_tax']
  }).project;
  const r = changeAdvance(p, {
    tenancyId:'lease', effectiveFrom:'2026-07-01', newAdvanceCents:12000, newTermId:'term2'
  });
  assert.equal(p.contractTerms[0].endDate, null);
  assert.deepEqual(r.project.contractTerms.map(x => [x.id,x.startDate,x.endDate,x.advanceCents,x.advanceChangeConfirmed ?? false]), [
    ['term1','2026-01-01','2026-06-30',10000,false],
    ['term2','2026-07-01',null,12000,true]
  ]);
});

test('mid-month advance change is blocked instead of prorated automatically', () => {
  let p = addInitialContractTerms(fixture(), {
    termId:'term1', tenancyId:'lease', operatingCostsModel:'advance',
    advanceCents:10000, allowedCostTypes:['property_tax']
  }).project;
  assert.throws(() => changeAdvance(p, {
    tenancyId:'lease', effectiveFrom:'2026-07-15', newAdvanceCents:12000, newTermId:'term2'
  }), error => error instanceof LandlordDataError && error.code === 'ADVANCE_CHANGE_MID_MONTH');
});

test('actual tenant payment and manual due stay separate', () => {
  let p = fixture();
  p = recordTenantCashflow(p, {
    cashflowId:'paid', tenancyId:'lease', accountingPeriodId:'year2026',
    kind:'tenant_payment', purpose:'operating_cost_advance', amountCents:10000, date:'2026-01-05'
  }).project;
  p = recordTenantCashflow(p, {
    cashflowId:'due', tenancyId:'lease', accountingPeriodId:'year2026',
    kind:'tenant_advance_due', amountCents:5000, date:'2026-01-01', confirmedDue:true
  }).project;
  assert.equal(p.cashflows.find(x=>x.id==='paid').purpose, 'operating_cost_advance');
  assert.equal(p.cashflows.find(x=>x.id==='due').confirmedDue, true);
  assert.notEqual(p.cashflows[0].kind, p.cashflows[1].kind);
});

test('ledger confirmation is explicit and period-bound', () => {
  const p = fixture();
  const r = confirmTenancyLedger(p, { accountingPeriodId:'year2026', tenancyId:'lease' });
  assert.deepEqual(r.project.accountingPeriods[0].confirmedTenancyIds, ['lease']);
  assert.deepEqual(p.accountingPeriods[0].confirmedTenancyIds, []);
});

test('area allocation confirms one allocatable expense without changing amount', () => {
  const p = fixture();
  const r = setStandardAllocationRule(p, {
    ruleId:'rule_tax', expenseId:'tax', accountingPeriodId:'year2026', method:'area'
  });
  assert.equal(r.project.expenses[0].amountCents, 60000);
  assert.equal(r.project.expenses[0].confirmedForAllocation, true);
  assert.deepEqual(r.project.allocationRules[0], {
    id:'rule_tax', expenseId:'tax', accountingPeriodId:'year2026', method:'area', methodConfirmed:true
  });
});

test('consumption allocation requires a valid meter for every unit', () => {
  const p = fixture();
  p.meters.push({ id:'mOwner', propertyId:'house', unitId:'ownerUnit', installedAt:'2025-01-01' });
  assert.throws(() => setStandardAllocationRule(p, {
    ruleId:'rule_tax', expenseId:'tax', accountingPeriodId:'year2026', method:'consumption',
    meterIdsByUnit:{ ownerUnit:['mOwner'] }
  }), error => error instanceof LandlordDataError && error.code === 'METER_MAPPING_INVALID');
});
