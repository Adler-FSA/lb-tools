import test from 'node:test';
import assert from 'node:assert/strict';
import {generateReleasedDocumentPdf} from '../assets/js/document-pdf.js';

const base={id:'d1',kind:'document_snapshot',status:'released',version:1,releasedOn:'2026-09-24',createdOn:'2026-09-24',title:'Test'};
async function valid(snapshot,lang='de'){
 const out=await generateReleasedDocumentPdf({...base,snapshot},{lang});
 const bytes=new Uint8Array(await out.blob.arrayBuffer());
 const head=new TextDecoder().decode(bytes.slice(0,8));
 const tail=new TextDecoder().decode(bytes.slice(-40));
 assert.ok(head.startsWith('%PDF-1.4'));assert.ok(tail.includes('%%EOF'));assert.ok(out.pages>=1);assert.ok(out.filename.endsWith('.pdf'));
}
test('Mietservice-Snapshot erzeugt echte PDF',()=>valid({kind:'service_document',property:{label:'Haus',address:{}},unit:{label:'Whg'},tenancy:{partyLabel:'Muster'},payload:{purpose:'Termin',message:'Bitte melden'}}));
test('Eigentümer-Jahresübersicht erzeugt echte PDF',()=>valid({kind:'owner_annual_summary',property:{label:'Haus',address:{}},period:{startDate:'2026-01-01',endDate:'2026-12-31'},report:{actualCostsCents:60000,ownerClassifiedCents:10000,allocatableClassifiedCents:50000,unresolvedCents:0,providerNetPaidCents:55000,byCategory:[{category:'property_tax',amountCents:60000}]}}));
test('Mieter-Betriebskosten-Snapshot erzeugt echte PDF',()=>valid({kind:'tenant_operating_cost_statement',property:{label:'Haus',address:{}},unit:{label:'Whg'},tenancy:{partyLabel:'Muster'},period:{startDate:'2026-01-01',endDate:'2026-12-31'},tenant:{costsCents:24000,advancesCents:120000,creditCents:96000,additionalCents:0},expenseLines:[{category:'property_tax',amountCents:60000,method:'area',tenantShareCents:24000}]},'en'));
test('Eigentümer-Sicherheits-Snapshot erzeugt echte PDF',()=>valid({kind:'owner_safety_overview',property:{label:'Haus',address:{}},checks:[{checkKey:'energy_certificate',label:{de:'Energieausweis',en:'Energy certificate'},classification:'unresolved',status:'review',dueDate:null,note:''}]}));
test('Vermietungscheck-Snapshot erzeugt echte PDF',()=>valid({kind:'letting_checklist',property:{label:'Haus',address:{}},unit:{label:'Whg'},process:{referenceLabel:'Vorgang A',phase:'A_VIEWING'},items:[{key:'a',de:'Kontakt',en:'Contact',state:'done'}]},'en'));
