/**
 * MH-09: pure year-change preflight. Proposes ONE empty review-required accounting
 * period, never writes storage, copies old costs or manufactures meter readings.
 * The proposal cannot be persisted or calculated until the calculation engines
 * enforce reviewRequired; this preflight deliberately does not insert it.
 */
const validId = id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id);
const validDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) &&
  !Number.isNaN(new Date(`${d}T00:00:00Z`).valueOf()) &&
  new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
const block = (code, path, detail) => ({status:'blocked',calculationReady:false,report:null,
  issues:[{code,path,detail}]});

export const ROLLOVER_REVIEW_FIELDS = Object.freeze([
  'property_and_unit_areas', 'usage_and_tenancies', 'contract_terms',
  'supplier_price_versions', 'supplier_invoices_and_expenses',
  'meter_installations_and_new_readings', 'allocation_rules_and_legal_exceptions',
  'tenant_advances_actually_paid', 'provider_payments_actually_paid',
  'heating_hot_water_and_co2'
]);

/** A read-only proposal, not a newly opened period or stored project. */
export function previewNextYear(project, sourcePeriodId, proposedPeriodId) {
  if (!project || !validId(project.projectId) || !Array.isArray(project.accountingPeriods) ||
      !Array.isArray(project.properties) || !Array.isArray(project.documents ?? [])) {
    return block('ROLLOVER_PROJECT_INVALID','project','Eine gültige Immobilienakte und Abrechnungsperioden sind nötig.');
  }
  const periods = project.accountingPeriods;
  if (periods.some(p => !p || !validId(p.id) || !validDay(p.startDate) ||
      !validDay(p.endDate) || p.startDate > p.endDate || !validId(p.propertyId))) {
    return block('ROLLOVER_PERIODS_INVALID','accountingPeriods','Alle bestehenden Perioden eindeutig mit gültigem Beginn und Ende erfassen.');
  }
  const matches = periods.filter(p => p.id === sourcePeriodId);
  if (matches.length !== 1 || project.properties.filter(p=>p?.id===matches[0]?.propertyId).length !== 1) {
    return block('ROLLOVER_SOURCE_REQUIRED','sourcePeriodId','Eindeutige Quellperiode mit Eigentümerobjekt erforderlich.');
  }
  const source = matches[0];
  const year = Number(source.startDate.slice(0,4));
  if (!Number.isInteger(year) || year < 2000 || year > 2098 ||
      source.startDate !== `${year}-01-01` || source.endDate !== `${year}-12-31`) {
    return block('ROLLOVER_CALENDAR_YEAR_REQUIRED','sourcePeriodId',
      'Vorerst nur geschlossene vollständige Kalenderjahre; Sonderperioden bleiben zur Fachprüfung gesperrt.');
  }
  if (!validId(proposedPeriodId)) {
    return block('ROLLOVER_ID_INVALID','proposedPeriodId','Neue stabile Periodenkennung erforderlich.');
  }
  for (const [name, records] of Object.entries(project)) {
    if (!Array.isArray(records)) continue;
    if (records.some(r => r?.id === proposedPeriodId)) {
      return block('ROLLOVER_ID_CONFLICT',name,'Neue Kennung existiert bereits in der Immobilienakte.');
    }
  }
  const startDate = `${year+1}-01-01`, endDate = `${year+1}-12-31`;
  if (periods.some(p => p.propertyId === source.propertyId && p.endDate >= startDate)) {
    return block('ROLLOVER_PERIOD_CONFLICT','accountingPeriods',
      'Für dieses Gebäude existiert bereits eine überlappende oder spätere Periode.');
  }
  const published = (project.documents ?? []).filter(d => d?.status === 'released');
  if (published.some(d => !d.snapshot || typeof d.snapshot !== 'object' || Array.isArray(d.snapshot))) {
    return block('ROLLOVER_RELEASED_SNAPSHOT_INVALID','documents',
      'Alte freigegebene Abrechnungen müssen vollständige unveränderte Snapshots besitzen.');
  }
  const draft = {
    id: proposedPeriodId, propertyId: source.propertyId, startDate, endDate,
    previousPeriodId: source.id, rolloverStatus: 'review_required', reviewRequired: true,
    currentYearDataConfirmed: false, legalRelease: false
  };
  return {status:'prepared',calculationReady:false,issues:[],report:{
    scope:'year_rollover_preflight_only',sourcePeriodId:source.id,propertyId:source.propertyId,
    proposedPeriod:{...draft},needsFreshEvidence:[...ROLLOVER_REVIEW_FIELDS],
    previousReleasedDocumentIds:published.map(d=>d.id).sort(),
    originalExpenseCount:Array.isArray(project.expenses)?project.expenses.length:null,
    originalPaymentCount:Array.isArray(project.cashflows)?project.cashflows.length:null,
    originalReadingCount:Array.isArray(project.readings)?project.readings.length:null,
    costsCopied:0,paymentsCopied:0,readingsCopied:0,documentsCopied:0,
    insertedIntoProject:false,persisted:false,legalRelease:false,pdfGenerated:false
  }};
}
