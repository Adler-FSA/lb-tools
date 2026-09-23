import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../assets/js/model.js';
import {
  HistoryChangeError, changeUnitArea, changeUnitUsage, replaceMeter
} from '../assets/js/history-changes.js';

function ownerFixture() {
  const p = createEmptyProject('history_project');
  p.properties.push({ id: 'house' });
  p.units.push({
    id: 'unit1', propertyId: 'house',
    areaHistory: [{ from: '2026-01-01', to: null, hundredthsM2: 8000 }]
  });
  p.usagePeriods.push({
    id: 'usage_owner', unitId: 'unit1', kind: 'owner',
    startDate: '2026-01-01', endDate: null
  });
  return p;
}

function tenantFixture() {
  const p = ownerFixture();
  p.usagePeriods = [{
    id: 'usage_tenant1', unitId: 'unit1', kind: 'tenant', tenancyId: 'tenant1',
    startDate: '2026-01-01', endDate: null
  }];
  p.tenancies.push({
    id: 'tenant1', unitId: 'unit1', startDate: '2026-01-01', endDate: null,
    partyLabel: 'Alt'
  });
  return p;
}

test('area change splits history without overwriting prior area', () => {
  const original = ownerFixture();
  const result = changeUnitArea(original, {
    unitId: 'unit1', effectiveFrom: '2026-07-01', hundredthsM2: 8250
  });
  assert.deepEqual(original.units[0].areaHistory, [
    { from: '2026-01-01', to: null, hundredthsM2: 8000 }
  ]);
  assert.deepEqual(result.project.units[0].areaHistory, [
    { from: '2026-01-01', to: '2026-06-30', hundredthsM2: 8000 },
    { from: '2026-07-01', to: null, hundredthsM2: 8250 }
  ]);
});

test('area change refuses silent rewrite at existing start date', () => {
  const original = ownerFixture();
  assert.throws(() => changeUnitArea(original, {
    unitId: 'unit1', effectiveFrom: '2026-01-01', hundredthsM2: 9000
  }), error => error instanceof HistoryChangeError && error.code === 'AREA_CHANGE_REWRITE');
  assert.equal(original.units[0].areaHistory[0].hundredthsM2, 8000);
});

test('usage change closes old segment one day before new segment', () => {
  const original = ownerFixture();
  const result = changeUnitUsage(original, {
    unitId: 'unit1', effectiveFrom: '2026-09-01', kind: 'vacant',
    usageId: 'usage_vacant'
  });
  assert.equal(original.usagePeriods[0].endDate, null);
  assert.deepEqual(result.project.usagePeriods.map(x => ({
    id: x.id, kind: x.kind, startDate: x.startDate, endDate: x.endDate
  })), [
    { id: 'usage_owner', kind: 'owner', startDate: '2026-01-01', endDate: '2026-08-31' },
    { id: 'usage_vacant', kind: 'vacant', startDate: '2026-09-01', endDate: null }
  ]);
});

test('tenant change closes old tenancy and creates a new tenancy', () => {
  const original = tenantFixture();
  const result = changeUnitUsage(original, {
    unitId: 'unit1', effectiveFrom: '2026-07-01', kind: 'tenant',
    usageId: 'usage_tenant2', tenancyId: 'tenant2', partyLabel: 'Neu'
  });
  const oldTenancy = result.project.tenancies.find(x => x.id === 'tenant1');
  const newTenancy = result.project.tenancies.find(x => x.id === 'tenant2');
  assert.equal(oldTenancy.endDate, '2026-06-30');
  assert.deepEqual(newTenancy, {
    id: 'tenant2', unitId: 'unit1', startDate: '2026-07-01', endDate: null, partyLabel: 'Neu'
  });
  assert.equal(result.project.usagePeriods.find(x => x.id === 'usage_tenant2').tenancyId, 'tenant2');
});

test('same owner usage is not duplicated as a fake history event', () => {
  const original = ownerFixture();
  assert.throws(() => changeUnitUsage(original, {
    unitId: 'unit1', effectiveFrom: '2026-05-01', kind: 'owner', usageId: 'usage2'
  }), error => error instanceof HistoryChangeError && error.code === 'USAGE_CHANGE_NOOP');
});

function meterFixture() {
  const p = ownerFixture();
  p.meters.push({
    id: 'meter_old', propertyId: 'house', unitId: 'unit1',
    label: 'Wasser alt', service: 'cold_water',
    measurementKind: 'water_volume', measurementUnit: 'm3',
    installedAt: '2026-01-01'
  });
  p.readings.push({
    id: 'reading_start', meterId: 'meter_old', date: '2026-01-01',
    value: 10, readingType: 'measured'
  });
  return p;
}

test('meter replacement preserves old device and adds both swap readings', () => {
  const original = meterFixture();
  const result = replaceMeter(original, {
    oldMeterId: 'meter_old', swapDate: '2026-06-30',
    newMeterId: 'meter_new', newLabel: 'Wasser neu',
    oldFinalReadingId: 'reading_old_final', newInitialReadingId: 'reading_new_initial',
    oldFinalValue: 42.5, newInitialValue: 0.2
  });
  assert.equal(original.meters[0].removedAt, undefined);
  const oldMeter = result.project.meters.find(x => x.id === 'meter_old');
  const newMeter = result.project.meters.find(x => x.id === 'meter_new');
  assert.equal(oldMeter.removedAt, '2026-06-30');
  assert.equal(newMeter.installedAt, '2026-06-30');
  assert.equal(newMeter.removedAt, null);
  assert.equal(newMeter.unitId, 'unit1');
  assert.deepEqual(result.project.readings.filter(x => x.date === '2026-06-30').map(x => [x.meterId, x.value]), [
    ['meter_old', 42.5], ['meter_new', 0.2]
  ]);
});

test('meter replacement blocks an existing old-meter reading on or after swap day', () => {
  const original = meterFixture();
  original.readings.push({
    id: 'reading_later', meterId: 'meter_old', date: '2026-07-01',
    value: 44, readingType: 'measured'
  });
  assert.throws(() => replaceMeter(original, {
    oldMeterId: 'meter_old', swapDate: '2026-06-30',
    newMeterId: 'meter_new', newLabel: 'Neu',
    oldFinalReadingId: 'old_final', newInitialReadingId: 'new_initial',
    oldFinalValue: 42, newInitialValue: 0
  }), error => error instanceof HistoryChangeError && error.code === 'METER_SWAP_READING_CONFLICT');
});

test('meter replacement blocks a decreasing old final reading', () => {
  const original = meterFixture();
  original.readings.push({
    id: 'reading_mid', meterId: 'meter_old', date: '2026-06-01',
    value: 40, readingType: 'measured'
  });
  assert.throws(() => replaceMeter(original, {
    oldMeterId: 'meter_old', swapDate: '2026-06-30',
    newMeterId: 'meter_new', newLabel: 'Neu',
    oldFinalReadingId: 'old_final', newInitialReadingId: 'new_initial',
    oldFinalValue: 39.9, newInitialValue: 0
  }), error => error instanceof HistoryChangeError && error.code === 'METER_SWAP_NON_MONOTONIC');
});
