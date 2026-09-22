# Nebenkosten Premium – gemeinsamer Jahresablauf (Baustein 2.3)

**Stand 22.09.2026. Technische Vorschau, keine Produkt-, Rechts-, Buchungs-, HTML- oder PDF-Freigabe.** Grundlage bleiben `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md`. Alter Nebenkostenrechner und genehmigte PDF-Mastervorlage werden nicht geändert.

## Neu umgesetzt

`assets/js/year-workflow-runner.js` stellt `previewAnnualPeriod(project, periodId, plans)` bereit und verbindet die **tatsächlichen** bestehenden Funktionen `validateProject`, `calculatePeriod`, `calculateThermalPeriod` beziehungsweise `calculateLinkedThermalWithEngine`, `previewTenantCo2`, `reviewSupplyRegistry` und `auditPeriodPreview` über `assets/js/year-workflow.js`.

Der ursprüngliche Projekt-Datensatz bleibt erhalten. Für Standardkosten werden nur Standardrechnungen und deren Regeln in einer **temporären Kopie** gerechnet; Versorgerzahlungen verbleiben beim Jahres-Auditor, damit Heizungsversorger nicht fälschlich einer Standardkostenrechnung zugeordnet werden. Für getrennte Wärmekosten wird eine temporäre Kopie ohne CO₂-Kosten verwendet. Bei verbundener Anlage werden dem Übertragungsmodul die Originalrechnungen über eine Kopie ohne überholte Sonderkosten-Umlageregeln und ohne zu den danach entfernten Originalpositionen führende Vertragsregister-Referenzen übergeben. Temporär abgeleitete Wärmetöpfe sind **keine** zweite Originalrechnung. Die echte Originalakte geht unverändert in die endgültige Jahresprüfung.

Fehlende Pläne, nicht belegte Rechnungen, Heizöl-Sonderfälle, gemischte gemeinsame und bereits getrennte Wärme-Originalpositionen, ungeprüftes Folgejahr, fehlende CO₂-Fachprüfung, Versorgungsvertrags-Entwürfe oder nicht bestandene Einzelrechnungen sperren den gesamten Aufruf. Für Jahre mit ausschließlich Wärme-/CO₂-Kosten ist die separate belastbare Vorauszahlungsbasis noch nicht integriert; solche Fälle werden ebenfalls gesperrt. Die bisherigen Fachmodule können weitere, engere Sperren auslösen.

**Nur wenn der Jahres-Auditor mit vollständig geprüften Originalkosten die Vorschau bestätigt**, liefert der neue Einstieg `status:'preview'`, `calculationReady:false`, `scope:'annual_workflow_preview_only'`. `combinedForPosting:false`, `legalRelease:false`, `pdfGenerated:false` bleiben zwingend. Es werden weder Kosten, Zahlungen, Freigaben noch Dateien erzeugt oder gespeichert.

## Prüfnachweis und Einschränkungen

`tests/year-workflow.test.mjs` umfasst **9 neue lokale Orchestrierungs- und Sperrtests** mit echten Projektschema-Prüfungen, aber **injizierten Test-Rechnern**; dadurch lässt sich die Ablaufsteuerung isoliert prüfen. Im gegenwärtigen lokalen Teilverzeichnis liefen am 22.09.2026 **56 Tests aus sechs Testdateien fehlerfrei** (Datenmodell, Speicherung, Versorgungsdaten und Jahresablauf). Die beiden neuen JavaScript-Dateien und die Testdatei wurden auf GitHub `main` gespeichert und über Git-Blob-Hashes mit den lokal getesteten Dateien abgeglichen.

**Noch NICHT getestet:** Durchgehender Ablauf des neuen echten Einstiegs mit sämtlichen ursprünglichen Berechnungsmodulen und MH-01–MH-09 gemeinsam; vollständig reproduzierbarer GitHub-Gesamttest; Browser/iPad; juristische Einzelfallprüfung oder PDF-End-to-End. Die vergangenen Teiltests dürfen nicht zu einer fiktiven Gesamtsuite addiert werden. Diese Dokumentation behauptet keine fertige Abrechnung.

## Verbleibend bis Baustein 2

Die bislang lokal fehlenden früheren Module samt Tests aus GitHub in einem gemeinsamen Prüfumfeld zusammenführen und echte Positiv-/Negativfälle für den neuen `previewAnnualPeriod` durchlaufen lassen. Insbesondere gemeinsam belegte Heizung/Warmwasser/CO₂ und korrekte Vorauszahlungen, Mieterwechsel, Leerstand, reine Wärme-Gebäude, Direktversorgung und Lieferanten ohne Zahlung prüfen. Bekannte fachlich nicht unterstützte Szenarien bleiben bis zu nachgewiesener Implementierung gesperrt. Danach Jahreswechsel und Snapshot-Sperren konsistent absichern und sämtliche MH-01–MH-09-Fälle durchführen. Erst nach bestandenem Gesamtverfahren und ausdrücklicher Freigabe von Baustein 2 beginnt Baustein 3 mit einer bedienbaren HTML-Immobilienzentrale zur Sichtprüfung.
