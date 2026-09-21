/**
 * Nebenkosten Premium: read-only accounting-period reconciliation (Baustein 2.3).
 * Only an AUDIT PREVIEW of independently calculated reports, never a posting,
 * legal sign-off, tenant statement or replacement for upstream calculation.
 * Original expense IDs are the only accounting inventory; derived linked pools
 * and provider payments can never be added to it as extra costs.
 */
const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const money = n => Number.isSafeInteger(n) && n >= 0;
const text = s => typeof s === 'string' && s.trim().length > 0;
const block = (code, path, detail) => ({ status: 'blocked', calculationReady: false,
  issues: [{ code, path, detail }], report: null });
const fail = (code, path) => { throw { code, path }; };
const sum = numbers => {
  const result = numbers.reduce((total, number) => {
    if (!money(number)) fail('INTEGRITY_INVALID_CENTS', 'amountCents');
    return total + BigInt(number);
  }, 0n);
  if (result > MAX) fail('INTEGRITY_OVERFLOW', 'totals');
  return Number(result);
};
const signed = number => {
  if (number > MAX || number < -MAX) fail('INTEGRITY_OVERFLOW', 'balances');
  return Number(number);
};
const unique = (records, getId, path) => {
  if (!Array.isArray(records)) fail('INTEGRITY_REPORT_INVALID', path);
  const ids = records.map(getId);
  if (ids.some(id => !text(id)) || new Set(ids).size !== ids.length) fail('INTEGRITY_DUPLICATE', path);
  return ids;
};
const checkShare = (share, propertyUnits, tenancies) => {
  if (!share || !propertyUnits.has(share.unitId) || !money(share.cents) ||
      !['tenant', 'owner', 'vacant'].includes(share.kind)) fail('INTEGRITY_SHARE_INVALID', 'unitShares');
  if (share.kind === 'tenant') {
    if (!text(share.tenancyId) || tenancies.get(share.tenancyId) !== share.unitId)
      fail('INTEGRITY_SHARE_INVALID', 'tenancyId');
  } else if (share.tenancyId != null) fail('INTEGRITY_SHARE_INVALID', 'ownerTenancyId');
};

/**
 * Reconciles independent reports against original year invoices exactly ONCE.
 * Upstream computations may be injected by a future orchestrator; this function
 * neither calls them nor makes a technically positive result legally releasable.
 */
export function auditPeriodPreview(project, periodId, reports) {
  try {
    if (!project || !Array.isArray(project.accountingPeriods) || !Array.isArray(project.expenses) ||
        !Array.isArray(project.cashflows) || !Array.isArray(project.units) ||
        !Array.isArray(project.tenancies) || !reports || typeof reports !== 'object')
      fail('INTEGRITY_PROJECT_REQUIRED', 'project');
    const periods = project.accountingPeriods.filter(p => p?.id === periodId);
    if (periods.length !== 1 || !text(periods[0].propertyId) ||
        !text(periods[0].startDate) || !text(periods[0].endDate))
      fail('INTEGRITY_PERIOD_REQUIRED', 'periodId');
    const period = periods[0];
    if (period.reviewRequired === true || period.rolloverStatus === 'review_required')
      fail('INTEGRITY_YEAR_UNCONFIRMED', 'periodId');
    const originals = project.expenses.filter(e => e?.propertyId === period.propertyId &&
      e.startDate <= period.endDate && (e.endDate == null || e.endDate >= period.startDate));
    if (!originals.length) fail('INTEGRITY_EXPENSES_REQUIRED', 'expenses');
    unique(originals, e => e.id, 'expenses');
    if (originals.some(e => e.startDate !== period.startDate || e.endDate !== period.endDate ||
        !money(e.amountCents) ||
        (e.category === 'co2' ? !['allocatable', 'unresolved'].includes(e.classification)
          : !['allocatable', 'owner'].includes(e.classification))))
      fail('INTEGRITY_SOURCE_UNCONFIRMED', 'expenses');
    const invoiceLines = new Set();
    for (const e of originals) {
      if (!text(e.invoiceReference) || !text(e.invoiceLineId)) continue;
      const key = `${e.invoiceReference}\u0000${e.invoiceLineId}`;
      if (invoiceLines.has(key)) fail('INTEGRITY_DUPLICATE_INVOICE', 'expenses');
      invoiceLines.add(key);
    }
    const originalsById = new Map(originals.map(e => [e.id, e]));
    const units = project.units.filter(u => u.propertyId === period.propertyId);
    unique(units, u => u.id, 'units');
    const unitIds = new Set(units.map(u => u.id));
    const tenancyUnits = new Map(project.tenancies.filter(t => unitIds.has(t.unitId))
      .map(t => [t.id, t.unitId]));
    const seenExpenses = new Set();
    const byTenant = new Map();
    let owner = 0n;
    const insert = (id, amount, path) => {
      if (!originalsById.has(id) || seenExpenses.has(id) || originalsById.get(id).amountCents !== amount)
        fail('INTEGRITY_SOURCE_MISMATCH', path);
      seenExpenses.add(id);
    };
    const includeLine = (line, thermal = false) => {
      if (!line || !money(line.amountCents) || !Array.isArray(line.unitShares) ||
          !money(line.ownerDirectCents ?? 0)) fail('INTEGRITY_REPORT_INVALID', 'expenseLines');
      for (const s of line.unitShares) {
        checkShare(s, unitIds, tenancyUnits);
        if (s.kind === 'tenant') byTenant.set(s.tenancyId,
          (byTenant.get(s.tenancyId) ?? 0n) + BigInt(s.cents));
        else owner += BigInt(s.cents);
      }
      const ownDirect = thermal ? 0 : line.ownerDirectCents ?? 0;
      if (thermal && line.ownerDirectCents !== undefined && line.ownerDirectCents !== 0)
        fail('INTEGRITY_REPORT_INVALID', 'thermal.ownerDirectCents');
      if (sum([ownDirect, ...line.unitShares.map(s => s.cents)]) !== line.amountCents)
        fail('INTEGRITY_LINE_MISMATCH', 'expenseLines');
      owner += BigInt(ownDirect);
    };
    const standard = reports.standard;
    const standardSources = originals.filter(e => !['heating', 'hot_water', 'thermal_shared', 'co2', 'heating_oil'].includes(e.category));
    if (standardSources.length) {
      const r = standard?.report;
      if (standard?.status !== 'calculated' || !r || r.periodId !== period.id ||
          r.propertyId !== period.propertyId || r.legalRelease !== false || r.pdfGenerated !== false ||
          !Array.isArray(r.expenseLines) || r.expenseLines.length !== standardSources.length ||
          !Array.isArray(r.tenants)) fail('INTEGRITY_STANDARD_REQUIRED', 'reports.standard');
      unique(r.expenseLines, l => l.expenseId, 'standard.expenseLines');
      for (const line of r.expenseLines) {
        if (['heating', 'hot_water', 'thermal_shared', 'co2', 'heating_oil'].includes(originalsById.get(line.expenseId)?.category))
          fail('INTEGRITY_SOURCE_MISMATCH', 'standard.expenseLines');
        insert(line.expenseId, line.amountCents, 'standard.expenseLines');
        includeLine(line);
      }
      if (sum(r.expenseLines.map(l => l.amountCents)) !== r.totalCostsCents)
        fail('INTEGRITY_STANDARD_MISMATCH', 'standard.totalCostsCents');
      const own = sum(r.expenseLines.map(l => l.ownerDirectCents ?? 0)) +
        sum(r.expenseLines.flatMap(l => l.unitShares.filter(s => s.kind !== 'tenant').map(s => s.cents)));
      const tenant = sum(r.expenseLines.flatMap(l => l.unitShares.filter(s => s.kind === 'tenant').map(s => s.cents)));
      if (own !== r.ownerCostsCents || tenant !== r.tenantCostsCents ||
          sum([own, tenant]) !== r.totalCostsCents)
        fail('INTEGRITY_STANDARD_MISMATCH', 'standard.ownerTenantTotals');
    } else if (standard != null) fail('INTEGRITY_STANDARD_UNEXPECTED', 'reports.standard');
    const heatSources = originals.filter(e => ['heating', 'hot_water', 'thermal_shared'].includes(e.category));
    const thermal = reports.thermal;
    if (heatSources.length) {
      const r = thermal?.report;
      if (thermal?.status !== 'calculated' || !r ||
          !['thermal_subreport_only', 'thermal_linked_subreport_only'].includes(r.scope) ||
          r.periodId !== period.id || r.propertyId !== period.propertyId ||
          r.legalRelease !== false || r.pdfGenerated !== false ||
          r.co2Calculated !== false || r.combinedWithOtherCosts !== false ||
          !Array.isArray(r.streams) || !Array.isArray(r.tenants))
        fail('INTEGRITY_THERMAL_REQUIRED', 'reports.thermal');
      let heatingIds;
      if (r.scope === 'thermal_linked_subreport_only') {
        heatingIds = r.linkedCosts?.sourceExpenseIds;
        if (!Array.isArray(heatingIds) || heatingIds.length !== heatSources.length ||
            !money(r.linkedCosts.originalCents) || r.linkedCosts.originalCents !== r.totalCostsCents)
          fail('INTEGRITY_LINKED_SOURCES', 'thermal.linkedCosts');
      } else heatingIds = r.streams.flatMap(s => s?.lines?.map(l => l.expenseId) ?? []);
      unique(heatingIds.map(id => ({ id })), e => e.id, 'thermal.sourceExpenseIds');
      if (heatingIds.length !== heatSources.length) fail('INTEGRITY_THERMAL_INVENTORY', 'thermal.sources');
      for (const id of heatingIds) {
        const expense = originalsById.get(id);
        if (!expense || !['heating', 'hot_water', 'thermal_shared'].includes(expense.category))
          fail('INTEGRITY_THERMAL_INVENTORY', 'thermal.sources');
        insert(id, expense.amountCents, 'thermal.sources');
      }
      unique(r.streams, s => s.kind, 'thermal.streams');
      const thermalLines = r.streams.flatMap(s => {
        if (!['heating', 'hot_water'].includes(s.kind) || !Array.isArray(s.lines) || !money(s.totalCents) ||
            sum(s.lines.map(l => l.amountCents)) !== s.totalCents)
          fail('INTEGRITY_THERMAL_MISMATCH', 'thermal.streams');
        return s.lines;
      });
      unique(thermalLines, l => l.expenseId, 'thermal.lines');
      if (sum(thermalLines.map(l => l.amountCents)) !== r.totalCostsCents ||
          sum(heatSources.map(e => e.amountCents)) !== r.totalCostsCents)
        fail('INTEGRITY_THERMAL_MISMATCH', 'thermal.totalCostsCents');
      if (r.scope === 'thermal_subreport_only') {
        for (const s of r.streams) for (const l of s.lines) {
          if (originalsById.get(l.expenseId)?.category !== s.kind ||
              originalsById.get(l.expenseId)?.amountCents !== l.amountCents)
            fail('INTEGRITY_THERMAL_MISMATCH', 'thermal.lines');
        }
      } else {
        const derived = r.linkedCosts?.derivedExpenseIds;
        if (!derived || r.streams.some(s => s.lines.length !== 1 ||
            s.lines[0].expenseId !== derived[s.kind] || s.lines[0].amountCents !== s.totalCents))
          fail('INTEGRITY_LINKED_SOURCES', 'thermal.derived');
      }
      for (const line of thermalLines) includeLine(line, true);
      const own = sum(thermalLines.flatMap(l => l.unitShares.filter(s => s.kind !== 'tenant').map(s => s.cents)));
      const tenants = new Map();
      for (const line of thermalLines) for (const share of line.unitShares) if (share.kind === 'tenant') {
        tenants.set(share.tenancyId, (tenants.get(share.tenancyId) ?? 0n) + BigInt(share.cents));
      }
      unique(r.tenants, t => t.tenancyId, 'thermal.tenants');
      if (own !== r.ownerCostsCents || r.tenants.length !== tenants.size ||
          r.tenants.some(t => !money(t.costsCents) || tenants.get(t.tenancyId) !== BigInt(t.costsCents)) ||
          sum([own, ...r.tenants.map(t => t.costsCents)]) !== r.totalCostsCents)
        fail('INTEGRITY_THERMAL_MISMATCH', 'thermal.ownerTenantTotals');
    } else if (thermal != null) fail('INTEGRITY_THERMAL_UNEXPECTED', 'reports.thermal');
    if (originals.some(e => e.category === 'heating_oil'))
      fail('INTEGRITY_OIL_UNSUPPORTED', 'expenses');
    const co2Sources = originals.filter(e => e.category === 'co2');
    if (co2Sources.length) {
      const r = reports.co2?.report;
      if (reports.co2?.status !== 'preview' || !r || r.scope !== 'co2_tenant_allocation_preview_only' ||
          r.periodId !== period.id || r.propertyId !== period.propertyId ||
          r.actualCostsPosted !== false || r.legalRelease !== false || r.pdfGenerated !== false ||
          r.combinedWithOtherCosts !== false || !Array.isArray(r.originalExpenseIds) ||
          !Array.isArray(r.tenants)) fail('INTEGRITY_CO2_REQUIRED', 'reports.co2');
      unique(r.originalExpenseIds.map(id => ({ id })), e => e.id, 'co2.originalExpenseIds');
      if (r.originalExpenseIds.length !== co2Sources.length) fail('INTEGRITY_CO2_INVENTORY', 'co2.sources');
      for (const id of r.originalExpenseIds) {
        if (originalsById.get(id)?.category !== 'co2') fail('INTEGRITY_CO2_INVENTORY', 'co2.sources');
        insert(id, originalsById.get(id).amountCents, 'co2.sources');
      }
      if (sum(co2Sources.map(e => e.amountCents)) !== r.originalInvoiceCents ||
          sum([r.landlordPortionCents, r.tenantPoolCents]) !== r.originalInvoiceCents ||
          sum(r.tenants.map(t => t.provisionalCo2Cents)) !== r.tenantPoolCents)
        fail('INTEGRITY_CO2_MISMATCH', 'co2.totals');
      unique(r.tenants, t => t.tenancyId, 'co2.tenants');
      owner += BigInt(r.landlordPortionCents);
      for (const t of r.tenants) {
        if (!tenancyUnits.has(t.tenancyId)) fail('INTEGRITY_CO2_MISMATCH', 'co2.tenants');
        byTenant.set(t.tenancyId, (byTenant.get(t.tenancyId) ?? 0n) + BigInt(t.provisionalCo2Cents));
      }
      if (thermal?.report?.scope === 'thermal_linked_subreport_only' &&
          (thermal.report.linkedCosts?.excludedCo2Cents !== r.originalInvoiceCents ||
           [...(thermal.report.linkedCosts.excludedCo2ExpenseIds ?? [])].sort().join('|') !==
             [...r.originalExpenseIds].sort().join('|')))
        fail('INTEGRITY_CO2_LINKED_MISMATCH', 'thermal.linkedCosts');
    } else if (reports.co2 != null) fail('INTEGRITY_CO2_UNEXPECTED', 'reports.co2');
    if (seenExpenses.size !== originals.length) fail('INTEGRITY_INVENTORY_INCOMPLETE', 'expenses');
    const actualTotal = sum(originals.map(e => e.amountCents));
    const ownerCents = signed(owner);
    const tenantCost = sum([...byTenant.values()].map(n => signed(n)));
    if (sum([ownerCents, tenantCost]) !== actualTotal) fail('INTEGRITY_TOTAL_MISMATCH', 'totals');
    // Only standard engine provides ACTUALLY PAID tenant advances, never contractual dues.
    const standardTenants = reports.standard?.report?.tenants ?? [];
    unique(standardTenants, t => t.tenancyId, 'standard.tenants');
    const standardCosts = new Map();
    for (const l of reports.standard?.report?.expenseLines ?? []) for (const s of l.unitShares) {
      if (s.kind === 'tenant') standardCosts.set(s.tenancyId,
        (standardCosts.get(s.tenancyId) ?? 0n) + BigInt(s.cents));
    }
    const paid = new Map();
    for (const t of standardTenants) {
      if ((standardCosts.get(t.tenancyId) ?? 0n) !== BigInt(t.costsCents) || !money(t.advancesCents) ||
          paid.has(t.tenancyId)) fail('INTEGRITY_STANDARD_MISMATCH', 'standard.tenants');
      paid.set(t.tenancyId, t.advancesCents);
    }
    if (paid.size !== byTenant.size) fail('INTEGRITY_PAYMENT_LEDGER_INCOMPLETE', 'standard.tenants');
    // Independently verify actual tenant advances against source transactions.
    // Contractual dues and rent are never payments, and tenant refunds require a
    // separate reviewed workflow before they may affect an annual statement.
    const originalPaid = new Map([...paid.keys()].map(id => [id, 0n]));
    unique(project.cashflows, flow => flow.id, 'cashflows');
    for (const flow of project.cashflows) {
      if (!flow || !['tenant_payment', 'tenant_refund', 'tenant_advance_due'].includes(flow.kind) ||
          !tenancyUnits.has(flow.tenancyId)) continue;
      if (!text(flow.accountingPeriodId)) fail('INTEGRITY_PAYMENT_PERIOD_REQUIRED', `cashflows:${flow.id}`);
      if (flow.accountingPeriodId !== period.id) continue;
      if (!money(flow.amountCents) || !originalPaid.has(flow.tenancyId))
        fail('INTEGRITY_PAYMENT_LEDGER_INCOMPLETE', `cashflows:${flow.id}`);
      if (flow.kind === 'tenant_advance_due') continue;
      if (flow.kind === 'tenant_refund') fail('INTEGRITY_REFUND_REVIEW_REQUIRED', `cashflows:${flow.id}`);
      if (flow.purpose === 'base_rent') continue;
      if (flow.purpose !== 'operating_cost_advance')
        fail('INTEGRITY_PAYMENT_ASSIGNMENT_REQUIRED', `cashflows:${flow.id}`);
      originalPaid.set(flow.tenancyId, originalPaid.get(flow.tenancyId) + BigInt(flow.amountCents));
    }
    for (const [tenancyId, amount] of originalPaid) {
      if (amount !== BigInt(paid.get(tenancyId)))
        fail('INTEGRITY_PAYMENT_LEDGER_MISMATCH', `tenancies:${tenancyId}`);
    }
    const tenantRows = [...byTenant].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([tenancyId, cents]) => {
      const amount = signed(cents);
      const advances = paid.get(tenancyId);
      if (!money(advances)) fail('INTEGRITY_PAYMENT_LEDGER_INCOMPLETE', 'tenantAdvances');
      const balance = signed(cents - BigInt(advances));
      return { tenancyId, costsCents: amount, advancesActuallyPaidCents: advances,
        balanceCents: balance, creditCents: Math.max(0, -balance), additionalCents: Math.max(0, balance) };
    });
    // Every supplier account with an invoice appears, including NO PAYMENT.
    const providerCosts = new Map(), providerNet = new Map();
    for (const e of originals) if (e.providerAccountId != null) {
      if (!text(e.providerAccountId)) fail('INTEGRITY_PROVIDER_INVALID', 'expenses.providerAccountId');
      providerCosts.set(e.providerAccountId,
        (providerCosts.get(e.providerAccountId) ?? 0n) + BigInt(e.amountCents));
    }
    for (const f of project.cashflows) {
      if (!f || !['provider_payment', 'provider_refund'].includes(f.kind) || f.propertyId !== period.propertyId) continue;
      if (!text(f.accountingPeriodId)) fail('INTEGRITY_PROVIDER_INVALID', `cashflows:${f.id}`);
      if (f.accountingPeriodId !== period.id) continue;
      if (!providerCosts.has(f.providerAccountId) || !money(f.amountCents))
        fail('INTEGRITY_PROVIDER_INVALID', `cashflows:${f.id}`);
      providerNet.set(f.providerAccountId, (providerNet.get(f.providerAccountId) ?? 0n) +
        (f.kind === 'provider_payment' ? BigInt(f.amountCents) : -BigInt(f.amountCents)));
    }
    const providerBalances = [...providerCosts].sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([providerAccountId, cost]) => {
        const paidNet = providerNet.get(providerAccountId) ?? 0n;
        return { providerAccountId, invoicedCents: signed(cost), netPaidCents: signed(paidNet),
          differenceCents: signed(paidNet - cost), scope: 'original_invoices_and_recorded_supplier_payments_only' };
      });
    return { status: 'preview', calculationReady: false, issues: [], report: {
      scope: 'period_integrity_preview_only', periodId: period.id, propertyId: period.propertyId,
      originalExpenseIds: [...seenExpenses].sort(), originalCostsCents: actualTotal,
      ownerCostsCents: ownerCents, tenantCostsCents: tenantCost, tenants: tenantRows,
      providerBalances, forecastsIncluded: false, providerPaymentsIncludedInCosts: false,
      co2Posted: false, legalRelease: false, pdfGenerated: false, combinedForPosting: false
    } };
  } catch (e) {
    return block(e?.code ?? 'INTEGRITY_RECONCILIATION_FAILED', e?.path ?? 'totals',
      'Originalbelege, Teilberichte oder Zahlungsstände sind nicht vollständig und centgenau abgestimmt.');
  }
}
