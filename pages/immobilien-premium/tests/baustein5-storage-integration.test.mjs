import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import { loadProject, saveProject } from '../assets/js/storage.js';
import { createRentalDocumentDraft } from '../assets/js/rental-service.js';
import { upsertSafetyCheck } from '../assets/js/safety-checks.js';
import { createLettingProcess } from '../assets/js/letting-check.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key)
  };
}
function base() {
  const project = createEmptyProject('b5_integration');
  project.properties.push({ id: 'p1', label: 'Haus' });
  project.units.push({
    id: 'u1', propertyId: 'p1', label: 'Wohnung',
    areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }]
  });
  project.tenancies.push({ id: 't1', unitId: 'u1', startDate: '2026-01-01', endDate: null, partyLabel: 'Mietverhältnis' });
  project.usagePeriods.push({ id: 'use1', unitId: 'u1', kind: 'tenant', tenancyId: 't1', startDate: '2026-01-01', endDate: null });
  return project;
}

test('Mietservice-Entwurf passiert bestehendes Schema und lokalen Speicher', () => {
  let project = base();
  project = createRentalDocumentDraft(project, {
    documentId: 'd1', type: 'lease_draft', propertyId: 'p1', unitId: 'u1',
    tenancyId: 't1', createdOn: '2026-09-24',
    fields: { baseRentCents: 100000, depositCents: 300000 }
  }).project;
  const storage = memoryStorage();
  saveProject(project, { storage });
  assert.equal(loadProject({ storage }).documents.length, 1);
});

test('Eigentümer-Check passiert bestehendes Schema und lokalen Speicher', () => {
  let project = base();
  project = upsertSafetyCheck(project, {
    itemId: 'c1', propertyId: 'p1', checkKey: 'energy_certificate',
    classification: 'unresolved', status: 'review', checkedOn: '2026-09-24'
  }).project;
  const storage = memoryStorage();
  saveProject(project, { storage });
  assert.equal(loadProject({ storage }).checkItems.length, 1);
});

test('Datensparsamer Vermietungscheck passiert bestehendes Schema und lokalen Speicher', () => {
  let project = base();
  project = createLettingProcess(project, {
    processId: 'v1', propertyId: 'p1', unitId: 'u1',
    createdOn: '2026-09-24', referenceLabel: 'Vorgang A'
  }).project;
  const storage = memoryStorage();
  saveProject(project, { storage });
  const stored = loadProject({ storage }).checkItems[0];
  assert.equal(stored.applicantAnswersStored, false);
  assert.equal(stored.evidenceFilesStored, false);
  assert.equal(stored.automaticScore, false);
  assert.equal(stored.automaticSelection, false);
});
