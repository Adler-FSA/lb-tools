/**
 * Nebenkosten Premium — period coverage and occupancy-level allocation.
 * Pure helper; no browser storage, legal release, old-system access or guessed readings.
 * Dates are ISO calendar days. A segment starts with a meter reading on its first day;
 * a previous segment ends at the next segment's start reading, without double-counting.
 */
const DAY_MS = 86400000;
const dayNumber = iso => Date.parse(`${iso}T00:00:00.000Z`) / DAY_MS;
const nextDay = iso => new Date(Date.parse(`${iso}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
const overlaps = (a, b) => a.startDate <= b.endDate && (a.endDate ?? '9999-12-31') >= b.startDate;
const covers = (a, b) => a.startDate <= b.startDate && (a.endDate === null || a.endDate >= b.endDate);
const add = (issues, code, path, detail) => issues.push({ code, path, detail });
const integer = n => Number.isSafeInteger(n) && n >= 0;

/** Every unit has exactly one explicit state on every day in the period. */
export function occupancyForPeriod(project, units, period, issues) {
  const occupancy = new Map();
  const tenancySegments = new Map();
  for (const unit of units) {
    const records = project.usagePeriods.filter(x => x.unitId === unit.id && overlaps(x, period))
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
    if (!records.length) {
      add(issues, 'USAGE_GAP', `units:${unit.id}`, 'Die Nutzung dieser Wohnung ist im Abrechnungsjahr nicht erfasst.');
      continue;
    }
    const segments = records.map(record => {
      const startDate = record.startDate < period.startDate ? period.startDate : record.startDate;
      const endDate = (record.endDate ?? period.endDate) > period.endDate ? period.endDate : (record.endDate ?? period.endDate);
      return { id: record.id, kind: record.kind, tenancyId: record.kind === 'tenant' ? record.tenancyId : null,
        unitId: unit.id, startDate, endDate, days: dayNumber(endDate) - dayNumber(startDate) + 1 };
    });
    if (segments[0].startDate !== period.startDate || segments.at(-1).endDate !== period.endDate) {
      add(issues, 'USAGE_GAP', `units:${unit.id}`, 'Nutzung muss den vollständigen Abrechnungszeitraum abdecken.');
    }
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].startDate !== nextDay(segments[i - 1].endDate)) {
        add(issues, 'USAGE_GAP', `units:${unit.id}`, 'Zwischen zwei Nutzungen liegt eine Lücke oder Überschneidung. Leerstand ausdrücklich erfassen.');
      }
    }
    for (const segment of segments) {
      if (segment.kind !== 'tenant') continue;
      const tenancy = project.tenancies.find(x => x.id === segment.tenancyId);
      if (!tenancy || tenancy.unitId !== unit.id || !covers(tenancy, segment)) {
        add(issues, 'TENANCY_PERIOD_INVALID', `usagePeriods:${segment.id}`, 'Mietvertrag deckt diesen Nutzungszeitraum nicht ab.');
        continue;
      }
      const saved = tenancySegments.get(segment.tenancyId) || [];
      if (saved.some(x => x.unitId !== segment.unitId)) {
        add(issues, 'TENANCY_UNIT_CONFLICT', `tenancies:${segment.tenancyId}`, 'Mietverhältnis ist mehreren Wohnungen zugeordnet.');
      }
      saved.push(segment);
      tenancySegments.set(segment.tenancyId, saved);
    }
    occupancy.set(unit.id, segments);
  }
  return { occupancy, tenancySegments };
}

function scaledReading(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const text = String(value);
  if (!/^\d+(?:\.\d{1,3})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const scaled = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0') || '0');
  return scaled <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(scaled) : null;
}

/** Annual consumption and occupant-specific consumption from verified boundary readings. */
export function consumptionForSegments(project, units, period, rule, occupancy, issues) {
  const mapping = rule.meterIdsByUnit;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping) ||
      Object.keys(mapping).sort().join('|') !== units.map(x => x.id).sort().join('|')) {
    add(issues, 'METER_MAPPING_REQUIRED', `allocationRules:${rule.id}`, 'Zähler sämtlicher Wohnungen eindeutig zuordnen.');
    return null;
  }
  const used = new Set();
  const annualWeights = [];
  const segmentWeights = new Map();
  for (const unit of units) {
    const ids = mapping[unit.id];
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) {
      add(issues, 'METER_MAPPING_REQUIRED', `units:${unit.id}`, 'Mindestens einen eindeutigen Zähler je Wohnung angeben.');
      continue;
    }
    const segments = occupancy.get(unit.id) || [];
    const starts = segments.map(segment => segment.startDate);
    const boundaries = [...starts, period.endDate];
    const usageWeights = new Map(segments.map(segment => [segment.id, 0]));
    for (const id of ids) {
      if (used.has(id)) {
        add(issues, 'METER_DUPLICATED', `meters:${id}`, 'Ein Zähler wurde mehrfach zugeordnet.');
        continue;
      }
      used.add(id);
      const meter = project.meters.find(x => x.id === id);
      if (!meter || meter.unitId !== unit.id || meter.propertyId !== period.propertyId ||
          (meter.installedAt && meter.installedAt > period.startDate) ||
          (meter.removedAt && meter.removedAt < period.endDate)) {
        add(issues, 'METER_CHANGE_UNSUPPORTED', `meters:${id}`, 'Zählerwechsel, Zeitraum oder Zuordnung müssen gesondert geprüft werden.');
        continue;
      }
      const readings = [];
      for (let j = 0; j < boundaries.length; j++) {
        const date = boundaries[j];
        const matches = project.readings.filter(x => x.meterId === id && x.date === date);
        if (matches.length !== 1) {
          add(issues, j > 0 && j < boundaries.length - 1 ? 'METER_INTERMEDIATE_READING_REQUIRED' : 'METER_READING_REQUIRED',
            `meters:${id}`, `Eindeutige Ablesung am ${date} erforderlich.`);
          readings.push(null);
        } else {
          const value = scaledReading(matches[0].value);
          if (value === null) add(issues, 'METER_READING_INVALID', `meters:${id}`, 'Ablesung ist negativ, zu groß oder nicht mit drei Dezimalstellen darstellbar.');
          readings.push(value);
        }
      }
      for (let j = 0; j < segments.length; j++) {
        if (readings[j] === null || readings[j + 1] === null) continue;
        const difference = readings[j + 1] - readings[j];
        if (difference < 0) {
          add(issues, 'METER_READING_INVALID', `meters:${id}`, 'Rückläufiger Zählerstand wird nicht als Nullverbrauch gewertet.');
          continue;
        }
        const next = usageWeights.get(segments[j].id) + difference;
        if (!integer(next)) add(issues, 'NUMBER_OVERFLOW', `meters:${id}`, 'Verbrauch außerhalb des sicheren Zahlenbereichs.');
        else usageWeights.set(segments[j].id, next);
      }
    }
    segmentWeights.set(unit.id, usageWeights);
    const annual = [...usageWeights.values()].reduce((a, b) => a + BigInt(b), 0n);
    if (annual > BigInt(Number.MAX_SAFE_INTEGER)) add(issues, 'NUMBER_OVERFLOW', `units:${unit.id}`, 'Jahresverbrauch zu groß.');
    else annualWeights.push({ id: unit.id, weight: Number(annual) });
  }
  if (issues.length) return null;
  if (!annualWeights.some(x => x.weight > 0)) {
    add(issues, 'ZERO_CONSUMPTION', `allocationRules:${rule.id}`, 'Kein messbarer Gesamtverbrauch: Schlüssel prüfen.');
    return null;
  }
  return { weights: annualWeights, segmentWeights };
}

/** Per-unit share -> separate owner, vacancy and tenant entries without losing cents. */
export function splitOccupancyShare(unitId, amountCents, segments, rule, segmentWeights, allocate, issues) {
  if (segments.length === 1) {
    const segment = segments[0];
    return [{ unitId, cents: amountCents, kind: segment.kind, tenancyId: segment.tenancyId }];
  }
  const required = rule.method === 'consumption' ? 'readings' : 'days';
  if (rule.temporalConfirmed !== true || rule.temporalMethod !== required) {
    add(issues, 'TEMPORAL_RULE_REQUIRED', `allocationRules:${rule.id}`,
      `Zeitaufteilung muss ausdrücklich als ${required === 'days' ? 'Kalendertage' : 'Zwischenablesung'} bestätigt werden.`);
    return [];
  }
  const weights = segments.map(segment => ({ id: segment.id,
    weight: required === 'days' ? segment.days : segmentWeights?.get(segment.id) }));
  if (weights.some(x => !integer(x.weight))) {
    add(issues, 'TEMPORAL_BASIS_INVALID', `allocationRules:${rule.id}`, 'Zeit- oder Verbrauchsgewichte fehlen.');
    return [];
  }
  if (weights.every(x => x.weight === 0)) {
    add(issues, 'TEMPORAL_ZERO_CONSUMPTION', `allocationRules:${rule.id}`,
      'Kein Verbrauch der Wohnung bei Nutzerwechsel; zeitliche Zuordnung gesondert klären.');
    return [];
  }
  try {
    const portions = new Map(allocate(amountCents, weights).map(x => [x.id, x.cents]));
    return segments.map(segment => ({ unitId, cents: portions.get(segment.id), kind: segment.kind,
      tenancyId: segment.tenancyId, usagePeriodId: segment.id, startDate: segment.startDate,
      endDate: segment.endDate, days: segment.days, temporalMethod: required }));
  } catch {
    add(issues, 'TEMPORAL_ALLOCATION_INVALID', `allocationRules:${rule.id}`, 'Anteile lassen sich nicht centgenau aufteilen.');
    return [];
  }
}
