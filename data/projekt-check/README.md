# Projekt-Check Falldaten

Die neue Engine legt pro Analysefall einen eigenen Ordner an:

`data/projekt-check/cases/<CASE_ID>/`

Vorgesehene Dateien:

- `input.json` – übergebene öffentliche Spuren und optionaler Nutzer-Claim
- `identity.json` – aufgelöste Identität und Zuordnungssicherheit
- `evidence.json` – strukturierter Evidenzbestand
- `status.json` – Live-Status aller 37 Prüfbereiche für das Control Panel
- `user-report.json` – Datenbasis für den kompakten Nutzer-Projekt-Check
- `full-analysis.json` – Datenbasis für die vollständige Akademie-Projektanalyse

Der Statusdatensatz muss dem Schema `projekt-check-engine/schemas/status.schema.json` entsprechen.
