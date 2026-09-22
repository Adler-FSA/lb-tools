import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { saveProject, loadProject } from '../assets/js/storage.js';
import { reviewSupplyRegistry } from '../assets/js/supply-registry.js';

test('review reads real persisted registry; confirmed actuals never become extra postings; drafts block', () => {
  const p=createEmptyProject('review_link');
  p.properties.push({id:'house'});
  p.units.push({id:'flat',propertyId:'house',areaHistory:[{from:'2026-01-01',to:null,hundredthsM2:5000}]});
  p.accountingPeriods.push({id:'year',propertyId:'house',startDate:'2026-01-01',endDate:'2026-12-31'});
  p.expenses.push({id:'gas',propertyId:'house',providerAccountId:'supplier',supplyManaged:true,
    category:'heating',classification:'allocatable',amountCents:218000,
    startDate:'2026-01-01',endDate:'2026-12-31',invoiceReference:'GAS2026',invoiceLineId:'delivery'});
  p.cashflows.push({id:'paid',propertyId:'house',providerAccountId:'supplier',kind:'provider_payment',
    accountingPeriodId:'year',amountCents:240000,date:'2026-10-01'});
  p.supplyRegistry.push({id:'contract2026',propertyId:'house',accountingPeriodId:'year',confirmed:true,
    contract:{providerAccountId:'supplier',service:'gas',contractHolder:'owner',confirmed:true,
      priceVersions:[{validFrom:'2026-01-01',validTo:'2026-12-31',confirmed:true,referenceId:'ref',
        baseCentsPerPeriod:18000,plannedWholeUnits:20000,workPriceNumeratorCents:10,
        workPriceDenominatorUnits:1,measurementUnit:'kWh'}],
      expenseIds:['gas'],invoiceTotalsCentsByReference:{GAS2026:218000}}});
  const values=new Map();
  const storage={getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,value)};
  saveProject(p,{storage});
  const saved=loadProject({storage});
  const r=reviewSupplyRegistry(saved,'year',saved.supplyRegistry);
  assert.equal(r.status,'reviewed',JSON.stringify(r.issues));
  assert.equal(r.report.accounts[0].forecastCents,218000);
  assert.equal(r.report.accounts[0].actualOwnerCostsCents,218000);
  assert.equal(r.report.accounts[0].netProviderPaidCents,240000);
  assert.deepEqual(r.report.originalExpenseIds,['gas']);
  assert.equal(r.report.actualCostsPosted,false);
  const draft=structuredClone(saved);draft.supplyRegistry[0].confirmed=false;
  saveProject(draft,{storage});
  const read=loadProject({storage});
  const blocked=reviewSupplyRegistry(read,'year',read.supplyRegistry);
  assert.equal(blocked.status,'blocked');
  assert.equal(blocked.issues[0].code,'SUPPLY_REGISTRY_RECORD_INVALID');
});
