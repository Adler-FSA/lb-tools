# 06 – Technische Vorlagen

## Zweck
Dieses Kapitel beschreibt die im Master hinterlegten wiederverwendbaren technischen Dateien. Sie sind aus dem funktionierenden Windows-Referenzprodukt abgeleitet, aber bewusst produktneutralisiert.

## Vorlagenpfade

### Electron
`templates/electron/main.template.js`

`templates/electron/package.template.json`

`templates/electron/desktop-ux.template.js`

### GitHub Actions
`templates/github-actions/build-windows-installer.template.yml`

## Wichtige Regel
Die Vorlagen werden für ein neues Produkt **kopiert und produktspezifisch ausgefüllt**. Die Masterdateien selbst werden nicht für jedes neue Produkt überschrieben.

## Pflicht-Platzhalter
Vor einem ersten Build müssen mindestens folgende Werte eindeutig ersetzt werden:

- `{{PRODUCT_NAME}}`
- `{{PRODUCT_APP_NAME}}`
- `{{PRODUCT_WINDOW_TITLE}}`
- `{{PRODUCT_DESCRIPTION}}`
- `{{PACKAGE_NAME}}`
- `{{APP_ID}}`
- `{{PRODUCT_USER_DATA_DIR}}`
- `{{SHORTCUT_NAME}}`
- `{{SETUP_FILENAME}}`
- `{{BUILD_BRANCH}}`
- `{{DESKTOP_PATH}}`
- `{{PRODUCT_SOURCE_PATH}}`
- `{{PRODUCT_FILE_LIST}}`
- `{{WORKFLOW_FILENAME}}`
- `{{ARTIFACT_NAME}}`
- `{{DELIVERY_PATH}}`

## Eindeutigkeit ist Pflicht
Besonders kritisch sind:

### APP_ID
Muss pro Produkt eindeutig sein.

Beispielschema:
`de.liquiditybooster.<produkt-slug>`

### PRODUCT_USER_DATA_DIR
Muss pro Produkt eindeutig sein. Dieser Wert schützt davor, dass zwei installierte FSA-Produkte denselben lokalen Datenbereich verwenden.

Beispielschema:
`FSA-<ProduktSlug>-Desktop`

### PACKAGE_NAME
Technischer Paketname, klein geschrieben und ohne Leerzeichen.

### SETUP_FILENAME
Käuferfreundlicher stabiler Dateiname ohne Versionschaos, sofern der Releaseprozess nichts anderes verlangt.

## main.template.js
Die Vorlage übernimmt die bewährten Referenzprinzipien:
- eigener App-Name
- eigener `userData`-Pfad
- BrowserWindow
- Context Isolation
- Node Integration aus
- Sandbox an
- Laden des lokalen `app/index.html`
- optionale Desktop-UX nach erfolgreichem Laden
- externe HTTP/HTTPS-Links im Standardbrowser

Fenstergrößen sind Ausgangswerte und dürfen produktspezifisch angepasst werden, müssen anschließend aber erneut auf realen Windows-Systemen getestet werden.

## desktop-ux.template.js
Diese Datei ist bewusst minimal.

Sie soll ausschließlich Unterschiede der installierten Desktop-Version behandeln. Neue Produkte sollen stabile IDs oder `data-*`-Attribute im Produktkern bereitstellen, damit Desktop-Texte gezielt geändert werden können.

**Nicht verwenden:** pauschale Such-/Ersetzungslogik über beliebige sichtbare Texte. Das wäre fragil und könnte Inhalte unbeabsichtigt verändern.

## package.template.json
Die Vorlage übernimmt die funktionierende Referenzkonfiguration:
- Electron
- electron-builder
- ASAR
- NSIS
- x64
- geführter Installer statt One-Click
- Installationsordner wählbar
- Desktop-Verknüpfung
- Startmenü-Verknüpfung
- Start nach Abschluss
- deutsche Installer-Sprache

Versionsstände der Abhängigkeiten stammen aus dem Referenzprodukt. Bei einem neuen Produkt werden sie nicht blind aktualisiert. Ein Upgrade ist eine bewusste technische Änderung und benötigt vollständige Tests.

## Build-Workflow-Vorlage
Der Workflow übernimmt den erprobten Grundweg:

Repository → Windows Runner → Node 22 → freigegebene Dateien kopieren → npm install → electron-builder/NSIS → Artefakt → Auslieferungsordner.

Die Dateiliste `{{PRODUCT_FILE_LIST}}` wird bei jedem Produkt bewusst festgelegt. Dadurch wird verhindert, dass Entwicklungsreste oder nicht freigegebene Dateien automatisch in die Käufer-EXE gelangen.

## Codesignatur
Die Vorlage setzt entsprechend dem Referenzprodukt:
`CSC_IDENTITY_AUTO_DISCOVERY=false`

Damit wird nicht stillschweigend nach einer Signatur gesucht. Falls später für ein Produkt Codesignierung eingeführt wird, wird dies als eigener Master-Baustein entwickelt und getestet; die funktionierende unsignierte Referenz wird dadurch nicht rückwirkend verändert.

## PDF-Engine
Die PDF-Dateien werden an dieser Stelle noch **nicht als generische Codekopie** abgelegt. Grund: Der Referenzbestand enthält mehrere miteinander verdrahtete Entwicklungsstufen und produktspezifische Abhängigkeiten.

Für neue Produkte gilt zunächst:
1. kanonischen PDF-Core identifizieren
2. professionelle Dokument-/Layout-Engine identifizieren
3. produktspezifische Renderer/Inhalte davon trennen
4. erst danach wiederverwendbaren PDF-Code übernehmen
5. vollständige Regression gegen `04-abnahme-testmatrix.md`

Damit verhindern wir, dass eine scheinbar neutrale PDF-Vorlage versteckte Notfallakten-Abhängigkeiten in neue Produkte trägt.

## Nächster technischer Extraktionsschritt
Als eigener Folgeschritt wird die PDF-Engine detailliert kartiert:
- Core
- Canonical Core
- Pagination
- Layout V3
- Fallback/Altpfade
- produktspezifische Renderer
- Dateinamenlogik
- Abschlusslogik
- Stress-Test-Verknüpfung

Erst danach wird entschieden, welche PDF-Komponenten als echte Master-Codevorlagen abgelegt werden können.