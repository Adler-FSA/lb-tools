import test from 'node:test';
import assert from 'node:assert/strict';
import { previewTenantCo2 } from '../assets/js/co2-tenants.js';

function sample() {
  const project = {
    accountingPeriods: [{ id:'year',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31' }],
    units: [
      { id:'A',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:6000}] },
      { id:'B',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:4000}] }
    ],
    tenancies: [{id:'leaseA',unitId:'A'}, {id:'leaseB',unitId:'B'}],
    usagePeriods: [
      {id:'useA',unitId:'A',kind:'tenant',tenancyId:'leaseA',startDate:'2026-01-01',endDate:null},
      {id:'useB',unitId:'B',kind:'tenant',tenancyId:'leaseB',startDate:'2026-01-01',endDate:null}
    ],
    expenses: [
      {id:'carbon',propertyId:'house',category:'co2',amountCents:2001,startDate:'2026-01-01',
        endDate:'2026-12-31',classification:'unresolved',invoiceReference:'GAS',invoiceLineId:'co2'}
    ]
  };
  const co2Plan = {scope:'residential_central_2026',applicabilityReviewed:true,
    specialHeatingCasesExcludedConfirmed:true,reductionExceptionsExcludedConfirmed:true,
    directTenantSupply:false,invoiceInventoryConfirmed:true,areaHundredthsM2:10000,
    areaBasisConfirmed:true,areaEvidenceRef:'area',emissionsGrams:2400000,
    emissionsEvidenceRef:'invoice',emissionsPeriodConfirmed:true,
    co2ExpenseIds:['carbon'],confirmedInvoiceCo2Cents:2001};
  const thermalResult = { status:'calculated', report:{
    periodId:'year',propertyId:'house',scope:'thermal_subreport_only',totalCostsCents:100001,
    ownerCostsCents:0,tenants:[{tenancyId:'leaseA',costsCents:60001},{tenancyId:'leaseB',costsCents:40000}],
    streams:[{kind:'heating',totalCents:100001,lines:[{expenseId:'heat',amountCents:100001,
      unitShares:[{kind:'tenant',unitId:'A',tenancyId:'leaseA',cents:60001},
        {kind:'tenant',unitId:'B',tenancyId:'leaseB',cents:40000}]}]}],
    legalRelease:false,pdfGenerated:false,co2Calculated:false,combinedWithOtherCosts:false
  }};
  const plan = {distributionMethod:'thermal_cost_shares',methodReviewed:true,
    tenantOnlyOccupancyConfirmed:true,originalCo2ExcludedFromThermalConfirmed:true,
    distributionEvidenceRef:'heating_allocation_2026'};
  return {project,co2Plan,thermalResult,plan};
}
function blocked(change, code) {
  const args = sample(); change(args);
  const r = previewTenantCo2(args.project,'year',args.co2Plan,args.thermalResult,args.plan);
  assert.equal(r.status,'blocked',JSON.stringify(r));
  assert.equal(r.report,null);
  assert.ok(r.issues.some(i=>i.code===code),`${code}: ${JSON.stringify(r.issues)}`);
}
test('MH08: only fully tenanted building generates individual non-posting CO2 preview',()=>{
  const a=sample(); const before=JSON.stringify(a);
  const r=previewTenantCo2(a.project,'year',a.co2Plan,a.thermalResult,a.plan);
  assert.equal(r.status,'preview',JSON.stringify(r.issues));
  assert.equal(r.calculationReady,false);
  assert.equal(r.report.originalInvoiceCents,2001);
  assert.equal(r.report.landlordPortionCents,600);
  assert.equal(r.report.tenantPoolCents,1401);
  assert.deepEqual(r.report.tenants.map(t=>t.provisionalCo2Cents),[841,560]);
  assert.equal(r.report.actualCostsPosted,false);
  assert.equal(r.report.legalRelease,false);
  assert.equal(JSON.stringify(a),before);
});
test('owner-occupied unit, vacancy, missing tenancy or gaps block instead of allocating their CO2 to tenants',()=>{
  blocked(a=>{a.project.usagePeriods[0].kind='owner';},'CO2_OCCUPANCY_UNSUPPORTED');
  blocked(a=>{a.project.usagePeriods[0].kind='vacant';},'CO2_OCCUPANCY_UNSUPPORTED');
  blocked(a=>{a.project.usagePeriods[0].startDate='2026-01-02';},'CO2_OCCUPANCY_UNSUPPORTED');
  blocked(a=>{a.project.usagePeriods[0].endDate='2026-06-30';},'CO2_OCCUPANCY_UNSUPPORTED');
  blocked(a=>{a.project.tenancies[0].unitId='B';},'CO2_OCCUPANCY_UNSUPPORTED');
});
test('continuous tenant change is supported only with existing separate verified thermal ledger',()=>{
  const a=sample();a.project.tenancies.push({id:'leaseA2',unitId:'A'});
  a.project.usagePeriods[0].endDate='2026-06-30';
  a.project.usagePeriods.push({id:'useA2',unitId:'A',kind:'tenant',tenancyId:'leaseA2',startDate:'2026-07-01',endDate:null});
  const shares=a.thermalResult.report.streams[0].lines[0].unitShares;
  shares[0]={kind:'tenant',unitId:'A',tenancyId:'leaseA',cents:30000};
  shares.push({kind:'tenant',unitId:'A',tenancyId:'leaseA2',cents:30001});
  a.thermalResult.report.tenants=[{tenancyId:'leaseA',costsCents:30000},{tenancyId:'leaseA2',costsCents:30001},{tenancyId:'leaseB',costsCents:40000}];
  const r=previewTenantCo2(a.project,'year',a.co2Plan,a.thermalResult,a.plan);
  assert.equal(r.status,'preview',JSON.stringify(r.issues));
  assert.equal(r.report.tenants.reduce((n,t)=>n+t.provisionalCo2Cents,0),1401);
});
test('missing applicability, unconfirmed method, unconfirmed original expense inventory always block',()=>{
  blocked(a=>{a.co2Plan.applicabilityReviewed=false;},'CO2_SCOPE_REVIEW_REQUIRED');
  blocked(a=>{a.plan.methodReviewed=false;},'CO2_TENANT_METHOD_REQUIRED');
  blocked(a=>{a.plan.distributionEvidenceRef='';},'CO2_TENANT_METHOD_REQUIRED');
  blocked(a=>{a.plan.originalCo2ExcludedFromThermalConfirmed=false;},'CO2_TENANT_METHOD_REQUIRED');
});
test('CO2 line must not appear again in thermal expenses, including hidden second stream',()=>{
  blocked(a=>{a.thermalResult.report.streams[0].lines[0].expenseId='carbon';},'CO2_TENANT_RECONCILIATION_FAILED');
  blocked(a=>{a.thermalResult.report.streams.push({...a.thermalResult.report.streams[0]});},'CO2_TENANT_RECONCILIATION_FAILED');
});
test('linked bridge CO2 exclusions must agree with original CO2 invoice',()=>{
  const a=sample();a.thermalResult.report.scope='thermal_linked_subreport_only';
  a.thermalResult.report.linkedCosts={excludedCo2Cents:2001,excludedCo2ExpenseIds:['carbon']};
  assert.equal(previewTenantCo2(a.project,'year',a.co2Plan,a.thermalResult,a.plan).status,'preview');
  a.thermalResult.report.linkedCosts.excludedCo2Cents++;
  assert.equal(previewTenantCo2(a.project,'year',a.co2Plan,a.thermalResult,a.plan).issues[0].code,'CO2_SOURCE_MISMATCH');
  a.thermalResult.report.linkedCosts.excludedCo2Cents--;
  a.thermalResult.report.linkedCosts.excludedCo2ExpenseIds=['different'];
  assert.equal(previewTenantCo2(a.project,'year',a.co2Plan,a.thermalResult,a.plan).issues[0].code,'CO2_SOURCE_MISMATCH');
});
test('fraudulent or incomplete tenant totals, owner costs, wrong property are rejected',()=>{
  blocked(a=>{a.thermalResult.report.tenants[0].costsCents++;},'CO2_TENANT_RECONCILIATION_FAILED');
  blocked(a=>{a.thermalResult.report.streams[0].lines[0].unitShares[0].cents++;},'CO2_TENANT_RECONCILIATION_FAILED');
  blocked(a=>{a.thermalResult.report.ownerCostsCents=1;},'CO2_THERMAL_REPORT_INVALID');
  blocked(a=>{a.thermalResult.report.propertyId='other';},'CO2_THERMAL_REPORT_INVALID');
  blocked(a=>{a.thermalResult.report.legalRelease=true;},'CO2_THERMAL_REPORT_INVALID');
});
test('zero heating allocation or zero CO2 cents cannot generate unjustified tenant amount',()=>{
  blocked(a=>{a.thermalResult.report.totalCostsCents=0;},'CO2_THERMAL_REPORT_INVALID');
  const a=sample();a.project.expenses[0].amountCents=0;a.co2Plan.confirmedInvoiceCo2Cents=0;
  const r=previewTenantCo2(a.project,'year',a.co2Plan,a.thermalResult,a.plan);
  assert.equal(r.status,'preview',JSON.stringify(r.issues));
  assert.ok(r.report.tenants.every(t=>t.provisionalCo2Cents===0));
});
test('stable ID tie-break distributes odd cent without losing a cent',()=>{
  const a=sample();a.co2Plan.emissionsGrams=4800000; // landlord 95% at >= 52? actual 48 kg -> 80%, pool 20%
  a.co2Plan.emissionsGrams=2400000;
  a.project.expenses[0].amountCents=1;a.co2Plan.confirmedInvoiceCo2Cents=1;
  const r=previewTenantCo2(a.project,'year',a.co2Plan,a.thermalResult,a.plan);
  assert.equal(r.status,'preview');
  assert.equal(r.report.tenants.reduce((n,t)=>n+t.provisionalCo2Cents,0),1);
});
