import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLinkedThermalAllocation, calculateLinkedThermalPeriod } from '../assets/js/thermal-linked-integration.js';

function fixture() {
  const p = {
    projectId: 'sample',
    accountingPeriods: [{ id: 'year', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31' }],
    expenses: [
      { id: 'gas', propertyId: 'house', category: 'thermal_shared', amountCents: 180001,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'allocatable',
        confirmedForAllocation: true, invoiceReference: 'GAS', invoiceLineId: 'fuel' },
      { id: 'maintenance', propertyId: 'house', category: 'heating', amountCents: 10000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'allocatable',
        confirmedForAllocation: true, invoiceReference: 'MAINT', invoiceLineId: 'heat' },
      { id: 'water', propertyId: 'house', category: 'hot_water', amountCents: 5000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'allocatable',
        confirmedForAllocation: true, invoiceReference: 'MAINT', invoiceLineId: 'water' },
      { id: 'carbon', propertyId: 'house', category: 'co2', amountCents: 2000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'unresolved',
        invoiceReference: 'GAS', invoiceLineId: 'carbon' },
      { id: 'roof', propertyId: 'house', category: 'repair', amountCents: 50000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'owner' }
    ],
    cashflows: [{ id: 'provider_payment', kind: 'provider_payment', amountCents: 900000 }]
  };
  const linked = { system: 'linked', plantType: 'gas_boiler', scopeConfirmed: true,
    invoiceInventoryConfirmed: true, co2ExcludedConfirmed: true,
    invoiceTotalsCentsByReference: { GAS: 182001, MAINT: 15000 },
    sharedExpenseIds: ['gas'], heatingOnlyExpenseIds: ['maintenance'],
    hotWaterOnlyExpenseIds: ['water'], co2ExpenseIds: ['carbon'],
    basis: { kind: 'fuel_energy', unit: 'milli_kWh', totalMilliKWh: 200000,
      hotWaterMilliKWh: 50000, totalEvidenceRef: 'gas_invoice',
      hotWaterEvidenceRef: 'heat_meter', samePhysicalBasisConfirmed: true, methodReviewed: true } };
  const thermal = { system: 'separate', linkedTransferConfirmed: true,
    scopeConfirmed: true, costBasisConfirmed: true, co2CostsSeparateConfirmed: true,
    streams: [{ kind: 'heating', consumptionPercent: 70 }, { kind: 'hot_water', consumptionPercent: 60 }] };
  return { p, linked, thermal };
}
function blocks(modify, code) {
  const { p, linked, thermal } = fixture();
  modify(p, linked, thermal);
  const result = prepareLinkedThermalAllocation(p, 'year', linked, thermal);
  assert.equal(result.status, 'blocked', JSON.stringify(result));
  assert.ok(result.issues.some(i => i.code === code), `${code}: ${JSON.stringify(result.issues)}`);
  assert.equal(result.report, null);
}
function dummyCalculator(p, period, plan) {
  assert.equal(period, 'year');
  assert.equal(plan.streams.length, 2);
  assert.deepEqual(p.expenses.filter(e => e.derivedOnly).map(e => e.amountCents).sort((a,b)=>a-b), [50000,145001]);
  assert.ok(!p.expenses.some(e => ['gas','maintenance','water','carbon'].includes(e.id)));
  assert.ok(p.expenses.some(e => e.id === 'roof'));
  return { status: 'calculated', issues: [], report: {
    scope: 'thermal_subreport_only', totalCostsCents: 195001, ownerCostsCents: 108000,
    tenants: [{ tenancyId: 'lease', costsCents: 87001 }],
    streams: [{ kind:'heating', totalCents:145001 }, { kind:'hot_water', totalCents:50000 }],
    combinedWithOtherCosts:false, co2Calculated:false, legalRelease:false, pdfGenerated:false
  } };
}

test('nur temporäre Heizungs- und Warmwasserpositionen; Originalrechnungen bleiben erhalten', () => {
  const { p, linked, thermal } = fixture();
  const before = JSON.stringify({ p, linked, thermal });
  const r = prepareLinkedThermalAllocation(p, 'year', linked, thermal);
  assert.equal(r.status, 'prepared', JSON.stringify(r.issues));
  assert.equal(r.audit.originalCents, 195001);
  assert.equal(r.audit.excludedCo2Cents, 2000);
  assert.deepEqual(r.audit.sourceExpenseIds, ['gas','maintenance','water']);
  assert.deepEqual(r.audit.excludedCo2ExpenseIds, ['carbon']);
  assert.deepEqual(r.transientProject.expenses.filter(e => e.derivedOnly).map(e => e.amountCents).sort((a,b)=>a-b), [50000,145001]);
  assert.ok(r.transientProject.expenses.some(e => e.id === 'roof'));
  assert.equal(JSON.stringify({ p, linked, thermal }), before);
  assert.equal(r.transientPlan.streams[0].expenseIds[0], 'derived_linked_heating');
});

test('Original- und temporäre Rechnungen werden nie gleichzeitig eingespielt', () => {
  const { p, linked, thermal } = fixture();
  const r = prepareLinkedThermalAllocation(p, 'year', linked, thermal);
  assert.deepEqual(r.transientProject.expenses.map(e => e.id).sort(),
    ['derived_linked_heating','derived_linked_hot_water','roof']);
  assert.equal(r.transientProject.expenses.filter(e => e.derivedOnly).reduce((s,e)=>s+e.amountCents,0),195001);
});

test('Brücke führt geprüfte Quellkosten zur Ergebnisrechnung; CO2 bleibt explizit getrennt', () => {
  const { p, linked, thermal } = fixture();
  const before = JSON.stringify(p);
  const r = calculateLinkedThermalPeriod(p,'year',linked,thermal,dummyCalculator);
  assert.equal(r.status,'calculated', JSON.stringify(r.issues));
  assert.equal(r.report.scope,'thermal_linked_subreport_only');
  assert.equal(r.report.linkedCosts.transferredToThermal,true);
  assert.equal(r.report.linkedCosts.excludedCo2Cents,2000);
  assert.deepEqual(r.report.linkedCosts.invoiceReconciliations.map(x=>x.invoiceReference), ['GAS','MAINT']);
  assert.equal(r.report.legalRelease,false);
  assert.equal(r.report.combinedWithOtherCosts,false);
  assert.equal(JSON.stringify(p),before);
});

test('ohne Original-Heizungsrechner keine erfolgreiche Behauptung', () => {
  const { p, linked, thermal } = fixture();
  const r = calculateLinkedThermalPeriod(p,'year',linked,thermal);
  assert.equal(r.status,'blocked');
  assert.equal(r.issues[0].code,'THERMAL_CALCULATOR_REQUIRED');
});

test('fehlende explizite Übergabebestätigung oder falsches System sperren', () => {
  blocks((p,l,t)=>{ t.linkedTransferConfirmed=false; }, 'LINKED_TRANSFER_UNCONFIRMED');
  blocks((p,l,t)=>{ t.system='linked'; }, 'LINKED_TRANSFER_UNCONFIRMED');
});

test('Originalrechnungen als zusätzliche expenseIds werden nicht doppelt eingerechnet', () => {
  blocks((p,l,t)=>{ t.streams[0].expenseIds=['gas']; }, 'LINKED_TRANSFER_UNCONFIRMED');
});

test('fehlender Wärmeart, doppelte Wärmeart und widersprüchlicher Abwesenheitsliste sperren', () => {
  blocks((p,l,t)=>{ t.streams.pop(); }, 'LINKED_TRANSFER_UNCONFIRMED');
  blocks((p,l,t)=>{ t.streams[1].kind='heating'; }, 'LINKED_TRANSFER_UNCONFIRMED');
  blocks((p,l,t)=>{ t.absentServices=['hot_water']; }, 'LINKED_TRANSFER_UNCONFIRMED');
});

test('Kennungskollision mit echtem Datensatz führt zu Sperre statt Ersetzen', () => {
  blocks((p,l,t)=>{ p.expenses.push({ id:'derived_linked_heating', propertyId:'house', category:'repair' }); },
    'LINKED_DERIVED_ID_CONFLICT');
});

test('fehlende belegte Kostenposition stoppt sowohl Vortrennung als auch Übergabe', () => {
  blocks((p,l,t)=>{ l.sharedExpenseIds=[]; }, 'LINKED_INVENTORY_INCOMPLETE');
  blocks((p,l,t)=>{ l.co2ExpenseIds=[]; }, 'LINKED_INVENTORY_INCOMPLETE');
});

test('Doppelbuchung derselben Rechnung wird von der Vortrennung nicht übergangen', () => {
  blocks((p,l,t)=>{ p.expenses.push({ ...p.expenses[0], id:'gas_duplicate' }); l.sharedExpenseIds.push('gas_duplicate'); },
    'LINKED_DUPLICATE_INVOICE_LINE');
});

test('gesperrte Heizkostenverteilung erzeugt keinen positiven Teilbericht', () => {
  const { p,linked,thermal } = fixture();
  const r = calculateLinkedThermalPeriod(p,'year',linked,thermal,()=>({status:'blocked',issues:[{code:'METER_MISSING',path:'meter',detail:'missing'}],report:null}));
  assert.equal(r.status,'blocked'); assert.equal(r.report,null);
  assert.equal(r.issues[0].code,'METER_MISSING');
});

test('Rundungsabweichung der Heizungsverteilung verhindert Ergebnisfreigabe', () => {
  const { p,linked,thermal } = fixture();
  const r = calculateLinkedThermalPeriod(p,'year',linked,thermal,(transient, period, plan)=>{
    const report = dummyCalculator(transient, period, plan).report;
    report.totalCostsCents++;
    return { status:'calculated', report };
  });
  assert.equal(r.status,'blocked'); assert.equal(r.issues[0].code,'LINKED_THERMAL_RECONCILIATION_FAILED');
});

test('abweichende Einzelpools oder fehlende negative Freigabeflags sperren', () => {
  const { p,linked,thermal } = fixture();
  const r = calculateLinkedThermalPeriod(p,'year',linked,thermal,(transient, period, plan)=>{
    const report = dummyCalculator(transient, period, plan).report;
    report.streams[0].totalCents++;
    report.legalRelease=true;
    return {status:'calculated',report};
  });
  assert.equal(r.status,'blocked'); assert.equal(r.issues[0].code,'LINKED_THERMAL_RECONCILIATION_FAILED');
});

test('Versorgerabschläge und Mietervorauszahlungen werden nicht als Kosten verarbeitet', () => {
  const { p,linked,thermal } = fixture();
  p.cashflows.push({ id:'tenant_payment',kind:'tenant_payment',amountCents:300000 });
  const r = calculateLinkedThermalPeriod(p,'year',linked,thermal,dummyCalculator);
  assert.equal(r.status,'calculated');
  assert.equal(r.report.totalCostsCents,195001);
  assert.equal(r.report.linkedCosts.providerPaymentsIncluded,false);
});
