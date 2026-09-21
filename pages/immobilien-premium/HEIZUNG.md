# Nebenkosten Premium — Heizung und Warmwasser (MH-07)

**21.09.2026 · Baustein 2.3, begrenzter technischer Prototyp. Keine Produkt-, Rechts- oder PDF-Freigabe.** Neu entwickelt; keine Übernahme aus dem alten Nebenkosten-Werkzeug.

## Implementierung

- `assets/js/thermal.js`: unabhängige reine Funktion `calculateThermalPeriod(project, accountingPeriodId, plan)`; benutzt die eigenständige Immobilienakte, bereits entwickelte Zähler-Evidenzprüfung und centgenaue Aufteilung. Sie ändert keine Eingabedaten.
- `tests/thermal.test.mjs`: 16 zusätzliche fiktive Tests für positive Musterrechnung und bewusste Sperrungen. Gesamtsuite derzeit 118 Tests, 0 Fehler (lokaler Node-Testlauf). Browser, GitHub-CI und PDF-End-to-End nicht getestet.
- Unverändert: `assets/js/calculation.js` berechnet **keine** Heiz-/Warmwasserkosten; beide Rechenbereiche werden noch nicht zusammengeführt. Ein positiver Teilbericht ist keine fertige Betriebskostenabrechnung.

## Technisch unterstützter Ausschnitt

1. Getrennte, vom Nutzer vorab fachlich bestätigte Kosten für Heizung und Warmwasser, jeweils mit eigenem vollständigem jährlichem Rechnungsbestand. Die Anlage muss als getrennt bestätigt sein, es dürfen keine Kostenanteile aus verbundenen Anlagen ungeprüft gemischt sein. Nicht vorhandene Leistungen müssen explizit bestätigt werden.
2. Ausdrücklich bestätigter ganzzahliger Verbrauchsprozentsatz von 50 bis 70 Prozent. Ist die gesetzliche 70-%-Vorgabe im Einzelfall ausdrücklich als zutreffend bestätigt, lässt der Rechner nur 70 % zu. Die Feststellung der zutreffenden Quote und die Rechtswirksamkeit der Bestätigung erledigt der Rechner nicht.
3. Bestätigte Messwerte an beiden Jahresgrenzen und separat zugeordnete Zähler je Wohnung und Dienst. Zähler dürfen nicht für Heizung und Warmwasser gleichzeitig verwendet werden. Es wird weder geschätzt noch werden rückläufige Messwerte toleriert.
4. Wohnungen mit durchgehender Nutzung und unveränderter Fläche; die Umlage verläuft pro Kostenposition in einen Verbrauchs- und einen Flächenanteil. Beide Anteile werden centgenau den einzelnen Wohnungen zugerechnet; Eigennutzung/Leerstand verbleiben auf Eigentümerseite. Kostenarten und Betriebskostenvereinbarungen müssen bestätigt sein.
5. Jahres- und Rechnungssummen werden ausgeglichen; es werden keine sonstigen Kosten, tatsächlichen Vorauszahlungen oder CO₂-Kosten ergänzt und keine Mieter-PDF freigegeben.

### Reine Testrechnung

Heizung 1.200,00 € (70 % Verbrauch, 30 % Fläche), Warmwasser 600,00 € (60 % Verbrauch, 40 % Fläche). Wohnflächen 120/80 m²; gemessene Heizwerte 300/100 und Warmwassermengen 10/30. Heizung: Eigentümer 846,00 € / Mieter 354,00 €. Warmwasser: Eigentümer 234,00 € / Mieter 366,00 €. Gesamtsumme 1.800,00 € = Eigentümer 1.080,00 € + Mieter 720,00 €.

## Bewusst nicht fertig — Freigabesperren und nächste Qualitätsarbeit

- Verbundene Wärme-/Warmwasseranlagen und gemeinsame Kosten nach § 9 HeizkostenV; Brennstoffverbrauch statt bloßer Brennstoff-Einkäufe, besonders Heizöl-Bestände.
- Nutzerwechsel, unterjährige Heiz-Grundkosten nach Gradtagszahlen oder Zeit sowie Zwischenablesungen nach § 9b HeizkostenV; die Kaltwasser-Tageslogik wird nicht übernommen.
- Gesetzliche und vertragliche Ausnahmen (u. a. § 2 und § 11 HeizkostenV), Nutzergruppen-Vorverteilung, zulässige Ersatzwerte nach § 9a, CO₂-Kostenaufteilung, Kürzungsrechte sowie Informationspflichten.
- Unterschiedliche Geräte-Messeinheiten und Heizkostenverteiler mit gerätebezogenen Bewertungsfaktoren sind noch **nicht maschinell homogenisiert oder geprüft**. `readingsConfirmed` ist nur eine dokumentierte Eingabebestätigung. Vor Integration wird ein verpflichtender Nachweis einer vergleichbaren, normalisierten Messbasis eingeführt.
- `report.scope='thermal_subreport_only'`, `combinedWithOtherCosts=false`, `co2Calculated=false`, `legalRelease=false`, `pdfGenerated=false`. Keine rechtliche oder veröffentlichungsfähige Abrechnung aus diesem Teilbericht ableiten.

## Rechtsquellen zur fachlichen Freigabe (nicht als automatische Rechtsprüfung implementiert)

- § 2 HeizkostenV — Vorrang/Ausnahme: https://www.gesetze-im-internet.de/heizkostenv/__2.html
- § 6 HeizkostenV — Pflicht und Maßstäbe: https://www.gesetze-im-internet.de/heizkostenv/__6.html
- § 7 HeizkostenV — Heizkosten, Verbrauchsanteil: https://www.gesetze-im-internet.de/heizkostenv/__7.html
- § 8 HeizkostenV — Warmwasserkosten: https://www.gesetze-im-internet.de/heizkostenv/__8.html
- § 9 HeizkostenV — verbundene Anlagen: https://www.gesetze-im-internet.de/heizkostenv/__9.html
- § 9a HeizkostenV — Sonderfälle/Messausfall: https://www.gesetze-im-internet.de/heizkostenv/__9a.html
- § 9b HeizkostenV — Nutzerwechsel: https://www.gesetze-im-internet.de/heizkostenv/__9b.html
- § 11 HeizkostenV — Ausnahmen: https://www.gesetze-im-internet.de/heizkostenv/__11.html

**Nächste Unterstufe:** Einheitennormalisierung/Messbasis prüfen, anschließend Nutzerwechsel und verbundene Anlagen als getrennte, fallgeprüfte Berechnungen. CO₂ erhält ein eigenständiges Modul. Baustein 2 bleibt offen.
