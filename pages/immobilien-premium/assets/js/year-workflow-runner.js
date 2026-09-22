/** Production wiring: validated original sources -> separate engines -> one audit preview. */
import { validateProject } from './model.js';
import { calculatePeriod } from './calculation.js';
import { calculateThermalPeriod } from './thermal.js';
import { calculateLinkedThermalWithEngine } from './thermal-linked-runner.js';
import { previewTenantCo2 } from './co2-tenants.js';
import { auditPeriodPreview } from './period-integrity.js';
import { reviewSupplyRegistry } from './supply-registry.js';
import { runAnnualWorkflow } from './year-workflow.js';

/** Returns an audit-only, never bookable or legally released annual preview. */
export function previewAnnualPeriod(project, periodId, plans = {}) {
  return runAnnualWorkflow(project, periodId, plans, {
    validate: validateProject,
    standard: calculatePeriod,
    thermalSeparate: calculateThermalPeriod,
    thermalLinked: calculateLinkedThermalWithEngine,
    co2Tenants: previewTenantCo2,
    audit: auditPeriodPreview,
    supply: reviewSupplyRegistry
  });
}
