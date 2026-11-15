Weihnachten neu entdecken – Etappe 1 · TESTFASSUNG

Einstieg: index.html
Original-PNG: bilder/panoramen/etappe-01.png
Lichtkoordinaten: lichtpositionen.json

Funktionen:
- Erste Reiseetappe vom 29.11. bis 06.12.2026 mit acht Lichtstationen
- Simulationsmodus Tag 1–8, Vor/Zurück, automatischer Lichtlauf und Reset
- Tageszeit-Simulation 03:00, 07:00, 12:00, 16:00, 20:00 sowie Uhrzeit-Schieberegler
- Einschaltbare Laternen und Schneereflexe durch Inline-SVG, Original-PNG unverändert
- Aktivierte Tage erneut per Klick öffnen
- DE/EN und responsiver Seitenaufbau
- Ohne lokalen Fortschrittsspeicher (kein localStorage)

Echtzeit:
- Zeitzone Europe/Berlin
- Synchronisierung anhand des HTTP-Date-Headers der eigenen Seite, wenn verfügbar
- Sonst explizit gekennzeichneter Gerätezeit-Fallback
- Die HTTP-Date-Methode ist für diese Testfassung gedacht und kein manipulationssicherer Server

Noch nicht enthalten:
- Übrige vier Reiseetappen und 26 Tagesbotschaften
- Integrierter persönlicher Weihnachtsbild-Generator
- Fotorealistische alternative Bilder für Tages-/Morgenlicht
- Produktionsfreigabe für die öffentliche Adventsaktion

Dämmerung, Tageslicht und Nacht werden bislang nur durch Überlagerung und Farbkorrektur auf der einen Ausgangsaufnahme simuliert.
