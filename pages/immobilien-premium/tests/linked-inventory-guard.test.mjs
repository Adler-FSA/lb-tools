import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedLinkedHeatInventory } from '../assets/js/linked-inventory-guard.js';

const entries = () => [
  { id: 'shared', category: 'thermal_shared' },
  { id: 'serviceHeat', category: 'heating' },
  { id: 'serviceWater', category: 'hot_water' }
];
const plan = () => ({ system: 'linked', scopeConfirmed: true, invoiceInventoryConfirmed: true,
  sharedExpenseIds: ['shared'], heatingOnlyExpenseIds: ['serviceHeat'],
  hotWaterOnlyExpenseIds: ['serviceWater'] });

test('MH-07 combined plant accepts complete explicitly confirmed shared and direct invoice inventory', () => {
  const costs = entries(), selection = plan();
  const before = JSON.stringify({ costs, selection });
  assert.equal(verifiedLinkedHeatInventory(costs, selection), true);
  assert.equal(JSON.stringify({ costs, selection }), before);
});
test('direct heating maintenance may coexist with shared energy, even without direct hot-water charge', () => {
  const costs = entries().slice(0, 2), selection = plan();
  selection.hotWaterOnlyExpenseIds = [];
  assert.equal(verifiedLinkedHeatInventory(costs, selection), true);
});
test('shared-only route remains eligible for existing detailed preallocator review', () => {
  assert.equal(verifiedLinkedHeatInventory([entries()[0]], {}), true);
});
test('missing or draft inventory confirmation blocks coexistence', () => {
  assert.equal(verifiedLinkedHeatInventory(entries(), {}), false);
  const selection = plan(); selection.invoiceInventoryConfirmed = false;
  assert.equal(verifiedLinkedHeatInventory(entries(), selection), false);
  selection.invoiceInventoryConfirmed = true; selection.scopeConfirmed = false;
  assert.equal(verifiedLinkedHeatInventory(entries(), selection), false);
});
test('missing source or redundant phantom source blocks', () => {
  const missing = plan(); missing.hotWaterOnlyExpenseIds = [];
  assert.equal(verifiedLinkedHeatInventory(entries(), missing), false);
  const extra = plan(); extra.hotWaterOnlyExpenseIds.push('notOnOriginalInvoice');
  assert.equal(verifiedLinkedHeatInventory(entries(), extra), false);
});
test('incorrect category mapping and cross-pool duplicate identifiers block', () => {
  const wrong = plan(); wrong.heatingOnlyExpenseIds = ['serviceWater'];
  wrong.hotWaterOnlyExpenseIds = ['serviceHeat'];
  assert.equal(verifiedLinkedHeatInventory(entries(), wrong), false);
  const double = plan(); double.hotWaterOnlyExpenseIds.push('shared');
  assert.equal(verifiedLinkedHeatInventory(entries(), double), false);
});
test('duplicate original IDs or no shared costs block', () => {
  assert.equal(verifiedLinkedHeatInventory([...entries(), entries()[0]], plan()), false);
  assert.equal(verifiedLinkedHeatInventory(entries().slice(1), plan()), false);
});
test('unrelated expense categories and corrupted input are never accepted', () => {
  assert.equal(verifiedLinkedHeatInventory([...entries(), { id: 'co2', category: 'co2' }], plan()), false);
  assert.equal(verifiedLinkedHeatInventory(null, plan()), false);
  assert.equal(verifiedLinkedHeatInventory([{ id: '', category: 'heating' }], plan()), false);
});
