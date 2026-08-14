# FSA Windows Desktop Product Master

## Zweck
Dieser Master sichert das vollständige Produktformat, das aus der Entwicklung des Referenzprodukts **„Meine digitale & finanzielle Notfallakte – Windows Desktop-Version“** entstanden ist.

Der Master ist ausdrücklich **nicht nur ein Electron-Template**. Er dokumentiert und sichert den gesamten Weg vom Produktkern bis zum verkaufs- und auslieferungsfähigen Windows-Desktop-Produkt.

## Referenzprodukt
Referenz Nr. 1: **Meine digitale & finanzielle Notfallakte – Windows Desktop-Version**

Die fertige Notfallakte bleibt unveränderte Referenz. Der Master wird aus ihrem finalen Entwicklungsstand, den funktionierenden Engines, dem Buildweg, den Käuferseiten, den Tests und den während der Entwicklung gewonnenen Erkenntnissen abgeleitet.

## Definition „fertiges FSA Windows Desktop Produkt“
Ein Produkt gilt nach diesem Standard erst als vollständig, wenn folgende Schichten vorhanden und geprüft sind:

1. Produktkern
2. Daten- und Sicherungsengine
3. Demo-/Trainingssystem
4. Excel-/Kontrollausgabe
5. professionelle PDF-Dokument-Engine
6. Windows-/Electron-Desktop-Schicht
7. reproduzierbarer Build und Windows-Installer
8. Produktbild und Verkaufsmedien
9. Produkt-Begleitseite
10. Produkt-Übergabe- und Installationsseite
11. Shop-/Leistungsbeschreibung
12. KI-Sprecher-/Video-Verkaufstext mit Call-to-Action
13. vollständige technische und manuelle Abnahme
14. dokumentierte Entwicklungsentscheidungen und verworfene Wege

## Master-Bereiche

### A – Produktkern
HTML/CSS/JS, Module, Formulare, State, Benutzerführung, Demo/Blanko und Akademie-Erklärungen.

### B – Daten & Sicherung
Lokale Persistenz, LocalStorage/IndexedDB soweit produktspezifisch eingesetzt, vollständige JSON-Master-Sicherung, Wiederherstellung und Gerätewechsel.

### C – Ausgabe-Engines
Excel als Kontroll-/Arbeitsausgabe und professionelle PDF-Dokumentausgabe mit A4-Seitenlogik, Pagination, Seitenzahlen, Fortsetzungsseiten, langen Inhalten und Stress-Test.

### D – Windows Desktop
Electron-Hülle, eigener lokaler Anwendungsbereich, Trennung von normalen Browserdaten, Desktop-UX und vollständiger Offline-Betrieb nach Installation.

### E – Build & Installer
GitHub Actions, Node, Electron Builder, NSIS-x64-Installer, Desktop-/Startmenü-Verknüpfung und reproduzierbare Erzeugung der Setup-EXE.

### F – Käufer-Auslieferung
Produktbild, eigenständige Begleit-/Nutzen-Seite sowie getrennte Produktübergabe-/Installationsseite.

### G – Verkaufspaket
Produkt-/Nutzenbeschreibung, „Leistungen auf einen Klick“, technische Produktangaben, KI-Sprechertext und Call-to-Action.

### H – Qualität & Abnahme
Demo-Stresstest, PDF, JSON-Wiederherstellung, Excel, Installation, Windows-SmartScreen, Virenschutz, Desktopstart, Offline-Test, Datenpersistenz, Browserdaten-Unabhängigkeit und Update über bestehende Installation bei erhaltenem Datenbestand.

### I – Entwicklungswissen
Probleme, Fehlwege, Ursachen, Lösungen und Schutzregeln werden mitgesichert. Ziel: **Fehler nicht zweimal machen.**

### J – Neues Produkt starten
Verbindlicher Ablauf, mit dem ein neues FSA-Windows-Desktop-Produkt auf Basis dieses Masters entwickelt wird, ohne wieder bei null anzufangen.

## Zentrale Architekturregel
**Ein gemeinsamer freigegebener Produktkern + wiederverwendbare Engines + Windows-Hülle + reproduzierbarer Installer + vollständige Käufer-Auslieferung.**

Die technische Komplexität gehört in den Entwicklungs- und Buildprozess, nicht zum Käufer.

## Käuferführung als fester Standard
Die Begleitseite und die Übergabeseite erfüllen unterschiedliche Aufgaben und bleiben getrennt:

**Begleitseite:** Produktbild → Sinn/Problem → Nutzen → Leistungsverständnis → Sicherheits-/Datensouveränitätsprinzip → Orientierung → Call-to-Action zur Einrichtung.

**Übergabeseite:** Begrüßung → Setup-Download → System-/Installationshinweise → geführte Installation → SmartScreen/Virenschutz → erster Start → Offline-Nutzung → Sicherung/Wiederherstellung → Hilfe bei typischen Situationen.

## Sicherungsprinzip
PDF und Excel sind wichtige Ausgaben, aber keine vollständige technische Wiederherstellung. Die transportable vollständige Datensicherung wird als JSON-Master behandelt, sofern das jeweilige Produkt dieses Datenmodell verwendet.

## Entwicklungsprinzip
Der Master bewahrt nicht nur den finalen Code. Er bewahrt auch die Gründe für Architekturentscheidungen, die Entwicklung der Engines, reale Tests und verworfene Zwischenlösungen. Dadurch bleibt das erarbeitete Entwicklungswissen für zukünftige Produkte reproduzierbar.