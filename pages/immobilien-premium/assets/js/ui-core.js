import { loadProject } from './storage.js';

export function newId(prefix = 'id') {
  const raw = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${raw}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100);
}

export function formatEuro(cents) {
  const safe = Number.isSafeInteger(cents) ? cents : 0;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(safe / 100);
}

export function formatArea(hundredthsM2) {
  if (!Number.isSafeInteger(hundredthsM2)) return '–';
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(hundredthsM2 / 100)} m²`;
}

export function propertyAddress(property) {
  const a = property?.address ?? {};
  const street = [a.street, a.houseNumber].filter(Boolean).join(' ');
  const city = [a.postalCode, a.city].filter(Boolean).join(' ');
  return [street, city].filter(Boolean).join(', ') || 'Adresse noch nicht vollständig';
}

export function activeUsage(project, unitId, onDate = new Date().toISOString().slice(0, 10)) {
  return (project?.usagePeriods ?? [])
    .filter(period => period.unitId === unitId &&
      period.startDate <= onDate &&
      (period.endDate == null || period.endDate >= onDate))
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null;
}

export function usageLabel(kind) {
  return ({ owner: 'Eigennutzung', tenant: 'Vermietet', vacant: 'Leerstand' })[kind] ?? 'Nicht festgelegt';
}

export function workspaceLabel(mode) {
  return ({ owner: 'Eigenes Haus', landlord: 'Vermietung', mixed: 'Eigennutzung & Vermietung' })[mode] ?? 'Immobilie';
}

export function safeLoadProject() {
  try {
    return { project: loadProject(), error: null };
  } catch (error) {
    return { project: null, error };
  }
}

export function updateStoragePill(project, error = null) {
  const pill = document.querySelector('[data-storage-pill]');
  const text = pill?.querySelector('[data-storage-text]');
  if (!pill || !text) return;
  pill.classList.remove('ok', 'warn');
  if (error) {
    pill.classList.add('warn');
    text.textContent = 'Speicher prüfen';
    pill.title = error.message ?? 'Lokaler Speicher konnte nicht gelesen werden.';
    return;
  }
  pill.classList.add('ok');
  text.textContent = project ? 'Lokal gespeichert' : 'Bereit zur Einrichtung';
  pill.title = project
    ? 'Die Projektdaten liegen ausschließlich im lokalen Browser-Speicher dieses Geräts.'
    : 'Noch keine Projektdaten angelegt.';
}

export function showFlash(message, type = 'success') {
  const node = document.querySelector('[data-flash]');
  if (!node) return;
  node.textContent = message;
  node.className = `flash show ${type}`;
  node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);
}
