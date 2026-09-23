import { loadProject, saveProject } from './storage.js';
import {
  addSupplyPriceVersion, confirmSupplyRecord, createSupplyDraft, previewSupplyPlan
} from './supply-management.js';
import { reviewSupplyAccount } from './supply-review.js';
import { escapeText, formatEuro, newId, showFlash, updateStoragePill } from './ui-core.js';

const SERVICE_LABELS = {
  gas: 'Gas',
  electricity: 'Strom',
  water: 'Wasser',
  district_heat: 'Fernwärme',
  heating_oil: 'Heizöl',
  other: 'Sonstige Versorgung'
};

let project = null;

function load() {
  try {
    project = loadProject();
    updateStoragePill(project, null);
    return true;
  } catch (error) {
    updateStoragePill(null, error);
    showFlash(error.message || 'Versorgungsdaten konnten nicht geladen werden.', 'error');
    return false;
  }
}

function scope() {
  const propertyId = document.querySelector('[name="scopeProperty"]')?.value || '';
  const year = document.querySelector('[name="scopeYear"]')?.value || '';
  const period = project?.accountingPeriods?.find(item =>
    item.propertyId === propertyId &&
    item.startDate === `${year}-01-01` &&
    item.endDate === `${year}-12-31`) ?? null;
  return { propertyId, year, period };
}

function withPeriod(propertyId, year) {
  const existing = project.accountingPeriods.find(item =>
    item.propertyId === propertyId &&
    item.startDate === `${year}-01-01` &&
    item.endDate === `${year}-12-31`);
  if (existing) return { source: project, period: existing };
  const source = structuredClone(project);
  const period = {
    id: newId('period'),
    propertyId,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    confirmedTenancyIds: []
  };
  source.accountingPeriods.push(period);
  return { source, period };
}

function parseEuro(value) {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  const cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}

function parseWhole(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) return null;
  const number = Number(raw);
  return Number.isSafeInteger(number) ? number : null;
}

function gcd(a, b) {
  let x = BigInt(a), y = BigInt(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

function parseDecimalCents(value) {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,4})?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  const denom = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole) * denom + BigInt(fraction || '0');
  const divisor = gcd(numerator, denom);
  const n = numerator / divisor;
  const d = denom / divisor;
  if (n > BigInt(Number.MAX_SAFE_INTEGER) || d > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return { numerator: Number(n), denominator: Number(d) };
}

function normalizeAccount(value) {
  const raw = String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalized = raw.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 90);
  return normalized && /^[A-Za-z0-9]/.test(normalized) ? normalized : null;
}

function priceVersionFromForm(form, prefix, year) {
  const fields = {
    validFrom: String(form.get(`${prefix}ValidFrom`) || ''),
    validTo: String(form.get(`${prefix}ValidTo`) || ''),
    referenceId: normalizeAccount(form.get(`${prefix}Reference`)),
    baseEuro: String(form.get(`${prefix}BaseEuro`) || '').trim(),
    plannedUnits: String(form.get(`${prefix}PlannedUnits`) || '').trim(),
    workPrice: String(form.get(`${prefix}WorkPrice`) || '').trim(),
    measurementUnit: String(form.get(`${prefix}Unit`) || '').trim()
  };
  const any = Object.values(fields).some(value => value !== '');
  if (!any) return null;
  const baseCentsPerPeriod = parseEuro(fields.baseEuro);
  const plannedWholeUnits = parseWhole(fields.plannedUnits);
  const work = parseDecimalCents(fields.workPrice);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.validFrom) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fields.validTo) ||
      !fields.validFrom.startsWith(year) || !fields.validTo.startsWith(year) ||
      !fields.referenceId || baseCentsPerPeriod === null || plannedWholeUnits === null ||
      !work || !fields.measurementUnit) {
    throw new Error('Preisstand bitte vollständig ausfüllen oder alle Preisfelder leer lassen.');
  }
  return {
    validFrom: fields.validFrom,
    validTo: fields.validTo,
    referenceId: fields.referenceId,
    baseCentsPerPeriod,
    plannedWholeUnits,
    workPriceNumeratorCents: work.numerator,
    workPriceDenominatorUnits: work.denominator,
    measurementUnit: fields.measurementUnit
  };
}

function currentRecords() {
  const { propertyId, period } = scope();
  if (!period) return [];
  return (project?.supplyRegistry ?? []).filter(item =>
    item.propertyId === propertyId && item.accountingPeriodId === period.id);
}

function updateContractSelectors(records) {
  const ownerRecords = records.filter(item => item.contract?.contractHolder === 'owner');
  for (const name of ['expenseSupplyRecord', 'paymentSupplyRecord']) {
    const select = document.querySelector(`[name="${name}"]`);
    if (!select) continue;
    const selected = select.value;
    select.innerHTML = '<option value="">Kein Versorgungsvertrag / manuell</option>' +
      ownerRecords.map(item =>
        `<option value="${escapeText(item.id)}">${escapeText(item.contract.providerLabel || item.contract.providerAccountId)} · ${escapeText(SERVICE_LABELS[item.contract.service] || item.contract.service)}</option>`
      ).join('');
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
  }

  const drafts = ownerRecords.filter(item => item.confirmed === false);
  const priceSelect = document.querySelector('[name="priceRecordId"]');
  if (priceSelect) {
    const selected = priceSelect.value;
    priceSelect.innerHTML = drafts.length
      ? drafts.map(item => `<option value="${escapeText(item.id)}">${escapeText(item.contract.providerLabel || item.contract.providerAccountId)}</option>`).join('')
      : '<option value="">Kein offener Eigentümer-Vertrag</option>';
    priceSelect.disabled = !drafts.length;
    if ([...priceSelect.options].some(option => option.value === selected)) priceSelect.value = selected;
  }
}

function updateDirectUnits() {
  const { propertyId } = scope();
  const select = document.querySelector('[name="supplyUnitId"]');
  if (!select) return;
  const units = (project?.units ?? []).filter(unit => unit.propertyId === propertyId);
  select.innerHTML = units.length
    ? units.map(unit => `<option value="${escapeText(unit.id)}">${escapeText(unit.label || unit.id)}</option>`).join('')
    : '<option value="">Keine Einheit</option>';
  select.disabled = !units.length;
}

function renderRecords(records) {
  const host = document.querySelector('[data-supply-list]');
  if (!host) return;
  if (!records.length) {
    host.innerHTML = '<div class="empty-state"><h3>Noch kein Versorgungsvertrag</h3><p>Lege Gas, Strom, Wasser oder eine andere Versorgung für das gewählte Jahr an.</p></div>';
    return;
  }
  host.innerHTML = records.map(record => {
    const contract = record.contract;
    let plan = null;
    try { plan = previewSupplyPlan(project, record.id).report; } catch {}
    let actual = null;
    if (record.confirmed === true) {
      const reviewed = reviewSupplyAccount(project, record.accountingPeriodId, contract);
      if (reviewed.status === 'reviewed') actual = reviewed.report;
    }
    const direct = contract.contractHolder === 'tenant_direct';
    const status = record.confirmed ? 'Bestätigt' : 'Entwurf';
    const planText = direct ? 'Mieter versorgt sich direkt'
      : plan?.forecastCents != null ? `Plan ${formatEuro(plan.forecastCents)}`
      : 'Planwerte noch unvollständig';
    const actualText = actual
      ? `Ist ${formatEuro(actual.actualOwnerCostsCents)} · gezahlt ${formatEuro(actual.netProviderPaidCents)}`
      : direct && record.confirmed ? 'Keine Eigentümerkosten' : 'Jahresrechnung noch nicht bestätigt';
    return `
      <article class="card property-card">
        <div class="property-top">
          <div>
            <div class="property-name">${escapeText(contract.providerLabel || contract.providerAccountId)}</div>
            <div class="property-address">${escapeText(SERVICE_LABELS[contract.service] || contract.service)} · ${direct ? 'Mieter direkt' : 'Eigentümervertrag'}</div>
          </div>
          <span class="badge ${record.confirmed ? '' : 'owner'}">${escapeText(status)}</span>
        </div>
        <div class="property-stats">
          <div class="mini-stat"><span>Planung</span><strong>${escapeText(planText)}</strong></div>
          <div class="mini-stat"><span>Ist / Zahlung</span><strong>${escapeText(actualText)}</strong></div>
          <div class="mini-stat"><span>Preisstände</span><strong>${contract.priceVersions?.length ?? 0}</strong></div>
        </div>
        ${record.confirmed ? '' : `<button class="btn btn-secondary" type="button" data-confirm-supply="${escapeText(record.id)}">Jahreswerte bestätigen</button>`}
      </article>`;
  }).join('');

  host.querySelectorAll('[data-confirm-supply]').forEach(button => {
    button.addEventListener('click', () => confirmRecord(button.dataset.confirmSupply));
  });
}

function toggleHolderFields() {
  const holder = document.querySelector('[name="supplyHolder"]')?.value;
  const includePrice = document.querySelector('[name="supplyIncludePrice"]')?.checked === true;
  document.querySelector('[data-direct-unit-fields]')?.classList.toggle('hidden', holder !== 'tenant_direct');
  document.querySelector('[data-supply-price-toggle]')?.classList.toggle('hidden', holder !== 'owner');
  document.querySelector('[data-owner-price-fields]')?.classList.toggle('hidden', holder !== 'owner' || !includePrice);
}

function setDefaultDates() {
  const { year } = scope();
  if (!year) return;
  for (const [name, value] of [
    ['supplyValidFrom', `${year}-01-01`],
    ['supplyValidTo', `${year}-12-31`],
    ['priceValidFrom', `${year}-01-01`],
    ['priceValidTo', `${year}-12-31`]
  ]) {
    const input = document.querySelector(`[name="${name}"]`);
    if (input && !input.value) input.value = value;
  }
}

function render() {
  if (!project) return;
  updateDirectUnits();
  const records = currentRecords();
  updateContractSelectors(records);
  renderRecords(records);
  setDefaultDates();
  toggleHolderFields();
}

function saveAndRefresh(nextProject, success) {
  saveProject(nextProject);
  project = nextProject;
  showFlash(success);
  render();
  document.dispatchEvent(new CustomEvent('np-project-saved'));
}

function confirmRecord(recordId) {
  if (!load()) return;
  try {
    const result = confirmSupplyRecord(project, recordId);
    saveAndRefresh(result.project,
      'Versorgungsvertrag wurde mit Preisständen, tatsächlicher Jahresrechnung und Zahlungsstand bestätigt.');
  } catch (error) {
    showFlash(error.message || 'Versorgungsvertrag ist noch nicht vollständig bestätigbar.', 'error');
  }
}

document.querySelector('[name="supplyHolder"]')?.addEventListener('change', toggleHolderFields);
document.querySelector('[name="supplyIncludePrice"]')?.addEventListener('change', toggleHolderFields);

document.querySelector('[data-supply-form]')?.addEventListener('submit', event => {
  event.preventDefault();
  if (!load()) return;
  const form = new FormData(event.currentTarget);
  const { propertyId, year } = scope();
  if (!propertyId || !year) return;
  const { source, period } = withPeriod(propertyId, year);
  const providerAccountId = normalizeAccount(form.get('supplyAccountId'));
  const providerLabel = String(form.get('supplyProviderLabel') || '').trim();
  const contractHolder = String(form.get('supplyHolder') || 'owner');
  const unitId = contractHolder === 'tenant_direct' ? String(form.get('supplyUnitId') || '') : null;
  if (!providerAccountId || !providerLabel) {
    showFlash('Bitte Versorgername und Vertrags-/Versorgerkennung angeben.', 'error');
    return;
  }
  try {
    const priceVersion = contractHolder === 'owner' && form.get('supplyIncludePrice') === 'on'
      ? priceVersionFromForm(form, 'supply', year) : null;
    const result = createSupplyDraft(source, {
      recordId: newId('supply'),
      propertyId,
      accountingPeriodId: period.id,
      providerAccountId,
      providerLabel,
      service: String(form.get('supplyService') || 'other'),
      contractHolder,
      unitId,
      priceVersion
    });
    saveAndRefresh(result.project, 'Versorgungsvertrag wurde als Entwurf gespeichert. Planung, Rechnung und Zahlungen bleiben getrennt.');
    event.currentTarget.reset();
    document.querySelector('[name="supplyHolder"]').value = 'owner';
    const includePrice = document.querySelector('[name="supplyIncludePrice"]');
    if (includePrice) includePrice.checked = true;
    setDefaultDates();
    toggleHolderFields();
  } catch (error) {
    showFlash(error.message || 'Versorgungsvertrag konnte nicht gespeichert werden.', 'error');
  }
});

document.querySelector('[data-price-version-form]')?.addEventListener('submit', event => {
  event.preventDefault();
  if (!load()) return;
  const form = new FormData(event.currentTarget);
  const { year } = scope();
  const recordId = String(form.get('priceRecordId') || '');
  try {
    const version = priceVersionFromForm(form, 'price', year);
    if (!version) throw new Error('Bitte Preisstand vollständig ausfüllen.');
    const result = addSupplyPriceVersion(project, recordId, version);
    saveAndRefresh(result.project, 'Neuer Preisstand wurde historisch ergänzt. Der vorherige Preisstand bleibt erhalten.');
    event.currentTarget.reset();
    setDefaultDates();
  } catch (error) {
    showFlash(error.message || 'Preisstand konnte nicht ergänzt werden.', 'error');
  }
});

document.querySelector('[name="scopeProperty"]')?.addEventListener('change', () => {
  if (load()) render();
});
document.querySelector('[name="scopeYear"]')?.addEventListener('change', () => {
  if (load()) render();
});
document.addEventListener('np-project-saved', () => {
  if (load()) render();
});

if (load()) render();
