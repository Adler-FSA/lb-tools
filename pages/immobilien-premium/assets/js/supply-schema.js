/**
 * Nebenkosten Premium: optional backward-compatible project-v1 supply registry.
 * Stores references to original expenses and payments, never a second cost ledger.
 * Validation is pure: old v1 projects without this extension remain readable.
 */
export const SUPPLY_REGISTRY_VERSION = 1;
const id = v => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(v);
const text = v => typeof v === 'string' && v.trim().length > 0;
const money = v => Number.isSafeInteger(v) && v >= 0;
const pos = v => Number.isSafeInteger(v) && v > 0;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const day = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(new Date(`${v}T00:00:00.000Z`).valueOf()) &&
  new Date(`${v}T00:00:00.000Z`).toISOString().slice(0, 10) === v;
const next = v => new Date(new Date(`${v}T00:00:00.000Z`).valueOf() + 86400000).toISOString().slice(0, 10);

/** Structural and source-reference errors; no automatic legal approval. */
export function validateSupplyRegistryExtension(project) {
  const errors = [];
  const add = (path, code, message) => errors.push({path, code, message});
  if (!plain(project)) return [{path:'$',code:'INVALID_PROJECT',message:'Projekt fehlt.'}];
  const hasRegistry = Object.hasOwn(project, 'supplyRegistry');
  const hasVersion = Object.hasOwn(project, 'supplyRegistryVersion');
  if (!hasRegistry && !hasVersion) return errors; // Existing project-v1 JSON stays readable.
  if (project.supplyRegistryVersion !== SUPPLY_REGISTRY_VERSION)
    add('supplyRegistryVersion','SUPPLY_VERSION','Unbekannte Version des Versorgungsverzeichnisses.');
  if (!Array.isArray(project.supplyRegistry)) {
    add('supplyRegistry','SUPPLY_REGISTRY_INVALID','Versorgungsverzeichnis muss eine Liste sein.');
    return errors;
  }
  if (!['properties','units','accountingPeriods','expenses','cashflows'].every(k => Array.isArray(project[k]))) {
    add('supplyRegistry','SUPPLY_REFERENCES_INVALID','Zugehörige Originalsammlungen fehlen.');
    return errors;
  }
  const seenIds = new Set(), seenAccounts = new Set(), seenExpenses = new Set(), seenInvoiceLines = new Set();
  const allIds = new Set(['properties','units','tenancies','usagePeriods','contractTerms',
    'accountingPeriods','expenses','allocationRules','meters','readings','cashflows',
    'documents','checkItems','attachments'].flatMap(k => Array.isArray(project[k]) ? project[k].map(x => x?.id) : []));
  for (const [index, record] of project.supplyRegistry.entries()) {
    const p = `supplyRegistry[${index}]`;
    if (!plain(record) || !id(record.id) || !id(record.propertyId) ||
        !id(record.accountingPeriodId) || !plain(record.contract)) {
      add(p,'SUPPLY_RECORD_INVALID','Kennungen und Vertragsdaten fehlen.');
      continue;
    }
    if (seenIds.has(record.id) || allIds.has(record.id)) add(`${p}.id`,'SUPPLY_DUPLICATE_ID','Kennung bereits vergeben.');
    seenIds.add(record.id);
    const period = project.accountingPeriods.find(x => x?.id === record.accountingPeriodId);
    const property = project.properties.find(x => x?.id === record.propertyId);
    if (!property || !period || period.propertyId !== record.propertyId ||
        !day(period.startDate) || !day(period.endDate) || period.startDate > period.endDate) {
      add(p,'SUPPLY_PERIOD_REFERENCE','Gebäude oder Abrechnungsperiode ist ungültig.');
      continue;
    }
    const c = record.contract;
    if (!id(c.providerAccountId) || !text(c.service) ||
        !['owner','tenant_direct'].includes(c.contractHolder) ||
        ![true,false].includes(record.confirmed) ||
        (record.confirmed === true && c.confirmed !== true)) {
      add(`${p}.contract`,'SUPPLY_CONTRACT_INVALID','Vertragspartner, Versorgerkonto oder Bestätigung fehlt.');
      continue;
    }
    const key = `${period.id}\0${c.providerAccountId}`;
    if (seenAccounts.has(key)) add(`${p}.contract.providerAccountId`,'SUPPLY_ACCOUNT_DUPLICATE','Versorgerkonto ist in dieser Periode mehrfach angelegt.');
    seenAccounts.add(key);
    const costs = project.expenses.filter(e => e?.propertyId === period.propertyId &&
      e.providerAccountId === c.providerAccountId &&
      e.startDate <= period.endDate && (e.endDate == null || e.endDate >= period.startDate));
    const payments = project.cashflows.filter(f => f?.propertyId === period.propertyId &&
      f.providerAccountId === c.providerAccountId && f.kind?.startsWith('provider_'));
    // Planning comes BEFORE the supplier issues a year-end bill. A draft may
    // be saved without invented invoice amounts or unconfirmed future tariffs;
    // only the separately invoked annual review may mark it complete.
    if (record.confirmed === false) {
      if (c.contractHolder === 'tenant_direct' &&
          (!id(c.unitId) || !project.units.some(u => u?.id === c.unitId && u.propertyId === period.propertyId) ||
           costs.length || payments.length)) {
        add(`${p}.contract`,'SUPPLY_DIRECT_MIXED','Direktvertrag ist nicht eindeutig von Eigentümerkosten getrennt.');
      }
      if (c.priceVersions !== undefined && (!Array.isArray(c.priceVersions) ||
          c.priceVersions.some(v => !plain(v) ||
            (v.validFrom != null && !day(v.validFrom)) ||
            (v.validTo != null && !day(v.validTo)) ||
            ['baseCentsPerPeriod','plannedWholeUnits','workPriceNumeratorCents'].some(k => v[k] !== undefined && !money(v[k])) ||
            (v.workPriceDenominatorUnits !== undefined && !pos(v.workPriceDenominatorUnits))))) {
        add(`${p}.contract.priceVersions`,'SUPPLY_DRAFT_PRICE_INVALID','Erfasste Vertragswerte müssen gültige Datums- und Zahlenformate haben.');
      }
      if (c.expenseIds !== undefined) {
        if (!Array.isArray(c.expenseIds) || new Set(c.expenseIds).size !== c.expenseIds.length ||
            c.expenseIds.some(expenseId => !costs.some(e => e.id === expenseId))) {
          add(`${p}.contract.expenseIds`,'SUPPLY_DRAFT_EXPENSE_INVALID','Vorgemerkte Rechnungsreferenzen müssen zu diesem Versorger gehören.');
        } else for (const expenseId of c.expenseIds) {
          if (seenExpenses.has(expenseId)) add(`expenses:${expenseId}`,'SUPPLY_EXPENSE_DUPLICATE','Rechnung mehrfach vorgemerkt.');
          seenExpenses.add(expenseId);
        }
      }
      continue;
    }
    if (c.contractHolder === 'tenant_direct') {
      if (!id(c.unitId) || !project.units.some(u => u?.id === c.unitId && u.propertyId === period.propertyId) ||
          c.directSupplyConfirmed !== true || costs.length || payments.length ||
          !Array.isArray(c.expenseIds) || c.expenseIds.length || c.priceVersions !== undefined ||
          c.invoiceTotalsCentsByReference !== undefined) {
        add(`${p}.contract`,'SUPPLY_DIRECT_MIXED','Direktvertrag darf keine Eigentümerkosten, -zahlungen oder Preisprognose enthalten.');
      }
      continue;
    }
    if (!Array.isArray(c.priceVersions) || !c.priceVersions.length) {
      add(`${p}.contract.priceVersions`,'SUPPLY_PRICE_HISTORY','Bestätigte Preisfassungen fehlen.');
    } else {
      let cursor = period.startDate, unit = null;
      for (const [i, v] of c.priceVersions.entries()) {
        const path = `${p}.contract.priceVersions[${i}]`;
        if (!plain(v) || !day(v.validFrom) || !day(v.validTo) ||
            v.validFrom !== cursor || v.validTo < v.validFrom || v.validTo > period.endDate ||
            v.confirmed !== true || !text(v.referenceId) || !money(v.baseCentsPerPeriod) ||
            !money(v.plannedWholeUnits) || !money(v.workPriceNumeratorCents) ||
            !pos(v.workPriceDenominatorUnits) || !text(v.measurementUnit) ||
            (unit !== null && unit !== v.measurementUnit)) {
          add(path,'SUPPLY_PRICE_HISTORY','Preisfassungen müssen lückenlos, belegt, einheitlich und sicher sein.');
          break;
        }
        cursor = next(v.validTo);
        unit = v.measurementUnit;
      }
      if (cursor !== next(period.endDate))
        add(`${p}.contract.priceVersions`,'SUPPLY_PRICE_COVERAGE','Preisfassungen decken die Periode nicht vollständig ab.');
    }
    if (!Array.isArray(c.expenseIds) || !c.expenseIds.length ||
        new Set(c.expenseIds).size !== c.expenseIds.length ||
        c.expenseIds.length !== costs.length || costs.some(e => !c.expenseIds.includes(e.id))) {
      add(`${p}.contract.expenseIds`,'SUPPLY_INVENTORY_INVALID','Alle Originalrechnungspositionen des Kontos genau einmal referenzieren.');
      continue;
    }
    const totals = c.invoiceTotalsCentsByReference;
    if (!plain(totals)) {
      add(`${p}.contract.invoiceTotalsCentsByReference`,'SUPPLY_INVOICE_TOTALS','Originalrechnungsbeträge fehlen.');
      continue;
    }
    const perInvoice = new Map();
    for (const expense of costs) {
      if (!id(expense.id) || !money(expense.amountCents) ||
          !text(expense.invoiceReference) || !text(expense.invoiceLineId) ||
          expense.supplyManaged !== true || expense.startDate !== period.startDate ||
          expense.endDate !== period.endDate) {
        add(`expenses:${expense?.id}`,'SUPPLY_INVOICE_INVALID','Belegte, eindeutig markierte Originalrechnung für dieses Jahr erforderlich.');
        continue;
      }
      if (seenExpenses.has(expense.id)) add(`expenses:${expense.id}`,'SUPPLY_EXPENSE_DUPLICATE','Originalkosten doppelt referenziert.');
      seenExpenses.add(expense.id);
      const invoiceLine = `${period.id}\0${expense.invoiceReference}\0${expense.invoiceLineId}`;
      if (seenInvoiceLines.has(invoiceLine)) add(`expenses:${expense.id}`,'SUPPLY_INVOICE_DUPLICATE','Originalrechnungszeile mehrfach vorhanden.');
      seenInvoiceLines.add(invoiceLine);
      perInvoice.set(expense.invoiceReference,
        (perInvoice.get(expense.invoiceReference) || 0n) + BigInt(expense.amountCents));
    }
    if (Object.keys(totals).length !== perInvoice.size ||
        [...perInvoice].some(([ref, amount]) => !Object.hasOwn(totals, ref) ||
          !money(totals[ref]) || BigInt(totals[ref]) !== amount)) {
      add(`${p}.contract.invoiceTotalsCentsByReference`,'SUPPLY_INVOICE_TOTAL_MISMATCH','Originalrechnungsbeträge und Kostenpositionen stimmen nicht überein.');
    }
    for (const payment of payments) {
      if (payment.accountingPeriodId !== period.id || !money(payment.amountCents) ||
          !['provider_payment','provider_refund'].includes(payment.kind)) {
        add(`cashflows:${payment.id}`,'SUPPLY_PAYMENT_INVALID','Versorgerzahlung oder Periodenzuordnung ist ungeklärt.');
      }
    }
  }
  // Once the registry exists, no explicitly supply-managed original invoice may vanish.
  for (const expense of project.expenses) {
    if (expense?.supplyManaged !== true) continue;
    if (!seenExpenses.has(expense.id)) {
      add(`expenses:${expense.id}`,'SUPPLY_UNASSIGNED_EXPENSE','Versorgungsrechnung ohne bestätigten Vertragsverweis.');
    }
  }
  return errors;
}
