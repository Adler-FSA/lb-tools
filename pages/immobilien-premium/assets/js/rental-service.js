/** Nebenkosten Premium — Baustein 5 Mietservice.
 * Reine Entwurfslogik: keine Rechtsfreigabe, kein PDF, keine Buchung.
 */
export const RENTAL_DOCUMENT_TYPES = Object.freeze([
  'lease_draft','house_rules','waste_info','handover_protocol','tenant_service_sheet'
]);
export const TENANCY_DOCUMENT_TYPES = Object.freeze([
  'lease_draft','handover_protocol','tenant_service_sheet'
]);

const validId = v => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(v);
const validDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v + 'T00:00:00.000Z')) &&
  new Date(v + 'T00:00:00.000Z').toISOString().slice(0,10) === v;
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const cents = v => Number.isSafeInteger(v) && v >= 0;

export class RentalServiceError extends Error {
  constructor(code, message){ super(message); this.name='RentalServiceError'; this.code=code; }
}

function assertProject(project){
  if (!plain(project) || !Array.isArray(project.documents) || !Array.isArray(project.properties) ||
      !Array.isArray(project.units) || !Array.isArray(project.tenancies)) {
    throw new RentalServiceError('INVALID_PROJECT','Projektdaten sind unvollständig.');
  }
}
function assertFreshId(project,id){
  if (!validId(id)) throw new RentalServiceError('INVALID_ID','Gültige Dokumentkennung erforderlich.');
  for (const name of ['properties','units','usagePeriods','tenancies','contractTerms','accountingPeriods',
    'expenses','allocationRules','meters','readings','cashflows','documents','checkItems','attachments']) {
    if ((project[name] ?? []).some(x => x?.id === id)) throw new RentalServiceError('DUPLICATE_ID','Kennung ist bereits vergeben.');
  }
}
function context(project,{propertyId,unitId,tenancyId=null}){
  const property = project.properties.find(x => x.id===propertyId);
  const unit = project.units.find(x => x.id===unitId);
  if (!property || !unit || unit.propertyId!==propertyId) {
    throw new RentalServiceError('CONTEXT_MISMATCH','Immobilie und Einheit passen nicht zusammen.');
  }
  let tenancy=null;
  if (tenancyId) {
    tenancy=project.tenancies.find(x=>x.id===tenancyId);
    if (!tenancy || tenancy.unitId!==unitId) {
      throw new RentalServiceError('TENANCY_MISMATCH','Mietverhältnis gehört nicht zur gewählten Einheit.');
    }
  }
  return {property,unit,tenancy};
}
function cleanFields(fields){
  if (!plain(fields)) throw new RentalServiceError('FIELDS_REQUIRED','Dokumentangaben fehlen.');
  let copy;
  try { copy=structuredClone(fields); JSON.stringify(copy); }
  catch { throw new RentalServiceError('FIELDS_INVALID','Dokumentangaben müssen als JSON-Daten speicherbar sein.'); }
  for (const key of ['baseRentCents','operatingCostCents','depositCents']) {
    if (copy[key] !== undefined && !cents(copy[key])) {
      throw new RentalServiceError('INVALID_MONEY','Geldbeträge müssen als nichtnegative ganze Centwerte gespeichert werden.');
    }
  }
  return copy;
}

export function leaseReviewFlags(fields={}){
  const flags=[];
  if (fields.depositCents !== undefined) {
    if (!cents(fields.depositCents)) flags.push('deposit_invalid');
    else if (!cents(fields.baseRentCents) || fields.baseRentCents===0) flags.push('base_rent_required_for_deposit_check');
    else if (fields.depositCents > fields.baseRentCents*3) flags.push('deposit_above_three_net_rents');
  }
  if (!['advance','flat','unresolved',undefined].includes(fields.operatingCostsModel)) {
    flags.push('operating_cost_model_invalid');
  }
  return flags;
}

export function createRentalDocumentDraft(project,{
  documentId,type,propertyId,unitId,tenancyId=null,title='',fields={},createdOn
}){
  assertProject(project); assertFreshId(project,documentId);
  if (!RENTAL_DOCUMENT_TYPES.includes(type)) {
    throw new RentalServiceError('DOCUMENT_TYPE','Unbekannter Mietservice-Dokumenttyp.');
  }
  if (TENANCY_DOCUMENT_TYPES.includes(type) && !tenancyId) {
    throw new RentalServiceError('TENANCY_REQUIRED','Für diesen Entwurf ist ein konkretes Mietverhältnis erforderlich.');
  }
  if (!validDay(createdOn)) throw new RentalServiceError('INVALID_DATE','Gültiges Erstelldatum erforderlich.');
  context(project,{propertyId,unitId,tenancyId});
  const payload=cleanFields(fields);
  const reviewFlags = type==='lease_draft' ? leaseReviewFlags(payload) : [];
  const copy=structuredClone(project);
  copy.documents.push({
    id:documentId,type,status:'draft',propertyId,unitId,
    ...(tenancyId?{tenancyId}:{}),
    title:String(title||'').trim() || type,
    createdOn,
    source:'baustein5-mietservice-v1',
    payload,
    reviewFlags,
    legalRelease:false,
    pdfGenerated:false
  });
  return {project:copy,documentId,reviewFlags};
}

export function deleteRentalDocumentDraft(project,{documentId}){
  assertProject(project);
  const index=project.documents.findIndex(x=>x.id===documentId);
  if (index<0) throw new RentalServiceError('DOCUMENT_NOT_FOUND','Dokumententwurf wurde nicht gefunden.');
  const doc=project.documents[index];
  if (!RENTAL_DOCUMENT_TYPES.includes(doc.type) || doc.source!=='baustein5-mietservice-v1') {
    throw new RentalServiceError('FOREIGN_DOCUMENT','Nur Mietservice-Entwürfe dieses Bausteins können hier entfernt werden.');
  }
  if (doc.status==='released') throw new RentalServiceError('RELEASED_IMMUTABLE','Freigegebene Dokumente werden nicht entfernt.');
  const copy=structuredClone(project);
  copy.documents.splice(index,1);
  return {project:copy,documentId};
}

export function listRentalDocuments(project,{propertyId=null,unitId=null}={}){
  assertProject(project);
  return project.documents.filter(doc =>
    RENTAL_DOCUMENT_TYPES.includes(doc.type) &&
    doc.source==='baustein5-mietservice-v1' &&
    (!propertyId || doc.propertyId===propertyId) &&
    (!unitId || doc.unitId===unitId)
  ).map(x=>structuredClone(x));
}
