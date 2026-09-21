import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewSupplyAccount} from '../assets/js/supply-review.js';
function sample() {
  const p={accountingPeriods:[{id:'year',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'}],
    expenses:[{id:'gas',propertyId:'house',providerAccountId:'supplier',category:'heating',
      startDate:'2026-01-01',endDate:'2026-12-31',amountCents:218000,
      invoiceReference:'GAS',invoiceLineId:'energy'}],
    cashflows:[{id:'advance',kind:'provider_payment',propertyId:'house',providerAccountId:'supplier',
      accountingPeriodId:'year',date:'2026-06-01',amountCents:240000}]};
  const plan={providerAccountId:'supplier',service:'gas',contractHolder:'owner',confirmed:true,
    priceVersions:[{validFrom:'2026-01-01',validTo:'2026-12-31',confirmed:true,
      referenceId:'contract',baseCentsPerPeriod:18000,workPriceNumeratorCents:21,
      workPriceDenominatorUnits:2,plannedWholeUnits:20000,measurementUnit:'kWh'}],
    expenseIds:['gas'],invoiceTotalsCentsByReference:{GAS:218000}};
  return {p,plan};
}
const blocked=(change,code)=>{const {p,plan}=sample();change(p,plan);
  const r=reviewSupplyAccount(p,'year',plan);assert.equal(r.status,'blocked',JSON.stringify(r));
  assert.equal(r.report,null);assert.equal(r.issues[0].code,code);};
test('actual invoice, forecast and provider credit remain separate, source unchanged',()=>{
  const {p,plan}=sample(),before=JSON.stringify({p,plan});
  const r=reviewSupplyAccount(p,'year',plan);
  assert.equal(r.status,'reviewed');assert.equal(r.report.forecastCents,228000);
  assert.equal(r.report.actualOwnerCostsCents,218000);
  assert.equal(r.report.netProviderPaidCents,240000);
  assert.equal(r.report.providerDifferenceCents,22000);
  assert.equal(r.report.postedToExpenses,false);
  assert.equal(r.report.addedTenantCostsCents,0);
  assert.equal(JSON.stringify({p,plan}),before);
});
test('fractional cent contract work price uses exact integer ratio',()=>{
  const {p,plan}=sample();plan.priceVersions[0].plannedWholeUnits=1;
  const r=reviewSupplyAccount(p,'year',plan);
  assert.equal(r.report.forecastCents,18011);
});
test('price changes without versioned period coverage are not guessed',()=>{
  blocked((p,s)=>{s.priceVersions[0].validTo='2026-06-30';},'SUPPLY_FORECAST_UNCONFIRMED');
  blocked((p,s)=>{s.priceVersions.push({...s.priceVersions[0]});},'SUPPLY_FORECAST_UNCONFIRMED');
});
test('missing invoices, duplicate and altered totals block',()=>{
  blocked((p,s)=>{s.expenseIds=[];},'SUPPLY_INVOICE_INVENTORY');
  blocked((p,s)=>{p.expenses=[];s.expenseIds=[];s.invoiceTotalsCentsByReference={};},'SUPPLY_INVOICE_INVENTORY');
  blocked((p,s)=>{s.expenseIds=['gas','gas'];},'SUPPLY_INVOICE_INVENTORY');
  blocked((p,s)=>{s.invoiceTotalsCentsByReference.GAS=1000;},'SUPPLY_INVOICE_TOTAL_MISMATCH');
  blocked((p,s)=>{p.expenses[0].endDate='2026-11-30';},'SUPPLY_INVOICE_INVALID');
});
test('unresolved supplier cashflow blocks; refunds subtract from actual paid',()=>{
  blocked((p)=>{p.cashflows[0].accountingPeriodId='other';},'SUPPLY_PAYMENT_UNRESOLVED');
  const {p,plan}=sample();p.cashflows.push({id:'refund',kind:'provider_refund',
    propertyId:'house',providerAccountId:'supplier',accountingPeriodId:'year',amountCents:10000});
  const r=reviewSupplyAccount(p,'year',plan);
  assert.equal(r.report.netProviderPaidCents,230000);
  assert.equal(r.report.providerDifferenceCents,12000);
});
test('direct tenant contract never generates an owner charge',()=>{
  const {p,plan}=sample();p.expenses=[];p.cashflows=[];
  const direct={providerAccountId:'supplier',service:'gas',contractHolder:'tenant_direct',
    confirmed:true,unitId:'B',directSupplyConfirmed:true,expenseIds:[]};
  const r=reviewSupplyAccount(p,'year',direct);
  assert.equal(r.status,'reviewed');assert.equal(r.report.actualOwnerCostsCents,0);
  assert.equal(r.report.forecastGenerated,false);
});
test('direct tenant bill recorded as owner expense or payment blocks',()=>{
  blocked((p,s)=>{s.contractHolder='tenant_direct';s.unitId='B';s.directSupplyConfirmed=true;},
    'SUPPLY_DIRECT_CONTRACT_MIXED');
});
