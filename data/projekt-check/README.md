# Projekt-Check Falldaten

Die neue Engine legt pro Analysefall einen eigenen Ordner an:

`data/projekt-check/cases/<CASE_ID>/`

Vorgesehene Dateien:

- `intake.json` – übergebene öffentliche Spuren, optionaler Nutzer-Claim und gewünschte externe Ausgabe (`customer_check` oder `company_check`)
- `identity.json` – aufgelöste Identität und Zuordnungssicherheit
- `evidence.json` – strukturierter Evidenzbestand mit Quellen und Provenienz
- `evaluation.json` – neutraler Befundbestand für alle 37 Prüfbereiche plus Kunden-, Firmen- und Akademie-Perspektive
- `status.json` – Live-Status aller 37 Prüfbereiche, aller drei Perspektiven und aller drei Dokumente für das Control Panel
- `customer-report.json` – eigenständige Datenbasis für den Kunden-Projekt-Check
- `company-report.json` – eigenständige Datenbasis für den Firmen-Projekt-Check
- `academy-full-analysis.json` – eigenständige Datenbasis für die interne Akademie-Vollanalyse

## Grundregel

Die drei Report-Dateien werden nicht voneinander abgeleitet. Sie werden unabhängig aus `evidence.json` und `evaluation.json` erzeugt.

Die neutrale Auswertung folgt:

- `projekt-check-auswertung/NEUTRALITAETSSTANDARD.md`
- `projekt-check-auswertung/AUSWERTUNGSPROFILE.md`
- `projekt-check-auswertung/guidance/checks-37-guidance.json`

Der Statusdatensatz muss dem Schema `projekt-check-engine/schemas/status.schema.json` entsprechen. Der vollständige Auswertungsdatensatz muss dem Schema `projekt-check-auswertung/schemas/evaluation.schema.json` entsprechen.

Der spätere Hörsaal kann zusätzliche Daten an denselben Fall anbinden, bleibt aber eine eigene Vertiefungsstufe.
