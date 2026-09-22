/**
 * Annual workflow preflight for a linked heating/hot-water plant with direct costs.
 * The linked preallocator performs invoice and energy checks later; this gate
 * prevents direct heating or hot-water invoices from being silently omitted.
 * Pure: no expense creation, data mutation, booking or release.
 */
const fields = Object.freeze({
  thermal_shared: 'sharedExpenseIds',
  heating: 'heatingOnlyExpenseIds',
  hot_water: 'hotWaterOnlyExpenseIds'
});

export function verifiedLinkedHeatInventory(heatingExpenses, plan) {
  if (!Array.isArray(heatingExpenses) || !heatingExpenses.length ||
      heatingExpenses.some(e => !e || typeof e.id !== 'string' || !e.id ||
        !Object.hasOwn(fields, e.category)) ||
      new Set(heatingExpenses.map(e => e.id)).size !== heatingExpenses.length) return false;
  if (!heatingExpenses.some(e => e.category === 'thermal_shared')) return false;
  // Shared-only input remains subject to all existing checks in thermal-linked.js.
  if (!heatingExpenses.some(e => e.category === 'heating' || e.category === 'hot_water')) return true;
  if (!plan || plan.system !== 'linked' || plan.scopeConfirmed !== true ||
      plan.invoiceInventoryConfirmed !== true) return false;
  const claimed = new Map();
  for (const [kind, field] of Object.entries(fields)) {
    const ids = plan[field];
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id)) return false;
    for (const id of ids) {
      if (claimed.has(id)) return false;
      claimed.set(id, kind);
    }
  }
  return claimed.size === heatingExpenses.length &&
    heatingExpenses.every(expense => claimed.get(expense.id) === expense.category);
}
