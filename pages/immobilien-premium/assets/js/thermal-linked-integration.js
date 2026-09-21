/**
 * Nebenkosten Premium / MH-07 — transient bridge from verified linked invoices to
 * the independent thermal apartment calculator. No persistent synthetic invoices,
 * no standard-cost merge, no CO2 allocation or legal/PDF release.
 *
 * The caller supplies calculateThermalPeriod as the fifth argument so that the
 * bridge stays an independently testable pure transformation. A production caller
 * imports calculateThermalPeriod from ./thermal.js and passes it unchanged.
 */
import { separateLinkedThermalCosts } from './thermal-linked.js';

const IDS = Object.freeze({ heating: 'derived_linked_heating', hot_water: 'derived_linked_hot_water' });
const issue = (code, path, detail) => ({ code, path, detail });
const blocked = issues => ({ status: 'blocked', calculationReady: false, issues, report: null });
const safe = value => Number.isSafeInteger(value) && value >= 0;
const sum = values => {
  const result = values.reduce((acc, value) => acc + BigInt(value), 0n);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('OVERFLOW');
  return Number(result);
};

/** Prepares non-persistent derived expenses. Original invoices are NEVER rewritten. */
export function prepareLinkedThermalAllocation(project, accountingPeriodId, linkedPlan, thermalPlan) {
  const pre = separateLinkedThermalCosts(project, accountingPeriodId, linkedPlan);
  if (pre.status !== 'calculated' || !pre.report) return pre;
  const errors = [];
  if (!thermalPlan || thermalPlan.system !== 'separate' ||
      thermalPlan.linkedTransferConfirmed !== true ||
      !Array.isArray(thermalPlan.streams) || thermalPlan.streams.length !== 2 ||
      new Set(thermalPlan.streams.map(stream => stream?.kind)).size !== 2 ||
      thermalPlan.streams.some(stream => !stream || !Object.hasOwn(IDS, stream.kind) ||
        (stream.expenseIds !== undefined && (!Array.isArray(stream.expenseIds) || stream.expenseIds.length !== 0))) ||
      (thermalPlan.absentServices !== undefined &&
        (!Array.isArray(thermalPlan.absentServices) || thermalPlan.absentServices.length !== 0))) {
    errors.push(issue('LINKED_TRANSFER_UNCONFIRMED', 'thermalPlan',
      'Zwei getrennte Wärmearten bestätigen. Original-Kostenlisten dürfen nicht erneut eingebracht werden.'));
    return blocked(errors);
  }
  const knownIds = new Set(Object.values(project).filter(Array.isArray)
    .flatMap(rows => rows.filter(row => row && typeof row === 'object').map(row => row.id)));
  if (Object.values(IDS).some(id => knownIds.has(id))) {
    errors.push(issue('LINKED_DERIVED_ID_CONFLICT', 'project',
      'Reservierte temporäre Rechnungskennung wird bereits verwendet. Keine vorhandene Rechnung überschreiben.'));
    return blocked(errors);
  }
  const sourceIds = new Set(pre.report.sourceExpenseIds);
  const excludedIds = new Set(pre.report.excludedCo2ExpenseIds);
  if (sourceIds.size !== pre.report.sourceExpenseIds.length ||
      excludedIds.size !== pre.report.excludedCo2ExpenseIds.length ||
      [...sourceIds].some(id => excludedIds.has(id))) {
    errors.push(issue('LINKED_SOURCE_AMBIGUOUS', 'linkedPlan', 'Quell- und CO₂-Positionen müssen eindeutig getrennt sein.'));
    return blocked(errors);
  }
  try {
    const period = project.accountingPeriods.find(p => p.id === accountingPeriodId);
    const excludedCo2Cents = sum(project.expenses.filter(e => excludedIds.has(e.id)).map(e => e.amountCents));
    const originalCents = sum(project.expenses.filter(e => sourceIds.has(e.id)).map(e => e.amountCents));
    if (originalCents !== pre.report.totalCents) throw new RangeError('SOURCE_RECONCILIATION');
    // Deep copy rather than mutating the saved model; no raw supplier invoice is
    // passed to the thermal engine alongside a derived cost-pool invoice.
    const transientProject = structuredClone(project);
    transientProject.expenses = transientProject.expenses.filter(e => !sourceIds.has(e.id) && !excludedIds.has(e.id));
    for (const kind of ['heating', 'hot_water']) {
      transientProject.expenses.push({ id: IDS[kind], propertyId: period.propertyId,
        category: kind, amountCents: pre.report[`${kind === 'heating' ? 'heating' : 'hotWater'}Cents`],
        classification: 'allocatable', confirmedForAllocation: true,
        startDate: period.startDate, endDate: period.endDate,
        derivedOnly: true, sourceExpenseIds: [...sourceIds].sort() });
    }
    const transientPlan = structuredClone(thermalPlan);
    transientPlan.streams = transientPlan.streams.map(stream => ({ ...stream,
      expenseIds: [IDS[stream.kind]] }));
    if (sum(transientProject.expenses.filter(e => Object.values(IDS).includes(e.id))
      .map(e => e.amountCents)) !== originalCents) throw new RangeError('DERIVED_RECONCILIATION');
    return { status: 'prepared', calculationReady: false, issues: [], report: null,
      transientProject, transientPlan, preallocation: pre.report,
      audit: { sourceExpenseIds: [...sourceIds].sort(), excludedCo2ExpenseIds: [...excludedIds].sort(),
        excludedCo2Cents, derivedExpenseIds: { ...IDS }, originalCents } };
  } catch {
    errors.push(issue('LINKED_TRANSFER_RECONCILIATION_FAILED', 'linkedPlan',
      'Quellkosten, CO₂-Abgrenzung und temporäre Wärmebeträge stimmen nicht centgenau überein.'));
    return blocked(errors);
  }
}

/** Execute the genuine thermal engine supplied by caller; release always remains disabled. */
export function calculateLinkedThermalPeriod(project, accountingPeriodId, linkedPlan, thermalPlan, calculateThermalPeriod) {
  if (typeof calculateThermalPeriod !== 'function') {
    return blocked([issue('THERMAL_CALCULATOR_REQUIRED', 'calculateThermalPeriod',
      'Unveränderten unabhängigen Heizkosten-Rechenkern übergeben.')]);
  }
  const prepared = prepareLinkedThermalAllocation(project, accountingPeriodId, linkedPlan, thermalPlan);
  if (prepared.status !== 'prepared') return prepared;
  try {
    const result = calculateThermalPeriod(prepared.transientProject, accountingPeriodId, prepared.transientPlan);
    if (!result || result.status !== 'calculated' || !result.report) {
      return blocked(result?.issues?.length ? result.issues :
        [issue('LINKED_THERMAL_CALCULATION_BLOCKED', 'thermal', 'Heizkosten-Aufteilung konnte nicht bestätigt werden.')]);
    }
    const r = result.report;
    const expected = prepared.preallocation;
    const reported = new Map();
    for (const stream of r.streams || []) {
      if (!['heating', 'hot_water'].includes(stream.kind) || reported.has(stream.kind) ||
          !safe(stream.totalCents)) throw new RangeError('INVALID_STREAM');
      reported.set(stream.kind, stream.totalCents);
    }
    if (r.scope !== 'thermal_subreport_only' || r.legalRelease !== false ||
        r.pdfGenerated !== false || r.co2Calculated !== false ||
        r.combinedWithOtherCosts !== false || reported.size !== 2 ||
        reported.get('heating') !== expected.heatingCents ||
        reported.get('hot_water') !== expected.hotWaterCents ||
        r.totalCostsCents !== expected.totalCents ||
        !safe(r.ownerCostsCents) || !Array.isArray(r.tenants) ||
        r.tenants.some(t => !safe(t.costsCents)) ||
        sum([r.ownerCostsCents, ...r.tenants.map(t => t.costsCents)]) !== expected.totalCents) {
      throw new RangeError('MISMATCH');
    }
    return { status: 'calculated', calculationReady: true, issues: [], report: {
      ...r, scope: 'thermal_linked_subreport_only', combinedWithOtherCosts: false,
      co2Calculated: false, legalRelease: false, pdfGenerated: false,
      linkedCosts: { ...prepared.audit, basis: expected.basis,
        invoiceReconciliations: expected.invoiceReconciliations,
        sharedLines: expected.sharedLines, heatingDirect: expected.heatingDirect,
        hotWaterDirect: expected.hotWaterDirect, transferredToThermal: true,
        providerPaymentsIncluded: false }
    } };
  } catch {
    return blocked([issue('LINKED_THERMAL_RECONCILIATION_FAILED', 'thermal',
      'Quellkosten und eigentliche Heizkostenverteilung dürfen sich nicht unterscheiden.')]);
  }
}
