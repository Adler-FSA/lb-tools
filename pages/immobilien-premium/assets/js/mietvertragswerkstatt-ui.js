
import {saveProject} from './storage.js';
import {newId,safeLoadProject,showFlash,updateStoragePill,escapeText} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';
import {defaultLeaseConfig,validateLeaseConfig,buildLeaseDocument,renderLeaseHtml,upsertLeaseWorkshopDraft,LEASE_LEGAL_REFERENCES,LEASE_WORKSHOP_SOURCE} from './lease-workshop.js';

const I18N={
 navHome:{de:'Meine Zentrale',en:'My dashboard'},navRental:{de:'Mietservice',en:'Tenant service'},navLease:{de:'Mietvertragswerkstatt',en:'Lease workshop'},navHouseRules:{de:'Hausordnung',en:'House rules'},navDocs:{de:'Dokumente & Hilfe',en:'Documents & help'},
 eyebrow:{de:'Wohnraum · Deutschland · Musterwerkstatt',en:'Residential · Germany · template workshop'},title:{de:'Mietvertrag konfigurieren – Prüfhinweise bleiben außerhalb des Vertrags.',en:'Configure the lease – review notes stay outside the contract.'},copy:{de:'Die Werkstatt erzeugt eine strukturierte Musterfassung aus deinen Angaben. Gesetzlich klar begrenzte Eingaben werden technisch geprüft; komplexe Klauseln bleiben als separater Prüfbedarf sichtbar.',en:'The workshop creates a structured German residential lease template. Clear statutory limits are checked technically; complex clauses remain separate review items.'},
 master:{de:'Masterstatus',en:'Master status'},notApproved:{de:'Noch keine anwaltlich freigegebene Masterfassung',en:'No lawyer-approved master version yet'},notApprovedCopy:{de:'Die spätere anwaltliche Prüfung und Versionsfreigabe erfolgt außerhalb des Vertragsdokuments.',en:'Future legal review and version approval take place outside the contract document.'},version:{de:'Version',en:'Version'},
 context:{de:'Projektbezug',en:'Project context'},contextTitle:{de:'Immobilie und Mietverhältnis auswählen',en:'Select property and tenancy'},property:{de:'Immobilie',en:'Property'},unit:{de:'Wohnung',en:'Unit'},tenancy:{de:'Mietverhältnis',en:'Tenancy'},configure:{de:'Vertrag konfigurieren',en:'Configure contract'},
 parties:{de:'Vertragsparteien',en:'Parties'},landlordName:{de:'Vermieter',en:'Landlord'},landlordStreet:{de:'Anschrift Vermieter',en:'Landlord address'},landlordCity:{de:'PLZ / Ort Vermieter',en:'Postal code / city'},tenantName:{de:'Mieter',en:'Tenant'},tenantStreet:{de:'Bisherige Anschrift Mieter',en:'Current tenant address'},tenantCity:{de:'PLZ / Ort Mieter',en:'Postal code / city'},
 object:{de:'Mietobjekt',en:'Rental property'},street:{de:'Straße / Hausnummer',en:'Street / number'},postalCity:{de:'PLZ / Ort',en:'Postal code / city'},unitLabel:{de:'Wohnung / Lage',en:'Unit / location'},floor:{de:'Etage',en:'Floor'},area:{de:'Wohnfläche m²',en:'Area m²'},rooms:{de:'Zimmer',en:'Rooms'},cellar:{de:'Keller',en:'Cellar'},parking:{de:'Stellplatz / Garage',en:'Parking / garage'},
 term:{de:'Mietzeit',en:'Term'},termKind:{de:'Vertragsart',en:'Contract type'},startDate:{de:'Mietbeginn',en:'Start date'},endDate:{de:'Vertragsende',en:'End date'},fixedReason:{de:'Befristungsgrund',en:'Fixed-term reason'},fixedDetail:{de:'Konkrete Begründung',en:'Specific reason'},
 rent:{de:'Miete & Betriebskosten',en:'Rent & operating costs'},baseRent:{de:'Nettokaltmiete €',en:'Net base rent €'},operatingMode:{de:'Betriebskosten',en:'Operating costs'},operatingAmount:{de:'Betriebskosten €',en:'Operating costs €'},iban:{de:'IBAN',en:'IBAN'},bank:{de:'Bank',en:'Bank'},adjustment:{de:'Mietanpassung',en:'Rent adjustment'},addStagger:{de:'Staffel hinzufügen',en:'Add rent step'},
 deposit:{de:'Kaution',en:'Deposit'},depositEnabled:{de:'Kaution vereinbaren',en:'Use deposit'},depositAmount:{de:'Kaution €',en:'Deposit €'},options:{de:'Weitere Vereinbarungen',en:'Further terms'},persons:{de:'Personenzahl',en:'Occupants'},smallRepairs:{de:'Kleinreparaturklausel aufnehmen',en:'Include minor repairs clause'},smallSingle:{de:'Einzelgrenze €',en:'Per-repair limit €'},smallAnnual:{de:'Jahresobergrenze €',en:'Annual limit €'},cosmetic:{de:'Schönheitsreparaturklausel aufnehmen',en:'Include cosmetic repairs clause'},pets:{de:'Tierhaltung',en:'Pets'},petDetails:{de:'Eigene Tierhaltungsregel',en:'Custom pet rule'},houseAttached:{de:'Hausordnung als Anlage',en:'Attach house rules'},handover:{de:'Übergabeprotokoll als Anlage',en:'Attach handover protocol'},inventory:{de:'Inventarliste als Anlage',en:'Attach inventory'},keys:{de:'Schlüssel',en:'Keys'},fixtures:{de:'Mitvermietete Ausstattung',en:'Included fixtures'},agreements:{de:'Weitere individuelle Vereinbarungen',en:'Additional individual agreements'},
 save:{de:'Entwurf speichern',en:'Save draft'},pdf:{de:'PDF erstellen',en:'Create PDF'},legalRefs:{de:'Gesetzliche Prüfreferenzen',en:'Statutory reference points'},separateHint:{de:'Diese Links und Prüfhilfen erscheinen nicht im Mietvertrag.',en:'These links and review aids never appear in the lease.'},preview:{de:'Dokumentvorschau',en:'Document preview'},previewCopy:{de:'Nur dieser Bereich wird als Vertragsinhalt ausgegeben.',en:'Only this area is exported as contract content.'},draft:{de:'Musterfassung',en:'Template draft'},footer:{de:'Wohnraum-Mietvertragswerkstatt · Prüfhinweise und Rechtsstatus sind vom Vertragsdokument getrennt.',en:'Residential lease workshop · Review notes and legal status are separate from the contract.'},
 valid:{de:'Vertrag technisch ausgabefähig.',en:'Contract is technically ready for output.'},invalid:{de:'Vor PDF-Ausgabe müssen noch Angaben korrigiert werden.',en:'Some fields must be corrected before PDF output.'},reviewTitle:{de:'Separater Prüfbedarf',en:'Separate review items'},noReview:{de:'Keine zusätzlichen Prüfhilfen aus der aktuellen Auswahl.',en:'No additional review items from the current selection.'},saved:{de:'Mietvertragsentwurf wurde im Projekt gespeichert.',en:'Lease draft saved in the project.'},pdfReady:{de:'Mietvertrags-PDF wurde erzeugt.',en:'Lease PDF created.'},choose:{de:'Bitte wählen',en:'Please choose'},none:{de:'Nicht vorhanden',en:'None'}
};
initI18n(I18N);

let project=null,config=defaultLeaseConfig(),propertyId='',unitId='',tenancyId='',draftId=null;
const $=s=>document.querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);
function getPath(obj,path){return path.split('.').reduce((o,k)=>o?.[k],obj);}
function setPath(obj,path,value){const p=path.split('.');let o=obj;for(let i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=value;}
function centsFrom(value){const n=Number(String(value||'').replace(',','.'));return Number.isFinite(n)?Math.round(n*100):0;}
function moneyValue(c){return Number.isSafeInteger(c)&&c?String((c/100).toFixed(2)).replace('.',','):'';}
function reload(){const s=safeLoadProject();project=s.project;updateStoragePill(project,s.error);if(s.error){showFlash(s.error.message||String(s.error),'error');return false;}return true;}
function option(v,l){return '<option value="'+escapeText(v)+'">'+escapeText(l)+'</option>';}
function selectOptions(node,items,value){node.innerHTML=items.length?items.map(x=>option(x.value,x.label)).join(''):option('',I18N.none[getLanguage()]);node.disabled=!items.length;const next=items.some(x=>x.value===value)?value:(items[0]?.value||'');node.value=next;return next;}
function address(p){const a=p?.address||{};return [[a.street,a.houseNumber].filter(Boolean).join(' '),[a.postalCode,a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');}
function areaFor(unit){const h=(unit?.areaHistory||[]).slice().sort((a,b)=>b.from.localeCompare(a.from))[0];return h?.hundredthsM2?String(h.hundredthsM2/100):'';}
function syncContext(){
 propertyId=selectOptions($('[data-property]'),(project?.properties||[]).map(p=>({value:p.id,label:p.label||p.id})),propertyId);
 const units=(project?.units||[]).filter(u=>u.propertyId===propertyId);
 unitId=selectOptions($('[data-unit]'),units.map(u=>({value:u.id,label:u.label||u.id})),unitId);
 const tenancies=(project?.tenancies||[]).filter(t=>t.unitId===unitId);
 tenancyId=selectOptions($('[data-tenancy]'),tenancies.map(t=>({value:t.id,label:t.partyLabel||t.id})),tenancyId);
}
function applyContext(force=false){
 const existing=(project?.documents||[]).find(x=>x.source===LEASE_WORKSHOP_SOURCE&&x.tenancyId===tenancyId);
 if(existing&&!force){config=existing.payload;draftId=existing.id;writeForm();render();return;}
 const p=(project?.properties||[]).find(x=>x.id===propertyId),u=(project?.units||[]).find(x=>x.id===unitId),tn=(project?.tenancies||[]).find(x=>x.id===tenancyId);
 const c=defaultLeaseConfig(),a=p?.address||{};
 c.property.street=[a.street,a.houseNumber].filter(Boolean).join(' ');
 c.property.postalCity=[a.postalCode,a.city].filter(Boolean).join(' ');
 c.property.unitLabel=u?.label||'';c.property.floor=u?.floor||'';c.property.areaM2=areaFor(u);
 c.tenant.name=tn?.partyLabel||'';c.term.startDate=tn?.startDate||'';
 const term=(project?.contractTerms||[]).filter(x=>x.tenancyId===tenancyId).sort((a,b)=>b.startDate.localeCompare(a.startDate))[0];
 if(term){c.rent.operatingMode=term.operatingCostsModel==='flat'?'flat':'advance';c.rent.operatingCostCents=term.advanceCents||0;}
 const old=(project?.documents||[]).find(x=>x.source==='baustein5-mietservice-v1'&&x.type==='lease_draft'&&x.tenancyId===tenancyId);
 if(old?.payload){c.rent.baseRentCents=old.payload.baseRentCents||0;c.deposit.amountCents=old.payload.depositCents||0;}
 if(project?.demoMetadata?.fictional){c.landlord.name='Eva Linden · fiktiv';c.landlord.street=c.property.street;c.landlord.postalCity=c.property.postalCity;}
 config=c;draftId=null;writeForm();render();
}
function writeForm(){
 document.querySelectorAll('[data-field]').forEach(el=>{el.value=getPath(config,el.dataset.field)??'';});
 document.querySelectorAll('[data-money]').forEach(el=>{el.value=moneyValue(getPath(config,el.dataset.money));});
 document.querySelectorAll('[data-check]').forEach(el=>{el.checked=!!getPath(config,el.dataset.check);});
 renderStaggers();toggleParts();
}
function readForm(){
 document.querySelectorAll('[data-field]').forEach(el=>setPath(config,el.dataset.field,el.value));
 document.querySelectorAll('[data-money]').forEach(el=>setPath(config,el.dataset.money,centsFrom(el.value)));
 document.querySelectorAll('[data-check]').forEach(el=>setPath(config,el.dataset.check,el.checked));
}
function renderStaggers(){
 const host=$('[data-stagger-list]');host.innerHTML=(config.rentAdjustment.staggeredRows||[]).map((r,i)=>'<div class="stagger-row"><input type="date" value="'+escapeText(r.from||'')+'" data-stagger-date="'+i+'"><input inputmode="decimal" value="'+escapeText(moneyValue(r.rentCents))+'" data-stagger-money="'+i+'"><button type="button" data-remove-stagger="'+i+'">×</button></div>').join('');
 host.querySelectorAll('[data-stagger-date]').forEach(el=>el.addEventListener('input',()=>{config.rentAdjustment.staggeredRows[Number(el.dataset.staggerDate)].from=el.value;render();}));
 host.querySelectorAll('[data-stagger-money]').forEach(el=>el.addEventListener('input',()=>{config.rentAdjustment.staggeredRows[Number(el.dataset.staggerMoney)].rentCents=centsFrom(el.value);render();}));
 host.querySelectorAll('[data-remove-stagger]').forEach(el=>el.addEventListener('click',()=>{config.rentAdjustment.staggeredRows.splice(Number(el.dataset.removeStagger),1);renderStaggers();render();}));
}
function toggleParts(){
 $('[data-fixed-fields]').style.display=config.term.kind==='fixed'?'grid':'none';
 $('[data-staggered]').style.display=config.rentAdjustment.kind==='staggered'?'block':'none';
}
function render(){
 readForm();toggleParts();const q=validateLeaseConfig(config),v=$('[data-validation]');
 v.className='validation-panel'+(q.valid?' ok':'');v.innerHTML='<strong>'+escapeText((q.valid?I18N.valid:I18N.invalid)[getLanguage()])+'</strong>'+(q.errors.length?'<ul>'+q.errors.map(x=>'<li>'+escapeText(x.message)+'</li>').join('')+'</ul>':'');
 const rp=$('[data-review-panel]');rp.innerHTML='<strong>'+escapeText(I18N.reviewTitle[getLanguage()])+'</strong>'+(q.warnings.length?'<ul>'+q.warnings.map(x=>'<li>'+escapeText(x.message)+'</li>').join('')+'</ul>':'<p>'+escapeText(I18N.noReview[getLanguage()])+'</p>');
 try{$('[data-contract-document]').innerHTML=q.valid?renderLeaseHtml(buildLeaseDocument(q.config)):'<div class="empty-state"><p>'+escapeText(I18N.invalid[getLanguage()])+'</p></div>';}catch{$('[data-contract-document]').innerHTML='';}
 $('[data-pdf]').disabled=!q.valid;
}
function save(){
 if(!reload()||!project)return;readForm();
 try{const r=upsertLeaseWorkshopDraft(project,{documentId:draftId||newId('leasework'),propertyId,unitId,tenancyId,config,createdOn:today()});saveProject(r.project);project=r.project;draftId=r.documentId;showFlash(I18N.saved[getLanguage()]);render();}
 catch(e){showFlash(e.message||String(e),'error');}
}
async function pdf(){
 readForm();const q=validateLeaseConfig(config);if(!q.valid)return render();
 try{
  const engine=window.FSAContractPdfEngine,z=window.AkademiePdfUebergabe;if(!engine||!z)throw new Error('PDF-Zentrale ist nicht verfügbar.');
  const result=await engine.generate({root:$('[data-contract-document]'),contentRoot:$('[data-contract-document]'),fieldsRoot:$('#pdfEmptyFields'),titleText:'WOHNRAUM-MIETVERTRAG',subtitleText:'Musterfassung · Deutschland',logoUrl:'',footerText:'Wohnraum-Mietvertrag · Musterfassung',filename:'Wohnraum-Mietvertrag-'+today()+'.pdf',autoDownload:false});
  z.setDocument({blob:result.blob,filename:result.filename,pages:result.pages,origin:'Nebenkosten Premium · Wohnraum-Mietvertragswerkstatt'});showFlash(I18N.pdfReady[getLanguage()]+' '+result.pages+' A4.');
 }catch(e){showFlash(e.message||String(e),'error');}
}
$('[data-property]').addEventListener('change',e=>{propertyId=e.target.value;unitId='';tenancyId='';syncContext();applyContext();});
$('[data-unit]').addEventListener('change',e=>{unitId=e.target.value;tenancyId='';syncContext();applyContext();});
$('[data-tenancy]').addEventListener('change',e=>{tenancyId=e.target.value;applyContext();});
document.querySelectorAll('[data-field],[data-money],[data-check]').forEach(el=>el.addEventListener('input',render));
$('[data-add-stagger]').addEventListener('click',()=>{config.rentAdjustment.staggeredRows.push({from:'',rentCents:0});renderStaggers();render();});
$('[data-save]').addEventListener('click',save);$('[data-pdf]').addEventListener('click',pdf);
$('[data-legal-links]').innerHTML=LEASE_LEGAL_REFERENCES.map(x=>'<a target="_blank" rel="noopener" href="'+escapeText(x.url)+'">'+escapeText(x.label)+'</a>').join('');
window.addEventListener('app-language-change',render);
if(reload()){syncContext();const params=new URLSearchParams(location.search);if(params.get('tenancy')&&(project?.tenancies||[]).some(x=>x.id===params.get('tenancy'))){tenancyId=params.get('tenancy');const tn=project.tenancies.find(x=>x.id===tenancyId);unitId=tn.unitId;propertyId=project.units.find(x=>x.id===unitId)?.propertyId||propertyId;syncContext();}applyContext();}
