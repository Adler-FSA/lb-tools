/** Nebenkosten Premium — Baustein 5 Bewerber-/Vermietungscheck.
 * Prozesscheck nach DSK-Stufen. Speichert keine Antworten/Nachweise und erzeugt keinen Score.
 */
export const LETTING_PHASES = Object.freeze(['A_VIEWING','B_INTEREST','C_SELECTED']);
export const LETTING_ITEMS = Object.freeze([
  {key:'a_contact_minimum',phase:'A_VIEWING',de:'Nur erforderliche Kontaktdaten für die Besichtigung',en:'Only contact data required for the viewing'},
  {key:'a_wbs_if_social',phase:'A_VIEWING',de:'Bei Sozialwohnung: Wohnberechtigungsschein sachlich prüfen',en:'For social housing: check housing eligibility certificate as applicable'},
  {key:'b_household_size',phase:'B_INTEREST',de:'Anzahl einziehender Personen',en:'Number of persons moving in'},
  {key:'b_wbs_document',phase:'B_INTEREST',de:'Bei Sozialwohnung: erforderlichen WBS-Nachweis',en:'For social housing: required eligibility evidence'},
  {key:'b_employer',phase:'B_INTEREST',de:'Derzeitiger Arbeitgeber, soweit erforderlich',en:'Current employer, where required'},
  {key:'b_occupation',phase:'B_INTEREST',de:'Derzeit ausgeübter Beruf, soweit erforderlich',en:'Current occupation, where required'},
  {key:'b_income_info',phase:'B_INTEREST',de:'Einkommensinformation nur im erforderlichen Umfang',en:'Income information only to the extent required'},
  {key:'b_pets_if_relevant',phase:'B_INTEREST',de:'Tierhaltung nur soweit für das Mietverhältnis relevant',en:'Pets only where relevant to the tenancy'},
  {key:'b_insolvency_open',phase:'B_INTEREST',de:'Laufendes Insolvenzverfahren nur im vorgesehenen Rahmen',en:'Ongoing insolvency only within the permitted scope'},
  {key:'b_eviction_title_5y',phase:'B_INTEREST',de:'Räumungstitel der letzten fünf Jahre nur im vorgesehenen Rahmen',en:'Eviction title within the last five years only within the permitted scope'},
  {key:'c_income_evidence',phase:'C_SELECTED',de:'Einkommens-/Leistungsnachweis erst für ausgewählte Vertragspartei',en:'Income / ability-to-pay evidence only for the selected future tenant'},
  {key:'c_credit_evidence',phase:'C_SELECTED',de:'Bonitätsnachweis nur soweit erforderlich',en:'Creditworthiness evidence only where required'},
  {key:'c_public_payment_proof',phase:'C_SELECTED',de:'Nachweis öffentlicher Mietzahlung nur falls einschlägig',en:'Proof of public rent payment only if applicable'},
  {key:'c_rent_breach',phase:'C_SELECTED',de:'Fragen zu erheblichen Mietzahlungspflichtverletzungen nur im vorgesehenen Rahmen',en:'Questions on significant rent-payment breaches only within the permitted scope'},
  {key:'c_prior_termination',phase:'C_SELECTED',de:'Frühere wirksame Kündigung wegen erheblicher Pflichtverletzung nur im vorgesehenen Rahmen',en:'Prior effective termination for significant breach only within the permitted scope'},
  {key:'c_explanation',phase:'C_SELECTED',de:'Gelegenheit zur sachlichen Erklärung berücksichtigen',en:'Allow an opportunity for a factual explanation'}
]);
const stateValues=Object.freeze(['open','done','not_applicable']);
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(v);
const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 !Number.isNaN(Date.parse(v+'T00:00:00.000Z'))&&new Date(v+'T00:00:00.000Z').toISOString().slice(0,10)===v;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export class LettingCheckError extends Error{constructor(code,message){super(message);this.name='LettingCheckError';this.code=code;}}
function assertProject(p){
 if(!plain(p)||!Array.isArray(p.properties)||!Array.isArray(p.units)||!Array.isArray(p.checkItems)) throw new LettingCheckError('INVALID_PROJECT','Projektdaten sind unvollständig.');
}
function phaseIndex(p){return LETTING_PHASES.indexOf(p);}
function processOf(p,id){
 const x=p.checkItems.find(i=>i.id===id&&i.type==='letting_process');
 if(!x) throw new LettingCheckError('PROCESS_NOT_FOUND','Vermietungsvorgang wurde nicht gefunden.');
 return x;
}
function fresh(p,id){
 if(!validId(id)) throw new LettingCheckError('INVALID_ID','Gültige Vorgangskennung erforderlich.');
 const names=['properties','units','usagePeriods','tenancies','contractTerms','accountingPeriods','expenses','allocationRules','meters','readings','cashflows','documents','checkItems','attachments'];
 if(names.some(n=>(p[n]??[]).some(x=>x?.id===id))) throw new LettingCheckError('DUPLICATE_ID','Kennung ist bereits vergeben.');
}
export function createLettingProcess(project,{processId,propertyId,unitId,createdOn,referenceLabel=''}) {
 assertProject(project); fresh(project,processId);
 const property=project.properties.find(x=>x.id===propertyId), unit=project.units.find(x=>x.id===unitId);
 if(!property||!unit||unit.propertyId!==propertyId) throw new LettingCheckError('CONTEXT_MISMATCH','Immobilie und Einheit passen nicht zusammen.');
 if(!validDay(createdOn)) throw new LettingCheckError('INVALID_DATE','Gültiges Startdatum erforderlich.');
 const copy=structuredClone(project);
 copy.checkItems.push({
   id:processId,type:'letting_process',propertyId,unitId,createdOn,
   referenceLabel:String(referenceLabel||'').trim(),
   phase:'A_VIEWING',states:{},
   source:'DSK-V2-2026-01',
   applicantAnswersStored:false,evidenceFilesStored:false,automaticScore:false,automaticSelection:false
 });
 return {project:copy,processId};
}
export function advanceLettingPhase(project,{processId,nextPhase}){
 assertProject(project);
 const current=processOf(project,processId);
 const from=phaseIndex(current.phase), to=phaseIndex(nextPhase);
 if(to<0||to!==from+1) throw new LettingCheckError('PHASE_SEQUENCE','Vermietungsphasen werden nur Schritt für Schritt vorwärts geführt.');
 const copy=structuredClone(project);
 copy.checkItems.find(x=>x.id===processId).phase=nextPhase;
 return {project:copy,processId,phase:nextPhase};
}
export function setLettingItemState(project,{processId,itemKey,state}){
 assertProject(project);
 if(!stateValues.includes(state)) throw new LettingCheckError('STATE','Ungültiger Checkstatus.');
 const item=LETTING_ITEMS.find(x=>x.key===itemKey);
 if(!item) throw new LettingCheckError('ITEM','Unbekannter Prüfschritt.');
 const current=processOf(project,processId);
 if(phaseIndex(item.phase)>phaseIndex(current.phase)) throw new LettingCheckError('ITEM_TOO_EARLY','Dieser Prüfschritt gehört zu einer späteren Vermietungsphase.');
 const copy=structuredClone(project);
 const target=copy.checkItems.find(x=>x.id===processId);
 target.states={...(target.states??{}),[itemKey]:state};
 return {project:copy,processId,itemKey,state};
}
export function deleteLettingProcess(project,{processId}){
 assertProject(project); processOf(project,processId);
 const copy=structuredClone(project);
 copy.checkItems=copy.checkItems.filter(x=>x.id!==processId);
 return {project:copy,processId};
}
export function listLettingProcesses(project,{unitId=null}={}){
 assertProject(project);
 return project.checkItems.filter(x=>x.type==='letting_process'&&(!unitId||x.unitId===unitId)).map(x=>structuredClone(x));
}
