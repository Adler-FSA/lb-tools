import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyProject} from '../assets/js/model.js';
import {createRentalDocumentDraft} from '../assets/js/rental-service.js';
import {upsertSafetyCheck} from '../assets/js/safety-checks.js';
import {createLettingProcess} from '../assets/js/letting-check.js';
import {
  serviceDraftSnapshot,ownerAnnualSnapshot,tenantStatementSnapshot,ownerSafetySnapshot,lettingChecklistSnapshot,DocumentSourceError
} from '../assets/js/document-sources.js';

function fixture(){
  const p=createEmptyProject('sources');
  p.properties.push({id:'p1',label:'Musterhaus',address:{street:'Testweg',houseNumber:'1',postalCode:'12345',city:'Musterstadt'}});
  p.units.push(
    {id:'owner',propertyId:'p1',label:'Eigentümer',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:12000}]},
    {id:'u1',propertyId:'p1',label:'Wohnung 1',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:8000}]}
  );
  p.tenancies.push({id:'t1',unitId:'u1',partyLabel:'Muster',startDate:'2026-01-01',endDate:null});
  p.usagePeriods.push(
    {id:'ownuse',unitId:'owner',kind:'owner',startDate:'2026-01-01',endDate:null},
    {id:'tenuse',unitId:'u1',kind:'tenant',tenancyId:'t1',startDate:'2026-01-01',endDate:null}
  );
  p.accountingPeriods.push({id:'y26',propertyId:'p1',startDate:'2026-01-01',endDate:'2026-12-31',confirmedTenancyIds:['t1']});
  p.contractTerms.push({id:'term1',tenancyId:'t1',startDate:'2026-01-01',endDate:null,operatingCostsModel:'advance',advanceCents:10000,allowedCostTypes:['property_tax']});
  p.expenses.push({id:'tax',propertyId:'p1',category:'property_tax',classification:'allocatable',confirmedForAllocation:true,
    amountCents:60000,startDate:'2026-01-01',endDate:'2026-12-31',invoiceReference:'TAX',invoiceLineId:'line1'});
  p.allocationRules.push({id:'rule',expenseId:'tax',accountingPeriodId:'y26',method:'area',methodConfirmed:true});
  p.cashflows.push({id:'pay1',kind:'tenant_payment',tenancyId:'t1',accountingPeriodId:'y26',purpose:'operating_cost_advance',amountCents:120000,date:'2026-12-01'});
  return p;
}
test('Mietservice-Entwurf wird als neutraler Snapshot übernommen',()=>{
  let p=fixture();
  p=createRentalDocumentDraft(p,{documentId:'sd1',type:'tenant_service_sheet',propertyId:'p1',unitId:'u1',tenancyId:'t1',createdOn:'2026-09-24',fields:{purpose:'Termin',message:'Bitte melden'}}).project;
  const r=serviceDraftSnapshot(p,'sd1');
  assert.equal(r.documentType,'tenant_service_sheet');assert.equal(r.tenancyId,'t1');assert.equal(r.snapshot.payload.purpose,'Termin');
});
test('Eigentümer-Jahresübersicht verwendet bestehenden vollständigen Jahrescheck',()=>{
  const r=ownerAnnualSnapshot(fixture(),{propertyId:'p1',periodId:'y26'});
  assert.equal(r.snapshot.report.actualCostsCents,60000);
  assert.equal(r.snapshot.readiness.ownerCostsCents,36000);
  assert.equal(r.snapshot.readiness.tenantCostsCents,24000);
  assert.equal(r.snapshot.period.id,'y26');
});
test('Ungeklärte Jahresbasis sperrt Eigentümer-Dokument statt sie freizugeben',()=>{
  const p=fixture();p.expenses[0].classification='unresolved';p.expenses[0].confirmedForAllocation=false;p.allocationRules=[];
  assert.throws(()=>ownerAnnualSnapshot(p,{propertyId:'p1',periodId:'y26'}),e=>e instanceof DocumentSourceError&&e.code==='OWNER_ANNUAL_RECHECK_REQUIRED');
});
test('Standard-Mieterabrechnung bildet den individuellen Anteil ab',()=>{
  const r=tenantStatementSnapshot(fixture(),{periodId:'y26',tenancyId:'t1'});
  assert.equal(r.snapshot.tenant.costsCents,24000);
  assert.equal(r.snapshot.tenant.creditCents,96000);
  assert.equal(r.snapshot.expenseLines[0].tenantShareCents,24000);
});
test('Wärme- oder CO2-Kosten sperren verkürzte Mieter-PDF',()=>{
  const p=fixture();
  p.expenses.push({id:'heat',propertyId:'p1',category:'heating',classification:'allocatable',amountCents:10000,startDate:'2026-01-01',endDate:'2026-12-31'});
  assert.throws(()=>tenantStatementSnapshot(p,{periodId:'y26',tenancyId:'t1'}),e=>e instanceof DocumentSourceError&&e.code==='SPECIAL_ANNUAL_RECHECK_REQUIRED');
});
test('Eigentümer-Check Snapshot enthält keine automatische Rechtsentscheidung',()=>{
  let p=fixture();
  p=upsertSafetyCheck(p,{itemId:'c1',propertyId:'p1',checkKey:'energy_certificate',classification:'unresolved',status:'review',checkedOn:'2026-09-24'}).project;
  const r=ownerSafetySnapshot(p,{propertyId:'p1'});
  assert.equal(r.snapshot.autoLegalDecision,false);assert.equal(r.snapshot.checks[0].classification,'unresolved');
});
test('Vermietungscheck Snapshot enthält nur Prozessstatus ohne Bewerberantworten',()=>{
  let p=fixture();
  p=createLettingProcess(p,{processId:'v1',propertyId:'p1',unitId:'u1',createdOn:'2026-09-24',referenceLabel:'Vorgang A'}).project;
  const r=lettingChecklistSnapshot(p,{processId:'v1'});
  assert.equal(r.snapshot.applicantAnswersStored,false);assert.equal(r.snapshot.automaticScore,false);assert.equal(r.snapshot.items.length>0,true);
});
