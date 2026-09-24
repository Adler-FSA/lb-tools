/**
 * Read-only supplier-contract registry preflight. One owner's real contract per
 * supplier account / period. References EXISTING expense and cashflow entries;
 * never stores guessed prices or duplicates invoices/payments.
 * The versioned registry is not yet added to project schema or the UI.
 */
import { reviewSupplyAccount } from './supply-review.js';

const text = v => typeof v === 'string' && v.trim().length > 0;
const bad = (code, path) => ({ status: 'blocked', calculationReady: false, report: null,
  issues: [{ code, path, detail: 'Versorgervertrag, Originalbeleg oder Zuordnung ist unvollständig oder widersprüchlich.' }] });

export function reviewSupplyRegistry(project, periodId, records) {
  if (!project || !Array.isArray(project.accountingPeriods) || !Array.isArray(project.units) ||
      !Array.isArray(project.expenses) || !Array.isArray(project.cashflows) ||
      !Array.isArray(records) || !records.length)
    return bad('SUPPLY_REGISTRY_REQUIRED', 'records');
  const selected = project.accountingPeriods.filter(p => p?.id === periodId);
  if (selected.length !== 1 || !text(selected[0].propertyId))
    return bad('SUPPLY_REGISTRY_PERIOD_REQUIRED', 'periodId');
  const period = selected[0];
  if (period.reviewRequired === true || period.rolloverStatus === 'review_required')
    return bad('SUPPLY_REGISTRY_YEAR_UNCONFIRMED', 'period');
  const ownerAccounts = new Set(), recordIds = new Set(), reviewedExpenses = new Set(), invoicedLines = new Set();
  const reports = [];
  for (const [i, record] of records.entries()) {
    if (!record || record.propertyId !== period.propertyId || record.accountingPeriodId !== period.id ||
        !text(record.id) || !record.contract || !text(record.contract.providerAccountId) ||
        !text(record.contract.service) || record.confirmed !== true)
      return bad('SUPPLY_REGISTRY_RECORD_INVALID', `records[${i}]`);
    const account = record.contract.providerAccountId;
    if (recordIds.has(record.id)) return bad('SUPPLY_REGISTRY_DUPLICATE_RECORD', `records[${i}]`);
    recordIds.add(record.id);
    if (ownerAccounts.has(account)) return bad('SUPPLY_REGISTRY_DUPLICATE_ACCOUNT', `records[${i}]`);
    ownerAccounts.add(account);
    if (record.contract.contractHolder === 'tenant_direct' &&
        project.units.filter(u => u.id === record.contract.unitId && u.propertyId === period.propertyId).length !== 1)
      return bad('SUPPLY_REGISTRY_DIRECT_UNIT_INVALID', `records[${i}]`);
    const result = reviewSupplyAccount(project, periodId, record.contract);
    if (result.status !== 'reviewed' || !result.report)
      return { status: 'blocked', calculationReady: false, report: null, issues: result.issues };
    const r = result.report;
    if (r.propertyId != null && r.propertyId !== period.propertyId)
      return bad('SUPPLY_REGISTRY_SOURCE_MISMATCH', `records[${i}]`);
    for (const id of r.originalExpenseIds ?? []) {
      if (reviewedExpenses.has(id)) return bad('SUPPLY_REGISTRY_DUPLICATE_EXPENSE', `expenses:${id}`);
      reviewedExpenses.add(id);
      const expense = project.expenses.find(e => e.id === id && e.propertyId === period.propertyId);
      if (!expense || expense.providerAccountId !== account)
        return bad('SUPPLY_REGISTRY_SOURCE_MISMATCH', `expenses:${id}`);
      const line = `${expense.invoiceReference}\u0000${expense.invoiceLineId}`;
      if (invoicedLines.has(line)) return bad('SUPPLY_REGISTRY_DUPLICATE_INVOICE', `expenses:${id}`);
      invoicedLines.add(line);
    }
    reports.push({ recordId: record.id, providerAccountId: account,
      service: record.contract.service, holder: record.contract.contractHolder,
      actualOwnerCostsCents: r.actualOwnerCostsCents,
      netProviderPaidCents: r.netProviderPaidCents,
      forecastCents: r.forecastCents ?? null,
      sourceExpenseIds: [...(r.originalExpenseIds ?? [])],
      sourcePaymentIds: [...(r.originalPaymentIds ?? [])] });
  }
  const missing = project.expenses.filter(e => e?.propertyId === period.propertyId &&
    e.supplyManaged === true && e.startDate <= period.endDate &&
    (e.endDate == null || e.endDate >= period.startDate) && !reviewedExpenses.has(e.id));
  if (missing.length) return bad('SUPPLY_REGISTRY_INVENTORY_INCOMPLETE', `expenses:${missing[0].id}`);
  const unreviewedAccounts = [...new Set(project.expenses.filter(e => e?.propertyId === period.propertyId &&
    e.providerAccountId && e.startDate <= period.endDate &&
    (e.endDate == null || e.endDate >= period.startDate) &&
    !ownerAccounts.has(e.providerAccountId)).map(e => e.providerAccountId))].sort();
  return { status: 'reviewed', calculationReady: false, issues: [], report: {
    scope: 'supply_registry_review_only', periodId, propertyId: period.propertyId,
    accounts: reports.sort((a, b) => a.providerAccountId.localeCompare(b.providerAccountId, 'en')),
    unreviewedProviderAccountIds: unreviewedAccounts,
    originalExpenseIds: [...reviewedExpenses].sort(),
    actualCostsPosted: false, providerPaymentsPosted: false, tenantChargesPosted: false,
    legalRelease: false, pdfGenerated: false, persisted: false
  } };
}
