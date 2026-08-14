# 11 – Vollständigkeits-Audit des Windows-Desktop-Masters

## Zweck
Dieser Audit gleicht den heutigen Master gegen den tatsächlichen Entwicklungsweg des Referenzprodukts ab. Er dient ausdrücklich dazu, Erkenntnisse zu finden, die beim reinen Rückbau des finalen Codes leicht verloren gehen.

Der Master ist bis zum Abschluss dieses Audits **noch nicht als Version 1.0 versiegelt**.

## Geprüfte Ebenen
1. finaler technischer Stand der Notfallakte
2. GitHub-Entwicklungshistorie und Commitfolge
3. bestehende Master-Dokumente 01–10
4. vorhandene Master-Templates
5. dokumentierte reale Geräte-/Offline-/Installations- und Persistenztests
6. Käuferübergabe, Begleitseite und Produktkommunikation

## Bereits vollständig oder weitgehend abgedeckt

### Windows-Desktop-Hülle
Vorhanden:
- Electron-Hülle
- eigener `userData`-Bereich
- NSIS-Installer
- Desktop-/Startmenü-Verknüpfung
- Build-Workflow
- Desktop-UX-Schicht

Status: **weitgehend abgedeckt**

### PDF
Vorhanden:
- Architekturkartierung
- Core/Writer/Pagination/Product-Adapter
- Stress-Test-Prinzip
- Abnahmekriterien

Status: **weitgehend abgedeckt**, generische Engine noch im ersten Folgeprodukt zu validieren.

### Daten und Sicherung
Vorhanden:
- LocalStorage
- IndexedDB-Spiegel
- JSON-Master-Sicherung
- Hash/Sicherungsstatus
- Restore
- Demo-/Eigene-Trennung
- Löschlogik

Status: **weitgehend abgedeckt**

### Excel
Vorhanden:
- Offline-XLSX-Grundtechnik
- Produktadapter
- Import-/Konflikt-/Undo-Prinzip dokumentiert

Status: **teilweise als Codevorlage extrahiert**. Der generische Import-Assistent mit Mapping, Konfliktentscheidung und Undo ist noch nicht als vollständige Master-Codeengine extrahiert.

### Demo und Stress-Test
Vorhanden:
- Demo als Lernsystem
- fiktive Massendaten
- Stress-Test-Adapter

Status: **abgedeckt**

### Käuferübergabe
Vorhanden:
- Trennung Begleitseite/Übergabeseite
- Produktbild
- Installationsführung
- Shop-/Video-/CTA-Prinzip in Testmatrix und Entwicklungsentscheidungen

Status: **inhaltlich abgedeckt**, aber noch keine wiederverwendbaren HTML-Seitenvorlagen im Template-Ordner.

---

# Neue Audit-Funde / noch zu schließende Lücken

## Lücke 1 – Referenz einfrieren und Entwicklungsklon
Die Historie zeigt einen entscheidenden Arbeitsstandard:
- funktionierenden Produktstand nicht direkt weiter umbauen
- isolierte Entwicklungskopie anlegen
- Referenz-/Reparaturdateien mitnehmen
- erst im Klon neue Offline-/Desktop-Auslieferung entwickeln

### Master-Maßnahme
Eigenes Kapitel und Checkliste `Referenz einfrieren → Entwicklungsklon → Test → Freigabe` ergänzen.

Status: **FEHLT als eigener verbindlicher Master-Prozess**

## Lücke 2 – Rollback- und geschützte Canonical-Stände
Die PDF-Historie enthält mehrfach:
- Protect
- Restore
- Canonical Core
- Redeploy

Das ist keine Nebensache. Bei komplexen Engines muss ein nachweislich funktionierender Stand schnell wiederherstellbar sein.

### Master-Maßnahme
Versionierungs-/Rollback-Standard definieren:
- letzter freigegebener Stand
- Entwicklungsstand
- Canonical/Protected Engine
- Rückkehrverfahren
- keine Überschreibung geschützter Engine durch Hilfsworkflow

Status: **TEILWEISE dokumentiert, aber noch nicht vollständig als Release-/Rollback-Prozess**

## Lücke 3 – Cache- und Script-Wiring-Strategie
Die Historie zeigt mehrfach Cache-Key-Refresh und Reparaturen am Script-Wiring. Gerade bei Browser/PWA-Vorstufen konnte alter JavaScript-Code weiterlaufen, obwohl GitHub bereits aktualisiert war.

### Master-Maßnahme
Für webbasierte Entwicklungs-/Teststufen verbindlich dokumentieren:
- Versionsparameter/Dateiversionierung
- Lade-Reihenfolge
- Versionskennung der Engine
- Prüfung, welche Runtime tatsächlich geladen ist
- Cache nicht mit Codefehler verwechseln

Für die finale Electron-Dateikopie ist dies weniger kritisch, bleibt aber für Entwicklung und Web-Referenz wichtig.

Status: **TEILWEISE vorhanden, muss in Master-Audit ergänzt werden**

## Lücke 4 – Verworfene Wege ausdrücklich dokumentieren
Historisch wurden mehrere Wege ausprobiert:
- ZIP + CMD
- PWA/Manifest/Service Worker als Windows-Auslieferungsansatz
- Browser-Druckfluss
- SVG/Canvas-PDF-Erzeugung
- Web-Share-PDF-Speicherung auf iPad

Einige davon waren Zwischenstufen oder führten zu Problemen.

### Master-Maßnahme
Eigenes Kapitel `Nicht wiederholen / verworfene Wege` mit Begründung. Wichtig: Ein verworfener Windows-Weg kann auf einer anderen Plattform weiterhin sinnvoll sein; deshalb keine pauschale technische Verbotsliste.

Status: **TEILWEISE in 02 vorhanden, aber noch nicht vollständig**

## Lücke 5 – Datenmigration zwischen Produktversionen
Die Testmatrix prüft Updates über bestehende Installation. Was noch fehlt, ist ein formaler Daten-Schema-Migrationsmechanismus für den Fall, dass ein Folgeprodukt später seine State-Struktur ändert.

### Master-Maßnahme
Definieren:
- `dataSchemaVersion`
- Migration `v1 → v2 → v3`
- niemals alte Daten ungeprüft überschreiben
- vor Migration Master-Sicherung empfehlen/erzeugen
- Migration mit Testdaten alter Version prüfen

Status: **FEHLT**

## Lücke 6 – Installer-/App-Version und Release-Metadaten
Das Referenzpaket besitzt eine Version, aber der Master braucht einen verbindlichen Releasezusammenhang zwischen:
- Produktversion
- Daten-Schema-Version
- PDF-Engine-Version
- Setup-Datei
- Git-Commit/Tag
- Abnahmedatum

### Master-Maßnahme
Release-Manifest je Produkt einführen.

Status: **FEHLT als eigener Standard**

## Lücke 7 – Deinstallation
Neuinstallation und Update sind in der Testmatrix enthalten. Nicht ausreichend beschrieben ist:
- Was passiert bei Deinstallation?
- Bleibt `userData` erhalten oder wird es entfernt?
- Wie wird ein Käufer vor möglichem Datenverlust gewarnt?
- Wie erfolgt saubere Wiederherstellung nach Neuinstallation?

### Master-Maßnahme
Deinstallations-/Neuinstallationsregel plus Testfall ergänzen.

Status: **FEHLT**

## Lücke 8 – Wiederherstellung nach Geräteverlust
JSON-Restore ist technisch vorhanden. Es fehlt noch eine explizite Käufer-/Master-Journey:
`neuer Windows-PC → App installieren → JSON-Master-Sicherung einlesen → Arbeitsstand prüfen → neue Sicherung erzeugen`.

Status: **TECHNIK vorhanden, Prozessdarstellung fehlt**

## Lücke 9 – Export-/Datei-Speicherorte und Käuferverständnis
Bei einer Offline-App sind Anwendungsdaten und exportierte Dateien zwei verschiedene Dinge:
- interner Electron-Datenbereich
- vom Käufer gespeicherte JSON/PDF/XLSX-Dateien

### Master-Maßnahme
Diese Trennung als Standarderklärung in Übergabeseite und FAQ aufnehmen.

Status: **TEILWEISE vorhanden**

## Lücke 10 – Käuferseiten als echte Templates
Begleit- und Übergabeseite wurden als fester Produktstandard erkannt. Es fehlen aber neutrale wiederverwendbare HTML-Vorlagen.

### Master-Maßnahme
Später extrahieren:
- `product-introduction.template.html`
- `product-handoff-windows.template.html`

Status: **FEHLT als Codevorlage**

## Lücke 11 – Excel-Import-Mastercode
Die Referenz besitzt deutlich mehr Importlogik als die bisherige generische Excel-Writer-Vorlage.

### Master-Maßnahme
Separat extrahieren:
- XLSX Reader/Unzip
- Sheet-Auswahl
- Mapping
- Vorschau
- Duplicate Classification
- Row Action
- Import Undo
- Import Report

Status: **FEHLT als vollständige generische Codevorlage**

## Lücke 12 – Fehler- und Wiederanlaufstrategie
Die Entwicklungshistorie zeigt, dass Engines mehrfach geschützt und wiederhergestellt werden mussten. Der Master braucht daher nicht nur Tests, sondern ein Verfahren für fehlgeschlagene Releases.

### Master-Maßnahme
Definieren:
- Build fehlgeschlagen → kein Release
- Installation fehlgeschlagen → letzte Setup-Version behalten
- Regression nach Update → Rollback auf freigegebenen Stand
- Nutzerdaten nicht durch Code-Rollback ersetzen
- JSON-Sicherung getrennt von Programmversion behandeln

Status: **FEHLT als geschlossenes Verfahren**

## Lücke 13 – Plattformmatrix
Die Entwicklung hat Windows, iPad/iOS und Browser/PWA berührt. Manche Erkenntnisse gelten plattformübergreifend, andere nicht.

### Master-Maßnahme
Matrix einführen:
- Windows Desktop/Electron
- Browser/Web
- iPad/iOS PWA/Standalone
- gemeinsam nutzbarer Produktkern
- plattformspezifische Export-/Installationswege

Status: **TEILWEISE beschrieben, Matrix fehlt**

## Lücke 14 – Datenschutz-/Sicherheitsversprechen gegen Technik prüfen
Käufertexte müssen exakt dazu passen, was technisch passiert. Begriffe wie „lokal“, „offline“, „keine Cloud“ oder „bleibt auf dem Gerät“ dürfen nur verwendet werden, wenn alle relevanten Produktfunktionen dies tatsächlich einhalten.

### Master-Maßnahme
Vor Release technisches Truth-Check-Feld im Abnahmeprotokoll ergänzen.

Status: **in Testmatrix angelegt, aber als eigener Freigabeschritt sinnvoll**

---

# Zwischenfazit
Der Master ist bereits substanziell und bildet den Großteil der erarbeiteten Technik ab. Der Audit zeigt aber, dass noch mehrere wertvolle **Prozess- und Lebenszyklus-Erkenntnisse** fehlen. Besonders wichtig sind:

1. Referenz-/Klon-Standard
2. Rollback/Canonical/Protected Releases
3. Daten-Schema-Migration
4. Release-Manifest
5. Deinstallation und Wiederherstellung
6. Käuferseiten als Templates
7. vollständige Excel-Import-Engine
8. Plattformmatrix
9. Fehler-/Wiederanlaufstrategie
10. technischer Truth-Check der Käuferkommunikation

## Entscheidung
**Master 1.0 noch nicht versiegeln.**

Die gefundenen Lücken werden jetzt nacheinander geschlossen. Erst danach erfolgt ein zweiter Audit und die finale Master-Abnahme.