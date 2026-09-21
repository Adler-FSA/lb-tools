import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLinkedThermalAudited } from '../assets/js/thermal-linked-audit.js';

function fixture() {
  const project = { projectId: 'example',
    accountingPeriods: [{id:'year',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'}],
    expenses: [
      {id:'fuel',propertyId:'house',category:'thermal_shared',amountCents:180001,startDate:'2026-01-01',endDate:'2026-12-31',classification:'allocatable',confirmedForAllocation:true,invoiceReference:'GAS',invoiceLineId:'fuel'},
      {id:'heatService',propertyId:'house',category:'heating',amountCents:10000,startDate:'2026-01-01',endDate:'2026-12-31',classification:'allocatable',confirmedForAllocation:true,invoiceReference:'SERV',invoiceLineId:'heat'},
      {id:'waterService',propertyId:'house',category:'hot_water',amountCents:5000,startDate:'2026-01-01',endDate:'2026-12-31',classification:'allocatable',confirmedForAllocation:true,invoiceReference:'SERV',invoiceLineId:'water'},
      {id:'carbon',propertyId:'house',category:'co2',amountCents:2000,startDate:'2026-01-01',endDate:'2026-12-31',classification:'unresolved',invoiceReference:'GAS',invoiceLineId:'carbon'}
    ],cashflows:[{id:'payment',kind:'provider_payment',amountCents:300000}] };
  const linked = {system:'linked',plantType:'gas_boiler',scopeConfirmed:true,invoiceInventoryConfirmed:true,co2ExcludedConfirmed:true,
    invoiceTotalsCentsByReference:{GAS:182001,SERV:15000},sharedExpenseIds:['fuel'],heatingOnlyExpenseIds:['heatService'],
    hotWaterOnlyExpenseIds:['waterService'],co2ExpenseIds:['carbon'],basis:{kind:'fuel_energy',unit:'milli_kWh',
      totalMilliKWh:200000,hotWaterMilliKWh:50000,totalEvidenceRef:'gasbill',hotWaterEvidenceRef:'meter',samePhysicalBasisConfirmed:true,methodReviewed:true}};
  const thermal = {system:'separate',linkedTransferConfirmed:true,streams:[{kind:'heating'},{kind:'hot_water'}]};
  const goodEngine = () => ({status:'calculated',report:{scope:'thermal_subreport_only',totalCostsCents:195001,
    ownerCostsCents:130000,tenants:[{tenancyId:'lease',costsCents:65001}],
    streams:[{kind:'heating',totalCents:145001,lines:[{expenseId:'derived_linked_heating',amountCents:145001,
      baseCents:45000,consumptionCents:100001,unitShares:[
        {unitId:'A',kind:'owner',baseCents:30000,consumptionCents:70000,cents:100000},
        {unitId:'B',kind:'tenant',tenancyId:'lease',baseCents:15000,consumptionCents:30001,cents:45001}]}]},
      {kind:'hot_water',totalCents:50000,lines:[{expenseId:'derived_linked_hot_water',amountCents:50000,
        baseCents:20000,consumptionCents:30000,unitShares:[
          {unitId:'A',kind:'owner',baseCents:12000,consumptionCents:18000,cents:30000},
          {unitId:'B',kind:'tenant',tenancyId:'lease',baseCents:8000,consumptionCents:12000,cents:20000}]}]}],
    combinedWithOtherCosts:false,co2Calculated:false,legalRelease:false,pdfGenerated:false}});
  return {project,linked,thermal,goodEngine};
}
function audit(change, expected='LINKED_LINE_AUDIT_FAILED') {
  const {project,linked,thermal,goodEngine}=fixture();
  const result=calculateLinkedThermalAudited(project,'year',linked,thermal,(...args)=>{
    const value=goodEngine(...args); change(value,project,linked,thermal); return value;
  });
  assert.equal(result.status,'blocked');
  assert.equal(result.report,null);
  assert.equal(result.issues[0].code,expected);
}
test('audited bridge accepts complete immutable per-expense and tenant reconciliation',()=>{
  const {project,linked,thermal,goodEngine}=fixture();
  const original=JSON.stringify({project,linked,thermal});
  const result=calculateLinkedThermalAudited(project,'year',linked,thermal,goodEngine);
  assert.equal(result.status,'calculated',JSON.stringify(result.issues));
  assert.equal(result.report.linkedCosts.excludedCo2Cents,2000);
  assert.equal(result.report.legalRelease,false);
  assert.equal(JSON.stringify({project,linked,thermal}),original);
});
test('does not accept engine stubs without item-level proof',()=>{
  audit(r=>{delete r.report.streams[0].lines;});
  audit(r=>{r.report.streams[0].lines=[];});
});
test('derived invoices must be precisely the two calculated cost pools',()=>{
  audit(r=>{r.report.streams[0].lines[0].expenseId='fuel';});
  audit(r=>{r.report.streams[0].lines[0].amountCents++;});
  audit(r=>{r.report.streams[0].lines[0].baseCents++;});
});
test('even offsetting cent errors in individual unit shares block',()=>{
  audit(r=>{const s=r.report.streams[0].lines[0].unitShares;s[0].cents++;s[1].cents--;});
  audit(r=>{const s=r.report.streams[0].lines[0].unitShares;s[0].baseCents++;s[1].baseCents--;});
});
test('tenant ledger must equal itemized tenant entries',()=>{
  audit(r=>{r.report.tenants[0].costsCents++;r.report.ownerCostsCents--;});
  audit(r=>{r.report.tenants[0].tenancyId='different';});
  audit(r=>{r.report.tenants.push({...r.report.tenants[0]});},'LINKED_THERMAL_RECONCILIATION_FAILED');
});
test('owner unit shares and IDs must be traceable',()=>{
  audit(r=>{r.report.streams[0].lines[0].unitShares[0].kind='tenant';});
  audit(r=>{r.report.streams[0].lines[0].unitShares[0].unitId='';});
});
test('upstream failures are passed through as blocked and not masked',()=>{
  const {project,linked,thermal,goodEngine}=fixture();
  thermal.linkedTransferConfirmed=false;
  const r=calculateLinkedThermalAudited(project,'year',linked,thermal,goodEngine);
  assert.equal(r.status,'blocked');assert.equal(r.issues[0].code,'LINKED_TRANSFER_UNCONFIRMED');
});
