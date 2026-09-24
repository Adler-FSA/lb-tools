import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultHouseRulesConfig,validateHouseRulesConfig,buildHouseRulesDocument,upsertHouseRulesDraft} from '../assets/js/house-rules-workshop.js';
import {createEmptyProject,validateProject} from '../assets/js/model.js';

test('Standard-Hausordnung erzeugt mehrere sachliche Bereiche',()=>{
 const c=defaultHouseRulesConfig();c.propertyLabel='Musterhaus';
 const q=validateHouseRulesConfig(c);assert.equal(q.valid,true);
 const d=buildHouseRulesDocument(c);assert.ok(d.sections.length>=6);assert.equal(d.mode,'contractual_attachment');
});
test('zugeordnete Reinigungs- und Winterdienstpflicht erzeugt separaten Prüfbedarf',()=>{
 const c=defaultHouseRulesConfig();c.cleaning.enabled=true;c.cleaning.assigned=true;c.winter.enabled=true;c.winter.assigned=true;
 const q=validateHouseRulesConfig(c);assert.ok(q.warnings.some(x=>x.code==='CLEANING_DUTY_REVIEW'));assert.ok(q.warnings.some(x=>x.code==='WINTER_DUTY_REVIEW'));
});
test('Bewohnerinformation wird von Vertragsanlage unterschieden',()=>{
 const c=defaultHouseRulesConfig();c.mode='information';
 const d=buildHouseRulesDocument(c);assert.equal(d.mode,'information');assert.match(d.footer,/Bewohnerinformation/);
});
test('Hausordnungsentwurf passiert bestehendes Projektschema',()=>{
 const p=createEmptyProject('ruleswork');p.properties.push({id:'p1'});
 const r=upsertHouseRulesDraft(p,{documentId:'h1',propertyId:'p1',config:defaultHouseRulesConfig(),createdOn:'2026-09-24'});
 assert.deepEqual(validateProject(r.project),[]);assert.equal(r.project.documents[0].source,'house-rules-workshop-v1');
});
