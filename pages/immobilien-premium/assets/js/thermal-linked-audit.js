/**
 * Nebenkosten Premium: strict, non-releasable audit of the linked-heating bridge.
 * The original project, supplier payments and CO2 inventory are never changed.
 * An engine result is accepted only if EACH derived invoice, user share and tenant
 * agrees exactly with both the preallocation and the final report.
 */
import { calculateLinkedThermalPeriod } from './thermal-linked-integration.js';

const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const safe = value => Number.isSafeInteger(value) && value >= 0;
const sum = amounts => {
  const value = amounts.reduce((acc, n) => {
    if (!safe(n)) throw new RangeError('INVALID_CENTS');
    return acc + BigInt(n);
  }, 0n);
  if (value > MAX) throw new RangeError('OVERFLOW');
  return Number(value);
};
const blocked = () => ({ status: 'blocked', calculationReady: false, report: null,
  issues: [{ code: 'LINKED_LINE_AUDIT_FAILED', path: 'thermal.report',
    detail: 'Kostenpositionen, Einzelanteile oder Mietersummen sind nicht vollständig und centgenau belegt.' }] });

/** Engine argument is injectable for tests; production runner supplies the genuine engine. */
export function calculateLinkedThermalAudited(project, accountingPeriodId, linkedPlan, thermalPlan, engine) {
  const result = calculateLinkedThermalPeriod(project, accountingPeriodId, linkedPlan, thermalPlan, engine);
  if (result.status !== 'calculated') return result;
  try {
    const report = result.report;
    const linked = report.linkedCosts;
    if (!linked || !Array.isArray(report.streams) || report.streams.length !== 2 ||
        !Array.isArray(report.tenants) || !safe(linked.originalCents)) throw Error('SHAPE');
    const derived = linked.derivedExpenseIds;
    if (typeof derived?.heating !== 'string' || typeof derived?.hot_water !== 'string' ||
        derived.heating === derived.hot_water) throw Error('IDENTIFIERS');
    const kinds = new Set();
    const portions = [];
    const byTenancy = new Map();
    for (const stream of report.streams) {
      if (!['heating', 'hot_water'].includes(stream?.kind) || kinds.has(stream.kind) ||
          !Array.isArray(stream.lines) || stream.lines.length !== 1 || !safe(stream.totalCents)) {
        throw Error('STREAM');
      }
      kinds.add(stream.kind);
      const line = stream.lines[0];
      if (line?.expenseId !== derived[stream.kind] || !safe(line.amountCents) ||
          !safe(line.baseCents) || !safe(line.consumptionCents) ||
          sum([line.baseCents, line.consumptionCents]) !== line.amountCents ||
          line.amountCents !== stream.totalCents || !Array.isArray(line.unitShares) ||
          !line.unitShares.length) throw Error('LINE');
      let base = 0n, consumption = 0n, sharesTotal = 0n;
      for (const share of line.unitShares) {
        if (!share || typeof share.unitId !== 'string' || !share.unitId ||
            !['tenant', 'owner', 'vacant'].includes(share.kind) ||
            !safe(share.baseCents) || !safe(share.consumptionCents) || !safe(share.cents) ||
            sum([share.baseCents, share.consumptionCents]) !== share.cents) throw Error('SHARE');
        if (share.kind === 'tenant') {
          if (typeof share.tenancyId !== 'string' || !share.tenancyId) throw Error('TENANCY');
          byTenancy.set(share.tenancyId, (byTenancy.get(share.tenancyId) || 0n) + BigInt(share.cents));
        } else {
          if (share.tenancyId != null) throw Error('OWNER_TENANCY');
          portions.push(share.cents);
        }
        base += BigInt(share.baseCents);
        consumption += BigInt(share.consumptionCents);
        sharesTotal += BigInt(share.cents);
      }
      if (base !== BigInt(line.baseCents) || consumption !== BigInt(line.consumptionCents) ||
          sharesTotal !== BigInt(line.amountCents)) throw Error('SPLIT');
    }
    if (kinds.size !== 2 || sum(report.streams.map(s => s.totalCents)) !== linked.originalCents ||
        sum(portions) !== report.ownerCostsCents || report.tenants.length !== byTenancy.size) throw Error('TOTAL');
    const ids = new Set();
    for (const tenant of report.tenants) {
      if (!tenant || typeof tenant.tenancyId !== 'string' || !tenant.tenancyId ||
          ids.has(tenant.tenancyId) || !safe(tenant.costsCents) ||
          byTenancy.get(tenant.tenancyId) !== BigInt(tenant.costsCents)) throw Error('TENANT_TOTAL');
      ids.add(tenant.tenancyId);
    }
    if (sum([report.ownerCostsCents, ...report.tenants.map(t => t.costsCents)]) !==
        linked.originalCents) throw Error('FINAL');
    return result;
  } catch {
    return blocked();
  }
}
