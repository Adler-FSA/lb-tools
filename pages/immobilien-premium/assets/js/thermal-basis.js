/**
 * Nebenkosten Premium — evidence-bound comparability of thermal meter weights.
 * No unit is inferred from a numeric reading or from its service name alone.
 * Factors describe ONLY a documented conversion into the stream's comparison basis.
 * For heat cost allocators an individual, verified device factor is mandatory.
 */
const issue = (issues, code, path, detail) => issues.push({ code, path, detail });
const positive = n => Number.isSafeInteger(n) && n > 0;

const BASES = Object.freeze({
  heating: Object.freeze({
    heat_energy: Object.freeze({ canonical: 'kWh', units: Object.freeze({ kWh: [1, 1], MWh: [1000, 1] }) }),
    heat_allocator: Object.freeze({ canonical: 'rated_allocator_unit', units: Object.freeze({ allocator_unit: [1, 1] }) })
  }),
  hot_water: Object.freeze({
    hot_water_volume: Object.freeze({ canonical: 'm3', units: Object.freeze({ m3: [1, 1], litre: [1, 1000] }) })
  })
});

/**
 * @returns {{factors: Map<string,{numerator:number,denominator:number}>,basis:object}|null}
 * All meters of a stream MUST share a physical/billing quantity. Heat allocation
 * units and energy units cannot be interchanged by an arbitrary multiplier.
 */
export function verifyThermalBasis(project, units, stream, issues) {
  const path = `streams:${stream?.kind ?? 'unknown'}`;
  const permitted = BASES[stream?.kind];
  const definition = permitted?.[stream?.measurementKind];
  if (!definition || stream.measurementBasisConfirmed !== true ||
      stream.canonicalUnit !== definition.canonical) {
    issue(issues, 'THERMAL_BASIS_UNCONFIRMED', path,
      'Vergleichbare Messgröße, Ziel-Einheit und deren Bestätigung sind erforderlich.');
    return null;
  }
  const mapping = stream.meterIdsByUnit;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping) ||
      Object.keys(mapping).sort().join('|') !== units.map(u => u.id).sort().join('|')) {
    issue(issues, 'THERMAL_METER_MAPPING_INVALID', path, 'Alle Wohnungen benötigen eindeutige Zählerlisten.');
    return null;
  }
  const factors = new Map();
  const audit = [];
  for (const unit of units) {
    const ids = mapping[unit.id];
    if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !id)) {
      issue(issues, 'THERMAL_METER_MAPPING_INVALID', `units:${unit.id}`, 'Mindestens eine gültige Zähler-ID erforderlich.');
      continue;
    }
    for (const id of ids) {
      const meter = project.meters.find(m => m.id === id);
      if (factors.has(id) || !meter || meter.service !== stream.kind ||
          meter.unitId !== unit.id) {
        issue(issues, 'THERMAL_METER_SERVICE_INVALID', `meters:${id}`,
          'Gerät fehlt, ist doppelt zugeordnet oder gehört zu anderer Leistung bzw. Wohnung.');
        continue;
      }
      if (meter.measurementKind !== stream.measurementKind) {
        issue(issues, 'THERMAL_BASIS_MIXED', `meters:${id}`,
          'Heizenergie, Heizkostenverteiler und Warmwasservolumen dürfen nicht als dieselbe Messgröße addiert werden.');
        continue;
      }
      const physical = Object.hasOwn(definition.units, meter.measurementUnit)
        ? definition.units[meter.measurementUnit] : null;
      if (!physical) {
        issue(issues, 'THERMAL_UNIT_UNKNOWN', `meters:${id}`,
          'Mess-Einheit fehlt oder ist für diese Vergleichsbasis nicht bestätigt.');
        continue;
      }
      let numerator = physical[0];
      let denominator = physical[1];
      let evidence = 'physical_unit_conversion';
      if (stream.measurementKind === 'heat_allocator') {
        const rating = meter.deviceFactor;
        if (!rating || !positive(rating.numerator) || !positive(rating.denominator) ||
            rating.confirmed !== true || typeof rating.referenceId !== 'string' ||
            !rating.referenceId.trim()) {
          issue(issues, 'THERMAL_DEVICE_FACTOR_REQUIRED', `meters:${id}`,
            'Für jeden Heizkostenverteiler wird ein bestätigter gerätebezogener Bewertungsfaktor mit Belegreferenz benötigt.');
          continue;
        }
        numerator = rating.numerator;
        denominator = rating.denominator;
        evidence = rating.referenceId;
      } else if (meter.deviceFactor !== undefined) {
        issue(issues, 'THERMAL_DEVICE_FACTOR_UNSUPPORTED', `meters:${id}`,
          'Manuelle Bewertungsfaktoren sind bei diesen physikalischen Messwerten nicht zugelassen.');
        continue;
      }
      factors.set(id, { numerator, denominator });
      audit.push({ meterId: id, inputUnit: meter.measurementUnit, numerator,
        denominator, evidence });
    }
  }
  if (issues.length) return null;
  return { factors, basis: { measurementKind: stream.measurementKind,
    canonicalUnit: definition.canonical, devices: audit.sort((a, b) => a.meterId.localeCompare(b.meterId, 'en')) } };
}
