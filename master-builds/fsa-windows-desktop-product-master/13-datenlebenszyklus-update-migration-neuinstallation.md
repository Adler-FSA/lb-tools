# 13 – Datenlebenszyklus: Update, Migration, Neuinstallation und PC-Wechsel

## Zweck
Dieses Kapitel definiert den sicheren Lebenszyklus persönlicher Daten über mehrere Produktversionen und Windows-Installationen hinweg.

Es trennt ausdrücklich zwischen bereits im Referenzprodukt erprobten Prinzipien und neuen Master-Regeln, die beim ersten Folgeprodukt noch validiert werden müssen.

## 1. Erprobt aus dem Referenzprodukt
Als erprobte Grundprinzipien gelten:
- persönlicher Arbeitsstand wird lokal gespeichert
- zusätzliche IndexedDB-Spiegelung
- externe JSON-Master-Sicherung
- Schema-Prüfung beim Restore
- Demo und persönliche Daten bleiben getrennt
- sichtbare Bestätigung nach Speichern/Restore
- JSON ist die maßgebliche externe Sicherung
- Windows-Desktop-App erhält einen produktspezifischen `userData`-Bereich

## 2. Noch zu validierender Master-Standard
Folgende Punkte wurden aus dem Lebenszyklusbedarf abgeleitet und müssen beim ersten Folgeprodukt praktisch getestet werden:
- automatische Migration zwischen unterschiedlichen Datenschemata
- Update über eine bereits installierte ältere Desktop-Version
- Deinstallation und anschließende Neuinstallation
- Wiederherstellung auf einem zweiten Windows-PC
- Verhalten bei beschädigtem oder unvollständigem Datenbestand
- Rückkehr auf eine ältere Programmversion mit neuerem Datenschema

## 3. Grundregel: Programmversion und Datenschema trennen
Die sichtbare Produktversion und die Daten-Schema-Version sind zwei verschiedene Dinge.

Beispiel:
- App-Version: `1.3.0`
- Backup-/Datenschema: `fsa-produkt-v2`

Eine reine Text-/Designänderung kann die App-Version erhöhen, ohne dass Daten migriert werden müssen. Eine Änderung der Datenstruktur benötigt dagegen eine klar definierte Schema-Migration.

## 4. Keine stille destruktive Migration
Vor einer Migration persönlicher Daten muss der alte Zustand sicherbar bzw. wiederherstellbar sein.

Verbindlicher Ablauf:
1. vorhandenen State lesen
2. Schema/Version bestimmen
3. Vorzustand sichern
4. passende Migrationskette bestimmen
5. Migration auf einer Kopie durchführen
6. Ergebnis validieren
7. erst dann neuen State speichern
8. sichtbaren Erfolg melden

Bei Fehlern bleibt der ursprüngliche Zustand erhalten.

## 5. Schrittweise Migration
Nicht `v1 → v4` mit einer undurchsichtigen Universalroutine.

Stattdessen:
- `v1 → v2`
- `v2 → v3`
- `v3 → v4`

Dadurch kann auch ein lange nicht aktualisiertes Produkt kontrolliert durch alle notwendigen Strukturänderungen geführt werden.

## 6. Migration muss idempotent geschützt sein
Eine bereits erfolgreich durchgeführte Migration darf beim nächsten Start nicht erneut dieselben Änderungen anwenden.

Der aktuelle Schema-/Migrationsstand muss deshalb eindeutig im gespeicherten Datenbestand oder in kontrollierten Metadaten erkennbar sein.

## 7. Update einer bestehenden Windows-Installation
Ziel: Eine neue Programmversion darf vorhandene persönliche Daten nicht wie eine Neuinstallation behandeln.

Zu prüfen:
- App-ID bleibt für dasselbe Produkt stabil
- `userData`-Verzeichnis bleibt für dasselbe Produkt stabil
- Storage-Namespace bleibt kompatibel oder wird bewusst migriert
- Installer überschreibt keine persönlichen Arbeitsdaten
- neuer Programmcode kann alten State lesen oder migrieren

**Wichtig:** Für ein anderes FSA-Produkt müssen App-ID und `userData` dagegen eindeutig getrennt sein.

## 8. Vor jedem risikoreichen Update
Käuferseitig soll bei Updates mit Datenstrukturänderung eine aktuelle JSON-Master-Sicherung empfohlen bzw. technisch eingefordert werden, wenn das Produkt dies sinnvoll unterstützen kann.

Release-seitig muss ein Update-Test mit realistischem Testbestand durchgeführt werden.

## 9. Update-Testmatrix
Mindestens testen:
- alte Version installieren
- Testdaten vollständig erfassen
- App schließen
- neue Version installieren
- App starten
- Datenbestand prüfen
- Bearbeitung prüfen
- JSON exportieren
- PDF/Excel prüfen, falls vorhanden
- App erneut schließen/starten
- Daten erneut prüfen

Bei Schemaänderung zusätzlich:
- Migration protokollieren
- alte Felder korrekt übernehmen
- neue Felder mit definierten Defaults anlegen
- entfernte Felder bewusst behandeln
- keine Duplikate erzeugen

## 10. Deinstallation
Eine Deinstallation ist nicht automatisch gleichbedeutend mit „persönliche Daten sicher gelöscht“.

Der tatsächliche NSIS-/Electron-Verhaltensstand muss für jedes Produkt getestet und dokumentiert werden.

Deshalb niemals versprechen, dass eine Deinstallation alle persönlichen Daten entfernt, solange dies nicht konkret geprüft wurde.

## 11. Neuinstallation auf demselben PC
Es sind zwei Fälle zu unterscheiden:

### A – lokaler Datenbereich existiert noch
Die Anwendung kann den vorhandenen Arbeitsstand wiederfinden, sofern App-ID/userData/Storage kompatibel bleiben.

### B – lokaler Datenbereich fehlt
Dann ist die JSON-Master-Sicherung der vorgesehene Wiederherstellungsweg.

Beide Fälle müssen beim ersten freigegebenen Produkt praktisch getestet werden.

## 12. Wechsel auf einen anderen Windows-PC
Verbindlicher Käuferweg:
1. auf altem PC aktuelle JSON-Master-Sicherung erzeugen
2. Sicherungsdatei sicher auf neuen PC übertragen
3. Produkt auf neuem PC installieren
4. Anwendung starten
5. persönliche/Blanko-Version öffnen
6. JSON-Master-Sicherung einlesen
7. Restore prüfen
8. Stichprobe wichtiger Bereiche
9. neue lokale Arbeitskopie speichern
10. optional neue Master-Sicherung auf dem neuen Gerät erzeugen

Der Transfer erfolgt über die Sicherungsdatei, nicht durch Kopieren interner Electron-/Browserdatenbanken.

## 13. PC-Verlust oder defektes Gerät
Wenn der ursprüngliche Rechner nicht mehr verfügbar ist, kann nur wiederhergestellt werden, was außerhalb dieses Rechners gesichert wurde.

Darum ist die externe JSON-Master-Sicherung Bestandteil des Produktkonzepts und keine optionale Komfortfunktion.

## 14. Beschädigte Sicherung
Restore muss mindestens prüfen:
- gültiges JSON
- erwartetes Schema
- erwartete Grundstruktur
- Demo-/Persönlich-Kompatibilität
- erforderliche Datenbereiche bzw. Normalisierbarkeit

Eine fehlerhafte Datei darf den aktuellen persönlichen Arbeitsstand nicht vorher löschen.

## 15. Downgrade
Ein Downgrade auf eine ältere App-Version kann gefährlich sein, wenn die persönlichen Daten bereits auf ein neueres Schema migriert wurden.

Master-Regel:
- Downgrade nicht als normalen Käuferweg vorsehen
- bei technischem Rollback Programmstand und Datenschema gemeinsam betrachten
- vor Downgrade vollständige Sicherung anlegen
- ältere App darf neuere Daten nicht ungeprüft überschreiben

## 16. Migrationsprotokoll
Bei einer echten Schema-Migration soll technisch nachvollziehbar sein:
- Ausgangsschema
- Zielschema
- Zeitpunkt
- angewandte Migrationsschritte
- Erfolg/Fehler

Keine sensiblen Nutzdaten in Diagnoseprotokolle schreiben.

## 17. Zielarchitektur
Für Produkte mit mehreren Schema-Versionen wird künftig ein eigener Baustein vorgesehen:

`data-migration-engine`
- erkennt Ausgangsschema
- kennt erlaubte Migrationspfade
- arbeitet auf Kopien
- validiert Zwischenschritte
- schreibt erst nach Erfolg
- liefert ein technisches Ergebnisobjekt

Produktspezifische Migrationen liegen im Produktadapter und nicht in einer universellen Blackbox.

## 18. Release-Manifest
Bei jedem Release festhalten:
- App-Version
- Datenschema
- Migration vorhanden: ja/nein
- unterstützte Ausgangsschemata
- getestete Update-Ausgangsversion
- Update-Testdatum
- Neuinstallation getestet
- PC-Wechsel/Restore getestet, sofern relevant

## 19. Käuferkommunikation
Die Übergabeseite muss verständlich erklären:
- wo die Arbeitsdaten grundsätzlich liegen
- warum regelmäßige JSON-Sicherungen wichtig sind
- wie vor einem Update gesichert wird
- wie auf einen neuen PC gewechselt wird
- dass interne lokale Speicherung keine externe Datensicherung ersetzt

## 20. Freigaberegel
Ein Produkt mit neuer Datenmigration darf nicht freigegeben werden, nur weil die Neuinstallation funktioniert.

**Update + Migration + Neustart + Backup + Restore müssen als zusammenhängender Lebenszyklus getestet sein.**
