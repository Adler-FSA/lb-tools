import { buildOwnerSummary } from './owner-summary.js';
import { buildDocumentedConsumption, buildOwnerYearComparison } from './owner-insights.js';
import {
  escapeText, formatEuro, propertyAddress,
  safeLoadProject, updateStoragePill
} from './ui-core.js';

const SERVICE_LABELS = {
  cold_water: 'Kaltwasser',
  heating: 'Heizung',
  hot_water: 'Warmwasser',
  water_volume: 'Wasser',
  heat_energy: 'Heizenergie',
  other: 'Sonstiger Verbrauch'
};

const LABELS = {
  property_tax: 'Grundsteuer',
  building_insurance: 'Gebäudeversicherung',
  waste: 'Müll / Entsorgung',
  common_electricity: 'Allgemeinstrom',
  cold_water: 'Kaltwasser',
  heating: 'Heizung',
  hot_water: 'Warmwasser',
  co2: 'CO₂-Kosten',
  repair: 'Reparatur / Instandhaltung',
  other: 'Sonstige Kosten'
};

let project = null;
let selectedPropertyId = null;
let selectedPeriodId = null;

function periodsForProperty(propertyId) {
  return (project?.accountingPeriods ?? [])
    .filter(item => item.propertyId === propertyId && item.endDate)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

function renderSelectors() {
  const propertySelect = document.querySelector('[name="ownerProperty"]');
  const periodSelect = document.querySelector('[name="ownerPeriod"]');
  propertySelect.innerHTML = project.properties.map(item =>
    `<option value="${escapeText(item.id)}">${escapeText(item.label || propertyAddress(item))}</option>`
  ).join('');

  if (!project.properties.some(item => item.id === selectedPropertyId)) {
    selectedPropertyId = project.properties[0]?.id ?? null;
  }
  if (selectedPropertyId) propertySelect.value = selectedPropertyId;

  const periods = periodsForProperty(selectedPropertyId);
  if (!periods.some(item => item.id === selectedPeriodId)) selectedPeriodId = periods[0]?.id ?? null;
  periodSelect.innerHTML = periods.length
    ? periods.map(item => `<option value="${escapeText(item.id)}">${escapeText(item.startDate.slice(0,4))}</option>`).join('')
    : '<option value="">Noch kein Abrechnungsjahr angelegt</option>';
  periodSelect.disabled = !periods.length;
  if (selectedPeriodId) periodSelect.value = selectedPeriodId;
}

function renderBlocked(message) {
  document.querySelector('[data-owner-metrics]').innerHTML = '';
  document.querySelector('[data-owner-breakdown]').innerHTML = `
    <div class="empty-state">
      <h3>Noch keine Eigentümerübersicht möglich</h3>
      <p>${escapeText(message)}</p>
      <a class="btn btn-primary" href="kosten.html">Kosten &amp; Abrechnungsjahr erfassen</a>
    </div>`;
  document.querySelector('[data-owner-status]').textContent = 'Prüfgrundlage fehlt';
  document.querySelector('[data-owner-issues]').innerHTML = '';
  document.querySelector('[data-consumption-summary]').innerHTML = '';
  document.querySelector('[data-year-comparison]').innerHTML = '';
}


function renderOwnerInsights() {
  const consumption = buildDocumentedConsumption(project, selectedPropertyId, selectedPeriodId);
  const consumptionHost = document.querySelector('[data-consumption-summary]');
  if (consumption.status === 'consumption' && consumption.report) {
    const totals = consumption.report.totals.map(item => `
      <div class="mini-stat">
        <span>${escapeText(SERVICE_LABELS[item.service] || item.service)}</span>
        <strong>${escapeText(new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(item.value))} ${escapeText(item.unit)}</strong>
      </div>`).join('');
    consumptionHost.innerHTML = totals
      ? `<div class="grid grid-3">${totals}</div>
         <div class="notice" style="margin-top:14px">
           ${consumption.report.metersWithDelta} von ${consumption.report.meterCount} Zähler(n) haben im gewählten Jahr mindestens zwei dokumentierte Ablesungen.
           Es wurden keine fehlenden Werte geschätzt.
         </div>`
      : `<div class="empty-state"><h3>Noch kein dokumentierter Jahresverbrauch</h3>
           <p>Für eine Verbrauchsdifferenz braucht ein Zähler mindestens zwei Ablesungen innerhalb des gewählten Jahres.</p>
           <a class="btn btn-secondary" href="verbrauch.html">Zähler &amp; Ablesungen öffnen</a></div>`;
  } else {
    consumptionHost.innerHTML = '<div class="empty-state"><h3>Verbrauch noch nicht auswertbar</h3><p>Messwerte oder Zeitraum müssen zuerst geprüft werden.</p></div>';
  }

  const comparison = buildOwnerYearComparison(project, selectedPropertyId);
  const comparisonHost = document.querySelector('[data-year-comparison]');
  if (comparison.status !== 'comparison' || !comparison.years.length) {
    comparisonHost.innerHTML = '<div class="empty-state"><h3>Noch kein Jahresvergleich</h3><p>Mindestens ein abgeschlossenes Abrechnungsjahr wird benötigt.</p></div>';
    return;
  }
  let previous = null;
  const rows = comparison.years.map(year => {
    const delta = previous ? year.actualCostsCents - previous.actualCostsCents : null;
    const percent = previous && previous.actualCostsCents > 0
      ? (delta / previous.actualCostsCents) * 100 : null;
    const deltaText = delta === null ? 'Startjahr'
      : `${delta >= 0 ? '+' : '−'}${formatEuro(Math.abs(delta))}${percent === null ? '' : ` · ${percent >= 0 ? '+' : ''}${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(percent)} %`}`;
    previous = year;
    return `
      <div class="unit-row">
        <div><div class="unit-title">${escapeText(year.yearLabel)}</div><div class="unit-sub">${year.expenseCount} Kostenposition(en)</div></div>
        <div><span class="kicker">Kosten</span><div><strong>${escapeText(formatEuro(year.actualCostsCents))}</strong></div></div>
        <div><span class="kicker">Versorger netto</span><div><strong>${escapeText(formatEuro(year.providerNetPaidCents))}</strong></div></div>
        <div class="kicker">${escapeText(deltaText)}</div>
      </div>`;
  }).reverse().join('');
  comparisonHost.innerHTML = rows;
}

function render() {
  if (!project?.properties?.length) {
    document.querySelector('[data-no-property]').classList.remove('hidden');
    document.querySelector('[data-owner-workspace]').classList.add('hidden');
    return;
  }
  document.querySelector('[data-no-property]').classList.add('hidden');
  document.querySelector('[data-owner-workspace]').classList.remove('hidden');
  renderSelectors();

  const property = project.properties.find(item => item.id === selectedPropertyId);
  document.querySelector('[data-owner-title]').textContent = property?.label || 'Immobilie';

  if (!selectedPeriodId) {
    renderBlocked('Für diese Immobilie gibt es noch kein abgeschlossenes Abrechnungsjahr.');
    return;
  }

  const result = buildOwnerSummary(project, selectedPropertyId, selectedPeriodId);
  if (result.status !== 'summary' || !result.report) {
    renderBlocked(result.issues?.[0]?.detail || 'Die gespeicherten Daten müssen zuerst geprüft werden.');
    return;
  }

  const r = result.report;
  const comparison = r.actualCostsCents - r.providerNetPaidCents;
  document.querySelector('[data-owner-status]').textContent =
    result.issues.length ? 'Organisation vollständig · Nachweise prüfen' : 'Organisation vollständig';

  document.querySelector('[data-owner-metrics]').innerHTML = `
    <div class="metric">
      <div class="metric-label">Tatsächliche Kosten</div>
      <div class="metric-value">${formatEuro(r.actualCostsCents)}</div>
      <div class="metric-note">${r.expenseCount} erfasste Position(en)</div>
    </div>
    <div class="metric">
      <div class="metric-label">Eigentümerkosten</div>
      <div class="metric-value">${formatEuro(r.ownerClassifiedCents)}</div>
      <div class="metric-note">bereits als Eigentümerkosten eingeordnet</div>
    </div>
    <div class="metric">
      <div class="metric-label">Umlage später prüfen</div>
      <div class="metric-value">${formatEuro(r.allocatableClassifiedCents)}</div>
      <div class="metric-note">noch keine rechtliche Freigabe</div>
    </div>
    <div class="metric">
      <div class="metric-label">Ungeklärt</div>
      <div class="metric-value">${formatEuro(r.unresolvedCents)}</div>
      <div class="metric-note">bleibt bis zur Prüfung offen</div>
    </div>`;

  const rows = r.byCategory
    .sort((a, b) => b.amountCents - a.amountCents)
    .map(item => `
      <div class="unit-row">
        <div><div class="unit-title">${escapeText(LABELS[item.category] || item.category)}</div></div>
        <div><span class="kicker">Kosten</span><div><strong>${escapeText(formatEuro(item.amountCents))}</strong></div></div>
        <div></div><div></div>
      </div>`).join('');

  document.querySelector('[data-owner-breakdown]').innerHTML = rows ||
    '<div class="empty-state"><h3>Noch keine Kosten</h3><p>Für dieses Jahr wurden noch keine Kostenpositionen gespeichert.</p></div>';

  document.querySelector('[data-provider-summary]').innerHTML = `
    <div class="grid grid-3">
      <div class="mini-stat"><span>Zahlungen</span><strong>${escapeText(formatEuro(r.providerPaymentsCents))}</strong></div>
      <div class="mini-stat"><span>Erstattungen</span><strong>${escapeText(formatEuro(r.providerRefundsCents))}</strong></div>
      <div class="mini-stat"><span>Netto gezahlt</span><strong>${escapeText(formatEuro(r.providerNetPaidCents))}</strong></div>
    </div>
    <div class="notice" style="margin-top:14px">
      Differenz tatsächliche Kosten zu netto erfassten Versorgerzahlungen:
      <strong>${escapeText(formatEuro(comparison))}</strong>.
      Das ist nur ein Organisationsvergleich und ausdrücklich kein automatisch festgestelltes Guthaben oder eine Nachzahlung.
    </div>`;

  renderOwnerInsights();

  const issueText = result.issues.map(issue => {
    if (issue.code === 'INVOICE_REFERENCE_MISSING') return 'Mindestens einer Kostenposition fehlt eine Beleg-/Rechnungsreferenz.';
    if (issue.code === 'EXPENSE_PERIOD_REVIEW') return 'Mindestens ein Leistungszeitraum überschneidet die Jahresgrenze und muss geprüft werden.';
    return 'Ein gespeicherter Datensatz benötigt noch eine Prüfung.';
  });
  document.querySelector('[data-owner-issues]').innerHTML = issueText.length
    ? `<div class="notice"><strong>Prüfbedarf:</strong> ${[...new Set(issueText)].map(escapeText).join(' ')}</div>`
    : '<div class="notice">Alle in dieser Organisationsübersicht erwarteten Belegreferenzen und Jahreszeiträume sind vorhanden.</div>';
}

document.querySelector('[name="ownerProperty"]').addEventListener('change', event => {
  selectedPropertyId = event.target.value;
  selectedPeriodId = periodsForProperty(selectedPropertyId)[0]?.id ?? null;
  render();
});
document.querySelector('[name="ownerPeriod"]').addEventListener('change', event => {
  selectedPeriodId = event.target.value || null;
  render();
});

const state = safeLoadProject();
project = state.project;
updateStoragePill(project, state.error);
if (state.error) {
  document.querySelector('[data-no-property]').classList.remove('hidden');
  document.querySelector('[data-no-property]').querySelector('h3').textContent = 'Lokalen Speicher prüfen';
  document.querySelector('[data-no-property]').querySelector('p').textContent = state.error.message;
} else if (project?.properties?.length) {
  selectedPropertyId = project.properties[0].id;
  selectedPeriodId = periodsForProperty(selectedPropertyId)[0]?.id ?? null;
  render();
} else {
  render();
}
