import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSupplyRegistryExtension, SUPPLY_REGISTRY_VERSION} from '../assets/js/supply-schema.js';
function fixture() {
  const project = {
    properties: [{id:'house'}], units:[{id:'unitA',propertyId:'house'}],
    accountingPeriods:[{id:'year',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'}],
    expenses:[{id:'gas',propertyId:'house',providerAccountId:'supplier',supplyManaged:true,
      startDate:'2026-01-01',endDate:'2026-12-31',amountCents:218000,
      invoiceReference:'GAS2026',invoiceLineId:'delivery'}],
    cashflows:[{id:'paid',propertyId:'house',providerAccountId:'supplier',kind:'provider_payment',
      accountingPeriodId:'year',amountCents:240000}],
    supplyRegistryVersion: SUPPLY_REGISTRY_VERSION,
    supplyRegistry:[{id:'contract2026',propertyId:'house',accountingPeriodId:'year',confirmed:true,
      contract:{providerAccountId:'supplier',service:'gas',contractHolder:'owner',confirmed:true,
        priceVersions:[{validFrom:'2026-01-01',validTo:'2026-12-31',confirmed:true,
          referenceId:'contractEvidence',baseCentsPerPeriod:18000,plannedWholeUnits:20000,
          workPriceNumeratorCents:10,workPriceDenominatorUnits:1,measurementUnit:'kWh'}],
        expenseIds:['gas'],invoiceTotalsCentsByReference:{GAS2026:218000}}}]
  };
  return project;
}
const errors = project => validateSupplyRegistryExtension(project).map(e=>e.code);
const blocked = (mutate,code) => {const p=fixture();mutate(p);assert.ok(errors(p).includes(code),`${code}: ${errors(p)}`);};
test('gültiger Vertragsdatensatz referenziert Originalrechnung und Zahlung ohne zusätzliche Buchung',()=>{
  const p=fixture(), before=JSON.stringify(p);
  assert.deepEqual(errors(p),[]);
  assert.equal(JSON.stringify(p),before);
  assert.deepEqual(errors(JSON.parse(JSON.stringify(p))),[]);
});
test('bestehende v1 Projekte ohne Versorgungserweiterung bleiben ladbar',()=>{
  const p=fixture();delete p.supplyRegistry;delete p.supplyRegistryVersion;
  assert.deepEqual(errors(p),[]);
});
test('ungültige Version, fehlende Liste und nicht auflösbare Perioden werden gesperrt',()=>{
  blocked(p=>{p.supplyRegistryVersion=2;},'SUPPLY_VERSION');
  blocked(p=>{p.supplyRegistry={};},'SUPPLY_REGISTRY_INVALID');
  blocked(p=>{p.supplyRegistry[0].accountingPeriodId='other';},'SUPPLY_PERIOD_REFERENCE');
  blocked(p=>{p.accountingPeriods[0].endDate='2026-02-31';},'SUPPLY_PERIOD_REFERENCE');
});
test('unterschiedliche Verträge mit derselben ID bzw. derselben Lieferstelle sperren',()=>{
  blocked(p=>{p.supplyRegistry.push(structuredClone(p.supplyRegistry[0]));},'SUPPLY_DUPLICATE_ID');
  blocked(p=>{let r=structuredClone(p.supplyRegistry[0]);r.id='second';p.supplyRegistry.push(r);},'SUPPLY_ACCOUNT_DUPLICATE');
  blocked(p=>{p.supplyRegistry[0].id='gas';},'SUPPLY_DUPLICATE_ID');
});
test('Preiswechsel erfordert lückenlose, bestätigte und einheitliche Preisabschnitte',()=>{
  const p=fixture(), v=p.supplyRegistry[0].contract.priceVersions[0];
  v.validTo='2026-06-30';p.supplyRegistry[0].contract.priceVersions.push({...v,validFrom:'2026-07-01',validTo:'2026-12-31',referenceId:'change'});
  assert.deepEqual(errors(p),[]);
  blocked(p=>{p.supplyRegistry[0].contract.priceVersions[0].validFrom='2026-01-02';},'SUPPLY_PRICE_HISTORY');
  blocked(p=>{p.supplyRegistry[0].contract.priceVersions[0].confirmed=false;},'SUPPLY_PRICE_HISTORY');
  blocked(p=>{p.supplyRegistry[0].contract.priceVersions[0].workPriceDenominatorUnits=0;},'SUPPLY_PRICE_HISTORY');
  blocked(p=>{p.supplyRegistry[0].contract.priceVersions[0].validTo='2026-06-30';},'SUPPLY_PRICE_COVERAGE');
});
test('fehlende, doppelte und falsch zugeordnete Originalrechnungen werden gesperrt',()=>{
  blocked(p=>{p.supplyRegistry[0].contract.expenseIds=[];},'SUPPLY_INVENTORY_INVALID');
  blocked(p=>{p.expenses[0].providerAccountId='stranger';},'SUPPLY_INVENTORY_INVALID');
  blocked(p=>{p.expenses[0].startDate='2026-02-01';},'SUPPLY_INVOICE_INVALID');
  blocked(p=>{p.expenses[0].supplyManaged=false;},'SUPPLY_INVOICE_INVALID');
  blocked(p=>{p.expenses.push({...p.expenses[0],id:'gas2'});p.supplyRegistry[0].contract.expenseIds.push('gas2');},'SUPPLY_INVOICE_DUPLICATE');
});
test('Originalrechnungsbetrag ist nicht durch Abschläge oder Schätzung ersetzbar',()=>{
  blocked(p=>{p.supplyRegistry[0].contract.invoiceTotalsCentsByReference.GAS2026=240000;},'SUPPLY_INVOICE_TOTAL_MISMATCH');
  blocked(p=>{p.supplyRegistry[0].contract.invoiceTotalsCentsByReference.GAS2026=218000.3;},'SUPPLY_INVOICE_TOTAL_MISMATCH');
  blocked(p=>{p.cashflows[0].accountingPeriodId='other';},'SUPPLY_PAYMENT_INVALID');
});
test('separater Mieterdirektvertrag darf keine Eigentümerkosten oder Eigentümerzahlungen enthalten',()=>{
  const p=fixture();p.expenses=[];p.cashflows=[];
  p.supplyRegistry[0].contract={providerAccountId:'tenantSupplier',service:'gas',contractHolder:'tenant_direct',
    confirmed:true,unitId:'unitA',directSupplyConfirmed:true,expenseIds:[]};
  assert.deepEqual(errors(p),[]);
  p.supplyRegistry[0].contract.unitId='other';
  assert.ok(errors(p).includes('SUPPLY_DIRECT_MIXED'));
  p.supplyRegistry[0].contract.unitId='unitA';p.expenses.push({id:'forbidden',propertyId:'house',
    providerAccountId:'tenantSupplier',supplyManaged:true,startDate:'2026-01-01',endDate:'2026-12-31'});
  assert.ok(errors(p).includes('SUPPLY_DIRECT_MIXED'));
});
test('explizit zugehörige Versorgerrechnung darf im Vertragsverzeichnis nicht fehlen',()=>{
  blocked(p=>{p.expenses.push({...p.expenses[0],id:'water',providerAccountId:'waterSupplier',invoiceReference:'WATER'});},'SUPPLY_UNASSIGNED_EXPENSE');
});
test('Entwurf darf ohne Jahresrechnung gespeichert werden, aber nicht als geprüfter Abschluss gelten',()=>{
  const p=fixture();p.expenses=[];p.cashflows=[];
  p.supplyRegistry[0].confirmed=false;
  delete p.supplyRegistry[0].contract.priceVersions;
  delete p.supplyRegistry[0].contract.expenseIds;
  delete p.supplyRegistry[0].contract.invoiceTotalsCentsByReference;
  assert.deepEqual(errors(p),[]);
  p.supplyRegistry[0].contract.priceVersions=[{workPriceDenominatorUnits:0}];
  assert.ok(errors(p).includes('SUPPLY_DRAFT_PRICE_INVALID'));
  blocked(p=>{p.supplyRegistry[0].contract.confirmed=false;},'SUPPLY_CONTRACT_INVALID');
});
