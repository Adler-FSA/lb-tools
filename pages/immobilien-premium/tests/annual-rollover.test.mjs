import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyProject} from '../assets/js/model.js';
import {createNextAccountingPeriod} from '../assets/js/annual-rollover.js';

function fixture(){
 const p=createEmptyProject('rollover');
 p.properties.push({id:'p1'});
 p.accountingPeriods.push({id:'y26',propertyId:'p1',startDate:'2026-01-01',endDate:'2026-12-31',confirmedTenancyIds:['t1']});
 p.expenses.push({id:'e1',propertyId:'p1',startDate:'2026-01-01',endDate:'2026-12-31',amountCents:10000,classification:'owner'});
 return p;
}
test('Jahreswechsel legt nur eine neue unbestätigte Periode an',()=>{
 const p=fixture(),before=JSON.stringify(p.expenses);
 const r=createNextAccountingPeriod(p,{sourcePeriodId:'y26',newPeriodId:'y27'});
 assert.equal(r.startDate,'2027-01-01');assert.equal(r.endDate,'2027-12-31');
 assert.equal(r.project.accountingPeriods.length,2);assert.deepEqual(r.project.accountingPeriods[1].confirmedTenancyIds,[]);
 assert.equal(r.project.accountingPeriods[1].rolloverState,'unconfirmed');
 assert.equal(JSON.stringify(r.project.expenses),before);assert.equal(p.accountingPeriods.length,1);
});
test('Bestehendes Folgejahr wird nicht dupliziert',()=>{
 const p=fixture();p.accountingPeriods.push({id:'other',propertyId:'p1',startDate:'2027-01-01',endDate:'2027-12-31'});
 assert.throws(()=>createNextAccountingPeriod(p,{sourcePeriodId:'y26',newPeriodId:'y27'}),/bereits/);
});

test('Offene bereits vorhandene Folgeperiode sperrt den Jahreswechsel',()=>{
 const p=fixture();p.accountingPeriods.push({id:'open27',propertyId:'p1',startDate:'2027-01-01',endDate:null});
 assert.throws(()=>createNextAccountingPeriod(p,{sourcePeriodId:'y26',newPeriodId:'y27'}),/bereits/);
});
