import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { calculatePeriod, distributeCents } from '../assets/js/calculation.js';

function fixture() {
  const p = createEmptyProject('project_mh01');
  p.properties.push({ id: 'house01', label: 'Fiktives Musterhaus' });
  p.units.push(
    { id: 'unitA', propertyId: 'house01', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 12000 }] },
    { id: 'unitB', propertyId: 'house01', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }] }
  );
  p.usagePeriods.push(
    { id: 'ownerA', unitId: 'unitA', kind: 'owner', startDate: '2026-01-01', endDate: null },
    { id: 'tenantB', unitId: 'unitB', kind: 'tenant', tenancyId: 'leaseB', startDate: '2026-01-01', endDate: null }
  );
  p.tenancies.push({ id: 'leaseB', unitId: 'unitB', startDate: '2026-01-01', endDate: null });
  p.contractTerms.push({ id: 'termsB', tenancyId: 'leaseB', startDate: '2026-01-01', endDate: null,
    operatingCostsModel: 'advance', advanceCents: 10000,
    allowedCostTypes: ['property_tax', 'building_insurance', 'waste', 'common_electricity', 'cold_water'] });
  p.accountingPeriods.push({ id: 'year2026', propertyId: 'house01', startDate: '2026-01-01', endDate: '2026-12-31',
    confirmedTenancyIds: ['leaseB'] });
  const entries = [
    ['tax', 60000, 'property_tax'], ['insurance', 90000, 'building_insurance'],
    ['waste', 50000, 'waste'], ['electricity', 20000, 'common_electricity'],
    ['water', 50000, 'cold_water'], ['roof', 100000, 'repair']
  ];
  for (const [id, amountCents, category] of entries) {
    const owner = id === 'roof';
    p.expenses.push({ id, propertyId: 'house01', startDate: '2026-01-01', endDate: '2026-12-31',
      amountCents, classification: owner ? 'owner' : 'allocatable', category,
      ...(owner ? {} : { confirmedForAllocation: true }), ...(id === 'water' ? { providerAccountId: 'water_supplier' } : {}) });
    if (!owner) p.allocationRules.push({ id: `rule_${id}`, expenseId: id, accountingPeriodId: 'year2026',
      method: id === 'water' ? 'consumption' : 'area', methodConfirmed: true,
      ...(id === 'water' ? { meterIdsByUnit: { unitA: ['meterA'], unitB: ['meterB'] } } : {}) });
  }
  p.meters.push({ id: 'meterA', propertyId: 'house01', unitId: 'unitA', installedAt: '2025-01-01' },
    { id: 'meterB', propertyId: 'house01', unitId: 'unitB', installedAt: '2025-01-01' });
  p.readings.push(
    { id: 'readA1', meterId: 'meterA', date: '2026-01-01', value: 100 },
    { id: 'readA2', meterId: 'meterA', date: '2026-12-31', value: 155 },
    { id: 'readB1', meterId: 'meterB', date: '2026-01-01', value: 10 },
    { id: 'readB2', meterId: 'meterB', date: '2026-12-31', value: 55 }
  );
  p.cashflows.push(
    { id: 'tenantPaid', kind: 'tenant_payment', tenancyId: 'leaseB',
      accountingPeriodId: 'year2026', purpose: 'operating_cost_advance', amountCents: 120000, date: '2026-12-01' },
    { id: 'providerPaid', kind: 'provider_payment', propertyId: 'house01', providerAccountId: 'water_supplier',
      accountingPeriodId: 'year2026', amountCents: 60000, date: '2026-12-01' }
  );
  return p;
}
const blockedWith = (p, code, period = 'year2026') => {
  const actual = calculatePeriod(p, period);
  assert.equal(actual.status, 'blocked', JSON.stringify(actual));
  assert.equal(actual.report, null);
  assert.ok(actual.issues.some(x => x.code === code), `${code} fehlt: ${JSON.stringify(actual.issues)}`);
};

test('MH-01: getrennte Haus-, Eigentümer-, Mieter- und Versorgerrechnung', () => {
  const p = fixture(); const original = JSON.stringify(p);
  const { status, issues, report } = calculatePeriod(p, 'year2026');
  assert.equal(status, 'calculated'); assert.deepEqual(issues, []);
  assert.equal(report.totalCostsCents, 370000);
  assert.equal(report.ownerCostsCents, 259500);
  assert.equal(report.ownerDirectCents, 100000);
  assert.equal(report.tenantCostsCents, 110500);
  assert.deepEqual(report.tenants, [{ tenancyId: 'leaseB', costsCents: 110500, advancesCents: 120000,
    balanceCents: -9500, creditCents: 9500, additionalCents: 0 }]);
  assert.equal(report.providerBalances[0].differenceCents, 10000);
  assert.equal(report.providerBalances[0].scope, 'recorded_provider_transactions_only');
  assert.equal(report.legalRelease, false);
  assert.equal(JSON.stringify(p), original, 'Rechenfunktion darf Datensätze nicht verändern');
});

test('jede Kostenposition wird centgenau verteilt und bleibt getrennt dokumentiert', () => {
  const { report } = calculatePeriod(fixture(), 'year2026');
  assert.equal(report.expenseLines.length, 6);
  for (const line of report.expenseLines) {
    assert.equal(line.unitShares.reduce((n, x) => n + x.cents, line.ownerDirectCents), line.amountCents);
  }
  const water = report.expenseLines.find(x => x.expenseId === 'water');
  assert.deepEqual(water.unitShares.map(x => x.cents), [27500, 22500]);
});

test('Cent-Rundung: jeder Cent wird verteilt, Gleichstand stabil nach ID', () => {
  assert.deepEqual(distributeCents(101, [{ id: 'B', weight: 1 }, { id: 'A', weight: 1 }]),
    [{ id: 'A', cents: 51 }, { id: 'B', cents: 50 }]);
  assert.equal(distributeCents(370000, [{ id: 'A', weight: 120 }, { id: 'B', weight: 80 }])
    .reduce((a, b) => a + b.cents, 0), 370000);
});

test('MH-02: fehlende Vertrags- und Zahlungsbestätigungen beim Nachmieter sperren', () => {
  const p = fixture(); p.usagePeriods[1].endDate = '2026-06-30';
  p.usagePeriods.push({ id: 'tenantB2', unitId: 'unitB', kind: 'tenant', tenancyId: 'leaseB2',
    startDate: '2026-07-01', endDate: null });
  p.tenancies.push({ id: 'leaseB2', unitId: 'unitB', startDate: '2026-07-01', endDate: null });
  blockedWith(p, 'CONTRACT_MODEL_UNSUPPORTED');
});

test('MH-03: ohne bestätigte Zeitregel und Zwischenablesung sperrt der Leerstand', () => {
  const p = fixture(); p.usagePeriods[1].startDate = '2026-07-01';
  p.usagePeriods.push({ id: 'vacancyB', unitId: 'unitB', kind: 'vacant', startDate: '2026-01-01', endDate: '2026-06-30' });
  blockedWith(p, 'TEMPORAL_RULE_REQUIRED');
});

test('Ganzjähriger Leerstand trägt seinen Anteil beim Eigentümer', () => {
  const p = fixture(); p.usagePeriods[1] = { id: 'vacancyB', unitId: 'unitB', kind: 'vacant', startDate: '2026-01-01', endDate: null };
  p.tenancies = []; p.contractTerms = []; p.accountingPeriods[0].confirmedTenancyIds = []; p.cashflows = [p.cashflows[1]];
  const result = calculatePeriod(p, 'year2026');
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.equal(result.report.ownerCostsCents, 370000);
  assert.deepEqual(result.report.tenants, []);
});

test('MH-04: Vertragsänderung, Pauschale und unbestätigte Zahlungen sperren Ergebnis', () => {
  const changed = fixture(); changed.contractTerms[0].endDate = '2026-06-30';
  changed.contractTerms.push({ ...changed.contractTerms[0], id: 'termsB2', startDate: '2026-07-01', endDate: null, advanceCents: 12000 });
  blockedWith(changed, 'CONTRACT_MODEL_UNSUPPORTED');
  const flat = fixture(); flat.contractTerms[0].operatingCostsModel = 'flat'; blockedWith(flat, 'CONTRACT_MODEL_UNSUPPORTED');
  const unpaid = fixture(); delete unpaid.accountingPeriods[0].confirmedTenancyIds; blockedWith(unpaid, 'PAYMENT_LEDGER_UNCONFIRMED');
});

test('MH-05: Zählerwechsel ist ein eigenständiger, nicht automatisch geschätzter Fall', () => {
  const p = fixture(); p.meters[0].removedAt = '2026-06-30';
  blockedWith(p, 'METER_CHANGE_UNSUPPORTED');
});

test('MH-06: fehlende und rückläufige Zählerstände werden nicht auf null gesetzt', () => {
  const missing = fixture(); missing.readings.pop(); blockedWith(missing, 'METER_READING_REQUIRED');
  const reverse = fixture(); reverse.readings[3].value = 4; blockedWith(reverse, 'METER_READING_INVALID');
});

test('MH-07: Heizkosten benötigen eigenen bestätigten Sonderrechenkern', () => {
  const p = fixture(); p.expenses[0].category = 'heating'; blockedWith(p, 'SPECIAL_COST_UNSUPPORTED');
});

test('MH-08: CO2-Kosten werden nicht wie gewöhnliche Flächenkosten verteilt', () => {
  const p = fixture(); p.expenses[0].category = 'co2'; blockedWith(p, 'SPECIAL_COST_UNSUPPORTED');
});

test('MH-09: anderes Abrechnungsjahr ändert 2026 nicht, fremde Rechnungen werden nicht übernommen', () => {
  const p = fixture(); p.accountingPeriods.push({ id: 'year2027', propertyId: 'house01', startDate: '2027-01-01',
    endDate: '2027-12-31', confirmedTenancyIds: ['leaseB'] });
  p.expenses.push({ id: 'future', propertyId: 'house01', startDate: '2027-01-01', endDate: '2027-12-31',
    category: 'property_tax', classification: 'allocatable', confirmedForAllocation: true, amountCents: 999999 });
  const before = JSON.stringify(p);
  assert.equal(calculatePeriod(p, 'year2026').report.totalCostsCents, 370000);
  assert.equal(JSON.stringify(p), before);
});

test('nicht klassifizierte Kosten, unbestätigte Umlage und fremde Kosten sind keine Freigabe', () => {
  const unresolved = fixture(); unresolved.expenses[0].classification = 'unresolved'; blockedWith(unresolved, 'COST_UNRESOLVED');
  const rule = fixture(); rule.allocationRules[0].methodConfirmed = false; blockedWith(rule, 'ALLOCATION_RULE_REQUIRED');
  const contract = fixture(); contract.contractTerms[0].allowedCostTypes = []; blockedWith(contract, 'CONTRACT_COST_NOT_CONFIRMED');
  const cross = fixture(); cross.expenses[0].endDate = '2027-01-01'; blockedWith(cross, 'EXPENSE_CROSSES_PERIOD');
});

test('ungeklärte Zahlungen oder Rückzahlungen werden nicht als Vorauszahlung ausgegeben', () => {
  const wrong = fixture(); delete wrong.cashflows[0].purpose; blockedWith(wrong, 'PAYMENT_ASSIGNMENT_REQUIRED');
  const refund = fixture(); refund.cashflows.push({ id: 'tenantRefund', kind: 'tenant_refund', tenancyId: 'leaseB',
    accountingPeriodId: 'year2026', amountCents: 1000, date: '2026-12-01' });
  blockedWith(refund, 'REFUND_REVIEW_REQUIRED');
});

test('unbekannte Versorgerzuordnung sperrt den Zahlungsstand, nicht stille Vermischung', () => {
  const p = fixture(); p.cashflows[1].providerAccountId = 'wrong'; blockedWith(p, 'PROVIDER_ASSIGNMENT_REQUIRED');
});

test('Rundungs- und Überlaufprüfung darf keinen Scheinbetrag ausgeben', () => {
  const p = fixture(); p.expenses[0].amountCents = Number.MAX_SAFE_INTEGER;
  blockedWith(p, 'NUMBER_OVERFLOW');
});

test('Grundmiete wird nicht als Betriebskostenvorauszahlung angerechnet', () => {
  const p = fixture(); p.cashflows.push({ id: 'rentPaid', kind: 'tenant_payment', purpose: 'base_rent',
    tenancyId: 'leaseB', accountingPeriodId: 'year2026', date: '2026-12-01', amountCents: 200000 });
  const actual = calculatePeriod(p, 'year2026');
  assert.equal(actual.status, 'calculated', JSON.stringify(actual.issues));
  assert.equal(actual.report.tenants[0].advancesCents, 120000);
});

test('Zahlungen ohne Perioden-Zuordnung verschwinden nicht aus dem Ergebnis', () => {
  const p = fixture(); delete p.cashflows[0].accountingPeriodId; blockedWith(p, 'PAYMENT_PERIOD_REQUIRED');
});
