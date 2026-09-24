/**
 * Nebenkosten Premium — Baustein 5: Mietservice & Checks.
 * Reiner Fachkern ohne DOM-Zugriff, PDF-Erzeugung oder automatische Rechtsentscheidung.
 * Bewerberprozess: datensparsame Stufen A/B/C; keine Bewertung, kein Score.
 */

export const SERVICE_DRAFT_TYPES = Object.freeze([
  'lease_draft',
  'house_rules',
  'waste_info',
  'handover_protocol',
  'tenant_service_sheet'
]);

export const OWNER_CHECK_TOPICS = Object.freeze([
  'building_insurance',
  'elemental_cover',
  'property_liability',
  'financing_requirements',
  'owner_contents',
  'special_systems',
  'energy_certificate',
  'maintenance_other'
]);

export const OWNER_CHECK_CLASSIFICATIONS = Object.freeze([
  'statutory',
  'contractual',
  'recommendation',
  'unresolved',
  'not_applicable'
]);

export const OWNER_CHECK_STATUSES = Object.freeze([
  'open',
  'review',
  'done',
  'not_applicable'
]);

export const APPLICANT_STAGES = Object.freeze(['A', 'B', 'C']);

const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validDay = value => {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};
const clone = project => JSON.parse(JSON.stringify(project));

function requireProject(project) {
  if (!plain(project) || !Array.isArray(project.documents) || !Array.isArray(project.checkItems)) {
    throw new TypeError('Gültiges Nebenkosten-Premium-Projekt erforderlich.');
  }
}

function requireNewId(project, id) {
  if (!validId(id)) throw new TypeError('Gültige stabile Kennung erforderlich.');
  const collections = Object.values(project).filter(Array.isArray);
  if (collections.some(list => list.some(item => item?.id === id))) {
    throw new Error('Kennung ist im Projekt bereits vergeben.');
  }
}

function propertyExists(project, propertyId) {
  return validId(propertyId) && project.properties?.some(item => item.id === propertyId);
}

function unitExists(project, unitId) {
  return validId(unitId) && project.units?.some(item => item.id === unitId);
}

function tenancyExists(project, tenancyId) {
  return validId(tenancyId) && project.tenancies?.some(item => item.id === tenancyId);
}

function propertyForTenancy(project, tenancyId) {
  const tenancy = project.tenancies?.find(item => item.id === tenancyId);
  const unit = tenancy && project.units?.find(item => item.id === tenancy.unitId);
  return unit?.propertyId ?? null;
}

function assertFields(fields) {
  if (!plain(fields)) throw new TypeError('Dokumentdaten müssen ein Objekt sein.');
  const serialized = JSON.stringify(fields);
  if (typeof serialized !== 'string' || serialized.length > 100000) {
    throw new TypeError('Dokumentdaten sind zu groß oder nicht serialisierbar.');
  }
}

function documentScope(project, type, propertyId, tenancyId) {
  const needsTenancy = ['lease_draft', 'handover_protocol', 'tenant_service_sheet'].includes(type);
  const needsProperty = ['house_rules', 'waste_info'].includes(type);

  if (needsTenancy) {
    if (!tenancyExists(project, tenancyId)) throw new Error('Für diesen Entwurf ist ein gültiges Mietverhältnis erforderlich.');
    const inferredPropertyId = propertyForTenancy(project, tenancyId);
    if (!inferredPropertyId) throw new Error('Immobilie des Mietverhältnisses konnte nicht ermittelt werden.');
    if (propertyId && propertyId !== inferredPropertyId) throw new Error('Mietverhältnis gehört zu einer anderen Immobilie.');
    return { propertyId: inferredPropertyId, tenancyId };
  }

  if (needsProperty) {
    if (!propertyExists(project, propertyId)) throw new Error('Für diesen Entwurf ist eine gültige Immobilie erforderlich.');
    return { propertyId };
  }

  throw new Error('Unbekannter Dokumenttyp.');
}

export function addServiceDraft(project, {
  id,
  type,
  propertyId = null,
  tenancyId = null,
  title = '',
  fields = {},
  createdOn
}) {
  requireProject(project);
  requireNewId(project, id);
  if (!SERVICE_DRAFT_TYPES.includes(type)) throw new Error('Nicht unterstützter Mietservice-Entwurf.');
  if (!validDay(createdOn) || !createdOn) throw new TypeError('Gültiges Erstelldatum erforderlich.');
  assertFields(fields);

  const scope = documentScope(project, type, propertyId, tenancyId);
  const next = clone(project);
  next.documents.push({
    id,
    kind: 'service_draft',
    documentType: type,
    status: 'draft',
    templateVersion: 'b5-draft-v1',
    sourceSchemaVersion: project.schemaVersion,
    ...scope,
    title: String(title || '').trim().slice(0, 200),
    fields: clone(fields),
    createdOn,
    updatedOn: createdOn,
    legalReviewRequired: true,
    pdfGenerated: false
  });
  return next;
}

export function removeServiceDraft(project, documentId) {
  requireProject(project);
  const document = project.documents.find(item => item.id === documentId);
  if (!document || document.kind !== 'service_draft') throw new Error('Mietservice-Entwurf nicht gefunden.');
  if (document.status === 'released') throw new Error('Freigegebene Dokumente dürfen nicht gelöscht werden.');
  const next = clone(project);
  next.documents = next.documents.filter(item => item.id !== documentId);
  return next;
}

export function addOwnerCheck(project, {
  id,
  propertyId,
  topic,
  classification = 'unresolved',
  status = 'open',
  evidenceRef = '',
  note = '',
  reviewOn = null,
  createdOn
}) {
  requireProject(project);
  requireNewId(project, id);
  if (!propertyExists(project, propertyId)) throw new Error('Gültige Immobilie erforderlich.');
  if (!OWNER_CHECK_TOPICS.includes(topic)) throw new Error('Unbekanntes Prüfthema.');
  if (!OWNER_CHECK_CLASSIFICATIONS.includes(classification)) throw new Error('Unbekannte Einordnung.');
  if (!OWNER_CHECK_STATUSES.includes(status)) throw new Error('Unbekannter Prüfstatus.');
  if (!validDay(reviewOn) || !validDay(createdOn) || !createdOn) throw new TypeError('Ungültiges Wiedervorlage- oder Erstelldatum.');

  const next = clone(project);
  next.checkItems.push({
    id,
    kind: 'owner_safety_check',
    propertyId,
    topic,
    classification,
    status,
    evidenceRef: String(evidenceRef || '').trim().slice(0, 500),
    note: String(note || '').trim().slice(0, 4000),
    reviewOn: reviewOn || null,
    createdOn,
    updatedOn: createdOn
  });
  return next;
}

export function updateOwnerCheck(project, {
  checkId,
  classification,
  status,
  evidenceRef,
  note,
  reviewOn,
  updatedOn
}) {
  requireProject(project);
  const current = project.checkItems.find(item => item.id === checkId && item.kind === 'owner_safety_check');
  if (!current) throw new Error('Eigentümer-Check nicht gefunden.');
  if (classification != null && !OWNER_CHECK_CLASSIFICATIONS.includes(classification)) throw new Error('Unbekannte Einordnung.');
  if (status != null && !OWNER_CHECK_STATUSES.includes(status)) throw new Error('Unbekannter Prüfstatus.');
  if (!validDay(reviewOn) || !validDay(updatedOn) || !updatedOn) throw new TypeError('Ungültiges Datum.');

  const next = clone(project);
  const item = next.checkItems.find(entry => entry.id === checkId);
  if (classification != null) item.classification = classification;
  if (status != null) item.status = status;
  if (evidenceRef != null) item.evidenceRef = String(evidenceRef).trim().slice(0, 500);
  if (note != null) item.note = String(note).trim().slice(0, 4000);
  if (reviewOn !== undefined) item.reviewOn = reviewOn || null;
  item.updatedOn = updatedOn;
  return next;
}

const APPLICANT_ALLOWED_FIELDS = Object.freeze({
  A: new Set(['contactReference', 'appointmentOn', 'wbsRelevant', 'wbsConfirmed', 'note']),
  B: new Set([
    'contactReference', 'appointmentOn', 'wbsRelevant', 'wbsConfirmed', 'note',
    'moveInOn', 'occupantsCount', 'occupation', 'employer',
    'incomeThresholdConfirmed', 'availableMonthlyCents', 'petsRequiringApproval'
  ]),
  C: new Set([
    'contactReference', 'appointmentOn', 'wbsRelevant', 'wbsConfirmed', 'note',
    'moveInOn', 'occupantsCount', 'occupation', 'employer',
    'incomeThresholdConfirmed', 'availableMonthlyCents', 'petsRequiringApproval',
    'incomeProofRef', 'creditProofRef', 'proofReviewedOn'
  ])
});

function cleanApplicantData(stage, data) {
  if (!plain(data)) throw new TypeError('Bewerberdaten müssen ein Objekt sein.');
  const allowed = APPLICANT_ALLOWED_FIELDS[stage];
  const unexpected = Object.keys(data).filter(key => !allowed.has(key));
  if (unexpected.length) throw new Error(`Datenfeld in Stufe ${stage} nicht vorgesehen: ${unexpected[0]}`);

  const output = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || value == null) continue;
    if (['appointmentOn', 'moveInOn', 'proofReviewedOn'].includes(key) && !validDay(value)) {
      throw new TypeError(`Ungültiges Datum in ${key}.`);
    }
    if (key === 'occupantsCount') {
      if (!Number.isSafeInteger(value) || value < 1 || value > 50) throw new TypeError('Personenzahl ist ungültig.');
      output[key] = value;
      continue;
    }
    if (key === 'availableMonthlyCents') {
      if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Verfügbarer Monatsbetrag muss in Cent vorliegen.');
      output[key] = value;
      continue;
    }
    if (['wbsRelevant', 'wbsConfirmed', 'incomeThresholdConfirmed', 'petsRequiringApproval'].includes(key)) {
      if (typeof value !== 'boolean') throw new TypeError(`${key} muss wahr/falsch sein.`);
      output[key] = value;
      continue;
    }
    output[key] = String(value).trim().slice(0, key === 'note' ? 3000 : 500);
  }
  return output;
}

export function addApplicantCase(project, {
  id,
  propertyId,
  unitId,
  applicantLabel,
  data = {},
  createdOn
}) {
  requireProject(project);
  requireNewId(project, id);
  if (!propertyExists(project, propertyId)) throw new Error('Gültige Immobilie erforderlich.');
  if (!unitExists(project, unitId)) throw new Error('Gültige Einheit erforderlich.');
  const unit = project.units.find(item => item.id === unitId);
  if (unit.propertyId !== propertyId) throw new Error('Einheit gehört zu einer anderen Immobilie.');
  if (!validDay(createdOn) || !createdOn) throw new TypeError('Gültiges Erstelldatum erforderlich.');

  const label = String(applicantLabel || '').trim();
  if (!label) throw new Error('Kurze Bewerberbezeichnung erforderlich.');

  const next = clone(project);
  next.checkItems.push({
    id,
    kind: 'rental_applicant',
    propertyId,
    unitId,
    applicantLabel: label.slice(0, 200),
    stage: 'A',
    status: 'active',
    data: cleanApplicantData('A', data),
    createdOn,
    updatedOn: createdOn,
    deletionReviewOn: null,
    automatedScore: null
  });
  return next;
}

export function updateApplicantCase(project, {
  checkId,
  stage,
  data,
  selectedForContract = false,
  status,
  deletionReviewOn,
  updatedOn
}) {
  requireProject(project);
  const current = project.checkItems.find(item => item.id === checkId && item.kind === 'rental_applicant');
  if (!current) throw new Error('Bewerberfall nicht gefunden.');
  if (!APPLICANT_STAGES.includes(stage)) throw new Error('Unbekannte Bewerberstufe.');
  if (!validDay(updatedOn) || !updatedOn || !validDay(deletionReviewOn)) throw new TypeError('Ungültiges Datum.');

  const currentIndex = APPLICANT_STAGES.indexOf(current.stage);
  const nextIndex = APPLICANT_STAGES.indexOf(stage);
  if (nextIndex > currentIndex + 1) throw new Error('Bewerberstufen dürfen nicht übersprungen werden.');
  if (stage === 'C' && current.stage !== 'C' && selectedForContract !== true) {
    throw new Error('Stufe C setzt eine bewusste Auswahl für die Vertragsvorbereitung voraus.');
  }
  if (status != null && !['active', 'selected', 'closed'].includes(status)) throw new Error('Unbekannter Bewerberstatus.');

  const merged = { ...(current.data ?? {}), ...(data ?? {}) };
  const cleaned = cleanApplicantData(stage, merged);
  const next = clone(project);
  const item = next.checkItems.find(entry => entry.id === checkId);
  item.stage = stage;
  item.data = cleaned;
  item.status = status ?? (stage === 'C' ? 'selected' : item.status);
  item.updatedOn = updatedOn;
  if (deletionReviewOn !== undefined) item.deletionReviewOn = deletionReviewOn || null;
  item.automatedScore = null;
  return next;
}

export function removeApplicantCase(project, checkId) {
  requireProject(project);
  const current = project.checkItems.find(item => item.id === checkId && item.kind === 'rental_applicant');
  if (!current) throw new Error('Bewerberfall nicht gefunden.');
  const next = clone(project);
  next.checkItems = next.checkItems.filter(item => item.id !== checkId);
  return next;
}
