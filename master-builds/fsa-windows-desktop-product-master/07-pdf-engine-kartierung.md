# 07 – PDF-Engine-Kartierung

## Zweck
Dieses Dokument kartiert die tatsächlich im Referenzprodukt vorhandene PDF-Technik, bevor daraus generische Master-Codebausteine extrahiert werden.

**Wichtig:** Die fertigen Referenzdateien werden nicht verändert. Die Kartierung beschreibt Rollen, Abhängigkeiten und produktspezifische Stellen.

---

## 1. Tatsächliche Build-Dateien
Der Windows-Build des Referenzprodukts übernimmt folgende PDF-bezogene Dateien:

- `pdf-core.js`
- `pdf-core-canonical.js`
- `pdf-document-export-v3.js`
- `pdf-document-export.js`
- `pdf-pagination-v08.js`
- zusätzlich `v08-final.js` und `demo-stress-test.js`, die für Aufbau/Test des druckbaren Produktzustands relevant sind

Damit ist die PDF-Lösung keine Einzeldatei, sondern eine Kette aus Vorbereitung/Pagination, Core/Orchestrierung, Renderer/PDF-Erzeugung und produktspezifischem Print-DOM.

## 2. Aktiver PDF-Core – `pdf-core.js`
Kennung: `FSA_PDF_CORE_V3`

Rolle:
- erzeugt den vorgesehenen Dateinamen
- unterscheidet Demo/echte Ausgabe
- setzt/verwaltet aktiven Dateinamen
- lädt die aktuelle Export-Engine dynamisch
- zeigt Fortschritt und Erfolg/Fehler in einer sichtbaren Aktionsbox
- erzeugt aus dem fertigen Blob eine lokale Download-URL
- bietet erst nach erfolgreicher Erzeugung den separaten Download an
- ersetzt im Referenzprodukt `window.print` durch echte lokale PDF-Erzeugung

Aktive Export-Abhängigkeit im finalen Core:
`FSA_PDF_DOCUMENT_EXPORT_V3` → `pdf-document-export-v3.js`

### Produktspezifische Stellen
Der Core ist noch nicht vollständig generisch. Enthalten sind unter anderem:
- `Notfallakte` im Dateinamen
- `NotfallaktePdfExport`
- `NotfallaktePdfCore`
- Zugriff auf `state.owner`
- Zugriff auf `demoMode`
- Button-ID `printBtn`
- Text „Notfallakte als PDF erstellen“
- Aktionsbox-IDs/Klassen mit `v08`
- Notfallakten-spezifische Nutzertexte

Diese Stellen müssen bei einer späteren Master-Extraktion parametrisiert werden.

## 3. Canonical Core – `pdf-core-canonical.js`
Kennung ebenfalls: `FSA_PDF_CORE_V3`

Die Datei bildet einen früheren/gesicherten Core-Stand ab und verweist noch auf:
`FSA_PDF_DOCUMENT_EXPORT_V2` → `pdf-document-export.js`

### Erkenntnis
`pdf-core-canonical.js` ist **nicht identisch mit dem final aktiven V3-Pfad**. Der Name „canonical“ darf deshalb im Master nicht automatisch mit „aktuellste Runtime-Datei“ gleichgesetzt werden.

### Master-Regel
Bei zukünftigen Engines müssen drei Begriffe getrennt dokumentiert werden:
1. freigegebener Runtime-Core
2. geschützter Referenz-/Canonical-Stand
3. zugehörige Renderer-Version

Versionskopplungen müssen explizit festgehalten werden.

## 4. Pagination – `pdf-pagination-v08.js`
Rolle:
- baut auf einer vorhandenen `window.buildPrint()`-Funktion des Produktkerns auf
- installiert definierte PDF-/A4-Stile
- entfernt eine ältere Engine `pdfEngineV07`, falls vorhanden
- baut `window.optimizePrint()`
- nimmt den bereits erzeugten Print-DOM als Quelle
- packt Inhalte browserübergreifend in A4-nahe Seitencontainer
- prüft die tatsächliche DOM-Höhe über `scrollHeight`
- erzeugt neue Seiten, wenn Inhalte nicht mehr passen
- behandelt Abschnitte, Records, Grids und Textbereiche unterschiedlich
- erzeugt „Fortsetzung“-Überschriften
- kann zu große Records bis auf einzelne Items zerlegen
- entfernt bedeutungslose/leere Seiten

### Zentrale technische Abhängigkeit
Pagination kennt die Print-DOM-Semantik des Referenzprodukts:
- `#printSheet`
- `.pPage`
- `.pPageInner`
- `.pSection`
- `.pSectionHead`
- `.pBody`
- `.pRecord`
- `.pRecordTitle`
- `.pGrid` / `.pGrid3`
- `.pItem`
- `.pMessage`
- `.pCallout`
- `.pSafety`

### Master-Erkenntnis
Die wiederverwendbare Einheit ist nicht nur JavaScript. Es gibt einen **PDF-DOM-Vertrag**. Neue Produkte müssen entweder diesen Vertrag erfüllen oder einen Adapter/Renderer erhalten.

## 5. Professioneller Renderer – `pdf-document-export-v3.js`
Kennung: `FSA_PDF_DOCUMENT_EXPORT_V3`

Rolle:
- erzeugt die PDF-Datei direkt lokal als Binärdaten/Blob
- verwendet keinen Browser-Druckdialog
- verwendet kein Canvas und kein SVG-foreignObject
- definiert A4 in PDF-Punkten
- rendert Text, Linien, Flächen und Boxen direkt in PDF-Content-Streams
- verwendet Helvetica/Helvetica-Bold mit WinAnsi-Encoding
- bricht Texte selbst um
- rendert strukturierte Records/Grids
- rendert Hinweise/Sicherheitsboxen
- rendert Kopfbereich
- rendert Abschnittsüberschriften
- rendert Abschluss-/Unterschriftsbereich
- rendert Fußzeile mit Datum und `Seite X von Y`
- erzeugt PDF-Objekte, Page Tree, Content Streams, xref und Trailer direkt
- liefert `{blob, filename, pages, bytes, version}` zurück

### Produktspezifische Stellen
V3 enthält weiterhin konkrete Notfallakten-/Akademie-Semantik:
- Default-Titel „Meine digitale & finanzielle Notfallakte“
- Default-Eyebrow „AKADEMIE FÜR FINANZIELLE SOUVERÄNITÄT“
- Footer „Akademie für finanzielle Souveränität · Persönliche Notfallvorsorge“
- Erkennung eines spezifischen Unterschrifts-/Abschlussblocks
- Sicherheits-Erkennung über Begriffe wie `Seed Phrase`, `Private Key`, `Sicherheit`
- globale Export-Schnittstelle `window.NotfallaktePdfExport`
- Fehlermeldung „Die Notfallakte enthält keine PDF-Seiten.“

### Master-Erkenntnis
Die V3-Datei besteht funktional aus zwei Schichten, die künftig getrennt werden sollten:

**Generisch:** PDF-Binärbau, Fonts, A4-Geometrie, Text-Wrapping, primitive Zeichenoperationen, Seitenbaum/xref, Fortschritt.

**Produktspezifisch:** Header, Footer, Farben/CI, Record-/Grid-Darstellung, Sicherheitshinweise, Abschlussblock, Titel und Texte.

## 6. V2-Renderer – `pdf-document-export.js`
Kennung: `FSA_PDF_DOCUMENT_EXPORT_V2`

Rolle:
Frühere direkte PDF-Erzeugung aus bereits paginierten Strukturen. Die Grundarchitektur ist bereits vorhanden, das Layout ist jedoch einfacher als V3.

V2 bleibt als Entwicklungsgeschichte wichtig, ist aber nicht der aktive finale Renderer des `pdf-core.js`.

### Master-Regel
Alte Renderer werden nicht in neue Produkte kopiert, nur weil sie noch im Referenz-Build liegen. Der Master dokumentiert sie als Entwicklungs-/Fallback-Historie.

## 7. Tatsächlicher Datenfluss der finalen PDF

1. Produktkern hält aktuelle Nutzerdaten.
2. `buildPrint()` erzeugt den produktspezifischen Print-DOM.
3. `pdf-pagination-v08.js` stellt `optimizePrint()` bereit und packt den Print-DOM in Seiten.
4. Nutzer startet PDF-Aktion.
5. `pdf-core.js` erzeugt Dateiname und Nutzerstatus.
6. Core lädt/verifiziert `pdf-document-export-v3.js` anhand der Versionskennung.
7. V3 ruft `optimizePrint()` auf.
8. V3 liest die fertigen `.pPage`-Strukturen.
9. V3 rendert jede Seite in einen PDF-Content-Stream.
10. V3 baut daraus eine echte PDF-Datei als Blob.
11. Core erzeugt eine lokale Object-URL.
12. Käufer erhält einen separaten Button zum Speichern der fertigen PDF.

## 8. Warum die Engine funktioniert
Die finale Lösung trennt drei schwierige Probleme:

### Problem A – Welche Inhalte gehören in die Ausgabe?
Gelöst im produktspezifischen `buildPrint()`.

### Problem B – Wie werden große/variable Inhalte auf Seiten verteilt?
Gelöst durch `pdf-pagination-v08.js` anhand realer DOM-Höhen und Fortsetzungslogik.

### Problem C – Wie entsteht eine echte PDF ohne Browser-Druckdialog?
Gelöst durch `pdf-document-export-v3.js` plus `pdf-core.js`.

Diese Trennung ist als Architekturprinzip wertvoller als das bloße Kopieren einzelner Dateien.

## 9. Was als Master-Code extrahiert werden kann
Nach dieser Kartierung sind folgende Kandidaten erkennbar:

### Sehr gut generisch extrahierbar
- PDF-Binär-/Objektbau
- A4-Geometrie
- Text-Encoding/WinAnsi-Fallback
- Text-Wrapping
- primitive Zeichenfunktionen
- Blob-Erzeugung
- Fortschritts-Callback
- Object-URL-/Downloadprinzip

### Mit DOM-Vertrag extrahierbar
- Pagination
- Fortsetzungslogik
- leere Seiten entfernen
- Record-/Item-Splitting

### Muss parametrisiert werden
- Dateinamen
- globale Namespace-Namen
- Produktname
- Eigentümer-/Dateinamensquelle
- Demo-Erkennung
- Header/Footer
- CI/Farben
- Sicherheitsbox-Regeln
- Abschluss-/Unterschriftslogik
- Nutzertexte
- Button-/DOM-IDs

### Produktspezifisch belassen
- `buildPrint()` und die konkrete Auswahl/Anordnung der fachlichen Produktdaten
- besondere fachliche Dokumentblöcke

## 10. Zielarchitektur für die Master-PDF-Engine
Die nächste generische Generation soll konzeptionell aus vier Bausteinen bestehen:

### `pdf-master-core`
Orchestrierung, Dateiname, Status, Engine-Laden, Blob/Download.

### `pdf-master-pagination`
Seitenbildung auf Basis eines dokumentierten Print-DOM-Vertrags.

### `pdf-master-writer`
Generische PDF-Dateierzeugung: A4, Fonts, Streams, Objekte, xref, Blob.

### `pdf-product-adapter`
Produktspezifische Konfiguration:
- Produktname
- CI
- Header/Footer
- Dateinamenlogik
- Demo/Owner
- besondere Renderer
- Texte

Damit kann die erarbeitete PDF-Technik wiederverwendet werden, ohne Notfallakten-Inhalte in jedes neue Produkt zu übernehmen.

## 11. Schutzregel
Die oben beschriebene Zielarchitektur wird **nicht rückwirkend in die fertige Notfallakte eingebaut**. Sie wird ausschließlich als Master für neue Produkte entwickelt. Das Referenzprodukt bleibt unverändert.

## 12. Nächster Schritt
Auf Basis dieser Kartierung können jetzt produktneutrale PDF-Mastervorlagen erstellt werden. Vor ihrer Verwendung in einem Käuferprodukt müssen sie jedoch einmal in einem neuen Produkt gegen die vollständige PDF-Abnahmematrix getestet werden.