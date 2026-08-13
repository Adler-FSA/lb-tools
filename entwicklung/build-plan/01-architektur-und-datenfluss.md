# 01 – Architektur und Datenfluss

Stand: 13.08.2026

Dieser Standard wurde aus der finalen Notfallakte V08 abgeleitet und dient als technische Ausgangsbasis für künftige Softwarelösungen der Akademie.

## Grundmodell

Neue Anwendungen werden in klar getrennten Schichten gebaut:

1. **Oberfläche** – HTML/CSS, Karten, Bereiche, Klappreiter, Modale, Statusfelder.
2. **State** – ein zentrales Datenobjekt als gemeinsame Quelle aller Eingaben.
3. **Lokale Persistenz** – unmittelbarer Arbeitsstand auf dem Gerät.
4. **Sicherungs- und Austauschformate** – JSON, Excel, PDF.
5. **Ausgabe-Engines** – Dateierzeugung getrennt von der Oberfläche.
6. **Versionierung** – ausgelagerte Kernmodule werden versioniert und cache-sicher eingebunden.

## Datenfluss

`Eingabe → State → lokale Speicherung → sichtbare Bestätigung → Sicherungsstatus`

Exports greifen immer auf denselben aktuellen State zu:

`State → JSON`

`State → Excel-Vorschau → Excel-Datei`

`State → Dokumentstruktur → PDF-Engine → fertige PDF → separater Download`

Wiederherstellung:

`JSON-Datei → Formatprüfung → Modusprüfung → Bestätigung → State ersetzen → Oberfläche neu rendern → lokal speichern`

Excel-Datenübernahme:

`XLSX → Tabellenblätter → Bereichszuordnung → Spaltenzuordnung → Vorschau → Trefferprüfung → Nutzerentscheidung → Übernahme → Bericht`

## Engine-Prinzip

Komplexe Funktionen werden nicht in einem einzigen HTML-Skript versteckt. Die Notfallakte hat gezeigt, dass insbesondere PDF, Sicherung und Import als eigenständige Engines besser wartbar sind.

Beispielstruktur:

- Hauptlogik / Workflow
- PDF-Core
- PDF-Dokument-Engine
- Demo-/Stress-Test-Daten
- Export-/Import-Helfer

Eine Engine darf ausgetauscht werden, ohne den restlichen Datenbestand oder die Oberfläche neu zu bauen.

## Verbindliche Regel

Eine neue Software beginnt künftig mit diesem Architekturmodell. Projektspezifische Funktionen werden darauf aufgebaut, nicht anstelle davon.