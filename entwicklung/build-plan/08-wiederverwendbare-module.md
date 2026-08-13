# 08 – Wiederverwendbare Module

Aus der Notfallakte werden folgende Bausteine als Standardmodule für neue Softwarelösungen übernommen:

1. Demo-/Echtmodus-Controller
2. Onboarding
3. sichtbare Aktions- und Bestätigungsbox
4. lokaler Arbeitsstand
5. zusätzliche lokale Spiegelung
6. Autosave
7. JSON-Masterdatei
8. Sicherungsstatus
9. Excel-Ausgabe
10. Excel-Vorschau
11. Excel-Datenübernahme
12. PDF-Core
13. PDF-Dokument-Engine
14. Zwei-Schritt-PDF-Download
15. Dateinamensgenerator
16. Geräte-/Speicheranleitung
17. Löschschutz
18. Cache-Versionierung
19. Engine-Versionierung
20. Stress-Test-Demo

## Entwicklungsregel

Bei einem neuen Produkt wird zuerst festgelegt, welche Standardmodule benötigt werden. Erst danach wird projektspezifische Logik entwickelt.

Bewährte Kernfunktionen werden nicht neu erfunden und nicht stillschweigend verändert.

Wenn ein Standardmodul angepasst werden muss, wird die Änderung isoliert vorgenommen und anschließend gegen Demo, persönliche Version, Dateiausgaben und Zielbrowser geprüft.