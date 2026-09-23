import { saveProject } from './storage.js';
import {
  escapeText, formatEuro, newId, propertyAddress,
  safeLoadProject, showFlash, updateStoragePill
} from './ui-core.js';

const CATEGORY_LABELS = {
  property_tax: 'Grundsteuer',
  building_insurance: 'Gebäudeversicherung',
  waste: 'Müll / Entsorgung',
  common_electricity: 'Allgemeinstrom',
  cold_water: 'Kaltwasser',
  heating: 'Heizung',
  hot_water: 'Warmwasser',
  thermal_shared: 'Gemeinsame Heizung + Warmwasser',
  co2: 'CO₂-Kosten',
  repair: 'Reparatur / Instandhaltung',
  other: 'Sonstige Kosten'
};

let project = null;
let selectedPropertyId = null;
let selectedYear = String(new Date().getFullYear());

function parseEuro(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [euros, fraction = ''] = text.split('.');
  const cents = BigInt(euros) * 100n + BigInt((fraction + '00').slice(0, 2));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(cents);
}

function ensurePeriod(propertyId, year) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  let period = project.accountingPeriods.find(item =>
    item.propertyId === propertyId &&
    item.startDate === startDate &&
    item.endDate === endDate);
  if (!period) {
    period = {
      id: newId('period'),
      propertyId,
      startDate,
      endDate,
      confirmedTenancyIds: []
    };
    project.accountingPeriods.push(period);
  }
  return period;
}

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

function yearsForProperty(propertyId) {
  const years = new Set([String(new Date().getFullYear())]);
  for (const period of project?.accountingPeriods ?? []) {
    if (period.propertyId === propertyId && /^\d{4}-/.test(period.startDate)) {
      years.add(period.startDate.slice(0, 4));
    }
  }
  for (const expense of project?.expenses ?? []) {
    if (expense.propertyId === propertyId && /^\d{4}-/.test(expense.startDate)) {
      years.add(expense.startDate.slice(0, 4));
    }
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}

function selectedPeriod() {
  return project?.accountingPeriods.find(item =>
    item.propertyId === selectedPropertyId &&
    item.startDate === `${selectedYear}-01-01` &&
    item.endDate === `${selectedYear}-12-31`) ?? null;
}

function renderScope() {
  const propertySelect = document.querySelector('[name="scopeProperty"]');
  const yearSelect = document.querySelector('[name="scopeYear"]');
  const properties = project?.properties ?? [];

  propertySelect.innerHTML = properties.map(item =>
    `<option value="${escapeText(item.id)}">${escapeText(item.label || propertyAddress(item))}</option>`
  ).join('');

  if (!selectedPropertyId || !properties.some(item => item.id === selectedPropertyId)) {
    selectedPropertyId = properties[0]?.id ?? null;
  }
  if (selectedPropertyId) propertySelect.value = selectedPropertyId;

  const years = selectedPropertyId ? yearsForProperty(selectedPropertyId) : [selectedYear];
  if (!years.includes(selectedYear)) selectedYear = years[0];
  yearSelect.innerHTML = years.map(year =>
    `<option value="${year}">${year}</option>`
  ).join('');
  yearSelect.value = selectedYear;

  const property = properties.find(item => item.id === selectedPropertyId);
  document.querySelector('[data-scope-title]').textContent =
    property ? `${property.label || 'Immobilie'} · ${selectedYear}` : 'Noch keine Immobilie';
  document.querySelectorAll('[data-requires-property]').forEach(node => {
    node.disabled = !property;
  });
}

function renderMetrics() {
  const period = selectedPeriod();
  const expenses = (project?.expenses ?? []).filter(item =>
    item.propertyId === selectedPropertyId &&
    item.startDate <= `${selectedYear}-12-31` &&
    (item.endDate ?? '9999-12-31') >= `${selectedYear}-01-01`);
  const flows = (project?.cashflows ?? []).filter(item =>
    item.propertyId === selectedPropertyId &&
    period && item.accountingPeriodId === period.id &&
    (item.kind === 'provider_payment' || item.kind === 'provider_refund'));

  const total = expenses.reduce((sum, item) => sum + item.amountCents, 0);
  const unresolved = expenses.filter(item => item.classification === 'unresolved')
    .reduce((sum, item) => sum + item.amountCents, 0);
  const paid = flows.reduce((sum, item) =>
    sum + (item.kind === 'provider_payment' ? item.amountCents : -item.amountCents), 0);

  document.querySelector('[data-kosten-metrics]').innerHTML = `
    <div class="metric"><div class="metric-label">Erfasste Kosten</div><div class="metric-value">${formatEuro(total)}</div><div class="metric-note">${expenses.length} Position(en)</div></div>
    <div class="metric"><div class="metric-label">Noch ungeklärt</div><div class="metric-value">${formatEuro(unresolved)}</div><div class="metric-note">wird nicht automatisch umgelegt</div></div>
    <div class="metric"><div class="metric-label">Versorger netto gezahlt</div><div class="metric-value">${formatEuro(paid)}</div><div class="metric-note">Zahlungen minus Erstattungen</div></div>
    <div class="metric"><div class="metric-label">Abrechnungsjahr</div><div class="metric-value">${selectedYear}</div><div class="metric-note">${period ? 'Zeitraum angelegt' : 'wird beim Speichern angelegt'}</div></div>`;
}

function renderEntries() {
  const expenses = (project?.expenses ?? []).filter(item =>
    item.propertyId === selectedPropertyId &&
    item.startDate <= `${selectedYear}-12-31` &&
    (item.endDate ?? '9999-12-31') >= `${selectedYear}-01-01`)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));

  const period = selectedPeriod();
  const flows = (project?.cashflows ?? []).filter(item =>
    item.propertyId === selectedPropertyId && period &&
    item.accountingPeriodId === period.id &&
    (item.kind === 'provider_payment' || item.kind === 'provider_refund'))
    .sort((a, b) => a.date.localeCompare(b.date));

  const expenseHost = document.querySelector('[data-expense-list]');
  expenseHost.innerHTML = expenses.length ? expenses.map(item => {
    const classLabel = item.classification === 'owner' ? 'Eigentümerkosten'
      : item.classification === 'allocatable' ? 'Umlage prüfen'
      : 'Ungeklärt';
    return `
      <div class="unit-row">
        <div>
          <div class="unit-title">${escapeText(CATEGORY_LABELS[item.category] || item.category || 'Kosten')}</div>
          <div class="unit-sub">${escapeText(item.invoiceReference || 'Belegreferenz fehlt')} · ${escapeText(item.startDate)} bis ${escapeText(item.endDate || 'offen')}</div>
        </div>
        <div><span class="kicker">Betrag</span><div><strong>${escapeText(formatEuro(item.amountCents))}</strong></div></div>
        <div><span class="kicker">Zuordnung</span><div style="margin-top:4px"><span class="badge">${escapeText(classLabel)}</span></div></div>
        <div></div>
      </div>`;
  }).join('') : '<div class="empty-state"><h3>Noch keine Kosten</h3><p>Erfasse die erste Originalrechnung oder Kostenposition für dieses Jahr.</p></div>';

  const flowHost = document.querySelector('[data-provider-list]');
  flowHost.innerHTML = flows.length ? flows.map(item => `
    <div class="unit-row">
      <div>
        <div class="unit-title">${escapeText(item.providerLabel || item.providerAccountId || 'Versorger')}</div>
        <div class="unit-sub">${escapeText(item.date)} · ${item.kind === 'provider_refund' ? 'Erstattung' : 'Zahlung'}</div>
      </div>
      <div><span class="kicker">Betrag</span><div><strong>${escapeText(formatEuro(item.amountCents))}</strong></div></div>
      <div></div><div></div>
    </div>`).join('') : '<div class="empty-state"><h3>Noch keine Versorgerzahlung</h3><p>Versorgerzahlungen bleiben getrennt von den tatsächlichen Kosten.</p></div>';
}

function render() {
  if (!project?.properties?.length) {
    document.querySelector('[data-no-property]').classList.remove('hidden');
    document.querySelector('[data-workspace]').classList.add('hidden');
    updateStoragePill(project, null);
    return;
  }
  document.querySelector('[data-no-property]').classList.add('hidden');
  document.querySelector('[data-workspace]').classList.remove('hidden');
  renderScope();
  renderMetrics();
  renderEntries();

  document.querySelector('[name="expenseStart"]').value ||= `${selectedYear}-01-01`;
  document.querySelector('[name="expenseEnd"]').value ||= `${selectedYear}-12-31`;
  document.querySelector('[name="paymentDate"]').value ||= `${selectedYear}-01-15`;
}

document.querySelector('[name="scopeProperty"]').addEventListener('change', event => {
  selectedPropertyId = event.target.value;
  selectedYear = yearsForProperty(selectedPropertyId)[0] ?? String(new Date().getFullYear());
  render();
});

document.querySelector('[name="scopeYear"]').addEventListener('change', event => {
  selectedYear = event.target.value;
  document.querySelector('[name="expenseStart"]').value = `${selectedYear}-01-01`;
  document.querySelector('[name="expenseEnd"]').value = `${selectedYear}-12-31`;
  document.querySelector('[name="paymentDate"]').value = `${selectedYear}-01-15`;
  renderMetrics();
  renderEntries();
});

document.querySelector('[data-expense-form]').addEventListener('submit', event => {
  event.preventDefault();
  if (!load() || !project || !selectedPropertyId) return;
  const form = new FormData(event.currentTarget);
  const amountCents = parseEuro(form.get('amountEuro'));
  const startDate = String(form.get('expenseStart') || '');
  const endDate = String(form.get('expenseEnd') || '');
  if (amountCents === null || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
    showFlash('Bitte Betrag und Leistungszeitraum vollständig und gültig angeben.', 'error');
    return;
  }
  if (!startDate.startsWith(selectedYear) || !endDate.startsWith(selectedYear)) {
    showFlash('Dieser erste Erfassungsweg erwartet einen Leistungszeitraum innerhalb des gewählten Jahres.', 'error');
    return;
  }

  const period = ensurePeriod(selectedPropertyId, selectedYear);
  const classification = String(form.get('classification') || 'unresolved');
  const supplyRecordId = String(form.get('expenseSupplyRecord') || '');
  const supplyRecord = supplyRecordId
    ? project.supplyRegistry?.find(item => item.id === supplyRecordId &&
        item.propertyId === selectedPropertyId && item.accountingPeriodId === period.id)
    : null;
  if (supplyRecordId && !supplyRecord) {
    showFlash('Der gewählte Versorgungsvertrag gehört nicht zu dieser Immobilie und diesem Jahr.', 'error');
    return;
  }
  if (supplyRecord?.contract?.contractHolder === 'tenant_direct') {
    showFlash('Ein Direktvertrag des Mieters darf nicht als Eigentümerkosten erfasst werden.', 'error');
    return;
  }
  const expenseId = newId('expense');
  project.expenses.push({
    id: expenseId,
    propertyId: selectedPropertyId,
    category: String(form.get('category') || 'other'),
    classification,
    confirmedForAllocation: false,
    amountCents,
    startDate,
    endDate,
    invoiceReference: String(form.get('invoiceReference') || '').trim(),
    invoiceLineId: newId('invoice_line'),
    note: String(form.get('note') || '').trim(),
    ...(supplyRecord ? {
      providerAccountId: supplyRecord.contract.providerAccountId,
      supplyManaged: true
    } : {})
  });
  if (supplyRecord) {
    supplyRecord.contract.expenseIds = [...new Set([...(supplyRecord.contract.expenseIds ?? []), expenseId])];
  }

  try {
    saveProject(project);
    event.currentTarget.reset();
    document.querySelector('[name="expenseStart"]').value = `${selectedYear}-01-01`;
    document.querySelector('[name="expenseEnd"]').value = `${selectedYear}-12-31`;
    document.querySelector('[name="classification"]').value = 'unresolved';
    showFlash('Kostenposition wurde gespeichert. Umlagefähigkeit bleibt bis zur späteren Prüfung getrennt.');
    render();
    document.dispatchEvent(new CustomEvent('np-project-saved'));
  } catch (error) {
    load();
    showFlash(error.message || 'Kostenposition konnte nicht gespeichert werden.', 'error');
    render();
  }
});

document.querySelector('[data-provider-form]').addEventListener('submit', event => {
  event.preventDefault();
  if (!load() || !project || !selectedPropertyId) return;
  const form = new FormData(event.currentTarget);
  const amountCents = parseEuro(form.get('paymentEuro'));
  const date = String(form.get('paymentDate') || '');
  const enteredProviderLabel = String(form.get('providerLabel') || '').trim();
  const period = ensurePeriod(selectedPropertyId, selectedYear);
  const supplyRecordId = String(form.get('paymentSupplyRecord') || '');
  const supplyRecord = supplyRecordId
    ? project.supplyRegistry?.find(item => item.id === supplyRecordId &&
        item.propertyId === selectedPropertyId && item.accountingPeriodId === period.id)
    : null;
  if (supplyRecordId && !supplyRecord) {
    showFlash('Der gewählte Versorgungsvertrag gehört nicht zu dieser Immobilie und diesem Jahr.', 'error');
    return;
  }
  if (supplyRecord?.contract?.contractHolder === 'tenant_direct') {
    showFlash('Eigentümerzahlungen dürfen nicht einem Direktvertrag des Mieters zugeordnet werden.', 'error');
    return;
  }
  const providerLabel = supplyRecord?.contract?.providerLabel || enteredProviderLabel ||
    supplyRecord?.contract?.providerAccountId || '';
  if (amountCents === null || !providerLabel || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !date.startsWith(selectedYear)) {
    showFlash('Bitte Versorger, Betrag und Datum innerhalb des gewählten Jahres angeben.', 'error');
    return;
  }
  const providerAccountId = supplyRecord?.contract?.providerAccountId ||
    `provider_${providerLabel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 70) || newId('account')}`;
  project.cashflows.push({
    id: newId('cashflow'),
    kind: String(form.get('paymentKind') || 'provider_payment'),
    propertyId: selectedPropertyId,
    accountingPeriodId: period.id,
    providerAccountId,
    providerLabel,
    amountCents,
    date
  });

  try {
    saveProject(project);
    event.currentTarget.reset();
    document.querySelector('[name="paymentDate"]').value = `${selectedYear}-01-15`;
    document.querySelector('[name="paymentKind"]').value = 'provider_payment';
    showFlash('Versorgerbewegung wurde getrennt vom Kostenbetrag gespeichert.');
    render();
    document.dispatchEvent(new CustomEvent('np-project-saved'));
  } catch (error) {
    load();
    showFlash(error.message || 'Versorgerbewegung konnte nicht gespeichert werden.', 'error');
    render();
  }
});

document.addEventListener('np-project-saved', () => {
  if (load()) render();
});

if (load()) {
  selectedPropertyId = project?.properties?.[0]?.id ?? null;
  selectedYear = selectedPropertyId ? yearsForProperty(selectedPropertyId)[0] : String(new Date().getFullYear());
  render();
}
