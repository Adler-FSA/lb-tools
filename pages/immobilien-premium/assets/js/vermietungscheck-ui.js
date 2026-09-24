import {saveProject} from './storage.js';
import {LETTING_ITEMS,LETTING_PHASES,advanceLettingPhase,createLettingProcess,deleteLettingProcess,listLettingProcesses,setLettingItemState} from './letting-check.js';
import {escapeText,newId,safeLoadProject,showFlash,updateStoragePill} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';

const I18N={
  navHome:{de:'Meine Zentrale',en:'My dashboard'},navProperties:{de:'Immobilien',en:'Properties'},navRental:{de:'Mietservice',en:'Tenant service'},navCosts:{de:'Kosten & Abrechnung',en:'Costs & billing'},navChecks:{de:'Sicherheit & Checks',en:'Safety & checks'},navDocs:{de:'Dokumente & Hilfe',en:'Documents & help'},
  eyebrow:{de:'Vermietungscheck',en:'Letting check'},heroTitle:{de:'Der Zeitpunkt entscheidet, welche Daten überhaupt dran sind.',en:'Timing determines which data should be handled at all.'},heroCopy:{de:'Der Ablauf trennt Besichtigung, konkretes Mietinteresse und die ausgewählte zukünftige Vertragspartei. Es werden hier keine Bewerberantworten, Nachweisdateien oder Scores gespeichert.',en:'The process separates viewing, concrete rental interest and the selected future contracting party. No applicant answers, evidence files or scores are stored here.'},back:{de:'← Zum Eigentümer-Check',en:'← Back to owner check'},unit:{de:'Einheit',en:'Unit'},choose:{de:'Vermietungsprozess starten',en:'Start letting process'},chooseCopy:{de:'Bitte im Vorgangsfeld keine Namen, Kontodaten oder sensiblen Bewerberangaben verwenden.',en:'Do not enter names, bank details or sensitive applicant data in the process label.'},reference:{de:'Neutrale Vorgangsbezeichnung',en:'Neutral process label'},referencePlaceholder:{de:'z. B. Vorgang A',en:'e.g. Process A'},create:{de:'Neuen Vorgang anlegen',en:'Create new process'},privacy:{de:'Grundlage des Stufenmodells: Orientierungshilfe der Datenschutzkonferenz, Version 2.0, Stand Januar 2026. Nicht erforderliche Fragen oder Unterlagen werden nicht vorgezogen. Der Check speichert nur den Bearbeitungsstatus der Prüfpunkte.',en:'Basis of the staged model: guidance of the German Data Protection Conference, version 2.0, January 2026. Questions or documents that are not yet required are not brought forward. The check stores only the processing status of the review items.'},noScore:{de:'Kein Ranking, kein Score, keine automatische Mieterauswahl. Die Entscheidung bleibt beim Vermieter; der Assistent hilft nur dabei, den Ablauf und die Datensparsamkeit einzuhalten.',en:'No ranking, no score, no automatic tenant selection. The decision remains with the landlord; the assistant only helps keep the process staged and data-minimised.'},footer:{de:'Nebenkosten Premium · Datensparsamer Organisationscheck · Keine individuelle Rechtsberatung.',en:'Nebenkosten Premium · Data-minimised organisation check · No individual legal advice.'},
  noUnits:{de:'Bitte zuerst eine Immobilie mit Einheit anlegen.',en:'Please create a property with a unit first.'},created:{de:'Datensparsamer Vermietungsvorgang wurde angelegt.',en:'Data-minimised letting process created.'},saved:{de:'Prüfstatus gespeichert.',en:'Check status saved.'},advanced:{de:'Vermietungsphase wurde fortgesetzt.',en:'Letting phase advanced.'},deleted:{de:'Vermietungsvorgang wurde vollständig gelöscht.',en:'Letting process deleted completely.'},open:{de:'Offen',en:'Open'},done:{de:'Erledigt',en:'Done'},na:{de:'Nicht zutreffend',en:'Not applicable'},next:{de:'Nächste Phase',en:'Next phase'},remove:{de:'Vorgang löschen',en:'Delete process'},newProcess:{de:'Neuen Vorgang anlegen',en:'Create new process'}
};
initI18n(I18N);
const phaseNames={A_VIEWING:{de:'A · Besichtigung',en:'A · Viewing'},B_INTEREST:{de:'B · Konkretes Mietinteresse',en:'B · Concrete rental interest'},C_SELECTED:{de:'C · Ausgewählte Vertragspartei',en:'C · Selected future tenant'}};
let project=null,unitId=null;
function reload(){const s=safeLoadProject();project=s.project;updateStoragePill(project,s.error);if(s.error){showFlash(s.error.message,'error');return false;}return true;}
function render(){
 const select=document.querySelector('[data-unit-select]');
 if(!project?.units?.length){select.innerHTML='<option value="">—</option>';select.disabled=true;document.querySelector('[data-processes]').innerHTML='<div class="empty-state"><p>'+escapeText(I18N.noUnits[getLanguage()])+'</p></div>';document.querySelector('[data-create-process]').disabled=true;return;}
 document.querySelector('[data-create-process]').disabled=false;
 if(!unitId||!project.units.some(x=>x.id===unitId))unitId=project.units[0].id;
 select.innerHTML=project.units.map(u=>{const p=project.properties.find(x=>x.id===u.propertyId);return '<option value="'+escapeText(u.id)+'">'+escapeText((p?.label||'Immobilie')+' · '+(u.label||u.id))+'</option>';}).join('');select.value=unitId;
 const processes=listLettingProcesses(project,{unitId}).slice().reverse(),host=document.querySelector('[data-processes]');
 if(!processes.length){host.innerHTML='<div class="empty-state"><p>'+escapeText(I18N.newProcess[getLanguage()])+'</p></div>';return;}
 host.innerHTML=processes.map(proc=>{
   const max=LETTING_PHASES.indexOf(proc.phase);
   const items=LETTING_ITEMS.filter(x=>LETTING_PHASES.indexOf(x.phase)<=max);
   const rows=items.map(item=>'<div class="unit-row"><div><div class="unit-title">'+escapeText(item[getLanguage()]||item.key)+'</div><div class="unit-sub">'+escapeText(phaseNames[item.phase][getLanguage()])+'</div></div><div style="grid-column:auto"><select data-item="'+escapeText(item.key)+'" data-process="'+escapeText(proc.id)+'"><option value="open" '+((proc.states?.[item.key]||'open')==='open'?'selected':'')+'>'+escapeText(I18N.open[getLanguage()])+'</option><option value="done" '+(proc.states?.[item.key]==='done'?'selected':'')+'>'+escapeText(I18N.done[getLanguage()])+'</option><option value="not_applicable" '+(proc.states?.[item.key]==='not_applicable'?'selected':'')+'>'+escapeText(I18N.na[getLanguage()])+'</option></select></div></div>').join('');
   const canAdvance=max<LETTING_PHASES.length-1;
   return '<article class="card"><div class="property-top"><div><div class="property-name">'+escapeText(proc.referenceLabel||('Vorgang '+proc.createdOn))+'</div><div class="property-address">'+escapeText(phaseNames[proc.phase][getLanguage()])+' · DSK 2.0 / Januar 2026</div></div><span class="badge">'+escapeText(proc.createdOn)+'</span></div><div class="unit-list" style="margin-top:14px">'+rows+'</div><div class="form-actions">'+(canAdvance?'<button class="btn btn-primary" type="button" data-advance="'+escapeText(proc.id)+'">'+escapeText(I18N.next[getLanguage()])+'</button>':'')+'<button class="btn btn-danger" type="button" data-delete="'+escapeText(proc.id)+'">'+escapeText(I18N.remove[getLanguage()])+'</button></div></article>';
 }).join('');
 host.querySelectorAll('[data-item]').forEach(sel=>sel.addEventListener('change',()=>saveState(sel)));
 host.querySelectorAll('[data-advance]').forEach(btn=>btn.addEventListener('click',()=>advance(btn.dataset.advance)));
 host.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>remove(btn.dataset.delete)));
}
function create(){
 if(!reload()||!project)return;const unit=project.units.find(x=>x.id===unitId);if(!unit)return;
 const label=document.querySelector('[data-reference-label]').value.trim();
 try{const r=createLettingProcess(project,{processId:newId('letting'),propertyId:unit.propertyId,unitId,createdOn:new Date().toISOString().slice(0,10),referenceLabel:label});saveProject(r.project);project=r.project;document.querySelector('[data-reference-label]').value='';showFlash(I18N.created[getLanguage()]);render();}
 catch(e){reload();showFlash(e.message||'Vorgang konnte nicht angelegt werden.','error');render();}
}
function saveState(sel){
 if(!reload()||!project)return;
 try{const r=setLettingItemState(project,{processId:sel.dataset.process,itemKey:sel.dataset.item,state:sel.value});saveProject(r.project);project=r.project;showFlash(I18N.saved[getLanguage()]);}
 catch(e){reload();showFlash(e.message||'Status konnte nicht gespeichert werden.','error');render();}
}
function advance(id){
 if(!reload()||!project)return;const p=listLettingProcesses(project).find(x=>x.id===id);const next=LETTING_PHASES[LETTING_PHASES.indexOf(p.phase)+1];
 try{const r=advanceLettingPhase(project,{processId:id,nextPhase:next});saveProject(r.project);project=r.project;showFlash(I18N.advanced[getLanguage()]);render();}
 catch(e){reload();showFlash(e.message||'Phase konnte nicht fortgesetzt werden.','error');render();}
}
function remove(id){
 if(!reload()||!project)return;
 try{const r=deleteLettingProcess(project,{processId:id});saveProject(r.project);project=r.project;showFlash(I18N.deleted[getLanguage()]);render();}
 catch(e){reload();showFlash(e.message||'Vorgang konnte nicht gelöscht werden.','error');render();}
}
document.querySelector('[data-unit-select]')?.addEventListener('change',e=>{unitId=e.target.value;render();});
document.querySelector('[data-create-process]')?.addEventListener('click',create);
window.addEventListener('app-language-change',render);
if(reload())render();
