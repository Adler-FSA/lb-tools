/** Nebenkosten Premium — landlord data management for Baustein 4.
 * Pure helpers. No legal validity decision, no PDF, no posting.
 */
import { validateProject } from './model.js';

const DAY_MS = 86_400_000;
const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value);
const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
const cents = value => Number.isSafeInteger(value) && value >= 0;
const previousDay = iso => new Date(Date.parse(`${iso}T00:00:00.000Z`) - DAY_MS).toISOString().slice(0, 10);
const overlaps = (a, b) => a.startDate <= b.endDate && (a.endDate ?? '9999-12-31') >= b.startDate;

export class LandlordDataError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LandlordDataError';
    this.code = code;
  }
}

function assertValid(project) {
  const errors = validateProject(project);
  if (errors.length) throw new LandlordDataError('INVALID_PROJECT', `Projektdaten sind ungültig: ${errors[0].code}`);
}
function assertFreshId(project, id) {
  if (!validId(id)) throw new LandlordDataError('INVALID_ID', 'Eine gültige neue Kennung wird benötigt.');
  const collections = [
    'properties','units','usagePeriods','tenancies','contractTerms','accountingPeriods',
    'expenses','allocationRules','meters','readings','cashflows','documents','checkItems','attachments'
  ];
  if (collections.some(name => (project[name] ?? []).some(item => item.id === id)) ||
      (project.supplyRegistry ?? []).some(item => item.id === id)) {
    throw new LandlordDataError('DUPLICATE_ID', 'Diese Kennung ist bereits vergeben.');
  }
}
function tenancyOf(project, tenancyId) {
  const tenancy = project.tenancies.find(item => item.id === tenancyId);
  if (!tenancy) throw new LandlordDataError('TENANCY_REQUIRED', 'Mietverhältnis wurde nicht gefunden.');
  const unit = project.units.find(item => item.id === tenancy.unitId);
  if (!unit) throw new LandlordDataError('UNIT_REQUIRED', 'Einheit des Mietverhältnisses wurde nicht gefunden.');
  return { tenancy, unit };
}
function periodOf(project, periodId) {
  const period = project.accountingPeriods.find(item => item.id === periodId && item.endDate);
  if (!period) throw new LandlordDataError('PERIOD_REQUIRED', 'Abgeschlossenes Abrechnungsjahr wurde nicht gefunden.');
  return period;
}
function normalizeTypes(types) {
  if (!Array.isArray(types) || types.some(x => typeof x !== 'string' || !x.trim())) {
    throw new LandlordDataError('COST_TYPES_REQUIRED', 'Bestätigte Kostenarten müssen als Liste vorliegen.');
  }
  return [...new Set(types.map(x => x.trim()))].sort();
}

export function addInitialContractTerms(project, {
  termId, tenancyId, operatingCostsModel, advanceCents = 0, allowedCostTypes = []
}) {
  assertValid(project);
  assertFreshId(project, termId);
  const { tenancy } = tenancyOf(project, tenancyId);
  if (!['advance','flat','unresolved'].includes(operatingCostsModel)) {
    throw new LandlordDataError('COST_MODEL_REQUIRED', 'Betriebskostenmodell auswählen.');
  }
  if (project.contractTerms.some(term => term.tenancyId === tenancyId)) {
    throw new LandlordDataError('CONTRACT_HISTORY_EXISTS', 'Für dieses Mietverhältnis existiert bereits eine Vertragsfassung.');
  }
  if (operatingCostsModel === 'advance' && !cents(advanceCents)) {
    throw new LandlordDataError('ADVANCE_REQUIRED', 'Monatliche Vorauszahlung muss als nichtnegativer Centbetrag vorliegen.');
  }
  const copy = structuredClone(project);
  copy.contractTerms.push({
    id: termId,
    tenancyId,
    startDate: tenancy.startDate,
    endDate: tenancy.endDate ?? null,
    operatingCostsModel,
    ...(operatingCostsModel === 'advance' ? {
      advanceCents,
      allowedCostTypes: normalizeTypes(allowedCostTypes)
    } : {})
  });
  assertValid(copy);
  return { project: copy, termId };
}

export function changeAdvance(project, {
  tenancyId, effectiveFrom, newAdvanceCents, newTermId
}) {
  assertValid(project);
  assertFreshId(project, newTermId);
  if (!validDay(effectiveFrom) || !cents(newAdvanceCents)) {
    throw new LandlordDataError('ADVANCE_CHANGE_INVALID', 'Gültiges Änderungsdatum und Vorauszahlungsbetrag werden benötigt.');
  }
  const { tenancy } = tenancyOf(project, tenancyId);
  if (effectiveFrom <= tenancy.startDate || (tenancy.endDate && effectiveFrom > tenancy.endDate)) {
    throw new LandlordDataError('ADVANCE_CHANGE_DATE', 'Änderung muss nach Mietbeginn und innerhalb des Mietverhältnisses liegen.');
  }
  if (!effectiveFrom.endsWith('-01')) {
    throw new LandlordDataError('ADVANCE_CHANGE_MID_MONTH', 'Automatisch unterstützte Vorauszahlungsänderungen beginnen am ersten Kalendertag eines Monats.');
  }

  const copy = structuredClone(project);
  const covering = copy.contractTerms.filter(term => term.tenancyId === tenancyId &&
    term.startDate <= effectiveFrom && (term.endDate == null || term.endDate >= effectiveFrom));
  if (covering.length !== 1) {
    throw new LandlordDataError('CONTRACT_HISTORY_AMBIGUOUS', 'Änderungsdatum ist keiner eindeutigen Vertragsfassung zugeordnet.');
  }
  const current = covering[0];
  if (current.operatingCostsModel !== 'advance' || !cents(current.advanceCents) ||
      !Array.isArray(current.allowedCostTypes)) {
    throw new LandlordDataError('ADVANCE_MODEL_REQUIRED', 'Nur eine bestätigte Vorauszahlungsfassung kann automatisch fortgeschrieben werden.');
  }
  if (effectiveFrom === current.startDate) {
    throw new LandlordDataError('ADVANCE_REWRITE', 'Bestehende Vertragsfassung wird nicht still überschrieben.');
  }
  const oldEnd = current.endDate ?? null;
  current.endDate = previousDay(effectiveFrom);
  copy.contractTerms.push({
    ...current,
    id: newTermId,
    startDate: effectiveFrom,
    endDate: oldEnd,
    advanceCents: newAdvanceCents,
    advanceChangeConfirmed: true
  });
  copy.contractTerms.sort((a,b) => a.tenancyId.localeCompare(b.tenancyId) || a.startDate.localeCompare(b.startDate));
  assertValid(copy);
  return { project: copy, newTermId, effectiveFrom };
}

export function recordTenantCashflow(project, {
  cashflowId, tenancyId, accountingPeriodId, kind = 'tenant_payment',
  purpose = 'operating_cost_advance', amountCents, date, confirmedDue = false
}) {
  assertValid(project);
  assertFreshId(project, cashflowId);
  if (!['tenant_payment','tenant_advance_due'].includes(kind) || !cents(amountCents) || !validDay(date)) {
    throw new LandlordDataError('TENANT_CASHFLOW_INVALID', 'Zahlungsart, Betrag und Datum sind unvollständig.');
  }
  if (kind === 'tenant_payment' && !['operating_cost_advance','base_rent'].includes(purpose)) {
    throw new LandlordDataError('PAYMENT_PURPOSE_REQUIRED', 'Mieterzahlung eindeutig als Grundmiete oder Betriebskostenvorauszahlung zuordnen.');
  }
  const { tenancy, unit } = tenancyOf(project, tenancyId);
  const period = periodOf(project, accountingPeriodId);
  if (unit.propertyId !== period.propertyId || date < period.startDate || date > period.endDate) {
    throw new LandlordDataError('PAYMENT_PERIOD_MISMATCH', 'Zahlung gehört nicht zum gewählten Gebäudejahr.');
  }
  if (date < tenancy.startDate || (tenancy.endDate && date > tenancy.endDate)) {
    throw new LandlordDataError('PAYMENT_TENANCY_MISMATCH', 'Datum liegt außerhalb des Mietverhältnisses.');
  }

  const copy = structuredClone(project);
  copy.cashflows.push({
    id: cashflowId,
    kind,
    tenancyId,
    accountingPeriodId,
    amountCents,
    date,
    ...(kind === 'tenant_payment' ? { purpose } : { confirmedDue: confirmedDue === true })
  });
  assertValid(copy);
  return { project: copy, cashflowId };
}

export function confirmTenancyLedger(project, { accountingPeriodId, tenancyId }) {
  assertValid(project);
  const copy = structuredClone(project);
  const period = periodOf(copy, accountingPeriodId);
  const { tenancy, unit } = tenancyOf(copy, tenancyId);
  if (unit.propertyId !== period.propertyId || !overlaps(tenancy, period)) {
    throw new LandlordDataError('TENANCY_PERIOD_MISMATCH', 'Mietverhältnis gehört nicht in dieses Abrechnungsjahr.');
  }
  const ids = new Set(Array.isArray(period.confirmedTenancyIds) ? period.confirmedTenancyIds : []);
  ids.add(tenancyId);
  period.confirmedTenancyIds = [...ids].sort();
  assertValid(copy);
  return { project: copy, accountingPeriodId, tenancyId };
}

export function setStandardAllocationRule(project, {
  ruleId, expenseId, accountingPeriodId, method,
  directUnitId = null, meterIdsByUnit = null
}) {
  assertValid(project);
  assertFreshId(project, ruleId);
  if (!['area','consumption','direct'].includes(method)) {
    throw new LandlordDataError('ALLOCATION_METHOD_REQUIRED', 'Unterstützten Verteilungsmaßstab auswählen.');
  }
  const copy = structuredClone(project);
  const period = periodOf(copy, accountingPeriodId);
  const expense = copy.expenses.find(item => item.id === expenseId && item.propertyId === period.propertyId);
  if (!expense || expense.classification !== 'allocatable') {
    throw new LandlordDataError('ALLOCATABLE_EXPENSE_REQUIRED', 'Umlageposition wurde nicht gefunden oder ist nicht als prüfbare Umlage markiert.');
  }
  if (copy.allocationRules.some(rule => rule.expenseId === expenseId && rule.accountingPeriodId === accountingPeriodId)) {
    throw new LandlordDataError('ALLOCATION_RULE_EXISTS', 'Für diese Kostenposition ist bereits ein Schlüssel gespeichert.');
  }
  const rule = { id: ruleId, expenseId, accountingPeriodId, method, methodConfirmed: true };
  if (method === 'direct') {
    if (!copy.units.some(unit => unit.id === directUnitId && unit.propertyId === period.propertyId)) {
      throw new LandlordDataError('DIRECT_UNIT_REQUIRED', 'Direktzuordnung benötigt eine Einheit dieses Gebäudes.');
    }
    expense.unitId = directUnitId;
  }
  if (method === 'consumption') {
    if (!meterIdsByUnit || typeof meterIdsByUnit !== 'object' || Array.isArray(meterIdsByUnit)) {
      throw new LandlordDataError('METER_MAPPING_REQUIRED', 'Verbrauchsschlüssel benötigt bestätigte Zähler je Einheit.');
    }
    const units = copy.units.filter(unit => unit.propertyId === period.propertyId);
    for (const unit of units) {
      const ids = meterIdsByUnit[unit.id];
      if (!Array.isArray(ids) || !ids.length || ids.some(id =>
        !copy.meters.some(meter => meter.id === id && meter.propertyId === period.propertyId && meter.unitId === unit.id))) {
        throw new LandlordDataError('METER_MAPPING_INVALID', `Zählerzuordnung für ${unit.id} ist unvollständig.`);
      }
    }
    rule.meterIdsByUnit = structuredClone(meterIdsByUnit);
  }
  expense.confirmedForAllocation = true;
  copy.allocationRules.push(rule);
  assertValid(copy);
  return { project: copy, ruleId };
}
