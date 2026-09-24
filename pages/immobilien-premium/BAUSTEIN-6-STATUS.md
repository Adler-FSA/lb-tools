# Baustein 6 — Status

Stand: 24.09.2026

## Status

Baustein 6 „PDF / Archiv / Komfort“ ist technisch abnahmebereit.

Baustein 5 bleibt fachlich und technisch eingefroren. An den Produktionskernen für Mietservice, Eigentümer-Check und Vermietungscheck wurden in Baustein 6 keine fachlichen Änderungen vorgenommen. Auf bestehenden Seiten wurde ausschließlich der zuvor gesperrte Navigationsweg „Dokumente & Hilfe“ freigeschaltet; die Rechen- und Fachlogik der Bausteine 3–5 bleibt unverändert.

## Verifizierter PDF-Master

Verbindliche Referenz ist die bereits freigegebene Hotel-PDF-Zentrale unter `pages/merchant-kompass/`.

Geprüfte Referenzen:
- `AKADEMIE_PDF_ZENTRALE_MASTER.md`
- `HOTEL_PDF_BAUSTEINPLAN.md`
- `PDF_MASTER_README.md`
- `hotel-pdf-uebergabe-test.html`
- `hotel-pdf-eigen-fix.js`
- `hotel-pdf-eigen.js`
- `akademie-pdf-uebergabe.js`

Die technische PDF-Satzgrundlage wurde aus `hotel-pdf-eigen.js` mit dem bei Integration gelesenen Git-Blob-SHA
`1c809c4225be063fd54455171567be2738a96675`
abgeleitet.

Baustein 6 verwendet:
- lokale A4-PDF-Erzeugung
- Helvetica / Helvetica-Bold und die bewährte WinAnsi-Behandlung
- keine Browser-Druckfunktion
- keine externe PDF-Bibliothek
- keinen externen PDF-Dienst
- die unveränderte gemeinsame `AkademiePdfUebergabe` für Speichern / Teilen / Dateiname

Die fertige PDF wird genau einmal erzeugt und als dieselbe Blob-Datei an die gemeinsame Übergabezentrale gereicht. PDF-Erzeugung allein erzeugt keinen Status „versendet“ oder „übergeben“.

## Produktionsmodule Baustein 6

- `assets/js/pdf-master-core.js`
- `assets/js/document-workflow.js`
- `assets/js/document-sources.js`
- `assets/js/document-pdf.js`
- `assets/js/annual-rollover.js`
- `assets/js/document-template-routes.js`
- `assets/js/document-template-ui.js`
- `assets/js/pdf-zentrale-ui.js`
- `assets/js/archiv-ui.js`
- `assets/js/einstellungen-ui.js`
- `assets/js/hilfe-ui.js`
- `assets/css/document.css`

## Seiten

### Akademie-PDF-Zentrale
`pdf-zentrale.html`

Ablauf:
1. Quelle auswählen.
2. Eigene Prüffassung / Snapshot anlegen.
3. Snapshot in eigener HTML-Dokumentvorschau prüfen.
4. Datenstand ausdrücklich freigeben.
5. PDF ausschließlich aus der freigegebenen Fassung erzeugen.
6. Fertige PDF an die gemeinsame Akademie-PDF-Zentrale übergeben.

Eine Freigabe fixiert den Datenstand. Sie behauptet ausdrücklich keine automatische juristische Freigabe.

### Dokumentarchiv
`archiv.html`

Enthält:
- Dokumenttyp
- Version
- Snapshot
- Erstelldatum
- Freigabedatum
- Snapshot-Hash
- tatsächliche Übergabevermerke

Eine tatsächliche Übergabe wird als separater `document_delivery`-Eintrag geführt. Das freigegebene Dokument wird dadurch nicht verändert.

PDF-Dateien selbst werden nicht als dauerhaft im Browser gespeichert behauptet. Eine PDF kann aus dem unveränderlichen Snapshot erneut erzeugt werden.

### Sicherung & Jahreswechsel
`einstellungen.html`

Verwendet die vorhandene Speicher- und Backup-Engine:
- versionierte JSON-Sicherung
- Backup-Vorschau vor Restore
- ausdrückliche Ersetzungsbestätigung
- bestehende Recovery-Kopie vor Wiederherstellung
- transparente Kennzeichnung, dass PDF-/Anhangsdateien nicht Bestandteil der JSON-Sicherung sind

Jahreswechsel:
- erzeugt nur eine neue Abrechnungsperiode
- Folgeperiode startet `unconfirmed`
- keine Kosten werden kopiert
- keine Zahlungen werden kopiert
- keine Messwerte oder Zähler werden kopiert
- keine Mietverhältnisse oder Vertragsbedingungen werden verändert
- vorhandene oder offene überlappende Folgeperiode sperrt den Vorgang

### Hilfe
`hilfe.html`

Erklärt:
- Prüffassung
- Snapshot-Freigabe
- PDF-Ausgabe
- tatsächliche Übergabe
- Backup-Grenzen
- Wärme-/CO₂-Sonderfälle

## Spezialisierte Dokumentvorlagen

Jeder unterstützte Dokumenttyp hat eine eigene HTML-Vorlage unter `dokumentvorlagen/`:

1. `eigentuemer-jahresuebersicht.html`
2. `betriebskostenabrechnung.html`
3. `mietvertragsentwurf.html`
4. `hausordnung.html`
5. `entsorgungsinformation.html`
6. `uebergabeprotokoll.html`
7. `mieter-serviceblatt.html`
8. `eigentuemer-sicherheitsuebersicht.html`
9. `vermietungs-checkliste.html`

Die Vorschauen lesen ausschließlich den gespeicherten Dokument-Snapshot. Sie lesen nicht erneut das Eingabe-Dashboard und verändern keine Projektdaten.

## Dokument-Snapshot und Versionierung

Eine Prüffassung speichert:
- Dokumenttyp
- Quellbezug
- Objekt-/Mietverhältnisbezug soweit anwendbar
- Snapshot
- Snapshot-Hash
- Versionsnummer
- Status `review`

Die bewusste Freigabe:
- prüft erneut den Snapshot-Hash
- setzt Status `released`
- speichert Freigabedatum
- lässt `legalApproval:false`
- lässt `pdfGenerated:false`, weil die Freigabe selbst noch keine PDF-Erzeugung ist

Korrekturen an einer freigegebenen Fassung erzeugen eine neue Version. Die alte freigegebene Fassung bleibt unverändert.

Die vorhandene Speicherschicht schützt freigegebene Dokumente zusätzlich gegen nachträgliches Ändern oder Löschen.

## Dokumentquellen

Unterstützt:
- Eigentümer-Jahresübersicht
- individuelle Standard-Betriebskostenabrechnung
- Mietvertragsentwurf
- Hausordnung
- Müll-/Entsorgungsinformation
- Ein-/Auszugsprotokoll
- Mieter-Serviceblatt
- Eigentümer-Sicherheits-/Pflichtenübersicht
- Vermietungs-Checkliste

### Eigentümer-Jahresübersicht

Die PDF-Freigabe ist an den bereits vorhandenen vollständigen Jahres-Readiness-Kern aus Baustein 3 gebunden.

Der Snapshot enthält:
- tatsächliche Gesamtkosten
- geprüften Eigentümeranteil nach Jahreskern
- Mieteranteile gesamt
- getrennte Versorgerzahlungen
- Kostenarten
- dokumentierten Verbrauch, soweit vorhanden
- Jahresvergleich, soweit vorhanden

Eine ungeklärte Jahresbasis sperrt die Dokumenterstellung.

### Mieter-Betriebskostenabrechnung

Der Standardpfad verwendet den vorhandenen, geprüften Vermieter-Rechenkern.

Wichtige Fail-Closed-Grenze:
Wenn im gewählten Jahr Heizung, Warmwasser, verbundene Anlage, CO₂ oder Heizöl vorkommen, wird **keine verkürzte Standard-PDF** erzeugt.

Grund:
Die in Baustein 4 bestätigten Spezialpläne werden bewusst nicht dauerhaft im Projekt gespeichert. Baustein 6 erfindet diese Angaben nicht neu und liest sie nicht aus einem Bildschirmzustand. Der Fachpfad muss für diese Fälle erneut geprüft werden.

## Datenschutz

- individuelle Mieterabrechnung enthält nur das ausgewählte Mietverhältnis
- Vermietungs-Checkliste enthält keine Bewerberantworten
- keine Nachweisdateien im Vermietungscheck
- kein Ranking
- kein Score
- keine automatische Mieterauswahl
- Übergaben und Dokumente bleiben getrennte Datensätze

## DE / EN und Ressourcen

Geprüft:
- `pdf-zentrale.html`: alle verwendeten `data-i18n`-Schlüssel DE/EN vorhanden
- `archiv.html`: alle verwendeten `data-i18n`-Schlüssel DE/EN vorhanden
- `einstellungen.html`: alle verwendeten `data-i18n`-Schlüssel DE/EN vorhanden
- `hilfe.html`: alle verwendeten `data-i18n`-Schlüssel DE/EN vorhanden
- 9/9 Dokumentvorlagen: verwendete DE/EN-Schlüssel vorhanden

Architekturprüfung:
- kein `window.print()`
- kein jsPDF
- kein pdf-lib
- kein html2canvas
- keine externe HTTP-/HTTPS-Laufzeitressource in den neuen Baustein-6-Dateien
- keine `<img>`-Icons in den Dokumentvorlagen
- Inline-SVGs für Seitenelemente
- relative Modulpfade gegen den tatsächlichen Repository-Baum geprüft

## JavaScript-Syntax und Importpfade

11/11 neue Produktions-JavaScript-Module im Abschlusslauf syntaktisch sauber.

Alle relativen Imports der neuen Module wurden gegen den aktuellen `main`-Repository-Baum geprüft und auf vorhandene Dateien aufgelöst.

## Feste Regressionen

Neu angelegte Baustein-6-Testdateien:

- `tests/pdf-master-core.test.mjs` — 3 Tests
- `tests/document-workflow.test.mjs` — 8 Tests
- `tests/annual-rollover.test.mjs` — 3 Tests
- `tests/document-sources.test.mjs` — 7 Tests
- `tests/baustein6-storage-integration.test.mjs` — 4 Tests
- `tests/document-pdf.test.mjs` — 5 Tests
- `tests/baustein6-ui-architecture.test.mjs` — 5 Tests

**Summe: 35 feste neue Regressionen.**

Diese 35 werden durch das bestehende `npm test`-Muster `node --test tests/*.test.mjs` automatisch Teil eines späteren vollständigen lokalen/CI-Laufs.

## In dieser Prüfengine tatsächlich ausgeführte gezielte Laufzeitchecks

Die neuen Kernpfade wurden direkt aus dem aktuellen GitHub-`main`-Quellstand ausgeführt.

Aktueller gezielter Laufzeitstand: **19/19 bestanden**.

Enthalten sind:
- echte PDF-Signatur / EOF des neuen Master-Kerns
- Dokumentquellen und Sonderfall-Sperre
- fünf PDF-Snapshot-Familien
- B6-Snapshot durch bestehendes Projektschema und bestehenden Speicher
- separater Übergabevermerk ohne Dokumentmutation
- Sperre nachträglicher Änderung freigegebener Snapshots
- Backup mit Snapshot, aber ohne behauptete PDF-/Anhangsdateien
- Jahreswechsel durch bestehendes Schema und Speicher
- offene Folgeperiode als Sperrfall
- Eigentümer-PDF mit geprüftem Eigentümeranteil, Verbrauch und Jahresvergleich
- Eigentümer-Readiness: positiver und blockierter Pfad

Zusätzlich wurden die statischen DE/EN-, Ressourcen-, Vorlagen-, Import- und Syntaxprüfungen erfolgreich ausgeführt.

## Bewusst nicht als bestanden behauptet

### Vollständiger `npm test`-Lauf

Ein vollständiger Checkout des Repositories konnte in der aktuellen Ausführungsumgebung nicht heruntergeladen werden. Es wird deshalb **nicht** behauptet, dass die 35 neuen Testdateien hier als kompletter Node-Testlauf 35/35 ausgeführt wurden.

Das ist Bestandteil der Gesamtabnahme in Baustein 7.

### HTTP-Live-Smoke

Die aktuelle Web-Prüfengine konnte die veröffentlichten URLs unter `tools.liquiditybooster.de` nicht abrufen. Das wird weder als Seitenfehler noch als bestandener Live-Smoke bewertet.

### Visuelle iPad-/Laptop-Abnahme

Eine abschließende Sichtprüfung der veröffentlichten Dokumentvorschauen und PDF-Ausgaben auf iPad/Laptop gehört zur Gesamtabnahme in Baustein 7.

## Vorheriger bestätigter Kernstand

Der bisher vollständig bestätigte Referenzstand aus den vorherigen Bausteinen bleibt **331/331**.

Die neuen Baustein-6-Checks werden bewusst nicht zu einer künstlichen Gesamtsumme addiert.

## Grenze zu Baustein 7

Baustein 7 bleibt reserviert für die Gesamtabnahme:
- vollständiger gemeinsamer Testlauf
- Rechenregressionen aller vorherigen Bausteine
- PDF-Konsistenz
- Dokument-/Vertragsfachprüfung
- Datenschutz
- DE/EN
- Laptop/iPad
- Live-Pfade
- keine Regression durch Baustein 6

Bis zur ausdrücklichen Freigabe „Baustein fertig“ wird Baustein 7 nicht begonnen.
