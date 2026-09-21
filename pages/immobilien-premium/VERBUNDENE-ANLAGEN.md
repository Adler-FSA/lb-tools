# Nebenkosten Premium – verbundene Heizungs- und Warmwasseranlagen

**21.09.2026 · Baustein 2.3 · nur technische Kosten-Vorabtrennung. Keine Produkt-, Rechts-, PDF- oder Mieterabrechnungsfreigabe.** Ergänzt `HEIZUNG.md` und die verbindliche `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md`; alter Nebenkostenrechner unverändert.

## Warum eine getrennte Vorstufe?

Bei einer verbundenen Anlage entstehen einige Kosten gemeinsam für Heizung und Warmwasser, andere ausschließlich für eine der beiden Leistungen. Für die spätere Kostenverteilung müssen gemeinsame Kosten zunächst getrennt und ausschließlich einer Leistung zugehörige Kosten anschließend nur dieser Leistung zugerechnet werden. Rechtsgrundlage für die fachliche Prüfung ist § 9 HeizkostenV: https://www.gesetze-im-internet.de/heizkostenv/__9.html . Welche Methode und Ausnahmen im konkreten Fall einschlägig sind, entscheidet **nicht** dieses Modul.

## Implementiert: `assets/js/thermal-linked.js`

`separateLinkedThermalCosts(project, accountingPeriodId, plan)` gibt nur bei vollständig dokumentiertem, bestätigtem Fall `{status:'calculated', calculationReady:true, issues:[], report:{...}}` zurück. Andernfalls werden konkrete Fehler und `report:null` geliefert. Die Funktion ist rein; sie ändert keine Rechnungen, erzeugt keine Buchungen und liest weder Browser- noch Altdaten.

- Die Anlage wird als `linked` sowie als Gasheizkessel, Wärmepumpe oder gewerbliche Wärmelieferung erfasst. Der Spezialfall Heizöl/Lagerbestände wird **nicht** als Gas behandelt.
- Für die gemeinsame Energieverteilung liegen Gesamtmenge und Warmwasseranteil in **derselben ausdrücklich bestätigten physikalischen Bezugsgröße** als ganze Tausendstel kWh vor, jeweils mit Belegreferenz. Gasheizkessel: bestätigte Brennstoff-Energiebasis; Wärmepumpe/Wärmelieferung: bestätigte Wärme-Energiebasis. Die Software rechnet **keine** Brennstoffenergie automatisch in Wärmeabgabe um und berechnet auch keine gesetzlichen Ersatzformeln. `methodReviewed:true` dokumentiert eine Nutzereingabe, **keine automatische fachliche Anerkennung**.
- `sharedExpenseIds`, `heatingOnlyExpenseIds`, `hotWaterOnlyExpenseIds` und `co2ExpenseIds` listen die vollständigen zugehörigen Rechnungspositionen. Jede Position hat eine stabile Kennung, einen eindeutigen Beleg mit `invoiceReference` und `invoiceLineId`, einen Centbetrag, den vollständigen Jahres-Leistungszeitraum und eine bestätigte Kostenklassifizierung; ausgeschlossene CO₂-Positionen dürfen bis zur getrennten Prüfung `unresolved` sein.
- `invoiceTotalsCentsByReference` enthält für jede Originalrechnung den belegten Gesamtbetrag. Die Summe aller aufgelisteten Positionen **einschließlich separat geführtem CO₂** muss exakt übereinstimmen. Eine doppelte Quellkennung, identische Belegposition oder fehlende Rechnung sperrt die gesamte Vorabtrennung.
- Jede gemeinsame Kostenposition wird mit BigInt nach den bestätigten Mengenanteilen centgenau in Heizung und Warmwasser getrennt. Ausschließlich zu einer Leistung gehörende Kosten werden **danach** dieser Leistung zugeschlagen; Rundungsreste sind nachvollziehbar, jede Originalposition und jede Gesamtsumme werden ausgeglichen.
- CO₂-Kosten werden als eigener, noch ungeklärter Bestand geführt und **nicht** still einem der beiden Kostentöpfe oder dem Mieter zugeteilt. Heizöl-Einkäufe werden nicht mit tatsächlich verbrauchten Brennstoffmengen verwechselt. Eigentümerkosten anderer Kategorien und Versorgerabschläge sind keine Bestandteile dieses Kosten-Splittings.

## Fiktiver Prüffall

| Position | Betrag |
|---|---:|
| Gemeinsame Gas-Kostenposition ohne separat ausgewiesenes CO₂ | 1.800,01 € |
| CO₂-Position derselben Originalrechnung – gesondert | 20,00 € |
| Nachgewiesener Gesamtbetrag der Gasrechnung | **1.820,01 €** |
| Separate Wartungsrechnung, Heizung | 100,00 € |
| Separate Wartungsrechnung, Warmwasser | 50,00 € |

Bestätigte gleiche Energie-Basis: Gesamt 200 kWh, Warmwasser 50 kWh, Heizung folglich 150 kWh. Getrennte **gemeinsame** Kosten: Heizung 1.350,01 €, Warmwasser 450,00 €. Nach Zuordnung der jeweils allein entstandenen Kosten: **Heizung 1.450,01 € + Warmwasser 500,00 € = 1.950,01 €**. Die getrennte CO₂-Position von 20,00 € ist in diesen beiden Kostentöpfen **nicht** enthalten; zusammen mit ihr und den übrigen belegten Positionen stimmen die Originalrechnungen. Das ist ausschließlich eine fiktive Rechenprüfung, keine Feststellung der gesetzlich zulässigen Aufteilung in einem realen Gebäude.

## Was noch fehlt

Der Teilbericht hat `scope:'linked_cost_preallocation_only'`, `transferredToThermal:false`, `combinedWithOtherCosts:false`, `co2Calculated:false`, `legalRelease:false`, `pdfGenerated:false`. Die ermittelten Töpfe werden **noch nicht** in `thermal.js` oder `calculation.js` eingespielt. Es werden insbesondere keine fingierten neuen Rechnungen angelegt und keine ursprünglichen Kosten doppelt gezählt. Der vorhandene separate Heizkostenrechner darf für ein Gebäude mit gemeinsamen Kosten nicht als vollständige Gesamt-Heizkostenabrechnung benutzt werden.

Vor einer Integration fehlen: eine belegbare Übertragung der beiden getrennten Kostentöpfe in den Nutzerrechner **ohne zweite Zählung**, verbindliche fachliche Prüfung der §-9-Messbasis/Anlagenvarianten einschließlich einschlägiger Formeln und Ausnahmen, Bestandsberechnung bei Heizöl, CO₂-Regeln, Gegenprüfung der Versorger- und Mieter-Zahlungskreise sowie sämtliche End-to-End-Abnahmen.

## Tests

`tests/thermal-linked.test.mjs`: **16 zusätzliche lokale Node-Tests bestanden, 0 fehlgeschlagen** (positives Kostenbeispiel, Cent-Reste, mehrere Rechnungen, getrennte CO₂-Inventur, Bilanz je Originalrechnung, doppelte Rechnungspositionen, fehlende Belege, fremde Periode, falsche Energieeinheit und Sperrfälle). Das Modul und die Tests wurden lokal ausgeführt und anschließend auf GitHub gespeichert. **Nicht behauptet:** erneuter Durchlauf der gesamten früheren Testsuite, Browserprüfung, fachliche Rechtsabnahme oder funktionierende Integration in die Mieterabrechnung.

**Baustein 2.3 und Baustein 2 bleiben offen. Nächster technischer Schritt: sichere Integration ohne Doppelerfassung; anschließend separater CO₂-Rechenweg.**
