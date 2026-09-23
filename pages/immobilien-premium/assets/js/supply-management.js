/** Nebenkosten Premium — owner supply contract management for Baustein 3.
 * Pure helpers. Contract planning, actual invoices and provider payments remain separate.
 */
import { validateProject } from './model.js';
import { reviewSupplyAccount } from './supply-review.js';

const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value);
const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const nonNegative = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const text = value => typeof value === 'string' && value.trim().length > 0;
const nextDay = value => new Date(Date.parse(`${value}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

export class SupplyManagementError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SupplyManagementError';
    this.code = code;
  }
}

function assertValid(project) {
  const errors = validateProject(project);
  if (errors.length) {
    throw new SupplyManagementError('INVALID_PROJECT', `Projektdaten sind ungültig: ${errors[0].code}`);
  }
}

function assertUniqueRecordId(project, id) {
  if (!validId(id)) throw new SupplyManagementError('INVALID_ID', 'Ungültige Vertragskennung.');
  const globalCollections = [
    'properties','units','usagePeriods','tenancies','contractTerms','accountingPeriods',
    'expenses','allocationRules','meters','readings','cashflows','documents','checkItems','attachments'
  ];
  if ((project.supplyRegistry ?? []).some(item => item.id === id) ||
      globalCollections.some(name => (project[name] ?? []).some(item => item.id === id))) {
    throw new SupplyManagementError('DUPLICATE_ID', 'Diese Kennung ist bereits vergeben.');
  }
}

function periodOf(project, propertyId, accountingPeriodId) {
  const period = project.accountingPeriods.find(item =>
    item.id === accountingPeriodId && item.propertyId === propertyId && item.endDate);
  if (!period) throw new SupplyManagementError('PERIOD_REQUIRED', 'Geschlossene Abrechnungsperiode wird benötigt.');
  return period;
}

function versionValid(version) {
  return version && validDay(version.validFrom) && validDay(version.validTo) &&
    version.validFrom <= version.validTo && text(version.referenceId) &&
    nonNegative(version.baseCentsPerPeriod) && nonNegative(version.plannedWholeUnits) &&
    nonNegative(version.workPriceNumeratorCents) && positive(version.workPriceDenominatorUnits) &&
    text(version.measurementUnit);
}

function overlap(a, b) {
  return a.validFrom <= b.validTo && b.validFrom <= a.validTo;
}

export function createSupplyDraft(project, {
  recordId, propertyId, accountingPeriodId, providerAccountId, providerLabel = '',
  service, contractHolder, unitId = null, priceVersion = null
}) {
  assertValid(project);
  assertUniqueRecordId(project, recordId);
  if (!validId(providerAccountId) || !text(service) || !['owner','tenant_direct'].includes(contractHolder)) {
    throw new SupplyManagementError('CONTRACT_REQUIRED', 'Versorgerkennung, Sparte und Vertragsinhaber werden benötigt.');
  }
  const period = periodOf(project, propertyId, accountingPeriodId);
  if ((project.supplyRegistry ?? []).some(item =>
    item.accountingPeriodId === accountingPeriodId &&
    item.contract?.providerAccountId === providerAccountId)) {
    throw new SupplyManagementError('ACCOUNT_DUPLICATE', 'Dieses Versorgerkonto ist für das Jahr bereits angelegt.');
  }
  if (contractHolder === 'tenant_direct' &&
      !project.units.some(unit => unit.id === unitId && unit.propertyId === propertyId)) {
    throw new SupplyManagementError('DIRECT_UNIT_REQUIRED', 'Direktvertrag muss einer vorhandenen Einheit zugeordnet sein.');
  }
  if (priceVersion !== null && (!versionValid(priceVersion) ||
      priceVersion.validFrom < period.startDate || priceVersion.validTo > period.endDate)) {
    throw new SupplyManagementError('PRICE_VERSION_INVALID', 'Preisstand ist unvollständig oder liegt außerhalb des Abrechnungsjahres.');
  }

  const copy = structuredClone(project);
  copy.supplyRegistry ??= [];
  const contract = {
    providerAccountId,
    providerLabel: String(providerLabel || '').trim(),
    service,
    contractHolder,
    confirmed: false,
    ...(contractHolder === 'tenant_direct' ? { unitId } : {}),
    ...(contractHolder === 'owner' && priceVersion ? {
      priceVersions: [{ ...priceVersion, confirmed: false }]
    } : {})
  };
  copy.supplyRegistry.push({
    id: recordId,
    propertyId,
    accountingPeriodId,
    confirmed: false,
    contract
  });
  assertValid(copy);
  return { project: copy, recordId };
}

export function addSupplyPriceVersion(project, recordId, version) {
  assertValid(project);
  if (!versionValid(version)) {
    throw new SupplyManagementError('PRICE_VERSION_INVALID', 'Preisstand ist unvollständig.');
  }
  const copy = structuredClone(project);
  const record = copy.supplyRegistry?.find(item => item.id === recordId);
  if (!record || record.confirmed !== false || record.contract?.contractHolder !== 'owner') {
    throw new SupplyManagementError('DRAFT_REQUIRED', 'Preisstände können nur an einem Eigentümer-Vertragsentwurf ergänzt werden.');
  }
  const period = periodOf(copy, record.propertyId, record.accountingPeriodId);
  if (version.validFrom < period.startDate || version.validTo > period.endDate) {
    throw new SupplyManagementError('PRICE_PERIOD_INVALID', 'Preisstand muss innerhalb des Abrechnungsjahres liegen.');
  }
  const existing = record.contract.priceVersions ?? [];
  if (existing.some(item => overlap(item, version))) {
    throw new SupplyManagementError('PRICE_OVERLAP', 'Preiszeiträume dürfen sich nicht überschneiden.');
  }
  record.contract.priceVersions = [...existing, { ...version, confirmed: false }]
    .sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  assertValid(copy);
  return { project: copy, recordId };
}

function forecastVersion(version) {
  if (!versionValid(version)) return null;
  const numerator = BigInt(version.workPriceNumeratorCents) * BigInt(version.plannedWholeUnits);
  const work = (numerator + BigInt(version.workPriceDenominatorUnits) / 2n) /
    BigInt(version.workPriceDenominatorUnits);
  const total = BigInt(version.baseCentsPerPeriod) + work;
  if (total > MAX) return null;
  return Number(total);
}

export function previewSupplyPlan(project, recordId) {
  assertValid(project);
  const record = project.supplyRegistry?.find(item => item.id === recordId);
  if (!record) throw new SupplyManagementError('RECORD_NOT_FOUND', 'Versorgungsvertrag wurde nicht gefunden.');
  const period = periodOf(project, record.propertyId, record.accountingPeriodId);
  const contract = record.contract;
  if (contract.contractHolder === 'tenant_direct') {
    return {
      status: 'planning',
      report: {
        recordId, contractHolder: 'tenant_direct', forecastCents: null,
        coverageComplete: true, parts: [], planningOnly: true
      }
    };
  }
  const versions = [...(contract.priceVersions ?? [])].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  const parts = [];
  let cursor = period.startDate;
  let coverageComplete = versions.length > 0;
  for (const version of versions) {
    const forecastCents = forecastVersion(version);
    if (forecastCents === null || version.validFrom !== cursor || version.validTo > period.endDate) {
      coverageComplete = false;
    }
    parts.push({
      validFrom: version.validFrom,
      validTo: version.validTo,
      measurementUnit: version.measurementUnit,
      plannedWholeUnits: version.plannedWholeUnits,
      forecastCents
    });
    if (validDay(version.validTo)) cursor = nextDay(version.validTo);
  }
  if (cursor !== nextDay(period.endDate)) coverageComplete = false;
  const validTotals = parts.filter(item => Number.isSafeInteger(item.forecastCents)).map(item => item.forecastCents);
  const total = validTotals.reduce((sum, value) => sum + BigInt(value), 0n);
  return {
    status: 'planning',
    report: {
      recordId,
      contractHolder: 'owner',
      forecastCents: total <= MAX && validTotals.length === parts.length ? Number(total) : null,
      coverageComplete,
      parts,
      planningOnly: true
    }
  };
}

export function confirmSupplyRecord(project, recordId) {
  assertValid(project);
  const copy = structuredClone(project);
  const record = copy.supplyRegistry?.find(item => item.id === recordId);
  if (!record || record.confirmed !== false) {
    throw new SupplyManagementError('DRAFT_REQUIRED', 'Nur ein Vertragsentwurf kann bestätigt werden.');
  }
  const period = periodOf(copy, record.propertyId, record.accountingPeriodId);
  const contract = record.contract;

  if (contract.contractHolder === 'tenant_direct') {
    const costs = copy.expenses.filter(item => item.propertyId === record.propertyId &&
      item.providerAccountId === contract.providerAccountId &&
      item.startDate <= period.endDate && (item.endDate == null || item.endDate >= period.startDate));
    const payments = copy.cashflows.filter(item => item.propertyId === record.propertyId &&
      item.providerAccountId === contract.providerAccountId && item.kind?.startsWith('provider_'));
    if (costs.length || payments.length) {
      throw new SupplyManagementError('DIRECT_SUPPLY_MIXED', 'Direktvertrag enthält Eigentümerkosten oder Eigentümerzahlungen.');
    }
    contract.directSupplyConfirmed = true;
    contract.expenseIds = [];
    contract.confirmed = true;
    record.confirmed = true;
  } else {
    const versions = contract.priceVersions ?? [];
    if (!versions.length) throw new SupplyManagementError('PRICE_HISTORY_REQUIRED', 'Mindestens ein Preisstand wird benötigt.');
    contract.priceVersions = versions.map(version => ({ ...version, confirmed: true }));

    const costs = copy.expenses.filter(item => item.propertyId === record.propertyId &&
      item.providerAccountId === contract.providerAccountId &&
      item.startDate <= period.endDate && (item.endDate == null || item.endDate >= period.startDate));
    if (!costs.length) throw new SupplyManagementError('INVOICE_REQUIRED', 'Für die Jahresbestätigung fehlt die tatsächliche Rechnung.');
    for (const expense of costs) {
      if (expense.supplyManaged !== true || expense.startDate !== period.startDate ||
          expense.endDate !== period.endDate || !text(expense.invoiceReference) || !text(expense.invoiceLineId)) {
        throw new SupplyManagementError('INVOICE_INVALID', 'Versorgungsrechnung muss belegt und dem vollständigen Abrechnungsjahr zugeordnet sein.');
      }
    }
    const totals = {};
    for (const expense of costs) {
      const old = BigInt(totals[expense.invoiceReference] ?? 0);
      const next = old + BigInt(expense.amountCents);
      if (next > MAX) throw new SupplyManagementError('INVOICE_OVERFLOW', 'Rechnungssumme ist zu groß.');
      totals[expense.invoiceReference] = Number(next);
    }
    contract.expenseIds = costs.map(item => item.id).sort();
    contract.invoiceTotalsCentsByReference = totals;
    contract.confirmed = true;
    record.confirmed = true;
  }

  assertValid(copy);
  const reviewed = reviewSupplyAccount(copy, period.id, contract);
  if (reviewed.status !== 'reviewed') {
    throw new SupplyManagementError(reviewed.issues?.[0]?.code || 'SUPPLY_REVIEW_BLOCKED',
      reviewed.issues?.[0]?.detail || 'Versorgungsvertrag ist noch nicht vollständig prüfbar.');
  }
  return { project: copy, recordId, review: reviewed };
}
