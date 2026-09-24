import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultLeaseConfig,validateLeaseConfig,buildLeaseDocument,upsertLeaseWorkshopDraft} from '../assets/js/lease-workshop.js';
import {createEmptyProject,validateProject} from '../assets/js/model.js';

function valid(){
 const c=defaultLeaseConfig();
 c.landlord={name:'Vermieter Test',street:'Testweg 1',postalCity:'64295 Darmstadt'};
 c.tenant={name:'Mieter Test',street:'Altweg 2',postalCity:'64283 Darmstadt'};
 c.property={...c.property,street:'Testweg 1',postalCity:'64295 Darmstadt',unitLabel:'1. OG',areaM2:'75',rooms:'3'};
 c.term.startDate='2026-10-01';c.rent.baseRentCents=100000;c.rent.operatingCostCents=22000;c.deposit.amountCents=300000;
 return c;
}
test('gültige Standardfassung erzeugt strukturierten Wohnraum-Mietvertrag',()=>{
 const c=valid(),q=validateLeaseConfig(c);assert.equal(q.valid,true);
 const d=buildLeaseDocument(c);assert.equal(d.title,'Wohnraum-Mietvertrag');assert.ok(d.sections.length>=14);
 assert.ok(d.sections.some(x=>x.title==='Betriebskosten'));
});
test('Kaution über drei Nettokaltmieten wird blockiert',()=>{
 const c=valid();c.deposit.amountCents=300001;
 const q=validateLeaseConfig(c);assert.equal(q.valid,false);assert.ok(q.errors.some(x=>x.code==='DEPOSIT_TOO_HIGH'));
});
test('Zeitmietvertrag ohne zulässigen Grund wird blockiert',()=>{
 const c=valid();c.term.kind='fixed';c.term.endDate='2028-09-30';
 const q=validateLeaseConfig(c);assert.ok(q.errors.some(x=>x.code==='FIXED_REASON_REQUIRED'));
});
test('Zeitmietvertrag mit Grund und Beschreibung kann geprüft werden',()=>{
 const c=valid();c.term.kind='fixed';c.term.endDate='2028-09-30';c.term.fixedReason='own_use';c.term.fixedReasonDetail='Eigennutzung durch Tochter ab Oktober 2028.';
 const q=validateLeaseConfig(c);assert.equal(q.valid,true);assert.ok(q.warnings.some(x=>x.code==='FIXED_TERM_REVIEW'));
});
test('Staffelmiete unter zwölf Monaten wird blockiert',()=>{
 const c=valid();c.rentAdjustment.kind='staggered';c.rentAdjustment.staggeredRows=[{from:'2027-06-01',rentCents:105000}];
 const q=validateLeaseConfig(c);assert.ok(q.errors.some(x=>x.code==='STAGGERED_INTERVAL'));
});
test('Werkstattentwurf passiert bestehendes Projektschema',()=>{
 const p=createEmptyProject('leasework');p.properties.push({id:'p1'});p.units.push({id:'u1',propertyId:'p1',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:7500}]});p.tenancies.push({id:'t1',unitId:'u1',startDate:'2026-10-01',endDate:null});
 const r=upsertLeaseWorkshopDraft(p,{documentId:'d1',propertyId:'p1',unitId:'u1',tenancyId:'t1',config:valid(),createdOn:'2026-09-24'});
 assert.deepEqual(validateProject(r.project),[]);assert.equal(r.project.documents[0].source,'residential-lease-workshop-v1');
});
