/** Real engine entrypoint. Still only produces a non-releasable thermal subreport. */
import { calculateThermalPeriod } from './thermal.js';
import { calculateLinkedThermalAudited } from './thermal-linked-audit.js';

export function calculateLinkedThermalWithEngine(project, accountingPeriodId, linkedPlan, thermalPlan) {
  return calculateLinkedThermalAudited(project, accountingPeriodId, linkedPlan, thermalPlan, calculateThermalPeriod);
}
