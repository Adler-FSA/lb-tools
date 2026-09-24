import {loadProject} from './storage.js';
import {escapeText} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';

const I18N={
 back:{de:'← PDF-Zentrale',en:'← PDF centre'},archive:{de:'Archiv',en:'Archive'},brandLine:{de:'Akademie Immobilien- & Mietservice',en:'Academy Property & Tenant Service'},
 review:{de:'Prüffassung',en:'Review version'},released:{de:'Freigegebene Fassung',en:'Released version'},
 version:{de:'Version',en:'Version'},created:{de:'Erstellt',en:'Created'},releasedOn:{de:'Freigegeben',en:'Released'},
 property:{de:'Immobilie',en:'Property'},unit:{de:'Einheit',en:'Unit'},tenancy:{de:'Mietverhältnis',en:'Tenancy'},period:{de:'Abrechnungszeitraum',en:'Accounting period'},
 details:{de:'Dokumentdaten',en:'Document data'},costs:{de:'Kostenübersicht',en:'Cost overview'},checks:{de:'Prüfpunkte',en:'Review items'},
 totalCosts:{de:'Gesamtkosten',en:'Total costs'},ownerCosts:{de:'Eigentümeranteil',en:'Owner share'},tenantTotal:{de:'Mieteranteile gesamt',en:'Total tenant shares'},consumption:{de:'Dokumentierter Verbrauch',en:'Documented consumption'},yearComparison:{de:'Jahresvergleich',en:'Year comparison'},allocatable:{de:'Als umlagefähig eingeordnet',en:'Classified as allocatable'},unresolved:{de:'Ungeklärt',en:'Unresolved'},providerNet:{de:'Netto an Versorger gezahlt',en:'Net paid to providers'},
 category:{de:'Kostenart',en:'Cost category'},amount:{de:'Betrag',en:'Amount'},method:{de:'Schlüssel',en:'Allocation key'},tenantShare:{de:'Mieteranteil',en:'Tenant share'},advances:{de:'Berücksichtigte Zahlungen',en:'Recorded advance payments'},result:{de:'Ergebnis',en:'Result'},credit:{de:'Guthaben',en:'Credit'},additional:{de:'Nachzahlung',en:'Additional payment'},
 topic:{de:'Prüfthema',en:'Review item'},classification:{de:'Einordnung',en:'Classification'},status:{de:'Status',en:'Status'},due:{de:'Wiedervorlage',en:'Follow-up'},note:{de:'Notiz',en:'Note'},
 noData:{de:'Keine weiteren Angaben gespeichert.',en:'No further information stored.'},snapshotNote:{de:'Diese Vorschau liest ausschließlich den gespeicherten Dokument-Snapshot. Änderungen im Projekt verändern diese Fassung nicht.',en:'This preview reads only the stored document snapshot. Changes in the project do not alter this version.'},
 legalNote:{de:'Die Dokumentfreigabe fixiert den Datenstand und stellt keine automatische Rechtsprüfung dar.',en:'Document release fixes the data state and does not constitute an automatic legal review.'},
 applicantNote:{de:'Diese Checkliste enthält keine Bewerberantworten, Nachweisdateien, Rankings, Scores oder automatische Mieterauswahl.',en:'This checklist contains no applicant answers, evidence files, rankings, scores or automatic tenant selection.'},
 errorTitle:{de:'Dokumentvorschau nicht verfügbar',en:'Document preview unavailable'}
};
initI18n(I18N);

const typeNames={
 de:{owner_annual_summary:'Eigentümer-Jahresübersicht',tenant_operating_cost_statement:'Betriebskostenabrechnung',lease_draft:'Mietvertragsentwurf',house_rules:'Hausordnung',waste_info:'Müll- und Entsorgungsinformation',handover_protocol:'Ein-/Auszugsprotokoll',tenant_service_sheet:'Mieter-Serviceblatt',owner_safety_overview:'Eigentümer-Sicherheits- und Pflichtenübersicht',letting_checklist:'Vermietungs-Checkliste'},
 en:{owner_annual_summary:'Owner annual summary',tenant_operating_cost_statement:'Operating cost statement',lease_draft:'Lease draft',house_rules:'House rules',waste_info:'Waste and disposal information',handover_protocol:'Move-in / move-out protocol',tenant_service_sheet:'Tenant service sheet',owner_safety_overview:'Owner safety and obligations overview',letting_checklist:'Letting checklist'}
};
const fieldLabels={
 de:{tenantLabel:'Vertragspartei / Bezeichnung',startDate:'Mietbeginn',baseRentCents:'Nettokaltmiete',operatingCostsModel:'Betriebskostenmodell',operatingCostCents:'Betriebskosten',depositCents:'Kaution',notes:'Notizen',ruleKind:'Einordnung',rules:'Regeln / Hinweise',locations:'Standorte / Sammelstellen',sorting:'Trennhinweise',schedule:'Abholung / Bereitstellung',localDataConfirmed:'Örtliche Angaben geprüft',kind:'Vorgang',date:'Datum',keys:'Schlüssel',meters:'Zählerstände',defects:'Zustand / Mängel',purpose:'Anlass / Zweck',subject:'Betreff',message:'Mitteilung',requestedInfo:'Erbetene Information',deadline:'Frist / Rückmeldung bis'},
 en:{tenantLabel:'Contracting party / label',startDate:'Tenancy start',baseRentCents:'Net base rent',operatingCostsModel:'Operating-cost model',operatingCostCents:'Operating costs',depositCents:'Deposit',notes:'Notes',ruleKind:'Classification',rules:'Rules / guidance',locations:'Locations / collection points',sorting:'Sorting guidance',schedule:'Collection / presentation',localDataConfirmed:'Local information checked',kind:'Process',date:'Date',keys:'Keys',meters:'Meter readings',defects:'Condition / defects',purpose:'Reason / purpose',subject:'Subject',message:'Message',requestedInfo:'Requested information',deadline:'Deadline / reply by'}
};

const h=v=>escapeText(v??'');
const lang=()=>getLanguage();
const date=v=>{if(!v)return'–';try{return new Intl.DateTimeFormat(lang()==='en'?'en-GB':'de-DE').format(new Date(v+'T00:00:00'));}catch{return String(v);}};
const money=v=>new Intl.NumberFormat(lang()==='en'?'en-GB':'de-DE',{style:'currency',currency:'EUR'}).format((Number.isSafeInteger(v)?v:0)/100);
const address=p=>{const a=p?.address||{};return [[a.street,a.houseNumber].filter(Boolean).join(' '),[a.postalCode,a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')||'–';};
const category=v=>({property_tax:{de:'Grundsteuer',en:'Property tax'},building_insurance:{de:'Gebäudeversicherung',en:'Building insurance'},waste:{de:'Müll / Entsorgung',en:'Waste'},common_electricity:{de:'Allgemeinstrom',en:'Common electricity'},cold_water:{de:'Kaltwasser',en:'Cold water'},repair:{de:'Reparatur / Instandhaltung',en:'Repair / maintenance'},other:{de:'Sonstige Kosten',en:'Other'}}[v]?.[lang()]||v||'–');
const method=v=>({area:{de:'Fläche',en:'Area'},consumption:{de:'Verbrauch',en:'Consumption'},direct:{de:'Direkt',en:'Direct'},owner_only:{de:'Nur Eigentümer',en:'Owner only'}}[v]?.[lang()]||v||'–');
const status=v=>({open:{de:'Offen',en:'Open'},review:{de:'Prüfen',en:'Review'},done:{de:'Erledigt',en:'Done'},not_applicable:{de:'Nicht zutreffend',en:'Not applicable'}}[v]?.[lang()]||v||'–');
const classification=v=>({unresolved:{de:'Ungeklärt',en:'Unresolved'},legal:{de:'Gesetzliche Pflicht',en:'Legal obligation'},contract:{de:'Vertragliche Verpflichtung',en:'Contractual obligation'},recommendation:{de:'Empfehlung',en:'Recommendation'},not_applicable:{de:'Nicht zutreffend',en:'Not applicable'}}[v]?.[lang()]||v||'–');

function field(label,value){return '<div class="doc-field"><span>'+h(label)+'</span><strong>'+h(value??'–')+'</strong></div>';}
function section(title,content){return '<section class="doc-section"><h2>'+h(title)+'</h2>'+content+'</section>';}
function table(headers,rows){return '<table class="doc-table"><thead><tr>'+headers.map(x=>'<th>'+h(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+h(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
function meta(doc,s){
 const x=I18N;
 const items=[field(x.version[lang()],doc.version),field(doc.status==='released'?x.releasedOn[lang()]:x.created[lang()],date(doc.status==='released'?doc.releasedOn:doc.createdOn))];
 if(s.property)items.push(field(x.property[lang()],(s.property.label||'–')+' · '+address(s.property)));
 if(s.unit)items.push(field(x.unit[lang()],[s.unit.label,s.unit.floor].filter(Boolean).join(' · ')||'–'));
 if(s.tenancy)items.push(field(x.tenancy[lang()],s.tenancy.partyLabel||s.tenancy.id||'–'));
 if(s.period)items.push(field(x.period[lang()],date(s.period.startDate)+' – '+date(s.period.endDate)));
 return '<div class="doc-grid">'+items.join('')+'</div>';
}
function payloadValue(k,v){
 if(['baseRentCents','operatingCostCents','depositCents'].includes(k))return money(v);
 if(['startDate','date','deadline'].includes(k))return date(v);
 if(typeof v==='boolean')return v?(lang()==='en'?'Yes':'Ja'):(lang()==='en'?'No':'Nein');
 if(k==='operatingCostsModel')return ({advance:{de:'Vorauszahlung',en:'Advance payment'},flat:{de:'Pauschale',en:'Flat charge'},unresolved:{de:'Ungeklärt',en:'Unresolved'}}[v]?.[lang()]||v);
 if(k==='kind')return ({move_in:{de:'Einzug',en:'Move in'},move_out:{de:'Auszug',en:'Move out'}}[v]?.[lang()]||v);
 if(k==='ruleKind')return ({organisational:{de:'Organisatorischer Hinweis',en:'Organisational guidance'},contractual:{de:'Vertraglicher Bestandteil – prüfen',en:'Contractual component – review'}}[v]?.[lang()]||v);
 return String(v??'');
}
function bodyFor(doc){
 const s=doc.snapshot||{},x=I18N;let out=section(x.details[lang()],meta(doc,s));
 if(s.kind==='service_document'){
   const labels=fieldLabels[lang()];
   const entries=Object.entries(s.payload||{}).filter(([,v])=>v!==''&&v!==null&&v!==undefined);
   out+=section(typeNames[lang()][doc.documentType]||doc.title,entries.length?'<div class="doc-grid">'+entries.map(([k,v])=>field(labels[k]||k,payloadValue(k,v))).join('')+'</div>':'<p>'+h(x.noData[lang()])+'</p>');
 }else if(s.kind==='owner_annual_summary'){
   const r=s.report||{},ready=s.readiness||{};
   out+=section(x.costs[lang()],'<div class="doc-grid">'+[
     field(x.totalCosts[lang()],money(r.actualCostsCents)),
     field(x.ownerCosts[lang()],money(Number.isSafeInteger(ready.ownerCostsCents)?ready.ownerCostsCents:r.ownerClassifiedCents)),
     field(x.tenantTotal[lang()],money(ready.tenantCostsCents)),
     field(x.allocatable[lang()],money(r.allocatableClassifiedCents)),field(x.unresolved[lang()],money(r.unresolvedCents)),
     field(x.providerNet[lang()],money(r.providerNetPaidCents))
   ].join('')+'</div>'+(r.byCategory?.length?table([x.category[lang()],x.amount[lang()]],r.byCategory.map(a=>[category(a.category),money(a.amountCents)])):''));
   if(s.consumption?.totals?.length)out+=section(x.consumption[lang()],table(
     [lang()==='en'?'Service':'Verbrauchsart',lang()==='en'?'Value':'Wert'],
     s.consumption.totals.map(a=>[a.service,String(a.value)+' '+(a.unit||'')])
   ));
   if(s.comparison?.length)out+=section(x.yearComparison[lang()],table(
     [lang()==='en'?'Year':'Jahr',x.totalCosts[lang()],x.providerNet[lang()]],
     s.comparison.map(y=>[y.yearLabel,money(y.actualCostsCents),money(y.providerNetPaidCents)])
   ));
 }else if(s.kind==='tenant_operating_cost_statement'){
   const t=s.tenant||{};
   out+=section(x.costs[lang()],table([x.category[lang()],x.amount[lang()],x.method[lang()],x.tenantShare[lang()]],(s.expenseLines||[]).map(a=>[category(a.category),money(a.amountCents),method(a.method),money(a.tenantShareCents)]))+
     '<div class="doc-grid" style="margin-top:12px">'+field(x.tenantShare[lang()],money(t.costsCents))+field(x.advances[lang()],money(t.advancesCents))+field(x.result[lang()],t.creditCents>0?x.credit[lang()]+': '+money(t.creditCents):x.additional[lang()]+': '+money(t.additionalCents||0))+'</div>');
 }else if(s.kind==='owner_safety_overview'){
   out+=section(x.checks[lang()],table([x.topic[lang()],x.classification[lang()],x.status[lang()],x.due[lang()]],(s.checks||[]).map(c=>[c.label?.[lang()]||c.checkKey,classification(c.classification),status(c.status),date(c.dueDate)]))+
     (s.checks||[]).filter(c=>c.note).map(c=>'<div class="doc-callout" style="margin-top:9px"><strong>'+h(c.label?.[lang()]||c.checkKey)+'</strong><br>'+h(c.note)+'</div>').join(''));
 }else if(s.kind==='letting_checklist'){
   out+=section(x.checks[lang()],table([x.topic[lang()],x.status[lang()]],(s.items||[]).map(i=>[i[lang()]||i.key,status(i.state)]))+'<div class="doc-callout" style="margin-top:12px">'+h(x.applicantNote[lang()])+'</div>');
 }
 out+='<div class="doc-callout" style="margin-top:24px">'+h(x.snapshotNote[lang()])+' '+h(x.legalNote[lang()])+'</div>';
 return out;
}
function render(){
 let project;
 try{project=loadProject();}catch(e){return error(e.message||String(e));}
 const id=new URLSearchParams(location.search).get('id'),expected=document.body.dataset.docType;
 const doc=project?.documents?.find(x=>x.id===id&&x.kind==='document_snapshot');
 if(!doc)return error(lang()==='en'?'Document version not found.':'Dokumentenfassung wurde nicht gefunden.');
 if(expected&&doc.documentType!==expected)return error(lang()==='en'?'Document type does not match this template.':'Dokumenttyp passt nicht zu dieser Vorlage.');
 const s=doc.snapshot||{},title=typeNames[lang()][doc.documentType]||doc.title||doc.documentType;
 document.title=title+' · Nebenkosten Premium';
 document.querySelector('[data-doc-toolbar-title]').textContent=title;
 document.querySelector('[data-doc-state]').textContent=doc.status==='released'?I18N.released[lang()]:I18N.review[lang()];
 document.querySelector('[data-doc-kicker]').textContent=(doc.status==='released'?I18N.released[lang()]:I18N.review[lang()])+' · '+I18N.version[lang()]+' '+doc.version;
 document.querySelector('[data-doc-title]').textContent=title;
 document.querySelector('[data-doc-subtitle]').textContent=[s.property?.label,s.unit?.label,s.tenancy?.partyLabel].filter(Boolean).join(' · ');
 document.querySelector('[data-doc-content]').innerHTML=bodyFor(doc);
 document.querySelector('[data-doc-footer]').textContent='Nebenkosten Premium · '+(doc.snapshotHash||'Snapshot');
}
function error(message){
 document.querySelector('.doc-wrap').innerHTML='<div class="doc-error"><strong>'+h(I18N.errorTitle[lang()])+'</strong><p>'+h(message)+'</p></div>';
}
window.addEventListener('app-language-change',render);
render();
