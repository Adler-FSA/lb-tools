import {saveProject} from './storage.js';
import {escapeText,newId,safeLoadProject,showFlash,updateStoragePill} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';
import {
  prepareReviewDocument,releaseReviewDocument,deleteReviewDocument,
  listDocumentArchive,RELEASE_CONFIRMATION
} from './document-workflow.js';
import {
  serviceDraftSnapshot,ownerAnnualSnapshot,tenantStatementSnapshot,ownerSafetySnapshot,lettingChecklistSnapshot
} from './document-sources.js';
import {generateReleasedDocumentPdf} from './document-pdf.js';
import {documentPreviewUrl} from './document-template-routes.js';

const I18N={
 navHome:{de:'Meine Zentrale',en:'My dashboard'},navProperties:{de:'Immobilien',en:'Properties'},navRental:{de:'Mietservice',en:'Tenant service'},navCosts:{de:'Kosten & Abrechnung',en:'Costs & billing'},navChecks:{de:'Sicherheit & Checks',en:'Safety & checks'},navDocs:{de:'Dokumente & Hilfe',en:'Documents & help'},
 eyebrow:{de:'Akademie-PDF-Zentrale',en:'Academy PDF centre'},heroTitle:{de:'Erst Datenstand freigeben. Dann genau daraus die PDF erzeugen.',en:'Release the data state first. Then create the PDF from exactly that state.'},heroCopy:{de:'Prüffassung, bewusste Freigabe und PDF-Ausgabe sind getrennte Schritte. Eine fertige PDF wird nur vorübergehend im geöffneten Browser gehalten und unverändert an Speichern oder Teilen übergeben.',en:'Review version, deliberate release and PDF output are separate steps. A finished PDF is held only temporarily in the open browser and is passed unchanged to save or share.'},
 archive:{de:'Archiv öffnen',en:'Open archive'},settings:{de:'Sicherung & Jahreswechsel',en:'Backup & year change'},help:{de:'Hilfe',en:'Help'},showLast:{de:'Letzte fertige PDF erneut anzeigen',en:'Show last finished PDF again'},master:{de:'PDF-Ausgabe',en:'PDF output'},masterTitle:{de:'PDF wird lokal erstellt',en:'PDF is created locally'},masterCopy:{de:'Die fertige Datei bleibt auf Deinem Gerät und kann anschließend gespeichert oder geteilt werden.',en:'The finished file stays on your device and can then be saved or shared.'},status:{de:'Status',en:'Status'},snapshot:{de:'Snapshot-basiert',en:'Snapshot based'},
 source:{de:'1 · Quelle',en:'1 · Source'},sourceTitle:{de:'Dokument vorbereiten',en:'Prepare document'},sourceCopy:{de:'Die Auswahl liest nur den aktuellen Projektstand. Erst die Prüffassung legt einen dokumentierten Snapshot an.',en:'The selection only reads the current project state. The review version is the first point at which a documented snapshot is created.'},
 property:{de:'Immobilie',en:'Property'},period:{de:'Abrechnungsperiode',en:'Accounting period'},tenancy:{de:'Mietverhältnis',en:'Tenancy'},process:{de:'Vermietungsvorgang',en:'Letting process'},prepare:{de:'Prüffassung erstellen',en:'Create review version'},
 ownerDoc:{de:'Eigentümer',en:'Owner'},ownerTitle:{de:'Jahresübersicht',en:'Annual summary'},ownerCopy:{de:'Gesamtkosten, Einordnung und getrennte Versorgerzahlungen.',en:'Total costs, classification and separate provider payments.'},
 tenantDoc:{de:'Vermieter',en:'Landlord'},tenantTitle:{de:'Betriebskostenabrechnung',en:'Operating cost statement'},tenantCopy:{de:'Individuelle Standardabrechnung. Wärme-/CO₂-Sonderfälle werden sicher gesperrt.',en:'Individual standard statement. Thermal/CO₂ special cases are safely blocked.'},
 safetyDoc:{de:'Checks',en:'Checks'},safetyTitle:{de:'Eigentümer-Übersicht',en:'Owner overview'},safetyCopy:{de:'Gespeicherte Pflichten-, Vertrags- und Empfehlungschecks.',en:'Saved obligation, contract and recommendation checks.'},
 lettingDoc:{de:'Vermietung',en:'Letting'},lettingTitle:{de:'Vermietungs-Checkliste',en:'Letting checklist'},lettingCopy:{de:'Nur Prozessstatus; keine Bewerberantworten, Nachweise oder Scores.',en:'Process status only; no applicant answers, evidence or scores.'},
 serviceSource:{de:'Mietservice',en:'Tenant service'},serviceTitle:{de:'Gespeicherte Entwürfe übernehmen',en:'Use saved drafts'},serviceCopy:{de:'Der gespeicherte Mietservice-Entwurf bleibt unverändert; die PDF-Zentrale erzeugt daraus eine eigene Prüffassung.',en:'The saved tenant-service draft remains unchanged; the PDF centre creates a separate review version from it.'},
 reviewStep:{de:'2 · Prüfung',en:'2 · Review'},reviewTitle:{de:'Prüffassungen',en:'Review versions'},reviewCopy:{de:'Freigabe fixiert ausschließlich den angezeigten Datenstand. Sie ist keine automatische Rechtsprüfung.',en:'Release fixes only the displayed data state. It is not an automatic legal review.'},
 releaseStep:{de:'3 · Ausgabe',en:'3 · Output'},releaseTitle:{de:'Freigegebene Fassungen',en:'Released versions'},releaseCopy:{de:'Die PDF wird ausschließlich aus dem unveränderlichen Snapshot dieser Version erstellt.',en:'The PDF is created only from the immutable snapshot of this version.'},
 boundary:{de:'PDF-Erstellung bedeutet nicht „versendet“. Eine tatsächliche Übergabe wird separat im Archiv dokumentiert. PDFs selbst werden nicht dauerhaft im Browserarchiv oder in der JSON-Sicherung gespeichert.',en:'Creating a PDF does not mean “sent”. Actual delivery is recorded separately in the archive. PDF files themselves are not permanently stored in the browser archive or JSON backup.'},
 footer:{de:'Nebenkosten Premium · Lokale Dokumenterstellung · Keine individuelle Rechts-, Steuer- oder Versicherungsberatung.',en:'Nebenkosten Premium · Local document creation · No individual legal, tax or insurance advice.'},
 noProject:{de:'Bitte zuerst eine Immobilie anlegen.',en:'Please create a property first.'},none:{de:'Nicht vorhanden',en:'None'},saved:{de:'Prüffassung wurde gespeichert.',en:'Review version saved.'},released:{de:'Datenstand wurde als eigene Fassung freigegeben.',en:'Data state released as a separate version.'},deleted:{de:'Prüffassung wurde gelöscht.',en:'Review version deleted.'},pdfReady:{de:'PDF wurde aus der freigegebenen Fassung erstellt.',en:'PDF created from the released version.'},
 noService:{de:'Keine offenen Mietservice-Entwürfe vorhanden.',en:'No open tenant-service drafts available.'},noReviews:{de:'Noch keine Prüffassung vorhanden.',en:'No review version yet.'},noReleased:{de:'Noch keine freigegebene Fassung vorhanden.',en:'No released version yet.'},
 version:{de:'Version',en:'Version'},created:{de:'Erstellt',en:'Created'},releasedOn:{de:'Freigegeben',en:'Released'},sourceLabel:{de:'Quelle',en:'Source'},confirm:{de:'Ich habe diesen Datenstand geprüft. Die Freigabe fixiert nur diese Fassung und ist keine automatische Rechtsprüfung.',en:'I have reviewed this data state. Release fixes only this version and is not an automatic legal review.'},
 releaseButton:{de:'Datenstand freigeben',en:'Release data state'},deleteReview:{de:'Prüffassung löschen',en:'Delete review version'},preview:{de:'Vorschau öffnen',en:'Open preview'},createPdf:{de:'PDF erstellen',en:'Create PDF'},servicePrepare:{de:'Als Prüffassung übernehmen',en:'Create review version'},legalFlag:{de:'Fach-/Rechtsprüfung vor Verwendung beachten.',en:'Professional/legal review should be considered before use.'}
};
initI18n(I18N);

let project=null,propertyId=null,periodId=null,tenancyId=null,processId=null;

function lang(){return getLanguage();}
function today(){return new Date().toISOString().slice(0,10);}
function reload(){
 const state=safeLoadProject();project=state.project;updateStoragePill(project,state.error);
 if(state.error){showFlash(state.error.message||'Speicherfehler','error');return false;}return true;
}
function properties(){return project?.properties??[];}
function periods(){return (project?.accountingPeriods??[]).filter(x=>x.propertyId===propertyId);}
function tenancies(){
 const unitIds=new Set((project?.units??[]).filter(x=>x.propertyId===propertyId).map(x=>x.id));
 return (project?.tenancies??[]).filter(x=>unitIds.has(x.unitId));
}
function processes(){return (project?.checkItems??[]).filter(x=>x.type==='letting_process'&&x.propertyId===propertyId);}
function option(value,label){return '<option value="'+escapeText(value)+'">'+escapeText(label)+'</option>';}
function setOptions(node,items,current,emptyLabel){
 if(!node)return null;
 node.innerHTML=items.length?items.map(x=>option(x.value,x.label)).join(''):option('',emptyLabel);
 node.disabled=!items.length;
 const next=items.some(x=>x.value===current)?current:(items[0]?.value||'');
 node.value=next;return next;
}
function renderContext(){
 const props=properties().map(x=>({value:x.id,label:x.label||x.id}));
 propertyId=setOptions(document.querySelector('[data-property-select]'),props,propertyId,I18N.none[lang()]);
 periodId=setOptions(document.querySelector('[data-period-select]'),periods().map(x=>({value:x.id,label:(x.startDate||'')+' – '+(x.endDate||'')})),periodId,I18N.none[lang()]);
 tenancyId=setOptions(document.querySelector('[data-tenancy-select]'),tenancies().map(x=>({value:x.id,label:x.partyLabel||x.id})),tenancyId,I18N.none[lang()]);
 processId=setOptions(document.querySelector('[data-process-select]'),processes().map(x=>({value:x.id,label:x.referenceLabel||x.id})),processId,I18N.none[lang()]);
 document.querySelector('[data-create-owner]').disabled=!propertyId||!periodId;
 document.querySelector('[data-create-tenant]').disabled=!periodId||!tenancyId;
 document.querySelector('[data-create-safety]').disabled=!propertyId;
 document.querySelector('[data-create-letting]').disabled=!processId;
}
function typeLabel(type){
 const de={owner_annual_summary:'Eigentümer-Jahresübersicht',tenant_operating_cost_statement:'Betriebskostenabrechnung',lease_draft:'Mietvertragsentwurf',house_rules:'Hausordnung',waste_info:'Müll- und Entsorgungsinformation',handover_protocol:'Ein-/Auszugsprotokoll',tenant_service_sheet:'Mieter-Serviceblatt',owner_safety_overview:'Eigentümer-Sicherheitsübersicht',letting_checklist:'Vermietungs-Checkliste'};
 const en={owner_annual_summary:'Owner annual summary',tenant_operating_cost_statement:'Operating cost statement',lease_draft:'Lease draft',house_rules:'House rules',waste_info:'Waste and disposal information',handover_protocol:'Move-in / move-out protocol',tenant_service_sheet:'Tenant service sheet',owner_safety_overview:'Owner safety overview',letting_checklist:'Letting checklist'};
 return (lang()==='en'?en:de)[type]||type;
}
function savePrepared(source,legalReviewRequired=false){
 try{
  const r=prepareReviewDocument(project,{
   documentId:newId('document'),documentType:source.documentType,title:source.title,createdOn:today(),
   snapshot:source.snapshot,propertyId:source.propertyId||null,tenancyId:source.tenancyId||null,
   sourceDocumentId:source.sourceDocumentId||null,processId:source.processId||null,legalReviewRequired
  });
  saveProject(r.project);project=r.project;showFlash(I18N.saved[lang()]);renderAll();
 }catch(e){reload();showFlash(e.message||String(e),'error');renderAll();}
}
function prepareOwner(){try{savePrepared(ownerAnnualSnapshot(project,{propertyId,periodId}),false);}catch(e){showFlash(e.message||String(e),'error');}}
function prepareTenant(){try{savePrepared(tenantStatementSnapshot(project,{periodId,tenancyId}),true);}catch(e){showFlash(e.message||String(e),'error');}}
function prepareSafety(){try{savePrepared(ownerSafetySnapshot(project,{propertyId}),false);}catch(e){showFlash(e.message||String(e),'error');}}
function prepareLetting(){try{savePrepared(lettingChecklistSnapshot(project,{processId}),true);}catch(e){showFlash(e.message||String(e),'error');}}

function renderServiceDrafts(){
 const host=document.querySelector('[data-service-drafts]');if(!host)return;
 const docs=(project?.documents??[]).filter(x=>x.source==='baustein5-mietservice-v1'&&x.status==='draft'&&(!propertyId||x.propertyId===propertyId));
 if(!docs.length){host.innerHTML='<div class="empty-state"><p>'+escapeText(I18N.noService[lang()])+'</p></div>';return;}
 host.innerHTML=docs.map(doc=>'<article class="card"><div class="property-top"><div><div class="property-name">'+escapeText(typeLabel(doc.type))+'</div><div class="property-address">'+escapeText(doc.title||'')+' · '+escapeText(doc.createdOn||'')+'</div></div><span class="badge">Baustein 5</span></div><div class="form-actions"><button class="btn btn-primary" type="button" data-service-source="'+escapeText(doc.id)+'">'+escapeText(I18N.servicePrepare[lang()])+'</button></div></article>').join('');
 host.querySelectorAll('[data-service-source]').forEach(btn=>btn.addEventListener('click',()=>{try{savePrepared(serviceDraftSnapshot(project,btn.dataset.serviceSource),true);}catch(e){showFlash(e.message||String(e),'error');}}));
}
function reviewDocs(){return listDocumentArchive(project).filter(x=>x.status==='review');}
function releasedDocs(){return listDocumentArchive(project).filter(x=>x.status==='released');}
function renderReviews(){
 const host=document.querySelector('[data-review-docs]');if(!host)return;const docs=reviewDocs();
 if(!docs.length){host.innerHTML='<div class="empty-state"><p>'+escapeText(I18N.noReviews[lang()])+'</p></div>';return;}
 host.innerHTML=docs.map(doc=>'<article class="card" data-review-card="'+escapeText(doc.id)+'"><div class="property-top"><div><div class="property-name">'+escapeText(typeLabel(doc.documentType))+'</div><div class="property-address">'+escapeText(doc.title||'')+' · '+escapeText(I18N.version[lang()])+' '+doc.version+' · '+escapeText(I18N.created[lang()])+' '+escapeText(doc.createdOn||'')+'</div></div><span class="badge">'+escapeText(doc.snapshotHash||'')+'</span></div>'+(doc.legalReviewRequired?'<div class="notice" style="margin-top:12px">'+escapeText(I18N.legalFlag[lang()])+'</div>':'')+'<label style="display:block;margin-top:14px"><input style="width:auto;min-height:auto;margin-right:8px" type="checkbox" data-release-confirm> '+escapeText(I18N.confirm[lang()])+'</label><div class="form-actions"><a class="btn btn-secondary" target="_blank" rel="noopener" href="'+escapeText(documentPreviewUrl(doc))+'">'+escapeText(I18N.preview[lang()])+'</a><button class="btn btn-primary" type="button" data-release-doc="'+escapeText(doc.id)+'" disabled>'+escapeText(I18N.releaseButton[lang()])+'</button><button class="btn btn-danger" type="button" data-delete-review="'+escapeText(doc.id)+'">'+escapeText(I18N.deleteReview[lang()])+'</button></div></article>').join('');
 host.querySelectorAll('[data-review-card]').forEach(card=>{
  const box=card.querySelector('[data-release-confirm]'),btn=card.querySelector('[data-release-doc]');
  box.addEventListener('change',()=>btn.disabled=!box.checked);
 });
 host.querySelectorAll('[data-release-doc]').forEach(btn=>btn.addEventListener('click',()=>release(btn.dataset.releaseDoc)));
 host.querySelectorAll('[data-delete-review]').forEach(btn=>btn.addEventListener('click',()=>removeReview(btn.dataset.deleteReview)));
}
function release(id){
 if(!reload()||!project)return;
 try{
  const r=releaseReviewDocument(project,{documentId:id,releasedOn:today(),confirmation:RELEASE_CONFIRMATION});
  saveProject(r.project);project=r.project;showFlash(I18N.released[lang()]);renderAll();
 }catch(e){reload();showFlash(e.message||String(e),'error');renderAll();}
}
function removeReview(id){
 if(!reload()||!project)return;
 try{const r=deleteReviewDocument(project,{documentId:id});saveProject(r.project);project=r.project;showFlash(I18N.deleted[lang()]);renderAll();}
 catch(e){reload();showFlash(e.message||String(e),'error');renderAll();}
}
async function makePdf(id){
 if(!reload()||!project)return;const doc=project.documents.find(x=>x.id===id);
 try{
  const api=window.AkademiePdfUebergabe;
  if(typeof api?.setDocument!=='function')throw new Error('Akademie-PDF-Zentrale ist nicht verfügbar.');
  const out=await generateReleasedDocumentPdf(doc,{lang:lang()});
  api.setDocument({blob:out.blob,filename:out.filename,pages:out.pages,origin:'Nebenkosten Premium · '+(doc.title||typeLabel(doc.documentType))+' · Version '+doc.version});
  const again=document.querySelector('[data-show-last-pdf]');again.disabled=false;
  showFlash(I18N.pdfReady[lang()]+' '+out.pages+' A4.');
 }catch(e){showFlash(e.message||String(e),'error');}
}
function renderReleased(){
 const host=document.querySelector('[data-released-docs]');if(!host)return;const docs=releasedDocs();
 if(!docs.length){host.innerHTML='<div class="empty-state"><p>'+escapeText(I18N.noReleased[lang()])+'</p></div>';return;}
 host.innerHTML=docs.map(doc=>'<article class="card"><div class="property-top"><div><div class="property-name">'+escapeText(typeLabel(doc.documentType))+'</div><div class="property-address">'+escapeText(doc.title||'')+' · '+escapeText(I18N.version[lang()])+' '+doc.version+' · '+escapeText(I18N.releasedOn[lang()])+' '+escapeText(doc.releasedOn||'')+'</div></div><span class="badge">Snapshot</span></div><div class="form-actions"><a class="btn btn-secondary" target="_blank" rel="noopener" href="'+escapeText(documentPreviewUrl(doc))+'">'+escapeText(I18N.preview[lang()])+'</a><button class="btn btn-primary" type="button" data-pdf-doc="'+escapeText(doc.id)+'">'+escapeText(I18N.createPdf[lang()])+'</button></div></article>').join('');
 host.querySelectorAll('[data-pdf-doc]').forEach(btn=>btn.addEventListener('click',()=>makePdf(btn.dataset.pdfDoc)));
}
function renderAll(){renderContext();renderServiceDrafts();renderReviews();renderReleased();updateStoragePill(project,null);}

document.querySelector('[data-property-select]')?.addEventListener('change',e=>{propertyId=e.target.value;periodId=null;tenancyId=null;processId=null;renderAll();});
document.querySelector('[data-period-select]')?.addEventListener('change',e=>{periodId=e.target.value;});
document.querySelector('[data-tenancy-select]')?.addEventListener('change',e=>{tenancyId=e.target.value;});
document.querySelector('[data-process-select]')?.addEventListener('change',e=>{processId=e.target.value;});
document.querySelector('[data-create-owner]')?.addEventListener('click',prepareOwner);
document.querySelector('[data-create-tenant]')?.addEventListener('click',prepareTenant);
document.querySelector('[data-create-safety]')?.addEventListener('click',prepareSafety);
document.querySelector('[data-create-letting]')?.addEventListener('click',prepareLetting);
document.querySelector('[data-show-last-pdf]')?.addEventListener('click',()=>{try{window.AkademiePdfUebergabe?.show();}catch(e){showFlash(e.message||String(e),'error');}});
window.addEventListener('app-language-change',()=>{if(project)renderAll();});
if(reload()){
 if(!project?.properties?.length)showFlash(I18N.noProject[lang()],'error');
 renderAll();
}
