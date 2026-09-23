/** Baustein 4 — CO₂ landlord adapter for the already supported narrow 2026 case.
 * It never infers applicability. All legal/scope switches remain explicit user confirmations.
 * Building classification can be shown even when individual tenant allocation stays blocked.
 */
import { validateProject } from './model.js';
import { calculateThermalPeriod } from './thermal.js';
import { previewBuildingCo2 } from './co2-building.js';
import { previewTenantCo2 } from './co2-tenants.js';
import { previewSeparateThermalLandlord } from './landlord-thermal.js';

const safe = value => Number.isSafeInteger(value) && value >= 0;
const text = value => typeof value === 'string' && value.trim().length > 0;

const blocked = (code, detail, extra = {}) => ({
  status: 'blocked',
  calculationReady: false,
  buildingReport: null,
  tenantReport: null,
  issues: [{ code, path: 'co2Plan', detail }],
  ...extra
});

function fullYearArea(project, period) {
  const units = project.units.filter(unit => unit.propertyId === period.propertyId);
  if (!units.length) return null;
  let total = 0n;
  for (const unit of units) {
    const matches = (unit.areaHistory ?? []).filter(area =>
      area.from <= period.startDate && (area.to == null || area.to >= period.endDate));
    const later = (unit.areaHistory ?? []).some(area =>
      area.from > period.startDate && area.from <= period.endDate);
    if (matches.length !== 1 || later || !Number.isSafeInteger(matches[0].hundredthsM2) || matches[0].hundredthsM2 <= 0) {
      return null;
    }
    total += BigInt(matches[0].hundredthsM2);
    if (total > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  }
  return Number(total);
}

function co2Expenses(project, period) {
  return project.expenses
    .filter(expense => expense.propertyId === period.propertyId &&
      expense.category === 'co2' &&
      expense.startDate <= period.endDate &&
      (expense.endDate == null || expense.endDate >= period.startDate))
    .sort((a,b) => a.id.localeCompare(b.id));
}

export function previewLandlordCo2(project, periodId, config, thermalConfig) {
  const structural = validateProject(project);
  if (structural.length) {
    return {
      status: 'blocked', calculationReady: false, buildingReport: null, tenantReport: null,
      issues: structural.map(error => ({ code:error.code, path:error.path, detail:error.message }))
    };
  }
  const period = project.accountingPeriods.find(item => item.id === periodId && item.endDate);
  if (!period) return blocked('CO2_PERIOD_REQUIRED', 'Abgeschlossenes Abrechnungsjahr fehlt.');
  if (period.startDate !== '2026-01-01' || period.endDate !== '2026-12-31') {
    return blocked('CO2_PERIOD_UNSUPPORTED', 'Der vorhandene CO₂-Fachpfad unterstützt derzeit ausschließlich das vollständige Kalenderjahr 2026.');
  }

  if (!config || config.applicabilityReviewed !== true ||
      config.specialHeatingCasesExcludedConfirmed !== true ||
      config.reductionExceptionsExcludedConfirmed !== true ||
      config.ownerCentralSupplyConfirmed !== true ||
      config.invoiceInventoryConfirmed !== true ||
      config.areaBasisConfirmed !== true ||
      config.emissionsPeriodConfirmed !== true) {
    return blocked('CO2_CONFIRMATIONS_REQUIRED',
      'Anwendbarkeit, zentrale Eigentümer-Versorgung, Sonderfälle, Kürzungen, Fläche, Emissionszeitraum und Rechnungsinventar müssen ausdrücklich bestätigt sein.');
  }
  if (!text(config.areaEvidenceRef) || !text(config.emissionsEvidenceRef) ||
      !Number.isSafeInteger(config.emissionsGrams) || config.emissionsGrams < 0 ||
      !safe(config.confirmedInvoiceCo2Cents)) {
    return blocked('CO2_EVIDENCE_REQUIRED',
      'Flächenbeleg, Emissionsbeleg, Emissionen in Gramm und bestätigter CO₂-Rechnungsbetrag werden benötigt.');
  }

  const areaHundredthsM2 = fullYearArea(project, period);
  if (!Number.isSafeInteger(areaHundredthsM2) || areaHundredthsM2 <= 0) {
    return blocked('CO2_AREA_UNSUPPORTED', 'Alle Flächen müssen das vollständige Jahr unverändert und eindeutig abdecken.');
  }
  const expenses = co2Expenses(project, period);
  if (!expenses.length) return blocked('CO2_INVOICE_REQUIRED', 'Mindestens eine CO₂-Originalkostenposition wird benötigt.');

  const co2Plan = {
    scope: 'residential_central_2026',
    applicabilityReviewed: true,
    specialHeatingCasesExcludedConfirmed: true,
    reductionExceptionsExcludedConfirmed: true,
    directTenantSupply: false,
    invoiceInventoryConfirmed: true,
    areaHundredthsM2,
    areaBasisConfirmed: true,
    areaEvidenceRef: config.areaEvidenceRef.trim(),
    emissionsGrams: config.emissionsGrams,
    emissionsEvidenceRef: config.emissionsEvidenceRef.trim(),
    emissionsPeriodConfirmed: true,
    co2ExpenseIds: expenses.map(expense => expense.id),
    confirmedInvoiceCo2Cents: config.confirmedInvoiceCo2Cents
  };

  const building = previewBuildingCo2(project, periodId, co2Plan);
  if (building.status !== 'calculated' || !building.report) {
    return {
      status: 'blocked', calculationReady: false, buildingReport: null, tenantReport: null,
      issues: building.issues ?? [{ code:'CO2_BUILDING_BLOCKED', path:'co2Plan', detail:'Gebäude-CO₂-Vorschau ist gesperrt.' }]
    };
  }

  if (!config.tenantAllocationRequested) {
    return {
      status: 'building_preview',
      calculationReady: false,
      buildingReport: building.report,
      tenantReport: null,
      issues: [],
      legalRelease: false,
      pdfGenerated: false
    };
  }

  if (config.tenantOnlyOccupancyConfirmed !== true ||
      config.thermalCostShareMethodReviewed !== true ||
      config.originalCo2ExcludedFromThermalConfirmed !== true ||
      !text(config.distributionEvidenceRef)) {
    return {
      status: 'building_preview',
      calculationReady: false,
      buildingReport: building.report,
      tenantReport: null,
      issues: [{
        code:'CO2_TENANT_CONFIRMATIONS_REQUIRED',
        path:'co2TenantPlan',
        detail:'Für eine individuelle Mieter-CO₂-Vorschau müssen reine Mieternutzung, thermische Kostenanteile und die Abgrenzung der CO₂-Originalkosten ausdrücklich bestätigt sein.'
      }],
      legalRelease:false,
      pdfGenerated:false
    };
  }

  const thermalPreview = previewSeparateThermalLandlord(project, periodId, thermalConfig);
  if (thermalPreview.status !== 'preview' || !thermalPreview.plan) {
    return {
      status: 'building_preview',
      calculationReady: false,
      buildingReport: building.report,
      tenantReport: null,
      issues: thermalPreview.issues ?? [{ code:'CO2_THERMAL_REQUIRED', path:'thermalPlan', detail:'Geprüfter Wärme-Teilbericht fehlt.' }],
      legalRelease:false,
      pdfGenerated:false
    };
  }
  const rawThermal = calculateThermalPeriod(project, periodId, thermalPreview.plan);
  if (rawThermal.status !== 'calculated' || !rawThermal.report) {
    return {
      status: 'building_preview',
      calculationReady: false,
      buildingReport: building.report,
      tenantReport: null,
      issues: rawThermal.issues ?? [{ code:'CO2_THERMAL_REQUIRED', path:'thermalResult', detail:'Geprüfter Wärme-Teilbericht fehlt.' }],
      legalRelease:false,
      pdfGenerated:false
    };
  }

  const tenantPlan = {
    distributionMethod: 'thermal_cost_shares',
    methodReviewed: true,
    tenantOnlyOccupancyConfirmed: true,
    originalCo2ExcludedFromThermalConfirmed: true,
    distributionEvidenceRef: config.distributionEvidenceRef.trim()
  };
  const tenants = previewTenantCo2(project, periodId, co2Plan, rawThermal, tenantPlan);
  if (tenants.status !== 'preview' || !tenants.report) {
    return {
      status: 'building_preview',
      calculationReady: false,
      buildingReport: building.report,
      tenantReport: null,
      issues: tenants.issues ?? [{ code:'CO2_TENANT_BLOCKED', path:'co2TenantPlan', detail:'Individuelle CO₂-Vorschau bleibt gesperrt.' }],
      legalRelease:false,
      pdfGenerated:false
    };
  }

  return {
    status: 'tenant_preview',
    calculationReady: false,
    buildingReport: building.report,
    tenantReport: tenants.report,
    issues: [],
    legalRelease:false,
    pdfGenerated:false
  };
}
