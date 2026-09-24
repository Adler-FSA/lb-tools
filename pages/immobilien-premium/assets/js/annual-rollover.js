/**
 * Nebenkosten Premium — Baustein 6 sicherer Jahreswechsel.
 * Legt ausschließlich eine neue, unbestätigte Abrechnungsperiode an.
 * Keine Kosten, Zahlungen, Messwerte, Verträge oder Bestätigungen werden kopiert.
 */
export const ANNUAL_ROLLOVER_VERSION='B6_ANNUAL_ROLLOVER_V1';
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(v);
const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
  !Number.isNaN(Date.parse(v+'T00:00:00.000Z'))&&new Date(v+'T00:00:00.000Z').toISOString().slice(0,10)===v;
const plusYear=d=>{const y=Number(d.slice(0,4))+1;return String(y).padStart(4,'0')+d.slice(4);};
export class AnnualRolloverError extends Error{constructor(code,message){super(message);this.name='AnnualRolloverError';this.code=code;}}
export function createNextAccountingPeriod(project,{sourcePeriodId,newPeriodId}){
  if(!project||!Array.isArray(project.accountingPeriods))throw new AnnualRolloverError('INVALID_PROJECT','Projektdaten sind unvollständig.');
  if(!validId(newPeriodId))throw new AnnualRolloverError('INVALID_ID','Gültige Kennung für das Folgejahr erforderlich.');
  if(Object.values(project).filter(Array.isArray).some(list=>list.some(x=>x?.id===newPeriodId)))
    throw new AnnualRolloverError('DUPLICATE_ID','Kennung ist bereits vergeben.');
  const source=project.accountingPeriods.find(x=>x.id===sourcePeriodId);
  if(!source||!validDay(source.startDate)||!validDay(source.endDate))
    throw new AnnualRolloverError('SOURCE_PERIOD_REQUIRED','Abgeschlossene Ausgangsperiode wurde nicht gefunden.');
  const startDate=plusYear(source.startDate),endDate=plusYear(source.endDate);
  if(project.accountingPeriods.some(x=>x.propertyId===source.propertyId&&x.id!==source.id&&
      x.startDate<=endDate&&(x.endDate??'9999-12-31')>=startDate))
    throw new AnnualRolloverError('PERIOD_EXISTS','Für diesen Zeitraum existiert bereits eine Abrechnungsperiode.');
  const before={
    expenses:JSON.stringify(project.expenses??[]),
    cashflows:JSON.stringify(project.cashflows??[]),
    readings:JSON.stringify(project.readings??[]),
    meters:JSON.stringify(project.meters??[]),
    tenancies:JSON.stringify(project.tenancies??[]),
    contractTerms:JSON.stringify(project.contractTerms??[])
  };
  const copy=structuredClone(project);
  copy.accountingPeriods.push({
    id:newPeriodId,
    propertyId:source.propertyId,
    startDate,endDate,
    sourcePeriodId:source.id,
    rolloverVersion:ANNUAL_ROLLOVER_VERSION,
    rolloverState:'unconfirmed',
    confirmedTenancyIds:[]
  });
  for(const [name,json] of Object.entries(before)){
    if(JSON.stringify(copy[name]??[])!==json)throw new AnnualRolloverError('MUTATION_GUARD','Jahreswechsel hätte Bestandsdaten verändert.');
  }
  return {project:copy,periodId:newPeriodId,startDate,endDate};
}
