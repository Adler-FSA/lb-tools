# 05 – Neues FSA Windows Desktop Produkt starten

## Zweck
Dieses Dokument ist der verbindliche Arbeitsleitfaden, sobald entschieden wurde, dass ein neues Produkt als echte FSA-Windows-Desktop-Software entwickelt werden soll.

**Grundsatz:** Nicht bei null anfangen. Nicht die fertige Notfallakte umbauen. Den Master verwenden und produktspezifische Inhalte neu einsetzen.

---

## Phase 0 – Auftrag festlegen
Vor dem ersten Code müssen folgende Punkte schriftlich feststehen:

- Produktname
- Zweck des Produkts
- Zielgruppe
- welches Problem wird gelöst?
- welchen konkreten Nutzen erhält der Käufer?
- welche Bereiche/Module werden benötigt?
- welche Daten werden erfasst?
- welche Daten sind besonders sensibel?
- wird eine Demo benötigt?
- wird eine Blanko-/Eigene-Version benötigt?
- wird PDF benötigt?
- wird Excel benötigt?
- wird JSON-Master-Sicherung benötigt? Bei dauerhaft bearbeitbaren lokalen Daten grundsätzlich vorsehen.
- muss das Produkt vollständig offline funktionieren?
- Windows-Versionen/Systemvoraussetzungen
- welche rechtlichen/inhaltlichen Abgrenzungen sind erforderlich?

**STOP:** Erst wenn diese Produktdefinition freigegeben ist, beginnt Phase 1.

## Phase 1 – Produktkern bauen
Zuerst die eigentliche Anwendung entwickeln, ohne den Windows-Installer in den Vordergrund zu stellen.

Pflichtpunkte:
1. saubere HTML-/CSS-/JS-Struktur
2. Module und Navigation
3. Datenmodell/State
4. Eingabefelder
5. sichtbare Bestätigungen für Nutzeraktionen
6. Akademie-Erklärungen/Hilfetexte
7. klare Benutzerführung
8. keine unnötigen externen Abhängigkeiten
9. produktbezogene Texte finalisieren

**Zwischenabnahme:** Produktkern funktioniert mit Testdaten vollständig.

## Phase 2 – Demo und Blanko
Wenn das Produkt erklärungsbedürftig ist, wird eine vollständig ausgefüllte Demo angelegt.

Demo-Anforderungen:
- realistische Beispielperson/-firma/-situation
- vollständige Beispieldaten
- erklärt die Benutzung ohne zusätzliche Schulung
- persönliche Nutzerdaten werden nicht mit Demo-Daten vermischt
- bei datenintensiven Produkten zusätzliche Stress-Test-Befüllung vorsehen

Blanko-Anforderungen:
- Käufer startet seinen eigenen Datenbestand sauber
- Demo bleibt als Orientierung erhalten, sofern dies Teil des Produktkonzepts ist

## Phase 3 – Persistenz
Jetzt wird die dauerhafte lokale Datenhaltung verdrahtet.

Prüfen:
- automatisches/gezieltes Speichern gemäß Produktlogik
- Reload/Neustart
- mehrere Bearbeitungsvorgänge
- keine unbeabsichtigte Überschreibung
- klare Trennung Demo/persönlich

Die Datenarchitektur muss für die spätere Desktop-Hülle geeignet sein.

## Phase 4 – JSON-Master-Sicherung
Für dauerhaft bearbeitbare Produkte mit lokalem Datenbestand wird die vollständige Master-Sicherung eingerichtet.

Pflicht:
- vollständiger Export
- stabiler Dateiname
- sichtbare Erfolgsmeldung
- vollständiger Import
- Wiederherstellung testen
- Neuinstallation/Gerätewechsel mitdenken

**Regel:** Erst nach erfolgreichem Restore-Test gilt die Sicherung als fertig.

## Phase 5 – Excel
Nur wenn fachlich sinnvoll.

Excel so aufbauen, dass der Käufer Daten kontrollieren, übergeben oder weiterverarbeiten kann.

Prüfen:
- Struktur
- Vollständigkeit der vorgesehenen Felder
- Sonderzeichen
- lange Inhalte
- Dateiname
- Öffnen in typischen Office-Programmen

## Phase 6 – PDF-Engine
Wenn PDF Bestandteil des Produkts ist, nicht neu improvisieren.

Master-/Referenzprinzipien übernehmen:
- geschützter PDF-Core
- professionelle Dokument-/Layout-Engine
- A4
- Pagination
- Seite X von Y
- Fortsetzungsseiten
- lange Texte
- viele Datensätze
- Abschlusslogik
- stabiler Dateiname
- Fertigmeldung

Danach Stress-Test mit realistisch großer Demo.

**STOP:** Keine Windows-Verpackung, solange die PDF-Ausgabe bei vorgesehenen Extremfällen noch bricht.

## Phase 7 – Web-/PWA-Relikte bereinigen
Bevor der Produktkern als Desktop-App verpackt wird:

- Browsertexte prüfen
- iFrame-Texte prüfen
- PWA-Hinweise prüfen
- Speicherhinweise prüfen
- Downloadhinweise prüfen
- interne Entwickler-/Testtexte entfernen

Desktop-spezifische Unterschiede nicht wahllos in den Produktkern schreiben; soweit möglich über die Desktop-UX-Schicht lösen.

## Phase 8 – Windows-Desktop-Hülle erzeugen
Masterstruktur für Electron übernehmen und produktspezifisch konfigurieren.

Zu ersetzen/prüfen:
- Produktname
- interne App-ID
- eigener `userData`-/Anwendungsname
- Fenstername
- Startdatei
- externe Links
- Desktop-UX-Texte
- Paketname
- Versionsnummer
- Setup-Dateiname
- Desktop-/Startmenü-Name

**Wichtig:** Jedes Produkt benötigt einen eindeutig eigenen lokalen Anwendungsbereich. Keine zwei Produkte dürfen versehentlich denselben Nutzerdatenbereich verwenden.

## Phase 9 – Build-Workflow
Für das neue Produkt einen reproduzierbaren GitHub-Actions-Build konfigurieren.

Der Workflow muss:
1. richtigen Produktkern übernehmen
2. alle benötigten Engines übernehmen
3. Desktop-Hülle verwenden
4. Abhängigkeiten installieren
5. electron-builder ausführen
6. NSIS-x64-Setup erzeugen
7. Build-Artefakt sichern
8. finale Setup-Datei eindeutig benennen

Keine Käuferfreigabe aus einer manuell zusammengestellten lokalen EXE.

## Phase 10 – Windows-Neuinstallation testen
Auf echtem Windows-System:

- Setup herunterladen
- SmartScreen beobachten
- Virenschutz aktiv lassen
- Setup starten
- Installationsweg durchführen
- Desktop-Verknüpfung prüfen
- Startmenü prüfen
- App starten
- alle Kernbereiche prüfen

Realen Ablauf dokumentieren. Dieser reale Ablauf wird später Grundlage der Käufer-Übergabeseite.

## Phase 11 – Offline-Test
Nach erfolgreicher Installation:

1. Testdaten eingeben
2. Anwendung schließen
3. WLAN/Netzwerk ausschalten
4. Anwendung über Desktop starten
5. Navigation testen
6. Daten prüfen
7. weitere Daten eingeben
8. lokale Exporte testen
9. Anwendung schließen
10. offline erneut starten
11. Persistenz prüfen

Erst danach darf „offline nutzbar“ in Käufertexten stehen.

## Phase 12 – Browserdaten-Unabhängigkeit
Mit Testdaten prüfen, dass normale Browserdaten nicht der einzige Speicherort der Desktop-App sind.

Keine persönlichen Echtdaten für destruktive Tests verwenden.

## Phase 13 – Update-Test
Vor Release eines Updates:

1. alte Version installieren
2. realistische Testdaten anlegen
3. JSON-Master-Sicherung erstellen
4. neues Setup über bestehende Installation ausführen
5. App starten
6. Datenbestand prüfen
7. Kernfunktionen prüfen
8. PDF/Excel/JSON erneut prüfen

Update erst freigeben, wenn Datenbestand erhalten bleibt oder eine bewusst dokumentierte Migration erfolgreich funktioniert.

## Phase 14 – Produktbild
Erst jetzt wird das endgültige Produktbild gebaut, damit es die reale Software zeigen kann.

Standard:
- klarer Produktname
- Windows-Produktcharakter erkennbar
- tatsächliche Softwareansicht verwenden, wenn sinnvoll
- für Shop und Videocover geeignet
- keine Funktionen darstellen, die das Produkt nicht besitzt

## Phase 15 – Begleitseite
Eigene Käufer-/Produktseite erstellen.

Aufbau:
1. Produktbild
2. Sinn/Problem
3. warum das Thema wichtig ist
4. konkreter Nutzen
5. typische Einsatzsituationen
6. was das Produkt leistet
7. Datenschutz/Datensouveränität entsprechend der realen Technik
8. Einstieg ohne Überforderung
9. CTA zur Produktübergabe

Keine Installationsanleitung in diese Seite quetschen.

## Phase 16 – Übergabeseite
Separat von der Begleitseite.

Aufbau:
1. Begrüßung
2. Produktname
3. Setup-Download
4. Systemvoraussetzungen
5. was installiert wird
6. Installationsschritte entsprechend dem real getesteten Installer
7. SmartScreen
8. Virenschutz
9. erster Start
10. Offline-Nutzung
11. lokale Daten
12. JSON-Master-Sicherung
13. Wiederherstellung
14. typische Fragen/Probleme
15. Sicherheits-/Datenschutzhinweise

**Regel:** Keine internen Entwicklertexte auf der Käuferseite.

## Phase 17 – Shop-Paket
Erstellen:
- kurze Produkt-/Nutzenbeschreibung
- ausführliche Leistungsbeschreibung „Leistungen auf einen Klick“
- Systemvoraussetzungen
- Leistungsabgrenzung
- Preis/Club-Vorteil nach aktueller Produktentscheidung

## Phase 18 – KI-Produktvideo
Sprechertext nicht wie einen technischen Prospekt schreiben.

Dramaturgie:
Problem → reale Situation → Lösung → Produktname → Nutzen → wichtigste Vorteile → Vertrauen → konkrete Handlung.

KI-Sprechtest durchführen. Sätze bei Bedarf kürzen und Atem-/Betonungsstellen schaffen.

Abschluss immer mit eindeutigem Call-to-Action.

## Phase 19 – Gesamtabnahme
`04-abnahme-testmatrix.md` vollständig durchgehen.

Kein Überspringen kritischer Tests, weil einzelne Teile bereits früher funktioniert haben.

## Phase 20 – Release einfrieren
Nach erfolgreicher Gesamtabnahme:

- Versionsnummer festlegen
- finalen Commit dokumentieren
- Setup-Datei eindeutig zuordnen
- Referenz der Käuferseiten dokumentieren
- Testdatum dokumentieren
- freigegebenen Stand markieren/taggen, soweit Releaseprozess vorgesehen
- keine stillen Änderungen an der freigegebenen Version

## Phase 21 – Erkenntnisse zurück in den Master
Jedes neue Produkt kann neue Probleme und Lösungen hervorbringen.

Nach Fertigstellung prüfen:
- Was war neu?
- Welche Fehler traten auf?
- Welche Lösung war erfolgreich?
- Ist die Erkenntnis produktspezifisch oder allgemein?

Nur allgemeingültige Erkenntnisse werden kontrolliert in diesen Master zurückgeführt. Dadurch wächst der Master mit jedem fertigen Produkt, ohne Referenzprodukte nachträglich umzubauen.

---

# Kurzform für den nächsten Start
Wenn ein neues Projekt beginnt, lautet die Arbeitsanweisung:

**„Neues Produkt auf Basis des FSA Windows Desktop Product Master starten. Referenzprodukt nicht verändern. Phasen 0–21 nacheinander bearbeiten. Nach jedem freigegebenen Baustein erst zum nächsten wechseln.“**

Damit beginnt die nächste Windows-Software nicht wieder bei null, sondern auf dem erprobten Stand dieses Produktformats.