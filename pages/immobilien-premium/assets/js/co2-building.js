/**
 * Nebenkosten Premium MH-08: isolated, evidence-driven building-level CO2 preview.
 * Only a documented full 2026 calendar year, residential central supply, standard
 * classification, checked area and ORIGINAL invoice lines are eligible. No cost
 * may enter a tenant ledger: occupation, individual allocation, statutory special
 * cases and direct tenant contracts require separate reviewed workflows.
 */
const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const safe = n => Number.isSafeInteger(n) && n >= 0;
const positive = n => safe(n) && n > 0;
const text = v => typeof v === 'string' && v.trim().length > 0;
const fail = (code, path, detail) => ({status:'blocked',calculationReady:false,report:null,
  issues:[{code,path,detail}]});
const annual = p => p?.startDate === '2026-01-01' && p?.endDate === '2026-12-31';
const sum = list => {
  const total = list.reduce((n, value) => {
    if (!safe(value)) throw RangeError('INVALID_CENTS');
    return n + BigInt(value);
  }, 0n);
  if (total > MAX) throw RangeError('OVERFLOW');
  return Number(total);
};
// Thresholds expressed in tenths of kg CO2 per m2 and year, as shown in the
// CO2KostAufG annex; the rate is a BUILDING classification, never a tenant invoice.
const thresholdsTenths = [120,170,220,270,320,370,420,470,520];
const tenantPercentByTier = [100,90,80,70,60,50,40,30,20,5];

export function previewBuildingCo2(project, accountingPeriodId, plan) {
  if (!project || !Array.isArray(project.accountingPeriods) ||
      !Array.isArray(project.units) || !Array.isArray(project.expenses))
    return fail('CO2_PROJECT_REQUIRED','project','Gebäude, Wohnungen und Originalrechnungen fehlen.');
  const periods = project.accountingPeriods.filter(p => p?.id === accountingPeriodId);
  if (periods.length !== 1 || !text(periods[0].propertyId) || !annual(periods[0]))
    return fail('CO2_PERIOD_UNSUPPORTED','period','Nur belegte vollständige Kalenderjahre 2026 sind im Prototyp unterstützt.');
  const period = periods[0];
  if (plan?.scope !== 'residential_central_2026' || plan.applicabilityReviewed !== true ||
      plan.specialHeatingCasesExcludedConfirmed !== true ||
      plan.reductionExceptionsExcludedConfirmed !== true ||
      plan.directTenantSupply !== false || plan.invoiceInventoryConfirmed !== true)
    return fail('CO2_SCOPE_REVIEW_REQUIRED','plan','Anwendung, besondere Heizungsfälle, Kürzungen und Eigentümer-Lieferung prüfen.');
  const units = project.units.filter(u => u?.propertyId === period.propertyId);
  if (!units.length || units.some(u => !Array.isArray(u.areaHistory) ||
      u.areaHistory.filter(a => a?.from <= period.startDate &&
        (a.to == null || a.to >= period.endDate)).length !== 1 ||
      u.areaHistory.some(a => a?.from > period.startDate && a.from <= period.endDate) ||
      !positive(u.areaHistory.find(a => a?.from <= period.startDate &&
        (a.to == null || a.to >= period.endDate))?.hundredthsM2)))
    return fail('CO2_AREA_UNSUPPORTED','units','Alle Wohnflächen müssen das vollständige Jahr nachweisbar und unverändert abdecken.');
  const area = units.reduce((n,u) => n + BigInt(u.areaHistory.find(a => a.from <= period.startDate &&
    (a.to == null || a.to >= period.endDate)).hundredthsM2),0n);
  if (area > MAX || !positive(plan.areaHundredthsM2) || BigInt(plan.areaHundredthsM2) !== area ||
      plan.areaBasisConfirmed !== true || !text(plan.areaEvidenceRef))
    return fail('CO2_AREA_UNCONFIRMED','plan.area','Belegte Gebäudewohnfläche muss exakt zur Summe der erfassten Wohnungen passen.');
  if (!safe(plan.emissionsGrams) || !text(plan.emissionsEvidenceRef) ||
      plan.emissionsPeriodConfirmed !== true)
    return fail('CO2_EMISSIONS_UNCONFIRMED','plan.emissions','Tatsächliche Gebäudeemissionen in Gramm und Jahresbeleg bestätigen.');
  if (!Array.isArray(plan.co2ExpenseIds) || !plan.co2ExpenseIds.length ||
      plan.co2ExpenseIds.some(id => !text(id)) ||
      new Set(plan.co2ExpenseIds).size !== plan.co2ExpenseIds.length ||
      !safe(plan.confirmedInvoiceCo2Cents))
    return fail('CO2_INVOICE_REQUIRED','plan.co2ExpenseIds','CO₂-Originalrechnungspositionen und ihre Summe bestätigen.');
  const relevant = project.expenses.filter(e => e?.propertyId === period.propertyId &&
    e.category === 'co2' && e.startDate <= period.endDate &&
    (e.endDate == null || e.endDate >= period.startDate));
  const ids = new Set(plan.co2ExpenseIds);
  const invoiceLines = new Set();
  if (relevant.length !== ids.size) return fail('CO2_INVENTORY_INCOMPLETE','expenses','Alle CO₂-Positionen genau einmal erfassen.');
  for (const e of relevant) {
    if (!ids.has(e.id) || !safe(e.amountCents) || e.startDate !== period.startDate ||
        e.endDate !== period.endDate || !text(e.invoiceReference) || !text(e.invoiceLineId) ||
        !['allocatable','unresolved'].includes(e.classification))
      return fail('CO2_INVOICE_INVALID',`expenses:${e?.id}`,'Beleg, Betrag, Zeitraum oder Zuordnung fehlt.');
    const key = `${e.invoiceReference}\u0000${e.invoiceLineId}`;
    if (invoiceLines.has(key)) return fail('CO2_DUPLICATE_INVOICE_LINE',`expenses:${e.id}`,'Doppelte Originalrechnungsposition.');
    invoiceLines.add(key);
  }
  try {
    const invoice = sum(relevant.map(e => e.amountCents));
    if (invoice !== plan.confirmedInvoiceCo2Cents)
      return fail('CO2_INVOICE_TOTAL_MISMATCH','plan.confirmedInvoiceCo2Cents','CO₂-Kosten stimmen nicht mit der bestätigten Rechnung überein.');
    // emissionsGrams / areaHundredthsM2 == tenths kg/m2; round to one decimal.
    const grams = BigInt(plan.emissionsGrams);
    const tenths = (grams * 2n + area) / (2n * area);
    if (tenths > MAX) throw RangeError('OVERFLOW');
    const specificTenths = Number(tenths);
    const tierIndex = thresholdsTenths.findIndex(edge => specificTenths < edge);
    const stage = tierIndex === -1 ? tenantPercentByTier.length - 1 : tierIndex;
    const tenantPercent = tenantPercentByTier[stage];
    const landlordPercent = 100 - tenantPercent;
    // Cent tie-break is explicitly on landlord share; other share is the residue.
    const landlordCentsBig = (BigInt(invoice) * BigInt(landlordPercent) + 50n) / 100n;
    if (landlordCentsBig > MAX) throw RangeError('OVERFLOW');
    const landlordCents = Number(landlordCentsBig);
    const remainingCents = invoice - landlordCents;
    if (sum([landlordCents,remainingCents]) !== invoice) throw RangeError('RECONCILIATION');
    return {status:'calculated',calculationReady:false,issues:[],report:{
      scope:'co2_building_classification_preview_only',periodId:period.id,propertyId:period.propertyId,
      originalExpenseIds:[...ids].sort(),originalInvoiceCents:invoice,
      areaHundredthsM2:plan.areaHundredthsM2,emissionsGrams:plan.emissionsGrams,
      specificEmissionsTenthsKgPerM2Year:specificTenths,stageIndex:stage + 1,
      landlordPercent,otherPercent:tenantPercent,buildingLandlordPortionCents:landlordCents,
      unallocatedRemainderCents:remainingCents,
      tenantAmountsAssigned:false,directTenantReimbursementCalculated:false,
      transferredToThermal:false,combinedWithOtherCosts:false,legalRelease:false,pdfGenerated:false
    }};
  } catch {
    return fail('CO2_RECONCILIATION_FAILED','totals','Beträge oder Emissionen überschreiten die sichere Berechnung.');
  }
}
