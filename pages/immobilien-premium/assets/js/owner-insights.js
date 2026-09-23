/** Owner dashboard insights for Baustein 3.
 * Read-only comparisons and documented meter deltas; no legal allocation or estimation.
 */
import { validateProject } from './model.js';
import { buildOwnerSummary } from './owner-summary.js';

const scaled = value => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const text = String(value);
  if (!/^\d+(?:\.\d{1,3})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const result = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? result : null;
};

export function buildOwnerYearComparison(project, propertyId) {
  const errors = validateProject(project);
  if (errors.length || !project.properties.some(item => item.id === propertyId)) {
    return { status: 'blocked', issues: errors.length ? errors : [{ code: 'PROPERTY_REQUIRED' }], years: [] };
  }
  const periods = project.accountingPeriods
    .filter(item => item.propertyId === propertyId && item.endDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const years = [];
  for (const period of periods) {
    const summary = buildOwnerSummary(project, propertyId, period.id);
    if (summary.status !== 'summary') {
      return { status: 'blocked', issues: summary.issues, years: [] };
    }
    years.push({
      periodId: period.id,
      yearLabel: period.startDate.slice(0, 4),
      startDate: period.startDate,
      endDate: period.endDate,
      actualCostsCents: summary.report.actualCostsCents,
      providerNetPaidCents: summary.report.providerNetPaidCents,
      unresolvedCents: summary.report.unresolvedCents,
      expenseCount: summary.report.expenseCount
    });
  }
  return { status: 'comparison', issues: [], years };
}

export function buildDocumentedConsumption(project, propertyId, accountingPeriodId) {
  const errors = validateProject(project);
  if (errors.length) return { status: 'blocked', issues: errors, report: null };
  const period = project.accountingPeriods.find(item =>
    item.id === accountingPeriodId && item.propertyId === propertyId && item.endDate);
  if (!period) {
    return { status: 'blocked', issues: [{ code: 'PERIOD_REQUIRED' }], report: null };
  }

  const meters = project.meters.filter(item => item.propertyId === propertyId);
  const groups = new Map();
  const issues = [];
  let readingCount = 0;
  let metersWithDelta = 0;

  for (const meter of meters) {
    const readings = project.readings
      .filter(item => item.meterId === meter.id &&
        item.date >= period.startDate && item.date <= period.endDate &&
        (!meter.installedAt || item.date >= meter.installedAt) &&
        (!meter.removedAt || item.date <= meter.removedAt))
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    readingCount += readings.length;
    if (readings.length < 2) continue;

    const first = scaled(readings[0].value);
    const last = scaled(readings.at(-1).value);
    if (first === null || last === null || last < first) {
      issues.push({ code: 'METER_DELTA_UNAVAILABLE', meterId: meter.id });
      continue;
    }
    const delta = last - first;
    const service = meter.service ?? meter.measurementKind ?? 'other';
    const unit = meter.measurementUnit ?? '';
    const key = `${service}::${unit}`;
    const current = groups.get(key) ?? { service, unit, milli: 0n, meterCount: 0 };
    const next = current.milli + delta;
    if (next > BigInt(Number.MAX_SAFE_INTEGER)) {
      issues.push({ code: 'CONSUMPTION_OVERFLOW', meterId: meter.id });
      continue;
    }
    current.milli = next;
    current.meterCount += 1;
    groups.set(key, current);
    metersWithDelta += 1;
  }

  const totals = [...groups.values()]
    .sort((a, b) => a.service.localeCompare(b.service) || a.unit.localeCompare(b.unit))
    .map(item => ({
      service: item.service,
      unit: item.unit,
      value: Number(item.milli) / 1000,
      meterCount: item.meterCount
    }));

  return {
    status: 'consumption',
    issues,
    report: {
      propertyId,
      periodId: period.id,
      meterCount: meters.length,
      readingCount,
      metersWithDelta,
      totals,
      estimated: false,
      legalRelease: false
    }
  };
}
