import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { previewLandlordCo2 } from '../assets/js/landlord-co2.js';
import { previewLinkedThermalLandlord } from '../assets/js/landlord-linked-thermal.js';

function fixture({owner=false}={}) {
  const p=createEmptyProject('co2_landlord');
  p.properties.push({id:'house'});
  p.units.push(
    {id:'A',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:6000}]},
    {id:'B',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:4000}]}
  );
  p.tenancies.push({id:'leaseA',unitId:'A',startDate:'2026-01-01',endDate:null},
    {id:'leaseB',unitId:'B',startDate:'2026-01-01',endDate:null});
  p.usagePeriods.push(
    owner ? {id:'useA',unitId:'A',kind:'owner',startDate:'2026-01-01',endDate:null}
          : {id:'useA',unitId:'A',kind:'tenant',tenancyId:'leaseA',startDate:'2026-01-01',endDate:null},
    {id:'useB',unitId:'B',kind:'tenant',tenancyId:'leaseB',startDate:'2026-01-01',endDate:null}
  );
  p.contractTerms.push(
    {id:'termA',tenancyId:'leaseA',startDate:'2026-01-01',endDate:null,operatingCostsModel:'advance',advanceCents:10000,allowedCostTypes:['heating']},
    {id:'termB',tenancyId:'leaseB',startDate:'2026-01-01',endDate:null,operatingCostsModel:'advance',advanceCents:10000,allowedCostTypes:['heating']}
  );
  p.accountingPeriods.push({id:'y',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'});
  p.expenses.push(
    {id:'heat',propertyId:'house',category:'heating',classification:'allocatable',confirmedForAllocation:true,amountCents:100001,startDate:'2026-01-01',endDate:'2026-12-31'},
    {id:'carbon',propertyId:'house',category:'co2',classification:'unresolved',amountCents:2001,startDate:'2026-01-01',endDate:'2026-12-31',invoiceReference:'GAS',invoiceLineId:'co2'}
  );
  for (const [id,unitId,start,end] of [['ha','A',0,60],['hb','B',0,40]]) {
    p.meters.push({id,unitId,propertyId:'house',service:'heating',installedAt:'2025-01-01',measurementKind:'heat_energy',measurementUnit:'kWh'});
    p.readings.push(
      {id:id+'s',meterId:id,date:'2026-01-01',value:start,readingType:'measured'},
      {id:id+'e',meterId:id,date:'2026-12-31',value:end,readingType:'measured'}
    );
  }
  const thermal={
    scopeConfirmed:true,costBasisConfirmed:true,co2CostsSeparateConfirmed:true,
    exceptionReviewedStandard:true,groupPreallocationNotRequired:true,
    heating:{enabled:true,consumptionPercent:70,mandatory70Applies:true,rateConfirmed:true,readingsConfirmed:true,measurementBasisConfirmed:true},
    hot_water:{enabled:false,absentConfirmed:true}
  };
  const config={
    applicabilityReviewed:true,specialHeatingCasesExcludedConfirmed:true,
    reductionExceptionsExcludedConfirmed:true,ownerCentralSupplyConfirmed:true,
    invoiceInventoryConfirmed:true,areaBasisConfirmed:true,areaEvidenceRef:'areas',
    emissionsGrams:2400000,emissionsEvidenceRef:'gas_invoice',emissionsPeriodConfirmed:true,
    confirmedInvoiceCo2Cents:2001,tenantAllocationRequested:true,
    tenantOnlyOccupancyConfirmed:true,thermalCostShareMethodReviewed:true,
    originalCo2ExcludedFromThermalConfirmed:true,distributionEvidenceRef:'thermal_2026'
  };
  return {p,thermal,config};
}

test('fully tenant occupied 2026 building reaches individual CO2 preview',()=>{
  const {p,thermal,config}=fixture(); const before=JSON.stringify(p);
  const r=previewLandlordCo2(p,'y',config,thermal);
  assert.equal(r.status,'tenant_preview',JSON.stringify(r.issues));
  assert.equal(r.buildingReport.originalInvoiceCents,2001);
  assert.equal(r.buildingReport.buildingLandlordPortionCents,600);
  assert.equal(r.tenantReport.tenantPoolCents,1401);
  assert.equal(r.tenantReport.tenants.reduce((n,t)=>n+t.provisionalCo2Cents,0),1401);
  assert.equal(r.legalRelease,false);
  assert.equal(JSON.stringify(p),before);
});

test('owner occupancy keeps building preview but blocks tenant allocation',()=>{
  const {p,thermal,config}=fixture({owner:true});
  const r=previewLandlordCo2(p,'y',config,thermal);
  assert.equal(r.status,'building_preview',JSON.stringify(r.issues));
  assert.ok(r.buildingReport);
  assert.equal(r.tenantReport,null);
  assert.ok(r.issues.some(i=>i.code==='CO2_THERMAL_REPORT_INVALID' || i.code==='CO2_OCCUPANCY_UNSUPPORTED'));
});

test('invoice total is explicit and mismatch blocks building preview',()=>{
  const {p,thermal,config}=fixture(); config.confirmedInvoiceCo2Cents=2000;
  const r=previewLandlordCo2(p,'y',config,thermal);
  assert.equal(r.status,'blocked');
  assert.equal(r.issues[0].code,'CO2_INVOICE_TOTAL_MISMATCH');
});

test('without tenant allocation request building classification remains isolated',()=>{
  const {p,thermal,config}=fixture(); config.tenantAllocationRequested=false;
  const r=previewLandlordCo2(p,'y',config,thermal);
  assert.equal(r.status,'building_preview');
  assert.equal(r.tenantReport,null);
  assert.equal(r.buildingReport.tenantAmountsAssigned,false);
});

test('unsupported year remains blocked',()=>{
  const {p,thermal,config}=fixture();
  p.accountingPeriods[0].startDate='2025-01-01';
  p.accountingPeriods[0].endDate='2025-12-31';
  const r=previewLandlordCo2(p,'y',config,thermal);
  assert.equal(r.status,'blocked');
  assert.equal(r.issues[0].code,'CO2_PERIOD_UNSUPPORTED');
});


function linkedTenantFixture() {
  const p=createEmptyProject('co2_linked_tenants');
  p.properties.push({id:'house'});
  p.units.push(
    {id:'A',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:6000}]},
    {id:'B',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:4000}]}
  );
  p.tenancies.push(
    {id:'leaseA',unitId:'A',partyLabel:'A',startDate:'2026-01-01',endDate:null},
    {id:'leaseB',unitId:'B',partyLabel:'B',startDate:'2026-01-01',endDate:null}
  );
  p.usagePeriods.push(
    {id:'useA',unitId:'A',kind:'tenant',tenancyId:'leaseA',startDate:'2026-01-01',endDate:null},
    {id:'useB',unitId:'B',kind:'tenant',tenancyId:'leaseB',startDate:'2026-01-01',endDate:null}
  );
  p.contractTerms.push(
    {id:'termA',tenancyId:'leaseA',startDate:'2026-01-01',endDate:null,operatingCostsModel:'advance',advanceCents:10000,allowedCostTypes:['heating','hot_water']},
    {id:'termB',tenancyId:'leaseB',startDate:'2026-01-01',endDate:null,operatingCostsModel:'advance',advanceCents:10000,allowedCostTypes:['heating','hot_water']}
  );
  p.accountingPeriods.push({id:'y',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'});
  p.expenses.push(
    {id:'shared',propertyId:'house',category:'thermal_shared',classification:'allocatable',confirmedForAllocation:true,
      amountCents:100001,startDate:'2026-01-01',endDate:'2026-12-31',invoiceReference:'GAS',invoiceLineId:'energy'},
    {id:'carbon',propertyId:'house',category:'co2',classification:'unresolved',
      amountCents:2001,startDate:'2026-01-01',endDate:'2026-12-31',invoiceReference:'GAS',invoiceLineId:'co2'}
  );
  for (const [id,unitId,service,start,end] of [
    ['ha','A','heating',0,60],['hb','B','heating',0,40],
    ['wa','A','hot_water',0,30],['wb','B','hot_water',0,20]
  ]) {
    p.meters.push({id,unitId,propertyId:'house',service,installedAt:'2025-01-01',
      measurementKind:service==='heating'?'heat_energy':'hot_water_volume',
      measurementUnit:service==='heating'?'kWh':'m3'});
    p.readings.push(
      {id:id+'s',meterId:id,date:'2026-01-01',value:start,readingType:'measured'},
      {id:id+'e',meterId:id,date:'2026-12-31',value:end,readingType:'measured'}
    );
  }
  const linkedConfig={
    plantType:'gas_boiler',scopeConfirmed:true,invoiceInventoryConfirmed:true,co2ExcludedConfirmed:true,
    samePhysicalBasisConfirmed:true,methodReviewed:true,totalEnergyKWh:100,hotWaterEnergyKWh:25,
    totalEvidenceRef:'gas_energy',hotWaterEvidenceRef:'ww_energy',
    invoiceTotalsCentsByReference:{GAS:102002},
    heating:{consumptionPercent:70,mandatory70Applies:true,rateConfirmed:true,readingsConfirmed:true,measurementBasisConfirmed:true},
    hot_water:{consumptionPercent:60,mandatory70Applies:false,rateConfirmed:true,readingsConfirmed:true,measurementBasisConfirmed:true}
  };
  const co2Config={
    applicabilityReviewed:true,specialHeatingCasesExcludedConfirmed:true,
    reductionExceptionsExcludedConfirmed:true,ownerCentralSupplyConfirmed:true,
    invoiceInventoryConfirmed:true,areaBasisConfirmed:true,areaEvidenceRef:'areas',
    emissionsGrams:2400000,emissionsEvidenceRef:'gas_invoice',emissionsPeriodConfirmed:true,
    confirmedInvoiceCo2Cents:2001,tenantAllocationRequested:true,
    tenantOnlyOccupancyConfirmed:true,thermalCostShareMethodReviewed:true,
    originalCo2ExcludedFromThermalConfirmed:true,distributionEvidenceRef:'linked_thermal'
  };
  return {p,linkedConfig,co2Config};
}

test('linked thermal preview can feed the individual CO2 tenant path without a fake separate plan',()=>{
  const {p,linkedConfig,co2Config}=linkedTenantFixture();
  const linked=previewLinkedThermalLandlord(p,'y',linkedConfig);
  assert.equal(linked.status,'preview',JSON.stringify(linked.issues));
  assert.equal(linked.report.ownerCostsCents,0);
  const r=previewLandlordCo2(p,'y',co2Config,linked);
  assert.equal(r.status,'tenant_preview',JSON.stringify(r.issues));
  assert.equal(r.tenantReport.tenantPoolCents,1401);
  assert.equal(r.tenantReport.tenants.reduce((sum,row)=>sum+row.provisionalCo2Cents,0),1401);
  assert.ok(r.co2BuildingPlan);
  assert.ok(r.co2TenantPlan);
});
