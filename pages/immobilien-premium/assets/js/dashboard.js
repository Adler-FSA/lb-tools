import {
  activeUsage, escapeText, formatEuro, propertyAddress,
  safeLoadProject, updateStoragePill, usageLabel, workspaceLabel
} from './ui-core.js';

function sumExpenses(project, propertyId) {
  return (project.expenses ?? [])
    .filter(item => item.propertyId === propertyId && Number.isSafeInteger(item.amountCents))
    .reduce((sum, item) => sum + item.amountCents, 0);
}

function renderEmpty() {
  document.querySelector('[data-project-summary]').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9 20v-6h6v6"/>
        </svg>
      </div>
      <h3>Deine Immobilienzentrale ist bereit.</h3>
      <p>Lege zuerst ein Haus oder eine Wohnung an. Danach entsteht hier automatisch Deine persönliche Übersicht mit Einheiten, Nutzung, Kosten und offenen Aufgaben.</p>
      <a class="btn btn-primary" href="immobilien.html">Immobilie anlegen</a>
    </div>`;
  document.querySelector('[data-metrics]').innerHTML = '';
  document.querySelector('[data-properties]').innerHTML = '';
  document.querySelector('[data-status-copy]').textContent =
    'Noch keine Daten angelegt. Der Neuaufbau verwendet ausschließlich den eigenen Speicherbereich von Nebenkosten Premium.';
}

function renderProject(project) {
  const today = new Date().toISOString().slice(0, 10);
  const usages = project.units.map(unit => activeUsage(project, unit.id, today));
  const occupied = usages.filter(item => item?.kind === 'tenant').length;
  const owner = usages.filter(item => item?.kind === 'owner').length;
  const vacant = usages.filter(item => item?.kind === 'vacant').length;
  const totalCosts = project.expenses
    .filter(item => Number.isSafeInteger(item.amountCents))
    .reduce((sum, item) => sum + item.amountCents, 0);

  document.querySelector('[data-project-summary]').innerHTML = '';
  document.querySelector('[data-status-copy]').textContent =
    `${project.properties.length} Immobilie(n) und ${project.units.length} Einheit(en) im lokalen Projekt gespeichert.`;

  document.querySelector('[data-metrics]').innerHTML = `
    <div class="metric"><div class="metric-label">Immobilien</div><div class="metric-value">${project.properties.length}</div><div class="metric-note">im aktuellen Projekt</div></div>
    <div class="metric"><div class="metric-label">Einheiten</div><div class="metric-value">${project.units.length}</div><div class="metric-note">${owner} selbst · ${occupied} vermietet · ${vacant} leer</div></div>
    <div class="metric"><div class="metric-label">Erfasste Kosten</div><div class="metric-value">${formatEuro(totalCosts)}</div><div class="metric-note">nur tatsächlich gespeicherte Kostenpositionen</div></div>
    <div class="metric"><div class="metric-label">Offene Aufgaben</div><div class="metric-value">${(project.checkItems ?? []).filter(x => x.status !== 'done').length}</div><div class="metric-note">Checks und Wiedervorlagen</div></div>`;

  const propertyCards = project.properties.map(property => {
    const units = project.units.filter(unit => unit.propertyId === property.id);
    const current = units.map(unit => activeUsage(project, unit.id, today));
    const own = current.filter(x => x?.kind === 'owner').length;
    const letUnits = current.filter(x => x?.kind === 'tenant').length;
    const empty = current.filter(x => x?.kind === 'vacant').length;
    return `
      <article class="card property-card">
        <div class="property-top">
          <div>
            <div class="property-name">${escapeText(property.label || 'Immobilie')}</div>
            <div class="property-address">${escapeText(propertyAddress(property))}</div>
          </div>
          <span class="badge">${escapeText(workspaceLabel(property.workspaceMode))}</span>
        </div>
        <div class="property-stats">
          <div class="mini-stat"><span>Einheiten</span><strong>${units.length}</strong></div>
          <div class="mini-stat"><span>Nutzung</span><strong>${own}/${letUnits}/${empty}</strong></div>
          <div class="mini-stat"><span>Kosten</span><strong>${escapeText(formatEuro(sumExpenses(project, property.id)))}</strong></div>
        </div>
        <div class="toolbar">
          <a class="btn btn-secondary" href="immobilien.html#${encodeURIComponent(property.id)}">Immobilienakte öffnen</a>
        </div>
      </article>`;
  }).join('');

  document.querySelector('[data-properties]').innerHTML = propertyCards || `
    <div class="empty-state"><h3>Noch keine Immobilie</h3><p>Das Projekt existiert bereits, enthält aber noch keine Immobilie.</p><a class="btn btn-primary" href="immobilien.html">Jetzt anlegen</a></div>`;
}

const { project, error } = safeLoadProject();
updateStoragePill(project, error);

if (error) {
  document.querySelector('[data-project-summary]').innerHTML = `
    <div class="empty-state"><h3>Lokalen Speicher prüfen</h3><p>${escapeText(error.message)}</p></div>`;
  document.querySelector('[data-status-copy]').textContent = 'Vorhandene Daten werden nicht automatisch überschrieben.';
} else if (!project) {
  renderEmpty();
} else {
  renderProject(project);
}
