/** Nebenkosten Premium — Baustein 5 Eigentümer-Sicherheits- und Pflichtencheck.
 * Keine automatische Rechtsklassifizierung.
 */
export const SAFETY_CHECK_TEMPLATES = Object.freeze([
  {key:'building_insurance',de:'Wohngebäudeversicherung',en:'Building insurance'},
  {key:'elementary_cover',de:'Elementarschutz',en:'Natural hazards cover'},
  {key:'property_liability',de:'Gebäude-/Grundstückshaftpflicht',en:'Property liability'},
  {key:'financing_requirements',de:'Vorgaben aus Finanzierung/Darlehen',en:'Financing / loan requirements'},
  {key:'owner_household_contents',de:'Eigene Hausratabsicherung',en:'Owner household contents cover'},
  {key:'special_systems',de:'Besondere Anlagen und technische Einrichtungen',en:'Special systems and technical equipment'},
  {key:'energy_certificate',de:'Energieausweis und Gültigkeit',en:'Energy certificate and validity'},
  {key:'maintenance',de:'Wartungen und wiederkehrende Prüfungen',en:'Maintenance and recurring inspections'},
  {key:'regional_obligations',de:'Landes-/örtliche Gebäudeanforderungen',en:'State / local building requirements'}
]);
export const CHECK_CLASSIFICATIONS = Object.freeze(['unresolved','legal','contract','recommendation','not_applicable']);
export const CHECK_STATUSES = Object.freeze(['open','review','done']);

const validId=v=>typeof v==='string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(v);
const validDay=v=>typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v+'T00:00:00.000Z')) &&
  new Date(v+'T00:00:00.000Z').toISOString().slice(0,10)===v;
const plain=v=>v!==null && typeof v==='object' && !Array.isArray(v);
export class SafetyCheckError extends Error{
  constructor(code,message){super(message);this.name='SafetyCheckError';this.code=code;}
}
function assertProject(p){
  if(!plain(p)||!Array.isArray(p.properties)||!Array.isArray(p.checkItems)) throw new SafetyCheckError('INVALID_PROJECT','Projektdaten sind unvollständig.');
}
function template(key){return SAFETY_CHECK_TEMPLATES.find(x=>x.key===key);}
function fresh(p,id){
  if(!validId(id)) throw new SafetyCheckError('INVALID_ID','Gültige Check-Kennung erforderlich.');
  const names=['properties','units','usagePeriods','tenancies','contractTerms','accountingPeriods','expenses','allocationRules','meters','readings','cashflows','documents','checkItems','attachments'];
  if(names.some(n=>(p[n]??[]).some(x=>x?.id===id))) throw new SafetyCheckError('DUPLICATE_ID','Kennung ist bereits vergeben.');
}
export function upsertSafetyCheck(project,{
  itemId,propertyId,checkKey,classification='unresolved',status='open',note='',dueDate=null,checkedOn=null
}){
  assertProject(project);
  if(!project.properties.some(x=>x.id===propertyId)) throw new SafetyCheckError('PROPERTY_REQUIRED','Immobilie wurde nicht gefunden.');
  if(!template(checkKey)) throw new SafetyCheckError('CHECK_TYPE','Unbekannter Prüfeintrag.');
  if(!CHECK_CLASSIFICATIONS.includes(classification)) throw new SafetyCheckError('CLASSIFICATION','Prüfart auswählen.');
  if(!CHECK_STATUSES.includes(status)) throw new SafetyCheckError('STATUS','Prüfstatus auswählen.');
  if(dueDate!==null && !validDay(dueDate)) throw new SafetyCheckError('DUE_DATE','Wiedervorlage benötigt ein gültiges Datum.');
  if(checkedOn!==null && !validDay(checkedOn)) throw new SafetyCheckError('CHECKED_DATE','Prüfdatum ist ungültig.');
  const existing=project.checkItems.find(x=>x.type==='owner_safety'&&x.propertyId===propertyId&&x.checkKey===checkKey);
  const copy=structuredClone(project);
  let target;
  if(existing){
    target=copy.checkItems.find(x=>x.id===existing.id);
  } else {
    fresh(project,itemId);
    target={id:itemId,type:'owner_safety',propertyId,checkKey,source:'baustein5-safety-v1'};
    copy.checkItems.push(target);
  }
  target.classification=classification;
  target.status=classification==='not_applicable'?'done':status;
  target.note=String(note||'').trim();
  target.dueDate=dueDate;
  target.checkedOn=checkedOn;
  target.autoLegalDecision=false;
  return {project:copy,itemId:target.id};
}
export function listSafetyChecks(project,{propertyId}){
  assertProject(project);
  return project.checkItems.filter(x=>x.type==='owner_safety'&&x.propertyId===propertyId).map(x=>structuredClone(x));
}
