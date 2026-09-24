import {saveProject} from './storage.js';
import {escapeText,newId,safeLoadProject,showFlash,updateStoragePill} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';
import {listDocumentArchive,recordDocumentDelivery} from './document-workflow.js';
import {generateReleasedDocumentPdf} from './document-pdf.js';

const I18N={
 navHome:{de:'Meine Zentrale',en:'My dashboard'},navProperties:{de:'Immobilien',en:'Properties'},navRental:{de:'Mietservice',en:'Tenant service'},navCosts:{de:'Kosten & Abrechnung',en:'Costs & billing'},navChecks:{de:'Sicherheit & Checks',en:'Safety & checks'},navDocs:{de:'Dokumente & Hilfe',en:'Documents & help'},
 eyebrow:{de:'Baustein 6 · Dokumentarchiv',en:'Module 6 · Document archive'},title:{de:'Freigegebene Fassungen bleiben unverändert nachvollziehbar.',en:'Released versions remain traceable without being altered.'},copy:{de:'Version, Snapshot und Freigabedatum gehören zusammen. Eine tatsächliche Übergabe wird als eigener Vermerk gespeichert und verändert die freigegebene Fassung nicht.',en:'Version, snapshot and release date belong together. Actual delivery is stored as a separate record and does not alter the released version.'},
 pdfCenter:{de:'PDF-Zentrale',en:'PDF centre'},settings:{de:'Sicherung & Jahreswechsel',en:'Backup & year change'},archive:{de:'Archiv',en:'Archive'},released:{de:'freigegebene Fassungen',en:'released versions'},archiveCopy:{de:'PDF-Dateien selbst werden hier nicht dauerhaft gespeichert.',en:'PDF files themselves are not permanently stored here.'},delivery:{de:'Übergaben',en:'Deliveries'},
 property:{de:'Immobilie',en:'Property'},status:{de:'Status',en:'Status'},releasedOnly:{de:'Freigegeben',en:'Released'},allVersions:{de:'Alle Fassungen',en:'All versions'},notice:{de:'„PDF erneut erstellen“ erzeugt die Datei neu aus dem unveränderlichen freigegebenen Snapshot. Der Archivdatensatz selbst wird dabei nicht verändert.',en:'“Create PDF again” creates the file again from the immutable released snapshot. The archive record itself is not changed.'},footer:{de:'Nebenkosten Premium · Versions- und Übergabearchiv · Keine dauerhafte PDF-Dateispeicherung im Browser behauptet.',en:'Nebenkosten Premium · Version and delivery archive · No claim of permanent PDF file storage in the browser.'},
 allProperties:{de:'Alle Immobilien',en:'All properties'},empty:{de:'Noch keine passende Dokumentfassung vorhanden.',en:'No matching document version yet.'},version:{de:'Version',en:'Version'},releasedOn:{de:'Freigegeben',en:'Released'},created:{de:'Erstellt',en:'Created'},review:{de:'Prüffassung',en:'Review version'},pdfAgain:{de:'PDF erneut erstellen',en:'Create PDF again'},deliveryTitle:{de:'Übergabe dokumentieren',en:'Record delivery'},deliveryDate:{de:'Übergabedatum',en:'Delivery date'},channel:{de:'Weg',en:'Channel'},email:{de:'E-Mail',en:'Email'},paper:{de:'Papier',en:'Paper'},portal:{de:'Portal',en:'Portal'},personal:{de:'Persönlich',en:'In person'},other:{de:'Sonstiges',en:'Other'},noteLabel:{de:'Notiz',en:'Note'},saveDelivery:{de:'Übergabe speichern',en:'Save delivery'},deliverySaved:{de:'Übergabe wurde separat dokumentiert.',en:'Delivery recorded separately.'},pdfReady:{de:'PDF wurde aus der freigegebenen Fassung neu erstellt.',en:'PDF recreated from the released version.'},deliveries:{de:'Dokumentierte Übergaben',en:'Recorded deliveries'},none:{de:'Keine',en:'None'}
};
initI18n(I18N);
let project=null,propertyFilter='',statusFilter='released';
const today=()=>new Date().toISOString().slice(0,10);
function reload(){const s=safeLoadProject();project=s.project;updateStoragePill(project,s.error);if(s.error){showFlash(s.error.message,'error');return false;}return true;}
function typeLabel(type){
 const de={owner_annual_summary:'Eigentümer-Jahresübersicht',tenant_operating_cost_statement:'Betriebskostenabrechnung',lease_draft:'Mietvertragsentwurf',house_rules:'Hausordnung',waste_info:'Müll- und Entsorgungsinformation',handover_protocol:'Ein-/Auszugsprotokoll',tenant_service_sheet:'Mieter-Serviceblatt',owner_safety_overview:'Eigentümer-Sicherheitsübersicht',letting_checklist:'Vermietungs-Checkliste'};
 const en={owner_annual_summary:'Owner annual summary',tenant_operating_cost_statement:'Operating cost statement',lease_draft:'Lease draft',house_rules:'House rules',waste_info:'Waste and disposal information',handover_protocol:'Move-in / move-out protocol',tenant_service_sheet:'Tenant service sheet',owner_safety_overview:'Owner safety overview',letting_checklist:'Letting checklist'};
 return (getLanguage()==='en'?en:de)[type]||type;
}
function renderFilters(){
 const select=document.querySelector('[data-property-filter]');
 const options=['<option value="">'+escapeText(I18N.allProperties[getLanguage()])+'</option>'].concat((project?.properties??[]).map(p=>'<option value="'+escapeText(p.id)+'">'+escapeText(p.label||p.id)+'</option>'));
 select.innerHTML=options.join('');select.value=propertyFilter;
 document.querySelector('[data-status-filter]').value=statusFilter;
}
function deliveryRows(doc){
 if(!doc.deliveries?.length)return '<div class="kicker">'+escapeText(I18N.none[getLanguage()])+'</div>';
 return '<div class="unit-list">'+doc.deliveries.map(d=>'<div class="unit-row"><div><div class="unit-title">'+escapeText(d.deliveredOn)+'</div><div class="unit-sub">'+escapeText(d.channel)+(d.note?' · '+escapeText(d.note):'')+'</div></div></div>').join('')+'</div>';
}
function render(){
 renderFilters();
 let docs=listDocumentArchive(project||{documents:[],checkItems:[]},{propertyId:propertyFilter||null});
 if(statusFilter==='released')docs=docs.filter(x=>x.status==='released');
 document.querySelector('[data-release-count]').textContent=docs.filter(x=>x.status==='released').length;
 document.querySelector('[data-delivery-count]').textContent=docs.reduce((n,x)=>n+(x.deliveries?.length||0),0);
 const host=document.querySelector('[data-archive-list]');
 if(!docs.length){host.innerHTML='<div class="empty-state"><p>'+escapeText(I18N.empty[getLanguage()])+'</p></div>';return;}
 host.innerHTML=docs.map(doc=>{
   const released=doc.status==='released';
   return '<article class="card" data-archive-doc="'+escapeText(doc.id)+'"><div class="property-top"><div><div class="property-name">'+escapeText(typeLabel(doc.documentType))+'</div><div class="property-address">'+escapeText(doc.title||'')+' · '+escapeText(I18N.version[getLanguage()])+' '+doc.version+' · '+escapeText(released?I18N.releasedOn[getLanguage()]:I18N.created[getLanguage()])+' '+escapeText(released?doc.releasedOn:doc.createdOn)+'</div></div><span class="badge">'+escapeText(released?'Snapshot':I18N.review[getLanguage()])+'</span></div>'+
   (released?'<div class="form-actions"><button class="btn btn-primary" type="button" data-pdf-again="'+escapeText(doc.id)+'">'+escapeText(I18N.pdfAgain[getLanguage()])+'</button></div><div class="section"><h3>'+escapeText(I18N.deliveries[getLanguage()])+'</h3>'+deliveryRows(doc)+'</div><div class="section form-card"><h3>'+escapeText(I18N.deliveryTitle[getLanguage()])+'</h3><div class="form-grid"><div><label>'+escapeText(I18N.deliveryDate[getLanguage()])+'</label><input type="date" name="deliveryDate" value="'+today()+'"></div><div><label>'+escapeText(I18N.channel[getLanguage()])+'</label><select name="channel"><option value="email">'+escapeText(I18N.email[getLanguage()])+'</option><option value="paper">'+escapeText(I18N.paper[getLanguage()])+'</option><option value="portal">'+escapeText(I18N.portal[getLanguage()])+'</option><option value="personal">'+escapeText(I18N.personal[getLanguage()])+'</option><option value="other">'+escapeText(I18N.other[getLanguage()])+'</option></select></div><div class="full"><label>'+escapeText(I18N.noteLabel[getLanguage()])+'</label><input name="deliveryNote"></div></div><div class="form-actions"><button class="btn btn-secondary" type="button" data-save-delivery="'+escapeText(doc.id)+'">'+escapeText(I18N.saveDelivery[getLanguage()])+'</button></div></div>':'')+
   '</article>';
 }).join('');
 host.querySelectorAll('[data-pdf-again]').forEach(btn=>btn.addEventListener('click',()=>makePdf(btn.dataset.pdfAgain)));
 host.querySelectorAll('[data-save-delivery]').forEach(btn=>btn.addEventListener('click',()=>saveDelivery(btn.closest('[data-archive-doc]'),btn.dataset.saveDelivery)));
}
async function makePdf(id){
 const doc=project.documents.find(x=>x.id===id);
 try{
  if(typeof window.AkademiePdfUebergabe?.setDocument!=='function')throw new Error('Akademie-PDF-Zentrale ist nicht verfügbar.');
  const out=await generateReleasedDocumentPdf(doc,{lang:getLanguage()});
  window.AkademiePdfUebergabe.setDocument({blob:out.blob,filename:out.filename,pages:out.pages,origin:'Nebenkosten Premium · Archiv · '+(doc.title||typeLabel(doc.documentType))+' · Version '+doc.version});
  showFlash(I18N.pdfReady[getLanguage()]+' '+out.pages+' A4.');
 }catch(e){showFlash(e.message||String(e),'error');}
}
function saveDelivery(card,documentId){
 if(!reload()||!project)return;
 const deliveredOn=card.querySelector('[name="deliveryDate"]').value;
 const channel=card.querySelector('[name="channel"]').value;
 const note=card.querySelector('[name="deliveryNote"]').value;
 try{
  const r=recordDocumentDelivery(project,{itemId:newId('delivery'),documentId,deliveredOn,channel,note});
  saveProject(r.project);project=r.project;showFlash(I18N.deliverySaved[getLanguage()]);render();
 }catch(e){reload();showFlash(e.message||String(e),'error');render();}
}
document.querySelector('[data-property-filter]')?.addEventListener('change',e=>{propertyFilter=e.target.value;render();});
document.querySelector('[data-status-filter]')?.addEventListener('change',e=>{statusFilter=e.target.value;render();});
window.addEventListener('app-language-change',()=>{if(project)render();});
if(reload())render();
