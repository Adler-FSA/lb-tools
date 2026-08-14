# FSA Windows Desktop – Release-Manifest

## Produkt
- Produktname: `{{PRODUCT_NAME}}`
- Version: `{{PRODUCT_VERSION}}`
- Release-Datum: `{{RELEASE_DATE}}`
- Status: `[ ] Kandidat  [ ] FREIGEGEBEN  [ ] zurückgezogen`

## Quellstand
- Produktkern Commit SHA: `{{PRODUCT_COMMIT_SHA}}`
- Desktop-/Build Commit SHA: `{{DESKTOP_COMMIT_SHA}}`
- Release-Branch/Tag: `{{RELEASE_REF}}`

## Windows-Paket
- Setup-Datei: `{{SETUP_FILENAME}}`
- App-ID: `{{APP_ID}}`
- Produkt-/Shortcut-Name: `{{PRODUCT_APP_NAME}}`
- userData-Verzeichnis: `{{USER_DATA_DIR}}`
- Architektur: `x64`
- Installer: `NSIS`
- Codesignatur: `{{CODE_SIGNING_STATUS}}`

## Daten
- LocalStorage-Key/Namespace: `{{STORAGE_NAMESPACE}}`
- IndexedDB: `{{INDEXED_DB_NAME}}`
- JSON-Backup-Schema: `{{BACKUP_SCHEMA_VERSION}}`
- Datenmigration: `{{DATA_MIGRATION_VERSION_OR_NONE}}`

## Engines
- PDF-Core: `{{PDF_CORE_VERSION_OR_NONE}}`
- PDF-Pagination: `{{PDF_PAGINATION_VERSION_OR_NONE}}`
- PDF-Writer/Renderer: `{{PDF_WRITER_VERSION_OR_NONE}}`
- Excel-Engine: `{{EXCEL_ENGINE_VERSION_OR_NONE}}`
- Daten-/Backup-Engine: `{{DATA_ENGINE_VERSION}}`

## Abnahme
- Testsystem Windows: `{{WINDOWS_TEST_SYSTEM}}`
- Neuinstallation getestet: `{{DATE_OR_NO}}`
- Offline/WLAN-aus getestet: `{{DATE_OR_NO}}`
- Persistenz nach Neustart getestet: `{{DATE_OR_NO}}`
- JSON Export/Restore getestet: `{{DATE_OR_NO}}`
- PDF-Stresstest: `{{DATE_OR_NO_OR_NA}}`
- Excel Export/Import: `{{DATE_OR_NO_OR_NA}}`
- Update getestet von Version: `{{FROM_VERSION_OR_NA}}`
- Update-Testdatum: `{{DATE_OR_NA}}`
- Gesamtabnahme nach `04-abnahme-testmatrix.md`: `{{DATE}}`

## Käuferweg
- Produkt-/Begleitseite: `{{COMPANION_PAGE_PATH}}`
- Produkt-Übergabeseite: `{{HANDOVER_PAGE_PATH}}`
- Setup-Downloadpfad: `{{DELIVERY_PATH}}`
- Produktbild/Cover: `{{PRODUCT_IMAGE_PATH}}`
- Shoptext-Version/Stand: `{{SHOP_COPY_REF}}`
- KI-Sprechertext-Version/Stand: `{{VIDEO_SCRIPT_REF}}`

## Bekannte Einschränkungen
{{KNOWN_LIMITATIONS}}

## Änderungen gegenüber Vorversion
{{CHANGELOG}}

## Rollback-Punkt
- letzter nachweislich stabiler Stand: `{{ROLLBACK_REF}}`
- zugehörige Setup-Datei: `{{ROLLBACK_SETUP}}`

## Freigabe
- geprüft durch: `{{TESTED_BY}}`
- freigegeben durch: `{{APPROVED_BY}}`
- Freigabedatum: `{{APPROVAL_DATE}}`

### Schlussstatus
`[ ] NICHT FREIGEGEBEN`

`[ ] FREIGEGEBEN`

Nach Freigabe darf dieses Manifest nicht stillschweigend auf einen anderen technischen Stand umgedeutet werden. Änderungen erzeugen einen neuen Versions-/Release-Stand.
