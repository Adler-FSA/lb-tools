/**
 * Nebenkosten Premium: independent, pure supplier contract / invoice / payment review.
 * Forecast NEVER substitutes an original invoice. Supplier payments NEVER become costs.
 * No new expense, cashflow, tenant charge, PDF or booking is created.
 */
const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const safe = n => Number.isSafeInteger(n) && n >= 0;
const text = s => typeof s === 'string' && s.trim().length > 0;
const fail = (code, path, detail) => ({status:'blocked',report:null,issues:[{code,path,detail}]});
const sum = nums => {
  const n = nums.reduce((a,v) => {if(!safe(v))throw RangeError('money');return a+BigInt(v);},0n);
  if(n>MAX)throw RangeError('overflow');
  return Number(n);
};
const signed = n => {if(n > MAX || n < -MAX)throw RangeError('overflow');return Number(n);};
const inside = (e,p) => e?.startDate <= p.endDate && (e.endDate == null || e.endDate >= p.startDate);
const validDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) &&
  !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) &&
  new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
const nextDay = d => new Date(new Date(`${d}T00:00:00Z`).valueOf() + 86400000).toISOString().slice(0, 10);

/** Confirmed, gapless, immutable price periods. Quantities and base charges are per version. */
function priceHistory(versions, period) {
  if (!Array.isArray(versions) || !versions.length) return null;
  let cursor = period.startDate, unit = null;
  const parts = [];
  for (const v of versions) {
    if (!v || !validDay(v.validFrom) || !validDay(v.validTo) ||
        v.validFrom !== cursor || v.validTo < v.validFrom || v.validTo > period.endDate ||
        v.confirmed !== true || !text(v.referenceId) || !safe(v.baseCentsPerPeriod) ||
        !safe(v.plannedWholeUnits) || !safe(v.workPriceNumeratorCents) ||
        !Number.isSafeInteger(v.workPriceDenominatorUnits) || v.workPriceDenominatorUnits <= 0 ||
        !text(v.measurementUnit) || (unit !== null && v.measurementUnit !== unit)) return null;
    unit = v.measurementUnit;
    const work = (BigInt(v.workPriceNumeratorCents) * BigInt(v.plannedWholeUnits) +
      BigInt(v.workPriceDenominatorUnits) / 2n) / BigInt(v.workPriceDenominatorUnits);
    const estimate = signed(BigInt(v.baseCentsPerPeriod) + work);
    parts.push({ validFrom:v.validFrom, validTo:v.validTo, referenceId:v.referenceId,
      measurementUnit:unit, plannedWholeUnits:v.plannedWholeUnits, forecastCents:estimate });
    cursor = nextDay(v.validTo);
  }
  return cursor === nextDay(period.endDate) ? parts : null;
}

export function reviewSupplyAccount(project, periodId, contract) {
  if (!project || !Array.isArray(project.accountingPeriods) ||
      !Array.isArray(project.expenses) || !Array.isArray(project.cashflows))
    return fail('SUPPLY_PROJECT_REQUIRED','project','Buchungskreise und Abrechnungsperioden fehlen.');
  const periods=project.accountingPeriods.filter(p=>p?.id===periodId);
  if(periods.length!==1 || !text(periods[0].propertyId) ||
     !validDay(periods[0].startDate) ||
     !validDay(periods[0].endDate) ||
     periods[0].startDate>periods[0].endDate)
    return fail('SUPPLY_PERIOD_INVALID','periodId','Eindeutige geschlossene Periode benötigt.');
  const period=periods[0];
  if (period.reviewRequired === true || period.rolloverStatus === 'review_required')
    return fail('SUPPLY_YEAR_REVIEW_REQUIRED','period',
      'Neue Jahresperiode zuerst mit tatsächlichen Vertrags-, Rechnungs- und Zahlungswerten bestätigen.');
  if (!contract || !text(contract.providerAccountId) || !text(contract.service) ||
      !['owner','tenant_direct'].includes(contract.contractHolder) || contract.confirmed!==true)
    return fail('SUPPLY_CONTRACT_REQUIRED','contract','Sparte, Vertragsinhaber, Versorgerkonto und Bestätigung fehlen.');
  const costs=project.expenses.filter(e=>e?.propertyId===period.propertyId &&
    e.providerAccountId===contract.providerAccountId && inside(e,period));
  const accountFlows=project.cashflows.filter(f=>f?.propertyId===period.propertyId &&
    f.providerAccountId===contract.providerAccountId && f.kind?.startsWith('provider_'));
  const misplaced=accountFlows.filter(f=>f.accountingPeriodId!==period.id &&
    (!validDay(f.date) || (f.date>=period.startDate && f.date<=period.endDate)));
  if(misplaced.length) return fail('SUPPLY_PAYMENT_UNRESOLVED',`cashflows:${misplaced[0].id}`,
    'Versorgerzahlung liegt im aktuellen Zeitraum, ist aber einer anderen Periode zugeordnet.');
  const payments=accountFlows.filter(f=>f.accountingPeriodId===period.id);
  if(contract.contractHolder==='tenant_direct') {
    if(!text(contract.unitId) || contract.directSupplyConfirmed!==true ||
        costs.length || payments.length ||
        (contract.expenseIds !== undefined && (!Array.isArray(contract.expenseIds) || contract.expenseIds.length)))
      return fail('SUPPLY_DIRECT_CONTRACT_MIXED','contract','Direktvertrag des Mieters darf keine Eigentümerkosten oder -zahlungen enthalten.');
    return {status:'reviewed',issues:[],report:{scope:'tenant_direct_supply_reference_only',
      providerAccountId:contract.providerAccountId,contractHolder:'tenant_direct',unitId:contract.unitId,
      addedOwnerCostsCents:0,addedTenantCostsCents:0,forecastGenerated:false,
      actualOwnerCostsCents:0,netProviderPaidCents:0,postedToExpenses:false,legalRelease:false}};
  }
  let forecastParts;
  try { forecastParts = priceHistory(contract.priceVersions, period); }
  catch { forecastParts = null; }
  if (!forecastParts) return fail('SUPPLY_FORECAST_UNCONFIRMED','contract.priceVersions',
    'Lückenlose bestätigte Preisfassungen mit jeweiligem Grundpreis und geplanter Menge erfassen. Keine automatische Verbrauchs- oder Grundpreisaufteilung.');
  if(!Array.isArray(contract.expenseIds) || !contract.expenseIds.length || !costs.length ||
     new Set(contract.expenseIds).size!==contract.expenseIds.length ||
     costs.length!==contract.expenseIds.length ||
     costs.some(e=>!contract.expenseIds.includes(e.id)))
    return fail('SUPPLY_INVOICE_INVENTORY','contract.expenseIds','Alle Versorger-Rechnungskosten genau einmal erfassen.');
  if (!contract.invoiceTotalsCentsByReference || typeof contract.invoiceTotalsCentsByReference!=='object' ||
      Array.isArray(contract.invoiceTotalsCentsByReference))
    return fail('SUPPLY_INVOICE_TOTAL_REQUIRED','contract.invoiceTotalsCentsByReference','Rechnungsbeträge fehlen.');
  const refSet=new Set();const lineSet=new Set();
  for(const e of costs) {
    if(!safe(e.amountCents)||!text(e.id)||!text(e.invoiceReference)||!text(e.invoiceLineId)||
       e.startDate!==period.startDate||e.endDate!==period.endDate)
      return fail('SUPPLY_INVOICE_INVALID',`expenses:${e?.id}`,'Echte bestätigte Rechnung mit Jahres-Leistungszeitraum nötig.');
    refSet.add(e.invoiceReference);
    const key=`${e.invoiceReference}\u0000${e.invoiceLineId}`;
    if(lineSet.has(key))return fail('SUPPLY_INVOICE_DUPLICATE',`expenses:${e.id}`,'Rechnungsposition doppelt.');
    lineSet.add(key);
  }
  if (refSet.size !== Object.keys(contract.invoiceTotalsCentsByReference).length ||
      [...refSet].some(ref => !Object.hasOwn(contract.invoiceTotalsCentsByReference, ref)))
    return fail('SUPPLY_INVOICE_TOTAL_REQUIRED','contract.invoiceTotalsCentsByReference','Alle Rechnungen mit bestätigter Summe erfassen.');
  try {
    for(const ref of refSet)if(sum(costs.filter(e=>e.invoiceReference===ref).map(e=>e.amountCents))!==
      contract.invoiceTotalsCentsByReference[ref])
      return fail('SUPPLY_INVOICE_TOTAL_MISMATCH',`invoice:${ref}`,'Rechnungssumme weicht von den Positionen ab.');
    for(const f of payments)if(f.accountingPeriodId!==period.id || !safe(f.amountCents) ||
      !['provider_payment','provider_refund'].includes(f.kind))
      return fail('SUPPLY_PAYMENT_UNRESOLVED',`cashflows:${f.id}`,'Versorgerzahlung unbestätigt oder periodenfremd.');
    const forecastCents=sum(forecastParts.map(p=>p.forecastCents));
    const actualCostsCents=sum(costs.map(e=>e.amountCents));
    const paid=signed(payments.reduce((a,f)=>a+BigInt(f.kind==='provider_payment'?f.amountCents:-f.amountCents),0n));
    const difference=signed(BigInt(paid)-BigInt(actualCostsCents));
    return {status:'reviewed',issues:[],report:{scope:'supply_review_only',
      periodId:period.id,propertyId:period.propertyId,providerAccountId:contract.providerAccountId,
      contractHolder:'owner',service:contract.service,forecastCents,forecastParts,forecastIsEstimate:true,
      actualOwnerCostsCents:actualCostsCents,netProviderPaidCents:paid,
      providerDifferenceCents:difference,originalExpenseIds:costs.map(e=>e.id).sort(),
      originalPaymentIds:payments.map(f=>f.id).sort(),
      postedToExpenses:false,addedTenantCostsCents:0,legalRelease:false}};
  } catch {
    return fail('SUPPLY_RECONCILIATION_FAILED','totals','Preis, Rechnungs- oder Zahlungssummen nicht sicher berechenbar.');
  }
}
