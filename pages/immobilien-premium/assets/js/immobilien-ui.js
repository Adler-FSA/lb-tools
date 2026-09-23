import { createEmptyProject } from './model.js';
import { loadProject, saveProject } from './storage.js';
import { changeUnitArea, changeUnitUsage } from './history-changes.js';
import {
  activeUsage, escapeText, formatArea, newId, propertyAddress,
  safeLoadProject, showFlash, updateStoragePill, usageLabel, workspaceLabel
} from './ui-core.js';

let project = null;
let selectedPropertyId = null;

function load() {
  const state = safeLoadProject();
  project = state.project;
  updateStoragePill(project, state.error);
  if (state.error) {
    showFlash(state.error.message || 'Lokaler Speicher konnte nicht gelesen werden.', 'error');
    return false;
  }
  return true;
}

function ensureProject() {
  if (!project) project = createEmptyProject(newId('project'));
  return project;
}

function selectedFromHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  return project?.properties?.some(item => item.id === raw) ? raw : null;
}

function setSelected(id, { updateHash = true } = {}) {
  if (!project?.properties?.some(item => item.id === id)) return;
  selectedPropertyId = id;
  if (updateHash) history.replaceState(null, '', `#${encodeURIComponent(id)}`);
  render();
}

function statusBadge(kind) {
  const cls = kind === 'tenant' ? 'tenant' : kind === 'vacant' ? 'vacant' : 'owner';
  return `<span class="badge ${cls}">${escapeText(usageLabel(kind))}</span>`;
}

function renderPropertyList() {
  const host = document.querySelector('[data-property-list]');
  if (!project?.properties?.length) {
    host.innerHTML = `
      <div class="empty-state">
        <h3>Noch keine Immobilie angelegt</h3>
        <p>Starte links mit der ersten Immobilie. Danach kannst Du sofort Wohnungen oder andere Nutzungseinheiten ergänzen.</p>
      </div>`;
    return;
  }
  host.innerHTML = project.properties.map(property => {
    const units = project.units.filter(unit => unit.propertyId === property.id);
    const selected = property.id === selectedPropertyId;
    return `
      <article class="card property-card" style="${selected ? 'border-color:#00a7ad;box-shadow:0 0 0 2px rgba(0,167,173,.08)' : ''}">
        <div class="property-top">
          <div>
            <div class="property-name">${escapeText(property.label || 'Immobilie')}</div>
            <div class="property-address">${escapeText(propertyAddress(property))}</div>
          </div>
          <span class="badge">${escapeText(workspaceLabel(property.workspaceMode))}</span>
        </div>
        <div class="property-stats">
          <div class="mini-stat"><span>Einheiten</span><strong>${units.length}</strong></div>
          <div class="mini-stat"><span>Typ</span><strong>${escapeText(property.buildingTypeLabel || '–')}</strong></div>
          <div class="mini-stat"><span>Status</span><strong>${selected ? 'geöffnet' : 'gespeichert'}</strong></div>
        </div>
        <button class="btn ${selected ? 'btn-primary' : 'btn-secondary'}" type="button" data-open-property="${escapeText(property.id)}">
          ${selected ? 'Immobilie geöffnet' : 'Immobilie öffnen'}
        </button>
      </article>`;
  }).join('');
  host.querySelectorAll('[data-open-property]').forEach(button => {
    button.addEventListener('click', () => setSelected(button.dataset.openProperty));
  });
}

function renderHistoryControls(units) {
  const panel = document.querySelector('[data-history-panel]');
  if (!panel) return;
  panel.classList.toggle('hidden', !units.length);
  const options = units.map(unit =>
    `<option value="${escapeText(unit.id)}">${escapeText(unit.label || unit.id)}</option>`).join('');
  for (const name of ['areaHistoryUnit','usageHistoryUnit']) {
    const select = document.querySelector(`[name="${name}"]`);
    if (select) {
      select.innerHTML = options || '<option value="">Keine Einheit</option>';
      select.disabled = !units.length;
    }
  }
  panel.querySelectorAll('button[type="submit"]').forEach(button => { button.disabled = !units.length; });
}

function renderUnitArea() {
  const panel = document.querySelector('[data-unit-panel]');
  const property = project?.properties?.find(item => item.id === selectedPropertyId);
  if (!property) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  document.querySelector('[data-selected-property-name]').textContent = property.label || 'Immobilie';
  document.querySelector('[name="propertyId"]').value = property.id;

  const units = project.units.filter(unit => unit.propertyId === property.id);
  renderHistoryControls(units);
  const host = document.querySelector('[data-unit-list]');
  if (!units.length) {
    host.innerHTML = `
      <div class="empty-state">
        <h3>Noch keine Einheit</h3>
        <p>Lege die erste Wohnung, Gewerbe- oder sonstige Nutzungseinheit an. Fläche und Nutzung werden historisch gespeichert.</p>
      </div>`;
    return;
  }
  host.innerHTML = units.map(unit => {
    const usage = activeUsage(project, unit.id);
    const area = [...(unit.areaHistory ?? [])].sort((a,b) => b.from.localeCompare(a.from))[0];
    const tenancy = usage?.tenancyId ? project.tenancies.find(item => item.id === usage.tenancyId) : null;
    return `
      <div class="unit-row">
        <div>
          <div class="unit-title">${escapeText(unit.label || 'Einheit')}</div>
          <div class="unit-sub">${escapeText(unit.floor || 'Lage nicht angegeben')}${tenancy?.partyLabel ? ' · ' + escapeText(tenancy.partyLabel) : ''}</div>
        </div>
        <div><span class="kicker">Fläche</span><div><strong>${escapeText(formatArea(area?.hundredthsM2))}</strong></div></div>
        <div><span class="kicker">Nutzung</span><div style="margin-top:4px">${statusBadge(usage?.kind)}</div></div>
        <div class="kicker">seit ${escapeText(usage?.startDate || '–')}</div>
      </div>`;
  }).join('');
}

function render() {
  if (!project?.properties?.length) selectedPropertyId = null;
  if (!selectedPropertyId) selectedPropertyId = selectedFromHash() ?? project?.properties?.[0]?.id ?? null;
  document.querySelector('[data-count-properties]').textContent = project?.properties?.length ?? 0;
  document.querySelector('[data-count-units]').textContent = project?.units?.length ?? 0;
  renderPropertyList();
  renderUnitArea();
  updateStoragePill(project, null);
}

function parseArea(value) {
  const numeric = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const scaled = Math.round(numeric * 100);
  return Number.isSafeInteger(scaled) && scaled > 0 ? scaled : null;
}

document.querySelector('[data-property-form]').addEventListener('submit', event => {
  event.preventDefault();
  if (!load()) return;
  const form = new FormData(event.currentTarget);
  const label = String(form.get('label') || '').trim();
  const city = String(form.get('city') || '').trim();
  if (!label || !city) {
    showFlash('Bitte mindestens Bezeichnung und Ort vollständig angeben.', 'error');
    return;
  }
  const p = ensureProject();
  const id = newId('property');
  const type = String(form.get('buildingType') || 'other');
  const typeLabel = ({
    single_family: 'Einfamilienhaus',
    multi_family: 'Mehrfamilienhaus',
    condominium: 'Wohnungseigentum',
    mixed_use: 'Gemischt genutzt',
    other: 'Sonstiges'
  })[type] || 'Sonstiges';

  p.properties.push({
    id,
    label,
    workspaceMode: String(form.get('workspaceMode') || 'owner'),
    buildingType: type,
    buildingTypeLabel: typeLabel,
    address: {
      street: String(form.get('street') || '').trim(),
      houseNumber: String(form.get('houseNumber') || '').trim(),
      postalCode: String(form.get('postalCode') || '').trim(),
      city
    }
  });

  try {
    saveProject(p);
    project = p;
    selectedPropertyId = id;
    history.replaceState(null, '', `#${encodeURIComponent(id)}`);
    event.currentTarget.reset();
    event.currentTarget.querySelector('[name="workspaceMode"]').value = 'owner';
    event.currentTarget.querySelector('[name="buildingType"]').value = 'single_family';
    showFlash('Immobilie wurde lokal gespeichert. Du kannst jetzt die erste Einheit anlegen.');
    render();
  } catch (error) {
    showFlash(error.message || 'Immobilie konnte nicht gespeichert werden.', 'error');
  }
});

const usageSelect = document.querySelector('[name="usageKind"]');
function toggleTenantFields() {
  document.querySelector('[data-tenant-fields]').classList.toggle('hidden', usageSelect.value !== 'tenant');
}
usageSelect.addEventListener('change', toggleTenantFields);
toggleTenantFields();

document.querySelector('[data-unit-form]').addEventListener('submit', event => {
  event.preventDefault();
  if (!load()) return;
  const form = new FormData(event.currentTarget);
  const propertyId = String(form.get('propertyId') || '');
  const property = project?.properties?.find(item => item.id === propertyId);
  if (!property) {
    showFlash('Bitte zuerst eine gültige Immobilie auswählen.', 'error');
    return;
  }
  const label = String(form.get('unitLabel') || '').trim();
  const area = parseArea(form.get('areaM2'));
  const startDate = String(form.get('usageStart') || '');
  const kind = String(form.get('usageKind') || '');
  if (!label || area === null || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !['owner','tenant','vacant'].includes(kind)) {
    showFlash('Bitte Bezeichnung, positive Fläche, Nutzungsart und gültiges Startdatum angeben.', 'error');
    return;
  }

  const unitId = newId('unit');
  project.units.push({
    id: unitId,
    propertyId,
    label,
    floor: String(form.get('floor') || '').trim(),
    areaHistory: [{ from: startDate, to: null, hundredthsM2: area }]
  });

  let tenancyId = null;
  if (kind === 'tenant') {
    tenancyId = newId('tenancy');
    project.tenancies.push({
      id: tenancyId,
      unitId,
      startDate,
      endDate: null,
      partyLabel: String(form.get('tenantName') || '').trim() || 'Mietverhältnis'
    });
  }
  project.usagePeriods.push({
    id: newId('usage'),
    unitId,
    kind,
    ...(tenancyId ? { tenancyId } : {}),
    startDate,
    endDate: null
  });

  try {
    saveProject(project);
    event.currentTarget.reset();
    event.currentTarget.querySelector('[name="propertyId"]').value = propertyId;
    event.currentTarget.querySelector('[name="usageKind"]').value = 'owner';
    event.currentTarget.querySelector('[name="usageStart"]').value = `${new Date().getFullYear()}-01-01`;
    toggleTenantFields();
    showFlash('Einheit wurde mit Fläche und Nutzungsstatus gespeichert.');
    render();
  } catch (error) {
    // Reload authoritative saved project so an unsuccessful save never leaves the UI on an unsaved mutation.
    load();
    showFlash(error.message || 'Einheit konnte nicht gespeichert werden.', 'error');
    render();
  }
});


const historyUsageKind = document.querySelector('[name="usageHistoryKind"]');
function toggleHistoryTenantFields() {
  const fields = document.querySelector('[data-history-tenant-fields]');
  if (fields && historyUsageKind) fields.classList.toggle('hidden', historyUsageKind.value !== 'tenant');
}
historyUsageKind?.addEventListener('change', toggleHistoryTenantFields);
toggleHistoryTenantFields();

document.querySelector('[data-area-history-form]')?.addEventListener('submit', event => {
  event.preventDefault();
  if (!load() || !project) return;
  const form = new FormData(event.currentTarget);
  const unitId = String(form.get('areaHistoryUnit') || '');
  const effectiveFrom = String(form.get('areaEffectiveFrom') || '');
  const hundredthsM2 = parseArea(form.get('areaNewM2'));
  if (!unitId || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) || hundredthsM2 === null) {
    showFlash('Bitte Einheit, neues Gültigkeitsdatum und positive Fläche angeben.', 'error');
    return;
  }
  try {
    const result = changeUnitArea(project, { unitId, effectiveFrom, hundredthsM2 });
    saveProject(result.project);
    project = result.project;
    event.currentTarget.reset();
    document.querySelector('[name="areaEffectiveFrom"]').value = new Date().toISOString().slice(0, 10);
    showFlash('Neue Fläche wurde als eigener historischer Zeitraum gespeichert. Die bisherige Fläche bleibt erhalten.');
    render();
  } catch (error) {
    load();
    showFlash(error.message || 'Flächenhistorie konnte nicht geändert werden.', 'error');
    render();
  }
});

document.querySelector('[data-usage-history-form]')?.addEventListener('submit', event => {
  event.preventDefault();
  if (!load() || !project) return;
  const form = new FormData(event.currentTarget);
  const unitId = String(form.get('usageHistoryUnit') || '');
  const effectiveFrom = String(form.get('usageEffectiveFrom') || '');
  const kind = String(form.get('usageHistoryKind') || '');
  const partyLabel = String(form.get('usageHistoryTenantName') || '').trim();
  if (!unitId || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) || !['owner','tenant','vacant'].includes(kind)) {
    showFlash('Bitte Einheit, Änderungsdatum und neue Nutzung vollständig angeben.', 'error');
    return;
  }
  try {
    const result = changeUnitUsage(project, {
      unitId, effectiveFrom, kind,
      usageId: newId('usage'),
      tenancyId: kind === 'tenant' ? newId('tenancy') : null,
      partyLabel
    });
    saveProject(result.project);
    project = result.project;
    event.currentTarget.reset();
    document.querySelector('[name="usageEffectiveFrom"]').value = new Date().toISOString().slice(0, 10);
    document.querySelector('[name="usageHistoryKind"]').value = 'owner';
    toggleHistoryTenantFields();
    showFlash('Nutzungswechsel wurde als neuer Zeitraum gespeichert. Die bisherige Nutzung bleibt historisch erhalten.');
    render();
  } catch (error) {
    load();
    showFlash(error.message || 'Nutzungswechsel konnte nicht gespeichert werden.', 'error');
    render();
  }
});

window.addEventListener('hashchange', () => {
  const id = selectedFromHash();
  if (id) setSelected(id, { updateHash: false });
});

if (load()) {
  const defaultDate = document.querySelector('[name="usageStart"]');
  if (defaultDate && !defaultDate.value) defaultDate.value = `${new Date().getFullYear()}-01-01`;
  const today = new Date().toISOString().slice(0, 10);
  const areaChangeDate = document.querySelector('[name="areaEffectiveFrom"]');
  const usageChangeDate = document.querySelector('[name="usageEffectiveFrom"]');
  if (areaChangeDate && !areaChangeDate.value) areaChangeDate.value = today;
  if (usageChangeDate && !usageChangeDate.value) usageChangeDate.value = today;
  render();
}
