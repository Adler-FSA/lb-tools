import test from 'node:test';
import assert from 'node:assert/strict';
import { separateLinkedThermalCosts } from '../assets/js/thermal-linked.js';

function scenario() {
  const p = {
    accountingPeriods: [{ id: 'year2026', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31' }],
    expenses: [
      { id: 'gas', propertyId: 'house', category: 'thermal_shared', amountCents: 180001,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'allocatable',
        confirmedForAllocation: true, invoiceReference: 'GAS-2026', invoiceLineId: 'energy' },
      { id: 'service', propertyId: 'house', category: 'heating', amountCents: 10000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'allocatable',
        confirmedForAllocation: true, invoiceReference: 'MAINT-2026', invoiceLineId: 'heating' },
      { id: 'waterService', propertyId: 'house', category: 'hot_water', amountCents: 5000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'allocatable',
        confirmedForAllocation: true, invoiceReference: 'MAINT-2026', invoiceLineId: 'hotwater' },
      { id: 'co2', propertyId: 'house', category: 'co2', amountCents: 2000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'unresolved',
        invoiceReference: 'GAS-2026', invoiceLineId: 'co2' },
      { id: 'roof', propertyId: 'house', category: 'repair', amountCents: 50000,
        startDate: '2026-01-01', endDate: '2026-12-31', classification: 'owner' }
    ],
    cashflows: [{ id: 'provider', kind: 'provider_payment', amountCents: 900000 }]
  };
  const plan = { system: 'linked', plantType: 'gas_boiler', scopeConfirmed: true,
    invoiceInventoryConfirmed: true, co2ExcludedConfirmed: true,
    invoiceTotalsCentsByReference: { 'GAS-2026': 182001, 'MAINT-2026': 15000 },
    sharedExpenseIds: ['gas'], heatingOnlyExpenseIds: ['service'],
    hotWaterOnlyExpenseIds: ['waterService'], co2ExpenseIds: ['co2'],
    basis: { kind: 'fuel_energy', unit: 'milli_kWh', totalMilliKWh: 200000,
      hotWaterMilliKWh: 50000, totalEvidenceRef: 'invoice_gas_2026',
      hotWaterEvidenceRef: 'technical_measurement_2026',
      samePhysicalBasisConfirmed: true, methodReviewed: true } };
  return { p, plan };
}
function blocked(change, code) {
  const { p, plan } = scenario();
  change(p, plan);
  const r = separateLinkedThermalCosts(p, 'year2026', plan);
  assert.equal(r.status, 'blocked', JSON.stringify(r));
  assert.equal(r.report, null);
  assert.ok(r.issues.some(i => i.code === code), `${code}: ${JSON.stringify(r.issues)}`);
}

test('verbundene Anlage: gemeinsame echte Rechnung plus direkte Kosten exakt und getrennt', () => {
  const { p, plan } = scenario();
  const original = JSON.stringify({ p, plan });
  const r = separateLinkedThermalCosts(p, 'year2026', plan);
  assert.equal(r.status, 'calculated', JSON.stringify(r.issues));
  assert.equal(r.report.sharedCents, 180001);
  assert.equal(r.report.sharedHeatingCents, 135001);
  assert.equal(r.report.sharedHotWaterCents, 45000);
  assert.equal(r.report.heatingCents, 145001);
  assert.equal(r.report.hotWaterCents, 50000);
  assert.equal(r.report.totalCents, 195001);
  assert.deepEqual(r.report.excludedCo2ExpenseIds, ['co2']);
  assert.deepEqual(r.report.sourceExpenseIds, ['gas', 'service', 'waterService']);
  assert.equal(r.report.providerPaymentsIncluded, false);
  assert.equal(r.report.invoiceReconciliations.length, 2);
  assert.equal(r.report.transferredToThermal, false);
  assert.equal(r.report.legalRelease, false);
  assert.equal(JSON.stringify({ p, plan }), original, 'Quellen bleiben unverändert');
});

test('reproduzierbare Centrundung begünstigt bei exakt halbem Cent den stabilen Schlüssel Heizung', () => {
  const { p, plan } = scenario();
  p.expenses = [p.expenses[0]]; p.expenses[0].amountCents = 1;
  plan.heatingOnlyExpenseIds = []; plan.hotWaterOnlyExpenseIds = []; plan.co2ExpenseIds = [];
  plan.invoiceTotalsCentsByReference = { 'GAS-2026': 1 };
  plan.basis.totalMilliKWh = 2; plan.basis.hotWaterMilliKWh = 1;
  const r = separateLinkedThermalCosts(p, 'year2026', plan);
  assert.equal(r.status, 'calculated');
  assert.equal(r.report.heatingCents, 1);
  assert.equal(r.report.hotWaterCents, 0);
});

test('mehrere gemeinsame Rechnungen werden je Position centgenau verteilt', () => {
  const { p, plan } = scenario();
  p.expenses.push({ ...p.expenses[0], id: 'gas2', amountCents: 9, invoiceReference: 'GAS-02' });
  plan.sharedExpenseIds.push('gas2');
  plan.invoiceTotalsCentsByReference['GAS-02'] = 9;
  const r = separateLinkedThermalCosts(p, 'year2026', plan);
  assert.equal(r.status, 'calculated', JSON.stringify(r.issues));
  assert.equal(r.report.sharedLines.length, 2);
  assert.ok(r.report.sharedLines.every(l => l.originalCents === l.heatingCents + l.hotWaterCents));
  assert.equal(r.report.totalCents, 195010);
});

test('Wärmepumpe und gewerbliche Wärmelieferung akzeptieren nur bestätigte gemeinsame Wärmebasis', () => {
  for (const plantType of ['heat_pump', 'commercial_heat']) {
    const { p, plan } = scenario();
    plan.plantType = plantType; plan.basis.kind = 'heat_energy';
    assert.equal(separateLinkedThermalCosts(p, 'year2026', plan).status, 'calculated');
  }
  blocked((p, plan) => { plan.plantType = 'heat_pump'; }, 'LINKED_ENERGY_BASIS_INVALID');
});

test('Gas-Energie und Wärmeabgabe werden nicht als dieselbe physikalische Größe behandelt', () => {
  blocked((p, plan) => { plan.basis.kind = 'heat_energy'; }, 'LINKED_ENERGY_BASIS_INVALID');
  blocked((p, plan) => { plan.basis.samePhysicalBasisConfirmed = false; }, 'LINKED_ENERGY_BASIS_INVALID');
  blocked((p, plan) => { delete plan.basis.hotWaterEvidenceRef; }, 'LINKED_ENERGY_BASIS_INVALID');
  blocked((p, plan) => { plan.basis.hotWaterMilliKWh = 250000; }, 'LINKED_ENERGY_BASIS_INVALID');
  blocked((p, plan) => { plan.basis.hotWaterMilliKWh = 0; }, 'LINKED_ENERGY_BASIS_INVALID');
});

test('fehlende oder doppelte Rechnungsquellen sperren vor dem Aufteilen', () => {
  blocked((p, plan) => { plan.sharedExpenseIds = []; }, 'LINKED_INVENTORY_INCOMPLETE');
  blocked((p, plan) => { plan.heatingOnlyExpenseIds.push('gas'); }, 'LINKED_DUPLICATE_SOURCE');
  blocked((p, plan) => { plan.sharedExpenseIds = ['unknown']; }, 'LINKED_SOURCE_NOT_FOUND');
  blocked((p, plan) => { p.expenses.push({ ...p.expenses[0] }); }, 'LINKED_DUPLICATE_SOURCE');
});

test('gleiche Rechnungsposition unter zwei Kennungen darf nicht doppelt gezählt werden', () => {
  blocked((p, plan) => {
    p.expenses.push({ ...p.expenses[0], id: 'duplicate' });
    plan.sharedExpenseIds.push('duplicate');
  }, 'LINKED_DUPLICATE_INVOICE_LINE');
});

test('eigene Warmwasserkosten, CO₂ und sonstige Kosten dürfen nicht still verschwinden', () => {
  blocked((p, plan) => { plan.hotWaterOnlyExpenseIds = []; }, 'LINKED_INVENTORY_INCOMPLETE');
  blocked((p, plan) => { plan.co2ExpenseIds = []; }, 'LINKED_INVENTORY_INCOMPLETE');
  blocked((p, plan) => { plan.co2ExpenseIds = ['gas']; }, 'LINKED_DUPLICATE_SOURCE');
  blocked((p, plan) => { plan.co2ExcludedConfirmed = false; }, 'LINKED_SCOPE_UNCONFIRMED');
});

test('Brennstofflagerung Heizöl wird nicht als eingekaufter Jahresverbrauch eingesetzt', () => {
  blocked((p, plan) => { p.expenses.push({ ...p.expenses[0], id: 'oil', category: 'heating_oil' }); }, 'LINKED_FUEL_STOCK_UNSUPPORTED');
});

test('jahresfremde Kosten, fremde Objekte oder unvollständige Leistungen blockieren', () => {
  blocked((p, plan) => { p.expenses[0].endDate = '2027-01-01'; }, 'LINKED_INVOICE_UNCONFIRMED');
  blocked((p, plan) => { p.expenses[0].propertyId = 'other'; }, 'LINKED_SOURCE_NOT_FOUND');
  blocked((p, plan) => { delete p.expenses[0].invoiceReference; }, 'LINKED_INVOICE_UNCONFIRMED');
  blocked((p, plan) => { delete p.expenses[0].invoiceLineId; }, 'LINKED_INVOICE_UNCONFIRMED');
});

test('unbestätigte oder nicht umlagefähige gemeinschaftliche Kosten werden nicht als fertig dargestellt', () => {
  blocked((p, plan) => { p.expenses[0].confirmedForAllocation = false; }, 'LINKED_INVOICE_UNCONFIRMED');
  blocked((p, plan) => { p.expenses[0].classification = 'owner'; }, 'LINKED_INVOICE_UNCONFIRMED');
  blocked((p, plan) => { plan.invoiceInventoryConfirmed = false; }, 'LINKED_SCOPE_UNCONFIRMED');
  blocked((p, plan) => { plan.basis.methodReviewed = false; }, 'LINKED_ENERGY_BASIS_INVALID');
});

test('Kostenüberlauf ergibt keinen Teilbericht', () => {
  blocked((p, plan) => { p.expenses[0].amountCents = Number.MAX_SAFE_INTEGER; }, 'LINKED_RECONCILIATION_FAILED');
});

test('fehlende Rechnungslisten, Periode oder Anlage liefern definierte Fehler', () => {
  const { p, plan } = scenario();
  assert.equal(separateLinkedThermalCosts({}, 'year2026', plan).issues[0].code, 'LINKED_PROJECT_INVALID');
  assert.equal(separateLinkedThermalCosts(p, 'unknown', plan).issues[0].code, 'LINKED_PERIOD_INVALID');
  assert.equal(separateLinkedThermalCosts(p, 'year2026', null).issues[0].code, 'LINKED_SCOPE_UNCONFIRMED');
});

test('Rechnungen anderer Gebäude und sonstige Eigentümerkosten beeinflussen den Teilbericht nicht', () => {
  const { p, plan } = scenario();
  p.expenses.push({ ...p.expenses[0], id: 'neighbor', propertyId: 'other' });
  const r = separateLinkedThermalCosts(p, 'year2026', plan);
  assert.equal(r.status, 'calculated');
  assert.equal(r.report.totalCents, 195001);
});

test('Originalrechnungen müssen auch mit getrenntem CO₂-Posten vollständig abstimmen', () => {
  blocked((p, plan) => { plan.invoiceTotalsCentsByReference['GAS-2026'] = 180001; }, 'LINKED_INVOICE_TOTAL_MISMATCH');
  blocked((p, plan) => { delete plan.invoiceTotalsCentsByReference['MAINT-2026']; }, 'LINKED_INVOICE_TOTALS_REQUIRED');
  blocked((p, plan) => { plan.invoiceTotalsCentsByReference['EXTRA'] = 1; }, 'LINKED_INVOICE_TOTALS_REQUIRED');
  blocked((p, plan) => { p.expenses[0].amountCents += 1; }, 'LINKED_INVOICE_TOTAL_MISMATCH');
});

test('ungültiges Kalenderdatum der Abrechnungsperiode wird nicht übernommen', () => {
  blocked((p, plan) => { p.accountingPeriods[0].endDate = '2026-02-31'; }, 'LINKED_PERIOD_INVALID');
});
