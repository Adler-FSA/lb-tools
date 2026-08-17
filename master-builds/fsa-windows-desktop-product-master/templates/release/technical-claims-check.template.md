# Technical Claims Check – Release

## Release
- Produkt: `{{PRODUCT_NAME}}`
- Version: `{{VERSION}}`
- Commit: `{{COMMIT_SHA}}`
- Setup/Deployment: `{{ARTIFACT}}`
- Prüftag: `{{DATE}}`

## Claims
| ID | Aussage | Plattform | Nachweis/Test | Ergebnis | freigegebener Wortlaut |
|---|---|---|---|---|---|
| C01 | Offline-Nutzung | Windows | {{TEST}} | {{PASS_FAIL_OPEN}} | {{WORDING}} |
| C02 | Offline-Nutzung | Apple | {{TEST}} | {{PASS_FAIL_OPEN}} | {{WORDING}} |
| C03 | lokale Arbeitsdaten | Windows | {{TEST}} | {{PASS_FAIL_OPEN}} | {{WORDING}} |
| C04 | lokale Arbeitsdaten | Apple | {{TEST}} | {{PASS_FAIL_OPEN}} | {{WORDING}} |
| C05 | JSON-Master-Sicherung | alle angebotenen Plattformen | {{TEST}} | {{PASS_FAIL_OPEN}} | {{WORDING}} |
| C06 | Gerätewechsel/Restore | {{PLATFORM}} | {{TEST}} | {{PASS_FAIL_OPEN}} | {{WORDING}} |
| C07 | PDF lokal | {{PLATFORM}} | {{TEST}} | {{PASS_FAIL_OPEN}} | {{WORDING}} |
| C08 | Excel lokal | {{PLATFORM}} | {{TEST}} | {{PASS_FAIL_OPEN}} | {{WORDING}} |

## Netzwerk-/Abhängigkeitsprüfung
- [ ] externe Skripte geprüft
- [ ] externe Styles/Fonts geprüft
- [ ] externe Bilder geprüft
- [ ] `fetch`/XHR/WebSocket/EventSource geprüft
- [ ] APIs geprüft
- [ ] Analytics/Telemetry geprüft
- [ ] Service Worker/Manifest geprüft, falls relevant
- [ ] Electron Remote Content geprüft, falls relevant

### Gefundene externe Referenzen
{{EXTERNAL_REFERENCES}}

### Klassifikation
{{REFERENCE_CLASSIFICATION}}

## Konsistenzprüfung
- [ ] Shoptext stimmt
- [ ] Produktbild/Claims stimmen
- [ ] Sprecher-/Verkaufstext stimmt
- [ ] Begleitseite stimmt
- [ ] Übergabeseite stimmt
- [ ] FAQ stimmt
- [ ] Anwendung stimmt

## Freigabe
- [ ] keine offenen oder falschen Kernclaims
- [ ] Einschränkungen sind sichtbar formuliert
- [ ] Plattformunterschiede sind korrekt beschrieben

**Status:** `{{APPROVED_BLOCKED}}`

**Freigabevermerk:** {{RELEASE_NOTE}}
