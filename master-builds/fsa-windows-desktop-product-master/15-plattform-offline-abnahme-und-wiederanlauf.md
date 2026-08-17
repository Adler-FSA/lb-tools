# 15 – Plattform-, Offline-Abnahme und Fehler-/Wiederanlaufverfahren

## Zweck
Ein Windows-Desktop-Produkt ist erst fertig, wenn nicht nur der Quellcode funktioniert, sondern der reale Käuferweg unter den vorgesehenen Betriebsbedingungen geprüft wurde. Dieses Kapitel definiert dafür die verbindliche Plattform-, Offline- und Wiederanlauf-Abnahme.

## 1. Prüfobjekte getrennt betrachten
Es werden mindestens vier Ebenen geprüft:
1. Web-/Entwicklungsstand
2. gepackte Desktop-Anwendung
3. installierte Windows-Anwendung
4. Käufer-Auslieferungsweg inklusive Setup und Übergabeseite

Ein erfolgreicher Browser-Test beweist nicht, dass die installierte Desktop-App funktioniert.

## 2. Zielplattform
Für jedes Produkt im Release-Manifest festlegen:
- unterstützte Windows-Version(en)
- Architektur
- Installer-Typ
- Installationsmodus
- App-ID
- userData-Bereich
- Offline-Anforderung

Nicht getestete Plattformen werden nicht als unterstützt behauptet.

## 3. Mindest-Abnahmematrix
### A – Installation
- Setup lädt vollständig
- Setup startet
- tatsächliche Windows-/SmartScreen-Anzeige dokumentiert
- Installationsoptionen stimmen mit Übergabeseite überein
- Installation beendet sich erfolgreich
- Desktop-/Startmenü-Verknüpfung vorhanden, sofern vorgesehen

### B – Erststart
- App startet aus Installer
- App startet über Desktop/Startmenü
- richtige Startseite öffnet
- keine alten Web-/PWA-Pfade sichtbar
- Demo und persönliche Version korrekt getrennt

### C – Kernfunktionen
- Eingaben speichern
- Neustart erhält Eingaben
- sichtbare Aktionsbestätigungen funktionieren
- JSON Export
- JSON Restore
- PDF Export, falls vorhanden
- Excel Export/Import, falls vorhanden
- Demo/Stress-Test, falls vorgesehen

### D – Offline
1. App einmal regulär installieren/starten.
2. App vollständig schließen.
3. WLAN/LAN deaktivieren.
4. App neu starten.
5. Navigation und Kernfunktionen prüfen.
6. Daten speichern.
7. App schließen und erneut offline starten.
8. Daten prüfen.
9. lokale Exporte prüfen.

Nur wenn dieser Ablauf bestanden ist, darf „offline nutzbar“ als Produktmerkmal verwendet werden.

### E – Neustart
- App schließen
- Windows-Neustart bzw. vollständiger App-Neustart
- App öffnen
- Datenbestand kontrollieren
- keine erneute Initialisierung über persönlichen State

### F – Update
Nach Kapitel 13 testen: Altversion mit Daten → neue Version installieren → Daten, Migration, Exporte und Neustart prüfen.

### G – Restore/PC-Wechsel
- externe JSON-Master-Sicherung erzeugen
- frische/saubere Installation verwenden
- Sicherung importieren
- Stichproben aller kritischen Bereiche
- neuen Export erzeugen

## 4. Offline bedeutet keine versteckten Netzabhängigkeiten
Vor Freigabe prüfen, dass für Kernfunktionen keine externen Ressourcen erforderlich sind:
- keine externen Fonts
- keine externen Icon-CDNs
- keine externen JS-/CSS-CDNs
- keine Bilder, die nur per Web-URL verfügbar sind
- keine API-Abhängigkeit für Kernfunktionen

Produktressourcen lokal bündeln; Symbole als Inline-SVG, sofern benötigt.

## 5. Fehlerklassen
### Klasse 1 – Darstellung
Layout, Text oder nichtkritische Anzeige betroffen; Daten und Kernfunktion intakt.

### Klasse 2 – Funktion
Ein Export, Button oder Teilprozess funktioniert nicht zuverlässig.

### Klasse 3 – Datenrisiko
Speichern, Restore, Migration oder bestehende Nutzerdaten könnten beschädigt/verloren werden.

### Klasse 4 – Release-Blocker
App startet nicht, Installation scheitert, Offline-Kernversprechen ist falsch oder kritische Datenfunktion ist nicht sicher.

Klasse 3 und 4 blockieren die Freigabe.

## 6. Wiederanlauf bei Fehlern
Nicht sofort mehrere Stellen gleichzeitig ändern.

Verbindlicher Ablauf:
1. Fehler reproduzieren.
2. betroffene Ebene bestimmen: Quelle, Build, Installer, Runtime, Daten, Cache oder Käuferseite.
3. Testdaten sichern.
4. Version/Commit/Setup eindeutig festhalten.
5. kleinsten reproduzierbaren Fehlerweg dokumentieren.
6. eine Ursache bzw. Änderung isoliert bearbeiten.
7. Regressionstest durchführen.
8. erst danach nächste Änderung.

## 7. Wenn die Ursache unklar ist
Prüfreihenfolge:
- läuft wirklich das erwartete Setup/Release?
- stimmt Commit/Build?
- stimmt Script-Wiring?
- existiert ein alter Cache-/Service-Worker-Einfluss aus Entwicklungsstufen?
- ist der persönliche State beschädigt oder nur die Darstellung?
- tritt der Fehler mit frischem Testprofil ebenfalls auf?

Keine produktiven Nutzerdaten löschen, nur um einen Fehler schneller verschwinden zu lassen.

## 8. Recovery vor Reset
Bei Datenproblemen zuerst:
- aktuellen Zustand exportieren/sichern, soweit möglich
- JSON-Master-Sicherung prüfen
- IndexedDB-/LocalStorage-Zustand nicht blind löschen
- Ursache isolieren

Ein Reset ist letzter Schritt, nicht erste Reparaturmaßnahme.

## 9. Sauberer Testbestand
Für Regressionen mindestens drei Zustände vorhalten:
- leerer persönlicher Bestand
- normal ausgefüllter realistischer Bestand
- großer Stress-/Daniel-Muster-Bestand

Damit werden sowohl Erstnutzer als auch Langzeit-/Großdatenfälle geprüft.

## 10. Abbruchkriterium und Rollback
Wenn mehrere Reparaturen neue Folgefehler erzeugen oder Datenrisiko nicht eindeutig ausgeschlossen werden kann, greift Kapitel 12: Entwicklung stoppen und auf letzten nachweislich stabilen Referenzstand zurückgehen.

## 11. Fehlerprotokoll
Für relevante Fehler festhalten:
- Datum
- Produkt-/App-Version
- Commit
- Setup-Datei
- Testsystem
- online/offline
- Datenbestand/Testprofil
- Symptom
- Reproduktionsschritte
- Ursache
- Lösung
- Regressionstest
- Status

Keine persönlichen Echtdaten in Fehlerprotokolle übernehmen.

## 12. Käuferseitiger Fehlerfall
Die Übergabeseite soll nur tatsächlich bekannte und getestete Hilfestellungen enthalten. Keine pauschalen Anweisungen zum Abschalten von Sicherheitssoftware und keine unbelegten Versprechen.

Bei einem technischen Problem muss zunächst geklärt werden, welche Version/Setup-Datei installiert ist und ob eine aktuelle JSON-Sicherung existiert.

## 13. Freigaberegel
Ein Release ist nur freigabefähig, wenn:
- Installation bestanden
- Erststart bestanden
- Kernfunktionen bestanden
- Persistenz bestanden
- Offline-Neustart bestanden
- Sicherung/Restore bestanden
- produktspezifische Export-/Importtests bestanden
- Käuferweg bestanden
- keine offenen Klasse-3-/Klasse-4-Fehler

## 14. Dokumentationsregel
Das Release-Manifest dokumentiert den tatsächlich getesteten Stand. „Funktioniert im Quellcode“ oder „Build war grün“ ersetzt niemals die Prüfung der installierten Anwendung.
