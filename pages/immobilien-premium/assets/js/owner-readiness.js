/** Guided annual readiness for Baustein 3 owner flow.
 * Uses the real annual production runner read-only. It never invents plans,
 * never mutates the project and never turns a preview into legal release.
 */
import { previewAnnualPeriod } from './year-workflow-runner.js';

const sectionForIssue = issue => {
  const text = `${String(issue?.code || '')} ${String(issue?.detail || '')}`;
  if (/METER|READING|CONSUMPTION|THERMAL/.test(text)) return 'verbrauch';
  if (/TENANCY|CONTRACT|PAYMENT_LEDGER|USAGE|AREA/.test(text)) return 'immobilien';
  if (/ALLOCATION|COST_NOT_CONFIRMED|CONTRACT_COST/.test(text)) return 'vermieter';
  if (/CO2|SPECIAL_COST|WORKFLOW_PLAN/.test(text)) return 'sonderkosten';
  if (/SUPPLY|PROVIDER|PAYMENT|SOURCE|EXPENSE|COST_UNRESOLVED/.test(text)) return 'kosten';
  return 'pruefung';
};

const actionForSection = section => ({
  immobilien: { label: 'Immobilien & Nutzung prüfen', href: 'immobilien.html' },
  kosten: { label: 'Kosten & Zahlungen prüfen', href: 'kosten.html' },
  verbrauch: { label: 'Zähler & Verbrauch prüfen', href: 'verbrauch.html' },
  vermieter: { label: 'Verteilung folgt im Vermieter-Baustein', href: null },
  sonderkosten: { label: 'Sonderkosten-Fachpfad erforderlich', href: null },
  pruefung: { label: 'Datengrundlage prüfen', href: null }
})[section];

export function inspectOwnerAnnualReadiness(project, periodId) {
  const before = JSON.stringify(project);
  const result = previewAnnualPeriod(project, periodId, {});
  if (JSON.stringify(project) !== before) {
    return {
      status: 'blocked',
      preview: null,
      blockers: [{
        code: 'READINESS_MUTATION_GUARD',
        detail: 'Die Jahresprüfung wurde gestoppt, weil Eingabedaten verändert worden wären.',
        section: 'pruefung',
        action: actionForSection('pruefung')
      }]
    };
  }

  if (result?.status === 'preview' && result.report) {
    return {
      status: 'preview',
      preview: {
        periodId: result.report.periodId,
        propertyId: result.report.propertyId,
        originalCostsCents: result.report.originalCostsCents,
        ownerCostsCents: result.report.ownerCostsCents,
        tenantCostsCents: result.report.tenantCostsCents,
        legalRelease: false,
        pdfGenerated: false,
        combinedForPosting: false
      },
      blockers: []
    };
  }

  const issues = Array.isArray(result?.issues) && result.issues.length
    ? result.issues
    : [{ code: 'ANNUAL_PREVIEW_BLOCKED', detail: 'Der geprüfte Jahreskern hat noch keine vollständige Datengrundlage.' }];

  return {
    status: 'blocked',
    preview: null,
    blockers: issues.map(issue => {
      const section = sectionForIssue(issue);
      return {
        code: String(issue.code || 'ANNUAL_PREVIEW_BLOCKED'),
        detail: String(issue.detail || 'Datengrundlage benötigt eine weitere Prüfung.'),
        section,
        action: actionForSection(section)
      };
    })
  };
}
