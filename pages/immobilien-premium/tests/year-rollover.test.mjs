import test from 'node:test';
import assert from 'node:assert/strict';
import {previewNextYear, ROLLOVER_REVIEW_FIELDS} from '../assets/js/year-rollover.js';
function sample() {return {
  projectId:'demo',properties:[{id:'house'},{id:'other'}],
  accountingPeriods:[{id:'year2026',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'}],
  expenses:[{id:'cost2026',amountCents:999}],cashflows:[{id:'paid2026',amountCents:500}],
  readings:[{id:'reading2026',value:100}],
  documents:[{id:'final2026',status:'released',snapshot:{year:2026,amount:999}},
    {id:'draft',status:'draft'}]};}
function block(change, code){const p=sample();change(p);const r=previewNextYear(p,'year2026','year2027');
  assert.equal(r.status,'blocked',JSON.stringify(r));assert.equal(r.report,null);
  assert.equal(r.issues[0].code,code);}
test('MH09: proposes exactly one unopened 2027 year and preserves all 2026 original records',()=>{
  const p=sample(),original=JSON.stringify(p);
  const r=previewNextYear(p,'year2026','year2027');
  assert.equal(r.status,'prepared');assert.equal(r.calculationReady,false);
  assert.deepEqual(r.report.proposedPeriod,{id:'year2027',propertyId:'house',startDate:'2027-01-01',
    endDate:'2027-12-31',previousPeriodId:'year2026',rolloverStatus:'review_required',
    reviewRequired:true,currentYearDataConfirmed:false,legalRelease:false});
  assert.deepEqual(r.report.previousReleasedDocumentIds,['final2026']);
  assert.equal(r.report.needsFreshEvidence.length,ROLLOVER_REVIEW_FIELDS.length);
  assert.equal(r.report.costsCopied+r.report.paymentsCopied+r.report.readingsCopied+r.report.documentsCopied,0);
  assert.equal(r.report.insertedIntoProject,false);
  assert.equal(r.report.persisted,false);
  assert.equal(p.accountingPeriods.length,1);
  assert.equal(JSON.stringify(p),original);
});
test('another property period does not conflict with target property',()=>{
  const p=sample();p.accountingPeriods.push({id:'other2027',propertyId:'other',startDate:'2027-01-01',endDate:'2027-12-31'});
  assert.equal(previewNextYear(p,'year2026','year2027').status,'prepared');
});
test('never creates a second or overlapping 2027 accounting year',()=>{
  block(p=>p.accountingPeriods.push({id:'already',propertyId:'house',startDate:'2027-01-01',endDate:'2027-12-31'}), 'ROLLOVER_PERIOD_CONFLICT');
  block(p=>p.accountingPeriods.push({id:'already',propertyId:'house',startDate:'2027-06-01',endDate:'2028-05-31'}), 'ROLLOVER_PERIOD_CONFLICT');
});
test('wrong source, partial financial year, leap-day and invalid dates cannot be silently carried over',()=>{
  block(p=>{p.accountingPeriods[0].startDate='2026-03-01';},'ROLLOVER_CALENDAR_YEAR_REQUIRED');
  block(p=>{p.accountingPeriods[0].endDate='2026-12-30';},'ROLLOVER_CALENDAR_YEAR_REQUIRED');
  block(p=>{p.accountingPeriods[0].endDate='2026-02-31';},'ROLLOVER_PERIODS_INVALID');
  block(p=>{p.accountingPeriods[0].propertyId='unknown';},'ROLLOVER_SOURCE_REQUIRED');
});
test('global stable IDs from other entity collections cannot be reused as period IDs',()=>{
  block(p=>p.expenses.push({id:'year2027'}),'ROLLOVER_ID_CONFLICT');
  block(p=>p.documents.push({id:'year2027'}),'ROLLOVER_ID_CONFLICT');
});
test('invalid released document snapshot blocks rollover before any copying',()=>{
  block(p=>{p.documents[0].snapshot=null;},'ROLLOVER_RELEASED_SNAPSHOT_INVALID');
});
test('invalid project and duplicate source periods block with defined errors',()=>{
  assert.equal(previewNextYear({},'year2026','year2027').issues[0].code,'ROLLOVER_PROJECT_INVALID');
  block(p=>p.accountingPeriods.push({...p.accountingPeriods[0]}),'ROLLOVER_SOURCE_REQUIRED');
  assert.equal(previewNextYear(sample(),'year2026','not valid').issues[0].code,'ROLLOVER_ID_INVALID');
});
