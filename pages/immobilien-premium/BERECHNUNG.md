# Nebenkosten Premium — Berechnungskern, Baustein 2.3

**Stand: 21.09.2026 · Teilstand Zählerwechsel mit belegten Werten umgesetzt. Keine freigegebene Abrechnungssoftware.** Grundlage: freigegebener `MASTERPLAN.md`. Eigenständige Neuentwicklung ohne Code, Daten oder Abhängigkeiten des früheren Nebenkosten-Werkzeugs.

## Dateien und Schnittstellen

- `assets/js/calculation.js`: `calculatePeriod(project, accountingPeriodId)` und `distributeCents(amountCents, weights)`.
- `assets/js/temporal.js`: lückenlose Nutzungszeiträume, Tagesaufteilung, gemessene Verbrauchsaufteilung und dokumentierte Zählerketten.
- `assets/js/contract-history.js`: bestätigte Versionen der Vorauszahlungsvereinbarung und getrennte Soll-/Ist-Zahlungsübersicht.
- Tests: `tests/calculation.test.mjs`, `tests/temporal.test.mjs`, `tests/contract-history.test.mjs`, `tests/meter-changes.test.mjs` sowie Modell-/Speichertests. Nur fiktive Daten.
- Rechenfunktionen lesen keinen Browser-Speicher, erzeugen keine PDFs, greifen nicht auf Altdaten zu und verändern ihre Eingaben nicht.
- Erfolg nur innerhalb unterstützter, bestätigter Fälle: `{status:'calculated', calculationReady:true, issues:[], report:{...}}` mit `report.legalRelease:false`, `report.pdfGenerated:false`. Alle anderen Fälle: `{status:'blocked', calculationReady:false, issues:[...], report:null}`. Keine teilweise fertige Scheinabrechnung.

## Derzeit berechenbarer Umfang

1. Abgeschlossener Abrechnungszeitraum; jede Wohnung hat lückenlose, überschneidungsfreie Nutzungsabschnitte (`owner`, `tenant`, `vacant`), mit echten Tageszahlen. Kein automatisch ergänzter Leerstand. Verträge decken die tatsächlichen Mietzeiten.
2. Ausdrücklich bestätigte Testkategorien `property_tax`, `building_insurance`, `waste`, `common_electricity`, `cold_water`; eigens klassifizierte Eigentümerkosten bleiben getrennt. Ein Kategorienname ist **keine automatische rechtliche Umlagefreigabe**. Vertragsbezogen bestätigte Kostenvereinbarungen sind Voraussetzung.
3. Kostenverteilung je Rechnungsposition nach bestätigter `area`-, `consumption`- oder `direct`-Regel. Erst Wohnungsanteil, dann gegebenenfalls Aufteilung auf Nutzerabschnitte. Centbeträge und Restcent über BigInt und stabile IDs; alle Teile müssen wieder die Ausgangssumme ergeben. Flächenwechsel im Jahr bleiben gesperrt.
4. Mehrere Nutzer derselben Wohnung: bestätigte Verteilung zeitabhängiger Positionen nach Kalendertagen (`temporalMethod:'days'`, `temporalConfirmed:true`) oder Kaltwasser nach Zwischenablesungen (`temporalMethod:'readings'`, `temporalConfirmed:true`). Eine Unterjahresrechnung braucht eine zusätzliche Bestätigung ihres zeitlichen Leistungsbezugs. Dies sind bestätigte technische Verteilungen und keine Aussage, dass dieser Schlüssel stets rechtlich richtig wäre.
5. Getrennte Vertragsversionen mit bestätigter Änderung ausschließlich der Betriebskostenvorauszahlung können aufeinander folgen. Monatliche Sollbeträge werden aus dem gültigen Vertrag oder bestätigten Teilmonats-Einträgen hergeleitet. Sollbeträge sind keine nachweislich gezahlten Beträge. Tatsächlich gebuchte Betriebskostenzahlungen bleiben getrennt von Grundmiete und von Versorgerzahlungen; Differenzen sind lediglich rechnerische Prüfangaben.
6. Zähler ohne Wechsel sowie ausdrücklich bestätigte, lückenlose **Zählerwechselketten** werden mit wirklichen Anfangs-, Schluss- und Zwischenablesungen berechnet. Für jede Nutzung und jedes Gerät werden die Differenzen separat gebildet, niemals alte und neue Gerätewerte direkt voneinander abgezogen. Mehrfache Wechsel und zusätzliche unabhängige Zähler sind im begrenzten, vollständig dokumentierten Modell unterstützt; Details unten.
7. Versorgerkonten und zugeordnete Versorgerzahlungen bleiben eigenständige Zahlungskreise. Ihr Saldo ist ausschließlich ein rechnerischer Stand der **erfassten** Kontovorgänge und kein bestätigter Versorger-Jahresabschluss.

## Dokumentierte Zählerwechsel: Datenvertrag und Sicherungen

Zwei **alternative**, nicht gleichzeitig zulässige Zuordnungen existieren je Kostenregel:

```js
// Ohne Zählerwechsel; beide IDs beschreiben gleichzeitig aktive, unabhängige Kanäle.
meterIdsByUnit: { wohnungA: ['zaehlerA'], wohnungB: ['bad', 'kueche'] }

// Mit bestätigten Geräteketten; getrennte Kanäle bleiben eigene Unterlisten.
meterChainsByUnit: { wohnungA: [['zaehlerA']], wohnungB: [['alt', 'neu'], ['kueche']] },
meterSwapConfirmed: true
```

Ein Zählerwechsel verlangt `removedAt` des alten und `installedAt` des neuen Geräts **am selben dokumentierten Kalendertag**. Diese Tagesgrenze muss innerhalb der Abrechnungsperiode liegen. Das Jahresintervall wird vollständig von genau einem Gerät pro Messkanal und Teilintervall abgedeckt. Beide Geräte benötigen am Wechseltag ihre **jeweils eigene** Ablesung: Schlussstand alt und Anfangsstand neu. Beispiel: Alt 10 → 30 = 20 m³; neu 5 → 30 = 25 m³; Gesamtverbrauch 45 m³. Startwert 5 des neuen Zählers wird nicht vom Alt-Endstand 30 abgezogen.

Liegt auch ein Mieterwechsel vor, wird dessen bestätigte Zwischenablesung zusätzlich berücksichtigt. Fallen Mieter- und Zählerwechsel auf denselben Tag, gelten die beiden getrennten Gerätestände zugleich als Nutzergrenze. Erfolgt der Gerätetausch mitten im Mietabschnitt, wird für den späteren Nutzerwechsel eine zusätzliche Ablesung des dann aktiven Geräts benötigt. Die Intervalle werden genau einmal addiert. Mehrere nacheinander dokumentierte Geräte und parallel vorhandene unabhängige Messkanäle werden addiert, nicht verwechselt.

**Sperren statt Schätzungen:** fehlender oder doppelter Wechselstand (`METER_SWAP_READING_REQUIRED`), unbestätigte Folge (`METER_SWAP_UNCONFIRMED`), Lücke/Überlappung der Installationsdaten (`METER_CHAIN_GAP_OR_OVERLAP`), doppelt verwendete Geräte-ID (`METER_DUPLICATED`), unvollständige Jahresabdeckung (`METER_CHANGE_UNSUPPORTED`), fehlende Nutzer-Zwischenablesung (`METER_INTERMEDIATE_READING_REQUIRED`), negative/ungültige Gerätdifferenz (`METER_READING_INVALID`), Überlauf und unpassende Wohnung werden nicht still korrigiert. Die bisherige `meterIdsByUnit`-Zuordnung bleibt für parallel genutzte **durchgängig installierte** Einzelzähler erhalten.

Die Programmierung prüft nur die dokumentierte Datenkette; sie behauptet weder Echtheit eines Belegs noch eine rechtlich für jeden Fall zulässige Kostenverteilung. Ein Geräteüberlauf, geschätzter Messwert, Ersatzverfahren oder eine nicht am selben Tag erfolgte Auswechslung ist weiterhin **nicht** automatisch unterstützt.

## Referenzrechnungen (alle Werte erfunden)

- **MH-01:** Gebäudekosten 3.700,00 € = Eigentümer 2.595,00 € + Mieter 1.105,00 €. Erfasste Mietervorauszahlungen 1.200,00 € → rechnerisches Guthaben 95,00 €. Wasserversorger: 600,00 € erfasste Zahlung – 500,00 € erfasste Kosten = getrennte Differenz 100,00 €.
- **MH-02:** 365,00 € flächenbezogene Jahreskosten: Eigentümerwohnung 219,00 €, Mietwohnung 146,00 €, davon Vormieter 181 Tage = 72,40 € und Nachmieter 184 Tage = 73,60 €.
- **MH-03:** 61 Tage Leerstand führen zu 24,40 € eigenem Leerstandsanteil: insgesamt Eigentümer 243,40 € und beide Mieter zusammen 121,60 €; Gesamtsumme weiterhin 365,00 €.
- **MH-04:** Januar–Juni monatlich 100,00 €, Juli–Dezember monatlich 120,00 € = 1.320,00 € bestätigtes Soll; bei 1.200,00 € gebuchten Zahlungen lediglich rechnerische Differenz 120,00 €, keine automatische Mietrückstandsbehauptung.
- **MH-05:** Bei Kaltwasser 55 m³ Eigentümer und 45 m³ Mietwohnung ergeben 500,00 € Rechnungsbetrag die Anteile 275,00 € und 225,00 €. Die Mietwohnung hat in der Testkette Altgerät 20 m³ und Neugerät 25 m³ verbraucht; trotz unterschiedlicher Startstände bleibt der Mieteranteil 225,00 €. Bei gleichzeitigen Mieter- und Zählerwechseln werden die gemessenen Teilmengen 20/25 m³ den getrennten Mietverhältnissen zugeordnet.

Die verwendeten Kostenarten, Verträge und Verteilungsschlüssel gelten ausschließlich unter den ausdrücklichen Testannahmen.

## Noch nicht freigegeben / weitere Entwicklung

- **MH-06:** Ersatzwerte bei fehlenden Ablesungen, Zählerüberlauf, nicht gleichzeitiger Gerätewechsel und rechtlich zulässige Schätzverfahren werden noch **nicht** ermittelt; eindeutige fehlende Angaben führen zur Sperre.
- **MH-07:** Heizung, Warmwasser, Heizöl, verbundene Anlagen, Nutzerwechsel und anwendbare Ausnahmen brauchen einen gesonderten, fachlich geprüften Rechenkern.
- **MH-08:** CO₂-Kosten und Vermieter-/Mieter-Aufteilung benötigen eigene Regeln und rechtliche Prüfung.
- **MH-09:** Verschiedene Jahre sind voneinander getrennt; der vollständige Jahreswechsel-Assistent und die finale Dokumentversionierung folgen später.
- Weiterhin gesperrt: Pauschale und Wechsel des Betriebskostenmodells; sonstige Vertragsänderungen statt reiner Vorauszahlung; unklare Rückzahlungen; unterjährige Flächenänderungen; ungeklärte Umlagen; periodenübergreifende Rechnungen ohne Regelmodell.

## Tests und nächste Freigabe

Im lokalen, isolierten Projektordner: **87 Node-Tests bestanden, 0 fehlgeschlagen** (`npm test`) nach Ergänzung der Zählerwechseltests. Geprüft sind einfacher und zweifacher Wechsel, unabhängige parallele Zähler, Wechsel mit und ohne gleichzeitigen Mieterwechsel, fehlende/doppelte Wechselstände, falsche Daten, Zuordnung und Zahlen. Die auf GitHub gespeicherten Quell-/Testdateien wurden anhand ihrer Git-Blob-SHA mit den lokal getesteten Fassungen abgeglichen. Noch keine GitHub-CI-, Browser-, Dokument- oder PDF-End-to-End-Abnahme.

**Baustein 2.3 und Baustein 2 bleiben offen.** Nächste Arbeiten: Messwert-Sonderfälle sicher abgrenzen, gesonderten Heiz-/Warmwasser-/CO₂-Kern fachlich spezifizieren und erst nach überprüfbarer Umsetzung für zusätzliche Fälle öffnen. Technische Berechenbarkeit ist keine Produkt- oder Rechtsfreigabe.
