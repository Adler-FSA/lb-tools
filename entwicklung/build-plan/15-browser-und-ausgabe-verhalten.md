# 15 – Browser- und Ausgabeverhalten

## Ausgangspunkt

Die Notfallakte wurde auf iPad mit Safari, Firefox und Brave geprüft. Daraus ergeben sich verbindliche Regeln für zukünftige Dateiausgaben.

## JSON und Excel

- Datei wird lokal erzeugt
- verständlicher Dateiname wird vorab festgelegt
- Nutzer erhält sichtbare Bestätigung
- Browser/OS übernimmt anschließend nur den Speicherort

## PDF

PDF ist ein eigener Dokumenttyp und wird nicht über den Browser-Druckdialog erzeugt.

Ablauf:
1. PDF lokal vollständig erzeugen
2. Erfolg sichtbar bestätigen
3. Dateiname und Seitenzahl anzeigen
4. separaten Button `PDF herunterladen / speichern` anzeigen
5. erst der zweite Nutzer-Klick startet den Download

## Warum zwei Schritte?

Auf iPadOS erwies sich ein automatisch ausgelöster Datei-/Teilen-Vorgang nach längerer asynchroner PDF-Erzeugung als unzuverlässig. Der separate zweite Nutzer-Klick ist robuster und zugleich verständlicher.

## Browserregeln

- keine Dokumentlogik an Browser-Druckdialog koppeln
- keine Browser-URL als Dokumentfußzeile
- Dateiname von der Anwendung vorgeben
- ausgelagerte Engines mit eigener Versionskennung laden
- Safari, Firefox und Brave separat testen
- bei Fehlern zuerst unterscheiden: Engine-Fehler, Cache-Fehler oder Browserübergabe

## Ziel

Der Browser ist Transport- und Laufzeitumgebung. Die Anwendung selbst bestimmt Daten, Dokumentaufbau, Dateiname und Nutzerführung.