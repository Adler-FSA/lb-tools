# Baustein 2 – nachvollziehbarer Arbeitsstand und nächste Schritte

**Stand 21.09.2026.** Dieses Statusblatt ergänzt `MASTERPLAN.md` und die neue verbindliche `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md`. Es ändert keinen freigegebenen Altbestand.

## Bereits tatsächlich umgesetzt

- **2.1:** unabhängiges Datenmodell v1, strukturelle Validierung, neue IDs und Zeitbezüge.
- **2.2:** isolierte lokale Datenablage und strukturell geprüfte JSON-Projektsicherung; keine Behauptung, dass Originalbelege oder PDFs mitgesichert werden.
- **2.3, bisheriger Rechenkern:** Gebäudekosten, Eigentümeranteile, individuelle Mieteranteile und separate Versorger-Zahlungen für unterstützte und bestätigte Basisfälle; Mieterwechsel, Leerstand, bestätigte Änderungen der Vorauszahlungen, dokumentierte Kaltwasser-Zählerwechsel und Messwertprüfung. Zusätzlich `thermal.js` als **isolierter, eng begrenzter Prototyp** für getrennte Heiz-/Warmwasserkosten bei durchgehender Nutzung. Dieser Teilbericht ist ausdrücklich NICHT mit der regulären Abrechnung kombiniert und erteilt keine Rechts-/PDF-Freigabe.
- **Testbasis:** im lokalen Projektordner am 21.09.2026 `npm test`: 118 Tests bestanden, 0 fehlgeschlagen. Dies ist kein Browser-, iPad-, GitHub-CI- oder Produktabnahmetest.

## Neue bestätigte Produktentscheidung: Eigentümer-Verträge statt regionaler Preis-Datenbank

Verbindliche Detailanforderungen sind separat in `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md` hinterlegt: Eigentümer gibt reale Versorgungsverträge und Preiswerte selbst ein; prognostizierte Vertragskosten, belegte tatsächliche Rechnungskosten, Versorgerabschläge/-gutschriften und Mieterzahlungen werden getrennt. Direktverträge eines Mieters dürfen nicht doppelt in Vermieterkosten erscheinen. Bestehende sechs Navigationsbereiche und zwölf Werkzeuge bleiben bestehen. Diese Ergänzung ist **dokumentiert, nicht bereits als Dateneingabeoberfläche implementiert**.

## Reihenfolge der verbleibenden Arbeiten in Baustein 2

1. **Messbasis Heiz-/Warmwasser:** Gerätetyp, Einheit und Vergleichbarkeit verpflichtend validieren; Heizkostenverteiler mit unterschiedlichen Bewertungsfaktoren ohne gesicherte Normalisierung sperren. Den vorhandenen isolierten Wärme-Rechner erst danach für weitere Fälle öffnen. Regressionstests.
2. **Heiz-/Warmwasser-Sonderfälle:** Nutzerwechsel mit gesonderten Grund-/Verbrauchsanteilen, Zwischenablesungen bzw. ggf. zulässigen anderen Maßstäben, verbundene Anlagen und ihre Kostentrennung. Ausnahmen, Heizöl-Verbrauch statt bloßem Einkauf und nicht prüfbare Fälle als Sperre; nur belegte und fachlich bestätigte Varianten positiv implementieren.
3. **CO₂-Kosten:** separater Prüfungspfad für Anwendbarkeit, belegte CO₂-Positionen, Vermieter-/Mieteranteile, Direktvertrag des Mieters und doppelte Kosten. Ohne ausreichend geprüfte Basis keine fertige Ergebnisfreigabe.
4. **Versorgungs-Datenmodell:** die neue Anforderung in ein versioniertes und getestetes Datenformat für Versorger, Preisstände, Vertragsinhaber und Rechnungen übersetzen, ohne bestehende `expenses` oder `cashflows` zu duplizieren. Plan-/Ist- und Zahlungsströme strikt trennen; noch keine neue HTML-Hauptnavigation bauen.
5. **Integration und Endprüfung:** Standardkosten + Wärme + CO₂ nur einmal zusammenführen; Einzelbeträge, Perioden, Eigentümer-/Mieteranteile, Abschläge und Rundungsreste abgleichen. Alle MH-01–MH-09 als positive Tests für unterstützte Fälle bzw. eindeutig dokumentierte Sperrtests für nicht unterstützte Sonderfälle; Regression mit Datenmodell und Sicherung. Produktfreigabe erst nach späteren Fach-, UI- und PDF-Prüfungen.

## Freigabegrenze

Baustein 2 ist **nicht fertig oder abgenommen**. Insbesondere sind Heizkosten und Warmwasser derzeit nur isoliert für einen eingeschränkten Fall berechenbar; CO₂, Nutzerwechsel bei Wärme und verbundene Anlagen fehlen. Keine fertige HTML-Anwendung, keine erzeugte Mieter-PDF, keine rechtlich geprüfte Abrechnung. Erst nach der technischen Abnahme von Baustein 2 beginnt Baustein 3 mit der nutzbaren Immobilien- und Eigentümeroberfläche. Die separat freigegebene Hotel-PDF-Zentrale wird später nur nach Verifikation integriert; keine neue PDF-Engine erfinden.