import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { calculatePeriod } from '../assets/js/calculation.js';

function fixture() {
  const p = createEmptyProject('contract_history');
  p.properties.push({ id: 'house', label: 'Reines Testhaus' });
  p.units.push(
    { id: 'ownerUnit', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 10000 }] },
    { id: 'rentUnit', propertyId: 'house', areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 10000 }] }
  );
  p.tenancies.push({ id: 'lease', unitId: 'rentUnit', startDate: '2026-01-01', endDate: null });
  p.usagePeriods.push(
    { id: 'ownerUse', unitId: 'ownerUnit', kind: 'owner', startDate: '2026-01-01', endDate: null },
    { id: 'tenantUse', unitId: 'rentUnit', kind: 'tenant', tenancyId: 'lease', startDate: '2026-01-01', endDate: null }
  );
  p.accountingPeriods.push({ id: 'period', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31', confirmedTenancyIds: ['lease'] });
  p.contractTerms.push({ id: 'terms1', tenancyId: 'lease', startDate: '2026-01-01', endDate: null,
    operatingCostsModel: 'advance', advanceCents: 10000, allowedCostTypes: ['property_tax'] });
  p.expenses.push({ id: 'tax', propertyId: 'house', startDate: '2026-01-01', endDate: '2026-12-31',
    classification: 'allocatable', category: 'property_tax', confirmedForAllocation: true, amountCents: 20000 });
  p.allocationRules.push({ id: 'rule', expenseId: 'tax', accountingPeriodId: 'period', method: 'area', methodConfirmed: true });
  p.cashflows.push({ id: 'paid', kind: 'tenant_payment', purpose: 'operating_cost_advance',
    tenancyId: 'lease', accountingPeriodId: 'period', date: '2026-12-01', amountCents: 120000 });
  return p;
}
function changed() {
  const p = fixture();
  p.contractTerms[0].endDate = '2026-06-30';
  p.contractTerms.push({ ...p.contractTerms[0], id: 'terms2', startDate: '2026-07-01', endDate: null,
    advanceCents: 12000, advanceChangeConfirmed: true });
  return p;
}
function run(p) { return calculatePeriod(p, 'period'); }
function blocked(p, code) {
  const result = run(p);
  assert.equal(result.status, 'blocked', JSON.stringify(result));
  assert.equal(result.report, null);
  assert.ok(result.issues.some(issue => issue.code === code), `${code}: ${JSON.stringify(result.issues)}`);
}

test('MH-04: bestätigte Vorauszahlungsänderung Jan–Jun 100 € / Jul–Dez 120 €', () => {
  const p = changed(); const original = JSON.stringify(p);
  const result = run(p);
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.equal(result.report.tenants[0].advancesCents, 120000, 'Nur echte Zahlungen für die Abrechnung');
  assert.equal(result.report.tenants[0].balanceCents, -110000);
  assert.equal(result.report.advanceSchedules[0].scheduledCents, 132000);
  assert.equal(result.report.advanceSchedules[0].paidCents, 120000);
  assert.equal(result.report.advanceSchedules[0].recordedDifferenceCents, 12000);
  assert.equal(result.report.advanceSchedules[0].months.length, 12);
  assert.deepEqual(result.report.advanceSchedules[0].months.map(x => x.amountCents),
    [...Array(6).fill(10000), ...Array(6).fill(12000)]);
  assert.equal(result.report.advanceSchedules[0].months[6].contractTermId, 'terms2');
  assert.equal(result.report.legalRelease, false);
  assert.equal(JSON.stringify(p), original, 'Vertragsverlauf bleibt unverändert');
});

test('Unveränderte Jahresvereinbarung erhält 12 Sollmonate ohne künstliche zusätzliche Forderung', () => {
  const result = run(fixture());
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.equal(result.report.advanceSchedules[0].scheduledCents, 120000);
  assert.equal(result.report.advanceSchedules[0].recordedDifferenceCents, 0);
});

test('Fehlende Bestätigung einer Vertragsänderung sperrt das Gesamtresultat', () => {
  const p = changed(); delete p.contractTerms[1].advanceChangeConfirmed;
  blocked(p, 'ADVANCE_CHANGE_UNCONFIRMED');
});

test('Lücke und Überlappung zwischen Vertragsfassungen werden abgefangen', () => {
  const gap = changed(); gap.contractTerms[1].startDate = '2026-07-02'; blocked(gap, 'CONTRACT_HISTORY_GAP');
  const overlap = changed(); overlap.contractTerms[1].startDate = '2026-06-30'; blocked(overlap, 'CONTRACT_HISTORY_GAP');
});

test('Änderung mitten im Monat führt nicht zu heimlicher Halbmonatsformel', () => {
  const p = changed(); p.contractTerms[0].endDate = '2026-07-14'; p.contractTerms[1].startDate = '2026-07-15';
  blocked(p, 'ADVANCE_CHANGE_MID_MONTH');
});

test('Neue Kostenvereinbarung im laufenden Jahr wird nicht bloß als Betragserhöhung angesehen', () => {
  const p = changed(); p.contractTerms[1].allowedCostTypes = ['property_tax', 'waste'];
  blocked(p, 'CONTRACT_COST_TERMS_CHANGE_REVIEW');
});

test('Wechsel zwischen Pauschale und Vorauszahlung erzeugt keine unzulässige Standardabrechnung', () => {
  const p = changed(); p.contractTerms[1].operatingCostsModel = 'flat';
  blocked(p, 'CONTRACT_MODEL_UNSUPPORTED');
});

test('Abweichende bestätigte Soll-Buchung im vollen Monat muss geklärt werden', () => {
  const p = changed(); p.cashflows.push({ id: 'dueJuly', kind: 'tenant_advance_due', tenancyId: 'lease',
    accountingPeriodId: 'period', date: '2026-07-01', amountCents: 10000, confirmedDue: true });
  blocked(p, 'ADVANCE_DUE_MISMATCH');
});

test('Bestätigte Soll-Buchung eines vollen Monats wird nur einmal übernommen, nicht als Zahlung', () => {
  const p = changed(); p.cashflows.push({ id: 'dueJuly', kind: 'tenant_advance_due', tenancyId: 'lease',
    accountingPeriodId: 'period', date: '2026-07-03', amountCents: 12000, confirmedDue: true });
  const result = run(p);
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.equal(result.report.advanceSchedules[0].scheduledCents, 132000);
  assert.equal(result.report.tenants[0].advancesCents, 120000);
  assert.equal(result.report.advanceSchedules[0].months[6].source, 'confirmed_due_entry');
});

test('Doppelte Soll-Buchung für einen Monat wird nicht doppelt angerechnet', () => {
  const p = changed();
  for (const id of ['dueA', 'dueB']) p.cashflows.push({ id, kind: 'tenant_advance_due', tenancyId: 'lease',
    accountingPeriodId: 'period', date: '2026-07-01', amountCents: 12000, confirmedDue: true });
  blocked(p, 'ADVANCE_DUE_DUPLICATE');
});

test('Teilmonat beim Einzug benötigt bestätigte Soll-Forderung und wird nicht proratiert', () => {
  const p = fixture(); p.tenancies[0].startDate = '2026-01-15'; p.usagePeriods[1].startDate = '2026-01-15';
  p.usagePeriods.push({ id: 'vacancy', unitId: 'rentUnit', kind: 'vacant', startDate: '2026-01-01', endDate: '2026-01-14' });
  p.allocationRules[0].temporalConfirmed = true; p.allocationRules[0].temporalMethod = 'days';
  blocked(p, 'ADVANCE_PARTIAL_MONTH_REVIEW');
  p.cashflows.push({ id: 'dueJanuary', kind: 'tenant_advance_due', tenancyId: 'lease',
    accountingPeriodId: 'period', date: '2026-01-15', amountCents: 5500, confirmedDue: true });
  const result = run(p);
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.equal(result.report.advanceSchedules[0].scheduledCents, 115500);
  assert.equal(result.report.advanceSchedules[0].months[0].amountCents, 5500);
});

test('Unbestätigte Teilmonatsforderung wird auch mit Betrag nicht automatisch verrechnet', () => {
  const p = fixture(); p.tenancies[0].startDate = '2026-01-15'; p.usagePeriods[1].startDate = '2026-01-15';
  p.usagePeriods.push({ id: 'vacancy', unitId: 'rentUnit', kind: 'vacant', startDate: '2026-01-01', endDate: '2026-01-14' });
  p.allocationRules[0].temporalConfirmed = true; p.allocationRules[0].temporalMethod = 'days';
  p.cashflows.push({ id: 'dueJanuary', kind: 'tenant_advance_due', tenancyId: 'lease',
    accountingPeriodId: 'period', date: '2026-01-15', amountCents: 5500 });
  blocked(p, 'ADVANCE_DUE_UNCONFIRMED');
});

test('Soll-Buchung eines fremden Abrechnungsjahrs wird erkannt statt ignoriert', () => {
  const p = fixture(); p.cashflows.push({ id: 'wrongDue', kind: 'tenant_advance_due', tenancyId: 'lease',
    accountingPeriodId: '2027', date: '2026-07-01', amountCents: 10000, confirmedDue: true });
  blocked(p, 'ADVANCE_DUE_PERIOD_MISMATCH');
});

test('Soll-Buchung außerhalb der Mietdauer lässt keine vollständige Abrechnung zu', () => {
  const p = fixture(); p.cashflows.push({ id: 'foreignDue', kind: 'tenant_advance_due', tenancyId: 'lease',
    accountingPeriodId: 'period', date: '2025-12-01', amountCents: 10000, confirmedDue: true });
  blocked(p, 'ADVANCE_DUE_OUTSIDE_SCOPE');
});

test('Ein zweites Eigentümergebäude ohne Mieter besitzt keine erfundenen Sollzahlungen', () => {
  const p = fixture();
  p.usagePeriods[1] = { id: 'ownerRental', unitId: 'rentUnit', kind: 'owner', startDate: '2026-01-01', endDate: null };
  p.tenancies = []; p.contractTerms = []; p.cashflows = []; p.accountingPeriods[0].confirmedTenancyIds = [];
  const result = run(p);
  assert.equal(result.status, 'calculated', JSON.stringify(result.issues));
  assert.deepEqual(result.report.advanceSchedules, []);
});
