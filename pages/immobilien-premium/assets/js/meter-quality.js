/**
 * Nebenkosten Premium — evidence checks for actual cold-water readings (MH-06).
 * No automated estimation, correction, rollover, legal assessment or mutation.
 * A plausibility threshold is optional, meter-specific and must be confirmed.
 */
const DAY_MS = 86_400_000;
const safePositive = n => Number.isSafeInteger(n) && n > 0;
const issue = (issues, code, path, detail) => issues.push({ code, path, detail });

function scaled(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const text = String(value);
  if (!/^\d+(?:\.\d{1,3})?$/.test(text)) return null;
  const [whole, fractional = ''] = text.split('.');
  const result = BigInt(whole) * 1000n + BigInt(fractional.padEnd(3, '0') || '0');
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? result : null;
}

/** Inspect all readings of a used device within the year, not only required boundaries. */
export function auditMeterEvidence(project, meter, period, issues) {
  const readings = project.readings.filter(r => r.meterId === meter.id &&
    r.date >= period.startDate && r.date <= period.endDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const limit = meter.plausibilityLimitMilliPerDay;
  const maxRegister = meter.registerMaxMilli;
  if (limit !== undefined && (!safePositive(limit) || meter.plausibilityLimitConfirmed !== true)) {
    issue(issues, 'METER_PLAUSIBILITY_LIMIT_UNCONFIRMED', `meters:${meter.id}`,
      'Ein Plausibilitätsgrenzwert muss positiv, ganzzahlig und für diesen Zähler ausdrücklich bestätigt sein.');
  }
  if (maxRegister !== undefined && !safePositive(maxRegister)) {
    issue(issues, 'METER_REGISTER_LIMIT_INVALID', `meters:${meter.id}`,
      'Der optionale maximale Zählerstand muss positiv und als Tausendstel angegeben sein.');
  }
  let previous = null;
  for (const reading of readings) {
    const path = `readings:${reading.id}`;
    if ((meter.installedAt && reading.date < meter.installedAt) ||
        (meter.removedAt && reading.date > meter.removedAt)) {
      issue(issues, 'METER_READING_OUTSIDE_OPERATION', path,
        'Ablesung liegt außerhalb der dokumentierten Betriebsdauer dieses Geräts.');
    }
    if (reading.readingType !== undefined && reading.readingType !== 'measured') {
      issue(issues, 'METER_READING_NOT_MEASURED', path,
        'Geschätzter, berechneter, strittiger oder unbekannter Messwert ist für diesen Rechenweg nicht freigegeben.');
    }
    if (reading.disputed === true) {
      issue(issues, 'METER_READING_DISPUTED', path,
        'Ablesung ist als strittig markiert und muss vor der Rechnung geklärt werden.');
    }
    const value = scaled(reading.value);
    if (value === null) {
      issue(issues, 'METER_READING_INVALID', path,
        'Ablesung ist keine nichtnegative Zahl mit maximal drei Nachkommastellen.');
      previous = null;
      continue;
    }
    if (safePositive(maxRegister) && value > BigInt(maxRegister)) {
      issue(issues, 'METER_REGISTER_LIMIT_EXCEEDED', path,
        'Messwert liegt oberhalb des dokumentierten Zählerregisters; Überlauf wird nicht automatisch berechnet.');
    }
    if (previous) {
      if (reading.date === previous.reading.date) {
        issue(issues, 'METER_READING_DUPLICATE', path,
          'Mehrere Ablesungen desselben Geräts am selben Tag: widersprüchliche Daten ausdrücklich klären.');
      } else if (value < previous.value) {
        issue(issues, 'METER_READING_NON_MONOTONIC', path,
          'Zählerstand sinkt gegenüber einer früheren Ablesung; ohne geprüften Sonderfall keine automatische Korrektur.');
      } else if (safePositive(limit) && meter.plausibilityLimitConfirmed === true) {
        const days = BigInt((Date.parse(`${reading.date}T00:00:00Z`) -
          Date.parse(`${previous.reading.date}T00:00:00Z`)) / DAY_MS);
        if (value - previous.value > BigInt(limit) * days) {
          issue(issues, 'METER_PLAUSIBILITY_REVIEW', path,
            'Verbrauch überschreitet den ausdrücklich konfigurierten Tages-Orientierungswert; tatsächliche Messwerte prüfen.');
        }
      }
    }
    previous = { reading, value };
  }
}
