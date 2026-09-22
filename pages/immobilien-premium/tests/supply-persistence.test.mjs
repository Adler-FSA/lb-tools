import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject, validateProject, assertValidProject, SCHEMA_VERSION } from '../assets/js/model.js';
import { saveProject, loadProject, createBackup, previewBackup, restoreBackup,
  PROJECT_KEY, StorageError } from '../assets/js/storage.js';

function fixture() {
  const p = createEmptyProject('supplier_project');
  p.properties.push({id:'house',label:'Fiktives Haus'});
  p.units.push({id:'flat',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:5000}]});
  p.accountingPeriods.push({id:'year',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'});
  p.expenses.push({id:'gas',propertyId:'house',providerAccountId:'supplier',supplyManaged:true,
    category:'heating',classification:'allocatable',confirmedForAllocation:true,
    startDate:'2026-01-01',endDate:'2026-12-31',amountCents:218000,
    invoiceReference:'GAS2026',invoiceLineId:'delivery'});
  p.cashflows.push({id:'paid',propertyId:'house',providerAccountId:'supplier',kind:'provider_payment',
    accountingPeriodId:'year',amountCents:240000,date:'2026-10-01'});
  p.supplyRegistry.push({id:'contract2026',propertyId:'house',accountingPeriodId:'year',confirmed:true,
    contract:{providerAccountId:'supplier',service:'gas',contractHolder:'owner',confirmed:true,
      priceVersions:[{validFrom:'2026-01-01',validTo:'2026-12-31',confirmed:true,
        referenceId:'contractEvidence',baseCentsPerPeriod:18000,plannedWholeUnits:20000,
        workPriceNumeratorCents:10,workPriceDenominatorUnits:1,measurementUnit:'kWh'}],
      expenseIds:['gas'],invoiceTotalsCentsByReference:{GAS2026:218000}}});
  return p;
}
function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key,value) { data.set(key,String(value)); } };
}
const code = (p,c) => assert.ok(validateProject(p).some(x=>x.code===c), `${c} missing`);

test('new project contains empty versioned supply registry, while base schema and namespace stay v1',()=>{
  const p=createEmptyProject('empty');
  assert.equal(p.schemaVersion,SCHEMA_VERSION);
  assert.equal(p.schemaVersion,1);
  assert.equal(p.supplyRegistryVersion,1);
  assert.deepEqual(p.supplyRegistry,[]);
  assert.deepEqual(validateProject(p),[]);
});
test('existing v1 project without extension is loaded unchanged, without forced migration',()=>{
  const p=createEmptyProject('existing');delete p.supplyRegistry;delete p.supplyRegistryVersion;
  const s=memory();saveProject(p,{storage:s});
  assert.deepEqual(loadProject({storage:s}),p);
  assert.deepEqual(validateProject(p),[]);
});
test('verified contract survives actual project save, JSON backup and confirmed restore',()=>{
  const p=fixture(), before=JSON.stringify(p), s=memory();
  assertValidProject(p);
  saveProject(p,{storage:s});
  assert.deepEqual(loadProject({storage:s}).supplyRegistry,p.supplyRegistry);
  const json=createBackup(p,{now:()=>new Date('2026-09-22T12:00:00Z')});
  assert.equal(previewBackup(json).recordCounts.supplyRegistry,1);
  assert.deepEqual(JSON.parse(json).project.supplyRegistry,p.supplyRegistry);
  const empty=createEmptyProject('existing');
  s.setItem(PROJECT_KEY,JSON.stringify(empty));
  const restored=restoreBackup(json,{storage:s,confirmation:'REPLACE_PROJECT',now:()=>new Date('2026-09-22T13:00:00Z')});
  assert.equal(restored.projectId,p.projectId);
  assert.equal(JSON.parse(s.getItem(restored.recoveryKey)).projectId,'existing');
  assert.deepEqual(loadProject({storage:s}).supplyRegistry,p.supplyRegistry);
  assert.equal(JSON.stringify(p),before,'no in-memory mutation');
});
test('wrong invoice total, duplicate contract or unknown expense blocks before any write',()=>{
  for(const [mutate,expected] of [
    [p=>{p.supplyRegistry[0].contract.invoiceTotalsCentsByReference.GAS2026=7;},'SUPPLY_INVOICE_TOTAL_MISMATCH'],
    [p=>{p.supplyRegistry.push({...structuredClone(p.supplyRegistry[0]),id:'other'});},'SUPPLY_ACCOUNT_DUPLICATE'],
    [p=>{p.supplyRegistry[0].contract.expenseIds=['wrong'];},'SUPPLY_INVENTORY_INVALID']
  ]) {
    const p=fixture(),s=memory();mutate(p);code(p,expected);
    assert.throws(()=>saveProject(p,{storage:s}),e=>e instanceof StorageError && e.code==='INVALID_PROJECT');
    assert.equal(s.getItem(PROJECT_KEY),null);
    assert.throws(()=>createBackup(p),e=>e.code==='INVALID_PROJECT');
  }
});
test('tampered supply record in stored JSON is detected without resetting old data',()=>{
  const p=fixture(),s=memory();saveProject(p,{storage:s});
  const corrupted=structuredClone(p);corrupted.supplyRegistry[0].contract.priceVersions[0].plannedWholeUnits=-1;
  s.setItem(PROJECT_KEY,JSON.stringify(corrupted));
  assert.throws(()=>loadProject({storage:s}),e=>e.code==='CORRUPT_PROJECT');
  assert.equal(s.getItem(PROJECT_KEY),JSON.stringify(corrupted));
});
test('non-array collections return structured errors instead of throwing or overwriting',()=>{
  const p=fixture(),s=memory();p.properties={bad:true};
  assert.doesNotThrow(()=>validateProject(p));
  code(p,'MISSING_COLLECTION');
  assert.throws(()=>saveProject(p,{storage:s}),e=>e.code==='INVALID_PROJECT');
});
test('invalid version and missing registry are never silently normalized',()=>{
  const p=fixture();p.supplyRegistryVersion=2;code(p,'SUPPLY_VERSION');
  p.supplyRegistryVersion=1;delete p.supplyRegistry;code(p,'SUPPLY_REGISTRY_INVALID');
});
test('tenant direct contract is only a reference and cannot carry owner invoices',()=>{
  const p=fixture();p.expenses=[];p.cashflows=[];
  p.supplyRegistry[0].contract={providerAccountId:'tenantSupplier',service:'gas',contractHolder:'tenant_direct',
    confirmed:true,directSupplyConfirmed:true,unitId:'flat',expenseIds:[]};
  assert.deepEqual(validateProject(p),[]);
  p.supplyRegistry[0].contract.priceVersions=[];
  code(p,'SUPPLY_DIRECT_MIXED');
});
test('backup refuses embedded document bytes in supplier records',()=>{
  const p=fixture();p.supplyRegistry[0].contract.fileData='AAAA';
  assert.throws(()=>createBackup(p),e=>e.code==='INLINE_FILE_UNSUPPORTED');
});
test('validated intra-year price updates persist without changing original costs or cashflows',()=>{
  const p=fixture(), c=p.supplyRegistry[0].contract;
  c.priceVersions[0].validTo='2026-06-30';
  c.priceVersions.push({...c.priceVersions[0],validFrom:'2026-07-01',validTo:'2026-12-31',
    referenceId:'priceChangeEvidence',workPriceNumeratorCents:12});
  assert.deepEqual(validateProject(p),[]);
  const s=memory();saveProject(p,{storage:s});
  const loaded=loadProject({storage:s});
  assert.equal(loaded.supplyRegistry[0].contract.priceVersions.length,2);
  assert.equal(loaded.expenses[0].amountCents,218000);
  assert.equal(loaded.cashflows[0].amountCents,240000);
});
test('planning-only draft saves before invoice, then confirmed complete record saves with the same ID',()=>{
  const p=fixture(), s=memory(), row=p.supplyRegistry[0];
  p.expenses=[];p.cashflows=[];row.confirmed=false;
  delete row.contract.expenseIds;delete row.contract.invoiceTotalsCentsByReference;
  row.contract.priceVersions=[{validFrom:'2026-01-01',measurementUnit:'kWh',baseCentsPerPeriod:18000}];
  assert.deepEqual(validateProject(p),[]);
  saveProject(p,{storage:s});
  assert.equal(loadProject({storage:s}).supplyRegistry[0].confirmed,false);
  assert.equal(previewBackup(createBackup(p)).recordCounts.supplyRegistry,1);
  const complete=fixture();
  saveProject(complete,{storage:s});
  assert.equal(loadProject({storage:s}).supplyRegistry[0].confirmed,true);
  assert.equal(loadProject({storage:s}).expenses.length,1);
});
