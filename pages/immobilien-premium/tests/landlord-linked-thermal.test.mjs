import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { previewLinkedThermalLandlord } from '../assets/js/landlord-linked-thermal.js';

function fixture() {
  const p=createEmptyProject('linked_ui');
  p.properties.push({id:'house'});
  p.units.push(
    {id:'A',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:12000}]},
    {id:'B',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:8000}]}
  );
  p.usagePeriods.push(
    {id:'uA',unitId:'A',kind:'owner',startDate:'2026-01-01',endDate:null},
    {id:'uB',unitId:'B',kind:'tenant',tenancyId:'lease',startDate:'2026-01-01',endDate:null}
  );
  p.tenancies.push({id:'lease',unitId:'B',startDate:'2026-01-01',endDate:null});
  p.contractTerms.push({id:'term',tenancyId:'lease',startDate:'2026-01-01',endDate:null,
    operatingCostsModel:'advance',advanceCents:10000,allowedCostTypes:['heating','hot_water']});
  p.accountingPeriods.push({id:'y',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'});
  p.expenses.push(
    {id:'shared',propertyId:'house',category:'thermal_shared',classification:'allocatable',confirmedForAllocation:true,
      amountCents:180001,startDate:'2026-01-01',endDate:'2026-12-31',invoiceReference:'GAS',invoiceLineId:'fuel'},
    {id:'maintenance',propertyId:'house',category:'heating',classification:'allocatable',confirmedForAllocation:true,
      amountCents:10000,startDate:'2026-01-01',endDate:'2026-12-31',invoiceReference:'MAINT',invoiceLineId:'heat'},
    {id:'water',propertyId:'house',category:'hot_water',classification:'allocatable',confirmedForAllocation:true,
      amountCents:5000,startDate:'2026-01-01',endDate:'2026-12-31',invoiceReference:'MAINT',invoiceLineId:'water'},
    {id:'carbon',propertyId:'house',category:'co2',classification:'unresolved',amountCents:2000,
      startDate:'2026-01-01',endDate:'2026-12-31',invoiceReference:'GAS',invoiceLineId:'co2'}
  );
  for (const [id,unitId,service,start,end] of [
    ['ha','A','heating',100,400],['hb','B','heating',20,120],
    ['wa','A','hot_water',1,11],['wb','B','hot_water',4,34]
  ]) {
    p.meters.push({id,propertyId:'house',unitId,service,installedAt:'2025-01-01',
      measurementKind:service==='heating'?'heat_energy':'hot_water_volume',
      measurementUnit:service==='heating'?'kWh':'m3'});
    p.readings.push(
      {id:id+'s',meterId:id,date:'2026-01-01',value:start,readingType:'measured'},
      {id:id+'e',meterId:id,date:'2026-12-31',value:end,readingType:'measured'}
    );
  }
  const config={
    plantType:'gas_boiler',scopeConfirmed:true,invoiceInventoryConfirmed:true,co2ExcludedConfirmed:true,
    samePhysicalBasisConfirmed:true,methodReviewed:true,totalEnergyKWh:200,hotWaterEnergyKWh:50,
    totalEvidenceRef:'gas_invoice',hotWaterEvidenceRef:'heat_meter',
    invoiceTotalsCentsByReference:{GAS:182001,MAINT:15000},
    heating:{consumptionPercent:70,mandatory70Applies:true,rateConfirmed:true,readingsConfirmed:true,measurementBasisConfirmed:true},
    hot_water:{consumptionPercent:60,mandatory70Applies:false,rateConfirmed:true,readingsConfirmed:true,measurementBasisConfirmed:true}
  };
  return {p,config};
}

test('linked landlord adapter counts original invoices once and returns non-releasable preview',()=>{
  const {p,config}=fixture(); const before=JSON.stringify(p);
  const r=previewLinkedThermalLandlord(p,'y',config);
  assert.equal(r.status,'preview',JSON.stringify(r.issues));
  assert.equal(r.report.scope,'thermal_linked_subreport_only');
  assert.equal(r.report.totalCostsCents,195001);
  assert.equal(r.report.linkedCosts.excludedCo2Cents,2000);
  assert.equal(r.report.linkedCosts.originalCents,195001);
  assert.equal(r.report.legalRelease,false);
  assert.equal(r.report.pdfGenerated,false);
  assert.equal(JSON.stringify(p),before);
});

test('invoice total mismatch is blocked before release',()=>{
  const {p,config}=fixture(); config.invoiceTotalsCentsByReference.GAS=180001;
  const r=previewLinkedThermalLandlord(p,'y',config);
  assert.equal(r.status,'blocked');
  assert.ok(r.issues.some(i=>i.code==='LINKED_INVOICE_TOTAL_MISMATCH'));
});

test('missing warm-water meter blocks instead of estimating',()=>{
  const {p,config}=fixture();
  p.meters=p.meters.filter(m=>m.id!=='wb');
  p.readings=p.readings.filter(r=>r.meterId!=='wb');
  const r=previewLinkedThermalLandlord(p,'y',config);
  assert.equal(r.status,'blocked');
  assert.equal(r.issues[0].code,'LINKED_THERMAL_METER_MAPPING_INVALID');
});

test('common energy basis must be physically confirmed and hot water below total',()=>{
  const {p,config}=fixture(); config.hotWaterEnergyKWh=200;
  let r=previewLinkedThermalLandlord(p,'y',config);
  assert.equal(r.status,'blocked');
  assert.equal(r.issues[0].code,'LINKED_ENERGY_BASIS_INVALID');
  config.hotWaterEnergyKWh=50; config.samePhysicalBasisConfirmed=false;
  r=previewLinkedThermalLandlord(p,'y',config);
  assert.equal(r.status,'blocked');
  assert.equal(r.issues[0].code,'LINKED_CONFIRMATIONS_REQUIRED');
});

test('linked system requires at least one shared original cost position',()=>{
  const {p,config}=fixture();
  p.expenses=p.expenses.filter(e=>e.category!=='thermal_shared');
  delete config.invoiceTotalsCentsByReference.GAS;
  const r=previewLinkedThermalLandlord(p,'y',config);
  assert.equal(r.status,'blocked');
  assert.equal(r.issues[0].code,'LINKED_SHARED_COST_REQUIRED');
});
