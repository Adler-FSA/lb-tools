# 06 – Dateinamen, Cache und Versionierung

## Dateinamen sind Teil der Benutzerführung

Jede erzeugte Datei benötigt einen verständlichen Namen. Sichtbare UUIDs oder zufällige Buchstaben-/Zahlenfolgen sind zu vermeiden.

Ein Dateiname soll erkennen lassen:
- Produkt
- Demo oder Echtmodus
- Person/Datensatz
- Dateityp bzw. Zweck
- Datum
- Uhrzeit

Beispiele:
- `DEMO-Notfallakte-Daniel-Muster-Sicherung-2026-08-13-1443.json`
- `DEMO-Notfallakte-Daniel-Muster-Uebersicht-2026-08-13-1443.xlsx`
- `DEMO-Notfallakte-Daniel-Muster-2026-08-13-1443.pdf`

Der Dateiname wird vor oder direkt nach der Erzeugung sichtbar in der Anwendung gezeigt.

## Cache-Busting

Ein Versionsparameter nur an `index.html` reicht nicht, wenn ausgelagerte JavaScript-Dateien separat im Browsercache liegen.

Standard:
- Kernskripte mit eigener Versionskennung laden
- bei einer Engine-Änderung die Referenz auf diese Engine ebenfalls aktualisieren
- Browser dürfen nicht unbemerkt eine alte Engine weiterverwenden

Prinzip:

`pdf-core.js?v=<version>`

`pdf-document-export.js?v=<version>`

Das gilt ebenso für andere ausgelagerte Kernmodule.

## Engine-Versionierung

Jede Kernengine erhält eine erkennbare Versionskennung.

Beispiele aus dem Entwicklungsprinzip:
- Workflow-/V08-Logik
- PDF-Core
- PDF-Dokument-Engine
- Stress-Test-Datensatz

## Regressionsschutz

Bewährte Kernstände werden als Referenz dokumentiert. Bei späteren Änderungen muss geprüft werden, ob ein Update versehentlich einen älteren Kernstand zurückbringt.

Regel:
- Engine-Version und zugehörige Schutz-/Prüflogik gemeinsam aktualisieren
- nach Änderungen Browsercache und Deploy-Stand prüfen
- erst danach Abnahme

## Erkenntnis aus der Notfallakte

Mehrere scheinbar „wiederkehrende“ Dateinamen- und PDF-Fehler waren keine neuen Fachfehler, sondern alte Scriptstände, die nach Updates oder aus Browsercache wieder aktiv wurden. Deshalb gehören Cache- und Versionskontrolle künftig zum Standard-Build und nicht erst zur Fehlersuche.