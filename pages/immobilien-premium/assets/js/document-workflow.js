/**
 * Nebenkosten Premium — Baustein 6 Dokumentworkflow.
 * Reine Snapshot-/Versionslogik. Keine PDF-Erzeugung und keine Rechtsentscheidung.
 */
export const DOCUMENT_WORKFLOW_VERSION='B6_DOCUMENT_WORKFLOW_V1';
export const RELEASE_CONFIRMATION='RELEASE_SNAPSHOT';

const validId=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(v);
const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
  !Number.isNaN(Date.parse(v+'T00:00:00.000Z'))&&new Date(v+'T00:00:00.000Z').toISOString().slice(0,10)===v;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>structuredClone(v);

export const DOCUMENT_TYPES=Object.freeze([
  'owner_annual_summary',
  'tenant_operating_cost_statement',
  'lease_draft',
  'house_rules',
  'waste_info',
  'handover_protocol',
  'tenant_service_sheet',
  'owner_safety_overview',
  'letting_checklist'
]);

export class DocumentWorkflowError extends Error{
  constructor(code,message){super(message);this.name='DocumentWorkflowError';this.code=code;}
}
function assertProject(project){
  if(!plain(project)||!Array.isArray(project.documents)||!Array.isArray(project.checkItems))
    throw new DocumentWorkflowError('INVALID_PROJECT','Projektdaten sind unvollständig.');
}
function freshId(project,id){
  if(!validId(id))throw new DocumentWorkflowError('INVALID_ID','Gültige Dokumentkennung erforderlich.');
  const names=['properties','units','usagePeriods','tenancies','contractTerms','accountingPeriods','expenses',
    'allocationRules','meters','readings','cashflows','documents','checkItems','attachments'];
  if(names.some(n=>(project[n]??[]).some(x=>x?.id===id)))
    throw new DocumentWorkflowError('DUPLICATE_ID','Kennung ist bereits vergeben.');
}
function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(plain(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export function snapshotHash(snapshot){
  const text=canonical(snapshot);let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  return 'fnv1a32-'+h.toString(16).padStart(8,'0');
}
function seriesKey({documentType,propertyId=null,tenancyId=null,sourceDocumentId=null,processId=null}){
  return [documentType,propertyId||'-',tenancyId||'-',sourceDocumentId||'-',processId||'-'].join(':');
}
function nextVersion(project,key){
  return 1+project.documents.filter(x=>x?.seriesKey===key&&Number.isSafeInteger(x.version)).reduce((m,x)=>Math.max(m,x.version),0);
}
function cleanSnapshot(snapshot){
  if(!plain(snapshot))throw new DocumentWorkflowError('SNAPSHOT_REQUIRED','Dokument-Snapshot fehlt.');
  let copy;
  try{copy=clone(snapshot);const json=JSON.stringify(copy);if(!json||json.length>1_500_000)throw Error();}
  catch{throw new DocumentWorkflowError('SNAPSHOT_INVALID','Dokument-Snapshot ist nicht sicher speicherbar.');}
  return copy;
}
export function prepareReviewDocument(project,{
  documentId,documentType,title,createdOn,snapshot,
  propertyId=null,tenancyId=null,sourceDocumentId=null,processId=null,
  legalReviewRequired=false
}){
  assertProject(project);freshId(project,documentId);
  if(!DOCUMENT_TYPES.includes(documentType))throw new DocumentWorkflowError('DOCUMENT_TYPE','Unbekannter Dokumenttyp.');
  if(!validDay(createdOn))throw new DocumentWorkflowError('INVALID_DATE','Gültiges Erstelldatum erforderlich.');
  if(propertyId!==null&&!project.properties?.some(x=>x.id===propertyId))
    throw new DocumentWorkflowError('PROPERTY_REQUIRED','Immobilie wurde nicht gefunden.');
  if(tenancyId!==null&&!project.tenancies?.some(x=>x.id===tenancyId))
    throw new DocumentWorkflowError('TENANCY_REQUIRED','Mietverhältnis wurde nicht gefunden.');
  if(tenancyId!==null){
    const t=project.tenancies.find(x=>x.id===tenancyId);
    const u=project.units?.find(x=>x.id===t.unitId);
    if(propertyId&&u?.propertyId!==propertyId)throw new DocumentWorkflowError('CONTEXT_MISMATCH','Mietverhältnis gehört zu einer anderen Immobilie.');
  }
  const snap=cleanSnapshot(snapshot);
  const key=seriesKey({documentType,propertyId,tenancyId,sourceDocumentId,processId});
  const version=nextVersion(project,key);
  const copy=clone(project);
  copy.documents.push({
    id:documentId,
    kind:'document_snapshot',
    documentType,
    status:'review',
    title:String(title||documentType).trim().slice(0,240),
    createdOn,
    propertyId:propertyId||null,
    tenancyId:tenancyId||null,
    sourceDocumentId:sourceDocumentId||null,
    processId:processId||null,
    seriesKey:key,
    version,
    snapshot:snap,
    snapshotHash:snapshotHash(snap),
    workflowVersion:DOCUMENT_WORKFLOW_VERSION,
    legalReviewRequired:legalReviewRequired===true,
    legalApproval:false,
    pdfGenerated:false
  });
  return {project:copy,documentId,version,snapshotHash:snapshotHash(snap)};
}
export function releaseReviewDocument(project,{documentId,releasedOn,confirmation}){
  assertProject(project);
  if(confirmation!==RELEASE_CONFIRMATION)
    throw new DocumentWorkflowError('CONFIRMATION_REQUIRED','Freigabe des fixierten Datenstands muss ausdrücklich bestätigt werden.');
  if(!validDay(releasedOn))throw new DocumentWorkflowError('INVALID_DATE','Gültiges Freigabedatum erforderlich.');
  const current=project.documents.find(x=>x.id===documentId);
  if(!current||current.kind!=='document_snapshot')throw new DocumentWorkflowError('DOCUMENT_NOT_FOUND','Dokumentenfassung wurde nicht gefunden.');
  if(current.status!=='review')throw new DocumentWorkflowError('DOCUMENT_STATUS','Nur eine Prüffassung kann freigegeben werden.');
  if(!plain(current.snapshot)||snapshotHash(current.snapshot)!==current.snapshotHash)
    throw new DocumentWorkflowError('SNAPSHOT_CHANGED','Der vorbereitete Snapshot wurde verändert und muss neu erzeugt werden.');
  const copy=clone(project),target=copy.documents.find(x=>x.id===documentId);
  target.status='released';
  target.releasedOn=releasedOn;
  target.releasedSnapshotHash=target.snapshotHash;
  target.releaseScope='data_snapshot_release_only';
  target.legalApproval=false;
  target.pdfGenerated=false;
  return {project:copy,documentId,version:target.version};
}
export function createRevisionFromReleased(project,{releasedDocumentId,newDocumentId,createdOn}){
  assertProject(project);freshId(project,newDocumentId);
  const source=project.documents.find(x=>x.id===releasedDocumentId);
  if(!source||source.kind!=='document_snapshot'||source.status!=='released')
    throw new DocumentWorkflowError('RELEASED_SOURCE_REQUIRED','Freigegebene Ausgangsfassung wurde nicht gefunden.');
  if(!validDay(createdOn))throw new DocumentWorkflowError('INVALID_DATE','Gültiges Erstelldatum erforderlich.');
  const copy=clone(project);
  const version=nextVersion(project,source.seriesKey);
  copy.documents.push({
    ...clone(source),
    id:newDocumentId,
    status:'review',
    createdOn,
    releasedOn:undefined,
    releasedSnapshotHash:undefined,
    version,
    previousVersionId:source.id,
    snapshot:clone(source.snapshot),
    snapshotHash:snapshotHash(source.snapshot),
    legalApproval:false,
    pdfGenerated:false
  });
  return {project:copy,documentId:newDocumentId,version};
}
export function deleteReviewDocument(project,{documentId}){
  assertProject(project);
  const doc=project.documents.find(x=>x.id===documentId);
  if(!doc||doc.kind!=='document_snapshot')throw new DocumentWorkflowError('DOCUMENT_NOT_FOUND','Dokumentenfassung wurde nicht gefunden.');
  if(doc.status==='released')throw new DocumentWorkflowError('RELEASED_IMMUTABLE','Freigegebene Fassungen werden nicht gelöscht.');
  const copy=clone(project);copy.documents=copy.documents.filter(x=>x.id!==documentId);return {project:copy,documentId};
}
export function recordDocumentDelivery(project,{itemId,documentId,deliveredOn,channel='other',note=''}){
  assertProject(project);freshId(project,itemId);
  if(!validDay(deliveredOn))throw new DocumentWorkflowError('INVALID_DATE','Gültiges Übergabedatum erforderlich.');
  if(!['email','paper','portal','personal','other'].includes(channel))
    throw new DocumentWorkflowError('DELIVERY_CHANNEL','Unbekannter Übergabeweg.');
  const doc=project.documents.find(x=>x.id===documentId&&x.kind==='document_snapshot'&&x.status==='released');
  if(!doc)throw new DocumentWorkflowError('RELEASED_SOURCE_REQUIRED','Nur eine freigegebene Fassung kann als übergeben dokumentiert werden.');
  const copy=clone(project);copy.checkItems.push({
    id:itemId,type:'document_delivery',documentId,deliveredOn,channel,
    note:String(note||'').trim().slice(0,2000),source:'baustein6-document-workflow-v1',status:'done'
  });
  return {project:copy,itemId,documentId};
}
export function listDocumentArchive(project,{propertyId=null,tenancyId=null}={}){
  assertProject(project);
  const deliveries=new Map();
  for(const item of project.checkItems.filter(x=>x.type==='document_delivery')){
    const list=deliveries.get(item.documentId)||[];list.push(clone(item));deliveries.set(item.documentId,list);
  }
  return project.documents.filter(x=>x.kind==='document_snapshot'&&
    (!propertyId||x.propertyId===propertyId)&&(!tenancyId||x.tenancyId===tenancyId))
    .map(doc=>({...clone(doc),deliveries:(deliveries.get(doc.id)||[]).sort((a,b)=>a.deliveredOn.localeCompare(b.deliveredOn))}))
    .sort((a,b)=>(b.releasedOn||b.createdOn||'').localeCompare(a.releasedOn||a.createdOn||'')||b.version-a.version);
}
export function safeDocumentFilename(document,{date=document.releasedOn||document.createdOn||'Dokument'}={}){
  const source=String(document?.title||document?.documentType||'Dokument').replace(/ß/g,'ss').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'Dokument';
  const version=Number.isSafeInteger(document?.version)?'_V'+document.version:'';
  return `${source}${version}_${String(date).replace(/[^0-9-]/g,'')}.pdf`;
}
