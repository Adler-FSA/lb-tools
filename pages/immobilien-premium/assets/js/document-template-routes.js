/** Nebenkosten Premium — feste Zuordnung Dokumenttyp → spezialisierte HTML-Vorlage. */
export const DOCUMENT_TEMPLATE_ROUTES=Object.freeze({
  owner_annual_summary:'dokumentvorlagen/eigentuemer-jahresuebersicht.html',
  tenant_operating_cost_statement:'dokumentvorlagen/betriebskostenabrechnung.html',
  lease_draft:'dokumentvorlagen/mietvertragsentwurf.html',
  house_rules:'dokumentvorlagen/hausordnung.html',
  waste_info:'dokumentvorlagen/entsorgungsinformation.html',
  handover_protocol:'dokumentvorlagen/uebergabeprotokoll.html',
  tenant_service_sheet:'dokumentvorlagen/mieter-serviceblatt.html',
  owner_safety_overview:'dokumentvorlagen/eigentuemer-sicherheitsuebersicht.html',
  letting_checklist:'dokumentvorlagen/vermietungs-checkliste.html'
});
export function documentPreviewUrl(document){
  const route=DOCUMENT_TEMPLATE_ROUTES[document?.documentType];
  if(!route||!document?.id)throw new Error('Für diese Dokumentfassung ist keine Vorschauvorlage vorhanden.');
  return route+'?id='+encodeURIComponent(document.id);
}
