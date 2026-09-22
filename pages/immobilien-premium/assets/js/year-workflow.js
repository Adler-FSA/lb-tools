/**
 * Baustein 2.3: read-only annual orchestration for the independently developed engines.
 * All original expenses stay in the immutable accounting inventory. Filtered copies
 * exist only to prevent specialist items appearing twice in a calculation kernel.
 * No posting, legal decision, PDF, snapshot release or mutation is performed.
 */
const SPECIAL = new Set(['heating', 'hot_water', 'thermal_shared', 'co2', 'heating_oil']);
const HEAT = new Set(['heating', 'hot_water', 'thermal_shared']);
const blocked = (code, path, detail) => ({ status: 'blocked', calculationReady: false,
  issues: [{ code, path, detail }], report: null });
const has = value => value !== undefined && value !== null;
const cent = value => Number.isSafeInteger(value) && value >= 0;
const exactTotal = values => {
  if (values.some(value => !cent(value))) return null;
  const total = values.reduce((acc, value) => acc + BigInt(value), 0n);
  return total <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(total) : null;
};
const sameIds = (left, right) => Array.isArray(left) && left.length === right.length &&
  left.every((id, index) => id === right[index]);
const good = (result, status) => result?.status === status && result.report &&
  Array.isArray(result.issues) && result.issues.length === 0;

/** All engines are injected by the production entrypoint, never by the browser user. */
export function runAnnualWorkflow(project, periodId, plans, engines) {
  const required = ['validate', 'standard', 'thermalSeparate', 'thermalLinked', 'co2Tenants', 'audit', 'supply'];
  if (!engines || required.some(name => typeof engines[name] !== 'function'))
    return blocked('WORKFLOW_ENGINE_MISSING', 'engines', 'Eine geprüfte Berechnungsfunktion fehlt.');
  try {
    // All engines see disposable copies. Their input mutations must never affect
    // the saved project, caller's plans or subsequent stages of this workflow.
    const source = structuredClone(project);
    const selections = structuredClone(plans ?? {});
    const errors = engines.validate(structuredClone(source));
    if (!Array.isArray(errors) || errors.length) {
      return { status: 'blocked', calculationReady: false, issues: Array.isArray(errors) && errors.length
        ? errors.map(e => ({ code: e.code, path: e.path, detail: e.message ?? e.detail }))
        : [{ code: 'WORKFLOW_PROJECT_INVALID', path: 'project', detail: 'Projektdaten sind ungültig.' }], report: null };
    }
    const periods = source.accountingPeriods.filter(p => p.id === periodId);
    if (periods.length !== 1 || !periods[0].endDate)
      return blocked('WORKFLOW_PERIOD_REQUIRED', 'periodId', 'Geschlossene eindeutige Periode auswählen.');
    const period = periods[0];
    if (period.reviewRequired === true || period.rolloverStatus === 'review_required')
      return blocked('WORKFLOW_YEAR_UNCONFIRMED', 'periodId', 'Folgejahr benötigt eine neue Prüfung.');
    const originals = source.expenses.filter(e => e.propertyId === period.propertyId &&
      e.startDate <= period.endDate && (e.endDate === null || e.endDate >= period.startDate));
    if (!originals.length || originals.some(e => e.startDate !== period.startDate || e.endDate !== period.endDate))
      return blocked('WORKFLOW_SOURCE_PERIOD_INVALID', 'expenses', 'Nur vollständige belegte Jahrespositionen im bestätigten Zeitraum.');
    if (originals.some(e => e.category === 'heating_oil'))
      return blocked('WORKFLOW_HEATING_OIL_UNSUPPORTED', 'expenses', 'Heizöl-Bestand und tatsächlicher Verbrauch benötigen eigene Prüfung.');
    const standardIds = new Set(originals.filter(e => !SPECIAL.has(e.category)).map(e => e.id));
    const heating = originals.filter(e => HEAT.has(e.category));
    const linked = heating.some(e => e.category === 'thermal_shared');
    const co2 = originals.some(e => e.category === 'co2');
    if ((heating.length && !has(selections?.thermal)) || (!heating.length && has(selections?.thermal)) ||
        (linked && !has(selections?.linked)) || (!linked && has(selections?.linked)) ||
        (co2 && (!has(selections?.co2Building) || !has(selections?.co2Tenants))) ||
        (!co2 && (has(selections?.co2Building) || has(selections?.co2Tenants))))
      return blocked('WORKFLOW_PLAN_REQUIRED', 'plans', 'Für alle vorhandenen Sonderkosten genau den passenden geprüften Rechenweg auswählen.');
    if (linked && heating.some(e => e.category === 'heating' || e.category === 'hot_water'))
      return blocked('WORKFLOW_MIXED_THERMAL_UNSUPPORTED', 'expenses', 'Mischbestand aus Original-Wärmetöpfen und verbundenen Rechnungen ist noch nicht integriert.');
    // Original payments are reconciled by the final auditor. The standard engine
    // sees no supplier flows so a heating-only supplier cannot cause a false
    // standard-cost assignment. All real tenant payments remain available.
    let standard = null;
    if (standardIds.size) {
      const copy = structuredClone(source);
      copy.expenses = copy.expenses.filter(e => standardIds.has(e.id));
      copy.allocationRules = copy.allocationRules.filter(r => standardIds.has(r.expenseId));
      copy.cashflows = copy.cashflows.filter(f => !['provider_payment', 'provider_refund'].includes(f.kind));
      // The registry references ORIGINAL invoices and belongs only to the source project.
      delete copy.supplyRegistry;
      delete copy.supplyRegistryVersion;
      standard = engines.standard(copy, periodId);
      if (!good(standard, 'calculated')) return blocked('WORKFLOW_STANDARD_BLOCKED', 'standard',
        `Standardkosten nicht berechenbar: ${standard?.issues?.map(e => e.code).join(', ') || 'unbekannte Ursache'}.`);
    } else if (heating.length || co2) {
      return blocked('WORKFLOW_PAYMENT_BASIS_REQUIRED', 'expenses',
        'Wärme- und CO₂-Kosten ohne Standardkosten: eigenständiger geprüfter Vorauszahlungsnachweis fehlt noch.');
    }
    let thermal = null;
    if (heating.length) {
      if (linked) {
        const copy = structuredClone(source);
        // The linked bridge makes derived expense IDs transiently. Its input must
        // not carry registry or allocation references to invoices it will remove.
        const specialIds = new Set(originals.filter(e => HEAT.has(e.category) || e.category === 'co2')
          .map(e => e.id));
        copy.allocationRules = copy.allocationRules.filter(r => !specialIds.has(r.expenseId));
        delete copy.supplyRegistry;
        delete copy.supplyRegistryVersion;
        thermal = engines.thermalLinked(copy, periodId, structuredClone(selections.linked), structuredClone(selections.thermal));
      }
      else {
        const copy = structuredClone(source);
        copy.expenses = copy.expenses.filter(e => e.category !== 'co2' && e.category !== 'heating_oil');
        const allowed = new Set(copy.expenses.map(e => e.id));
        copy.allocationRules = copy.allocationRules.filter(r => allowed.has(r.expenseId));
        delete copy.supplyRegistry;
        delete copy.supplyRegistryVersion;
        thermal = engines.thermalSeparate(copy, periodId, structuredClone(selections.thermal));
      }
      if (!good(thermal, 'calculated')) return blocked('WORKFLOW_THERMAL_BLOCKED', 'thermal',
        `Heizkosten nicht berechenbar: ${thermal?.issues?.map(e => e.code).join(', ') || 'unbekannte Ursache'}.`);
    }
    let carbon = null;
    if (co2) {
      if (!thermal) return blocked('WORKFLOW_CO2_THERMAL_REQUIRED', 'co2', 'CO₂-Prüfung benötigt einen vollständigen Wärme-Teilbericht.');
      carbon = engines.co2Tenants(structuredClone(source), periodId,
        structuredClone(selections.co2Building), structuredClone(thermal),
        structuredClone(selections.co2Tenants));
      if (!good(carbon, 'preview')) return blocked('WORKFLOW_CO2_BLOCKED', 'co2',
        `CO₂-Prüfung gesperrt: ${carbon?.issues?.map(e => e.code).join(', ') || 'unbekannte Ursache'}.`);
    }
    let supply = null;
    const records = source.supplyRegistry?.filter(r => r.accountingPeriodId === periodId);
    if (records?.length) {
      if (records.some(r => r.propertyId !== period.propertyId || r.confirmed !== true))
        return blocked('WORKFLOW_SUPPLY_UNCONFIRMED', 'supplyRegistry', 'Versorgungsverträge erst vollständig bestätigen.');
      supply = engines.supply(structuredClone(source), periodId, structuredClone(records));
      if (!good(supply, 'reviewed') || supply.report.unreviewedProviderAccountIds?.length)
        return blocked('WORKFLOW_SUPPLY_BLOCKED', 'supplyRegistry', 'Versorger, Rechnungen oder Zahlungskreise unvollständig geprüft.');
    } else if (originals.some(e => e.supplyManaged === true)) {
      return blocked('WORKFLOW_SUPPLY_MISSING', 'supplyRegistry', 'Versorgungsrechnungen ohne bestätigten Vertrag.');
    }
    const audit = engines.audit(structuredClone(source), periodId,
      structuredClone({ standard, thermal, co2: carbon }));
    if (!good(audit, 'preview') || audit.report.scope !== 'period_integrity_preview_only' ||
        audit.report.legalRelease !== false || audit.report.pdfGenerated !== false ||
        audit.report.combinedForPosting !== false)
      return blocked('WORKFLOW_INTEGRITY_BLOCKED', 'audit',
        `Gesamtabgleich nicht bestanden: ${audit?.issues?.map(e => e.code).join(', ') || 'unbekannte Ursache'}.`);
    // Defense in depth: a superficially successful audit cannot substitute a
    // different house, omit an original invoice, inflate totals or claim posting.
    const originalIds = originals.map(e => e.id).sort();
    const originalCents = exactTotal(originals.map(e => e.amountCents));
    const a = audit.report;
    if (originalCents === null || !sameIds(a.originalExpenseIds, originalIds) ||
        a.periodId !== period.id || a.propertyId !== period.propertyId ||
        a.originalCostsCents !== originalCents ||
        exactTotal([a.ownerCostsCents, a.tenantCostsCents]) !== originalCents ||
        a.providerPaymentsIncludedInCosts !== false || a.forecastsIncluded !== false ||
        a.co2Posted !== false)
      return blocked('WORKFLOW_FINAL_RECONCILIATION', 'audit',
        'Originalrechnungen, Gebäude und Kostenanteile müssen im geprüften Jahresbericht exakt übereinstimmen.');
    return { status: 'preview', calculationReady: false, issues: [], report: {
      ...audit.report, scope: 'annual_workflow_preview_only',
      supplyReviewed: supply !== null, originalCostsOnly: true,
      combinedForPosting: false, legalRelease: false, pdfGenerated: false
    } };
  } catch {
    return blocked('WORKFLOW_EXECUTION_BLOCKED', 'workflow', 'Berechnung wurde sicher gestoppt; keine Daten geändert.');
  }
}
