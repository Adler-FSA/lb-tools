import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { previewSeparateThermalLandlord } from '../assets/js/landlord-thermal.js';

function fixture() {
  const p=createEmptyProject('thermal_ui');
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
  p.contractTerms.push({id:'term',tenancyId:'lease',startDate:'2026-01-01',endDate:null,operatingCostsModel:'advance',advanceCents:10000,allowedCostTypes:['heating','hot_water']});
  p.accountingPeriods.push({id:'y',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'});
  p.expenses.push(
    {id:'heatCost',propertyId:'house',category:'heating',classification:'allocatable',confirmedForAllocation:true,amountCents:120000,startDate:'2026-01-01',endDate:'2026-12-31'},
    {id:'hotCost',propertyId:'house',category:'hot_water',classification:'allocatable',confirmedForAllocation:true,amountCents:60000,startDate:'2026-01-01',endDate:'2026-12-31'}
  );
  for (const [id,unitId,service,start,end] of [
    ['ha','A','heating',100,400],['hb','B','heating',20,120],
    ['wa','A','hot_water',1,11],['wb','B','hot_water',4,34]
  ]) {
    p.meters.push({id,unitId,propertyId:'house',service,installedAt:'2025-01-01',
      measurementKind:service==='heating'?'heat_energy':'hot_water_volume',
      measurementUnit:service==='heating'?'kWh':'m3'});
    p.readings.push(
      {id:id+'s',meterId:id,date:'2026-01-01',value:start,readingType:'measured'},
      {id:id+'e',meterId:id,date:'2026-12-31',value:end,readingType:'measured'}
    );
  }
  const config={
    scopeConfirmed:true,costBasisConfirmed:true,co2CostsSeparateConfirmed:true,
    exceptionReviewedStandard:true,groupPreallocationNotRequired:true,
    heating:{enabled:true,consumptionPercent:70,mandatory70Applies:true,rateConfirmed:true,readingsConfirmed:true,measurementBasisConfirmed:true},
    hot_water:{enabled:true,consumptionPercent:60,mandatory70Applies:false,rateConfirmed:true,readingsConfirmed:true,measurementBasisConfirmed:true}
  };
  return {p,config};
}

test('explicit separate thermal confirmations produce read-only landlord preview',()=>{
  const {p,config}=fixture(); const before=JSON.stringify(p);
  const r=previewSeparateThermalLandlord(p,'y',config);
  assert.equal(r.status,'preview',JSON.stringify(r.issues));
  assert.equal(r.report.totalCostsCents,180000);
  assert.equal(r.report.ownerCostsCents,108000);
  assert.equal(r.report.tenants[0].costsCents,72000);
  assert.equal(r.report.legalRelease,false);
  assert.equal(r.report.pdfGenerated,false);
  assert.equal(JSON.stringify(p),before);
});

test('missing explicit confirmations block before thermal calculation',()=>{
  const {p,config}=fixture(); config.co2CostsSeparateConfirmed=false;
  const r=previewSeparateThermalLandlord(p,'y',config);
  assert.equal(r.status,'blocked');
  assert.equal(r.issues[0].code,'THERMAL_CONFIRMATIONS_REQUIRED');
});

test('missing unit meter blocks instead of estimating',()=>{
  const {p,config}=fixture(); p.meters=p.meters.filter(m=>m.id!=='hb');
  p.readings=p.readings.filter(r=>r.meterId!=='hb');
  const r=previewSeparateThermalLandlord(p,'y',config);
  assert.equal(r.status,'blocked');
  assert.equal(r.issues[0].code,'THERMAL_METER_MAPPING_INVALID');
});

test('absent service needs explicit confirmation',()=>{
  const {p,config}=fixture();
  p.expenses=p.expenses.filter(e=>e.category!=='hot_water');
  p.meters=p.meters.filter(m=>m.service!=='hot_water');
  p.readings=p.readings.filter(r=>p.meters.some(m=>m.id===r.meterId));
  config.hot_water={enabled:false,absentConfirmed:false};
  let r=previewSeparateThermalLandlord(p,'y',config);
  assert.equal(r.status,'blocked');
  assert.equal(r.issues[0].code,'THERMAL_ABSENCE_CONFIRMATION_REQUIRED');
  config.hot_water.absentConfirmed=true;
  r=previewSeparateThermalLandlord(p,'y',config);
  assert.equal(r.status,'preview',JSON.stringify(r.issues));
});


test('documented occupant change works only with explicit intermediate-reading confirmation',()=>{
  const {p,config}=fixture();
  p.usagePeriods.find(x=>x.id==='uB').endDate='2026-06-30';
  p.usagePeriods.push({id:'vacB',unitId:'B',kind:'vacant',startDate:'2026-07-01',endDate:null});
  p.readings.push(
    {id:'hbmid',meterId:'hb',date:'2026-07-01',value:70,readingType:'measured'},
    {id:'wbmid',meterId:'wb',date:'2026-07-01',value:18,readingType:'measured'}
  );

  let r=previewSeparateThermalLandlord(p,'y',config);
  assert.equal(r.status,'blocked');
  assert.ok(r.issues.some(i=>i.code==='THERMAL_USER_CHANGE_UNCONFIRMED'));

  config.heating.userChangeConfirmed=true;
  config.hot_water.userChangeConfirmed=true;
  r=previewSeparateThermalLandlord(p,'y',config);
  assert.equal(r.status,'preview',JSON.stringify(r.issues));
  assert.ok(r.report.streams.flatMap(s=>s.lines).flatMap(l=>l.unitShares)
    .some(s=>s.usagePeriodId==='vacB'));
});

test('user-change confirmation does not replace a missing intermediate reading',()=>{
  const {p,config}=fixture();
  p.usagePeriods.find(x=>x.id==='uB').endDate='2026-06-30';
  p.usagePeriods.push({id:'vacB',unitId:'B',kind:'vacant',startDate:'2026-07-01',endDate:null});
  config.heating.userChangeConfirmed=true;
  config.hot_water.userChangeConfirmed=true;
  const r=previewSeparateThermalLandlord(p,'y',config);
  assert.equal(r.status,'blocked');
  assert.ok(r.issues.some(i=>i.code==='METER_INTERMEDIATE_READING_REQUIRED'));
});


test('separately recorded CO2 does not poison the independent thermal preview',()=>{
  const {p,config}=fixture();
  p.expenses.push({
    id:'carbon',propertyId:'house',category:'co2',classification:'unresolved',
    amountCents:2001,startDate:'2026-01-01',endDate:'2026-12-31',
    invoiceReference:'GAS',invoiceLineId:'co2'
  });
  const before=JSON.stringify(p);
  const r=previewSeparateThermalLandlord(p,'y',config);
  assert.equal(r.status,'preview',JSON.stringify(r.issues));
  assert.equal(r.report.totalCostsCents,180000);
  assert.equal(JSON.stringify(p),before);
});
