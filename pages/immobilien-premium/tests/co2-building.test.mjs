import test from 'node:test';
import assert from 'node:assert/strict';
import { previewBuildingCo2 } from '../assets/js/co2-building.js';
function scenario() {
  const p={accountingPeriods:[{id:'year',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'}],
    units:[{id:'A',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:6000}]},
      {id:'B',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:4000}]}],
    expenses:[{id:'carbon',propertyId:'house',category:'co2',amountCents:2001,
      startDate:'2026-01-01',endDate:'2026-12-31',classification:'unresolved',
      invoiceReference:'GAS',invoiceLineId:'co2'},
      {id:'heat',propertyId:'house',category:'heating',amountCents:180000,
        startDate:'2026-01-01',endDate:'2026-12-31',classification:'allocatable'}],
    cashflows:[{kind:'provider_payment',amountCents:300000}]};
  const plan={scope:'residential_central_2026',applicabilityReviewed:true,
    specialHeatingCasesExcludedConfirmed:true,reductionExceptionsExcludedConfirmed:true,
    directTenantSupply:false,invoiceInventoryConfirmed:true,areaHundredthsM2:10000,
    areaBasisConfirmed:true,areaEvidenceRef:'living_areas',emissionsGrams:2400000,
    emissionsEvidenceRef:'gas_co2',emissionsPeriodConfirmed:true,
    co2ExpenseIds:['carbon'],confirmedInvoiceCo2Cents:2001};
  return {p,plan};
}
const block=(change,code)=>{const {p,plan}=scenario();change(p,plan);
  const r=previewBuildingCo2(p,'year',plan);assert.equal(r.status,'blocked',JSON.stringify(r));
  assert.equal(r.report,null);assert.equal(r.issues[0].code,code);};
test('MH08 annual area and emissions yield building stage, without tenant charges',()=>{
  const {p,plan}=scenario(),before=JSON.stringify({p,plan});
  const r=previewBuildingCo2(p,'year',plan);
  assert.equal(r.status,'calculated',JSON.stringify(r.issues));
  assert.equal(r.calculationReady,false);
  assert.equal(r.report.specificEmissionsTenthsKgPerM2Year,240);
  assert.equal(r.report.landlordPercent,30);
  assert.equal(r.report.otherPercent,70);
  assert.equal(r.report.originalInvoiceCents,2001);
  assert.equal(r.report.buildingLandlordPortionCents,600);
  assert.equal(r.report.unallocatedRemainderCents,1401);
  assert.equal(r.report.tenantAmountsAssigned,false);
  assert.equal(r.report.legalRelease,false);
  assert.equal(JSON.stringify({p,plan}),before);
});
test('tier thresholds at 12.0, 17.0, and 52.0 kg/m2/a',()=>{
  for (const [grams,percent] of [[1194999,0],[1195000,10],[1694999,10],[1695000,20],[5194999,80],[5195000,95]]) {
    const {p,plan}=scenario();plan.emissionsGrams=grams;
    const r=previewBuildingCo2(p,'year',plan);
    assert.equal(r.status,'calculated');assert.equal(r.report.landlordPercent,percent,String(grams));
  }
});
test('cent rounding is reproducible, total always conserved',()=>{
  const {p,plan}=scenario();p.expenses[0].amountCents=1;plan.confirmedInvoiceCo2Cents=1;
  const r=previewBuildingCo2(p,'year',plan);
  assert.equal(r.report.buildingLandlordPortionCents,0);
  assert.equal(r.report.unallocatedRemainderCents,1);
  assert.equal(r.report.originalInvoiceCents,1);
});
test('missing legally reviewed applicability and direct-tenant contracts block',()=>{
  block((p,s)=>{s.applicabilityReviewed=false;},'CO2_SCOPE_REVIEW_REQUIRED');
  block((p,s)=>{s.specialHeatingCasesExcludedConfirmed=false;},'CO2_SCOPE_REVIEW_REQUIRED');
  block((p,s)=>{s.reductionExceptionsExcludedConfirmed=false;},'CO2_SCOPE_REVIEW_REQUIRED');
  block((p,s)=>{s.directTenantSupply=true;},'CO2_SCOPE_REVIEW_REQUIRED');
});
test('short financial period, missing and changing building area block',()=>{
  block((p)=>{p.accountingPeriods[0].startDate='2026-02-01';},'CO2_PERIOD_UNSUPPORTED');
  block((p,s)=>{s.areaHundredthsM2=9999;},'CO2_AREA_UNCONFIRMED');
  block((p)=>{p.units[1].areaHistory[0].to='2026-06-30';},'CO2_AREA_UNSUPPORTED');
  block((p)=>{p.units[0].areaHistory.push({from:'2026-07-01',to:null,hundredthsM2:6000});},'CO2_AREA_UNSUPPORTED');
});
test('unconfirmed and unsafe emissions block',()=>{
  block((p,s)=>{s.emissionsPeriodConfirmed=false;},'CO2_EMISSIONS_UNCONFIRMED');
  block((p,s)=>{s.emissionsGrams=1.5;},'CO2_EMISSIONS_UNCONFIRMED');
  block((p,s)=>{delete s.emissionsEvidenceRef;},'CO2_EMISSIONS_UNCONFIRMED');
});
test('all invoice CO2 line items must be inventoried exactly once',()=>{
  block((p,s)=>{s.co2ExpenseIds.push('carbon');},'CO2_INVOICE_REQUIRED');
  block((p,s)=>{p.expenses.push({...p.expenses[0],id:'second',invoiceLineId:'extra'});},'CO2_INVENTORY_INCOMPLETE');
  block((p,s)=>{p.expenses.push({...p.expenses[0],id:'second'});s.co2ExpenseIds.push('second');s.confirmedInvoiceCo2Cents=4002;},'CO2_DUPLICATE_INVOICE_LINE');
  block((p,s)=>{s.confirmedInvoiceCo2Cents=2000;},'CO2_INVOICE_TOTAL_MISMATCH');
});
test('provider payments, ordinary heating bill and foreign property never added to CO2 costs',()=>{
  const {p,plan}=scenario();p.expenses.push({...p.expenses[0],id:'neighbor',propertyId:'neighbor'});
  const r=previewBuildingCo2(p,'year',plan);
  assert.equal(r.status,'calculated');assert.equal(r.report.originalInvoiceCents,2001);
  assert.deepEqual(r.report.originalExpenseIds,['carbon']);
});
