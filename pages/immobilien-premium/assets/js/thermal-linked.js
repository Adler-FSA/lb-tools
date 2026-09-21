/**
 * Nebenkosten Premium / MH-07 — documented cost separation for linked systems.
 * Technical pre-allocation ONLY: does not decide statutory applicability, calculate
 * an unmeasured heat quantity, mutate the project or feed the tenant ledger.
 * Original invoice amounts are counted once; supplier payments are not costs.
 */
const SERVICES = ['heating', 'hot_water'];
const CATEGORIES = new Set(['thermal_shared', ...SERVICES, 'co2', 'heating_oil']);
const safe = n => Number.isSafeInteger(n) && n >= 0;
const nonempty = s => typeof s === 'string' && s.trim().length > 0;
const validDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) &&
  !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) &&
  new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
const issue = (issues, code, path, detail) => issues.push({ code, path, detail });
const blocked = issues => ({ status: 'blocked', calculationReady: false, issues, report: null });
const overlapping = (e, period) => e.startDate <= period.endDate &&
  (e.endDate ?? '9999-12-31') >= period.startDate;
const sum = amounts => {
  const total = amounts.reduce((n, amount) => n + BigInt(amount), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Cent overflow');
  return Number(total);
};
const sorted = arr => [...arr].sort((a, b) => a.id.localeCompare(b.id, 'en'));

function ratio(amount, total, hotWater) {
  const denominator = BigInt(total);
  const heatingWeight = denominator - BigInt(hotWater);
  const waterWeight = BigInt(hotWater);
  const numeratorHeat = BigInt(amount) * heatingWeight;
  const numeratorWater = BigInt(amount) * waterWeight;
  let heat = numeratorHeat / denominator;
  let water = numeratorWater / denominator;
  const remainder = BigInt(amount) - heat - water;
  // Exact half-cent ties go to stable service identifier 'heating'.
  if (remainder === 1n) {
    if (numeratorHeat % denominator >= numeratorWater % denominator) heat++;
    else water++;
  }
  return { heatingCents: Number(heat), hotWaterCents: Number(water) };
}

/**
 * plan: {
 *   system:'linked', plantType:'gas_boiler'|'heat_pump'|'commercial_heat',
 *   scopeConfirmed:true, invoiceInventoryConfirmed:true,
 *   co2ExcludedConfirmed:true, sharedExpenseIds:[...],
 *   heatingOnlyExpenseIds:[...], hotWaterOnlyExpenseIds:[...],
 *   co2ExpenseIds:[...], invoiceTotalsCentsByReference:{invoiceRef:int},
 *   basis:{ kind:'fuel_energy'|'heat_energy', unit:'milli_kWh',
 *     totalMilliKWh:int, hotWaterMilliKWh:int, totalEvidenceRef:string,
 *     hotWaterEvidenceRef:string, samePhysicalBasisConfirmed:true,
 *     methodReviewed:true }
 * }
 */
export function separateLinkedThermalCosts(project, accountingPeriodId, plan) {
  const issues = [];
  if (!project || !Array.isArray(project.accountingPeriods) || !Array.isArray(project.expenses)) {
    issue(issues, 'LINKED_PROJECT_INVALID', 'project', 'Abrechnungsperioden und Rechnungen müssen vorliegen.');
    return blocked(issues);
  }
  const periods = project.accountingPeriods.filter(p => p?.id === accountingPeriodId);
  const period = periods[0];
  if (periods.length !== 1 || !nonempty(period?.propertyId) ||
      !validDay(period?.startDate) || !validDay(period?.endDate) ||
      period.startDate > period.endDate) {
    issue(issues, 'LINKED_PERIOD_INVALID', 'accountingPeriodId', 'Eindeutige abgeschlossene Abrechnungsperiode erforderlich.');
    return blocked(issues);
  }
  if (!plan || plan.system !== 'linked' || plan.scopeConfirmed !== true ||
      plan.invoiceInventoryConfirmed !== true || plan.co2ExcludedConfirmed !== true ||
      !['gas_boiler', 'heat_pump', 'commercial_heat'].includes(plan.plantType)) {
    issue(issues, 'LINKED_SCOPE_UNCONFIRMED', 'plan',
      'Anlage, vollständiger Rechnungsbestand und separate CO₂-Behandlung bestätigen.');
    return blocked(issues);
  }
  const b = plan.basis;
  const requiredKind = plan.plantType === 'gas_boiler' ? 'fuel_energy' : 'heat_energy';
  if (!b || b.kind !== requiredKind || b.unit !== 'milli_kWh' ||
      !safe(b.totalMilliKWh) || !safe(b.hotWaterMilliKWh) ||
      b.hotWaterMilliKWh <= 0 || b.totalMilliKWh <= b.hotWaterMilliKWh ||
      !nonempty(b.totalEvidenceRef) || !nonempty(b.hotWaterEvidenceRef) ||
      b.samePhysicalBasisConfirmed !== true || b.methodReviewed !== true) {
    issue(issues, 'LINKED_ENERGY_BASIS_INVALID', 'plan.basis',
      'Gesamte und Warmwasser-Energie benötigen dieselbe bestätigte physikalische Bezugsgröße und zwei Belege; keine automatische Brennstoff-zu-Wärme-Umrechnung.');
    return blocked(issues);
  }
  const fields = {
    thermal_shared: 'sharedExpenseIds', heating: 'heatingOnlyExpenseIds',
    hot_water: 'hotWaterOnlyExpenseIds', co2: 'co2ExpenseIds'
  };
  const selected = new Map();
  const seen = new Set();
  for (const [category, field] of Object.entries(fields)) {
    const ids = plan[field];
    if (!Array.isArray(ids) || ids.some(id => !nonempty(id)) || new Set(ids).size !== ids.length) {
      issue(issues, 'LINKED_INVENTORY_INVALID', `plan.${field}`, 'Eindeutige vollständige Kennungenliste erforderlich (auch leere Listen ausdrücklich angeben).');
      continue;
    }
    for (const id of ids) {
      if (seen.has(id)) issue(issues, 'LINKED_DUPLICATE_SOURCE', `expenses:${id}`, 'Rechnung wurde mehrfach als Quelle angegeben.');
      seen.add(id);
      selected.set(id, category);
    }
  }
  if (issues.length) return blocked(issues);
  const relevant = project.expenses.filter(e => e && e.propertyId === period.propertyId &&
    CATEGORIES.has(e.category) && overlapping(e, period));
  const ids = new Set();
  const invoiceLines = new Set();
  for (const expense of relevant) {
    if (ids.has(expense.id)) issue(issues, 'LINKED_DUPLICATE_SOURCE', `expenses:${expense.id}`, 'Mehrere Rechnungsdatensätze haben dieselbe Kennung.');
    ids.add(expense.id);
    if (selected.get(expense.id) !== expense.category) {
      issue(issues, 'LINKED_INVENTORY_INCOMPLETE', `expenses:${expense.id}`,
        'Jede relevante Rechnung muss genau dem gemeinsamen, direkten oder getrennten CO₂-Bestand zugeordnet sein.');
    }
    const excludedCo2 = expense.category === 'co2';
    if (!safe(expense.amountCents) || expense.startDate !== period.startDate ||
        expense.endDate !== period.endDate ||
        (!excludedCo2 && (expense.classification !== 'allocatable' || expense.confirmedForAllocation !== true)) ||
        !nonempty(expense.invoiceReference) || !nonempty(expense.invoiceLineId)) {
      issue(issues, 'LINKED_INVOICE_UNCONFIRMED', `expenses:${expense.id}`,
        'Betrag, vollständiger Leistungszeitraum, passende Klassifizierung, Beleg und Rechnungsposition sind erforderlich.');
    }
    if (nonempty(expense.invoiceReference) && nonempty(expense.invoiceLineId)) {
      const key = `${expense.invoiceReference}\u0000${expense.invoiceLineId}`;
      if (invoiceLines.has(key)) issue(issues, 'LINKED_DUPLICATE_INVOICE_LINE', `expenses:${expense.id}`,
        'Dieselbe Belegposition wurde mehrfach erfasst.');
      invoiceLines.add(key);
    }
    if (expense.category === 'heating_oil') {
      issue(issues, 'LINKED_FUEL_STOCK_UNSUPPORTED', `expenses:${expense.id}`,
        'Heizölbestand und tatsächlich verbrauchter Brennstoff benötigen einen gesonderten Rechenweg.');
    }
  }
  for (const id of selected.keys()) {
    if (!ids.has(id)) issue(issues, 'LINKED_SOURCE_NOT_FOUND', `expenses:${id}`,
      'Ausgewählte Rechnung fehlt, ist periodenfremd oder gehört zu einem anderen Gebäude.');
  }
  if (!plan.sharedExpenseIds.length) issue(issues, 'LINKED_SHARED_COST_REQUIRED', 'plan.sharedExpenseIds',
    'Eine verbundene Anlage benötigt mindestens eine bestätigte gemeinsame Rechnung.');
  const totals = plan.invoiceTotalsCentsByReference;
  const references = [...new Set(relevant.map(x => x.invoiceReference))].sort();
  if (!totals || typeof totals !== 'object' || Array.isArray(totals) ||
      Object.keys(totals).sort().join('\u0000') !== references.join('\u0000')) {
    issue(issues, 'LINKED_INVOICE_TOTALS_REQUIRED', 'plan.invoiceTotalsCentsByReference',
      'Jede Originalrechnung braucht einen bestätigten vollständigen Gesamtbetrag.');
  }
  const invoiceReconciliations = [];
  if (totals && typeof totals === 'object' && !Array.isArray(totals)) {
    for (const ref of references) {
      const lines = relevant.filter(e => e.invoiceReference === ref);
      const expected = totals[ref];
      if (!safe(expected) || lines.some(e => !safe(e.amountCents))) continue;
      try {
        const actual = sum(lines.map(x => x.amountCents));
        if (actual !== expected) issue(issues, 'LINKED_INVOICE_TOTAL_MISMATCH', `invoices:${ref}`,
          'Summe der erfassten Rechnungspositionen weicht vom bestätigten Originalbetrag ab.');
        invoiceReconciliations.push({ invoiceReference: ref, confirmedTotalCents: expected,
          recordedTotalCents: actual, lineIds: lines.map(x => x.id).sort() });
      } catch { issue(issues, 'LINKED_RECONCILIATION_FAILED', `invoices:${ref}`, 'Rechnungsbeträge sind zu groß.'); }
    }
  }
  if (issues.length) return blocked(issues);
  try {
    const byCategory = category => sorted(relevant.filter(e => e.category === category));
    const sharedLines = byCategory('thermal_shared').map(expense => ({
      sourceExpenseId: expense.id, invoiceReference: expense.invoiceReference,
      originalCents: expense.amountCents,
      ...ratio(expense.amountCents, b.totalMilliKWh, b.hotWaterMilliKWh)
    }));
    const heatingDirect = byCategory('heating').map(e => ({ sourceExpenseId: e.id,
      invoiceReference: e.invoiceReference, cents: e.amountCents }));
    const hotWaterDirect = byCategory('hot_water').map(e => ({ sourceExpenseId: e.id,
      invoiceReference: e.invoiceReference, cents: e.amountCents }));
    const sharedCents = sum(sharedLines.map(x => x.originalCents));
    const sharedHeatingCents = sum(sharedLines.map(x => x.heatingCents));
    const sharedHotWaterCents = sum(sharedLines.map(x => x.hotWaterCents));
    const heatingDirectCents = sum(heatingDirect.map(x => x.cents));
    const hotWaterDirectCents = sum(hotWaterDirect.map(x => x.cents));
    const heatingCents = sum([sharedHeatingCents, heatingDirectCents]);
    const hotWaterCents = sum([sharedHotWaterCents, hotWaterDirectCents]);
    const totalCents = sum([sharedCents, heatingDirectCents, hotWaterDirectCents]);
    if (sum([sharedHeatingCents, sharedHotWaterCents]) !== sharedCents ||
        sum([heatingCents, hotWaterCents]) !== totalCents) throw new RangeError('RECONCILIATION');
    return { status: 'calculated', calculationReady: true, issues: [], report: {
      scope: 'linked_cost_preallocation_only', periodId: period.id, propertyId: period.propertyId,
      basis: { kind: b.kind, unit: b.unit, totalMilliKWh: b.totalMilliKWh,
        hotWaterMilliKWh: b.hotWaterMilliKWh, heatingMilliKWh: b.totalMilliKWh - b.hotWaterMilliKWh,
        totalEvidenceRef: b.totalEvidenceRef, hotWaterEvidenceRef: b.hotWaterEvidenceRef },
      invoiceReconciliations, sharedLines, heatingDirect, hotWaterDirect,
      sharedCents, sharedHeatingCents, sharedHotWaterCents,
      heatingDirectCents, hotWaterDirectCents, heatingCents, hotWaterCents, totalCents,
      excludedCo2ExpenseIds: [...plan.co2ExpenseIds].sort(),
      sourceExpenseIds: [...seen].filter(id => !plan.co2ExpenseIds.includes(id)).sort(),
      providerPaymentsIncluded: false, transferredToThermal: false,
      combinedWithOtherCosts: false, co2Calculated: false, legalRelease: false, pdfGenerated: false
    } };
  } catch {
    issue(issues, 'LINKED_RECONCILIATION_FAILED', 'totals',
      'Quellrechnungen und abgegrenzte Anteile lassen sich nicht centgenau ausgleichen.');
    return blocked(issues);
  }
}
