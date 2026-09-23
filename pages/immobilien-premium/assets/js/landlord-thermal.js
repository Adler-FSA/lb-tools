/** Baustein 4 — explicit thermal landlord preview adapter.
 * Builds a plan only from existing project evidence plus explicit user confirmations.
 * No legal applicability decision is inferred or persisted.
 */
import { validateProject } from './model.js';
import { calculateThermalPeriod } from './thermal.js';

const SERVICES = {
  heating: { measurementKind: 'heat_energy', canonicalUnit: 'kWh' },
  hot_water: { measurementKind: 'hot_water_volume', canonicalUnit: 'm3' }
};
const blocked = (code, detail) => ({
  status: 'blocked', calculationReady: false, report: null,
  issues: [{ code, path: 'thermalPlan', detail }]
});
const exactPeriodExpense = (expense, period, kind) =>
  expense.propertyId === period.propertyId &&
  expense.category === kind &&
  expense.classification === 'allocatable' &&
  expense.confirmedForAllocation === true &&
  expense.startDate === period.startDate &&
  expense.endDate === period.endDate;

export function previewSeparateThermalLandlord(project, periodId, config) {
  const structural = validateProject(project);
  if (structural.length) {
    return {
      status: 'blocked', calculationReady: false, report: null,
      issues: structural.map(error => ({ code: error.code, path: error.path, detail: error.message }))
    };
  }
  const period = project.accountingPeriods.find(item => item.id === periodId && item.endDate);
  if (!period) return blocked('THERMAL_PERIOD_REQUIRED', 'Abgeschlossenes Abrechnungsjahr fehlt.');
  if (!config || config.scopeConfirmed !== true || config.costBasisConfirmed !== true ||
      config.co2CostsSeparateConfirmed !== true || config.exceptionReviewedStandard !== true ||
      config.groupPreallocationNotRequired !== true) {
    return blocked('THERMAL_CONFIRMATIONS_REQUIRED',
      'Getrennte Kostenbasis, CO₂-Abgrenzung, Ausnahmen und Gruppen-Vorverteilung müssen ausdrücklich geprüft und bestätigt sein.');
  }

  const units = project.units.filter(unit => unit.propertyId === period.propertyId)
    .sort((a,b) => a.id.localeCompare(b.id));
  if (!units.length) return blocked('THERMAL_UNITS_REQUIRED', 'Keine Einheiten im Gebäude vorhanden.');

  const streams = [];
  const absentServices = [];
  for (const kind of Object.keys(SERVICES)) {
    const serviceConfig = config[kind] ?? {};
    const expenses = project.expenses.filter(expense => exactPeriodExpense(expense, period, kind));
    if (serviceConfig.enabled !== true) {
      if (expenses.length) {
        return blocked('THERMAL_SERVICE_CONFIG_MISMATCH',
          kind === 'heating' ? 'Es gibt bestätigte Heizkosten, der Heizungsdienst ist aber nicht aktiviert.' :
            'Es gibt bestätigte Warmwasserkosten, der Warmwasserdienst ist aber nicht aktiviert.');
      }
      if (serviceConfig.absentConfirmed !== true) {
        return blocked('THERMAL_ABSENCE_CONFIRMATION_REQUIRED',
          'Nicht vorhandene Heizungs- oder Warmwasserversorgung muss ausdrücklich bestätigt werden.');
      }
      absentServices.push(kind);
      continue;
    }
    if (!expenses.length) {
      return blocked('THERMAL_EXPENSES_REQUIRED',
        kind === 'heating' ? 'Für Heizung fehlt eine bestätigte Jahreskostenposition.' :
          'Für Warmwasser fehlt eine bestätigte Jahreskostenposition.');
    }
    const mapping = {};
    for (const unit of units) {
      const meterIds = project.meters
        .filter(meter => meter.propertyId === period.propertyId && meter.unitId === unit.id && meter.service === kind)
        .map(meter => meter.id).sort();
      if (!meterIds.length) {
        return blocked('THERMAL_METER_MAPPING_INVALID',
          'Für jede Einheit muss mindestens ein passender Heizungs-/Warmwasserzähler dokumentiert sein.');
      }
      mapping[unit.id] = meterIds;
    }
    const meta = SERVICES[kind];
    streams.push({
      kind,
      expenseIds: expenses.map(expense => expense.id).sort(),
      consumptionPercent: Number(serviceConfig.consumptionPercent),
      mandatory70Applies: serviceConfig.mandatory70Applies === true,
      rateConfirmed: serviceConfig.rateConfirmed === true,
      readingsConfirmed: serviceConfig.readingsConfirmed === true,
      measurementBasisConfirmed: serviceConfig.measurementBasisConfirmed === true,
      measurementKind: meta.measurementKind,
      canonicalUnit: meta.canonicalUnit,
      meterIdsByUnit: mapping
    });
  }

  const plan = {
    system: 'separate',
    scopeConfirmed: true,
    costBasisConfirmed: true,
    co2CostsSeparateConfirmed: true,
    exceptionStatus: 'reviewed_standard',
    groupPreallocationRequired: false,
    streams,
    absentServices,
    absentServicesConfirmed: absentServices.length ? true : undefined
  };
  const result = calculateThermalPeriod(project, periodId, plan);
  if (result.status !== 'calculated' || !result.report) return result;
  return {
    status: 'preview',
    calculationReady: false,
    issues: [],
    report: {
      ...result.report,
      calculationReady: false,
      combinedWithOtherCosts: false,
      legalRelease: false,
      pdfGenerated: false
    },
    plan
  };
}
