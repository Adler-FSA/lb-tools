# Fehler- und Wiederanlaufprotokoll

## Identifikation
- Produkt: `{{PRODUCT_NAME}}`
- App-Version: `{{APP_VERSION}}`
- Commit: `{{COMMIT_SHA}}`
- Setup-Datei: `{{SETUP_FILENAME}}`
- Datum: `{{DATE}}`
- Testsystem: `{{TEST_SYSTEM}}`
- Betriebsart: `[ ] online  [ ] offline`
- Testprofil: `[ ] leer  [ ] normal  [ ] Stress-Test  [ ] anderes`

## Fehlerklasse
- `[ ] 1 – Darstellung`
- `[ ] 2 – Funktion`
- `[ ] 3 – Datenrisiko / FREIGABE BLOCKIERT`
- `[ ] 4 – Release-Blocker / FREIGABE BLOCKIERT`

## Symptom
{{SYMPTOM}}

## Reproduktion
1. {{STEP_1}}
2. {{STEP_2}}
3. {{STEP_3}}

## Betroffene Ebene
- `[ ] Quellstand`
- `[ ] Build/Paketierung`
- `[ ] Installer`
- `[ ] Desktop-Runtime`
- `[ ] Datenhaltung`
- `[ ] Migration`
- `[ ] PDF`
- `[ ] Excel`
- `[ ] Cache/Service Worker aus Entwicklungsstufe`
- `[ ] Käufer-/Übergabeseite`
- `[ ] unbekannt`

## Datensicherung vor Reparatur
- JSON/Testbestand gesichert: `{{YES_NO_NA}}`
- Sicherungsreferenz: `{{BACKUP_REFERENCE}}`

## Diagnose
{{DIAGNOSIS}}

## Nicht erfolgreiche Ansätze
{{FAILED_ATTEMPTS}}

## Ursache
{{ROOT_CAUSE}}

## Korrektur
{{FIX}}

## Regressionstest
{{REGRESSION_TEST}}

## Ergebnis
- `[ ] behoben`
- `[ ] teilweise behoben`
- `[ ] offen`
- `[ ] Rollback erforderlich`

## Rollback-Referenz
{{ROLLBACK_REFERENCE}}

## Master-Erkenntnis
Ist daraus eine allgemeine Erkenntnis für zukünftige Produkte entstanden?

{{MASTER_LEARNING}}

`Keine persönlichen Echtdaten in dieses Protokoll eintragen.`
