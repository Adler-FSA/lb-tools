# 01 – Referenz-Inventar

## Referenz Nr. 1
**Meine digitale & finanzielle Notfallakte – Windows Desktop-Version**

Dieses Inventar beschreibt die Bausteine, aus denen das funktionierende Referenzprodukt entstanden ist. Die Referenz selbst wird nicht verändert.

## Produktkern und Engines
Aus dem freigegebenen Web-/Offline-Produktkern wurden für den Windows-Build insbesondere folgende Bestandteile übernommen:

- `index.html`
- `demo-stress-test.js`
- `pdf-core.js`
- `pdf-core-canonical.js`
- `pdf-document-export-v3.js`
- `pdf-document-export.js`
- `pdf-pagination-v08.js`
- `v08-final.js`

Die Liste ist Referenz für die tatsächliche Build-Zusammenstellung der Notfallakte. Bei neuen Produkten müssen Dateinamen und produktspezifische Module bewusst neu bestimmt werden; die funktionalen Rollen bleiben jedoch Teil des Masters.

## Windows-Schicht
Referenzpfad:
`desktop/notfallakte-windows/`

Wesentliche Komponenten:
- `main.js` – Electron-Hauptprozess und eigener Anwendungsbereich
- `desktop-ux.js` – Desktop-spezifische Benutzertexte/Anpassungen
- `package.json` – Electron-/Builder-/NSIS-Konfiguration
- `app/` – während des Builds zusammengestellter freigegebener Produktkern

## Build-Workflow
Referenz:
`.github/workflows/build-notfallakte-windows-installer.yml`

Buildkette:
1. Repository auschecken
2. Node.js einrichten
3. freigegebenen Produktkern in das Desktop-Paket kopieren
4. Abhängigkeiten installieren
5. `electron-builder` ausführen
6. NSIS-x64-Installer erzeugen
7. Setup als GitHub-Build-Artefakt sichern
8. Setup in den Käufer-Auslieferungsordner übernehmen

Die Windows-EXE wird damit reproduzierbar gebaut und nicht manuell aus Einzeldateien zusammengestellt.

## Käufer-Auslieferung
Referenzpfad:
`pages/notfallakte-desktop-download/`

Bestandteile:
- `begleitung.html` – Produkt-, Sinn- und Nutzenbegleitung
- `index.html` – eigentliche Produktübergabe und Installationsführung
- Produktbild – visueller Einstieg und Verkaufsmedium
- `Meine-Notfallakte-Setup.exe` – fertiger Windows-Installer

## Begleitseite – Funktionsstandard
1. Produktbild als visueller Einstieg
2. Problem/Sinn des Produkts
3. Nutzen und Orientierung
4. typische Einsatzsituationen
5. Leistungsverständnis
6. Sicherheits-/Datensouveränitätsprinzip
7. Einstieg ohne Überforderung
8. Call-to-Action zur Produktübergabe

## Übergabeseite – Funktionsstandard
1. Käufer begrüßen
2. Setup eindeutig anbieten
3. erklären, was eingerichtet wird
4. Download und Setupstart erklären
5. Windows-SmartScreen erklären
6. Virenschutz-Prüfung einordnen
7. Installer-Schritte verständlich führen
8. ersten Start erklären
9. Offline-Nutzung erklären
10. lokale Datenführung erklären
11. JSON-Master-Sicherung erklären
12. typische Fragen über Klappbereiche beantworten

## Daten-/Sicherungsprinzip
Das Referenzprodukt verwendet lokale Arbeitsdaten und eine vollständige transportable JSON-Master-Sicherung. PDF und Excel sind zusätzliche Dokument-/Kontrollausgaben und ersetzen die Master-Sicherung nicht.

## PDF-Engine
Die PDF-Funktion ist eine eigenständige Produktengine. Sie umfasst nicht nur „Drucken“, sondern professionelle Dokumenterzeugung einschließlich A4-Seitenlogik, Pagination, Seitenzahlen, Fortsetzungen, langen Inhalten, Abschlusslogik und Belastungstest.

## Demo-System
Die Demo erfüllt zwei Rollen:
- Lern-/Orientierungssystem für Käufer
- technischer Stress-/Belastungstest für Ausgabe und Datenverarbeitung

## Referenz-Abnahme
Der reale Entwicklungs- und Abnahmeweg umfasste insbesondere:
- Installation auf Windows
- SmartScreen-/„Unbekannter Herausgeber“-Situation
- Prüfung durch Virenschutz/Norton
- Start über Desktop-Verknüpfung
- Betrieb bei ausgeschaltetem WLAN
- Eingaben und erneuter Start
- Erhalt der eingegebenen Daten
- Unabhängigkeit von normalen Browserdaten
- Sicherung/Export
- Update/Neuinstallation über den bestehenden Stand mit Erhalt des vorgesehenen Datenbestands

Diese realen Tests bilden die Grundlage für die spätere verbindliche Master-Abnahmematrix.