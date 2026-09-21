# Nebenkosten Premium — Heizung und Warmwasser (MH-07)

**21.09.2026 · Baustein 2.3, Erweiterung Messbasis und Geräteeinheiten. Begrenzter technischer Prototyp; keine Produkt-, Rechts- oder PDF-Freigabe.** Neu entwickelt; keine Übernahme aus dem alten Nebenkosten-Werkzeug.

## Implementierung

- `assets/js/thermal.js`: unabhängige reine Funktion `calculateThermalPeriod(project, accountingPeriodId, plan)`; benutzt die eigenständige Immobilienakte, bereits entwickelte Zähler-Evidenzprüfung und centgenaue Aufteilung. Sie ändert keine Eingabedaten.
- `assets/js/thermal-basis.js`: verpflichtender Nachweis der gemeinsamen Messgröße sowie exakte, belegte Umrechnungsfaktoren je Wärme-/Warmwasserzähler. Keine Umrechnung bloß anhand gleich aussehender Zahlen.
- `assets/js/temporal.js`: optionale und ausschließlich durch das Heizmodul übergebene Umrechnung der **Verbrauchsdifferenz** per BigInt; andere Berechnungen (insbesondere Kaltwasser) bleiben ohne solche Faktoren.
- `tests/thermal.test.mjs`: 16 ursprüngliche und 11 neue fiktive Heiz-Messbasis-Prüfungen. Gesamtsuite jetzt 129 Tests, 0 Fehler (lokaler Node-Testlauf). Browser, GitHub-CI und PDF-End-to-End nicht getestet.
- Unverändert: `assets/js/calculation.js` berechnet **keine** Heiz-/Warmwasserkosten; beide Rechenbereiche werden noch nicht zusammengeführt. Ein positiver Teilbericht ist keine fertige Betriebskostenabrechnung.

## Technisch unterstützter Ausschnitt

1. Getrennte, vom Nutzer vorab fachlich bestätigte Kosten für Heizung und Warmwasser, jeweils mit eigenem vollständigem jährlichem Rechnungsbestand. Die Anlage muss als getrennt bestätigt sein, es dürfen keine Kostenanteile aus verbundenen Anlagen ungeprüft gemischt sein. Nicht vorhandene Leistungen müssen explizit bestätigt werden.
2. Ausdrücklich bestätigter ganzzahliger Verbrauchsprozentsatz von 50 bis 70 Prozent. Ist die gesetzliche 70-%-Vorgabe im Einzelfall ausdrücklich als zutreffend bestätigt, lässt der Rechner nur 70 % zu. Die Feststellung der zutreffenden Quote und die Rechtswirksamkeit der Bestätigung erledigt der Rechner nicht.
3. Bestätigte Messwerte an beiden Jahresgrenzen und separat zugeordnete Zähler je Wohnung und Dienst. Zähler dürfen nicht für Heizung und Warmwasser gleichzeitig verwendet werden. Es wird weder geschätzt noch werden rückläufige Messwerte toleriert.
   - Jeder Zähler benötigt `measurementKind` und `measurementUnit`; jeder Dienst die dazu passende `measurementKind`, `canonicalUnit` und `measurementBasisConfirmed:true`. Heizenergie (`heat_energy`, Ziel `kWh`) erlaubt dokumentierte `kWh` oder `MWh`; Warmwasservolumen (`hot_water_volume`, Ziel `m3`) erlaubt `m3` oder `litre`.
   - Bei Heizkostenverteilern (`heat_allocator`, Ziel `rated_allocator_unit`) sind **pro Gerät** `deviceFactor:{numerator,denominator,confirmed:true,referenceId}` und die Mess-Einheit `allocator_unit` erforderlich. Die Referenz ist ein dokumentierter Bewertungsnachweis; die Rechts-/Fachprüfung dieses Nachweises bleibt separat. Manuelle Faktoren bei Energie- und Volumenzählern werden abgewiesen.
   - Wärmeenergie und Heizkostenverteiler-Werte werden **nicht miteinander addiert**. Exakte Brüche verwenden BigInt für die Verbrauchsdifferenzen; wenn Tausendstel der Zielgröße nicht exakt darstellbar sind oder Überlauf droht, wird der ganze Teilbericht gesperrt. Keine gerundeten Scheinwerte. Ein gerätebezogener Audit weist Ausgangs-Einheit, exakten Faktor und Nachweis aus.
4. Wohnungen mit durchgehender Nutzung und unveränderter Fläche; die Umlage verläuft pro Kostenposition in einen Verbrauchs- und einen Flächenanteil. Beide Anteile werden centgenau den einzelnen Wohnungen zugerechnet; Eigennutzung/Leerstand verbleiben auf Eigentümerseite. Kostenarten und Betriebskostenvereinbarungen müssen bestätigt sein.
5. Jahres- und Rechnungssummen werden ausgeglichen; es werden keine sonstigen Kosten, tatsächlichen Vorauszahlungen oder CO₂-Kosten ergänzt und keine Mieter-PDF freigegeben.

### Reine Testrechnung

Heizung 1.200,00 € (70 % Verbrauch, 30 % Fläche), Warmwasser 600,00 € (60 % Verbrauch, 40 % Fläche). Wohnflächen 120/80 m²; gemessene Heizwerte 300/100 und Warmwassermengen 10/30. Heizung: Eigentümer 846,00 € / Mieter 354,00 €. Warmwasser: Eigentümer 234,00 € / Mieter 366,00 €. Gesamtsumme 1.800,00 € = Eigentümer 1.080,00 € + Mieter 720,00 €.

## Bewusst nicht fertig — Freigabesperren und nächste Qualitätsarbeit

- Verbundene Wärme-/Warmwasseranlagen und gemeinsame Kosten nach § 9 HeizkostenV; Brennstoffverbrauch statt bloßer Brennstoff-Einkäufe, besonders Heizöl-Bestände.
- Nutzerwechsel, unterjährige Heiz-Grundkosten nach Gradtagszahlen oder Zeit sowie Zwischenablesungen nach § 9b HeizkostenV; die Kaltwasser-Tageslogik wird nicht übernommen.
- Gesetzliche und vertragliche Ausnahmen (u. a. § 2 und § 11 HeizkostenV), Nutzergruppen-Vorverteilung, zulässige Ersatzwerte nach § 9a, CO₂-Kostenaufteilung, Kürzungsrechte sowie Informationspflichten.
- **Messbasis-Prüfung ist technisch integriert**, aber die Echtheit und fachliche Zulässigkeit des eingetragenen Bewertungsnachweises ist noch nicht geprüft. Die unterstützten Einheiten sind absichtlich eng begrenzt; andere Geräteformen bzw. Energie-/Verbrauchsdaten benötigen einen eigenen validierten Rechenweg. Auch `measurementBasisConfirmed:true` stellt allein keine rechtliche Freigabe dar.
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

**Nächste Unterstufe:** Heizkosten bei Nutzerwechsel ausschließlich nach eigens geprüften Zeit-/Verbrauchsregeln; danach verbundene Anlagen und eigener CO₂-Rechenweg. Das jetzt entwickelte Messbasis-Modul ist noch kein vollständiges Heizkostenabrechnungssystem. Baustein 2 bleibt offen.
