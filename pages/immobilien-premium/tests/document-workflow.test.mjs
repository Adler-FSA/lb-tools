import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyProject} from '../assets/js/model.js';
import {
  prepareReviewDocument,releaseReviewDocument,createRevisionFromReleased,deleteReviewDocument,
  recordDocumentDelivery,listDocumentArchive,snapshotHash,safeDocumentFilename,RELEASE_CONFIRMATION
} from '../assets/js/document-workflow.js';

function fixture(){
  const p=createEmptyProject('docflow');
  p.properties.push({id:'p1',label:'Haus'});
  p.units.push({id:'u1',propertyId:'p1',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:8000}]});
  p.tenancies.push({id:'t1',unitId:'u1',startDate:'2026-01-01',endDate:null});
  return p;
}
test('Prüffassung speichert Snapshot, Hash und Version 1',()=>{
  const r=prepareReviewDocument(fixture(),{documentId:'d1',documentType:'house_rules',title:'Hausordnung',createdOn:'2026-09-24',propertyId:'p1',snapshot:{a:1}});
  const d=r.project.documents[0];
  assert.equal(d.status,'review');assert.equal(d.version,1);assert.equal(d.snapshotHash,snapshotHash({a:1}));assert.equal(d.pdfGenerated,false);
});
test('Freigabe erfordert ausdrückliche Bestätigung',()=>{
  const p=prepareReviewDocument(fixture(),{documentId:'d1',documentType:'house_rules',title:'Hausordnung',createdOn:'2026-09-24',propertyId:'p1',snapshot:{a:1}}).project;
  assert.throws(()=>releaseReviewDocument(p,{documentId:'d1',releasedOn:'2026-09-24'}),/ausdrücklich/);
});
test('Manipulierter Snapshot wird vor Freigabe erkannt',()=>{
  const p=prepareReviewDocument(fixture(),{documentId:'d1',documentType:'house_rules',title:'Hausordnung',createdOn:'2026-09-24',propertyId:'p1',snapshot:{a:1}}).project;
  p.documents[0].snapshot.a=2;
  assert.throws(()=>releaseReviewDocument(p,{documentId:'d1',releasedOn:'2026-09-24',confirmation:RELEASE_CONFIRMATION}),/verändert/);
});
test('Freigabe fixiert Fassung ohne juristische Freigabe zu behaupten',()=>{
  let p=prepareReviewDocument(fixture(),{documentId:'d1',documentType:'house_rules',title:'Hausordnung',createdOn:'2026-09-24',propertyId:'p1',snapshot:{a:1}}).project;
  p=releaseReviewDocument(p,{documentId:'d1',releasedOn:'2026-09-24',confirmation:RELEASE_CONFIRMATION}).project;
  assert.equal(p.documents[0].status,'released');assert.equal(p.documents[0].legalApproval,false);assert.equal(p.documents[0].releaseScope,'data_snapshot_release_only');
});
test('Freigegebene Fassung kann im Workflow nicht gelöscht werden',()=>{
  let p=prepareReviewDocument(fixture(),{documentId:'d1',documentType:'house_rules',title:'Hausordnung',createdOn:'2026-09-24',propertyId:'p1',snapshot:{a:1}}).project;
  p=releaseReviewDocument(p,{documentId:'d1',releasedOn:'2026-09-24',confirmation:RELEASE_CONFIRMATION}).project;
  assert.throws(()=>deleteReviewDocument(p,{documentId:'d1'}),/nicht gelöscht/);
});
test('Korrektur erzeugt neue Version und lässt V1 unverändert',()=>{
  let p=prepareReviewDocument(fixture(),{documentId:'d1',documentType:'house_rules',title:'Hausordnung',createdOn:'2026-09-24',propertyId:'p1',snapshot:{a:1}}).project;
  p=releaseReviewDocument(p,{documentId:'d1',releasedOn:'2026-09-24',confirmation:RELEASE_CONFIRMATION}).project;
  p=createRevisionFromReleased(p,{releasedDocumentId:'d1',newDocumentId:'d2',createdOn:'2026-09-25'}).project;
  assert.equal(p.documents[0].status,'released');assert.equal(p.documents[0].version,1);
  assert.equal(p.documents[1].status,'review');assert.equal(p.documents[1].version,2);assert.equal(p.documents[1].previousVersionId,'d1');
});
test('Übergabe wird separat gespeichert und verändert freigegebenes Dokument nicht',()=>{
  let p=prepareReviewDocument(fixture(),{documentId:'d1',documentType:'house_rules',title:'Hausordnung',createdOn:'2026-09-24',propertyId:'p1',snapshot:{a:1}}).project;
  p=releaseReviewDocument(p,{documentId:'d1',releasedOn:'2026-09-24',confirmation:RELEASE_CONFIRMATION}).project;
  const before=JSON.stringify(p.documents[0]);
  p=recordDocumentDelivery(p,{itemId:'delivery1',documentId:'d1',deliveredOn:'2026-09-25',channel:'email',note:'gesendet'}).project;
  assert.equal(JSON.stringify(p.documents[0]),before);assert.equal(p.checkItems[0].documentId,'d1');
  assert.equal(listDocumentArchive(p)[0].deliveries.length,1);
});
test('Dateiname enthält Version und Datum',()=>{
  assert.equal(safeDocumentFilename({title:'Hausordnung Muster',version:2,releasedOn:'2026-09-24'}),'Hausordnung-Muster_V2_2026-09-24.pdf');
});
