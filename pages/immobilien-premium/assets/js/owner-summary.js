/** Pure owner-organisation summary for Baustein 3 UI.
 * No legal allocation and no posting. Actual expenses and provider cashflows stay separate.
 */
import { validateProject } from './model.js';

const safeSum = values => {
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError('Betrag überschreitet den sicheren Zahlenbereich.');
  }
  return Number(total);
};
const overlaps = (item, period) =>
  item.startDate <= period.endDate && (item.endDate ?? '9999-12-31') >= period.startDate;

export function buildOwnerSummary(project, propertyId, accountingPeriodId) {
  const structural = validateProject(project);
  if (structural.length) {
    return { status: 'blocked', issues: structural, report: null };
  }
  const property = project.properties.find(item => item.id === propertyId);
  const period = project.accountingPeriods.find(item =>
    item.id === accountingPeriodId && item.propertyId === propertyId);
  if (!property || !period || period.endDate == null) {
    return {
      status: 'blocked',
      issues: [{ code: 'OWNER_SUMMARY_SCOPE', detail: 'Immobilie und abgeschlossene Abrechnungsperiode werden benötigt.' }],
      report: null
    };
  }

  const expenses = project.expenses
    .filter(item => item.propertyId === propertyId && overlaps(item, period))
    .sort((a, b) => a.id.localeCompare(b.id, 'de'));

  const providerFlows = project.cashflows
    .filter(item => item.propertyId === propertyId &&
      item.accountingPeriodId === accountingPeriodId &&
      (item.kind === 'provider_payment' || item.kind === 'provider_refund'));

  const byCategory = new Map();
  for (const expense of expenses) {
    const current = byCategory.get(expense.category ?? 'other') ?? 0;
    byCategory.set(expense.category ?? 'other', safeSum([current, expense.amountCents]));
  }

  const actualCostsCents = safeSum(expenses.map(item => item.amountCents));
  const ownerClassifiedCents = safeSum(expenses.filter(item => item.classification === 'owner').map(item => item.amountCents));
  const allocatableClassifiedCents = safeSum(expenses.filter(item => item.classification === 'allocatable').map(item => item.amountCents));
  const unresolvedCents = safeSum(expenses.filter(item => item.classification === 'unresolved').map(item => item.amountCents));
  const providerPaymentsCents = safeSum(providerFlows.filter(item => item.kind === 'provider_payment').map(item => item.amountCents));
  const providerRefundsCents = safeSum(providerFlows.filter(item => item.kind === 'provider_refund').map(item => item.amountCents));
  const providerNetPaidCents = safeSum([providerPaymentsCents, -providerRefundsCents]);

  const periodIssues = expenses.flatMap(expense => {
    const issues = [];
    if (expense.startDate < period.startDate || (expense.endDate ?? '9999-12-31') > period.endDate) {
      issues.push({ code: 'EXPENSE_PERIOD_REVIEW', expenseId: expense.id });
    }
    if (!expense.invoiceReference) issues.push({ code: 'INVOICE_REFERENCE_MISSING', expenseId: expense.id });
    return issues;
  });

  return {
    status: 'summary',
    issues: periodIssues,
    report: {
      propertyId,
      periodId: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      actualCostsCents,
      ownerClassifiedCents,
      allocatableClassifiedCents,
      unresolvedCents,
      providerPaymentsCents,
      providerRefundsCents,
      providerNetPaidCents,
      expenseCount: expenses.length,
      providerFlowCount: providerFlows.length,
      byCategory: [...byCategory.entries()].map(([category, amountCents]) => ({ category, amountCents })),
      postingReady: false,
      legalRelease: false
    }
  };
}
