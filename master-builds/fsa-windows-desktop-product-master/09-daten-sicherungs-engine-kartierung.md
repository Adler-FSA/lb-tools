# 09 – Daten-, Persistenz- und Sicherungsengine: Kartierung

## Referenz
Die finale Notfallakte verwendet nicht nur LocalStorage. Der V08-Endstand ergänzt den Produktkern um eine zweite lokale Arbeitskopie in IndexedDB, eine JSON-Master-Sicherung, Hash-basierten Sicherungsstatus, Demo-/Eigene-Trennung, Wiederherstellung und Sicherheitsprüfung vor Exporten.

Referenzdatei: `pages/notfallakte-offline-installation/v08-final.js`

## 1. Arbeitsdaten
Der fachliche State bleibt das zentrale Datenobjekt. Vor Speicherung werden sichtbare Eingaben über die vorhandene Produktfunktion `readTop()` in den State übernommen.

Der persönliche Arbeitsstand wird anschließend:
- als JSON in LocalStorage geschrieben
- zusätzlich als `current` in IndexedDB gespiegelt

Damit existieren zwei lokale Ebenen innerhalb der Anwendungsumgebung.

## 2. IndexedDB-Spiegel
V08 definiert einen eigenen Datenbanknamen und Object Store. Die Funktionen `idbPut`, `idbGet` und `idbClear` bilden die technische Spiegelung.

Wichtige Erkenntnis: IndexedDB ist hier **keine externe Sicherung**. Sie ist eine zusätzliche lokale Arbeitskopie innerhalb der Anwendung.

## 3. Automatische lokale Speicherung
Änderungen an `input`, `textarea` und `select`, Signaturänderungen sowie das Hinzufügen/Löschen dynamischer Einträge lösen eine verzögerte lokale Speicherung aus.

Referenzprinzip:
- Debounce statt Schreiben bei jedem einzelnen Tastenschlag
- State aktualisieren
- `updatedAt` setzen
- LocalStorage schreiben
- IndexedDB spiegeln
- Sicherungsstatus aktualisieren
- sichtbare Bestätigung ausgeben

## 4. Wiederherstellung der lokalen Arbeitskopie
Wenn LocalStorage leer ist, aber IndexedDB noch einen Spiegel enthält, kann V08 den Arbeitsstand daraus wiederherstellen und erneut in LocalStorage schreiben.

Das ist eine lokale Resilienzfunktion. Sie ersetzt die externe JSON-Master-Sicherung nicht.

## 5. JSON-Master-Sicherung
Die vollständige Sicherung ist ein strukturiertes Paket:

- `schema`
- `product`
- `createdAt`
- `demo`
- `data`

Die eigentlichen Produktdaten liegen unter `data`.

Die Schema-Kennung verhindert, dass beliebige JSON-Dateien stillschweigend als gültige Produktsicherung übernommen werden.

## 6. Demo-/Persönlich-Schutz
Die Sicherung trägt ein `demo`-Kennzeichen.

Regeln des Referenzprodukts:
- persönliche Sicherung darf nicht in die Demo eingelesen werden
- Demo-Sicherung darf nicht den persönlichen Datenbestand überschreiben
- Demo-Restore verändert keine persönlichen Daten

Diese Trennung wird Master-Standard für Produkte mit dauerhaft verfügbarer Demo.

## 7. Restore-Ablauf
Vor dem persönlichen Restore wird bestätigt, dass der aktuelle Stand ersetzt wird.

Danach:
1. JSON lesen
2. Syntax prüfen
3. Schema prüfen
4. `data` prüfen
5. Demo-/Eigene-Kompatibilität prüfen
6. Bestätigung einholen
7. Daten durch produktspezifische `merge()`-Logik normalisieren
8. State ersetzen
9. `updatedAt` neu setzen
10. LocalStorage schreiben
11. IndexedDB spiegeln
12. Modus setzen
13. Oberfläche neu füllen/rendern
14. Backup-Zeitpunkt und Hash setzen
15. sichtbare Erfolgsmeldung

## 8. Sicherungsstatus über Hash
V08 speichert neben dem Zeitpunkt der letzten JSON-Sicherung einen Hash des gesicherten normalisierten Datenzustands.

Beim aktuellen Status wird der Hash des jetzigen Datenbestands erneut berechnet.

Damit kann die Oberfläche unterscheiden:
- noch keine Master-Sicherung
- Master-Sicherung aktuell
- Änderungen seit letzter Master-Sicherung

`updatedAt` wird beim Vergleich bewusst aus dem fachlichen Zustand entfernt, damit ein Zeitstempel allein die Sicherung nicht künstlich als veraltet markiert.

## 9. Sensible-Daten-Prüfung
Vor JSON- und PDF-Erzeugung scannt das Referenzprodukt den State auf mögliche hochkritische Inhalte, insbesondere Muster für Seed Phrase/Recovery Phrase und Private Keys.

Bei Treffern wird nicht heimlich blockiert. Der Nutzer erhält eine Warnung und kann bewusst entscheiden.

Master-Erkenntnis: Sicherheitsprüfungen müssen fachlich konfigurierbar bleiben. Nicht jedes Produkt benötigt Krypto-spezifische Muster.

## 10. Dateiausgabe
Die Referenzfunktion erzeugt aus dem Blob eine `File`-Instanz. Auf iOS/iPadOS wird – wenn verfügbar – die Share-Schnittstelle verwendet; sonst erfolgt ein normaler Browserdownload über Object-URL.

Für Windows Desktop ist insbesondere der normale lokale Downloadweg relevant. Die Mehrgeräte-/Webfähigkeit des Produktkerns bleibt trotzdem als Erkenntnis erhalten.

## 11. Löschen
Beim vollständigen Löschen des persönlichen Arbeitsstands werden im Referenzprodukt nicht nur die Hauptdaten entfernt, sondern auch:
- Backup-Status
- Backup-Hash
- interne Import-Wiederherstellungspunkte
- Import-Berichte
- IndexedDB-Spiegel

Master-Regel: „Daten löschen“ muss alle zum persönlichen Arbeitsstand gehörenden lokalen Persistenzebenen berücksichtigen.

## 12. Produktspezifische Abhängigkeiten
V08 ist noch nicht generisch. Unter anderem fest verdrahtet sind:
- Schema `lb-notfallakte-v8`
- Datenbank `lb-tools-notfallakte-v08`
- Product-Text der Notfallakte
- Dateinamen
- globale Variablen `state`, `demoMode`, `KEY`, `demo`
- Funktionen `readTop`, `merge`, `fill`, `render`, `blank`
- UI-IDs und Notfallakten-Texte
- Krypto-spezifische Sensitive-Scanner-Regeln

Diese Punkte gehören in einen Produktadapter.

## 13. Zielarchitektur des Masters
Aus der Referenz werden vier Rollen getrennt:

### `data-master-store`
LocalStorage + IndexedDB-Spiegel + Speichern/Laden/Löschen.

### `data-master-backup`
JSON-Paket, Schema, Export, Restore, Hash und Sicherungsstatus.

### `data-product-adapter`
Produktspezifische State-Funktionen, Schlüssel, Schema, Dateinamen, Demo-Logik und UI-Hooks.

### `data-security-adapter`
Optionale fachliche Prüfung hochsensibler Inhalte vor Export/Weitergabe.

## 14. Desktop-Bedeutung
Electron stellt für jedes Produkt einen eigenen `userData`-Bereich bereit. Die Webtechnologien LocalStorage und IndexedDB laufen damit innerhalb der eigenen Electron-Anwendungsumgebung statt im normalen Safari-/Chrome-Browserprofil.

Das schützt die Desktop-Arbeitskopie vor normalen Browserdaten-Löschvorgängen. Es macht die JSON-Datei aber weiterhin unverzichtbar für echte externe Sicherung, Neuinstallation, Geräteverlust oder bewussten Transfer.

## 15. Schutzregel
Die fertige V08-Notfallakte bleibt unverändert. Die folgenden Mastervorlagen werden separat erstellt und müssen beim ersten Folgeprodukt vollständig getestet werden.