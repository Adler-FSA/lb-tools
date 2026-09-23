import { saveProject } from './storage.js';
import { escapeText, formatEuro, newId, propertyAddress, safeLoadProject, showFlash, updateStoragePill } from './ui-core.js';
import { addInitialContractTerms, changeAdvance, confirmTenancyLedger, recordTenantCashflow, setStandardAllocationRule } from './landlord-management.js';
import { previewLandlordPeriod } from './landlord-preview.js';
import { previewSeparateThermalLandlord } from './landlord-thermal.js';
import { previewLandlordCo2 } from './landlord-co2.js';
import { previewLinkedThermalLandlord } from './landlord-linked-thermal.js';
import { previewLandlordAnnual } from './landlord-annual.js';

const COST_LABELS = {
  property_tax:'Grundsteuer',
  building_insurance:'Gebäudeversicherung',
  waste:'Müll / Entsorgung',
  common_electricity:'Allgemeinstrom',
  cold_water:'Kaltwasser',
  heating:'Heizung',
  hot_water:'Warmwasser',
  thermal_shared:'Gemeinsame Heizung + Warmwasser',
  co2:'CO₂-Kosten',
  repair:'Reparatur / Instandhaltung',
  other:'Sonstige Kosten'
};
const STANDARD_COST_TYPES = ['property_tax','building_insurance','waste','common_electricity','cold_water','heating','hot_water'];

let project = null;
let selectedPropertyId = null;
let selectedPeriodId = null;
let selectedTenancyId = null;

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
function periodsForProperty(propertyId) {
  return (project?.accountingPeriods ?? [])
    .filter(function(p){ return p.propertyId === propertyId && p.endDate; })
    .sort(function(a,b){ return b.startDate.localeCompare(a.startDate); });
}
function selectedPeriod() {
  return project?.accountingPeriods?.find(function(p){ return p.id === selectedPeriodId; }) ?? null;
}
function tenanciesForScope() {
  const period = selectedPeriod();
  if (!period) return [];
  const unitIds = new Set(project.units.filter(function(u){ return u.propertyId === period.propertyId; }).map(function(u){ return u.id; }));
  return project.tenancies.filter(function(t){
    return unitIds.has(t.unitId) && t.startDate <= period.endDate && (t.endDate == null || t.endDate >= period.startDate);
  }).sort(function(a,b){ return a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id); });
}
function unitLabel(tenancy) {
  return project.units.find(function(u){ return u.id === tenancy.unitId; })?.label || tenancy.unitId;
}
function parseEuro(value) {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const parts = raw.split('.');
  const cents = BigInt(parts[0]) * 100n + BigInt(((parts[1] || '') + '00').slice(0,2));
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}
function saveResult(nextProject, success) {
  try {
    saveProject(nextProject);
    project = nextProject;
    showFlash(success);
    render();
  } catch (error) {
    load();
    showFlash(error.message || 'Änderung konnte nicht gespeichert werden.', 'error');
    render();
  }
}
function optionsForTenancies(tenancies) {
  if (!tenancies.length) return '<option value="">Kein Mietverhältnis</option>';
  return tenancies.map(function(t){
    return '<option value="' + escapeText(t.id) + '">' +
      escapeText(t.partyLabel || 'Mietverhältnis') + ' · ' + escapeText(unitLabel(t)) + '</option>';
  }).join('');
}

function renderSelectors() {
  const propertySelect = document.querySelector('[name="landlordProperty"]');
  const properties = project?.properties ?? [];
  propertySelect.innerHTML = properties.map(function(p){
    return '<option value="' + escapeText(p.id) + '">' + escapeText(p.label || propertyAddress(p)) + '</option>';
  }).join('');
  if (!properties.some(function(p){ return p.id === selectedPropertyId; })) selectedPropertyId = properties[0]?.id ?? null;
  if (selectedPropertyId) propertySelect.value = selectedPropertyId;

  const periods = periodsForProperty(selectedPropertyId);
  if (!periods.some(function(p){ return p.id === selectedPeriodId; })) selectedPeriodId = periods[0]?.id ?? null;
  const periodSelect = document.querySelector('[name="landlordPeriod"]');
  periodSelect.innerHTML = periods.length
    ? periods.map(function(p){ return '<option value="' + escapeText(p.id) + '">' + escapeText(p.startDate.slice(0,4)) + '</option>'; }).join('')
    : '<option value="">Kein Abrechnungsjahr</option>';
  periodSelect.disabled = !periods.length;
  if (selectedPeriodId) periodSelect.value = selectedPeriodId;

  const property = properties.find(function(p){ return p.id === selectedPropertyId; });
  document.querySelector('[data-landlord-title]').textContent = property?.label || 'Vermieterabrechnung';
}
function renderTenancySelects() {
  const tenancies = tenanciesForScope();
  if (!tenancies.some(function(t){ return t.id === selectedTenancyId; })) selectedTenancyId = tenancies[0]?.id ?? null;
  const html = optionsForTenancies(tenancies);
  ['contractTenancy','paymentTenancy'].forEach(function(name){
    const select = document.querySelector('[name="' + name + '"]');
    select.innerHTML = html;
    select.disabled = !tenancies.length;
    if (selectedTenancyId) select.value = selectedTenancyId;
  });
}
function renderTenancies() {
  const period = selectedPeriod();
  const tenancies = tenanciesForScope();
  const host = document.querySelector('[data-tenancy-list]');
  if (!tenancies.length) {
    host.innerHTML = '<div class="empty-state"><h3>Kein Mietverhältnis im gewählten Jahr</h3><p>Lege unter Immobilien zunächst eine vermietete Nutzung an.</p><a class="btn btn-secondary" href="immobilien.html">Immobilien öffnen</a></div>';
    return;
  }
  host.innerHTML = tenancies.map(function(t){
    const terms = project.contractTerms.filter(function(x){ return x.tenancyId === t.id; });
    const confirmed = Array.isArray(period?.confirmedTenancyIds) && period.confirmedTenancyIds.includes(t.id);
    const paid = project.cashflows.filter(function(x){
      return x.tenancyId === t.id && x.accountingPeriodId === selectedPeriodId &&
        x.kind === 'tenant_payment' && x.purpose === 'operating_cost_advance';
    }).reduce(function(sum,x){ return sum + x.amountCents; },0);
    return '<div class="unit-row"><div><div class="unit-title">' +
      escapeText(t.partyLabel || 'Mietverhältnis') + '</div><div class="unit-sub">' +
      escapeText(unitLabel(t)) + ' · ' + escapeText(t.startDate) + ' bis ' + escapeText(t.endDate || 'offen') +
      '</div></div><div><span class="kicker">Vertragsfassungen</span><div><strong>' + terms.length +
      '</strong></div></div><div><span class="kicker">Zahlungen erfasst</span><div><strong>' + escapeText(formatEuro(paid)) +
      '</strong></div></div><div>' +
      (confirmed ? '<span class="badge">Zahlungskreis bestätigt</span>' :
        '<button class="btn btn-secondary" type="button" data-confirm-ledger="' + escapeText(t.id) + '">Zahlungskreis bestätigen</button>') +
      '</div></div>';
  }).join('');
  host.querySelectorAll('[data-confirm-ledger]').forEach(function(button){
    button.addEventListener('click', function(){
      try {
        const result = confirmTenancyLedger(project, { accountingPeriodId:selectedPeriodId, tenancyId:button.dataset.confirmLedger });
        saveResult(result.project, 'Zahlungskreis des Mietverhältnisses wurde für dieses Abrechnungsjahr bestätigt.');
      } catch (error) {
        showFlash(error.message, 'error');
      }
    });
  });
}
function contractHistoryHtml(terms) {
  return terms.map(function(term){
    const label = term.operatingCostsModel === 'advance' ? 'Vorauszahlung' : term.operatingCostsModel === 'flat' ? 'Pauschale' : 'Ungeklärt';
    return '<div class="unit-row"><div><div class="unit-title">' + escapeText(label) +
      '</div><div class="unit-sub">' + escapeText(term.startDate) + ' bis ' + escapeText(term.endDate || 'offen') +
      '</div></div><div><span class="kicker">Betrag / Monat</span><div><strong>' +
      (term.operatingCostsModel === 'advance' ? escapeText(formatEuro(term.advanceCents)) : '–') +
      '</strong></div></div><div><span class="kicker">Kostenarten</span><div><strong>' +
      (Array.isArray(term.allowedCostTypes) ? term.allowedCostTypes.length : 0) +
      '</strong></div></div><div></div></div>';
  }).join('');
}
function renderContractPanel() {
  const host = document.querySelector('[data-contract-panel]');
  const tenancy = project?.tenancies?.find(function(t){ return t.id === selectedTenancyId; });
  if (!tenancy) {
    host.innerHTML = '<div class="empty-state"><h3>Kein Mietverhältnis ausgewählt</h3></div>';
    return;
  }
  const terms = project.contractTerms.filter(function(x){ return x.tenancyId === tenancy.id; })
    .sort(function(a,b){ return a.startDate.localeCompare(b.startDate); });

  if (!terms.length) {
    const checks = STANDARD_COST_TYPES.map(function(type){
      return '<label class="card" style="padding:10px"><input style="width:auto;min-height:auto;margin-right:8px" type="checkbox" name="allowedCostType" value="' +
        escapeText(type) + '"> ' + escapeText(COST_LABELS[type]) + '</label>';
    }).join('');
    host.innerHTML =
      '<form data-initial-contract-form><input type="hidden" name="tenancyId" value="' + escapeText(tenancy.id) + '">' +
      '<div class="form-grid"><div><label>Betriebskostenmodell *</label><select name="operatingCostsModel">' +
      '<option value="advance">Vorauszahlung</option><option value="flat">Pauschale</option><option value="unresolved">Noch ungeklärt</option></select></div>' +
      '<div><label>Monatliche Vorauszahlung in €</label><input name="advanceEuro" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00"></div>' +
      '<div class="full"><label>Im Vertrag bestätigte Standard-Kostenarten</label><div class="grid grid-3">' + checks +
      '</div><div class="help">Die Auswahl dokumentiert nur Deine Eingabe. Sie ist keine automatische rechtliche Freigabe.</div></div></div>' +
      '<div class="form-actions"><button class="btn btn-primary" type="submit">Vertragsbasis speichern</button></div></form>';
    host.querySelector('[data-initial-contract-form]').addEventListener('submit', handleInitialContract);
    return;
  }

  const current = [...terms].reverse().find(function(x){ return x.endDate == null; }) ?? terms.at(-1);
  let change = '<div class="notice" style="margin-top:14px">Pauschale oder ungeklärtes Modell wird nicht automatisch in eine Mieterabrechnung umgerechnet.</div>';
  if (current?.operatingCostsModel === 'advance') {
    change = '<form data-advance-change-form style="margin-top:18px"><input type="hidden" name="tenancyId" value="' + escapeText(tenancy.id) +
      '"><h3>Vorauszahlung ab Monat ändern</h3><div class="form-grid"><div><label>Gültig ab *</label><input name="effectiveFrom" type="date" required></div>' +
      '<div><label>Neue Vorauszahlung in € *</label><input name="newAdvanceEuro" type="number" min="0" step="0.01" required></div></div>' +
      '<div class="form-actions"><button class="btn btn-secondary" type="submit">Änderung historisch speichern</button></div></form>';
  }
  host.innerHTML = '<div class="unit-list">' + contractHistoryHtml(terms) + '</div>' + change;
  host.querySelector('[data-advance-change-form]')?.addEventListener('submit', handleAdvanceChange);
}
function handleInitialContract(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const model = String(data.get('operatingCostsModel') || '');
  const amount = parseEuro(data.get('advanceEuro') || '0');
  if (amount === null) return showFlash('Bitte einen gültigen Vorauszahlungsbetrag angeben.', 'error');
  const allowed = [...form.querySelectorAll('[name="allowedCostType"]:checked')].map(function(x){ return x.value; });
  try {
    const result = addInitialContractTerms(project, {
      termId:newId('term'), tenancyId:String(data.get('tenancyId')),
      operatingCostsModel:model, advanceCents:amount, allowedCostTypes:allowed
    });
    saveResult(result.project, 'Vertragsbasis wurde als erste Vertragsfassung gespeichert.');
  } catch (error) { showFlash(error.message, 'error'); }
}
function handleAdvanceChange(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const amount = parseEuro(data.get('newAdvanceEuro'));
  if (amount === null) return showFlash('Bitte einen gültigen neuen Vorauszahlungsbetrag angeben.', 'error');
  try {
    const result = changeAdvance(project, {
      tenancyId:String(data.get('tenancyId')), effectiveFrom:String(data.get('effectiveFrom')),
      newAdvanceCents:amount, newTermId:newId('term')
    });
    saveResult(result.project, 'Vorauszahlungsänderung wurde als neue Vertragsfassung gespeichert.');
  } catch (error) { showFlash(error.message, 'error'); }
}
function renderAllocation() {
  const period = selectedPeriod();
  const host = document.querySelector('[data-allocation-list]');
  if (!period) { host.innerHTML = ''; return; }
  const expenses = project.expenses.filter(function(e){
    return e.propertyId === period.propertyId && e.classification === 'allocatable' &&
      e.startDate <= period.endDate && (e.endDate ?? '9999-12-31') >= period.startDate;
  });
  if (!expenses.length) {
    host.innerHTML = '<div class="empty-state"><h3>Keine prüfbare Umlageposition</h3><p>Unter Kosten & Belege können Positionen zunächst als „Umlage später prüfen“ erfasst werden.</p><a class="btn btn-secondary" href="kosten.html">Kosten öffnen</a></div>';
    return;
  }
  const units = project.units.filter(function(u){ return u.propertyId === period.propertyId; });
  host.innerHTML = expenses.map(function(expense){
    const existing = project.allocationRules.find(function(r){ return r.expenseId === expense.id && r.accountingPeriodId === period.id; });
    if (existing) {
      return '<div class="unit-row"><div><div class="unit-title">' + escapeText(COST_LABELS[expense.category] || expense.category) +
        '</div><div class="unit-sub">' + escapeText(formatEuro(expense.amountCents)) + '</div></div><div><span class="badge">Schlüssel: ' +
        escapeText(existing.method) + '</span></div><div></div><div></div></div>';
    }
    const unitOptions = units.map(function(u){ return '<option value="' + escapeText(u.id) + '">' + escapeText(u.label || u.id) + '</option>'; }).join('');
    const meterFields = units.map(function(unit){
      const meters = project.meters.filter(function(m){ return m.propertyId === period.propertyId && m.unitId === unit.id; });
      const opts = meters.map(function(m){ return '<option value="' + escapeText(m.id) + '">' + escapeText(m.label || m.id) + '</option>'; }).join('');
      return '<label class="kicker">' + escapeText(unit.label || unit.id) + '<select data-meter-unit="' + escapeText(unit.id) +
        '"><option value="">Zähler wählen</option>' + opts + '</select></label>';
    }).join('');
    return '<div class="card" data-allocation-card="' + escapeText(expense.id) + '" style="box-shadow:none">' +
      '<div class="property-top"><div><div class="property-name">' + escapeText(COST_LABELS[expense.category] || expense.category) +
      '</div><div class="property-address">' + escapeText(formatEuro(expense.amountCents)) +
      '</div></div><span class="badge">noch ohne Schlüssel</span></div><div class="form-grid" style="margin-top:12px">' +
      '<div><label>Verteilungsmaßstab *</label><select data-method><option value="area">Fläche</option><option value="consumption">Verbrauch</option><option value="direct">Direkt zu Einheit</option></select></div>' +
      '<div data-direct-wrap class="hidden"><label>Einheit *</label><select data-direct-unit>' + unitOptions + '</select></div>' +
      '<div data-consumption-wrap class="full hidden"><label>Zähler je Einheit *</label><div class="grid grid-2">' + meterFields +
      '</div></div></div><div class="form-actions"><button class="btn btn-primary" type="button" data-save-allocation>Schlüssel speichern</button></div></div>';
  }).join('');

  host.querySelectorAll('[data-allocation-card]').forEach(function(card){
    const method = card.querySelector('[data-method]');
    function sync(){
      card.querySelector('[data-direct-wrap]').classList.toggle('hidden', method.value !== 'direct');
      card.querySelector('[data-consumption-wrap]').classList.toggle('hidden', method.value !== 'consumption');
    }
    method.addEventListener('change', sync); sync();
    card.querySelector('[data-save-allocation]').addEventListener('click', function(){
      const mapping = {};
      if (method.value === 'consumption') {
        card.querySelectorAll('[data-meter-unit]').forEach(function(select){
          if (select.value) mapping[select.dataset.meterUnit] = [select.value];
        });
      }
      try {
        const result = setStandardAllocationRule(project, {
          ruleId:newId('rule'), expenseId:card.dataset.allocationCard,
          accountingPeriodId:selectedPeriodId, method:method.value,
          directUnitId:card.querySelector('[data-direct-unit]')?.value || null,
          meterIdsByUnit:method.value === 'consumption' ? mapping : null
        });
        saveResult(result.project, 'Verteilungsmaßstab wurde für diese Kostenposition gespeichert.');
      } catch (error) { showFlash(error.message, 'error'); }
    });
  });
}

function thermalServiceConfig(prefix, form) {
  const mode = String(new FormData(form).get(prefix + 'Mode') || '');
  if (mode === 'absent') {
    return {
      enabled:false,
      absentConfirmed: form.querySelector('[name="' + prefix + 'AbsentConfirmed"]')?.checked === true
    };
  }
  return {
    enabled:mode === 'present',
    consumptionPercent:Number(form.querySelector('[name="' + prefix + 'Percent"]')?.value),
    mandatory70Applies:form.querySelector('[name="' + prefix + 'Mandatory70"]')?.checked === true,
    rateConfirmed:form.querySelector('[name="' + prefix + 'RateConfirmed"]')?.checked === true,
    readingsConfirmed:form.querySelector('[name="' + prefix + 'ReadingsConfirmed"]')?.checked === true,
    measurementBasisConfirmed:form.querySelector('[name="' + prefix + 'BasisConfirmed"]')?.checked === true,
    userChangeConfirmed:form.querySelector('[name="' + prefix + 'UserChangeConfirmed"]')?.checked === true
  };
}
function collectThermalConfig(form) {
  return {
    scopeConfirmed:form.querySelector('[name="thermalScopeConfirmed"]')?.checked === true,
    costBasisConfirmed:form.querySelector('[name="thermalCostBasisConfirmed"]')?.checked === true,
    co2CostsSeparateConfirmed:form.querySelector('[name="thermalCo2SeparateConfirmed"]')?.checked === true,
    exceptionReviewedStandard:form.querySelector('[name="thermalExceptionReviewed"]')?.checked === true,
    groupPreallocationNotRequired:form.querySelector('[name="thermalNoGroupPreallocation"]')?.checked === true,
    heating:thermalServiceConfig('heating', form),
    hot_water:thermalServiceConfig('hotWater', form)
  };
}
function parseKgToGrams(value) {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,3})?$/.test(raw)) return null;
  const parts = raw.split('.');
  const grams = BigInt(parts[0]) * 1000n + BigInt(((parts[1] || '') + '000').slice(0,3));
  return grams <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(grams) : null;
}
function collectCo2Config(form) {
  const emissionsGrams = parseKgToGrams(form.querySelector('[name="co2EmissionsKg"]')?.value);
  const confirmedInvoiceCo2Cents = parseEuro(form.querySelector('[name="co2InvoiceEuro"]')?.value);
  if (emissionsGrams === null || confirmedInvoiceCo2Cents === null) return null;
  return {
    applicabilityReviewed:form.querySelector('[name="co2ApplicabilityReviewed"]')?.checked === true,
    specialHeatingCasesExcludedConfirmed:form.querySelector('[name="co2SpecialCasesExcluded"]')?.checked === true,
    reductionExceptionsExcludedConfirmed:form.querySelector('[name="co2ReductionExceptionsExcluded"]')?.checked === true,
    ownerCentralSupplyConfirmed:form.querySelector('[name="co2OwnerCentralSupply"]')?.checked === true,
    invoiceInventoryConfirmed:form.querySelector('[name="co2InvoiceInventoryConfirmed"]')?.checked === true,
    areaBasisConfirmed:form.querySelector('[name="co2AreaBasisConfirmed"]')?.checked === true,
    areaEvidenceRef:String(form.querySelector('[name="co2AreaEvidenceRef"]')?.value || '').trim(),
    emissionsGrams,
    emissionsEvidenceRef:String(form.querySelector('[name="co2EmissionsEvidenceRef"]')?.value || '').trim(),
    emissionsPeriodConfirmed:form.querySelector('[name="co2EmissionsPeriodConfirmed"]')?.checked === true,
    confirmedInvoiceCo2Cents,
    tenantAllocationRequested:form.querySelector('[name="co2TenantAllocationRequested"]')?.checked === true,
    tenantOnlyOccupancyConfirmed:form.querySelector('[name="co2TenantOnlyOccupancy"]')?.checked === true,
    thermalCostShareMethodReviewed:form.querySelector('[name="co2ThermalMethodReviewed"]')?.checked === true,
    originalCo2ExcludedFromThermalConfirmed:form.querySelector('[name="co2ExcludedFromThermal"]')?.checked === true,
    distributionEvidenceRef:String(form.querySelector('[name="co2DistributionEvidenceRef"]')?.value || '').trim()
  };
}
function renderCo2Result(result) {
  const host = document.querySelector('[data-co2-result]');
  if (!host) return;
  if (result.status === 'blocked' || !result.buildingReport) {
    const rows = (result.issues ?? []).slice(0,8).map(function(issue){
      return '<div class="unit-row"><div><div class="unit-title">' + escapeText(issue.code) +
        '</div><div class="unit-sub">' + escapeText(issue.detail) + '</div></div><div></div><div></div><div></div></div>';
    }).join('');
    host.innerHTML = '<div class="notice"><strong>CO₂-Vorschau gesperrt.</strong> Fehlende Nachweise oder nicht unterstützte Fälle werden nicht geschätzt.</div><div class="unit-list" style="margin-top:10px">' + rows + '</div>';
    return;
  }
  const b = result.buildingReport;
  let tenantHtml = '';
  if (result.status === 'tenant_preview' && result.tenantReport) {
    tenantHtml = '<div class="grid grid-2" style="margin-top:14px">' +
      result.tenantReport.tenants.map(function(row){
        const tenancy = project.tenancies.find(function(t){ return t.id === row.tenancyId; });
        return '<div class="mini-stat"><span>' + escapeText(tenancy?.partyLabel || row.tenancyId) +
          '</span><strong>' + escapeText(formatEuro(row.provisionalCo2Cents)) + '</strong></div>';
      }).join('') + '</div><div class="notice" style="margin-top:14px">Individuelle CO₂-Beträge sind ausschließlich eine technische Vorschau und noch nicht gebucht oder rechtlich freigegeben.</div>';
  } else if ((result.issues ?? []).length) {
    tenantHtml = '<div class="notice" style="margin-top:14px"><strong>Gebäudestufe berechnet, individuelle Mieteraufteilung bleibt gesperrt.</strong> ' +
      escapeText(result.issues[0].detail) + '</div>';
  } else {
    tenantHtml = '<div class="notice" style="margin-top:14px">Nur Gebäudestufe berechnet. Eine individuelle Mieteraufteilung wurde nicht angefordert.</div>';
  }
  host.innerHTML =
    '<div class="grid grid-4"><div class="metric"><div class="metric-label">CO₂-Originalkosten</div><div class="metric-value">' +
    escapeText(formatEuro(b.originalInvoiceCents)) + '</div></div><div class="metric"><div class="metric-label">Gebäudestufe</div><div class="metric-value">' +
    escapeText(String(b.stageIndex)) + '</div><div class="metric-note">' +
    escapeText(new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(b.specificEmissionsTenthsKgPerM2Year / 10)) + ' kg CO₂/m²a</div></div>' +
    '<div class="metric"><div class="metric-label">Eigentümeranteil</div><div class="metric-value">' +
    escapeText(formatEuro(b.buildingLandlordPortionCents)) + '</div><div class="metric-note">' + escapeText(String(b.landlordPercent)) + ' %</div></div>' +
    '<div class="metric"><div class="metric-label">Noch nicht zugeordnet</div><div class="metric-value">' +
    escapeText(formatEuro(b.unallocatedRemainderCents)) + '</div><div class="metric-note">Mieterpool vor Einzelprüfung</div></div></div>' +
    tenantHtml;
}
function renderThermalResult(result) {
  const host = document.querySelector('[data-thermal-result]');
  if (!host) return;
  if (result.status !== 'preview' || !result.report) {
    const rows = (result.issues ?? []).slice(0,8).map(function(issue){
      return '<div class="unit-row"><div><div class="unit-title">' + escapeText(issue.code) +
        '</div><div class="unit-sub">' + escapeText(issue.detail) + '</div></div><div></div><div></div><div></div></div>';
    }).join('');
    host.innerHTML = '<div class="notice"><strong>Wärmevorschau gesperrt.</strong> Es werden keine fehlenden Werte ergänzt oder Annahmen erfunden.</div><div class="unit-list" style="margin-top:10px">' + rows + '</div>';
    return;
  }
  const tenantTotal = result.report.tenants.reduce(function(sum,row){ return sum + row.costsCents; },0);
  const streams = result.report.streams.map(function(stream){
    return '<div class="mini-stat"><span>' + escapeText(COST_LABELS[stream.kind] || stream.kind) +
      '</span><strong>' + escapeText(formatEuro(stream.totalCents)) + '</strong></div>';
  }).join('');
  host.innerHTML =
    '<div class="grid grid-3"><div class="metric"><div class="metric-label">Wärmekosten gesamt</div><div class="metric-value">' +
    escapeText(formatEuro(result.report.totalCostsCents)) + '</div></div><div class="metric"><div class="metric-label">Eigentümeranteil</div><div class="metric-value">' +
    escapeText(formatEuro(result.report.ownerCostsCents)) + '</div></div><div class="metric"><div class="metric-label">Mieteranteile gesamt</div><div class="metric-value">' +
    escapeText(formatEuro(tenantTotal)) + '</div></div></div><div class="grid grid-2" style="margin-top:14px">' + streams +
    '</div><div class="notice" style="margin-top:14px">Technischer Wärme-Teilbericht. Noch nicht mit Standardkosten oder CO₂ zusammengeführt; keine Rechts- oder PDF-Freigabe.</div>';
}


function linkedRelevantExpenses() {
  const period = selectedPeriod();
  if (!period || !project) return [];
  return project.expenses.filter(function(expense){
    return expense.propertyId === period.propertyId &&
      ['thermal_shared','heating','hot_water','co2','heating_oil'].includes(expense.category) &&
      expense.startDate <= period.endDate && (expense.endDate ?? '9999-12-31') >= period.startDate;
  });
}
function renderLinkedInvoiceInputs() {
  const host = document.querySelector('[data-linked-invoice-totals]');
  if (!host) return;
  const refs = [...new Set(linkedRelevantExpenses().map(function(e){ return e.invoiceReference; }).filter(Boolean))].sort();
  if (!refs.length) {
    host.innerHTML = '<div class="empty-state"><h3>Noch keine Wärmerechnung</h3><p>Für eine verbundene Anlage müssen die Originalkosten zuerst unter Kosten & Belege erfasst werden.</p><a class="btn btn-secondary" href="kosten.html">Kosten öffnen</a></div>';
    return;
  }
  host.innerHTML = refs.map(function(ref){
    const recorded = linkedRelevantExpenses().filter(function(e){ return e.invoiceReference === ref; })
      .reduce(function(sum,e){ return sum + (Number.isSafeInteger(e.amountCents) ? e.amountCents : 0); },0);
    return '<div><label>Originalrechnung ' + escapeText(ref) + ' · erfasste Positionen ' + escapeText(formatEuro(recorded)) +
      '</label><input data-linked-invoice-ref="' + escapeText(ref) + '" type="number" min="0" step="0.01" inputmode="decimal" placeholder="vollständiger Rechnungsbetrag"></div>';
  }).join('');
}
function collectLinkedInvoiceTotals(form) {
  const totals = {};
  let valid = true;
  form.querySelectorAll('[data-linked-invoice-ref]').forEach(function(input){
    const cents = parseEuro(input.value);
    if (cents === null) valid = false;
    else totals[input.dataset.linkedInvoiceRef] = cents;
  });
  return valid ? totals : null;
}
function linkedServiceConfig(prefix, form) {
  return {
    consumptionPercent:Number(form.querySelector('[name="' + prefix + 'LinkedPercent"]')?.value),
    mandatory70Applies:form.querySelector('[name="' + prefix + 'LinkedMandatory70"]')?.checked === true,
    rateConfirmed:form.querySelector('[name="' + prefix + 'LinkedRateConfirmed"]')?.checked === true,
    readingsConfirmed:form.querySelector('[name="' + prefix + 'LinkedReadingsConfirmed"]')?.checked === true,
    measurementBasisConfirmed:form.querySelector('[name="' + prefix + 'LinkedBasisConfirmed"]')?.checked === true
  };
}
function collectLinkedConfig(form) {
  const totals = collectLinkedInvoiceTotals(form);
  const totalEnergyKWh = Number(String(form.querySelector('[name="linkedTotalEnergyKWh"]')?.value || '').replace(',','.'));
  const hotWaterEnergyKWh = Number(String(form.querySelector('[name="linkedHotWaterEnergyKWh"]')?.value || '').replace(',','.'));
  if (!totals || !Number.isFinite(totalEnergyKWh) || !Number.isFinite(hotWaterEnergyKWh)) return null;
  return {
    plantType:String(form.querySelector('[name="linkedPlantType"]')?.value || ''),
    scopeConfirmed:form.querySelector('[name="linkedScopeConfirmed"]')?.checked === true,
    invoiceInventoryConfirmed:form.querySelector('[name="linkedInvoiceInventoryConfirmed"]')?.checked === true,
    co2ExcludedConfirmed:form.querySelector('[name="linkedCo2ExcludedConfirmed"]')?.checked === true,
    samePhysicalBasisConfirmed:form.querySelector('[name="linkedSameBasisConfirmed"]')?.checked === true,
    methodReviewed:form.querySelector('[name="linkedMethodReviewed"]')?.checked === true,
    totalEnergyKWh,
    hotWaterEnergyKWh,
    totalEvidenceRef:String(form.querySelector('[name="linkedTotalEvidenceRef"]')?.value || '').trim(),
    hotWaterEvidenceRef:String(form.querySelector('[name="linkedHotWaterEvidenceRef"]')?.value || '').trim(),
    invoiceTotalsCentsByReference:totals,
    heating:linkedServiceConfig('heating', form),
    hot_water:linkedServiceConfig('hotWater', form)
  };
}
function renderLinkedThermalResult(result) {
  const host = document.querySelector('[data-linked-result]');
  if (!host) return;
  if (result.status !== 'preview' || !result.report) {
    const rows = (result.issues ?? []).slice(0,8).map(function(issue){
      return '<div class="unit-row"><div><div class="unit-title">' + escapeText(issue.code) +
        '</div><div class="unit-sub">' + escapeText(issue.detail) + '</div></div><div></div><div></div><div></div></div>';
    }).join('');
    host.innerHTML = '<div class="notice"><strong>Verbundene Anlage noch gesperrt.</strong> Originalrechnungen, Energiegrundlage und Messwerte müssen vollständig zusammenpassen.</div><div class="unit-list" style="margin-top:10px">' + rows + '</div>';
    return;
  }
  const linked = result.report.linkedCosts;
  const streams = result.report.streams.map(function(stream){
    return '<div class="mini-stat"><span>' + escapeText(COST_LABELS[stream.kind] || stream.kind) +
      '</span><strong>' + escapeText(formatEuro(stream.totalCents)) + '</strong></div>';
  }).join('');
  host.innerHTML =
    '<div class="grid grid-4"><div class="metric"><div class="metric-label">Originale Wärmekosten</div><div class="metric-value">' +
    escapeText(formatEuro(linked.originalCents)) + '</div></div><div class="metric"><div class="metric-label">Heizung nach Vortrennung</div><div class="metric-value">' +
    escapeText(formatEuro(result.report.streams.find(function(x){return x.kind==="heating";})?.totalCents || 0)) +
    '</div></div><div class="metric"><div class="metric-label">Warmwasser nach Vortrennung</div><div class="metric-value">' +
    escapeText(formatEuro(result.report.streams.find(function(x){return x.kind==="hot_water";})?.totalCents || 0)) +
    '</div></div><div class="metric"><div class="metric-label">CO₂ separat</div><div class="metric-value">' +
    escapeText(formatEuro(linked.excludedCo2Cents)) + '</div></div></div><div class="grid grid-2" style="margin-top:14px">' +
    streams + '</div><div class="notice" style="margin-top:14px">Die gemeinsame Originalrechnung wurde nur einmal gezählt. Die Aufteilung in Heizung und Warmwasser ist temporär; Originalkosten bleiben unverändert und CO₂ bleibt separat.</div>';
}

function periodSpecialFlags() {
  const period = selectedPeriod();
  if (!period) return {heating:false,linked:false,co2:false};
  const expenses = project.expenses.filter(function(expense){
    return expense.propertyId === period.propertyId &&
      expense.startDate <= period.endDate && (expense.endDate ?? '9999-12-31') >= period.startDate;
  });
  return {
    heating:expenses.some(function(e){ return ['heating','hot_water','thermal_shared'].includes(e.category); }),
    linked:expenses.some(function(e){ return e.category === 'thermal_shared'; }),
    co2:expenses.some(function(e){ return e.category === 'co2'; })
  };
}
function annualBlock(message, issues) {
  return {
    status:'blocked',
    issues:(issues && issues.length ? issues : [{code:'LANDLORD_ANNUAL_INPUT_REQUIRED',detail:message}]),
    report:null
  };
}
function buildAnnualPreviewFromForms() {
  const flags = periodSpecialFlags();
  const plans = {};
  let separateConfig = null;

  if (flags.heating) {
    if (flags.linked) {
      const linkedForm = document.querySelector('[data-linked-form]');
      const linkedConfig = linkedForm ? collectLinkedConfig(linkedForm) : null;
      if (!linkedConfig) return annualBlock('Angaben zur verbundenen Anlage sind unvollständig.');
      const linkedResult = previewLinkedThermalLandlord(project, selectedPeriodId, linkedConfig);
      if (linkedResult.status !== 'preview') return annualBlock('Verbundene Anlage ist noch nicht vollständig geprüft.', linkedResult.issues);
      plans.linked = linkedResult.linkedPlan;
      plans.thermal = linkedResult.thermalPlan;
    } else {
      const thermalForm = document.querySelector('[data-thermal-form]');
      separateConfig = thermalForm ? collectThermalConfig(thermalForm) : null;
      if (!separateConfig) return annualBlock('Angaben zu Heizung/Warmwasser fehlen.');
      const thermalResult = previewSeparateThermalLandlord(project, selectedPeriodId, separateConfig);
      if (thermalResult.status !== 'preview') return annualBlock('Wärme-Teilbericht ist noch nicht vollständig geprüft.', thermalResult.issues);
      plans.thermal = thermalResult.plan;
    }
  }

  if (flags.co2) {
    const co2Form = document.querySelector('[data-co2-form]');
    const co2Config = co2Form ? collectCo2Config(co2Form) : null;
    if (!co2Config) return annualBlock('CO₂-Angaben sind unvollständig.');
    if (co2Config.tenantAllocationRequested !== true) {
      return annualBlock('Für die gemeinsame Jahresvorschau muss die individuelle CO₂-Mieteraufteilung ausdrücklich angefordert und geprüft werden.');
    }
    const thermalForCo2 = separateConfig ?? (document.querySelector('[data-thermal-form]') ? collectThermalConfig(document.querySelector('[data-thermal-form]')) : null);
    const co2Result = previewLandlordCo2(project, selectedPeriodId, co2Config, thermalForCo2);
    if (!co2Result.co2BuildingPlan || !co2Result.co2TenantPlan) {
      return annualBlock('CO₂-Gebäude- und Mieterplan sind noch nicht vollständig bestätigt.', co2Result.issues);
    }
    plans.co2Building = co2Result.co2BuildingPlan;
    plans.co2Tenants = co2Result.co2TenantPlan;
  }

  return previewLandlordAnnual(project, selectedPeriodId, plans);
}
function renderAnnualResult(result) {
  const host = document.querySelector('[data-annual-result]');
  if (!host) return;
  if (result.status !== 'preview' || !result.report) {
    const rows = (result.issues ?? []).slice(0,10).map(function(issue){
      return '<div class="unit-row"><div><div class="unit-title">' + escapeText(issue.code || 'BLOCKIERT') +
        '</div><div class="unit-sub">' + escapeText(issue.detail || 'Datengrundlage unvollständig.') +
        '</div></div><div></div><div></div><div></div></div>';
    }).join('');
    host.innerHTML = '<div class="notice"><strong>Gesamtjahresvorschau noch gesperrt.</strong> Der Produktions-Orchestrator hat sicher gestoppt; keine Teilvorschau wird als fertige Abrechnung ausgegeben.</div><div class="unit-list" style="margin-top:10px">' + rows + '</div>';
    return;
  }
  const r = result.report;
  const cards = (r.tenants ?? []).map(function(t){
    const saldo = t.creditCents ? 'Guthaben ' + formatEuro(t.creditCents) : 'Zusätzlich ' + formatEuro(t.additionalCents || 0);
    return '<article class="card" style="box-shadow:none"><div class="eyebrow">Jahresvorschau</div><h3>' +
      escapeText(t.partyLabel || t.tenancyId) + '</h3><div class="kicker">' + escapeText(t.unitLabel || '') +
      '</div><div class="property-stats" style="margin-top:12px"><div class="mini-stat"><span>Kostenanteil</span><strong>' +
      escapeText(formatEuro(t.costsCents)) + '</strong></div><div class="mini-stat"><span>Vorauszahlungen tatsächlich</span><strong>' +
      escapeText(formatEuro(t.advancesActuallyPaidCents || 0)) + '</strong></div><div class="mini-stat"><span>Technischer Saldo</span><strong>' +
      escapeText(saldo) + '</strong></div></div></article>';
  }).join('');
  host.innerHTML =
    '<div class="grid grid-3"><div class="metric"><div class="metric-label">Originalkosten gesamt</div><div class="metric-value">' +
    escapeText(formatEuro(r.originalCostsCents)) + '</div></div><div class="metric"><div class="metric-label">Eigentümeranteil</div><div class="metric-value">' +
    escapeText(formatEuro(r.ownerCostsCents)) + '</div></div><div class="metric"><div class="metric-label">Mieteranteile gesamt</div><div class="metric-value">' +
    escapeText(formatEuro(r.tenantCostsCents)) + '</div></div></div><div class="grid grid-2" style="margin-top:16px">' +
    cards + '</div><div class="notice" style="margin-top:14px"><strong>Gesamtprüfung bestanden.</strong> Alle Originalkosten wurden im Jahres-Orchestrator abgeglichen. Trotzdem bleibt diese Ansicht nicht buchbar: keine Rechtsfreigabe, kein PDF und keine automatische Forderung.</div>';
}

function renderPreview() {
  const host = document.querySelector('[data-landlord-preview]');
  if (!selectedPeriodId) {
    host.innerHTML = '<div class="empty-state"><h3>Noch kein Abrechnungsjahr</h3></div>';
    return;
  }
  const result = previewLandlordPeriod(project, selectedPeriodId);
  if (result.status !== 'preview') {
    const rows = (result.issues ?? []).slice(0,8).map(function(issue){
      return '<div class="unit-row"><div><div class="unit-title">' + escapeText(issue.code) +
        '</div><div class="unit-sub">' + escapeText(issue.detail) + '</div></div><div></div><div></div><div></div></div>';
    }).join('');
    host.innerHTML = '<div class="notice"><strong>Einzelabrechnung noch gesperrt.</strong> Der Rechenkern nennt die noch fehlenden Grundlagen; es wird nichts geschätzt.</div><div class="unit-list" style="margin-top:10px">' + rows + '</div>';
    return;
  }
  const r = result.report;
  const tenantCards = r.tenants.map(function(t){
    const saldo = t.creditCents ? 'Guthaben ' + formatEuro(t.creditCents) : 'Zusätzlich ' + formatEuro(t.additionalCents);
    return '<article class="card" style="box-shadow:none"><div class="eyebrow">Einzelvorschau</div><h3>' + escapeText(t.partyLabel) +
      '</h3><div class="kicker">' + escapeText(t.unitLabel) + '</div><div class="property-stats" style="margin-top:12px">' +
      '<div class="mini-stat"><span>Kostenanteil</span><strong>' + formatEuro(t.costsCents) +
      '</strong></div><div class="mini-stat"><span>Zahlungen</span><strong>' + formatEuro(t.advancesCents) +
      '</strong></div><div class="mini-stat"><span>Saldo</span><strong>' + escapeText(saldo) + '</strong></div></div></article>';
  }).join('');
  host.innerHTML = '<div class="grid grid-3"><div class="metric"><div class="metric-label">Gesamtkosten</div><div class="metric-value">' +
    formatEuro(r.totalCostsCents) + '</div></div><div class="metric"><div class="metric-label">Eigentümeranteil</div><div class="metric-value">' +
    formatEuro(r.ownerCostsCents) + '</div></div><div class="metric"><div class="metric-label">Mieteranteile gesamt</div><div class="metric-value">' +
    formatEuro(r.tenantCostsCents) + '</div></div></div><div class="grid grid-2" style="margin-top:16px">' + tenantCards +
    '</div><div class="notice" style="margin-top:14px">Dies ist eine technische Einzelvorschau. Es wird noch keine freigegebene Mieterabrechnung oder PDF erzeugt.</div>';
}
function render() {
  if (!project?.properties?.length) {
    document.querySelector('[data-no-property]').classList.remove('hidden');
    document.querySelector('[data-landlord-workspace]').classList.add('hidden');
    return;
  }
  document.querySelector('[data-no-property]').classList.add('hidden');
  document.querySelector('[data-landlord-workspace]').classList.remove('hidden');
  renderSelectors();
  renderTenancySelects();
  renderTenancies();
  renderContractPanel();
  renderAllocation();
  renderLinkedInvoiceInputs();
  renderPreview();
  const period = selectedPeriod();
  const date = document.querySelector('[name="paymentDate"]');
  if (date && !date.value && period) date.value = period.startDate;
}

document.querySelector('[name="landlordProperty"]').addEventListener('change', function(event){
  selectedPropertyId = event.target.value;
  selectedPeriodId = periodsForProperty(selectedPropertyId)[0]?.id ?? null;
  selectedTenancyId = null;
  render();
});
document.querySelector('[name="landlordPeriod"]').addEventListener('change', function(event){
  selectedPeriodId = event.target.value || null;
  selectedTenancyId = null;
  render();
});
document.querySelector('[name="contractTenancy"]').addEventListener('change', function(event){
  selectedTenancyId = event.target.value || null;
  const payment = document.querySelector('[name="paymentTenancy"]');
  if (payment && selectedTenancyId) payment.value = selectedTenancyId;
  renderContractPanel();
});
document.querySelector('[data-payment-form]').addEventListener('submit', function(event){
  event.preventDefault();
  if (!load() || !project) return;
  const data = new FormData(event.currentTarget);
  const amount = parseEuro(data.get('paymentEuro'));
  if (amount === null) return showFlash('Bitte einen gültigen Betrag angeben.', 'error');
  const entryType = String(data.get('entryType'));
  try {
    const result = recordTenantCashflow(project, {
      cashflowId:newId('cashflow'),
      tenancyId:String(data.get('paymentTenancy')),
      accountingPeriodId:selectedPeriodId,
      kind:entryType === 'due' ? 'tenant_advance_due' : 'tenant_payment',
      purpose:String(data.get('paymentPurpose') || 'operating_cost_advance'),
      amountCents:amount,
      date:String(data.get('paymentDate')),
      confirmedDue:entryType === 'due'
    });
    saveResult(result.project, entryType === 'due' ? 'Bestätigter Soll-Eintrag wurde gespeichert.' : 'Tatsächliche Mieterzahlung wurde gespeichert.');
    event.currentTarget.reset();
  } catch (error) { showFlash(error.message, 'error'); }
});


document.querySelector('[data-thermal-form]')?.addEventListener('submit', function(event){
  event.preventDefault();
  if (!load() || !project || !selectedPeriodId) return;
  const form = event.currentTarget;
  const config = collectThermalConfig(form);
  const result = previewSeparateThermalLandlord(project, selectedPeriodId, config);
  renderThermalResult(result);
});

document.querySelector('[data-co2-form]')?.addEventListener('submit', function(event){
  event.preventDefault();
  if (!load() || !project || !selectedPeriodId) return;
  const form = event.currentTarget;
  const config = collectCo2Config(form);
  if (!config) {
    showFlash('Bitte Emissionen in kg und bestätigten CO₂-Rechnungsbetrag vollständig angeben.', 'error');
    return;
  }
  const thermalForm = document.querySelector('[data-thermal-form]');
  const thermalConfig = thermalForm ? collectThermalConfig(thermalForm) : null;
  const result = previewLandlordCo2(project, selectedPeriodId, config, thermalConfig);
  renderCo2Result(result);
});

document.querySelector('[data-linked-form]')?.addEventListener('submit', function(event){
  event.preventDefault();
  if (!load() || !project || !selectedPeriodId) return;
  const form = event.currentTarget;
  const config = collectLinkedConfig(form);
  if (!config) {
    showFlash('Bitte Energiegrundlage und vollständige Originalrechnungsbeträge angeben.', 'error');
    return;
  }
  const result = previewLinkedThermalLandlord(project, selectedPeriodId, config);
  renderLinkedThermalResult(result);
});

document.querySelector('[data-annual-form]')?.addEventListener('submit', function(event){
  event.preventDefault();
  if (!load() || !project || !selectedPeriodId) return;
  renderAnnualResult(buildAnnualPreviewFromForms());
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
  selectedPeriodId = periodsForProperty(selectedPropertyId)[0]?.id ?? null;
  render();
}
