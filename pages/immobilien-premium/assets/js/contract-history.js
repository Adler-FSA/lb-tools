/**
 * Nebenkosten Premium 2.3: verified advance-payment history.
 * Only confirmed monthly advances are scheduled. No legal validity decision.
 * This module neither reads storage nor changes any input object.
 */
const DAY_MS = 86_400_000;
const nextDay = iso => new Date(Date.parse(`${iso}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
const lastDay = month => {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
};
const nextMonth = month => {
  const [year, number] = month.split('-').map(Number);
  return `${number === 12 ? year + 1 : year}-${String(number === 12 ? 1 : number + 1).padStart(2, '0')}`;
};
const issue = (issues, code, path, detail) => issues.push({ code, path, detail });
const safeMoney = n => Number.isSafeInteger(n) && n >= 0;
const overlaps = (a, b) => a.startDate <= b.endDate && (a.endDate ?? '9999-12-31') >= b.startDate;
const termsSignature = term => {
  const { id, startDate, endDate, advanceCents, advanceChangeConfirmed, ...contract } = term;
  const normalized = { ...contract, allowedCostTypes: Array.isArray(contract.allowedCostTypes)
    ? [...contract.allowedCostTypes].sort() : null };
  return JSON.stringify(Object.fromEntries(Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b))));
};

/**
 * Resolve a complete set of effective-dated terms and monthly due amounts.
 * `tenant_advance_due` entries only document a confirmed manual monthly due;
 * they are NEVER counted as money actually paid to the landlord.
 */
export function resolveAdvanceSchedules(project, period, tenancySegments, issues) {
  const terms = new Map();
  const schedules = new Map();
  for (const [tenancyId, unsorted] of tenancySegments) {
    const path = `tenancies:${tenancyId}`;
    const segments = [...unsorted].sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (segments.some((s, i) => i > 0 && s.startDate !== nextDay(segments[i - 1].endDate))) {
      issue(issues, 'TENANCY_SEGMENT_GAP', path, 'Unterbrochene Nutzung im selben Mietverhältnis muss gesondert geklärt werden.');
      continue;
    }
    const startDate = segments[0].startDate;
    const endDate = segments.at(-1).endDate;
    const scope = { startDate, endDate };
    const versions = project.contractTerms.filter(term => term.tenancyId === tenancyId && overlaps(term, scope))
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
    if (!versions.length || versions[0].startDate > startDate ||
        (versions.at(-1).endDate ?? '9999-12-31') < endDate ||
        versions.some((term, i) => i > 0 && term.startDate !== nextDay(versions[i - 1].endDate ?? '9999-12-31'))) {
      issue(issues, 'CONTRACT_HISTORY_GAP', path, 'Vertragsfassungen müssen den gesamten Mietzeitraum lückenlos und ohne Überschneidung abdecken.');
      issue(issues, 'CONTRACT_MODEL_UNSUPPORTED', path, 'Vertragsverlauf ist nicht durchgehend bestätigt.');
      continue;
    }
    if (versions.some(term => term.operatingCostsModel !== 'advance')) {
      issue(issues, 'CONTRACT_MODEL_UNSUPPORTED', path, 'Pauschale oder ungeklärter Wechsel des Betriebskostenmodells wird nicht automatisch abgerechnet.');
      continue;
    }
    if (versions.some(term => !safeMoney(term.advanceCents))) {
      issue(issues, 'ADVANCE_AMOUNT_REQUIRED', path, 'Monatliche Vorauszahlung jeder Vertragsfassung in Cent angeben.');
      continue;
    }
    const first = termsSignature(versions[0]);
    if (!Array.isArray(versions[0].allowedCostTypes) || versions.some(term =>
      !Array.isArray(term.allowedCostTypes) || termsSignature(term) !== first)) {
      issue(issues, 'CONTRACT_COST_TERMS_CHANGE_REVIEW', path, 'Andere Vertragsinhalte oder Kostenvereinbarungen haben sich geändert und benötigen einen eigenen Prüfweg.');
      continue;
    }
    if (versions.slice(1).some(term => term.advanceChangeConfirmed !== true)) {
      issue(issues, 'ADVANCE_CHANGE_UNCONFIRMED', path, 'Jede Änderung der Vorauszahlung muss ausdrücklich bestätigt sein.');
      issue(issues, 'CONTRACT_MODEL_UNSUPPORTED', path, 'Vertragsänderung wurde nicht freigegeben.');
      continue;
    }
    if (versions.slice(1).some(term => !term.startDate.endsWith('-01'))) {
      issue(issues, 'ADVANCE_CHANGE_MID_MONTH', path, 'Änderung mitten im Monat: keine automatische anteilige Monatsforderung.');
      continue;
    }
    for (const entry of project.cashflows.filter(flow => flow.kind === 'tenant_advance_due' &&
      flow.tenancyId === tenancyId && flow.date >= startDate && flow.date <= endDate &&
      flow.accountingPeriodId !== period.id)) {
      issue(issues, 'ADVANCE_DUE_PERIOD_MISMATCH', `cashflows:${entry.id}`, 'Soll-Buchung liegt in diesem Mietzeitraum, wurde aber einem anderen Jahr zugeordnet.');
    }
    const dueEntries = project.cashflows.filter(flow => flow.kind === 'tenant_advance_due' &&
      flow.tenancyId === tenancyId && flow.accountingPeriodId === period.id);
    const dueByMonth = new Map();
    for (const entry of dueEntries) {
      const month = entry.date.slice(0, 7);
      const entries = dueByMonth.get(month) ?? [];
      entries.push(entry);
      dueByMonth.set(month, entries);
    }
    const months = [];
    let scheduled = 0n;
    let failed = false;
    for (let month = startDate.slice(0, 7), count = 0; month <= endDate.slice(0, 7); month = nextMonth(month), count++) {
      if (count >= 24) {
        issue(issues, 'ADVANCE_PERIOD_TOO_LONG', path, 'Automatische Vorauszahlungsübersicht unterstützt höchstens 24 Monate.');
        failed = true; break;
      }
      const monthStart = `${month}-01`;
      const monthEnd = lastDay(month);
      const start = startDate > monthStart ? startDate : monthStart;
      const end = endDate < monthEnd ? endDate : monthEnd;
      const active = versions.filter(term => term.startDate <= start && (term.endDate === null || term.endDate >= end));
      if (active.length !== 1) {
        issue(issues, 'ADVANCE_MONTH_AMBIGUOUS', path, `Vorauszahlung für ${month} nicht eindeutig geregelt.`);
        failed = true; continue;
      }
      const term = active[0];
      const entries = dueByMonth.get(month) || [];
      if (entries.length > 1) {
        issue(issues, 'ADVANCE_DUE_DUPLICATE', path, `Mehrere Soll-Einträge für ${month}.`);
        failed = true; continue;
      }
      const partial = start !== monthStart || end !== monthEnd;
      const manual = entries[0];
      if (partial && !manual) {
        issue(issues, 'ADVANCE_PARTIAL_MONTH_REVIEW', path, `Für ${month} muss die vereinbarte Teilmonatsforderung separat bestätigt werden.`);
        failed = true; continue;
      }
      if (manual && (manual.confirmedDue !== true || !safeMoney(manual.amountCents) || manual.date < start || manual.date > end)) {
        issue(issues, 'ADVANCE_DUE_UNCONFIRMED', path, `Soll-Eintrag für ${month} ist nicht vollständig bestätigt oder liegt außerhalb der Mietdauer.`);
        failed = true; continue;
      }
      if (!partial && manual && manual.amountCents !== term.advanceCents) {
        issue(issues, 'ADVANCE_DUE_MISMATCH', path, `Soll-Eintrag für ${month} weicht von der bestätigten Vertragsfassung ab.`);
        failed = true; continue;
      }
      const amountCents = manual ? manual.amountCents : term.advanceCents;
      scheduled += BigInt(amountCents);
      months.push({ month, startDate: start, endDate: end, contractTermId: term.id,
        amountCents, source: manual ? 'confirmed_due_entry' : 'contract_version' });
    }
    for (const [month] of dueByMonth) {
      if (!months.some(item => item.month === month)) {
        issue(issues, 'ADVANCE_DUE_OUTSIDE_SCOPE', path, `Soll-Buchung für ${month} ist nicht einer eindeutigen Nutzungszeit zugeordnet.`);
        failed = true;
      }
    }
    if (scheduled > BigInt(Number.MAX_SAFE_INTEGER)) {
      issue(issues, 'NUMBER_OVERFLOW', path, 'Vereinbarte Vorauszahlungssumme überschreitet den sicheren Zahlenbereich.');
      failed = true;
    }
    if (failed) continue;
    terms.set(tenancyId, versions[0]);
    schedules.set(tenancyId, { tenancyId, scheduledCents: Number(scheduled), months, contractVersionIds: versions.map(x => x.id) });
  }
  return { terms, schedules };
}
