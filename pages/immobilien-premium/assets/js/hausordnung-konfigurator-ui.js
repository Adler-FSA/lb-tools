
import {saveProject} from './storage.js';
import {newId,safeLoadProject,showFlash,updateStoragePill,escapeText} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';
import {defaultHouseRulesConfig,validateHouseRulesConfig,buildHouseRulesDocument,renderHouseRulesHtml,upsertHouseRulesDraft,HOUSE_RULES_SOURCE} from './house-rules-workshop.js';

const I18N={
 navHome:{de:'Meine Zentrale',en:'My dashboard'},navRental:{de:'Mietservice',en:'Tenant service'},navLease:{de:'Mietvertragswerkstatt',en:'Lease workshop'},navHouseRules:{de:'Hausordnung',en:'House rules'},navDocs:{de:'Dokumente & Hilfe',en:'Documents & help'},
 eyebrow:{de:'Hausgemeinschaft · konfigurierbare Musterfassung',en:'House community · configurable template'},title:{de:'Hausordnung passend zum Gebäude zusammenstellen.',en:'Configure house rules for the building.'},copy:{de:'Organisatorische Regeln, Gemeinschaftsflächen und Sicherheitsaspekte lassen sich auswählen. Übertragene Bewohnerpflichten werden separat als Prüfbedarf markiert.',en:'Organisational rules, shared spaces and safety items can be configured. Assigned resident duties are flagged separately for review.'},
 status:{de:'Dokumentart',en:'Document type'},statusCopy:{de:'Der Status wird aus deiner Auswahl erzeugt. Prüfhinweise bleiben außerhalb des Dokuments.',en:'The status follows your selection. Review notes remain outside the document.'},context:{de:'Projektbezug',en:'Project context'},contextTitle:{de:'Immobilie auswählen',en:'Select property'},property:{de:'Immobilie',en:'Property'},unit:{de:'Optional: Wohnung',en:'Optional: unit'},mode:{de:'Verwendung',en:'Use'},
 configure:{de:'Hausordnung konfigurieren',en:'Configure house rules'},docTitle:{de:'Titel',en:'Title'},quiet:{de:'Ruhe & Rücksicht',en:'Quiet & consideration'},quietEnabled:{de:'Ruhezeiten aufnehmen',en:'Include quiet hours'},from:{de:'von',en:'from'},to:{de:'bis',en:'to'},midday:{de:'Zusätzliche Mittagsruhe',en:'Additional midday quiet time'},
 common:{de:'Gemeinschaftsbereiche',en:'Shared areas'},commonAreas:{de:'Gemeinschaftsflächen',en:'Shared areas'},waste:{de:'Müll & Entsorgung',en:'Waste & disposal'},bikes:{de:'Fahrräder / Gegenstände',en:'Bikes / stored items'},laundry:{de:'Waschküche / Gemeinschaftsgeräte',en:'Laundry / shared equipment'},
 outside:{de:'Außenflächen & Verhalten',en:'Outdoor areas & conduct'},garden:{de:'Garten / Außenflächen',en:'Garden / outdoor areas'},grill:{de:'Grillen',en:'Barbecues'},pets:{de:'Tiere in Gemeinschaftsbereichen',en:'Animals in shared areas'},
 safety:{de:'Sicherheit',en:'Safety'},escape:{de:'Flucht- und Rettungswege',en:'Escape and rescue routes'},doors:{de:'Haus- und Zugangstüren',en:'Building and access doors'},smoking:{de:'Rauchen in Gemeinschaftsbereichen',en:'Smoking in shared areas'},
 duties:{de:'Besondere Bewohnerpflichten',en:'Special resident duties'},cleaning:{de:'Reinigungsregel aufnehmen',en:'Include cleaning rule'},cleaningAssigned:{de:'Pflicht Bewohnern zuordnen',en:'Assign duty to residents'},winter:{de:'Winterdienst aufnehmen',en:'Include winter service'},winterAssigned:{de:'Pflicht Bewohnern zuordnen',en:'Assign duty to residents'},
 save:{de:'Entwurf speichern',en:'Save draft'},pdf:{de:'PDF erstellen',en:'Create PDF'},preview:{de:'Dokumentvorschau',en:'Document preview'},previewCopy:{de:'Nur dieser Bereich wird als Hausordnung ausgegeben.',en:'Only this area is exported as house rules.'},draft:{de:'Musterfassung',en:'Template draft'},footer:{de:'Hausordnungs-Konfigurator · Prüfhinweise sind vom Dokument getrennt.',en:'House rules configurator · Review notes are separate from the document.'},
 valid:{de:'Hausordnung technisch ausgabefähig.',en:'House rules are technically ready for output.'},invalid:{de:'Vor PDF-Ausgabe müssen noch Angaben korrigiert werden.',en:'Some fields must be corrected before PDF output.'},review:{de:'Separater Prüfbedarf',en:'Separate review items'},none:{de:'Keine zusätzlichen Prüfhilfen aus der aktuellen Auswahl.',en:'No additional review items from the current selection.'},saved:{de:'Hausordnungsentwurf wurde gespeichert.',en:'House rules draft saved.'},pdfReady:{de:'Hausordnungs-PDF wurde erzeugt.',en:'House rules PDF created.'}
};
initI18n(I18N);

let project=null,config=defaultHouseRulesConfig(),propertyId='',unitId='',draftId=null;
const $=s=>document.querySelector(s),today=()=>new Date().toISOString().slice(0,10);
function getPath(obj,path){return path.split('.').reduce((o,k)=>o?.[k],obj);}
function setPath(obj,path,value){const p=path.split('.');let o=obj;for(let i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=value;}
function reload(){const s=safeLoadProject();project=s.project;updateStoragePill(project,s.error);if(s.error){showFlash(s.error.message||String(s.error),'error');return false;}return true;}
function opt(v,l){return '<option value="'+escapeText(v)+'">'+escapeText(l)+'</option>';}
function setOptions(node,items,value,allowEmpty=false){node.innerHTML=(allowEmpty?[opt('','—')]:[]).concat(items.map(x=>opt(x.value,x.label))).join('');const next=items.some(x=>x.value===value)?value:(allowEmpty?'':(items[0]?.value||''));node.value=next;return next;}
function syncContext(){
 propertyId=setOptions($('[data-property]'),(project?.properties||[]).map(x=>({value:x.id,label:x.label||x.id})),propertyId);
 const units=(project?.units||[]).filter(x=>x.propertyId===propertyId);
 unitId=setOptions($('[data-unit]'),units.map(x=>({value:x.id,label:x.label||x.id})),unitId,true);
}
function applyContext(){
 const existing=(project?.documents||[]).find(x=>x.source===HOUSE_RULES_SOURCE&&x.propertyId===propertyId&&x.unitId===(unitId||null));
 if(existing){config=existing.payload;draftId=existing.id;}else{config=defaultHouseRulesConfig();draftId=null;const p=(project?.properties||[]).find(x=>x.id===propertyId);config.propertyLabel=p?.label||'';}
 writeForm();render();
}
function writeForm(){document.querySelectorAll('[data-field]').forEach(el=>{el.value=getPath(config,el.dataset.field)??'';});document.querySelectorAll('[data-check]').forEach(el=>{el.checked=!!getPath(config,el.dataset.check);});}
function readForm(){document.querySelectorAll('[data-field]').forEach(el=>setPath(config,el.dataset.field,el.value));document.querySelectorAll('[data-check]').forEach(el=>setPath(config,el.dataset.check,el.checked));}
function render(){readForm();const q=validateHouseRulesConfig(config),v=$('[data-validation]');v.className='validation-panel'+(q.valid?' ok':'');v.innerHTML='<strong>'+escapeText((q.valid?I18N.valid:I18N.invalid)[getLanguage()])+'</strong>'+(q.errors.length?'<ul>'+q.errors.map(x=>'<li>'+escapeText(x.message)+'</li>').join('')+'</ul>':'');
 const rp=$('[data-review-panel]');rp.innerHTML='<strong>'+escapeText(I18N.review[getLanguage()])+'</strong>'+(q.warnings.length?'<ul>'+q.warnings.map(x=>'<li>'+escapeText(x.message)+'</li>').join('')+'</ul>':'<p>'+escapeText(I18N.none[getLanguage()])+'</p>');
 $('[data-mode-status]').textContent=config.mode==='contractual_attachment'?(getLanguage()==='en'?'Contract attachment':'Vertragsanlage'):(getLanguage()==='en'?'Resident information':'Bewohnerinformation');
 try{$('[data-contract-document]').innerHTML=q.valid?renderHouseRulesHtml(buildHouseRulesDocument(q.config)):'';}catch{$('[data-contract-document]').innerHTML='';}
 $('[data-pdf]').disabled=!q.valid;
}
function save(){if(!reload()||!project)return;readForm();try{const r=upsertHouseRulesDraft(project,{documentId:draftId||newId('houserules'),propertyId,unitId:unitId||null,config,createdOn:today()});saveProject(r.project);project=r.project;draftId=r.documentId;showFlash(I18N.saved[getLanguage()]);render();}catch(e){showFlash(e.message||String(e),'error');}}
async function pdf(){readForm();const q=validateHouseRulesConfig(config);if(!q.valid)return render();try{const engine=window.FSAContractPdfEngine,z=window.AkademiePdfUebergabe;if(!engine||!z)throw new Error('PDF-Zentrale ist nicht verfügbar.');const result=await engine.generate({root:$('[data-contract-document]'),contentRoot:$('[data-contract-document]'),fieldsRoot:$('#pdfEmptyFields'),titleText:(config.title||'Hausordnung').toUpperCase(),subtitleText:'Musterfassung · Deutschland',logoUrl:'',footerText:config.title||'Hausordnung',filename:'Hausordnung-'+today()+'.pdf',autoDownload:false});z.setDocument({blob:result.blob,filename:result.filename,pages:result.pages,origin:'Nebenkosten Premium · Hausordnungs-Konfigurator'});showFlash(I18N.pdfReady[getLanguage()]+' '+result.pages+' A4.');}catch(e){showFlash(e.message||String(e),'error');}}
$('[data-property]').addEventListener('change',e=>{propertyId=e.target.value;unitId='';syncContext();applyContext();});$('[data-unit]').addEventListener('change',e=>{unitId=e.target.value;applyContext();});
document.querySelectorAll('[data-field],[data-check]').forEach(el=>el.addEventListener('input',render));$('[data-save]').addEventListener('click',save);$('[data-pdf]').addEventListener('click',pdf);window.addEventListener('app-language-change',render);
if(reload()){syncContext();applyContext();}
