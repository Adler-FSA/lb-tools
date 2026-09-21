# Nebenkosten Premium — Berechnungskern, Stand Baustein 2.3

**Stand: 21.09.2026. Technischer Teilstand, keine freigegebene Mieterabrechnungssoftware.** Grundlage: der freigegebene `MASTERPLAN.md` dieses eigenständigen Neubaus. Keine Übernahme oder Verbindung mit dem früheren Nebenkosten-Werkzeug.

## Dateien und Schnittstelle

- `assets/js/calculation.js` exportiert `calculatePeriod(project, accountingPeriodId)` und `distributeCents(amountCents, weights)`.
- `tests/calculation.test.mjs` enthält fiktive Testfälle MH-01 bis MH-09 und weitere Prüfungen. Keine realen personenbezogenen Daten.
- `calculatePeriod` verändert die übergebenen Daten nicht, nutzt das eigenständige Datenmodell (`model.js`), liest keinen Browser-Speicher, erzeugt keine PDFs und gibt keine rechtliche Freigabe.
- Erfolgsfall: `{status:'calculated', calculationReady:true, issues:[], report:{...}}`; `report.legalRelease` und `report.pdfGenerated` sind stets `false`.
- Bei ungültigen, widersprüchlichen oder nicht unterstützten Eingaben: `{status:'blocked', calculationReady:false, issues:[{code,path,detail}], report:null}`. Kein unvollständiger Scheinbetrag.

## Derzeit tatsächlich berechenbar

1. Vollständig erfasster, abgeschlossener Abrechnungszeitraum, dessen Einheiten ganzjährig genau einer Nutzungsart zugeordnet sind (Eigennutzung, ein ganzjähriges Mietverhältnis oder durchgehend leer). Keine unterjährige Flächenänderung.
2. Erfasste und ausdrücklich bestätigte Kostenarten `property_tax`, `building_insurance`, `waste`, `common_electricity` und `cold_water`; zusätzliche ausdrücklich als `owner` klassifizierte Eigentümerkosten bleiben Eigentümerkosten. Die Kategorien selbst sind **keine automatisierte rechtliche Umlageprüfung**.
3. Pro umzulegender Rechnung exakt eine bestätigte Umlageregel des gewählten Jahres: `area`, `consumption` oder `direct`. Fläche benötigt eine durchgehende Flächenhistorie; Verbrauch benötigt eindeutige, passende Zähler mit Anfangs- und Endablesung genau an den Periodengrenzen. Ein Zählerwechsel, Überlauf, fehlende Werte und allgemeine Schätzungen werden noch nicht berechnet.
4. Wohnungsanteile werden per BigInt centgenau verteilt; Rundungsreste gehen reproduzierbar nach größtem Rest und stabiler ID. Die Summe der Wohnungsanteile muss den Einzelkosten entsprechen. Eigennutzung und ganzjähriger Leerstand verbleiben beim Eigentümer.
5. Mieteranteile werden nur bei durchgehendem Vorauszahlungsmodell und einzeln hinterlegter Kostenvereinbarung für die Testkategorien berechnet. Der bestätigte Vorauszahlungs-Zahlungsbestand muss pro Mietverhältnis angegeben werden (`accountingPeriods[].confirmedTenancyIds`). Tatsächliche Zahlungen benötigen `cashflows[].accountingPeriodId` und `purpose:'operating_cost_advance'`. Als `base_rent` gekennzeichnete Grundmieten zählen ausdrücklich nicht mit. Unzugeordnete Zahlungen und Mieter-Rückzahlungen sperren das Ergebnis.
6. Versorgerzahlungen bleiben eigener Zahlungskreis; sie benötigen eine eindeutige `providerAccountId` und Periodenkennung. Nur Rechnungen und Zahlungen mit zugehörigem Konto werden miteinander verglichen. `providerBalances[].scope='recorded_provider_transactions_only'` kennzeichnet ausdrücklich: lediglich rechnerischer Stand der **erfassten** Positionen, kein bestätigter Jahresabschluss eines Versorgers.
7. Eine Rechnung mit Zeitanteilen außerhalb der Abrechnungsperiode wird nicht automatisch über Jahre verteilt; der Fall wird gesperrt und ist gesondert zu modellieren.

## Referenzergebnis MH-01 (ausschließlich erfundene Testdaten)

Hauskosten 3.700,00 EUR = Eigentümeranteil 2.595,00 EUR + Mieteranteil 1.105,00 EUR. Zugeordnete Mietervorauszahlungen 1.200,00 EUR ergeben ein rechnerisches Mieterguthaben von 95,00 EUR. Unabhängig davon: erfasste Wasserversorger-Zahlungen 600,00 EUR gegen Wasserkosten 500,00 EUR ergeben 100,00 EUR gesonderte Zahlungsdifferenz. Die Musterwerte begründen keine rechtliche Zulässigkeit der einzelnen Umlagen im realen Mietverhältnis.

## Bewusst gesperrte, noch zu entwickelnde Funktionen

- MH-02: Mieterwechsel innerhalb des Jahres: noch keine Aufteilung auf zwei Mietverhältnisse.
- MH-03: unterjähriger Leerstand beziehungsweise Wechsel der Nutzung: gesperrt; durchgehender Leerstand bereits berechenbar.
- MH-04: unterjährige Vertrags- und Vorauszahlungsänderungen sowie Betriebskostenpauschale: noch kein eigener Rechenweg.
- MH-05: Zählerwechsel, Überlauf oder unvollständige Zählerhistorie: keine stille Korrektur.
- MH-06: fehlende/unplausible Ablesung: keine Ersatzermittlung ohne geklärte Grundlage.
- MH-07: Heizung/Warmwasser, Heizöl, Verbrauchs-/Grundkosten, verbundene Anlagen und Ausnahmen: eigener Rechenkern ausstehend.
- MH-08: CO2-Kostenaufteilung: eigenständige Berechnung und fachliche Prüfung ausstehend.
- MH-09: verschiedene Abrechnungsjahre bleiben getrennt und unverändert; ein kompletter Jahreswechsel-Assistent kommt später.
- Unbekannte Kostenarten, unbestätigte Umlagen, fehlende Mietervereinbarungen, unterjährige Flächenänderungen, Zahlungsrückflüsse und periodenübergreifende Rechnungen werden nicht freigegeben.

**Wichtig:** Ein technisches `calculationReady:true` bedeutet nur, dass dieser eng begrenzte Test-Rechenweg ausführbar war. Es ist weder eine formal/rechtlich freigegebene Betriebskostenabrechnung noch eine fertige PDF noch eine tatsächliche Zustellung. Fachliche Regelprüfung, sämtliche unterstützten Sonderfälle und Dokumentfreigabe erfolgen erst in späteren Schritten.

## Test und Qualität

Aus `pages/immobilien-premium/` mit Node.js: `npm test`. Die zwei neuen Dateien wurden lokal zusammen mit den vorhandenen Modelltests ausgeführt: 29 Tests bestanden, 0 fehlgeschlagen. Die zuvor in GitHub gespeicherten Speicher-Tests waren in der lokalen Testkopie nicht enthalten und sind bei einer vollständigen Repository-/CI-Abnahme erneut auszuführen. Kein Browser- oder PDF-End-to-End-Test erfolgt.

**Baustein 2 ist nicht abgeschlossen.** Nach dieser ersten Implementierung folgen gezielt die fehlenden Rechenfälle, damit MH-02 bis MH-08 später auch korrekt berechnet und nicht nur zuverlässig gesperrt werden. Erst dann steht der Rechenkern für die gesamte geplante Premium-Anwendung bereit.
