# Nebenkosten Premium — Berechnungskern, Baustein 2.3

**Stand: 21.09.2026 · Teilstand Mieterwechsel und Leerstand umgesetzt. Keine freigegebene Abrechnungssoftware.** Grundlage: freigegebener `MASTERPLAN.md`. Vollständig eigenständige Neuentwicklung, ohne Code, Daten oder Abhängigkeiten des früheren Nebenkosten-Werkzeugs.

## Dateien und Schnittstellen

- `assets/js/calculation.js`: `calculatePeriod(project, accountingPeriodId)` und `distributeCents(amountCents, weights)`.
- `assets/js/temporal.js`: lückenlose Nutzungszeiträume, tagesbezogene Aufteilung und verifizierte Verbrauchsaufteilung anhand von Zwischenablesungen; reine Hilfsfunktionen.
- `tests/calculation.test.mjs` und `tests/temporal.test.mjs`: MH-01 bis MH-03 einschließlich positiver und negativer Fallprüfungen sowie Sperrtests für MH-04 bis MH-09.
- Kein Browser-Speicherzugriff, kein Import, keine PDF und keine automatische Rechtsprüfung im Rechenkern. Die Eingabe wird nicht verändert.
- Erfolg nur für vollständig unterstützten und bestätigten Fall: `{status:'calculated', calculationReady:true, issues:[], report:{...}}` mit `report.legalRelease:false`, `report.pdfGenerated:false`.
- Unsichere Eingabe: `{status:'blocked', calculationReady:false, issues:[{code,path,detail}], report:null}`. Es wird kein Teilbetrag als fertige Abrechnung ausgegeben.

## Berechenbarer Umfang

1. Abgeschlossene Periode mit vollständig hinterlegter, lückenloser Nutzung **jeder** Wohnung. Nutzungsarten `owner`, `tenant`, `vacant`. Nutzungsintervalle sind inklusive beider Kalendertage, überlappen nicht und werden anhand wirklicher Tageszahlen getrennt; 2028/Schaltjahr ist getestet. Mietverträge müssen die jeweiligen Nutzungsabschnitte decken. Ein nicht erfasster Leerstand wird niemals still ergänzt.
2. Bestätigte Kategorien `property_tax`, `building_insurance`, `waste`, `common_electricity`, `cold_water` sowie ausdrücklich ausgewiesene reine Eigentümerkosten. Die technische Kategorienkennung beweist **keine** rechtliche Umlagefähigkeit. Pro Rechnung muss die einschlägige Kostenvereinbarung bei **jedem betroffenen Mietverhältnis** erfasst sein.
3. Wohnungsanteile nach bestätigter `area`-, `consumption`- oder `direct`-Regel. Eine Flächenänderung innerhalb der Abrechnungsperiode bleibt gesperrt. Erst der **Wohnungsanteil**, dann der **Nutzeranteil** werden verteilt. Centbeträge und Rundungsreste werden mit BigInt und stabiler ID centgenau verteilt.
4. **Mieterwechsel / Leerstand bei flächenbezogenen oder direkten Jahreskosten:** Wenn mehrere Nutzungsabschnitte in einer Wohnung vorliegen, erfordert die einzelne Umlageregel ausdrücklich `temporalMethod:'days'` und `temporalConfirmed:true`. Der bestätigte Wohnungsanteil wird nach tatsächlichen Kalendertagen auf die getrennten Nutzer und Leerstandszeiten aufgeteilt. Es ist eine Rechenfunktion für bestätigte Fälle, **keine** generelle gesetzliche Aussage, jeder Kostenposten müsse tagesanteilig umgelegt werden.
5. **Kaltwasser bei Nutzerwechsel:** Erst jährliche Verteilung auf Wohnungen nach Zählerverbrauch; danach individuelle Verteilung anhand vollständig vorhandener Ablesungen am Periodenbeginn, am Beginn jedes neuen Nutzungsabschnitts sowie am Periodenende. Die Umlageregel muss `temporalMethod:'readings'` und `temporalConfirmed:true` enthalten. Zwischenstände werden als gemeinsame Grenze benachbarter Nutzungsabschnitte verwendet, sodass kein Verbrauch doppelt gezählt wird. Fehlende, doppelte, rückläufige oder unplausible Messwerte sperren das Ergebnis. Zählerwechsel sind weiterhin nicht unterstützt.
6. Rechnungen mit Teiljahres-Leistungszeitraum während eines Nutzerwechsels verlangen zusätzlich `temporalExpenseConfirmed:true`; Kosten über die Abrechnungsperiode hinaus bleiben gesperrt. Die Bestätigung muss im künftigen UI fallbezogen erfolgen, nicht automatisch.
7. Je Mietverhältnis sind ein durchgehendes Vorauszahlungsmodell, bestätigte relevante Vertrags-Kostenarten und `accountingPeriods[].confirmedTenancyIds` erforderlich. Tatsächlich anzurechnende Vorauszahlungen werden mit Zeitraum und `purpose:'operating_cost_advance'` eindeutig gebucht; Grundmiete wird nicht angerechnet. Vertrags-/Vorauszahlungsänderungen, unklare Zahlungen oder Mieter-Rückzahlungen bleiben zur weiteren Prüfung gesperrt.
8. Versorgerzahlungen bleiben ein eigener Zahlungskreis mit eindeutigem Konto und Periodenkennung. Der ausgewiesene Saldo ist nur die Differenz der tatsächlich **erfassten** Versorgerkosten und Zahlungen, kein nachgewiesener Versorger-Jahresabschluss. Eigentümer-Direktkosten, Leerstand und Eigennutzung bleiben auf Eigentümerseite.

## Verbindliche Musterergebnisse (fiktive Daten)

**MH-01:** Haus 3.700,00 € = Eigentümer 2.595,00 € + Mieter 1.105,00 €. Anrechenbare Mietervorauszahlungen 1.200,00 € → rechnerisch 95,00 € Mieterguthaben. Gesonderter Wasser-Zahlungsstand: 600,00 € Versorgerzahlungen – 500,00 € Wasserkosten = 100,00 € Differenz. Diese Zahlungskreise sind unabhängig.

**MH-02, 2026:** 365,00 € reine flächenbezogene Beispielkosten: Eigentümerwohnung 60 % = 219,00 €; Mietwohnung 40 % = 146,00 €. Vormieter 181 Tage = 72,40 €; Nachmieter 184 Tage = 73,60 €. Beide Mietverhältnisse haben unabhängig erfasste Vorauszahlungen und separate Ergebnisse.

**MH-03, 2026:** Mietwohnung ist vom 01.05. bis 30.06. leer (61 Tage). Vom Wohnungsanteil 146,00 € entfallen 48,00 € auf Vormieter (120 Tage), **24,40 € Leerstand auf Eigentümer** und 73,60 € auf Nachmieter (184 Tage). Insgesamt Eigentümer 243,40 €, beide Mieter zusammen 121,60 €; Summe unverändert 365,00 €.

**Verbrauchstest:** Jahreskaltwasser 500,00 €, davon Eigentümer 55 m³ → 275,00 €, Mietwohnung 45 m³ → 225,00 €. Bei gemessenem Zwischenstand 20 m³ / 25 m³ werden 100,00 € dem Vormieter und 125,00 € dem Nachmieter zugeordnet, **nicht** nach Kalendertagen geschätzt. Testdaten sind keine rechtliche Billigung der konkreten Vertragslage.

## Weiterhin ausdrücklich gesperrt

- MH-04: wechselnde Vertragskonditionen, unterjährige Vorauszahlungsänderungen, Pauschale und unklare Rückzahlungen.
- MH-05/06: Zählerwechsel, Überlauf, zulässige Schätz-/Ersatzverfahren, fehlende Messwerte; keine stille Nullsetzung.
- MH-07: Heizung, Warmwasser, Heizöl, verbundene Anlagen und Sonderfälle: eigener fachlich geprüfter Rechenkern ausstehend.
- MH-08: CO₂-Kostenaufteilung: gesondertes Regelwerk ausstehend.
- MH-09: Jahre sind isoliert; automatischer Jahreswechsel-Assistent und Dokumentversionierung folgen später.
- Unterjährige Flächenänderungen, ungeklärte Kostenarten, fehlende vertragliche Vereinbarung, periodenübergreifende Rechnungen ohne Regelmodell, fehlende Bestätigung oder unvollständige Nutzung führen zur Sperre.

**Grenze:** Heiz- und Warmwasserkosten bei Nutzerwechsel haben besondere Anforderungen einschließlich Zwischenablesung und ggf. anderer Maßstäbe (§ 9b HeizkostenV, https://www.gesetze-im-internet.de/heizkostenv/__9b.html). Sie werden von der neuen Tages-/Kaltwasserlogik **nicht** als bereits unterstützt behandelt. Fachliche und rechtliche Freigabe sowie Dokumentausgabe erst später.

## Tests und Verifikation

Im lokalen eigenständigen Projektordner mit `npm test`: **56 automatisierte Tests bestanden, 0 fehlgeschlagen**, einschließlich Modell, Speicherung, normaler Jahresrechnung, Mieterwechsel, Leerstand, Verbrauchs-Zwischenablesung, Lücken, Überlappungen, Schaltjahr und Sperrprüfungen. Die vier in diesem Teilschritt angelegten/geänderten Quell- und Testdateien wurden anhand ihrer Git-Blob-SHA mit den in GitHub gespeicherten Dateien abgeglichen. Keine GitHub-CI-, Browser- oder PDF-End-to-End-Abnahme.

**Baustein 2.3 und Baustein 2 insgesamt bleiben offen.** Als nächste Unteraufgabe folgen die noch gesperrten Vertrags-/Zahlungsänderungen sowie Zählerwechsel und die gesonderten Heizkosten-/CO₂-Regeln. Keine Produktfreigabe und keine Mieter-PDF in diesem Stand.
