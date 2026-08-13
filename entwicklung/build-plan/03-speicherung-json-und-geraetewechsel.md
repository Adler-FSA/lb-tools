# 03 – Lokale Speicherung, JSON und Gerätewechsel

## Lokaler Arbeitsstand

Die Anwendung arbeitet grundsätzlich lokal auf dem Gerät des Nutzers.

### LocalStorage
Geeignet für:
- unmittelbaren Arbeitsstand
- Modus Demo/Echt
- Onboarding-Status
- Zeitstempel und Statusinformationen
- Importbericht und temporäre Wiederherstellungspunkte

### IndexedDB
Zusätzliche lokale Spiegelung des persönlichen Arbeitsstands. Fehlt der LocalStorage-Stand, kann die Spiegelung als lokale Wiederherstellungshilfe dienen.

Wichtig: Lokale Speicherung ersetzt keine externe Sicherungsdatei.

## Autosave

Automatisch speichern bei:
- Texteingabe
- Auswahländerung
- Hinzufügen/Löschen dynamischer Datensätze
- relevanten Spezialfeldern

Speichern kurz entprellen, damit nicht bei jedem einzelnen Tastendruck unnötig geschrieben wird.

Demo niemals in den persönlichen Arbeitsstand schreiben.

## JSON-Master-Sicherung

JSON ist das vollständige Wiederherstellungsformat.

Bestandteile:
- Schema-Kennung
- Produktkennung
- Erstellzeitpunkt
- Demo-/Echtkennzeichen
- vollständiges Datenobjekt

Dateinamensprinzip:

`[DEMO-]<Produkt>-<Name>-Sicherung-YYYY-MM-DD-HHMM.json`

Keine zufälligen UUID-Dateinamen als sichtbarer Nutzerdateiname.

## Wiederherstellung

Vor Übernahme:
1. Datei lesbar?
2. erwartetes Schema?
3. Datenobjekt vorhanden?
4. Demo/Echtmodus passend?
5. Nutzer bestätigt Ersetzen?

Danach:
- State ersetzen
- Oberfläche füllen
- dynamische Bereiche rendern
- persönlichen Stand lokal spiegeln
- sichtbare Erfolgsbestätigung

## Sicherungsstatus

Drei sichtbare Zustände:
1. noch keine Master-Sicherung
2. Master-Sicherung aktuell
3. Master-Sicherung nicht mehr aktuell

Technik:
- normalisierten State hashen
- flüchtige Metadaten aus dem Inhaltsvergleich herauslassen
- Hash der letzten Master-Sicherung speichern
- nach Änderungen aktuellen Hash vergleichen

## Gerätewechsel

Standardablauf:
1. auf altem Gerät aktuelle JSON-Master-Sicherung erzeugen
2. externen, selbst kontrollierten Speicherort wählen
3. auf neuem Gerät Produkt öffnen bzw. installieren
4. Sicherung wiederherstellen
5. Daten prüfen
6. neue Master-Sicherung erzeugen

## Akademie-Merksatz

**Lokal arbeiten. JSON sichern. Excel kontrollieren. PDF aufbewahren.**