# Nebenkosten Premium — Berechnungskern, Baustein 2.3

**Stand: 21.09.2026 · Teilstand: Normalfall, Mieterwechsel, Leerstand und bestätigte Vorauszahlungsänderungen implementiert. Keine freigegebene Abrechnungssoftware.** Ausschließlich eigenständige Neuentwicklung gemäß freigegebenem `MASTERPLAN.md`; kein Code, keine Daten, keine Lernmodule und keine Abhängigkeiten des früheren Nebenkosten-Werkzeugs.

## Dateien und Schnittstellen

- `assets/js/calculation.js`: `calculatePeriod(project, accountingPeriodId)`, `distributeCents(amountCents, weights)` und die Zusammenführung der drei strikt getrennten Rechnungskreise.
- `assets/js/temporal.js`: lückenlose Nutzungszeiträume, tagesbezogene Zuordnung und Kaltwasser-Zwischenablesungen.
- **Neu: `assets/js/contract-history.js`**: `resolveAdvanceSchedules(project, period, tenancySegments, issues)`. Prüft zeitlich gültige Vertragsfassungen und berechnet getrennt von echten Zahlungen die monatlichen Soll-Vorauszahlungen.
- Tests: `tests/model.test.mjs`, `tests/storage.test.mjs`, `tests/calculation.test.mjs`, `tests/temporal.test.mjs` und **neu `tests/contract-history.test.mjs`**. Alle Fixtures sind erfunden.
- `calculatePeriod` ist eine reine Funktion. Sie verändert die Eingabedaten nicht, liest keine Alt- oder Browserdaten, erzeugt keine PDF und trifft keine rechtliche Freigabeentscheidung. Erfolgsfall `status:'calculated'`; bei fehlenden, widersprüchlichen oder nicht unterstützten Angaben `status:'blocked'`, `report:null`, konkrete `issues`.

## Unterstützte technische Berechnungen

1. Abgeschlossene Periode; jede Wohnung ist lückenlos einer expliziten Nutzung (`owner`, `tenant`, `vacant`) zugeordnet. Eigennutzung und Leerstand werden auf Eigentümerseite ausgewiesen. Mieterwechsel führt zu getrennten Mietverhältnissen und individuellen Ergebnissen.
2. Ausschließlich individuell bestätigte Kostenkategorien `property_tax`, `building_insurance`, `waste`, `common_electricity`, `cold_water`; andere ausdrücklich als `owner` erfasste Kosten bleiben Eigentümerkosten. Diese Einstufung ist keine automatische rechtliche Zulässigkeitsprüfung.
3. Bestätigte Umlage nach Fläche, Verbrauch oder direkt. Erst wird die Kostenposition auf Wohnungen, dann ein Wohnungsanteil beim Nutzerwechsel nach ausdrücklich bestätigten tatsächlichen Tagen beziehungsweise Wasser-Zwischenablesungen verteilt. Die Summe bleibt centgenau erhalten; eine Flächenänderung unterjährig bleibt gesperrt.
4. Jeder Mieter benötigt eine bestätigte Betriebskostenvereinbarung und ein Vorauszahlungsmodell, das für die tatsächliche Nutzung durchgehend gilt. Die Verträge haben eigene Zeiträume. Bei mehreren Vertragsfassungen werden Lücken/Überlappungen, nicht bestätigte Änderungen und Unterschiede anderer Vertragsinhalte gesperrt.
5. **MH-04 jetzt teilweise positiv unterstützt:** Ändert sich ausschließlich die monatliche Vorauszahlung, wird jede neue Fassung mit `advanceChangeConfirmed:true` bestätigt. Änderungen werden nur ab dem ersten Kalendertag eines Monats automatisch einer Monatsforderung zugeordnet. Beispiel: Januar–Juni 100 €, Juli–Dezember 120 € ergeben **1.320 € Soll-Vorauszahlungen**. Die Anwendung berechnet daraus ausdrücklich **keine** tatsächliche Mietzahlung oder eigenständige rechtliche Nachforderung.
6. **Teilmonat:** Beginnt oder endet die Nutzung innerhalb eines Kalendermonats, wird kein willkürlicher Monatsbruchteil berechnet. Ein einzelner der Mietdauer und Periode zugeordneter Cashflow `kind:'tenant_advance_due'`, `confirmedDue:true` muss den vereinbarten Teilmonatsbetrag bestätigen. Soll-Buchungen für volle Monate werden mit dem jeweiligen Vertragssatz abgeglichen. Doppelte, unbestätigte, periodenfremde und widersprüchliche Soll-Buchungen sperren.
7. **Soll und Ist sind getrennt:** `report.advanceSchedules[]` führt Vertragsfassungen, monatliche Soll-Beträge, die erfassten tatsächlichen Zahlungen sowie `recordedDifferenceCents`. Letzterer Wert bezeichnet **nur die Differenz zwischen Soll und erfassten Zahlungen**, keine rechtsverbindlich festgestellten Mietrückstände. Für die eigentliche Rechenübersicht wird weiterhin nur `tenant_payment` mit `purpose:'operating_cost_advance'` und bestätigter Periodenzuordnung angerechnet. Grundmiete und `tenant_advance_due` zählen nicht als tatsächlich bezahlt.
8. Versorgerzahlungen und -gutschriften stehen in einem dritten separaten Zahlungskreis mit Konto- und Jahreszuordnung. `providerBalances` bezieht sich ausdrücklich nur auf erfasste Werte; kein garantierter endgültiger Versorger-Jahresabschluss.

## Fiktive Referenzprüfungen

- **MH-01:** Gebäudekosten 3.700,00 € = Eigentümer 2.595,00 € + Mieter 1.105,00 €. Erfasste Mietervorauszahlungen 1.200,00 € → rechnerisch 95,00 € Mieterguthaben. Wasserversorger getrennt: Zahlungen 600,00 € minus Kosten 500,00 € → 100,00 € gesonderte Differenz.
- **MH-02:** Bei 365,00 € Flächenkosten erhält das Eigentümerobjekt 219,00 €, die Mietwohnung 146,00 €: Vormieter 181 Tage 72,40 €, Nachmieter 184 Tage 73,60 €. Bestätigte Umlage im Muster vorausgesetzt.
- **MH-03:** Leerstand vom 01.05. bis 30.06. (61 Tage) = 24,40 € Eigentümeranteil der Mietwohnung; Vor- und Nachmieter jeweils getrennt. Bei Kaltwasser wird ein vorhandener Zwischenwert genutzt statt Tage als Verbrauch zu unterstellen.
- **MH-04:** Monatliches Soll 100 € für Januar–Juni und 120 € für Juli–Dezember = 1.320 €. Bei nur 1.200 € dokumentierten Ist-Zahlungen zeigt die separate Soll/Ist-Übersicht 120 € Differenz. Die eigentliche Kostenabrechnung benutzt die 1.200 € Ist-Zahlungen; sie addiert die 1.320 € nicht ein zweites Mal.
- **MH-05 bis MH-08:** Noch bewusst gesperrt bzw. ausschließlich Sperrtests. **MH-09:** Abrechnungsjahre bleiben getrennt; Jahreswechsel-Assistent noch nicht implementiert.

## Nicht unterstützte Fälle / Freigabesperren

- Änderung weiterer Vertragsbedingungen oder der vereinbarten Kostenarten während des Jahres, Pauschale statt Vorauszahlung, nicht bestätigte Anpassung oder Änderung mitten im Monat: eigenständige fachliche Prüfung notwendig.
- Zählerwechsel, Überlauf, fehlende/unklare Messwerte und Schätzungen; Heizkosten, Warmwasser, Heizöl, Anlagen- und Nutzerwechselsonderregeln sowie CO₂-Kostenaufteilung.
- Unterjährige Flächenänderungen, nicht bestätigte Umlagen, unbekannte Kostenkategorien, nicht zugeordnete Zahlungen, Mieter-Rückzahlungen und nicht bestätigte Zeitanteile.
- Es gibt **keine automatisierte Prüfung der Wirksamkeit einer Anpassung**: § 560 Absatz 4 BGB regelt Voraussetzungen für Anpassungen von Betriebskostenvorauszahlungen (https://www.gesetze-im-internet.de/bgb/__560.html). Ein technisches `advanceChangeConfirmed:true` steht nur für eine Eingabebestätigung. Vertragliche und rechtliche Wirksamkeit sind vor einer Produktfreigabe fachlich zu prüfen.

## Tests und Status

Im lokalen Projektordner ausgeführt: `npm test` → **71 Tests bestanden, 0 fehlgeschlagen** (ursprüngliche 56 Regressionstests plus 15 neue Tests zur Vertragshistorie). Die neuen/aktualisierten Code- und Testdateien wurden mittels Git-Blob-SHA mit GitHub abgeglichen. Kein GitHub-CI-, Browser-, PDF- oder rechtlicher Abnahmetest.

**Baustein 2.3 und Baustein 2 bleiben offen.** Als Nächstes folgen Zählerwechsel und Messwert-Historie; Heizkosten und CO₂ erhalten später eigene, fachlich geprüfte Rechenwege. Keine fertige Produktseite, keine freigegebene Mieter-PDF.