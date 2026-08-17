# 16 – Plattformmatrix: gemeinsamer Produktkern, Windows Desktop und Apple Web/PWA

## Grundentscheidung
Der Master wird nicht als ausschließliches Windows-System verstanden. Die Referenzentwicklung hat zwei dauerhaft benötigte Auslieferungswege hervorgebracht:

1. **Windows Desktop / Electron** – installierbare Anwendung.
2. **Apple iPad/iPhone / Web-PWA-Standalone** – webbasierte Installation bzw. Home-Screen-/Standalone-Nutzung mit Offline-Bereitstellung.

Der frühere PWA-Weg ist deshalb **nicht generell verworfen**. Er wurde nur als bevorzugter finaler Windows-Auslieferungsweg durch die komfortablere Electron-/Installer-Lösung ersetzt.

## 1. Architekturprinzip
**Ein fachlicher Produktkern – mehrere Plattformhüllen.**

Möglichst gemeinsam bleiben:
- Datenmodell/State
- Demo und Blanko-/Eigene-Version
- LocalStorage-basierte Produktlogik
- JSON-Master-Sicherung
- fachliche Validierung
- PDF-Dokumentlogik
- Excel-Datenmodell
- Texte und data-i18n
- Inline-SVGs
- Sicherheitsregeln

Plattformspezifisch bleiben:
- Installation
- Offline-Bereitstellung
- Startmechanismus
- interner Anwendungsdatenbereich
- Dateidownload/-weitergabe
- Updateweg
- Käuferübergabe

## 2. Windows Desktop / Electron
### Auslieferung
- Electron-Hülle
- NSIS-Setup
- Desktop-/Startmenü-Verknüpfung
- eigener Electron-`userData`-Bereich

### Offline
Produktdateien werden mit der Anwendung ausgeliefert. Kernfunktionen dürfen keine externen Ressourcen benötigen.

### Dateiausgabe
JSON/PDF/XLSX werden als vom Nutzer bewusst gespeicherte Dateien behandelt und bleiben von internen App-Daten getrennt.

### Update
Installer-/App-Version, Datenschema und Migration nach Kapitel 12/13 kontrollieren.

## 3. Apple iPad/iPhone – Web/PWA/Standalone
### Auslieferung
Auf Apple-Mobilgeräten wird nicht die Windows-EXE verwendet. Der Produktkern wird als webbasierte, für Safari/Home-Screen/Standalone geeignete Variante bereitgestellt.

Je nach final validierter Ausführung gehören dazu:
- Manifest
- Service Worker
- lokale Produktressourcen
- Home-Screen-/Standalone-Konfiguration
- Offline-Cache

### Offline
Offline-Fähigkeit muss separat auf dem realen Apple-Gerät geprüft werden:
1. Produkt online initial laden/installieren.
2. Offline-Ressourcen vollständig bereitstellen.
3. Anwendung schließen.
4. WLAN/Mobilfunk deaktivieren.
5. Anwendung neu öffnen.
6. Kernfunktionen testen.
7. Daten speichern.
8. erneut offline starten und Persistenz prüfen.

### Datenhaltung
Web Storage/IndexedDB liegen im Apple-/Safari-/Standalone-Kontext und sind nicht mit dem Electron-`userData`-Bereich gleichzusetzen.

Darum gilt auch hier: Die externe JSON-Master-Sicherung bleibt der kontrollierte Transfer-/Recovery-Weg.

### Dateiausgabe
Apple/iOS/iPadOS kann andere Speicher-/Share-Wege benötigen als Windows. Web Share bzw. systemeigene Teilen-/Dateiablage kann dort sinnvoll sein, sofern auf der Zielversion praktisch getestet.

## 4. Browser/Web
Die Browserfassung kann Entwicklungs-, Test- oder eigenständiger Auslieferungsweg sein. Sie darf aber nicht automatisch mit einer installierten Windows- oder Apple-Standalone-Version gleichgesetzt werden.

Zu beachten:
- Browserdaten können durch Browser-/Website-Datenlöschung verloren gehen.
- Cache/Service Worker können alte Stände halten.
- Speicher-/Downloadverhalten ist browserabhängig.

## 5. Plattformmatrix
| Bereich | Windows Desktop | Apple iPad/iPhone | Browser/Web |
|---|---|---|---|
| Produktkern | gemeinsam | gemeinsam | gemeinsam |
| Installation | EXE/NSIS | Home Screen/PWA/Standalone bzw. Web | URL |
| Runtime | Electron | Safari/WebKit/Standalone | Browser |
| Offline-Ressourcen | mit App gebündelt | Service Worker/Cache nach validiertem Konzept | optional, abhängig vom Webkonzept |
| Arbeitsdaten | LocalStorage/IndexedDB im App-Kontext | LocalStorage/IndexedDB im Apple-Webkontext | Browserprofil |
| externe Master-Sicherung | JSON | JSON | JSON |
| PDF | lokale Engine | lokale Engine + Apple-Speicherweg | lokale Engine/Browserweg |
| Excel | lokale Engine | lokale Engine + Apple-Speicherweg | lokale Engine/Browserweg |
| Update | neuer Installer | Web-/Cache-/Service-Worker-Version | Deployment/Cache |
| Käuferübergabe | Windows-Anleitung | Apple-Anleitung | Web-Anleitung |

## 6. Keine plattformfalschen Aussagen
Beispiele:
- `userData` gilt für Electron, nicht für Safari/PWA.
- NSIS gilt für Windows, nicht für Apple.
- Service Worker ist für Web/PWA relevant, nicht Voraussetzung für die gebündelte Electron-App.
- Web Share kann auf Apple hilfreich sein, ist aber nicht der Windows-Standardweg.

## 7. Verworfene Wege richtig klassifizieren
### Als finaler Windows-Weg verworfen/ersetzt
- manuelle ZIP-/CMD-Auslieferung, wenn ein komfortabler Installer verfügbar ist
- PWA als Ersatz für die native wirkende Windows-Desktop-Auslieferung
- Browserdruck als alleiniger professioneller PDF-Produktweg, wenn die eigene PDF-Engine benötigt wird

### Nicht generell verworfen
- PWA/Service Worker/Manifest: weiterhin Apple-/Web-relevant
- Web Share: weiterhin Apple-/Mobil-relevant
- Browserfassung: weiterhin Entwicklungs-/Test-/ggf. Web-Auslieferungsweg

Master-Regel: **Eine Technik wird immer im Kontext der Zielplattform bewertet.**

## 8. Plattformadapter
Zukünftige Produkte sollen plattformspezifische Funktionen hinter klaren Adaptern kapseln, insbesondere:
- `saveFile()`
- `shareFile()`
- `installHelp()`
- `offlineStatus()`
- `platformInfo()`

Der fachliche Produktkern soll nicht überall selbst Betriebssystemabfragen enthalten.

## 9. Käuferweg
Ein Produkt mit beiden Auslieferungswegen benötigt eine klare Auswahl:

**Windows-PC → Windows-Übergabe → Setup → Desktop-App**

**iPad/iPhone → Apple-Übergabe → Web/Home-Screen/Standalone-Einrichtung → Offline-Test**

Beide Wege führen anschließend in denselben fachlichen Produktaufbau und dieselbe Sicherungslogik.

## 10. Abnahme
Ein erfolgreich getesteter Windows-Stand beweist nicht den Apple-Stand und umgekehrt. Jede angebotene Plattform erhält eine eigene Abnahme im Release-Manifest.

## 11. Master-Ziel
Der heutige Ordnername `fsa-windows-desktop-product-master` bleibt als historische Herkunft zunächst bestehen. Inhaltlich entwickelt sich der Master jedoch zum **FSA Offline Product Master mit Windows- und Apple-Auslieferungsweg**.

Eine spätere Umbenennung des Ordners erfolgt nur bewusst und separat, damit bestehende Referenzen nicht unnötig gebrochen werden.
