/**
 * Nebenkosten Premium — Baustein 6 PDF-Inhaltsadapter.
 * Liest ausschließlich freigegebene document_snapshot-Fassungen.
 */
import {generateAkademiePdf,safePdfFilePart} from './pdf-master-core.js';
import {safeDocumentFilename} from './document-workflow.js';

const T={
  de:{
    page:'Seite',brandLine:'Akademie Immobilien- & Mietservice',
    released:'Freigegebene Fassung',version:'Version',releasedOn:'Freigegeben am',
    property:'Immobilie',unit:'Einheit',tenancy:'Mietverhältnis',period:'Abrechnungszeitraum',
    costs:'Gesamtkosten',ownerCosts:'Eigentümeranteil / Eigentümerkosten',allocatable:'Als umlagefähig eingeordnet',
    unresolved:'Ungeklärt',providerPaid:'Netto an Versorger gezahlt',category:'Kostenart',amount:'Betrag',
    tenantShare:'Mieteranteil',method:'Schlüssel',invoice:'Beleg',advances:'Berücksichtigte Zahlungen',
    balance:'Ergebnis',credit:'Guthaben',additional:'Nachzahlung',note:'Hinweis',
    dataRelease:'Diese Fassung fixiert den dokumentierten Datenstand. Die Freigabe ist keine automatische Rechtsprüfung.',
    ownerSummary:'Eigentümer-Jahresübersicht',tenantStatement:'Betriebskostenabrechnung',consumption:'Dokumentierter Verbrauch',yearComparison:'Jahresvergleich',tenantTotal:'Mieteranteile gesamt',providerNet:'Versorger netto',
    safety:'Eigentümer-Sicherheits- und Pflichtenübersicht',letting:'Vermietungs-Checkliste',
    details:'Dokumentdaten',checks:'Prüfpunkte',status:'Status',classification:'Einordnung',due:'Wiedervorlage',
    open:'Offen',review:'Prüfen',done:'Erledigt',notApplicable:'Nicht zutreffend',
    legal:'Gesetzliche Pflicht',contract:'Vertragliche Verpflichtung',recommendation:'Empfehlung',
    service:'Mietservice-Dokument',draftSource:'Quelle: gespeicherter Mietservice-Entwurf',
    noData:'Keine weiteren Angaben gespeichert.'
  },
  en:{
    page:'Page',brandLine:'Academy Property & Tenant Service',
    released:'Released version',version:'Version',releasedOn:'Released on',
    property:'Property',unit:'Unit',tenancy:'Tenancy',period:'Accounting period',
    costs:'Total costs',ownerCosts:'Owner share / owner costs',allocatable:'Classified as allocatable',
    unresolved:'Unresolved',providerPaid:'Net paid to providers',category:'Cost category',amount:'Amount',
    tenantShare:'Tenant share',method:'Allocation key',invoice:'Reference',advances:'Recorded advance payments',
    balance:'Balance',credit:'Credit',additional:'Additional payment',note:'Note',
    dataRelease:'This version fixes the documented data state. Release is not an automatic legal review.',
    ownerSummary:'Owner annual summary',tenantStatement:'Operating cost statement',consumption:'Documented consumption',yearComparison:'Year comparison',tenantTotal:'Total tenant shares',providerNet:'Provider net paid',
    safety:'Owner safety and obligations overview',letting:'Letting checklist',
    details:'Document data',checks:'Review items',status:'Status',classification:'Classification',due:'Follow-up',
    open:'Open',review:'Review',done:'Done',notApplicable:'Not applicable',
    legal:'Legal obligation',contract:'Contractual obligation',recommendation:'Recommendation',
    service:'Tenant service document',draftSource:'Source: saved tenant-service draft',
    noData:'No further information stored.'
  }
};
const money=(c,lang)=>Number.isSafeInteger(c)?new Intl.NumberFormat(lang==='en'?'en-GB':'de-DE',{style:'currency',currency:'EUR'}).format(c/100):'–';
const date=(v,lang)=>{if(!v)return'–';try{return new Intl.DateTimeFormat(lang==='en'?'en-GB':'de-DE').format(new Date(v+'T00:00:00'));}catch{return String(v);}};
const address=p=>{const a=p?.address||{};return [[a.street,a.houseNumber].filter(Boolean).join(' '),[a.postalCode,a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')||'–';};
const labelStatus=(v,x)=>({open:x.open,review:x.review,done:x.done,not_applicable:x.notApplicable})[v]||String(v||'–');
const labelClass=(v,x)=>({unresolved:x.unresolved,legal:x.legal,contract:x.contract,recommendation:x.recommendation,not_applicable:x.notApplicable})[v]||String(v||'–');
const methodLabel=(v,lang)=>({
  area:lang==='en'?'Area':'Fläche',
  consumption:lang==='en'?'Consumption':'Verbrauch',
  direct:lang==='en'?'Direct':'Direkt',
  owner_only:lang==='en'?'Owner only':'Nur Eigentümer'
})[v]||String(v||'–');
const categoryLabel=(v,lang)=>({
  property_tax:lang==='en'?'Property tax':'Grundsteuer',
  building_insurance:lang==='en'?'Building insurance':'Gebäudeversicherung',
  waste:lang==='en'?'Waste':'Müll / Entsorgung',
  common_electricity:lang==='en'?'Common electricity':'Allgemeinstrom',
  cold_water:lang==='en'?'Cold water':'Kaltwasser',
  repair:lang==='en'?'Repair / maintenance':'Reparatur / Instandhaltung',
  other:lang==='en'?'Other':'Sonstige Kosten'
})[v]||String(v||'–');

const fieldLabels={
  de:{
    tenantLabel:'Vertragspartei / Bezeichnung',startDate:'Mietbeginn',baseRentCents:'Nettokaltmiete',
    operatingCostsModel:'Betriebskostenmodell',operatingCostCents:'Betriebskosten',depositCents:'Kaution',
    notes:'Notizen',ruleKind:'Einordnung',rules:'Regeln / Hinweise',locations:'Standorte / Sammelstellen',
    sorting:'Trennhinweise',schedule:'Abholung / Bereitstellung',localDataConfirmed:'Örtliche Angaben geprüft',
    kind:'Vorgang',date:'Datum',keys:'Schlüssel',meters:'Zählerstände',defects:'Zustand / Mängel',
    purpose:'Anlass / Zweck',subject:'Betreff',message:'Mitteilung',requestedInfo:'Erbetene Information',
    deadline:'Frist / Rückmeldung bis'
  },
  en:{
    tenantLabel:'Contracting party / label',startDate:'Tenancy start',baseRentCents:'Net base rent',
    operatingCostsModel:'Operating-cost model',operatingCostCents:'Operating costs',depositCents:'Deposit',
    notes:'Notes',ruleKind:'Classification',rules:'Rules / guidance',locations:'Locations / collection points',
    sorting:'Sorting guidance',schedule:'Collection / presentation',localDataConfirmed:'Local information checked',
    kind:'Process',date:'Date',keys:'Keys',meters:'Meter readings',defects:'Condition / defects',
    purpose:'Reason / purpose',subject:'Subject',message:'Message',requestedInfo:'Requested information',
    deadline:'Deadline / reply by'
  }
};
function displayPayloadValue(key,value,lang){
  if(['baseRentCents','operatingCostCents','depositCents'].includes(key))return money(value,lang);
  if(['startDate','date','deadline'].includes(key))return date(value,lang);
  if(typeof value==='boolean')return value?(lang==='en'?'Yes':'Ja'):(lang==='en'?'No':'Nein');
  if(key==='operatingCostsModel')return ({advance:lang==='en'?'Advance payment':'Vorauszahlung',flat:lang==='en'?'Flat charge':'Pauschale',unresolved:lang==='en'?'Unresolved':'Ungeklärt'})[value]||value;
  if(key==='kind')return ({move_in:lang==='en'?'Move in':'Einzug',move_out:lang==='en'?'Move out':'Auszug'})[value]||value;
  if(key==='ruleKind')return ({organisational:lang==='en'?'Organisational guidance':'Organisatorischer Hinweis',contractual:lang==='en'?'Contractual component – review':'Vertraglicher Bestandteil – prüfen'})[value]||value;
  return String(value??'');
}
function baseMeta(doc,s,x,lang){
  const items=[
    {label:x.version,value:String(doc.version??'–')},
    {label:x.releasedOn,value:date(doc.releasedOn,lang)}
  ];
  if(s.property)items.push({label:x.property,value:`${s.property.label||'–'} · ${address(s.property)}`});
  if(s.unit)items.push({label:x.unit,value:[s.unit.label,s.unit.floor].filter(Boolean).join(' · ')||'–'});
  if(s.tenancy)items.push({label:x.tenancy,value:s.tenancy.partyLabel||s.tenancy.id||'–'});
  if(s.period)items.push({label:x.period,value:`${date(s.period.startDate,lang)} – ${date(s.period.endDate,lang)}`});
  return items;
}
function serviceSections(doc,s,x,lang){
  const payload=s.payload||{},labels=fieldLabels[lang];
  const items=Object.entries(payload).filter(([,v])=>v!==''&&v!==null&&v!==undefined)
    .map(([k,v])=>({label:labels[k]||k,value:displayPayloadValue(k,v,lang)}));
  return [
    {heading:x.details,blocks:[
      {type:'key_values',items:baseMeta(doc,s,x,lang)},
      {type:'callout',text:x.draftSource},
      ...(items.length?[{type:'key_values',items}]:[{type:'paragraph',text:x.noData}])
    ]}
  ];
}
function ownerSections(doc,s,x,lang){
  const r=s.report||{},ready=s.readiness||{};
  const sections=[
    {heading:x.details,blocks:[{type:'key_values',items:baseMeta(doc,s,x,lang)}]},
    {heading:lang==='en'?'Annual totals':'Jahressummen',blocks:[
      {type:'key_values',items:[
        {label:x.costs,value:money(r.actualCostsCents,lang)},
        {label:x.ownerCosts,value:money(Number.isSafeInteger(ready.ownerCostsCents)?ready.ownerCostsCents:r.ownerClassifiedCents,lang)},
        {label:x.tenantTotal,value:money(ready.tenantCostsCents,lang)},
        {label:x.allocatable,value:money(r.allocatableClassifiedCents,lang)},
        {label:x.unresolved,value:money(r.unresolvedCents,lang)},
        {label:x.providerNet,value:money(r.providerNetPaidCents,lang)}
      ]},
      {type:'table',headers:[x.category,x.amount],rows:(r.byCategory||[]).map(a=>[categoryLabel(a.category,lang),money(a.amountCents,lang)])}
    ]}
  ];
  if(s.consumption?.totals?.length)sections.push({heading:x.consumption,blocks:[
    {type:'table',headers:[lang==='en'?'Service':'Verbrauchsart',lang==='en'?'Value':'Wert'],rows:s.consumption.totals.map(a=>[a.service,String(a.value)+' '+(a.unit||'')])}
  ]});
  if(s.comparison?.length)sections.push({heading:x.yearComparison,blocks:[
    {type:'table',headers:[lang==='en'?'Year':'Jahr',x.costs,x.providerNet],rows:s.comparison.map(y=>[y.yearLabel,money(y.actualCostsCents,lang),money(y.providerNetPaidCents,lang)])}
  ]});
  return sections;
}
function tenantSections(doc,s,x,lang){
  const t=s.tenant||{};
  const result=t.creditCents>0?`${x.credit}: ${money(t.creditCents,lang)}`:`${x.additional}: ${money(t.additionalCents||0,lang)}`;
  return [
    {heading:x.details,blocks:[{type:'key_values',items:baseMeta(doc,s,x,lang)}]},
    {heading:lang==='en'?'Cost allocation':'Kostenverteilung',blocks:[
      {type:'table',headers:[x.category,x.amount,x.method,x.tenantShare],rows:(s.expenseLines||[]).map(a=>[
        categoryLabel(a.category,lang),money(a.amountCents,lang),methodLabel(a.method,lang),money(a.tenantShareCents,lang)
      ])},
      {type:'key_values',items:[
        {label:x.tenantShare,value:money(t.costsCents,lang)},
        {label:x.advances,value:money(t.advancesCents,lang)},
        {label:x.balance,value:result}
      ]},
      {type:'callout',text:x.dataRelease}
    ]}
  ];
}
function safetySections(doc,s,x,lang){
  return [
    {heading:x.details,blocks:[{type:'key_values',items:baseMeta(doc,s,x,lang)}]},
    {heading:x.checks,blocks:[
      {type:'table',headers:[lang==='en'?'Topic':'Prüfthema',x.classification,x.status,x.due],rows:(s.checks||[]).map(c=>[
        c.label?.[lang]||c.checkKey,labelClass(c.classification,x),labelStatus(c.status,x),date(c.dueDate,lang)
      ])},
      ...((s.checks||[]).filter(c=>c.note).map(c=>({type:'callout',text:`${c.label?.[lang]||c.checkKey}: ${c.note}`})))
    ]}
  ];
}
function lettingSections(doc,s,x,lang){
  return [
    {heading:x.details,blocks:[{type:'key_values',items:[
      ...baseMeta(doc,s,x,lang),
      {label:lang==='en'?'Process':'Vorgang',value:s.process?.referenceLabel||s.process?.id||'–'},
      {label:lang==='en'?'Phase':'Phase',value:s.process?.phase||'–'}
    ]}]},
    {heading:x.checks,blocks:[
      {type:'table',headers:[lang==='en'?'Review item':'Prüfpunkt',x.status],rows:(s.items||[]).map(i=>[i[lang]||i.key,labelStatus(i.state,x)])},
      {type:'callout',text:lang==='en'
        ?'No applicant answers, evidence files, ranking, score or automatic tenant selection are stored in this checklist.'
        :'Diese Checkliste speichert keine Bewerberantworten, Nachweisdateien, Rankings, Scores oder automatische Mieterauswahl.'}
    ]}
  ];
}
export async function generateReleasedDocumentPdf(document,{lang='de'}={}){
  if(!document||document.kind!=='document_snapshot'||document.status!=='released'||!document.snapshot)
    throw new TypeError(lang==='en'?'A released document version is required.':'Eine freigegebene Dokumentfassung wird benötigt.');
  lang=lang==='en'?'en':'de';const x=T[lang],s=document.snapshot;
  let title=document.title||x.service,sections;
  if(s.kind==='owner_annual_summary'){title=x.ownerSummary;sections=ownerSections(document,s,x,lang);}
  else if(s.kind==='tenant_operating_cost_statement'){title=x.tenantStatement;sections=tenantSections(document,s,x,lang);}
  else if(s.kind==='owner_safety_overview'){title=x.safety;sections=safetySections(document,s,x,lang);}
  else if(s.kind==='letting_checklist'){title=x.letting;sections=lettingSections(document,s,x,lang);}
  else if(s.kind==='service_document'){title=document.title||x.service;sections=serviceSections(document,s,x,lang);}
  else throw new Error(lang==='en'?'Unsupported document snapshot.':'Nicht unterstützter Dokument-Snapshot.');
  const filename=safeDocumentFilename(document);
  const subtitle=[s.property?.label,s.tenancy?.partyLabel,`${x.version} ${document.version}`].filter(Boolean).join(' · ');
  return generateAkademiePdf({
    filename:safePdfFilePart(filename.replace(/\.pdf$/i,''),'Dokument')+'.pdf',
    title,subtitle,sections,
    footerText:'Nebenkosten Premium · '+x.released,
    brandLine:x.brandLine,pageWord:x.page,locale:lang==='en'?'en-GB':'de-DE'
  });
}
