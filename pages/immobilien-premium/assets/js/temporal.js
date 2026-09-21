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

/**
 * Annual and occupant-specific consumption from fully documented meter chains.
 * Legacy-free rule shapes:
 *   meterIdsByUnit: { unitId: ['parallelMeter1', 'parallelMeter2'] } (one full-year chain each)
 *   meterChainsByUnit: { unitId: [['old', 'new'], ['parallelMeter']] } (explicit consecutive meters)
 * Only one mapping shape may be supplied; replacement chains require meterSwapConfirmed:true.
 * Swap-day values belong to both meters as separate final and initial readings.
 */
export function consumptionForSegments(project, units, period, rule, occupancy, issues) {
  const hasChains = Object.hasOwn(rule, 'meterChainsByUnit');
  const hasIds = Object.hasOwn(rule, 'meterIdsByUnit');
  if (hasChains === hasIds) {
    add(issues, 'METER_MAPPING_REQUIRED', `allocationRules:${rule.id}`,
      'Genau eine Zählerzuordnung angeben: unabhängige Zähler oder ausdrücklich verkettete Zählerwechsel.');
    return null;
  }
  const mapping = hasChains ? rule.meterChainsByUnit : rule.meterIdsByUnit;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping) ||
      Object.keys(mapping).sort().join('|') !== units.map(x => x.id).sort().join('|')) {
    add(issues, 'METER_MAPPING_REQUIRED', `allocationRules:${rule.id}`, 'Zähler sämtlicher Wohnungen eindeutig zuordnen.');
    return null;
  }
  const globallyUsed = new Set();
  const annualWeights = [];
  const segmentWeights = new Map();
  for (const unit of units) {
    const raw = mapping[unit.id];
    const chains = hasChains ? raw : Array.isArray(raw) ? raw.map(id => [id]) : null;
    if (!Array.isArray(chains) || !chains.length || chains.some(chain =>
      !Array.isArray(chain) || !chain.length || chain.some(id => typeof id !== 'string' || !id))) {
      add(issues, 'METER_MAPPING_REQUIRED', `units:${unit.id}`, 'Jeder Zählerkanal benötigt mindestens eine gültige Zähler-ID.');
      continue;
    }
    const segments = occupancy.get(unit.id) || [];
    const usageWeights = new Map(segments.map(segment => [segment.id, 0]));
    const occupantBoundaries = segments.map(segment => segment.startDate);
    for (const chain of chains) {
      if (chain.length > 1 && (!hasChains || rule.meterSwapConfirmed !== true)) {
        add(issues, 'METER_SWAP_UNCONFIRMED', `allocationRules:${rule.id}`,
          'Zählerfolge und Zählerwechsel ausdrücklich bestätigen.');
        continue;
      }
      const devices = [];
      for (const id of chain) {
        if (globallyUsed.has(id)) {
          add(issues, 'METER_DUPLICATED', `meters:${id}`, 'Zähler darf innerhalb einer Rechnung nur einmal zugeordnet sein.');
          continue;
        }
        globallyUsed.add(id);
        const meter = project.meters.find(x => x.id === id);
        if (!meter || meter.propertyId !== period.propertyId || meter.unitId !== unit.id) {
          add(issues, 'METER_CHANGE_UNSUPPORTED', `meters:${id}`, 'Zähler ist nicht eindeutig dieser Wohnung zugeordnet.');
          continue;
        }
        devices.push(meter);
      }
      if (devices.length !== chain.length) continue;
      const first = devices[0];
      const last = devices.at(-1);
      if ((first.installedAt && first.installedAt > period.startDate) ||
          (last.removedAt && last.removedAt < period.endDate) ||
          devices.some(m => m.installedAt && m.removedAt && m.installedAt > m.removedAt)) {
        add(issues, 'METER_CHANGE_UNSUPPORTED', `units:${unit.id}`, 'Die Zählerfolge deckt das Abrechnungsjahr nicht ab.');
        continue;
      }
      let validChain = true;
      const swaps = [];
      for (let k = 1; k < devices.length; k++) {
        const previous = devices[k - 1];
        const current = devices[k];
        const day = current.installedAt;
        if (!day || !previous.removedAt || previous.removedAt !== day ||
            day <= period.startDate || day >= period.endDate ||
            (k > 1 && day <= swaps.at(-1))) {
          add(issues, 'METER_CHAIN_GAP_OR_OVERLAP', `meters:${current.id}`,
            'Ausbau des alten und Einbau des neuen Zählers müssen am selben dokumentierten Tag erfolgen, in korrekter Reihenfolge.');
          validChain = false;
        } else swaps.push(day);
      }
      if (!validChain) continue;
      const boundaries = [...new Set([...occupantBoundaries, ...swaps, period.endDate])].sort();
      // Each adjacent boundary pair represents one measured consumption interval.
      // Precisely one meter must cover that interval; the swap date itself is a shared boundary.
      for (let j = 0; j < boundaries.length - 1; j++) {
        const from = boundaries[j];
        const to = boundaries[j + 1];
        const applicable = devices.filter(m =>
          (!m.installedAt || m.installedAt <= from) && (!m.removedAt || m.removedAt >= to));
        if (applicable.length !== 1) {
          add(issues, 'METER_CHAIN_GAP_OR_OVERLAP', `units:${unit.id}`,
            `Intervall ${from} bis ${to} ist nicht genau einem Zähler zugeordnet.`);
          continue;
        }
        const meter = applicable[0];
        const measurements = [];
        for (const date of [from, to]) {
          const matches = project.readings.filter(reading => reading.meterId === meter.id && reading.date === date);
          if (matches.length !== 1) {
            const code = swaps.includes(date) ? 'METER_SWAP_READING_REQUIRED'
              : occupantBoundaries.slice(1).includes(date) ? 'METER_INTERMEDIATE_READING_REQUIRED'
                : 'METER_READING_REQUIRED';
            add(issues, code, `meters:${meter.id}`, `Genau eine Ablesung am ${date} erforderlich.`);
            measurements.push(null);
            continue;
          }
          const value = scaledReading(matches[0].value);
          if (value === null) {
            add(issues, 'METER_READING_INVALID', `meters:${meter.id}`, 'Ablesung ist negativ, zu groß oder zu ungenau.');
          }
          measurements.push(value);
        }
        if (measurements.some(v => v === null)) continue;
        const difference = measurements[1] - measurements[0];
        if (difference < 0) {
          add(issues, 'METER_READING_INVALID', `meters:${meter.id}`,
            'Rückläufiger Zählerstand wird weder verrechnet noch als Nullverbrauch gewertet.');
          continue;
        }
        const segment = segments.find(s => s.startDate <= from && s.endDate >= from);
        if (!segment) {
          add(issues, 'USAGE_GAP', `units:${unit.id}`, `Verbrauchsintervall ab ${from} ist keinem Nutzer zugeordnet.`);
          continue;
        }
        const next = BigInt(usageWeights.get(segment.id)) + BigInt(difference);
        if (next > BigInt(Number.MAX_SAFE_INTEGER)) {
          add(issues, 'NUMBER_OVERFLOW', `meters:${meter.id}`, 'Verbrauch außerhalb des sicheren Zahlenbereichs.');
        } else usageWeights.set(segment.id, Number(next));
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
