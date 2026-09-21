import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewSupplyRegistry } from '../assets/js/supply-registry.js';
function fixture() {
  const p = { accountingPeriods: [{id:'year',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'}],
    units: [{id:'A',propertyId:'house'},{id:'B',propertyId:'house'}],
    expenses: [{id:'gas',propertyId:'house',providerAccountId:'gasSupplier',category:'heating',
      startDate:'2026-01-01',endDate:'2026-12-31',amountCents:218000,
      classification:'allocatable',supplyManaged:true,invoiceReference:'GAS2026',invoiceLineId:'energy'},
      {id:'tax',propertyId:'house',providerAccountId:'city',category:'property_tax',
      startDate:'2026-01-01',endDate:'2026-12-31',amountCents:10000}],
    cashflows: [{id:'paid',kind:'provider_payment',propertyId:'house',providerAccountId:'gasSupplier',
      accountingPeriodId:'year',amountCents:240000}] };
  const records = [{id:'contract2026',propertyId:'house',accountingPeriodId:'year',confirmed:true,contract:{
    providerAccountId:'gasSupplier',service:'gas',contractHolder:'owner',confirmed:true,
    priceVersions:[{validFrom:'2026-01-01',validTo:'2026-12-31',confirmed:true,
      referenceId:'contractRef',baseCentsPerPeriod:18000,workPriceNumeratorCents:21,
      workPriceDenominatorUnits:2,plannedWholeUnits:20000,measurementUnit:'kWh'}],
    expenseIds:['gas'],invoiceTotalsCentsByReference:{GAS2026:218000}}}];
  return {p,records};
}
const blocked=(change,code)=>{const {p,records}=fixture();change(p,records);
  const r=reviewSupplyRegistry(p,'year',records);assert.equal(r.status,'blocked',JSON.stringify(r));
  assert.equal(r.report,null);assert.equal(r.issues[0].code,code);};
test('year contracts review original gas invoice, forecast and actual payments separately',()=>{
  const {p,records}=fixture(),before=JSON.stringify({p,records});
  const r=reviewSupplyRegistry(p,'year',records);
  assert.equal(r.status,'reviewed',JSON.stringify(r.issues));
  assert.equal(r.report.accounts[0].actualOwnerCostsCents,218000);
  assert.equal(r.report.accounts[0].netProviderPaidCents,240000);
  assert.equal(r.report.accounts[0].forecastCents,228000);
  assert.deepEqual(r.report.unreviewedProviderAccountIds,['city']);
  assert.equal(r.report.persisted,false);
  assert.equal(JSON.stringify({p,records}),before);
});
test('two records may not claim same supplier account or copy one invoice',()=>{
  blocked((p,r)=>{r.push({...r[0],id:'another'});},'SUPPLY_REGISTRY_DUPLICATE_ACCOUNT');
  blocked((p,r)=>{r.push({...r[0]});},'SUPPLY_REGISTRY_DUPLICATE_RECORD');
});
test('missing managed supplier is blocked; unrelated municipal tax not misrepresented',()=>{
  blocked((p,r)=>{r[0].contract.expenseIds=[];},'SUPPLY_INVOICE_INVENTORY');
  blocked((p,r)=>{p.expenses.push({...p.expenses[0],id:'gasExtra',invoiceReference:'GAS2'});},'SUPPLY_INVOICE_INVENTORY');
  blocked((p,r)=>{p.expenses.push({...p.expenses[0],id:'water',providerAccountId:'waterSupplier',invoiceReference:'WATER2026'});},
    'SUPPLY_REGISTRY_INVENTORY_INCOMPLETE');
});
test('direct tenant supplier must refer to real unit and never charge owner',()=>{
  const {p,records}=fixture();p.expenses=[];p.cashflows=[];
  records[0].contract={providerAccountId:'directGas',service:'gas',contractHolder:'tenant_direct',
    confirmed:true,directSupplyConfirmed:true,unitId:'B',expenseIds:[]};
  assert.equal(reviewSupplyRegistry(p,'year',records).status,'reviewed');
  records[0].contract.unitId='unknown';
  assert.equal(reviewSupplyRegistry(p,'year',records).issues[0].code,'SUPPLY_REGISTRY_DIRECT_UNIT_INVALID');
});
test('wrong building, unconfirmed next year and invoice mismatch prevent review',()=>{
  blocked((p,r)=>{r[0].propertyId='other';},'SUPPLY_REGISTRY_RECORD_INVALID');
  blocked((p,r)=>{p.accountingPeriods[0].reviewRequired=true;},'SUPPLY_REGISTRY_YEAR_UNCONFIRMED');
  blocked((p,r)=>{r[0].contract.invoiceTotalsCentsByReference.GAS2026++;},'SUPPLY_INVOICE_TOTAL_MISMATCH');
});
