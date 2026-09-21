/**
 * Nebenkosten Premium — documented heating/hot-water occupant changes (MH-07).
 * Consumption: verified intermediate readings; heating base: explicitly chosen calendar
 * days or independently documented degree-day weights; hot-water base: calendar days.
 * No assumptions about legal applicability, substituted readings or release.
 */
const add = (issues, code, path, detail) => issues.push({ code, path, detail });
const safe = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => Number.isSafeInteger(value) && value > 0;

/** Only optional when every unit has one uninterrupted user. */
export function verifyThermalUserChange(stream, occupancy, issues) {
  const switched = [...occupancy.values()].filter(segments => segments.length > 1);
  if (!switched.length) return true;
  const choice = stream.userChange;
  const correctBase = stream.kind === 'hot_water' ? choice?.baseMethod === 'days'
    : ['days', 'degree_days'].includes(choice?.baseMethod);
  if (choice?.confirmed !== true || choice.consumptionMethod !== 'intermediate_reading' || !correctBase) {
    add(issues, 'THERMAL_USER_CHANGE_UNCONFIRMED', `streams:${stream.kind}`,
      'Nutzerwechsel: Zwischenablesungen und gesonderte Grundkosten-Verteilung ausdrücklich bestätigen.');
    return false;
  }
  if (choice.baseMethod !== 'degree_days') {
    if (choice.degreeDayWeightsBySegmentId !== undefined) {
      add(issues, 'THERMAL_DEGREE_DAYS_UNEXPECTED', `streams:${stream.kind}`,
        'Gradtaggewichte dürfen bei kalendertäglicher Aufteilung nicht zusätzlich berücksichtigt werden.');
    }
    return issues.length === 0;
  }
  const wanted = switched.flatMap(segments => segments.map(s => s.id)).sort();
  const entered = choice.degreeDayWeightsBySegmentId;
  if (!entered || typeof entered !== 'object' || Array.isArray(entered) ||
      Object.keys(entered).sort().join('|') !== wanted.join('|')) {
    add(issues, 'THERMAL_DEGREE_DAYS_REQUIRED', `streams:${stream.kind}`,
      'Für jeden Nutzungsabschnitt der gewechselten Wohnungen ist ein dokumentiertes Gradtaggewicht erforderlich.');
    return false;
  }
  for (const id of wanted) {
    const item = entered[id];
    if (!item || !positive(item.weight) || item.confirmed !== true ||
        typeof item.referenceId !== 'string' || !item.referenceId.trim()) {
      add(issues, 'THERMAL_DEGREE_DAYS_UNCONFIRMED', `usagePeriods:${id}`,
        'Positives Gradtaggewicht und konkrete Nachweisreferenz fehlen oder sind unbestätigt.');
    }
  }
  return issues.length === 0;
}

/** One original unit share becomes multiple separate, cent-reconciled user entries. */
export function splitThermalUnitShare(unit, baseCents, consumptionCents, segments, measuredWeights,
  stream, allocate, issues) {
  const path = `units:${unit.id}`;
  if (!segments || !segments.length || !safe(baseCents) || !safe(consumptionCents)) {
    add(issues, 'THERMAL_USER_SHARE_INVALID', path, 'Wohnungsanteile oder Nutzung fehlen.');
    return [];
  }
  if (segments.length === 1) {
    const occupant = segments[0];
    return [{ unitId: unit.id, kind: occupant.kind, tenancyId: occupant.tenancyId,
      baseCents, consumptionCents, cents: baseCents + consumptionCents }];
  }
  const setting = stream.userChange;
  if (!setting || setting.confirmed !== true) {
    add(issues, 'THERMAL_USER_CHANGE_UNCONFIRMED', path, 'Aufteilung des Nutzerwechsels fehlt.');
    return [];
  }
  const used = segments.map(s => ({ id: s.id, weight: measuredWeights?.get(s.id) }));
  if (used.some(x => !safe(x.weight))) {
    add(issues, 'THERMAL_INTERMEDIATE_READING_REQUIRED', path,
      'Verbrauch muss für jeden Nutzungsabschnitt nachweisbar sein.');
    return [];
  }
  const unitConsumption = used.reduce((total, x) => total + BigInt(x.weight), 0n);
  if (unitConsumption > BigInt(Number.MAX_SAFE_INTEGER) || (unitConsumption === 0n && consumptionCents > 0)) {
    add(issues, 'THERMAL_USER_CONSUMPTION_INVALID', path,
      'Verbrauchsmengen sind nicht sicher auf alle Nutzungsabschnitte verteilbar.');
    return [];
  }
  const basics = segments.map(s => ({ id: s.id,
    weight: setting.baseMethod === 'days' ? s.days : setting.degreeDayWeightsBySegmentId?.[s.id]?.weight }));
  if (basics.some(x => !positive(x.weight))) {
    add(issues, 'THERMAL_BASE_WEIGHTS_INVALID', path, 'Die bestätigten Grundkosten-Gewichte fehlen.');
    return [];
  }
  try {
    const base = new Map(allocate(baseCents, basics).map(x => [x.id, x.cents]));
    const consumption = new Map((unitConsumption === 0n
      ? used.map(x => ({ id: x.id, cents: 0 }))
      : allocate(consumptionCents, used)).map(x => [x.id, x.cents]));
    const entries = segments.map(s => {
      const b = base.get(s.id), c = consumption.get(s.id);
      const cents = b + c;
      if (!safe(cents)) throw new RangeError('OVERFLOW');
      return { unitId: unit.id, kind: s.kind, tenancyId: s.tenancyId,
        usagePeriodId: s.id, startDate: s.startDate, endDate: s.endDate,
        baseMethod: setting.baseMethod, consumptionMethod: setting.consumptionMethod,
        baseWeight: basics.find(x => x.id === s.id).weight,
        consumptionWeight: used.find(x => x.id === s.id).weight,
        baseCents: b, consumptionCents: c, cents };
    });
    if (entries.reduce((n, entry) => n + BigInt(entry.baseCents), 0n) !== BigInt(baseCents) ||
        entries.reduce((n, entry) => n + BigInt(entry.consumptionCents), 0n) !== BigInt(consumptionCents)) {
      throw new Error('RECONCILIATION');
    }
    return entries;
  } catch {
    add(issues, 'THERMAL_USER_SPLIT_FAILED', path, 'Grund- und Verbrauchskosten konnten nicht centgenau aufgeteilt werden.');
    return [];
  }
}
