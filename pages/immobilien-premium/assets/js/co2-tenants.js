/**
 * MH-08: non-posting individual CO2 PREVIEW for a fully tenant-occupied 2026
 * residential building. Statutory special cases and owner-occupied/vacant units
 * are deliberately blocked. Evidence remains original invoices + thermal ledger.
 * No legal release, PDF, cashflow or change to the project.
 */
import { previewBuildingCo2 } from './co2-building.js';

const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const safe = n => Number.isSafeInteger(n) && n >= 0;
const text = s => typeof s === 'string' && s.trim().length > 0;
const blocked = (code, path, detail) => ({ status: 'blocked', calculationReady: false,
  report: null, issues: [{ code, path, detail }] });
const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(new Date(`${s}T00:00:00Z`).valueOf()) &&
  new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const nextDate = s => new Date(new Date(`${s}T00:00:00Z`).valueOf() + 86400000).toISOString().slice(0, 10);
const total = values => {
  const n = values.reduce((a, x) => { if (!safe(x)) throw RangeError('MONEY'); return a + BigInt(x); }, 0n);
  if (n > MAX) throw RangeError('OVERFLOW');
  return Number(n);
};

function verifyOccupancy(project, period) {
  if (!Array.isArray(project.usagePeriods) || !Array.isArray(project.tenancies)) return false;
  const units = project.units.filter(u => u.propertyId === period.propertyId);
  const tenancies = new Map(project.tenancies.map(t => [t.id, t]));
  for (const unit of units) {
    const overlapping = project.usagePeriods.filter(s => s.unitId === unit.id &&
      s.startDate <= period.endDate && (s.endDate == null || s.endDate >= period.startDate))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (!overlapping.length) return false;
    let cursor = period.startDate;
    for (const segment of overlapping) {
      const start = segment.startDate < period.startDate ? period.startDate : segment.startDate;
      const end = segment.endDate == null || segment.endDate > period.endDate ? period.endDate : segment.endDate;
      if (!validDate(segment.startDate) || (segment.endDate != null && !validDate(segment.endDate)) ||
          start !== cursor || end < start || segment.kind !== 'tenant' ||
          !text(segment.tenancyId) || tenancies.get(segment.tenancyId)?.unitId !== unit.id) return false;
      cursor = nextDate(end);
    }
    if (cursor !== nextDate(period.endDate)) return false;
  }
  return true;
}

/**
 * The audited thermal report supplies the heating/hot-water allocation weights
 * according to separately confirmed distribution agreements. Tenant-only scope.
 * Optional plan fields are confirmations, NOT a legal applicability decision.
 */
export function previewTenantCo2(project, periodId, co2Plan, thermalResult, plan) {
  const building = previewBuildingCo2(project, periodId, co2Plan);
  if (building.status !== 'calculated' || !building.report) return building;
  const base = building.report;
  if (plan?.distributionMethod !== 'thermal_cost_shares' || plan.methodReviewed !== true ||
      plan.tenantOnlyOccupancyConfirmed !== true || plan.originalCo2ExcludedFromThermalConfirmed !== true ||
      !text(plan.distributionEvidenceRef)) {
    return blocked('CO2_TENANT_METHOD_REQUIRED', 'plan',
      'Gesonderten Mieterschlüssel, reine Mieternutzung und Originalbeleg-Abgrenzung belegen.');
  }
  const period = project.accountingPeriods.find(p => p.id === periodId);
  if (!verifyOccupancy(project, period)) return blocked('CO2_OCCUPANCY_UNSUPPORTED', 'usagePeriods',
    'Nur belegte lückenlose Mieternutzung aller Wohnungen; Eigennutzung und Leerstand benötigen eigene Regeln.');
  const r = thermalResult?.report;
  if (thermalResult?.status !== 'calculated' || !r ||
      !['thermal_subreport_only', 'thermal_linked_subreport_only'].includes(r.scope) ||
      r.periodId !== period.id || r.propertyId !== period.propertyId ||
      r.legalRelease !== false || r.pdfGenerated !== false || r.co2Calculated !== false ||
      r.combinedWithOtherCosts !== false || !Array.isArray(r.streams) ||
      !r.streams.length || !Array.isArray(r.tenants) || r.ownerCostsCents !== 0 ||
      !safe(r.totalCostsCents) || r.totalCostsCents === 0) {
    return blocked('CO2_THERMAL_REPORT_INVALID', 'thermalResult',
      'Vollständiger ungeänderter und noch nicht freigegebener Heizkosten-Teilbericht erforderlich.');
  }
  if (r.scope === 'thermal_linked_subreport_only' &&
      (r.linkedCosts?.excludedCo2Cents !== base.originalInvoiceCents ||
       !Array.isArray(r.linkedCosts.excludedCo2ExpenseIds) ||
       r.linkedCosts.excludedCo2ExpenseIds.length !== base.originalExpenseIds.length ||
       r.linkedCosts.excludedCo2ExpenseIds.some(id => !base.originalExpenseIds.includes(id)))) {
    return blocked('CO2_SOURCE_MISMATCH', 'thermalResult.linkedCosts',
      'Ausgeschlossene CO₂-Originalrechnungen stimmen nicht mit dem CO₂-Inventar überein.');
  }
  try {
    const seenKinds = new Set(), seenLines = new Set(), byTenancy = new Map(), seenUnits = new Set();
    const tenancyById = new Map(project.tenancies.map(t => [t.id, t]));
    const propertyUnits = new Set(project.units.filter(u => u.propertyId === period.propertyId).map(u => u.id));
    let allHeat = 0n;
    for (const stream of r.streams) {
      if (!['heating', 'hot_water'].includes(stream?.kind) || seenKinds.has(stream.kind) ||
          !safe(stream.totalCents) || !Array.isArray(stream.lines) || !stream.lines.length) throw Error('STREAM');
      seenKinds.add(stream.kind);
      let streamAmount = 0n;
      for (const line of stream.lines) {
        if (!text(line?.expenseId) || seenLines.has(line.expenseId) ||
            base.originalExpenseIds.includes(line.expenseId) || !safe(line.amountCents) ||
            !Array.isArray(line.unitShares) || !line.unitShares.length) throw Error('SOURCE');
        seenLines.add(line.expenseId);
        const cost = total(line.unitShares.map(s => s?.cents));
        if (cost !== line.amountCents) throw Error('LINE_TOTAL');
        for (const share of line.unitShares) {
          if (share.kind !== 'tenant' || !text(share.tenancyId) ||
              !propertyUnits.has(share.unitId) || tenancyById.get(share.tenancyId)?.unitId !== share.unitId ||
              !safe(share.cents)) throw Error('OWNER_OR_INVALID_SHARE');
          seenUnits.add(share.unitId);
          byTenancy.set(share.tenancyId, (byTenancy.get(share.tenancyId) || 0n) + BigInt(share.cents));
        }
        streamAmount += BigInt(line.amountCents);
      }
      if (streamAmount !== BigInt(stream.totalCents)) throw Error('STREAM_TOTAL');
      allHeat += streamAmount;
    }
    if (seenUnits.size !== propertyUnits.size || allHeat !== BigInt(r.totalCostsCents) ||
        allHeat > MAX || r.tenants.length !== byTenancy.size) throw Error('TOTAL');
    const declared = new Set();
    for (const tenant of r.tenants) {
      if (!text(tenant?.tenancyId) || declared.has(tenant.tenancyId) ||
          !safe(tenant.costsCents) || byTenancy.get(tenant.tenancyId) !== BigInt(tenant.costsCents)) throw Error('TENANT');
      declared.add(tenant.tenancyId);
    }
    // Largest-remainder cents, stable tenancy ID tie-break; no floating-point allocation.
    const weights = [...byTenancy].sort(([a], [b]) => a.localeCompare(b, 'en'));
    const pool = BigInt(base.unallocatedRemainderCents);
    const allocated = weights.map(([tenancyId, weight]) => ({ tenancyId, weight,
      cents: pool * weight / allHeat, remainder: pool * weight % allHeat }));
    let leftovers = pool - allocated.reduce((n, x) => n + x.cents, 0n);
    for (const x of [...allocated].sort((a, b) => a.remainder === b.remainder ?
      a.tenancyId.localeCompare(b.tenancyId, 'en') : a.remainder > b.remainder ? -1 : 1)) {
      if (leftovers === 0n) break;
      x.cents++;
      leftovers--;
    }
    if (leftovers !== 0n || allocated.reduce((n, x) => n + x.cents, 0n) !== pool ||
        BigInt(base.buildingLandlordPortionCents) + pool !== BigInt(base.originalInvoiceCents)) throw Error('RECONCILE');
    return { status: 'preview', calculationReady: false, issues: [], report: {
      scope: 'co2_tenant_allocation_preview_only', periodId, propertyId: base.propertyId,
      originalExpenseIds: [...base.originalExpenseIds], originalInvoiceCents: base.originalInvoiceCents,
      specificEmissionsTenthsKgPerM2Year: base.specificEmissionsTenthsKgPerM2Year,
      stageIndex: base.stageIndex, landlordPercent: base.landlordPercent,
      landlordPortionCents: base.buildingLandlordPortionCents,
      tenantPoolCents: base.unallocatedRemainderCents,
      tenants: allocated.map(x => ({ tenancyId: x.tenancyId, thermalWeightCents: Number(x.weight),
        provisionalCo2Cents: Number(x.cents) })),
      allocationEvidenceRef: plan.distributionEvidenceRef, method: plan.distributionMethod,
      actualCostsPosted: false, providerPaymentsIncluded: false,
      legalRelease: false, pdfGenerated: false, combinedWithOtherCosts: false
    } };
  } catch {
    return blocked('CO2_TENANT_RECONCILIATION_FAILED', 'thermalResult',
      'Wärmekosten, Nutzungsanteile und CO₂-Originalbeträge müssen je Zeile und insgesamt übereinstimmen.');
  }
}
