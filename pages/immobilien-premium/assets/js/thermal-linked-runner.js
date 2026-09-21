/** Real engine entrypoint. Still only produces a non-releasable thermal subreport. */
import { calculateThermalPeriod } from './thermal.js';
import { calculateLinkedThermalPeriod } from './thermal-linked-integration.js';

export function calculateLinkedThermalWithEngine(project, accountingPeriodId, linkedPlan, thermalPlan) {
  return calculateLinkedThermalPeriod(project, accountingPeriodId, linkedPlan, thermalPlan, calculateThermalPeriod);
}
