import {saveProject} from './storage.js';
import {SAFETY_CHECK_TEMPLATES,listSafetyChecks,upsertSafetyCheck} from './safety-checks.js';
import {escapeText,newId,safeLoadProject,showFlash,updateStoragePill} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';

const I18N={
 noProject:{de:'Bitte zuerst eine Immobilie anlegen.',en:'Please create a property first.'},
 saved:{de:'Check wurde gespeichert.',en:'Check saved.'},
 open:{de:'Offen',en:'Open'},review:{de:'Prüfen',en:'Review'},done:{de:'Erledigt',en:'Done'},
 unresolved:{de:'Ungeklärt',en:'Unresolved'},legal:{de:'Gesetzliche Pflicht',en:'Legal obligation'},contract:{de:'Vertragliche Verpflichtung',en:'Contractual obligation'},recommendation:{de:'Empfehlung',en:'Recommendation'},not_applicable:{de:'Nicht zutreffend',en:'Not applicable'},
 classification:{de:'Einordnung',en:'Classification'},status:{de:'Status',en:'Status'},due:{de:'Wiedervorlage',en:'Follow-up'},note:{de:'Notiz / Nachweis',en:'Note / evidence'},save:{de:'Check speichern',en:'Save check'}
};
initI18n(I18N);
let project=null,propertyId=null;
function reload(){const s=safeLoadProject();project=s.project;updateStoragePill(project,s.error);if(s.error){showFlash(s.error.message,'error');return false;}return true;}
function options(map,current){return Object.keys(map).map(k=>'<option value="'+k+'" '+(k===current?'selected':'')+'>'+escapeText(map[k][getLanguage()])+'</option>').join('');}
function render(){
 const select=document.querySelector('[data-property-select]');
 if(!project?.properties?.length){select.innerHTML='<option value="">—</option>';select.disabled=true;document.querySelector('[data-checks]').innerHTML='<div class="empty-state"><p>'+escapeText(I18N.noProject[getLanguage()])+'</p></div>';return;}
 if(!propertyId||!project.properties.some(x=>x.id===propertyId))propertyId=project.properties[0].id;
 select.innerHTML=project.properties.map(p=>'<option value="'+escapeText(p.id)+'">'+escapeText(p.label||p.id)+'</option>').join('');select.value=propertyId;
 const existing=new Map(listSafetyChecks(project,{propertyId}).map(x=>[x.checkKey,x]));
 const classMap={unresolved:I18N.unresolved,legal:I18N.legal,contract:I18N.contract,recommendation:I18N.recommendation,not_applicable:I18N.not_applicable};
 const statusMap={open:I18N.open,review:I18N.review,done:I18N.done};
 document.querySelector('[data-checks]').innerHTML=SAFETY_CHECK_TEMPLATES.map(t=>{const x=existing.get(t.key)||{};return '<article class="card" data-check-card="'+escapeText(t.key)+'"><div class="eyebrow">'+escapeText(t[getLanguage()])+'</div><div class="form-grid" style="margin-top:14px"><div><label>'+escapeText(I18N.classification[getLanguage()])+'</label><select name="classification">'+options(classMap,x.classification||'unresolved')+'</select></div><div><label>'+escapeText(I18N.status[getLanguage()])+'</label><select name="status">'+options(statusMap,x.status||'open')+'</select></div><div><label>'+escapeText(I18N.due[getLanguage()])+'</label><input type="date" name="dueDate" value="'+escapeText(x.dueDate||'')+'"></div><div class="full"><label>'+escapeText(I18N.note[getLanguage()])+'</label><textarea name="note">'+escapeText(x.note||'')+'</textarea></div></div><div class="form-actions"><button class="btn btn-primary" type="button" data-save-check>'+escapeText(I18N.save[getLanguage()])+'</button></div></article>';}).join('');
 document.querySelectorAll('[data-save-check]').forEach(btn=>btn.addEventListener('click',()=>saveCard(btn.closest('[data-check-card]'))));
}
function saveCard(card){
 if(!reload()||!project)return;const key=card.dataset.checkCard;const fd=new FormData();const classification=card.querySelector('[name="classification"]').value,status=card.querySelector('[name="status"]').value,dueDate=card.querySelector('[name="dueDate"]').value||null,note=card.querySelector('[name="note"]').value;
 try{const existing=listSafetyChecks(project,{propertyId}).find(x=>x.checkKey===key);const r=upsertSafetyCheck(project,{itemId:existing?.id||newId('check'),propertyId,checkKey:key,classification,status,dueDate,note,checkedOn:new Date().toISOString().slice(0,10)});saveProject(r.project);project=r.project;showFlash(I18N.saved[getLanguage()]);render();}
 catch(e){reload();showFlash(e.message||'Check konnte nicht gespeichert werden.','error');render();}
}
document.querySelector('[data-property-select]')?.addEventListener('change',e=>{propertyId=e.target.value;render();});
window.addEventListener('app-language-change',render);
if(reload())render();
