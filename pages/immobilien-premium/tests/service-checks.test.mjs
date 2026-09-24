import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import {
  addServiceDraft, removeServiceDraft,
  addOwnerCheck, updateOwnerCheck,
  addApplicantCase, updateApplicantCase, removeApplicantCase
} from '../assets/js/service-checks.js';

function fixture() {
  const project = createEmptyProject('b5_project');
  project.properties.push({ id: 'house01', label: 'Haus' });
  project.units.push({
    id: 'unit01',
    propertyId: 'house01',
    label: 'Wohnung 1',
    areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }]
  });
  project.tenancies.push({
    id: 'tenancy01',
    unitId: 'unit01',
    startDate: '2026-01-01',
    endDate: null,
    partyLabel: 'Mietverhältnis 1'
  });
  project.usagePeriods.push({
    id: 'usage01',
    unitId: 'unit01',
    kind: 'tenant',
    tenancyId: 'tenancy01',
    startDate: '2026-01-01',
    endDate: null
  });
  return project;
}

test('Mietservice erzeugt nur Entwurf ohne PDF oder rechtliche Freigabe', () => {
  const next = addServiceDraft(fixture(), {
    id: 'doc01',
    type: 'lease_draft',
    tenancyId: 'tenancy01',
    title: 'Mietvertragsdaten',
    fields: { baseRentCents: 90000 },
    createdOn: '2026-09-24'
  });
  const doc = next.documents[0];
  assert.equal(doc.status, 'draft');
  assert.equal(doc.propertyId, 'house01');
  assert.equal(doc.legalReviewRequired, true);
  assert.equal(doc.pdfGenerated, false);
  assert.equal(doc.templateVersion, 'b5-draft-v1');
});

test('Objektbezogene Hausordnung braucht kein Mietverhältnis', () => {
  const next = addServiceDraft(fixture(), {
    id: 'doc_house',
    type: 'house_rules',
    propertyId: 'house01',
    fields: { note: 'Entwurf' },
    createdOn: '2026-09-24'
  });
  assert.equal(next.documents[0].propertyId, 'house01');
  assert.equal(next.documents[0].tenancyId, undefined);
});

test('Mietservice verhindert falsche Objektzuordnung', () => {
  const p = fixture();
  p.properties.push({ id: 'house02', label: 'Anderes Haus' });
  assert.throws(() => addServiceDraft(p, {
    id: 'doc_bad',
    type: 'lease_draft',
    propertyId: 'house02',
    tenancyId: 'tenancy01',
    fields: {},
    createdOn: '2026-09-24'
  }), /anderen Immobilie/);
});

test('Mietservice-Entwurf ist löschbar, freigegebenes Dokument nicht', () => {
  let p = addServiceDraft(fixture(), {
    id: 'doc_delete',
    type: 'waste_info',
    propertyId: 'house01',
    fields: {},
    createdOn: '2026-09-24'
  });
  assert.equal(removeServiceDraft(p, 'doc_delete').documents.length, 0);
  p.documents[0].status = 'released';
  p.documents[0].releasedOn = '2026-09-24';
  p.documents[0].snapshot = { fixed: true };
  assert.throws(() => removeServiceDraft(p, 'doc_delete'), /nicht gelöscht/);
});

test('Eigentümer-Check speichert Einordnung ausdrücklich und entscheidet sie nicht automatisch', () => {
  const next = addOwnerCheck(fixture(), {
    id: 'check01',
    propertyId: 'house01',
    topic: 'building_insurance',
    classification: 'unresolved',
    status: 'open',
    createdOn: '2026-09-24'
  });
  const item = next.checkItems[0];
  assert.equal(item.classification, 'unresolved');
  assert.equal(item.status, 'open');
});

test('Eigentümer-Check kann mit Wiedervorlage fortgeschrieben werden', () => {
  let p = addOwnerCheck(fixture(), {
    id: 'check02',
    propertyId: 'house01',
    topic: 'energy_certificate',
    createdOn: '2026-09-24'
  });
  p = updateOwnerCheck(p, {
    checkId: 'check02',
    classification: 'statutory',
    status: 'review',
    reviewOn: '2027-01-15',
    evidenceRef: 'Unterlage Energieausweis',
    updatedOn: '2026-09-24'
  });
  assert.equal(p.checkItems[0].reviewOn, '2027-01-15');
  assert.equal(p.checkItems[0].classification, 'statutory');
});

test('Bewerberfall startet datensparsam in Stufe A und ohne Score', () => {
  const next = addApplicantCase(fixture(), {
    id: 'app01',
    propertyId: 'house01',
    unitId: 'unit01',
    applicantLabel: 'Interessent A',
    data: { contactReference: 'Telefonkontakt', appointmentOn: '2026-09-28' },
    createdOn: '2026-09-24'
  });
  const item = next.checkItems[0];
  assert.equal(item.stage, 'A');
  assert.equal(item.automatedScore, null);
  assert.deepEqual(Object.keys(item.data).sort(), ['appointmentOn', 'contactReference']);
});

test('Stufe A nimmt keine Einkommens- oder Nachweisdaten an', () => {
  assert.throws(() => addApplicantCase(fixture(), {
    id: 'app_bad',
    propertyId: 'house01',
    unitId: 'unit01',
    applicantLabel: 'Interessent',
    data: { incomeThresholdConfirmed: true },
    createdOn: '2026-09-24'
  }), /Stufe A/);
});

test('Stufe B erlaubt nur den erweiterten Interessenten-Datensatz, nicht C-Nachweise', () => {
  let p = addApplicantCase(fixture(), {
    id: 'app02',
    propertyId: 'house01',
    unitId: 'unit01',
    applicantLabel: 'Interessent B',
    data: { contactReference: 'Kontakt' },
    createdOn: '2026-09-24'
  });
  p = updateApplicantCase(p, {
    checkId: 'app02',
    stage: 'B',
    data: {
      moveInOn: '2026-11-01',
      occupantsCount: 2,
      occupation: 'Angabe vorhanden',
      incomeThresholdConfirmed: true,
      availableMonthlyCents: 220000
    },
    updatedOn: '2026-09-24'
  });
  assert.equal(p.checkItems[0].stage, 'B');
  assert.equal(p.checkItems[0].data.availableMonthlyCents, 220000);
  assert.throws(() => updateApplicantCase(p, {
    checkId: 'app02',
    stage: 'B',
    data: { incomeProofRef: 'Gehaltsnachweis' },
    updatedOn: '2026-09-24'
  }), /Stufe B/);
});

test('Bewerberstufen dürfen nicht von A direkt nach C springen', () => {
  const p = addApplicantCase(fixture(), {
    id: 'app03',
    propertyId: 'house01',
    unitId: 'unit01',
    applicantLabel: 'Interessent C',
    createdOn: '2026-09-24'
  });
  assert.throws(() => updateApplicantCase(p, {
    checkId: 'app03',
    stage: 'C',
    data: {},
    selectedForContract: true,
    updatedOn: '2026-09-24'
  }), /nicht übersprungen/);
});

test('Stufe C setzt bewusste menschliche Auswahl voraus und erzeugt trotzdem keinen Score', () => {
  let p = addApplicantCase(fixture(), {
    id: 'app04',
    propertyId: 'house01',
    unitId: 'unit01',
    applicantLabel: 'Interessent D',
    createdOn: '2026-09-24'
  });
  p = updateApplicantCase(p, {
    checkId: 'app04',
    stage: 'B',
    data: { occupantsCount: 1, incomeThresholdConfirmed: true },
    updatedOn: '2026-09-24'
  });
  assert.throws(() => updateApplicantCase(p, {
    checkId: 'app04',
    stage: 'C',
    data: {},
    updatedOn: '2026-09-24'
  }), /bewusste Auswahl/);

  p = updateApplicantCase(p, {
    checkId: 'app04',
    stage: 'C',
    selectedForContract: true,
    data: {
      incomeProofRef: 'Nachweis geprüft, nicht als Datei gespeichert',
      creditProofRef: 'zweckbezogener Bonitätsnachweis geprüft',
      proofReviewedOn: '2026-09-24'
    },
    updatedOn: '2026-09-24'
  });
  assert.equal(p.checkItems[0].status, 'selected');
  assert.equal(p.checkItems[0].automatedScore, null);
});

test('Bewerberfall kann vollständig aus dem Projekt gelöscht werden', () => {
  let p = addApplicantCase(fixture(), {
    id: 'app05',
    propertyId: 'house01',
    unitId: 'unit01',
    applicantLabel: 'Zu löschen',
    data: { contactReference: 'Kontakt' },
    createdOn: '2026-09-24'
  });
  p = removeApplicantCase(p, 'app05');
  assert.equal(p.checkItems.some(item => item.id === 'app05'), false);
});
