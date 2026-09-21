/**
 * Nebenkosten Premium: independent HEATING / HOT WATER calculation subset (MH-07).
 * Never marks an invoice legally releasable, never merges with standard calculations.
 * Scope: separate, pre-separated annual cost pools; unchanged area.
 * Documented occupant changes supported only with verified intermediate readings
 * and confirmed stream-specific § 9b weights. Exceptions, linked systems, CO2 and oil block.
 */
import { validateProject } from './model.js';
import { distributeCents } from './calculation.js';
import { occupancyForPeriod, consumptionForSegments } from './temporal.js';
import { verifyThermalBasis } from './thermal-basis.js';
import { verifyThermalUserChange, splitThermalUnitShare } from './thermal-user-change.js';

const kinds = ['heating', 'hot_water'];
const safe = n => Number.isSafeInteger(n) && n >= 0;
const add = (issues, code, path, detail) => issues.push({ code, path, detail });
const blocked = issues => ({ status: 'blocked', calculationReady: false, issues, report: null });
const sorted = rows => [...rows].sort((a, b) => a.id.localeCompare(b.id, 'en'));
function sum(items) {
  const n = items.reduce((total, amount) => total + BigInt(amount), 0n);
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('OVERFLOW');
  return Number(n);
}

/** Technical distribution only; does not decide legal applicability or permitted costs. */
export function calculateThermalPeriod(project, accountingPeriodId, plan) {
  const issues = validateProject(project).map(e => ({ code: e.code, path: e.path, detail: e.message }));
  if (issues.length) return blocked(issues);
  const period = project.accountingPeriods.find(p => p.id === accountingPeriodId);
  if (!period || !period.endDate) {
    add(issues, 'THERMAL_PERIOD_REQUIRED', 'period', 'Abgeschlossene Abrechnungsperiode fehlt.');
    return blocked(issues);
  }
  if (!plan || plan.system !== 'separate' || plan.scopeConfirmed !== true ||
      plan.costBasisConfirmed !== true || plan.co2CostsSeparateConfirmed !== true ||
      plan.exceptionStatus !== 'reviewed_standard' || plan.groupPreallocationRequired !== false) {
    add(issues, 'THERMAL_SCOPE_UNCONFIRMED', 'plan',
      'Getrennte Kosten, Energiebasis, CO₂, Ausnahmen und fehlende Nutzergruppen-Vorverteilung bestätigen.');
    return blocked(issues);
  }
  const streams = plan.streams;
  if (!Array.isArray(streams) || !streams.length || streams.length > 2 ||
      streams.some(s => !s || !kinds.includes(s.kind)) ||
      new Set(streams.map(s => s.kind)).size !== streams.length) {
    add(issues, 'THERMAL_SERVICES_INVALID', 'plan.streams', 'Heizung und Warmwasser separat und höchstens einmal angeben.');
    return blocked(issues);
  }
  const absent = kinds.filter(kind => !streams.some(s => s.kind === kind));
  if (absent.length && (plan.absentServicesConfirmed !== true ||
      !Array.isArray(plan.absentServices) ||
      [...plan.absentServices].sort().join('|') !== absent.sort().join('|'))) {
    add(issues, 'THERMAL_SERVICE_MISSING', 'plan.absentServices',
      'Nicht vorhandene Wärme-/Warmwasserversorgung ausdrücklich bestätigen.');
    return blocked(issues);
  }
  const units = sorted(project.units.filter(u => u.propertyId === period.propertyId));
  if (!units.length) add(issues, 'UNITS_REQUIRED', 'units', 'Keine Wohnungen für das Gebäude erfasst.');
  if (issues.length) return blocked(issues);
  const { occupancy } = occupancyForPeriod(project, units, period, issues);
  for (const unit of units) {
    const area = unit.areaHistory.filter(a => a.from <= period.startDate &&
      (a.to === null || a.to >= period.endDate));
    if (area.length !== 1 || unit.areaHistory.some(a => a !== area[0] &&
      a.from <= period.endDate && (a.to === null || a.to >= period.startDate))) {
      add(issues, 'THERMAL_AREA_UNSUPPORTED', `units:${unit.id}`,
        'Eine einzige unveränderte, gültige Wohnfläche für das ganze Jahr ist nötig.');
    }
  }
  if (issues.length) return blocked(issues);
  const coveredExpenses = new Set();
  const coveredMeters = new Set();
  const streamReports = [];
  for (const stream of streams) {
    const path = `streams:${stream.kind}`;
    if (!Number.isInteger(stream.consumptionPercent) || stream.consumptionPercent < 50 ||
        stream.consumptionPercent > 70 || stream.rateConfirmed !== true ||
        typeof stream.mandatory70Applies !== 'boolean' ||
        (stream.mandatory70Applies && stream.consumptionPercent !== 70)) {
      add(issues, 'THERMAL_RATE_INVALID', path,
        'Bestätigter Verbrauchsanteil 50–70 % erforderlich; bei festgestellter 70-%-Pflicht genau 70 %.');
      continue;
    }
    if (!Array.isArray(stream.expenseIds) || !stream.expenseIds.length ||
        new Set(stream.expenseIds).size !== stream.expenseIds.length) {
      add(issues, 'THERMAL_EXPENSES_REQUIRED', path, 'Jede Kostenposition eindeutig und einmal zuordnen.');
      continue;
    }
    const expenses = [];
    for (const id of stream.expenseIds) {
      const e = project.expenses.find(x => x.id === id);
      if (coveredExpenses.has(id) || !e || e.propertyId !== period.propertyId ||
          e.category !== stream.kind || e.classification !== 'allocatable' ||
          e.confirmedForAllocation !== true || e.startDate !== period.startDate ||
          e.endDate !== period.endDate) {
        add(issues, 'THERMAL_EXPENSE_INVALID', `expenses:${id}`,
          'Kosten müssen einzigartig, fachlich bestätigt, korrekt klassifiziert und genau diesem Jahr zugeordnet sein.');
        continue;
      }
      coveredExpenses.add(id);
      expenses.push(e);
    }
    const mapping = stream.meterIdsByUnit;
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping) ||
        Object.keys(mapping).sort().join('|') !== units.map(u => u.id).sort().join('|') ||
        stream.readingsConfirmed !== true) {
      add(issues, 'THERMAL_METER_MAPPING_INVALID', path,
        'Für jede Wohnung eindeutig bestätigte Geräte und Jahresmesswerte erforderlich.');
      continue;
    }
    for (const ids of Object.values(mapping)) {
      if (!Array.isArray(ids)) { add(issues, 'THERMAL_METER_MAPPING_INVALID', path, 'Zählerliste fehlt.'); continue; }
      for (const id of ids) {
        const meter = project.meters.find(m => m.id === id);
        if (coveredMeters.has(id) || meter?.service !== stream.kind) {
          add(issues, 'THERMAL_METER_SERVICE_INVALID', `meters:${id}`,
            'Heiz- und Warmwasserzähler dürfen nicht verwechselt oder doppelt verwendet werden.');
        }
        coveredMeters.add(id);
      }
    }
    if (issues.length) continue;
    if (!verifyThermalUserChange(stream, occupancy, issues)) continue;
    const verifiedBasis = verifyThermalBasis(project, units, stream, issues);
    if (!verifiedBasis || issues.length) continue;
    const rule = { id: `thermal_${stream.kind}`, meterIdsByUnit: mapping };
    const measured = consumptionForSegments(project, units, period, rule, occupancy, issues, verifiedBasis.factors);
    if (!measured || issues.length) continue;
    for (const unit of units) {
      for (const occupant of occupancy.get(unit.id)) {
        if (occupant.kind !== 'tenant') continue;
        const versions = project.contractTerms.filter(t => t.tenancyId === occupant.tenancyId &&
          t.startDate <= occupant.endDate && (t.endDate === null || t.endDate >= occupant.startDate));
        if (versions.length !== 1 || versions[0].startDate > occupant.startDate ||
            (versions[0].endDate !== null && versions[0].endDate < occupant.endDate) ||
            versions[0].operatingCostsModel !== 'advance' ||
            !Array.isArray(versions[0].allowedCostTypes) ||
            !versions[0].allowedCostTypes.includes(stream.kind)) {
          add(issues, 'THERMAL_CONTRACT_UNCONFIRMED', `tenancies:${occupant.tenancyId}`,
            'Für jeden Nutzerabschnitt Kostenvereinbarung und durchgehendes Vorauszahlungsmodell prüfen.');
        }
      }
    }
    if (issues.length) continue;
    const areaWeights = units.map(u => ({ id: u.id,
      weight: u.areaHistory.find(a => a.from <= period.startDate &&
        (a.to === null || a.to >= period.endDate)).hundredthsM2 }));
    try {
      const lines = sorted(expenses).map(expense => {
        const portions = distributeCents(expense.amountCents, [
          { id: 'base', weight: 100 - stream.consumptionPercent },
          { id: 'consumption', weight: stream.consumptionPercent }
        ]);
        const baseCents = portions.find(p => p.id === 'base').cents;
        const consumptionCents = portions.find(p => p.id === 'consumption').cents;
        const base = new Map(distributeCents(baseCents, areaWeights).map(p => [p.id, p.cents]));
        const used = new Map(distributeCents(consumptionCents, measured.weights).map(p => [p.id, p.cents]));
        const unitShares = units.flatMap(u => splitThermalUnitShare(
          u, base.get(u.id), used.get(u.id), occupancy.get(u.id),
          measured.segmentWeights.get(u.id), stream, distributeCents, issues));
        if (issues.length) throw new RangeError('USER_SPLIT');
        if (sum(unitShares.map(s => s.cents)) !== expense.amountCents) throw new RangeError('RECONCILIATION');
        return { expenseId: expense.id, amountCents: expense.amountCents,
          baseCents, consumptionCents, unitShares };
      });
      streamReports.push({ kind: stream.kind, consumptionPercent: stream.consumptionPercent,
        totalCents: sum(lines.map(l => l.amountCents)), lines,
        meterWeights: measured.weights, areaWeights, measurementBasis: verifiedBasis.basis });
    } catch {
      if (!issues.length) add(issues, 'THERMAL_RECONCILIATION_FAILED', path, 'Sichere Aufteilung oder Cent-Summenprüfung fehlgeschlagen.');
    }
  }
  for (const e of project.expenses.filter(e => e.propertyId === period.propertyId &&
    e.startDate <= period.endDate && (e.endDate === null || e.endDate >= period.startDate) &&
    (kinds.includes(e.category) || ['heating_oil', 'co2'].includes(e.category)))) {
    if (['heating_oil', 'co2'].includes(e.category)) {
      add(issues, 'THERMAL_SPECIAL_COST_UNSUPPORTED', `expenses:${e.id}`,
        'Heizölverbrauch/Bestände und CO₂-Anteil erhalten eigene geprüfte Module.');
    } else if (!coveredExpenses.has(e.id)) {
      add(issues, 'THERMAL_EXPENSE_UNASSIGNED', `expenses:${e.id}`,
        'Wärme-/Warmwasserkosten dürfen nicht unbemerkt fehlen oder doppelt eingehen.');
    }
  }
  if (issues.length) return blocked(issues);
  try {
    const lines = streamReports.flatMap(s => s.lines);
    const totalCostsCents = sum(lines.map(l => l.amountCents));
    const ownerCostsCents = sum(lines.flatMap(l => l.unitShares.filter(x => x.kind !== 'tenant').map(x => x.cents)));
    const tenancyIds = [...new Set(lines.flatMap(l => l.unitShares.map(x => x.tenancyId).filter(Boolean)))].sort();
    const tenants = tenancyIds.map(tenancyId => ({ tenancyId,
      costsCents: sum(lines.flatMap(l => l.unitShares.filter(x => x.tenancyId === tenancyId).map(x => x.cents))) }));
    if (sum([ownerCostsCents, ...tenants.map(t => t.costsCents)]) !== totalCostsCents) {
      add(issues, 'THERMAL_RECONCILIATION_FAILED', 'totals', 'Eigentümer- und Mietersummen stimmen nicht überein.');
      return blocked(issues);
    }
    return { status: 'calculated', calculationReady: true, issues: [], report: {
      periodId: period.id, propertyId: period.propertyId, scope: 'thermal_subreport_only',
      totalCostsCents, ownerCostsCents, tenants, streams: streamReports,
      combinedWithOtherCosts: false, co2Calculated: false, legalRelease: false, pdfGenerated: false
    } };
  } catch {
    add(issues, 'THERMAL_RECONCILIATION_FAILED', 'totals', 'Summen überschreiten den sicheren Zahlenbereich.');
    return blocked(issues);
  }
}
