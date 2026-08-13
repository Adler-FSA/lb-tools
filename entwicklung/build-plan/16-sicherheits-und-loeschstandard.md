# 16 – Sicherheits- und Löschstandard

## Grundprinzip

Persönliche Anwendungen arbeiten möglichst lokal. Die Software soll klar unterscheiden zwischen Arbeitsstand, externer Masterdatei und lesbarer Endfassung.

## Vor Dateiausgaben

Bei besonders sensiblen Bereichen kann die Anwendung den Nutzer vor dem Export auf ungewöhnlich kritische Eingaben aufmerksam machen. Die Entscheidung bleibt beim Nutzer.

## Daten zurücksetzen

Das Zurücksetzen persönlicher Daten ist eine besonders wichtige Aktion und wird nicht mit einem einzigen stillen Klick ausgeführt.

Standard:
- Demo bleibt geschützt
- persönliche Version benötigt vorher sichtbare Freigaben
- abschließende Nachfrage
- lokaler Arbeitsstand wird entfernt
- zusätzliche lokale Spiegelung wird entfernt
- temporäre Importzustände werden entfernt
- Oberfläche wird auf Grundzustand gesetzt
- sichtbare Abschlussbestätigung

## Datenschutzprinzip

Für Local-First-Produkte gilt als Ziel: Persönliche Inhalte müssen für den normalen Betrieb nicht zentral durch die Akademie gespeichert werden. Die Anwendung stellt Werkzeug, Datenmodell und Exportfunktionen bereit; der Nutzer kontrolliert seinen lokalen Datenbestand und seine externen Dateien.