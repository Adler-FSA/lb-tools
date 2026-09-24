import {loadProject,saveProject} from './storage.js';
import {createRentalDocumentDraft,deleteRentalDocumentDraft,listRentalDocuments} from './rental-service.js';
import {escapeText,newId,safeLoadProject,showFlash,updateStoragePill} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';

const I18N={
 title:{de:'Mietservice',en:'Tenant service'},
 saved:{de:'Entwurf wurde lokal gespeichert.',en:'Draft saved locally.'},
 deleted:{de:'Entwurf wurde gelöscht.',en:'Draft deleted.'},
 noProject:{de:'Bitte zuerst eine Immobilie und mindestens eine Einheit anlegen.',en:'Please create a property and at least one unit first.'},
 noDrafts:{de:'Für diese Einheit gibt es noch keine Mietservice-Entwürfe.',en:'There are no tenant-service drafts for this unit yet.'},
 draft:{de:'Entwurf',en:'Draft'},
 delete:{de:'Entwurf löschen',en:'Delete draft'},
 review:{de:'Prüfhinweis',en:'Review note'},
 depositFlag:{de:'Kaution liegt über drei Nettokaltmieten und muss vor einer späteren Freigabe korrigiert oder fachlich geprüft werden.',en:'The deposit exceeds three net base rents and must be corrected or professionally reviewed before any later release.'}
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
