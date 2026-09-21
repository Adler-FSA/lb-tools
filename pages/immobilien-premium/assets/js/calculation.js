/**
 * Nebenkosten Premium — calculation kernel, first safe subset (2.3).
 * New code only. Pure function; no storage, PDF, migration or legal assessment.
 * Money is integer cents; allocations use BigInt and deterministic remainders.
 * An unsupported or ambiguous case blocks the whole result instead of guessing.
 */
import { validateProject } from './model.js';

const SUPPORTED_TYPES = new Set([
  'property_tax', 'building_insurance', 'waste', 'common_electricity', 'cold_water'
]);
const UNSUPPORTED_TYPES = new Set(['heating', 'hot_water', 'co2', 'heating_oil']);
const integer = n => Number.isSafeInteger(n) && n >= 0;
const overlaps = (a, b) => a.startDate <= b.endDate && (a.endDate ?? '9999-12-31') >= b.startDate;
const covers = (a, b) => a.startDate <= b.startDate && (a.endDate === null || a.endDate >= b.endDate);
const idSort = (a, b) => a.id.localeCompare(b.id, 'en');
const sum = values => {
  const result = values.reduce((acc, n) => acc + BigInt(n), 0n);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Centbetrag überschreitet den sicheren Bereich.');
  return Number(result);
};

/** Exact largest-remainder apportionment: all cents allocated, stable ID tie-break. */
export function distributeCents(amountCents, weights) {
  if (!integer(amountCents) || !Array.isArray(weights) || weights.length === 0 ||
      weights.some(({ id, weight }) => typeof id !== 'string' || !integer(weight)) ||
      new Set(weights.map(x => x.id)).size !== weights.length) {
    throw new TypeError('Ungültige Centbeträge oder Gewichte.');
  }
  const denominator = weights.reduce((acc, x) => acc + BigInt(x.weight), 0n);
  if (!denominator) throw new TypeError('Gesamtgewicht muss positiv sein.');
  const portions = weights.map(({ id, weight }) => {
    const numerator = BigInt(amountCents) * BigInt(weight);
    return { id, cents: numerator / denominator, remainder: numerator % denominator };
  });
  const allocated = portions.reduce((acc, x) => acc + x.cents, 0n);
  const remaining = Number(BigInt(amountCents) - allocated);
  const ranked = [...portions].sort((a, b) => a.remainder === b.remainder
    ? a.id.localeCompare(b.id, 'en') : (a.remainder > b.remainder ? -1 : 1));
  for (let i = 0; i < remaining; i++) ranked[i].cents += 1n;
  return portions.sort(idSort).map(x => ({ id: x.id, cents: Number(x.cents) }));
}

const blocked = issues => ({ status: 'blocked', calculationReady: false, issues, report: null });
const issue = (issues, code, path, detail) => issues.push({ code, path, detail });

function scaledReading(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const text = String(value);
  if (!/^\d+(?:\.\d{1,3})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const result = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0') || '0');
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null;
}

/** Requires one uninterrupted area record for the entire period. */
function areaBasis(unit, period, issues) {
  const relevant = unit.areaHistory.filter(a =>
    (a.from <= period.endDate) && ((a.to ?? '9999-12-31') >= period.startDate));
  if (relevant.length !== 1 || relevant[0].from > period.startDate ||
      (relevant[0].to !== null && relevant[0].to < period.endDate)) {
    issue(issues, 'AREA_HISTORY_UNSUPPORTED', `units:${unit.id}`, 'Flächenwechsel oder fehlende vollständige Fläche: gesondert prüfen.');
    return null;
  }
  return relevant[0].hundredthsM2;
}

/** Reading boundaries must be explicit; meter changes are not estimated. */
function consumptionBasis(project, units, period, rule, issues) {
  const byUnit = rule.meterIdsByUnit;
  if (!byUnit || typeof byUnit !== 'object' || Array.isArray(byUnit) ||
      Object.keys(byUnit).sort().join('|') !== units.map(x => x.id).sort().join('|')) {
    issue(issues, 'METER_MAPPING_REQUIRED', `allocationRules:${rule.id}`, 'Zähler pro Wohneinheit vollständig zuordnen.');
    return null;
  }
  const used = new Set();
  const weights = [];
  for (const unit of units) {
    const ids = byUnit[unit.id];
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) {
      issue(issues, 'METER_MAPPING_REQUIRED', `units:${unit.id}`, 'Mindestens einen eindeutigen Zähler zuordnen.');
      continue;
    }
    let value = 0;
    for (const id of ids) {
      if (used.has(id)) { issue(issues, 'METER_DUPLICATED', `meters:${id}`, 'Zähler darf nicht doppelt verteilt werden.'); continue; }
      used.add(id);
      const meter = project.meters.find(x => x.id === id);
      if (!meter || meter.unitId !== unit.id || meter.propertyId !== period.propertyId ||
          (meter.installedAt && meter.installedAt > period.startDate) ||
          (meter.removedAt && meter.removedAt < period.endDate)) {
        issue(issues, 'METER_CHANGE_UNSUPPORTED', `meters:${id}`, 'Zähler fehlt, gehört zu anderer Einheit oder wurde im Jahr gewechselt.');
        continue;
      }
      const start = project.readings.filter(x => x.meterId === id && x.date === period.startDate);
      const end = project.readings.filter(x => x.meterId === id && x.date === period.endDate);
      if (start.length !== 1 || end.length !== 1) {
        issue(issues, 'METER_READING_REQUIRED', `meters:${id}`, 'Eindeutige Anfangs- und Endablesung erforderlich.');
        continue;
      }
      const first = scaledReading(start[0].value);
      const last = scaledReading(end[0].value);
      if (first === null || last === null || last < first) {
        issue(issues, 'METER_READING_INVALID', `meters:${id}`, 'Nicht unterstützte Genauigkeit oder negativer Verbrauch.');
        continue;
      }
      value += last - first;
      if (!Number.isSafeInteger(value)) issue(issues, 'NUMBER_OVERFLOW', `meters:${id}`, 'Verbrauch überschreitet den sicheren Bereich.');
    }
    weights.push({ id: unit.id, weight: value });
  }
  if (issues.length) return null;
  if (weights.every(x => x.weight === 0)) {
    issue(issues, 'ZERO_CONSUMPTION', `allocationRules:${rule.id}`, 'Gesamtverbrauch null: Kostenverteilung nicht automatisch bestimmen.');
    return null;
  }
  return weights;
}

/** Returns a report only when the entire selected period is in the supported, confirmed subset. */
export function calculatePeriod(project, accountingPeriodId) {
  const issues = validateProject(project).map(e => ({ code: e.code, path: e.path, detail: e.message }));
  if (issues.length) return blocked(issues);
  const period = project.accountingPeriods.find(x => x.id === accountingPeriodId);
  if (!period || period.endDate === null) {
    issue(issues, 'PERIOD_REQUIRED', 'accountingPeriodId', 'Abgeschlossene Abrechnungsperiode auswählen.');
    return blocked(issues);
  }
  const units = project.units.filter(x => x.propertyId === period.propertyId).sort(idSort);
  if (!units.length) { issue(issues, 'UNITS_REQUIRED', `accountingPeriods:${period.id}`, 'Keine Wohnungen angelegt.'); return blocked(issues); }
  const occupancy = new Map();
  const tenancyIds = [];
  for (const unit of units) {
    const relevant = project.usagePeriods.filter(x => x.unitId === unit.id && overlaps(x, period));
    if (relevant.length !== 1 || !covers(relevant[0], period)) {
      issue(issues, 'PARTIAL_USAGE_UNSUPPORTED', `units:${unit.id}`, 'Mieterwechsel, Leerstandwechsel oder Lücke: zeitabhängige Verteilung noch nicht freigegeben.');
      continue;
    }
    const usage = relevant[0];
    if (usage.kind === 'tenant') {
      const tenancy = project.tenancies.find(x => x.id === usage.tenancyId);
      if (!tenancy || !covers(tenancy, period)) {
        issue(issues, 'TENANCY_PERIOD_INVALID', `units:${unit.id}`, 'Mietverhältnis deckt die Periode nicht vollständig ab.');
        continue;
      }
      tenancyIds.push(usage.tenancyId);
    }
    occupancy.set(unit.id, usage);
  }
  const terms = new Map();
  for (const tenancyId of tenancyIds) {
    const versions = project.contractTerms.filter(x => x.tenancyId === tenancyId &&
      overlaps(x, period));
    if (versions.length !== 1 || !covers(versions[0], period) || versions[0].operatingCostsModel !== 'advance') {
      issue(issues, 'CONTRACT_MODEL_UNSUPPORTED', `tenancies:${tenancyId}`, 'Durchgehend bestätigtes Vorauszahlungsmodell nötig; Pauschale oder Vertragswechsel gesondert prüfen.');
    } else terms.set(tenancyId, versions[0]);
    if (!Array.isArray(period.confirmedTenancyIds) || !period.confirmedTenancyIds.includes(tenancyId)) {
      issue(issues, 'PAYMENT_LEDGER_UNCONFIRMED', `tenancies:${tenancyId}`, 'Zuordnung der Vorauszahlungen zum Abrechnungsjahr bestätigen.');
    }
  }
  const expenses = project.expenses.filter(x => x.propertyId === period.propertyId && overlaps(x, period));
  if (!expenses.length) issue(issues, 'EXPENSES_REQUIRED', `accountingPeriods:${period.id}`, 'Keine Kosten für dieses Jahr erfasst.');
  const expenseIds = new Set(expenses.map(x => x.id));
  for (const expense of expenses) {
    if (!covers(period, expense)) issue(issues, 'EXPENSE_CROSSES_PERIOD', `expenses:${expense.id}`, 'Leistungszeitraum reicht über das Abrechnungsjahr hinaus.');
    if (expense.classification === 'unresolved') issue(issues, 'COST_UNRESOLVED', `expenses:${expense.id}`, 'Kostenart und Zuordnung klären.');
    if (expense.classification === 'allocatable' &&
        (!SUPPORTED_TYPES.has(expense.category) || expense.confirmedForAllocation !== true)) {
      issue(issues, UNSUPPORTED_TYPES.has(expense.category) ? 'SPECIAL_COST_UNSUPPORTED' : 'COST_NOT_CONFIRMED',
        `expenses:${expense.id}`, 'Kostenart und Umlage noch nicht durch einen unterstützten Ablauf bestätigt.');
    }
  }
  if (issues.length) return blocked(issues);
  const expenseLines = [];
  for (const expense of expenses.sort(idSort)) {
    if (expense.classification === 'owner') {
      expenseLines.push({ expenseId: expense.id, category: expense.category ?? 'owner', amountCents: expense.amountCents,
        method: 'owner_only', unitShares: [], ownerDirectCents: expense.amountCents });
      continue;
    }
    const rules = project.allocationRules.filter(x => x.expenseId === expense.id && x.accountingPeriodId === period.id);
    if (rules.length !== 1 || rules[0].methodConfirmed !== true) {
      issue(issues, 'ALLOCATION_RULE_REQUIRED', `expenses:${expense.id}`, 'Genau eine bestätigte Umlageregel erforderlich.');
      continue;
    }
    const rule = rules[0];
    let weights;
    if (rule.method === 'area') weights = units.map(unit => ({ id: unit.id, weight: areaBasis(unit, period, issues) }));
    else if (rule.method === 'consumption') weights = consumptionBasis(project, units, period, rule, issues);
    else if (rule.method === 'direct' && expense.unitId && units.some(x => x.id === expense.unitId)) {
      weights = units.map(x => ({ id: x.id, weight: Number(x.id === expense.unitId) }));
    } else issue(issues, 'METHOD_UNSUPPORTED', `allocationRules:${rule.id}`, 'Umlageschlüssel für diese Position noch nicht unterstützt.');
    if (!weights || issues.length) continue;
    for (const unit of units) {
      const usage = occupancy.get(unit.id);
      if (usage?.kind !== 'tenant') continue;
      const term = terms.get(usage.tenancyId);
      if (!Array.isArray(term?.allowedCostTypes) || !term.allowedCostTypes.includes(expense.category)) {
        issue(issues, 'CONTRACT_COST_NOT_CONFIRMED', `tenancies:${usage.tenancyId}`, `Kostenart ${expense.category} vertraglich nicht bestätigt.`);
      }
    }
    if (issues.length) continue;
    try {
      const portions = distributeCents(expense.amountCents, weights);
      expenseLines.push({ expenseId: expense.id, category: expense.category, amountCents: expense.amountCents,
        method: rule.method, ruleId: rule.id, weights: weights.map(x => ({ ...x })),
        unitShares: portions.map(x => ({ unitId: x.id, cents: x.cents, kind: occupancy.get(x.id).kind,
          tenancyId: occupancy.get(x.id).kind === 'tenant' ? occupancy.get(x.id).tenancyId : null })), ownerDirectCents: 0 });
    } catch {
      issue(issues, 'ALLOCATION_INVALID', `expenses:${expense.id}`, 'Gewichte oder Beträge lassen sich nicht sicher verteilen.');
    }
  }
  // A payment without a period cannot silently disappear from the current tenant/provider ledger.
  for (const flow of project.cashflows) {
    if (flow.accountingPeriodId == null &&
        ((flow.kind.startsWith('tenant_') && tenancyIds.includes(flow.tenancyId)) ||
         (flow.kind.startsWith('provider_') && flow.propertyId === period.propertyId))) {
      issue(issues, 'PAYMENT_PERIOD_REQUIRED', `cashflows:${flow.id}`, 'Zahlung einer Abrechnungsperiode zuordnen.');
    }
  }
  const relevantFlows = project.cashflows.filter(x => x.accountingPeriodId === period.id);
  const paidByTenancy = new Map(tenancyIds.map(id => [id, 0]));
  for (const flow of relevantFlows) {
    if (flow.kind === 'tenant_payment') {
      if (flow.purpose === 'base_rent' && paidByTenancy.has(flow.tenancyId)) continue;
      if (!paidByTenancy.has(flow.tenancyId) || flow.purpose !== 'operating_cost_advance') {
        issue(issues, 'PAYMENT_ASSIGNMENT_REQUIRED', `cashflows:${flow.id}`, 'Zahlung eindeutig als Betriebskostenvorauszahlung oder Grundmiete zuordnen.');
      } else {
        const next = paidByTenancy.get(flow.tenancyId) + flow.amountCents;
        if (!Number.isSafeInteger(next)) issue(issues, 'NUMBER_OVERFLOW', `cashflows:${flow.id}`, 'Zahlungssumme zu groß.');
        else paidByTenancy.set(flow.tenancyId, next);
      }
    } else if (flow.kind === 'tenant_refund') {
      issue(issues, 'REFUND_REVIEW_REQUIRED', `cashflows:${flow.id}`, 'Rückzahlung gesondert fachlich zuordnen.');
    }
  }
  const providerCosts = new Map();
  for (const x of expenses) if (x.providerAccountId) {
    const next = (providerCosts.get(x.providerAccountId) || 0) + x.amountCents;
    if (!Number.isSafeInteger(next)) issue(issues, 'NUMBER_OVERFLOW', `expenses:${x.id}`, 'Versorgerkostensumme zu groß.');
    else providerCosts.set(x.providerAccountId, next);
  }
  const providerPaid = new Map();
  for (const flow of relevantFlows.filter(x => x.kind.startsWith('provider_'))) {
    if (flow.propertyId !== period.propertyId || !flow.providerAccountId || !providerCosts.has(flow.providerAccountId)) {
      issue(issues, 'PROVIDER_ASSIGNMENT_REQUIRED', `cashflows:${flow.id}`, 'Versorgerzahlung muss zu Kosten und Gebäude passen.');
      continue;
    }
    const old = providerPaid.get(flow.providerAccountId) || 0;
    const next = old + (flow.kind === 'provider_payment' ? flow.amountCents : -flow.amountCents);
    if (!Number.isSafeInteger(next)) issue(issues, 'NUMBER_OVERFLOW', `cashflows:${flow.id}`, 'Versorgerzahlungssumme zu groß.');
    else providerPaid.set(flow.providerAccountId, next);
  }
  if (issues.length) return blocked(issues);
  try {
    const totalCostsCents = sum(expenses.map(x => x.amountCents));
    const ownerDirectCents = sum(expenseLines.map(x => x.ownerDirectCents));
    const ownerAllocatedCents = sum(expenseLines.flatMap(x => x.unitShares.filter(s => s.kind !== 'tenant').map(s => s.cents)));
    const ownerCostsCents = sum([ownerDirectCents, ownerAllocatedCents]);
    const tenants = tenancyIds.map(tenancyId => {
      const costsCents = sum(expenseLines.flatMap(x => x.unitShares.filter(s => s.tenancyId === tenancyId).map(s => s.cents)));
      const advancesCents = paidByTenancy.get(tenancyId);
      const balanceCents = costsCents - advancesCents;
      return { tenancyId, costsCents, advancesCents, balanceCents,
        creditCents: Math.max(0, -balanceCents), additionalCents: Math.max(0, balanceCents) };
    });
    const tenantCostsCents = sum(tenants.map(x => x.costsCents));
    if (sum([ownerCostsCents, tenantCostsCents]) !== totalCostsCents) {
      issue(issues, 'RECONCILIATION_FAILED', 'totals', 'Kostenanteile stimmen nicht mit Gesamtkosten überein.');
      return blocked(issues);
    }
    const providerBalances = [...providerPaid].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([providerAccountId, netPaidCents]) => ({
      providerAccountId, invoicedCents: providerCosts.get(providerAccountId), netPaidCents,
      differenceCents: netPaidCents - providerCosts.get(providerAccountId),
      scope: 'recorded_provider_transactions_only'
    }));
    return { status: 'calculated', calculationReady: true, issues: [], report: {
      periodId: period.id, propertyId: period.propertyId, totalCostsCents, ownerCostsCents,
      ownerDirectCents, ownerAllocatedCents, tenantCostsCents, expenseLines, tenants,
      providerBalances, legalRelease: false, pdfGenerated: false
    } };
  } catch {
    issue(issues, 'NUMBER_OVERFLOW', 'totals', 'Gesamtsumme überschreitet den sicheren Zahlenbereich.');
    return blocked(issues);
  }
}
