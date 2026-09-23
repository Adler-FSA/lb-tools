/** Baustein 4 — linked heating/hot-water landlord adapter.
 * Uses only explicitly confirmed original invoices, a confirmed common physical energy
 * basis and the production linked thermal runner. No synthetic invoice is persisted.
 */
import { validateProject } from './model.js';
import { calculateLinkedThermalWithEngine } from './thermal-linked-runner.js';

const safe = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => safe(value) && value > 0;
const text = value => typeof value === 'string' && value.trim().length > 0;
const SERVICES = {
  heating: { measurementKind:'heat_energy', canonicalUnit:'kWh' },
  hot_water: { measurementKind:'hot_water_volume', canonicalUnit:'m3' }
};
const blocked = (code, detail) => ({
  status:'blocked', calculationReady:false, report:null,
  issues:[{code,path:'linkedPlan',detail}]
});
const toMilliKWh = value => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const scaled = Math.round(value * 1000);
  return Number.isSafeInteger(scaled) && scaled > 0 ? scaled : null;
};

export function previewLinkedThermalLandlord(project, periodId, config) {
  const structural = validateProject(project);
  if (structural.length) {
    return {
      status:'blocked', calculationReady:false, report:null,
      issues:structural.map(error => ({code:error.code,path:error.path,detail:error.message}))
    };
  }
  const period = project.accountingPeriods.find(item => item.id === periodId && item.endDate);
  if (!period) return blocked('LINKED_PERIOD_REQUIRED','Abgeschlossenes Abrechnungsjahr fehlt.');
  if (!config || !['gas_boiler','heat_pump','commercial_heat'].includes(config.plantType) ||
      config.scopeConfirmed !== true || config.invoiceInventoryConfirmed !== true ||
      config.co2ExcludedConfirmed !== true || config.samePhysicalBasisConfirmed !== true ||
      config.methodReviewed !== true) {
    return blocked('LINKED_CONFIRMATIONS_REQUIRED',
      'Anlagenart, Rechnungsinventar, CO₂-Abgrenzung und gemeinsame physikalische Energiegrundlage müssen ausdrücklich bestätigt sein.');
  }

  const totalMilliKWh = toMilliKWh(config.totalEnergyKWh);
  const hotWaterMilliKWh = toMilliKWh(config.hotWaterEnergyKWh);
  if (!positive(totalMilliKWh) || !positive(hotWaterMilliKWh) || totalMilliKWh <= hotWaterMilliKWh ||
      !text(config.totalEvidenceRef) || !text(config.hotWaterEvidenceRef)) {
    return blocked('LINKED_ENERGY_BASIS_INVALID',
      'Gesamtenergie und Warmwasserenergie müssen positiv, auf derselben bestätigten Basis und mit getrennten Nachweisen dokumentiert sein.');
  }

  const relevant = project.expenses.filter(expense =>
    expense.propertyId === period.propertyId &&
    ['thermal_shared','heating','hot_water','co2','heating_oil'].includes(expense.category) &&
    expense.startDate <= period.endDate && (expense.endDate ?? '9999-12-31') >= period.startDate);

  const sharedExpenseIds = relevant.filter(e => e.category === 'thermal_shared').map(e => e.id).sort();
  const heatingOnlyExpenseIds = relevant.filter(e => e.category === 'heating').map(e => e.id).sort();
  const hotWaterOnlyExpenseIds = relevant.filter(e => e.category === 'hot_water').map(e => e.id).sort();
  const co2ExpenseIds = relevant.filter(e => e.category === 'co2').map(e => e.id).sort();
  if (!sharedExpenseIds.length) {
    return blocked('LINKED_SHARED_COST_REQUIRED',
      'Für eine verbundene Anlage wird mindestens eine gemeinsame Originalkostenposition „Heizung + Warmwasser“ benötigt.');
  }

  const references = [...new Set(relevant.map(e => e.invoiceReference).filter(text))].sort();
  if (!config.invoiceTotalsCentsByReference || typeof config.invoiceTotalsCentsByReference !== 'object' ||
      Array.isArray(config.invoiceTotalsCentsByReference) ||
      Object.keys(config.invoiceTotalsCentsByReference).sort().join('\u0000') !== references.join('\u0000') ||
      references.some(ref => !safe(config.invoiceTotalsCentsByReference[ref]))) {
    return blocked('LINKED_INVOICE_TOTALS_REQUIRED',
      'Für jede Originalrechnung muss der vollständige bestätigte Rechnungsbetrag angegeben werden.');
  }

  const units = project.units.filter(unit => unit.propertyId === period.propertyId).sort((a,b)=>a.id.localeCompare(b.id));
  if (!units.length) return blocked('LINKED_UNITS_REQUIRED','Keine Einheiten im Gebäude vorhanden.');

  const streams = [];
  for (const kind of ['heating','hot_water']) {
    const service = config[kind] ?? {};
    if (!Number.isInteger(service.consumptionPercent) || service.consumptionPercent < 50 || service.consumptionPercent > 70 ||
        service.rateConfirmed !== true || service.readingsConfirmed !== true ||
        service.measurementBasisConfirmed !== true) {
      return blocked('LINKED_THERMAL_CONFIRMATIONS_REQUIRED',
        'Verbrauchsquote, Messwerte und Messbasis müssen für Heizung und Warmwasser ausdrücklich bestätigt sein.');
    }
    if (service.mandatory70Applies === true && service.consumptionPercent !== 70) {
      return blocked('LINKED_THERMAL_RATE_INVALID','Bei bestätigter 70-%-Anforderung muss die Verbrauchsquote 70 % betragen.');
    }
    const meterIdsByUnit = {};
    for (const unit of units) {
      const ids = project.meters
        .filter(meter => meter.propertyId === period.propertyId && meter.unitId === unit.id && meter.service === kind)
        .map(meter => meter.id).sort();
      if (!ids.length) {
        return blocked('LINKED_THERMAL_METER_MAPPING_INVALID',
          'Für jede Einheit wird ein passender Heizungs- und Warmwasserzähler benötigt.');
      }
      meterIdsByUnit[unit.id] = ids;
    }
    streams.push({
      kind,
      expenseIds:[],
      consumptionPercent:service.consumptionPercent,
      mandatory70Applies:service.mandatory70Applies === true,
      rateConfirmed:true,
      readingsConfirmed:true,
      measurementBasisConfirmed:true,
      measurementKind:SERVICES[kind].measurementKind,
      canonicalUnit:SERVICES[kind].canonicalUnit,
      meterIdsByUnit
    });
  }

  const linkedPlan = {
    system:'linked',
    plantType:config.plantType,
    scopeConfirmed:true,
    invoiceInventoryConfirmed:true,
    co2ExcludedConfirmed:true,
    sharedExpenseIds,
    heatingOnlyExpenseIds,
    hotWaterOnlyExpenseIds,
    co2ExpenseIds,
    invoiceTotalsCentsByReference:{...config.invoiceTotalsCentsByReference},
    basis:{
      kind:config.plantType === 'gas_boiler' ? 'fuel_energy' : 'heat_energy',
      unit:'milli_kWh',
      totalMilliKWh,
      hotWaterMilliKWh,
      totalEvidenceRef:config.totalEvidenceRef.trim(),
      hotWaterEvidenceRef:config.hotWaterEvidenceRef.trim(),
      samePhysicalBasisConfirmed:true,
      methodReviewed:true
    }
  };
  const thermalPlan = {
    system:'separate',
    scopeConfirmed:true,
    costBasisConfirmed:true,
    co2CostsSeparateConfirmed:true,
    exceptionStatus:'reviewed_standard',
    groupPreallocationRequired:false,
    linkedTransferConfirmed:true,
    streams
  };

  const before = JSON.stringify(project);
  const result = calculateLinkedThermalWithEngine(project, periodId, linkedPlan, thermalPlan);
  if (JSON.stringify(project) !== before) {
    return blocked('LINKED_MUTATION_GUARD','Die verbundene Anlagenprüfung wurde gestoppt, weil gespeicherte Projektdaten verändert worden wären.');
  }
  if (result.status !== 'calculated' || !result.report) return result;
  return {
    status:'preview',
    calculationReady:false,
    issues:[],
    report:{
      ...result.report,
      calculationReady:false,
      combinedWithOtherCosts:false,
      co2Calculated:false,
      legalRelease:false,
      pdfGenerated:false
    },
    linkedPlan,
    thermalPlan
  };
}
