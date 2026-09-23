import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { previewLandlordPeriod } from '../assets/js/landlord-preview.js';

function fixture() {
  const p=createEmptyProject('landlord_preview');
  p.properties.push({id:'house'});
  p.units.push(
    {id:'A',propertyId:'house',label:'Eigentümer',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:12000}]},
    {id:'B',propertyId:'house',label:'Wohnung B',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:8000}]}
  );
  p.usagePeriods.push(
    {id:'uA',unitId:'A',kind:'owner',startDate:'2026-01-01',endDate:null},
    {id:'uB',unitId:'B',kind:'tenant',tenancyId:'lease',startDate:'2026-01-01',endDate:null}
  );
  p.tenancies.push({id:'lease',unitId:'B',partyLabel:'Muster',startDate:'2026-01-01',endDate:null});
  p.contractTerms.push({id:'term',tenancyId:'lease',startDate:'2026-01-01',endDate:null,operatingCostsModel:'advance',advanceCents:10000,allowedCostTypes:['property_tax']});
  p.accountingPeriods.push({id:'y',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31',confirmedTenancyIds:['lease']});
  p.expenses.push({id:'tax',propertyId:'house',category:'property_tax',classification:'allocatable',confirmedForAllocation:true,amountCents:60000,startDate:'2026-01-01',endDate:'2026-12-31'});
  p.allocationRules.push({id:'rule',expenseId:'tax',accountingPeriodId:'y',method:'area',methodConfirmed:true});
  p.cashflows.push({id:'paid',kind:'tenant_payment',tenancyId:'lease',accountingPeriodId:'y',purpose:'operating_cost_advance',amountCents:120000,date:'2026-12-01'});
  return p;
}

test('preview returns individual tenant result without release',()=>{
  const p=fixture(), before=JSON.stringify(p);
  const r=previewLandlordPeriod(p,'y');
  assert.equal(r.status,'preview',JSON.stringify(r));
  assert.equal(r.report.totalCostsCents,60000);
  assert.equal(r.report.ownerCostsCents,36000);
  assert.equal(r.report.tenantCostsCents,24000);
  assert.equal(r.report.tenants[0].partyLabel,'Muster');
  assert.equal(r.report.tenants[0].unitLabel,'Wohnung B');
  assert.equal(r.report.tenants[0].creditCents,96000);
  assert.equal(r.report.legalRelease,false);
  assert.equal(r.report.pdfGenerated,false);
  assert.equal(JSON.stringify(p),before);
});

test('missing allocation remains a blocker',()=>{
  const p=fixture(); p.allocationRules=[];
  const r=previewLandlordPeriod(p,'y');
  assert.equal(r.status,'blocked');
  assert.ok(r.issues.some(x=>x.code==='ALLOCATION_RULE_REQUIRED'));
});
