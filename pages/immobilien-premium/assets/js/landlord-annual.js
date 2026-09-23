/** Baustein 4 — final non-posting landlord annual preview.
 * Thin read-only adapter over the production annual workflow.
 */
import { previewAnnualPeriod } from './year-workflow-runner.js';

export function previewLandlordAnnual(project, periodId, plans) {
  const beforeProject = JSON.stringify(project);
  const beforePlans = JSON.stringify(plans ?? {});
  const result = previewAnnualPeriod(project, periodId, plans ?? {});
  if (JSON.stringify(project) !== beforeProject || JSON.stringify(plans ?? {}) !== beforePlans) {
    return {
      status:'blocked',
      calculationReady:false,
      report:null,
      issues:[{
        code:'LANDLORD_ANNUAL_MUTATION_GUARD',
        path:'annual',
        detail:'Die Jahresvorschau wurde gestoppt, weil Eingabedaten verändert worden wären.'
      }]
    };
  }
  if (result.status !== 'preview' || !result.report) return result;

  const tenancyMap = new Map((project.tenancies ?? []).map(t => [t.id,t]));
  const unitMap = new Map((project.units ?? []).map(u => [u.id,u]));
  return {
    status:'preview',
    calculationReady:false,
    issues:[],
    report:{
      ...result.report,
      tenants:(result.report.tenants ?? []).map(row => {
        const tenancy = tenancyMap.get(row.tenancyId);
        const unit = tenancy ? unitMap.get(tenancy.unitId) : null;
        return {
          ...row,
          partyLabel:tenancy?.partyLabel || row.tenancyId,
          unitLabel:unit?.label || tenancy?.unitId || 'Einheit'
        };
      }),
      combinedForPosting:false,
      legalRelease:false,
      pdfGenerated:false
    }
  };
}
