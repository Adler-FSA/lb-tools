/** Baustein 4 landlord preview over the tested standard allocation kernel. */
import { calculatePeriod } from './calculation.js';

const detailFor = issue => ({
  code: String(issue?.code || 'LANDLORD_PREVIEW_BLOCKED'),
  detail: String(issue?.detail || 'Datengrundlage ist noch nicht vollständig.'),
  path: String(issue?.path || '')
});

export function previewLandlordPeriod(project, accountingPeriodId) {
  const before = JSON.stringify(project);
  const result = calculatePeriod(project, accountingPeriodId);
  if (JSON.stringify(project) !== before) {
    return { status:'blocked', issues:[{ code:'LANDLORD_MUTATION_GUARD', detail:'Berechnung wurde sicher gestoppt.', path:'project' }], report:null };
  }
  if (result.status !== 'calculated' || !result.report) {
    return { status:'blocked', issues:(result.issues ?? []).map(detailFor), report:null };
  }
  const tenancyMap = new Map(project.tenancies.map(t => [t.id, t]));
  const unitMap = new Map(project.units.map(u => [u.id, u]));
  return {
    status:'preview',
    issues:[],
    report:{
      periodId:result.report.periodId,
      propertyId:result.report.propertyId,
      totalCostsCents:result.report.totalCostsCents,
      ownerCostsCents:result.report.ownerCostsCents,
      tenantCostsCents:result.report.tenantCostsCents,
      tenants:result.report.tenants.map(row => {
        const tenancy = tenancyMap.get(row.tenancyId);
        const unit = tenancy ? unitMap.get(tenancy.unitId) : null;
        return {
          ...row,
          partyLabel: tenancy?.partyLabel || row.tenancyId,
          unitLabel: unit?.label || tenancy?.unitId || 'Einheit'
        };
      }),
      expenseLines:result.report.expenseLines.map(line => ({
        expenseId:line.expenseId, category:line.category, amountCents:line.amountCents,
        method:line.method, unitShares:line.unitShares.map(share => ({...share}))
      })),
      advanceSchedules:result.report.advanceSchedules.map(x => ({...x})),
      legalRelease:false,
      pdfGenerated:false,
      postingReady:false
    }
  };
}
