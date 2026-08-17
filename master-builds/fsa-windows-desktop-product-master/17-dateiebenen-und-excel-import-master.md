# 17 – Dateiebenen und vollständiger Excel-Import-Master

## 1. Zwei verschiedene Arten lokaler Daten
Bei allen Offline-Produkten müssen Käufer und Entwickler zwei Ebenen unterscheiden.

### Interne Arbeitsdaten
Das sind die Daten, mit denen die Anwendung laufend arbeitet.

Je nach Plattform liegen sie z. B. in:
- LocalStorage
- IndexedDB
- Electron-App-Kontext / userData
- Safari-/PWA-/Browser-Kontext

Sie werden von der Anwendung verwaltet und sind **keine bewusst abgelegte externe Sicherungsdatei**.

### Exportierte Dateien
Diese erzeugt der Nutzer bewusst:
- JSON = vollständige Master-Sicherung
- XLSX = strukturierte Übersicht/Datenübernahme
- PDF = lesbare Endfassung/Dokument

Diese Dateien liegen dort, wo der Nutzer sie speichert bzw. über den Plattform-Speicherweg ablegt.

## 2. Master-Merksatz
**Interner Speicher = Arbeiten. JSON = Sichern und Wiederherstellen. Excel = Kontrollieren und Daten übernehmen. PDF = Lesen, weitergeben oder aufbewahren.**

## 3. Warum diese Trennung wichtig ist
Eine Aussage wie „deine Daten sind lokal gespeichert“ darf nicht den Eindruck erzeugen, damit existiere automatisch eine externe Sicherung.

Geräteverlust, gelöschte App-/Browserdaten oder ein defektes Gerät können interne Arbeitsdaten unzugänglich machen. Die JSON-Master-Sicherung muss deshalb außerhalb des internen App-Kontexts bewusst abgelegt werden.

## 4. Käuferkommunikation
Begleit- und Übergabeseite sollen diese vier Ebenen verständlich erklären. Der Referenzstand nutzt bereits genau dieses Prinzip und erklärt plattformspezifische Speicherwege sowie den Gerätewechsel über JSON.

## 5. Excel-Import – Referenzablauf
Aus dem V08-Referenzprodukt wurden folgende Schritte als Masterprozess bestätigt:
1. XLSX/ZIP lokal lesen
2. Store- oder Deflate-Kompression verarbeiten
3. Workbook/Shared Strings/Worksheets lesen
4. Tabellenblätter erkennen
5. Zielbereich vorschlagen
6. Spaltenzuordnung vorschlagen
7. Nutzer kann Mapping korrigieren
8. Datenzeilen zunächst nur analysieren
9. Duplikate fachlich klassifizieren
10. Import-Vorschau anzeigen
11. je Zeile Add/Update/Skip entscheiden
12. vor persönlichem Import JSON-Master-Sicherung anbieten
13. Vorzustand als Undo-Snapshot halten
14. Import durchführen
15. Importbericht erzeugen
16. Sicherungsstatus als geändert markieren
17. Undo des letzten Imports ermöglichen

## 6. Duplikatklassifikation
Drei Klassen:
- `new` – kein Treffer
- `possible` – möglicher Treffer
- `conflict` – sehr wahrscheinlicher Treffer

Die Entscheidung, wodurch ein Treffer entsteht, bleibt produktspezifisch. Bankkonten brauchen andere Schlüssel als Kontakte, Wallets oder Verträge.

## 7. Neue Codevorlage
`templates/excel/excel-import-master.template.js`

Sie enthält jetzt generisch:
- XLSX-Unzip
- Deflate-Unterstützung über `DecompressionStream`
- Workbook-/Worksheet-Parsing
- Shared Strings
- automatische Sheet-Vorschläge
- automatische Feld-Vorschläge
- Mapping in Produktobjekte
- Duplikatklassifikation über Produktadapter
- Analyse/Vorschau-Datenmodell
- Add/Update/Skip-Ausführung
- Vorzustand für Undo
- Importbericht
- Undo-Schnittstelle

## 8. Bewusst im Produktadapter
Nicht universalisiert werden:
- fachliche Tabellenbereiche
- Feldnamen
- Aliasnamen
- Duplikatregeln
- konkrete State-Mutation
- UI-Texte/Modals
- Persistenz nach Import
- Backup-Hash-Invalidierung

Diese Punkte hängen vom Produkt ab.

## 9. Sicherheitsregel
Excel-Import darf persönliche Daten nicht schon während Mapping oder Vorschau verändern. Mutation erfolgt erst nach ausdrücklicher Importentscheidung.

Vor einem Import in einen wichtigen persönlichen Bestand soll eine aktuelle JSON-Master-Sicherung angeboten werden.

## 10. Undo-Grenze
Import-Undo ist eine Transaktionshilfe, keine dauerhafte Sicherung. Änderungen nach dem Import können beim Undo ebenfalls verloren gehen. Deshalb bleibt JSON die maßgebliche Sicherung.

## 11. Abnahme des Import-Masters
Beim ersten Folgeprodukt testen:
- eigene exportierte XLSX wieder einlesen
- fremde XLSX mit anderen Blattnamen
- andere Spaltenreihenfolge
- zusätzliche unbekannte Spalten
- leere Zellen
- Shared Strings
- Inline Strings
- Store-Kompression
- Deflate-Kompression
- neue Datensätze
- mögliche Treffer
- starke Treffer
- Add
- Update
- Skip
- Undo
- Importbericht
- große Datei/Stress-Test
- ungültige XLSX
- geschützte/spezielle XLSX mit verständlicher Fehlermeldung

Erst danach wird die generische Importengine als universell freigegeben.

## 12. Auditstatus
Mit diesem Kapitel sind die ursprünglichen Audit-Lücken
- **9 – interne Arbeitsdaten vs. exportierte Dateien**
- **11 – vollständiger Excel-Import-Mastercode**

inhaltlich bzw. technisch geschlossen. Die generische Codevorlage bleibt bis zum ersten Folgeprodukt im Status **extrahiert, noch zu validieren**.
