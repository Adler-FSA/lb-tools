# Nebenkosten Premium — technischer Arbeitsstand

**Stand: Baustein 2.1 (Datenmodell und Strukturprüfung), 21.09.2026.** Grundlage: freigegebener `MASTERPLAN.md` dieses Projektordners. Dies ist eine eigenständige Neuentwicklung ohne Übernahme oder Import des alten Nebenkosten-Werkzeugs.

## Neu angelegt

- `assets/js/model.js`: neues, versioniertes Projektschema v1; leere Projekterstellung; reine Strukturprüfung ohne Veränderung der Eingabe. Kein Zugriff auf Browser-Speicher oder Altdaten.
- `tests/model.test.mjs`: erste automatisierte Strukturtests mit ausschließlich fiktiven Daten.
- `package.json`: Tests mit Node.js-Bordmitteln (`npm test`), ohne Drittanbieterpakete.

## Datenstruktur

Ein Projekt umfasst eigene Sammlungen für Immobilien (`properties`), Wohnungen (`units`), Nutzungszeiträume (`usagePeriods`), Mietverhältnisse (`tenancies`), Vertragsstände (`contractTerms`), Abrechnungsperioden (`accountingPeriods`), Rechnungen/Kosten (`expenses`), Umlageregeln (`allocationRules`), Zähler (`meters`), Ablesungen (`readings`), klar getrennte Zahlungsarten (`cashflows`), Dokumente (`documents`), Checklisten (`checkItems`) und Dateiverweise (`attachments`). Alle Datensätze erhalten eindeutige stabile IDs.

- Beträge: ganzzahlige Cent (`amountCents`, `advanceCents`); Flächen: Hundertstel Quadratmeter (`hundredthsM2`).
- Datumswerte: `YYYY-MM-DD`, Nutzungszeiträume einschließlich Anfangs- und Enddatum. Offenes Ende: `null`.
- Zahlungen: `provider_payment`, `provider_refund`, `tenant_advance_due`, `tenant_payment`, `tenant_refund`; keine Zusammenrechnung in der Datenstruktur.
- Betriebskostenmodell des Vertrags: `advance`, `flat`, `unresolved`.
- Kostenklassifizierung: `allocatable`, `owner`, `unresolved`. `allocatable` bedeutet hier **nur eine erfasste fachliche Einstufung**; sie ist keine automatisierte rechtliche Freigabe.
- Dokumentstatus: `draft`, `review`, `ready`, `released`. Bei freigegebenen Dokumenten sind Daten-Snapshot und Datum strukturell nötig. Technisch erzwungene Unveränderlichkeit folgt in der späteren Dokumenten-/Speicherschicht.
- Reservierter neuer Speichernamensraum: `akademie:nebenskosten-premium:v1`. **Noch keine Speicherschicht implementiert** und insbesondere keine Alt-Daten-Migration.

## Testaufruf

Aus dem Ordner `pages/immobilien-premium/`: `npm test`. Die Tests prüfen: leere Anlage, gültige Referenzen und Zahlungskreise, doppelte IDs, defekte Referenzen, Datumsfehler, überschneidende Nutzung, falsche Mietzuordnung, Centwerte, Pauschalen, fehlenden Freigabe-Snapshot und fehlende Sammlung.

## Bewusst noch nicht fertig

Keine HTML-Oberflächen; keine Berechnungen, Heizkosten- oder CO₂-Regeln; keine lokale Speicherung/Backup; keine PDF-Erzeugung und kein Mieter-Dokument. Strukturvalidierung ist keine fachliche/rechtliche Prüfung. Die Testfälle MH-01 bis MH-09 aus dem Masterplan sind für die folgenden Schritte im Berechnungskern vorgesehen. Browser- und PDF-Tests stehen aus.

**Nächster einzeln freizugebender Schritt: Baustein 2.2 — geprüfte Speicherung und Wiederherstellung mit eigenem Namensraum, anschließend 2.3 — Berechnungskern und Testfälle.**
