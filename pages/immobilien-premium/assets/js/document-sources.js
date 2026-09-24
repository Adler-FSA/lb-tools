/**
 * Nebenkosten Premium — Baustein 6 Dokumentquellen.
 * Wandelt ausschließlich bereits geprüfte/gespeicherte Projektdaten in neutrale Snapshots.
 * Keine PDF-Erzeugung, keine Rechtsfreigabe.
 */
import {buildOwnerSummary} from './owner-summary.js';
import {previewLandlordPeriod} from './landlord-preview.js';
import {SAFETY_CHECK_TEMPLATES,listSafetyChecks} from './safety-checks.js';
import {LETTING_ITEMS,LETTING_PHASES,listLettingProcesses} from './letting-check.js';

export class DocumentSourceError extends Error{
  constructor(code,message,issues=[]){super(message);this.name='DocumentSourceError';this.code=code;this.issues=issues;}
}
const clone=v=>structuredClone(v);
const specialCategories=new Set(['heating','hot_water','thermal_shared','co2','heating_oil']);
const overlaps=(item,period)=>item.startDate<=period.endDate&&(item.endDate??'9999-12-31')>=period.startDate;
function propertySnapshot(property){
  return {id:property.id,label:property.label||'Immobilie',address:clone(property.address??{})};
}
function periodOf(project,periodId){
  const period=project.accountingPeriods.find(x=>x.id===periodId);
  if(!period||!period.endDate)throw new DocumentSourceError('PERIOD_REQUIRED','Abgeschlossene Abrechnungsperiode wurde nicht gefunden.');
  return period;
}
export function serviceDraftSnapshot(project,sourceDocumentId){
  const doc=project.documents.find(x=>x.id===sourceDocumentId&&x.source==='baustein5-mietservice-v1'&&x.status==='draft');
  if(!doc)throw new DocumentSourceError('SERVICE_DRAFT_REQUIRED','Mietservice-Entwurf wurde nicht gefunden.');
  const property=project.properties.find(x=>x.id===doc.propertyId);
  const unit=project.units.find(x=>x.id===doc.unitId);
  const tenancy=doc.tenancyId?project.tenancies.find(x=>x.id===doc.tenancyId):null;
  if(!property||!unit)throw new DocumentSourceError('CONTEXT_MISMATCH','Dokumentkontext ist unvollständig.');
  return {
    documentType:doc.type,
    title:doc.title||doc.type,
    propertyId:property.id,
    tenancyId:tenancy?.id||null,
    sourceDocumentId:doc.id,
    snapshot:{
      kind:'service_document',
      sourceDocumentId:doc.id,
      property:propertySnapshot(property),
      unit:{id:unit.id,label:unit.label||unit.id,floor:unit.floor||''},
      tenancy:tenancy?{id:tenancy.id,partyLabel:tenancy.partyLabel||tenancy.id,startDate:tenancy.startDate,endDate:tenancy.endDate}:null,
      payload:clone(doc.payload??{}),
      sourceCreatedOn:doc.createdOn||null,
      reviewFlags:clone(doc.reviewFlags??[]),
      legalRelease:false
    }
  };
}
export function ownerAnnualSnapshot(project,{propertyId,periodId}){
  const property=project.properties.find(x=>x.id===propertyId);
  const period=periodOf(project,periodId);
  if(!property||period.propertyId!==propertyId)throw new DocumentSourceError('CONTEXT_MISMATCH','Immobilie und Abrechnungsperiode passen nicht zusammen.');
  const result=buildOwnerSummary(project,propertyId,periodId);
  if(result.status!=='summary'||!result.report)
    throw new DocumentSourceError('OWNER_SUMMARY_BLOCKED','Eigentümer-Jahresübersicht ist noch nicht vollständig prüfbar.',result.issues??[]);
  return {
    documentType:'owner_annual_summary',
    title:`Eigentümer-Jahresübersicht ${period.startDate.slice(0,4)} · ${property.label||'Immobilie'}`,
    propertyId,
    tenancyId:null,
    snapshot:{
      kind:'owner_annual_summary',
      property:propertySnapshot(property),
      period:{id:period.id,startDate:period.startDate,endDate:period.endDate},
      report:clone(result.report),
      issues:clone(result.issues??[]),
      legalRelease:false
    }
  };
}
export function tenantStatementSnapshot(project,{periodId,tenancyId}){
  const period=periodOf(project,periodId);
  const tenancy=project.tenancies.find(x=>x.id===tenancyId);
  const unit=tenancy&&project.units.find(x=>x.id===tenancy.unitId);
  const property=unit&&project.properties.find(x=>x.id===unit.propertyId);
  if(!tenancy||!unit||!property||property.id!==period.propertyId)
    throw new DocumentSourceError('CONTEXT_MISMATCH','Mietverhältnis gehört nicht zur gewählten Abrechnungsperiode.');
  const special=project.expenses.filter(x=>x.propertyId===period.propertyId&&overlaps(x,period)&&specialCategories.has(x.category));
  if(special.length){
    throw new DocumentSourceError(
      'SPECIAL_ANNUAL_RECHECK_REQUIRED',
      'Für dieses Jahr sind Heizungs-, Warmwasser-, CO₂- oder verbundene Kosten vorhanden. Die bestätigten Spezialpläne werden nicht dauerhaft gespeichert; deshalb wird keine verkürzte Mieterabrechnung als PDF freigegeben.',
      special.map(x=>({expenseId:x.id,category:x.category}))
    );
  }
  const result=previewLandlordPeriod(project,periodId);
  if(result.status!=='preview'||!result.report)
    throw new DocumentSourceError('TENANT_STATEMENT_BLOCKED','Mieterabrechnung ist noch nicht vollständig prüfbar.',result.issues??[]);
  const tenant=result.report.tenants.find(x=>x.tenancyId===tenancyId);
  if(!tenant)throw new DocumentSourceError('TENANCY_NOT_IN_PERIOD','Mietverhältnis ist in dieser Abrechnungsperiode nicht enthalten.');
  const expenseMap=new Map(project.expenses.map(x=>[x.id,x]));
  const expenseLines=result.report.expenseLines.map(line=>{
    const share=(line.unitShares??[]).filter(x=>x.tenancyId===tenancyId).reduce((sum,x)=>sum+(Number.isSafeInteger(x.cents)?x.cents:0),0);
    const expense=expenseMap.get(line.expenseId);
    return {
      expenseId:line.expenseId,
      category:line.category,
      invoiceReference:expense?.invoiceReference||'',
      amountCents:line.amountCents,
      method:line.method,
      tenantShareCents:share
    };
  }).filter(x=>x.tenantShareCents!==0);
  const schedule=(result.report.advanceSchedules??[]).find(x=>x.tenancyId===tenancyId)||null;
  return {
    documentType:'tenant_operating_cost_statement',
    title:`Betriebskostenabrechnung ${period.startDate.slice(0,4)} · ${tenancy.partyLabel||unit.label||tenancy.id}`,
    propertyId:property.id,
    tenancyId,
    snapshot:{
      kind:'tenant_operating_cost_statement',
      property:propertySnapshot(property),
      unit:{id:unit.id,label:unit.label||unit.id,floor:unit.floor||''},
      tenancy:{id:tenancy.id,partyLabel:tenancy.partyLabel||tenancy.id,startDate:tenancy.startDate,endDate:tenancy.endDate},
      period:{id:period.id,startDate:period.startDate,endDate:period.endDate},
      tenant:clone(tenant),
      expenseLines,
      advanceSchedule:clone(schedule),
      calculationScope:'standard_allocation_only_no_thermal_or_co2',
      legalRelease:false
    }
  };
}
export function ownerSafetySnapshot(project,{propertyId}){
  const property=project.properties.find(x=>x.id===propertyId);
  if(!property)throw new DocumentSourceError('PROPERTY_REQUIRED','Immobilie wurde nicht gefunden.');
  const labelMap=new Map(SAFETY_CHECK_TEMPLATES.map(x=>[x.key,{de:x.de,en:x.en}]));
  const checks=listSafetyChecks(project,{propertyId}).map(x=>({
    id:x.id,checkKey:x.checkKey,label:labelMap.get(x.checkKey)||{de:x.checkKey,en:x.checkKey},
    classification:x.classification,status:x.status,dueDate:x.dueDate||null,checkedOn:x.checkedOn||null,note:x.note||''
  }));
  return {
    documentType:'owner_safety_overview',
    title:`Eigentümer-Sicherheits- und Pflichtenübersicht · ${property.label||'Immobilie'}`,
    propertyId,tenancyId:null,
    snapshot:{kind:'owner_safety_overview',property:propertySnapshot(property),checks,autoLegalDecision:false,legalRelease:false}
  };
}
export function lettingChecklistSnapshot(project,{processId}){
  const process=listLettingProcesses(project).find(x=>x.id===processId);
  if(!process)throw new DocumentSourceError('PROCESS_REQUIRED','Vermietungsvorgang wurde nicht gefunden.');
  const property=project.properties.find(x=>x.id===process.propertyId);
  const unit=project.units.find(x=>x.id===process.unitId);
  if(!property||!unit)throw new DocumentSourceError('CONTEXT_MISMATCH','Vermietungsvorgang ist unvollständig.');
  const max=LETTING_PHASES.indexOf(process.phase);
  const items=LETTING_ITEMS.filter(x=>LETTING_PHASES.indexOf(x.phase)<=max).map(x=>({
    key:x.key,phase:x.phase,de:x.de,en:x.en,state:process.states?.[x.key]||'open'
  }));
  return {
    documentType:'letting_checklist',
    title:`Vermietungs-Checkliste · ${process.referenceLabel||unit.label||process.id}`,
    propertyId:property.id,tenancyId:null,processId:process.id,
    snapshot:{
      kind:'letting_checklist',property:propertySnapshot(property),
      unit:{id:unit.id,label:unit.label||unit.id,floor:unit.floor||''},
      process:{id:process.id,referenceLabel:process.referenceLabel||'',phase:process.phase,createdOn:process.createdOn,source:process.source},
      items,
      applicantAnswersStored:false,evidenceFilesStored:false,automaticScore:false,automaticSelection:false,
      legalRelease:false
    }
  };
}
