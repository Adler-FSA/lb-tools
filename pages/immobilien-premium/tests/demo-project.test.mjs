import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDemoProject,DEMO_PROJECT_ID,DEMO_VERSION} from '../assets/js/demo-project.js';
import {validateProject} from '../assets/js/model.js';
import {calculatePeriod} from '../assets/js/calculation.js';
import {inspectOwnerAnnualReadiness} from '../assets/js/owner-readiness.js';

test('Demo-Haus ist strukturell gültig und eindeutig als fiktiv markiert',()=>{
 const p=buildDemoProject();
 assert.equal(p.projectId,DEMO_PROJECT_ID);
 assert.equal(p.demoMetadata.demoVersion,DEMO_VERSION);
 assert.equal(p.demoMetadata.fictional,true);
 assert.deepEqual(validateProject(p),[]);
});
test('Demo 2024 ist vollständig berechenbar und bleibt fixer Referenzfall',()=>{
 const r=calculatePeriod(buildDemoProject(),'demo_year_2024');
 assert.equal(r.status,'calculated',JSON.stringify(r.issues));
 assert.equal(r.report.totalCostsCents,750000);
 assert.equal(r.report.ownerCostsCents,411283);
 assert.equal(r.report.tenantCostsCents,338717);
 assert.deepEqual(r.report.tenants.map(x=>[x.tenancyId,x.costsCents,x.creditCents]),[
  ['demo_lease_berger',181123,82877],['demo_lease_schneider',157594,58406]
 ]);
});
test('Demo 2025 bildet Mieterwechsel und Zwischenablesung vollständig ab',()=>{
 const r=calculatePeriod(buildDemoProject(),'demo_year_2025');
 assert.equal(r.status,'calculated',JSON.stringify(r.issues));
 assert.equal(r.report.totalCostsCents,695000);
 assert.equal(r.report.ownerCostsCents,335535);
 assert.equal(r.report.tenantCostsCents,359465);
 assert.deepEqual(r.report.tenants.map(x=>[x.tenancyId,x.costsCents,x.creditCents]),[
  ['demo_lease_berger',189020,74980],
  ['demo_lease_schneider',82925,25075],
  ['demo_lease_vogel',87520,32480]
 ]);
 const water=r.report.expenseLines.find(x=>x.expenseId==='demo_water_2025');
 assert.ok(water.unitShares.some(x=>x.tenancyId==='demo_lease_schneider'));
 assert.ok(water.unitShares.some(x=>x.tenancyId==='demo_lease_vogel'));
});
test('Demo 2025 erreicht auch den vollständigen Eigentümer-Jahrescheck',()=>{
 const r=inspectOwnerAnnualReadiness(buildDemoProject(),'demo_year_2025');
 assert.equal(r.status,'preview',JSON.stringify(r.blockers));
 assert.equal(r.preview.originalCostsCents,695000);
 assert.equal(r.preview.ownerCostsCents,335535);
 assert.equal(r.preview.tenantCostsCents,359465);
 assert.equal(r.preview.legalRelease,false);
 assert.equal(r.preview.pdfGenerated,false);
});

test('Demo-Archiv enthält zwei freigegebene Musterfassungen und getrennte Übergaben',()=>{
 const p=buildDemoProject();
 const released=p.documents.filter(x=>x.status==='released');
 assert.deepEqual(released.map(x=>[x.id,x.documentType,x.version]),[
  ['demo_release_house_rules','house_rules',1],
  ['demo_release_handover_vogel','handover_protocol',1]
 ]);
 const deliveries=p.checkItems.filter(x=>x.type==='document_delivery');
 assert.equal(deliveries.length,2);
 assert.deepEqual(deliveries.map(x=>x.documentId).sort(),['demo_release_handover_vogel','demo_release_house_rules']);
});
test('Demo enthält vorkonfigurierte Wohnraum-Vertragswerkstätten',()=>{
 const p=buildDemoProject();
 const lease=p.documents.find(x=>x.source==='residential-lease-workshop-v1');
 const rules=p.documents.find(x=>x.source==='house-rules-workshop-v1');
 assert.ok(lease);assert.equal(lease.tenancyId,'demo_lease_berger');assert.equal(lease.payload.rent.baseRentCents,98000);assert.equal(lease.payload.deposit.amountCents,294000);
 assert.ok(rules);assert.equal(rules.propertyId,'demo_house');assert.equal(rules.payload.mode,'contractual_attachment');
});

test('Demo enthält Mietservice, Sicherheitscheck und datensparsamen Vermietungsprozess',()=>{
 const p=buildDemoProject();
 assert.equal(p.documents.filter(x=>x.source==='baustein5-mietservice-v1').length,5);
 assert.equal(p.documents.filter(x=>x.kind==='document_snapshot'&&x.status==='released').length,2);
 assert.equal(p.checkItems.filter(x=>x.type==='document_delivery').length,2);
 assert.equal(p.checkItems.filter(x=>x.type==='owner_safety').length,9);
 const process=p.checkItems.find(x=>x.type==='letting_process');
 assert.equal(process.phase,'C_SELECTED');
 assert.equal(process.applicantAnswersStored,false);
 assert.equal(process.evidenceFilesStored,false);
 assert.equal(process.automaticScore,false);
 assert.equal(process.automaticSelection,false);
});
