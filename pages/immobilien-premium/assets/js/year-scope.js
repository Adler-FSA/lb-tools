/** Period provenance gate; never reclassifies or books an original source. */
const text = value => typeof value === 'string' && value.trim().length > 0;
const blocked = (code, path, detail) => ({ status: 'blocked', calculationReady: false,
  issues: [{ code, path, detail }], report: null });
const overlaps = (expense, period) => expense.startDate <= period.endDate &&
  (expense.endDate == null || expense.endDate >= period.startDate);

/** A ledger line without an end date must never disappear from a year inventory. */
export function inspectAnnualSources(project, periodId) {
  if (!project || !Array.isArray(project.accountingPeriods) || !Array.isArray(project.expenses) ||
      !Array.isArray(project.cashflows) || !Array.isArray(project.units) || !Array.isArray(project.tenancies))
    return blocked('YEAR_SCOPE_PROJECT_INVALID', 'project', 'Vollständige Originalakte erforderlich.');
  const selected = project.accountingPeriods.filter(p => p?.id === periodId);
  if (selected.length !== 1 || !text(selected[0].propertyId) ||
      !text(selected[0].startDate) || !text(selected[0].endDate))
    return blocked('YEAR_SCOPE_PERIOD_INVALID', 'periodId', 'Eindeutiges Gebäude und abgeschlossenes Jahr erforderlich.');
  const period = selected[0];
  const originals = project.expenses.filter(e => e?.propertyId === period.propertyId &&
    overlaps(e, period));
  if (!originals.length || originals.some(e => e.startDate !== period.startDate ||
      e.endDate !== period.endDate))
    return blocked('WORKFLOW_SOURCE_PERIOD_INVALID', 'expenses',
      'Eine offene oder teilweise überschneidende Rechnung darf nicht verschwinden oder unbemerkt anteilig zählen.');
  const unitIds = new Set(project.units.filter(u => u?.propertyId === period.propertyId).map(u => u.id));
  const tenancyIds = new Set(project.tenancies.filter(t => unitIds.has(t?.unitId)).map(t => t.id));
  for (const flow of project.cashflows) {
    if (!flow) continue;
    const relevant = flow.propertyId === period.propertyId || tenancyIds.has(flow.tenancyId);
    if (!relevant) continue;
    if (flow.accountingPeriodId === period.id &&
        (!text(flow.date) || flow.date < period.startDate || flow.date > period.endDate))
      return blocked('YEAR_SCOPE_PAYMENT_DATE', `cashflows:${flow.id}`,
        'Jahresfremde Zahlung benötigt eine eigene geprüfte Zuordnung, keine automatische Jahresanrechnung.');
    if (flow.accountingPeriodId == null &&
        text(flow.date) && flow.date >= period.startDate && flow.date <= period.endDate)
      return blocked('YEAR_SCOPE_PAYMENT_UNASSIGNED', `cashflows:${flow.id}`,
        'Mieter- oder Versorgerzahlung im Jahr ohne geklärte Abrechnungsperiode.');
  }
  return { status: 'verified', issues: [], originals, period };
}
