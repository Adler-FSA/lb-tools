import {loadProject,saveProject} from './storage.js';
import {createRentalDocumentDraft,deleteRentalDocumentDraft,listRentalDocuments} from './rental-service.js';
import {escapeText,newId,safeLoadProject,showFlash,updateStoragePill} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';

const I18N={
  navHome:{de:'Meine Zentrale',en:'My dashboard'},navProperties:{de:'Immobilien',en:'Properties'},navRental:{de:'Mietservice',en:'Tenant service'},navCosts:{de:'Kosten & Abrechnung',en:'Costs & billing'},navChecks:{de:'Sicherheit & Checks',en:'Safety & checks'},navDocs:{de:'Dokumente & Hilfe',en:'Documents & help'},
  eyebrow:{de:'Baustein 5 · Mietservice',en:'Module 5 · Tenant service'},heroTitle:{de:'Dokumente vorbereiten, ohne etwas vorwegzunehmen.',en:'Prepare documents without jumping ahead.'},heroCopy:{de:'Mietvertrag, Hausordnung, Entsorgungsinfo, Übergabe und Serviceblatt werden als lokale Entwürfe vorbereitet. Eine Rechtsfreigabe oder PDF-Ausgabe erfolgt hier ausdrücklich noch nicht.',en:'Lease, house rules, waste information, handover record and service sheet are prepared as local drafts. No legal release or PDF output takes place here yet.'},back:{de:'← Zur Zentrale',en:'← Back to dashboard'},context:{de:'Arbeitskontext',en:'Working context'},chooseUnit:{de:'Einheit auswählen',en:'Choose unit'},chooseUnitCopy:{de:'Alle Entwürfe werden einer konkreten Einheit zugeordnet.',en:'Every draft is assigned to a specific unit.'},
  tool2:{de:'Werkzeug 2',en:'Tool 2'},leaseTitle:{de:'Mietvertragsassistent',en:'Lease assistant'},leaseCopy:{de:'Erfasst Eckdaten als Entwurf. Miethöhe, Befristung, Klauseln und örtliche Besonderheiten werden nicht automatisch rechtlich freigegeben.',en:'Captures key data as a draft. Rent level, fixed term, clauses and local specifics are not automatically approved as legally valid.'},tenancy:{de:'Vorhandenes Mietverhältnis',en:'Existing tenancy'},tenantLabel:{de:'Vertragspartei / Bezeichnung',en:'Contracting party / label'},startDate:{de:'Mietbeginn',en:'Tenancy start'},baseRent:{de:'Nettokaltmiete €',en:'Net base rent €'},costModel:{de:'Betriebskostenmodell',en:'Operating-cost model'},unresolved:{de:'Ungeklärt',en:'Unresolved'},advance:{de:'Vorauszahlung',en:'Advance payment'},flat:{de:'Pauschale',en:'Flat charge'},costAmount:{de:'Betriebskosten €',en:'Operating costs €'},deposit:{de:'Kaution €',en:'Deposit €'},depositHelp:{de:'Technischer Prüfhinweis bei mehr als drei Nettokaltmieten; keine Rechtsfreigabe.',en:'Technical review flag above three net base rents; no legal approval.'},notes:{de:'Notizen',en:'Notes'},saveDraft:{de:'Entwurf speichern',en:'Save draft'},
  tool3:{de:'Werkzeug 3',en:'Tool 3'},rulesTitle:{de:'Hausordnung',en:'House rules'},rulesCopy:{de:'Vertragliche Pflichten und organisatorische Hinweise werden bewusst getrennt gekennzeichnet.',en:'Contractual duties and organisational guidance are deliberately kept separate.'},ruleKind:{de:'Einordnung',en:'Classification'},organisational:{de:'Organisatorischer Hinweis',en:'Organisational guidance'},contractual:{de:'Vertraglicher Bestandteil – prüfen',en:'Contractual component – review'},rules:{de:'Regeln / Hinweise',en:'Rules / guidance'},
  tool4:{de:'Werkzeug 4',en:'Tool 4'},wasteTitle:{de:'Müll- und Entsorgungsinformation',en:'Waste and disposal information'},wasteCopy:{de:'Objektbezogene Hinweise; örtliche Abhol- und Trennregeln müssen vom Nutzer bestätigt werden.',en:'Property-specific guidance; local collection and sorting rules must be confirmed by the user.'},locations:{de:'Standorte / Sammelstellen',en:'Locations / collection points'},sorting:{de:'Trennhinweise',en:'Sorting guidance'},schedule:{de:'Abholung / Bereitstellung',en:'Collection / presentation'},localConfirmed:{de:'Örtliche Angaben wurden geprüft.',en:'Local information has been checked.'},
  tool5:{de:'Werkzeug 5',en:'Tool 5'},handoverTitle:{de:'Ein- und Auszugsprotokoll',en:'Move-in / move-out protocol'},handoverCopy:{de:'Zustand, Schlüssel, Zählerstände und Mängel werden als sachlicher Entwurf erfasst.',en:'Condition, keys, meter readings and defects are captured as a factual draft.'},kind:{de:'Vorgang',en:'Process'},moveIn:{de:'Einzug',en:'Move in'},moveOut:{de:'Auszug',en:'Move out'},date:{de:'Datum',en:'Date'},keys:{de:'Schlüssel',en:'Keys'},meters:{de:'Zählerstände',en:'Meter readings'},defects:{de:'Zustand / Mängel',en:'Condition / defects'},
  tool6:{de:'Werkzeug 6',en:'Tool 6'},serviceTitle:{de:'Mieter-Serviceblatt',en:'Tenant service sheet'},serviceCopy:{de:'Anlassbezogene Mitteilungen und zweckgebundene Abfragen – keine pauschale unbegrenzte Auskunftspflicht.',en:'Purpose-specific notices and requests – no blanket unlimited duty to provide information.'},purpose:{de:'Anlass / Zweck',en:'Reason / purpose'},subject:{de:'Betreff',en:'Subject'},message:{de:'Mitteilung',en:'Message'},requestedInfo:{de:'Erbetene Information – nur soweit zweckgebunden nötig',en:'Requested information – only where necessary for the stated purpose'},deadline:{de:'Frist / Rückmeldung bis',en:'Deadline / reply by'},
  boundary:{de:'Bausteingrenze',en:'Module boundary'},noPdfTitle:{de:'Noch keine PDF-Ausgabe',en:'No PDF output yet'},noPdfCopy:{de:'Die Entwürfe werden lokal gespeichert. Vorschau, Dokumentvorlagen, Freigabe, PDF-Zentrale und Archiv folgen erst in Baustein 6.',en:'Drafts are stored locally. Preview, document templates, release, PDF centre and archive follow only in Module 6.'},draftsTitle:{de:'Gespeicherte Entwürfe',en:'Saved drafts'},draftsCopy:{de:'Nur Entwürfe der aktuell gewählten Einheit.',en:'Only drafts for the currently selected unit.'},legalNote:{de:'Mietvertragsentwürfe bleiben fachlich zu prüfen. § 551 BGB begrenzt eine vereinbarte Mietsicherheit bei Wohnraum grundsätzlich auf drei Nettokaltmieten; der Assistent setzt deshalb nur einen Prüfhinweis und gibt keinen Vertrag rechtlich frei.',en:'Lease drafts still require professional review. Section 551 BGB generally limits agreed residential tenancy security to three net base rents; the assistant therefore only creates a review flag and does not legally approve a contract.'},footer:{de:'Nebenkosten Premium · Lokale Speicherung · Keine individuelle Rechtsberatung.',en:'Nebenkosten Premium · Local storage · No individual legal advice.'},
  title:{de:'Mietservice',en:'Tenant service'},saved:{de:'Entwurf wurde lokal gespeichert.',en:'Draft saved locally.'},deleted:{de:'Entwurf wurde gelöscht.',en:'Draft deleted.'},noProject:{de:'Bitte zuerst eine Immobilie und mindestens eine Einheit anlegen.',en:'Please create a property and at least one unit first.'},noDrafts:{de:'Für diese Einheit gibt es noch keine Mietservice-Entwürfe.',en:'There are no tenant-service drafts for this unit yet.'},draft:{de:'Entwurf',en:'Draft'},delete:{de:'Entwurf löschen',en:'Delete draft'},review:{de:'Prüfhinweis',en:'Review note'},depositFlag:{de:'Kaution liegt über drei Nettokaltmieten und muss vor einer späteren Freigabe korrigiert oder fachlich geprüft werden.',en:'The deposit exceeds three net base rents and must be corrected or professionally reviewed before any later release.'}
};
initI18n(I18N);

let project=null,selectedUnitId=null;
const typeLabels={
 lease_draft:{de:'Mietvertragsentwurf',en:'Lease draft'},
 house_rules:{de:'Hausordnung',en:'House rules'},
 waste_info:{de:'Müll- und Entsorgungsinformation',en:'Waste and disposal information'},
 handover_protocol:{de:'Ein-/Auszugsprotokoll',en:'Move-in / move-out protocol'},
 tenant_service_sheet:{de:'Mieter-Serviceblatt',en:'Tenant service sheet'}
};
const labelFor=type=>typeLabels[type]?.[getLanguage()]||type;
const euroToCents=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)&&n>=0?Math.round(n*100):null;};
function reload(){
  const s=safeLoadProject();project=s.project;updateStoragePill(project,s.error);
  if(s.error){showFlash(s.error.message,'error');return false;}return true;
}
function selectedUnit(){return project?.units?.find(x=>x.id===selectedUnitId)||null;}
function renderContext(){
  const select=document.querySelector('[data-unit-select]');
  if(!project?.units?.length){select.innerHTML='<option value="">—</option>';select.disabled=true;document.querySelectorAll('[data-doc-form] button[type="submit"]').forEach(b=>b.disabled=true);showFlash(I18N.noProject[getLanguage()],'error');return;}
  const options=project.units.map(u=>{const p=project.properties.find(x=>x.id===u.propertyId);return '<option value="'+escapeText(u.id)+'">'+escapeText((p?.label||'Immobilie')+' · '+(u.label||u.id))+'</option>';}).join('');
  select.innerHTML=options;select.disabled=false;
  if(!selectedUnitId||!project.units.some(x=>x.id===selectedUnitId))selectedUnitId=project.units[0].id;
  select.value=selectedUnitId;
  document.querySelectorAll('[data-doc-form] button[type="submit"]').forEach(b=>b.disabled=false);
  renderTenancies();renderDrafts();
}
function renderTenancies(){
  const host=document.querySelector('[name="tenancyId"]');if(!host)return;
  const items=project.tenancies.filter(x=>x.unitId===selectedUnitId);
  host.innerHTML='<option value="">Nicht zuordnen / not assigned</option>'+items.map(x=>'<option value="'+escapeText(x.id)+'">'+escapeText(x.partyLabel||x.id)+'</option>').join('');
}
function renderDrafts(){
  const host=document.querySelector('[data-drafts]');if(!host||!project||!selectedUnitId)return;
  const docs=listRentalDocuments(project,{unitId:selectedUnitId});
  if(!docs.length){host.innerHTML='<div class="empty-state"><p>'+escapeText(I18N.noDrafts[getLanguage()])+'</p></div>';return;}
  host.innerHTML=docs.slice().reverse().map(doc=>{
    const flag=doc.reviewFlags?.includes('deposit_above_three_net_rents')?'<div class="notice" style="margin-top:10px"><strong>'+escapeText(I18N.review[getLanguage()])+':</strong> '+escapeText(I18N.depositFlag[getLanguage()])+'</div>':'';
    return '<article class="card"><div class="property-top"><div><div class="property-name">'+escapeText(labelFor(doc.type))+'</div><div class="property-address">'+escapeText(doc.title||'')+' · '+escapeText(doc.createdOn||'')+'</div></div><span class="badge">'+escapeText(I18N.draft[getLanguage()])+'</span></div>'+flag+'<div class="form-actions"><button class="btn btn-danger" type="button" data-delete-doc="'+escapeText(doc.id)+'">'+escapeText(I18N.delete[getLanguage()])+'</button></div></article>';
  }).join('');
  host.querySelectorAll('[data-delete-doc]').forEach(btn=>btn.addEventListener('click',()=>removeDraft(btn.dataset.deleteDoc)));
}
function fieldsFrom(form,type){
  const fd=new FormData(form), fields={};
  for(const [k,v] of fd.entries()) if(k!=='tenancyId') fields[k]=typeof v==='string'?v.trim():v;
  for(const key of ['baseRentCents','operatingCostCents','depositCents']){
    const input=form.querySelector('[name="'+key+'"]');if(input){const c=euroToCents(input.value);if(c===null)throw new Error('Bitte Geldbeträge als positive Zahl eingeben.');fields[key]=c;}
  }
  form.querySelectorAll('input[type="checkbox"]').forEach(x=>fields[x.name]=x.checked);
  return fields;
}
function submit(form){
  if(!reload()||!project)return;
  const unit=selectedUnit();if(!unit){showFlash(I18N.noProject[getLanguage()],'error');return;}
  const type=form.dataset.docForm;
  try{
    const fields=fieldsFrom(form,type);
    const tenancyId=type==='lease_draft'?String(new FormData(form).get('tenancyId')||''):null;
    const r=createRentalDocumentDraft(project,{documentId:newId('document'),type,propertyId:unit.propertyId,unitId:unit.id,tenancyId:tenancyId||null,title:labelFor(type),fields,createdOn:new Date().toISOString().slice(0,10)});
    saveProject(r.project);project=r.project;form.reset();renderTenancies();renderDrafts();
    showFlash(I18N.saved[getLanguage()]+(r.reviewFlags.length?' '+I18N.depositFlag[getLanguage()]:''),r.reviewFlags.length?'error':'success');
  }catch(e){reload();showFlash(e.message||'Entwurf konnte nicht gespeichert werden.','error');renderContext();}
}
function removeDraft(id){
  if(!reload()||!project)return;
  try{const r=deleteRentalDocumentDraft(project,{documentId:id});saveProject(r.project);project=r.project;renderDrafts();showFlash(I18N.deleted[getLanguage()]);}
  catch(e){reload();showFlash(e.message||'Entwurf konnte nicht gelöscht werden.','error');renderContext();}
}
document.querySelector('[data-unit-select]')?.addEventListener('change',e=>{selectedUnitId=e.target.value;renderTenancies();renderDrafts();});
document.querySelectorAll('[data-doc-form]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();submit(form);}));
window.addEventListener('app-language-change',()=>{renderContext();});
if(reload())renderContext();
