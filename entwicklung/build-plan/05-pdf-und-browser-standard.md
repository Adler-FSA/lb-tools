# 05 – PDF- und Browser-Standard

## Grundsatz

Die Anwendung erzeugt selbst ein fertiges PDF-Dokument. Die Webseite wird nicht einfach über den Browser gedruckt.

Dadurch bleiben Dokumentlayout, Seitenzahlen, Dateiname und Fußzeile unter Kontrolle der Anwendung.

## Dynamische Dokumentlogik

Die PDF-Ausgabe muss immer aus dem aktuellen Datenstand entstehen und darf nicht auf eine feste Demo optimiert sein.

Sie muss funktionieren bei:
- wenigen Datensätzen
- sehr langen Texten
- sehr vielen Wiederholungseinträgen
- beliebig vielen resultierenden Seiten

Die große Daniel-Muster-Demo dient als Referenz-Stresstest.

## Layout

- A4
- klare Titelhierarchie
- gut lesbare Grundschrift
- getrennte Datensatzblöcke
- eindeutige Abschnittsüberschriften
- kontrollierte Seitenumbrüche
- eigene Fußzeile
- Erstelldatum
- `Seite X von Y`
- eigener Abschlussbereich

## Zwei-Schritt-Ausgabe

### Schritt 1 – Erzeugen
Nutzer klickt `PDF erstellen`.

Die Anwendung baut die komplette PDF-Datei lokal auf.

Danach erscheint sichtbar:
- `PDF erfolgreich erstellt`
- Seitenzahl
- vollständiger Dateiname
- Button `PDF herunterladen / speichern`
- Button `Bestätigen`

### Schritt 2 – Herunterladen
Erst der zweite bewusste Nutzer-Klick startet den Download.

Diese Trennung hat sich auf iPadOS als deutlich robuster erwiesen als ein automatischer Download oder Teilen-Vorgang unmittelbar nach längerer PDF-Berechnung.

## Browser-Erkenntnisse

Getestete Zielumgebungen:
- Safari auf iPad/iPhone
- Firefox auf iPad/iPhone
- Brave auf iPad/iPhone
- Desktop-Browser auf Windows und macOS

Verbindliche Regeln:
- Browser-Druckdialog nicht als Dokument-Engine verwenden
- Dateidownload getrennt von der Erzeugung auslösen
- Dateiname direkt am Downloadobjekt hinterlegen
- Browser darf nicht über Layout oder Fußzeile entscheiden
- ausgelagerte PDF-Skripte versioniert laden

## Dateiname

Beispiel:

`DEMO-Notfallakte-Daniel-Muster-2026-08-13-1443.pdf`

Keine zufälligen Zeichenfolgen als sichtbarer Dateiname.