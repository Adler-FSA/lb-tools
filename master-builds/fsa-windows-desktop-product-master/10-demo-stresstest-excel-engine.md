# 10 – Demo-, Belastungstest- und Excel-Engine

## Referenz
Untersucht wurden:
- `pages/notfallakte-offline-installation/demo-stress-test.js`
- Excel-Funktionen in `pages/notfallakte-offline-installation/v08-final.js`

Die fertige Notfallakte bleibt unverändert.

## A. Demo als Produktbestandteil
Die Daniel-Muster-Demo ist nicht nur Beispielinhalt. Sie erfüllt drei technische Aufgaben:
1. verständliche Produktvorführung,
2. gefahrloses Sicherungs-/Wiederherstellungstraining,
3. Ausgangspunkt für Belastungstests.

Master-Regel: Bei komplexen Offline-Produkten wird eine Demo als eigener, vom persönlichen State isolierter Modus geplant.

## B. Belastungstest
`demo-stress-test.js` erweitert die Demo absichtlich auf große Datenmengen. Im Referenzstand werden u. a. erzeugt:
- 10 Projekte
- 15 Projektzugänge
- 8 Geräte
- 10 Bankkonten
- 20 Wallets
- 100 digitale Dienste/Webseiten
- 20 Ansprechpartner
- 30 Verträge
- 12 offene Themen
- zusätzlicher Langtext

Damit wird nicht nur die Bildschirmansicht getestet. Der Testdatensatz belastet dieselbe Datenbasis, die anschließend JSON, Excel und PDF verarbeitet.

### Master-Prinzip
Ein Belastungstest darf keine separaten Fantasie-Datenwege benutzen. Er muss den normalen Produkt-State mit ausschließlich fiktiven Daten füllen, damit die echten Export-/Render-/Backup-Wege geprüft werden.

## C. Excel ist nicht die Master-Sicherung
Im Referenzprodukt ist die Rollenverteilung eindeutig:
- JSON = vollständige Master-Sicherung
- Excel = Übersicht und strukturierte Datenübernahme
- PDF = lesbare Endfassung

Diese Trennung wird Master-Standard.

## D. Excel-Erzeugung
Die Referenz baut `.xlsx` lokal im Browser ohne externe Bibliothek auf. Technisch werden die notwendigen XML-Dateien des XLSX-Containers erzeugt und als ZIP-Struktur verpackt.

Enthalten sind u. a.:
- Workbook
- Worksheet XML je Datenbereich
- Relationships
- Content Types
- Styles

Damit bleibt die Excel-Erzeugung offlinefähig und ohne CDN-/Bibliotheksabhängigkeit.

## E. Excel-Vorschau vor Speicherung
Vor dem eigentlichen Dateispeichern zeigt V08 eine Vorschau aus derselben Datenquelle, aus der anschließend die XLSX-Datei gebaut wird.

Die Vorschau enthält:
- Dateiname
- Anzahl der Datensätze je Bereich
- Tabs je Tabellenblatt
- tabellarische Darstellung
- Rücksprung zum entsprechenden Produktbereich zum Bearbeiten
- expliziten Button zum Speichern

Master-Regel: Bei strukturierten Exporten wird – wenn fachlich sinnvoll – vor dem Speichern eine prüfbare Vorschau angeboten.

## F. Excel-Import
Der Referenzimport ist kein blindes Überschreiben.

Ablauf:
1. XLSX lokal lesen und entpacken
2. Tabellenblätter erkennen
3. Zielbereich vorschlagen
4. Spaltenzuordnung vorschlagen
5. Nutzer kann Zuordnungen ändern
6. Import-Vorschau erzeugen
7. Datensätze als neu / möglicher Treffer / sehr wahrscheinlicher Treffer klassifizieren
8. je Zeile Entscheidung: neu, aktualisieren oder überspringen
9. vor Import auf JSON-Master-Sicherung hinweisen
10. Import erst nach ausdrücklicher Bestätigung ausführen
11. Importbericht erzeugen
12. persönlichen Vorzustand als Undo-Punkt sichern
13. Backup-Hash invalidieren, weil sich Daten geändert haben

## G. Duplikat-/Konfliktlogik
Die Referenz verwendet je Datenart unterschiedliche starke und mögliche Schlüssel.

Beispiele:
- Bank: IBAN stark; Bank + Bezeichnung möglich
- Wallet: Adresse (+ Netzwerk) stark; Bezeichnung möglich
- Vertrag: Vertragsnummer stark; Anbieter + Typ möglich
- Kontakt: E-Mail oder Telefon stark; Name möglich
- Projektzugang: Projekt + Login stark; E-Mail möglich

Master-Erkenntnis: Duplikaterkennung ist fachlich und gehört in den Produktadapter. Eine Universalregel wäre zu gefährlich.

## H. Import-Undo
Vor einem persönlichen Excel-Import wird der vorherige State lokal als Wiederherstellungspunkt abgelegt. Dadurch kann ein Import zurückgenommen werden.

Das ist keine dauerhafte Sicherung und ersetzt JSON nicht. Es ist eine Transaktionssicherung für den unmittelbar vorherigen Import.

## I. Offline-Fähigkeit
Export und Import verwenden Browser-/Webplattform-Funktionen und lokal erzeugte Dateien. Für die Windows-Desktop-Version bedeutet das: keine externe Excel-API und kein Cloud-Dienst sind für den normalen Vorgang erforderlich.

## J. Zielarchitektur Master
Extrahiert werden:
- `demo-stress-adapter.template.js` – produktbezogene fiktive Massendaten
- `excel-master-engine.template.js` – XLSX-Grundtechnik
- `excel-product-adapter.template.js` – Tabellenblätter, Felder, Zuordnungen, Duplikatregeln

## K. Schutzregel
Die Vorlagen sind aus dem funktionierenden Referenzprodukt abgeleitet, aber erst nach erfolgreichem Einsatz im ersten Folgeprodukt als universell freigegebene Engines zu kennzeichnen.