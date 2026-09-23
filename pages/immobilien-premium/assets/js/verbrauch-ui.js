import { saveProject } from './storage.js';
import {
  escapeText, newId, propertyAddress,
  safeLoadProject, showFlash, updateStoragePill
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

function serviceMeta(service) {
  if (service === 'heating') return { label: 'Heizung', measurementKind: 'heat_energy', unit: 'kWh' };
  if (service === 'hot_water') return { label: 'Warmwasser', measurementKind: 'hot_water_volume', unit: 'm3' };
  return { label: 'Kaltwasser', measurementKind: 'water_volume', unit: 'm3' };
}

function propertyUnits() {
  return (project?.units ?? []).filter(unit => unit.propertyId === selectedPropertyId);
}

function renderScope() {
  const propertySelect = document.querySelector('[name="meterProperty"]');
  const properties = project?.properties ?? [];
  propertySelect.innerHTML = properties.map(item =>
    `<option value="${escapeText(item.id)}">${escapeText(item.label || propertyAddress(item))}</option>`
  ).join('');
  if (!selectedPropertyId || !properties.some(item => item.id === selectedPropertyId)) {
    selectedPropertyId = properties[0]?.id ?? null;
  }
  if (selectedPropertyId) propertySelect.value = selectedPropertyId;

  const units = propertyUnits();
  const unitSelect = document.querySelector('[name="meterUnit"]');
  unitSelect.innerHTML = units.length
    ? units.map(unit => `<option value="${escapeText(unit.id)}">${escapeText(unit.label || unit.id)}</option>`).join('')
    : '<option value="">Noch keine Einheit</option>';
  unitSelect.disabled = !units.length;

  document.querySelector('[data-meter-property-title]').textContent =
    properties.find(item => item.id === selectedPropertyId)?.label || 'Immobilie';
}

function latestReading(meterId) {
  return (project?.readings ?? [])
    .filter(reading => reading.meterId === meterId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0] ?? null;
}

function firstReading(meterId) {
  return (project?.readings ?? [])
    .filter(reading => reading.meterId === meterId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))[0] ?? null;
}

function renderMeters() {
  const meters = (project?.meters ?? [])
    .filter(meter => meter.propertyId === selectedPropertyId)
    .sort((a, b) => (a.unitId ?? '').localeCompare(b.unitId ?? '') || a.id.localeCompare(b.id));
  const units = new Map((project?.units ?? []).map(unit => [unit.id, unit]));
  const host = document.querySelector('[data-meter-list]');

  if (!meters.length) {
    host.innerHTML = '<div class="empty-state"><h3>Noch kein Zähler</h3><p>Lege den ersten Kaltwasser-, Heiz- oder Warmwasserzähler an.</p></div>';
  } else {
    host.innerHTML = meters.map(meter => {
      const meta = serviceMeta(meter.service);
      const first = firstReading(meter.id);
      const last = latestReading(meter.id);
      const diff = first && last && last.value >= first.value && first.id !== last.id
        ? Number((last.value - first.value).toFixed(3))
        : null;
      return `
        <div class="unit-row">
          <div>
            <div class="unit-title">${escapeText(meter.label || meter.id)}</div>
            <div class="unit-sub">${escapeText(units.get(meter.unitId)?.label || 'Gemeinschaftszähler')} · ${escapeText(meta.label)}</div>
          </div>
          <div><span class="kicker">Letzter Stand</span><div><strong>${last ? escapeText(last.value) + ' ' + escapeText(meta.unit) : '–'}</strong></div></div>
          <div><span class="kicker">Dok. Differenz</span><div><strong>${diff === null ? '–' : escapeText(diff) + ' ' + escapeText(meta.unit)}</strong></div></div>
          <div class="kicker">seit ${escapeText(meter.installedAt || '–')}</div>
        </div>`;
    }).join('');
  }

  const readingMeter = document.querySelector('[name="readingMeter"]');
  readingMeter.innerHTML = meters.length
    ? meters.map(meter => {
        const unit = units.get(meter.unitId);
        return `<option value="${escapeText(meter.id)}">${escapeText(meter.label || meter.id)} · ${escapeText(unit?.label || 'Objekt')}</option>`;
      }).join('')
    : '<option value="">Zuerst Zähler anlegen</option>';
  readingMeter.disabled = !meters.length;
  document.querySelector('[data-reading-submit]').disabled = !meters.length;
}

function renderReadings() {
  const meterIds = new Set((project?.meters ?? []).filter(m => m.propertyId === selectedPropertyId).map(m => m.id));
  const meters = new Map((project?.meters ?? []).map(m => [m.id, m]));
  const readings = (project?.readings ?? [])
    .filter(r => meterIds.has(r.meterId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const host = document.querySelector('[data-reading-list]');
  host.innerHTML = readings.length ? readings.slice(0, 30).map(reading => {
    const meter = meters.get(reading.meterId);
    const meta = serviceMeta(meter?.service);
    return `
      <div class="unit-row">
        <div><div class="unit-title">${escapeText(meter?.label || meter?.id || 'Zähler')}</div><div class="unit-sub">${escapeText(reading.date)}</div></div>
        <div><span class="kicker">Messwert</span><div><strong>${escapeText(reading.value)} ${escapeText(meta.unit)}</strong></div></div>
        <div><span class="badge">gemessen</span></div><div></div>
      </div>`;
  }).join('') : '<div class="empty-state"><h3>Noch keine Ablesung</h3><p>Messwerte werden ausschließlich als tatsächlich gemessene Werte gespeichert.</p></div>';
}

function render() {
  if (!project?.properties?.length) {
    document.querySelector('[data-no-property]').classList.remove('hidden');
    document.querySelector('[data-meter-workspace]').classList.add('hidden');
    return;
  }
  document.querySelector('[data-no-property]').classList.add('hidden');
  document.querySelector('[data-meter-workspace]').classList.remove('hidden');
  renderScope();
  renderMeters();
  renderReadings();
  const year = new Date().getFullYear();
  document.querySelector('[name="installedAt"]').value ||= `${year}-01-01`;
  document.querySelector('[name="readingDate"]').value ||= `${year}-01-01`;
}

document.querySelector('[name="meterProperty"]').addEventListener('change', event => {
  selectedPropertyId = event.target.value;
  render();
});

document.querySelector('[name="meterService"]').addEventListener('change', event => {
  const meta = serviceMeta(event.target.value);
  document.querySelector('[data-meter-unit-hint]').textContent = `Messwerte werden in ${meta.unit} erfasst.`;
});

document.querySelector('[data-meter-form]').addEventListener('submit', event => {
  event.preventDefault();
  if (!load() || !project || !selectedPropertyId) return;
  const form = new FormData(event.currentTarget);
  const unitId = String(form.get('meterUnit') || '');
  const unit = project.units.find(item => item.id === unitId && item.propertyId === selectedPropertyId);
  const installedAt = String(form.get('installedAt') || '');
  const label = String(form.get('meterLabel') || '').trim();
  const service = String(form.get('meterService') || 'cold_water');
  if (!unit || !label || !/^\d{4}-\d{2}-\d{2}$/.test(installedAt)) {
    showFlash('Bitte Einheit, Zählerbezeichnung und Einbaudatum vollständig angeben.', 'error');
    return;
  }
  const meta = serviceMeta(service);
  project.meters.push({
    id: newId('meter'),
    propertyId: selectedPropertyId,
    unitId,
    label,
    service,
    installedAt,
    measurementKind: meta.measurementKind,
    measurementUnit: meta.unit
  });
  try {
    saveProject(project);
    event.currentTarget.reset();
    document.querySelector('[name="installedAt"]').value = `${new Date().getFullYear()}-01-01`;
    document.querySelector('[name="meterService"]').value = 'cold_water';
    document.querySelector('[data-meter-unit-hint]').textContent = 'Messwerte werden in m3 erfasst.';
    showFlash('Zähler wurde gespeichert.');
    render();
  } catch (error) {
    load();
    showFlash(error.message || 'Zähler konnte nicht gespeichert werden.', 'error');
    render();
  }
});

document.querySelector('[data-reading-form]').addEventListener('submit', event => {
  event.preventDefault();
  if (!load() || !project) return;
  const form = new FormData(event.currentTarget);
  const meterId = String(form.get('readingMeter') || '');
  const meter = project.meters.find(item => item.id === meterId && item.propertyId === selectedPropertyId);
  const date = String(form.get('readingDate') || '');
  const raw = String(form.get('readingValue') || '').trim().replace(',', '.');
  const value = Number(raw);
  if (!meter || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d+(?:\.\d{1,3})?$/.test(raw) || !Number.isFinite(value)) {
    showFlash('Bitte Zähler, Datum und einen nichtnegativen Messwert mit höchstens drei Nachkommastellen angeben.', 'error');
    return;
  }
  if ((meter.installedAt && date < meter.installedAt) || (meter.removedAt && date > meter.removedAt)) {
    showFlash('Das Ablesedatum liegt außerhalb der dokumentierten Betriebsdauer dieses Zählers.', 'error');
    return;
  }
  if (project.readings.some(item => item.meterId === meterId && item.date === date)) {
    showFlash('Für diesen Zähler existiert an diesem Datum bereits eine Ablesung. Mehrfachwerte werden nicht automatisch überschrieben.', 'error');
    return;
  }
  const prior = project.readings
    .filter(item => item.meterId === meterId && item.date < date)
    .sort((a,b) => b.date.localeCompare(a.date))[0];
  if (prior && value < prior.value) {
    showFlash('Der neue Zählerstand liegt unter dem vorherigen Messwert. Zählerwechsel oder Überlauf müssen gesondert dokumentiert werden.', 'error');
    return;
  }
  project.readings.push({
    id: newId('reading'),
    meterId,
    date,
    value,
    readingType: 'measured'
  });
  try {
    saveProject(project);
    event.currentTarget.reset();
    document.querySelector('[name="readingDate"]').value = date;
    showFlash('Ablesung wurde als tatsächlich gemessener Wert gespeichert.');
    render();
  } catch (error) {
    load();
    showFlash(error.message || 'Ablesung konnte nicht gespeichert werden.', 'error');
    render();
  }
});

const state = safeLoadProject();
project = state.project;
updateStoragePill(project, state.error);
if (state.error) {
  document.querySelector('[data-no-property]').classList.remove('hidden');
  document.querySelector('[data-no-property] h3').textContent = 'Lokalen Speicher prüfen';
  document.querySelector('[data-no-property] p').textContent = state.error.message;
} else {
  selectedPropertyId = project?.properties?.[0]?.id ?? null;
  render();
}
