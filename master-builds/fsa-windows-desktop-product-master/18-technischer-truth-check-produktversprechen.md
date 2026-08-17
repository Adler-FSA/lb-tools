# 18 – Technischer Truth-Check für Produktversprechen

## Zweck
Kein technisches Produktversprechen darf allein aus Konzept, Quellcode oder gewünschter Produktpositionierung entstehen. Aussagen werden erst freigegeben, wenn die konkrete Release-Version auf der konkreten Zielplattform technisch geprüft wurde.

## Grundregel
**Marketing beschreibt nur, was die ausgelieferte Technik nachweislich leistet.**

Der Truth-Check gilt für Shoptexte, Produktbilder, Sprechertexte, Begleitseiten, Übergabeseiten, FAQ, Akademie-Erklärungen und technische Dokumentation.

## 1. Aussagen mit Prüfpflicht
Besonders streng zu prüfen sind Formulierungen wie:
- „offline nutzbar“
- „vollständig offline“
- „Daten bleiben lokal auf deinem Gerät“
- „keine Cloud erforderlich“
- „keine Internetverbindung erforderlich“
- „dauerhaft gespeichert“
- „Gerätewechsel möglich“
- „vollständige Sicherung“
- „wiederherstellbar“
- „Windows Desktop-App“
- „auf iPad/iPhone nutzbar“
- „PDF wird lokal erstellt“
- „Excel wird lokal erstellt/importiert“

## 2. Beweisarten
Eine Aussage erhält erst den Status FREIGEGEBEN, wenn mindestens die passende technische Prüfung dokumentiert ist.

### Offline
- Anwendung initial eingerichtet/installiert
- Internet deaktiviert
- Anwendung vollständig neu gestartet
- Kernnavigation funktioniert
- Eingaben funktionieren
- Persistenz nach erneutem Offline-Neustart funktioniert
- erforderliche lokale Exporte funktionieren

### Lokale Daten
Prüfen:
- welche Speichertechniken tatsächlich verwendet werden
- ob der Produktkern Daten an APIs/Server sendet
- ob externe Analyse-/Trackingdienste existieren
- ob externe Ressourcen für Kernfunktionen geladen werden
- ob Exportdateien erst durch bewusste Nutzeraktion entstehen

### Keine Cloud
„Keine Cloud erforderlich“ ist nicht dasselbe wie „niemals Cloud“.
Wenn der Nutzer eine JSON/PDF/XLSX-Datei anschließend selbst in iCloud, OneDrive, Dropbox o. Ä. speichert, ist dies eine Nutzerentscheidung außerhalb der internen Produktdatenhaltung.

### Dauerhafte Speicherung
Nie absolut behaupten. Lokaler Speicher kann durch Deinstallation, Browser-/Website-Datenlöschung, Geräteverlust, Defekt oder Plattformverhalten verloren gehen.
Zulässiger ist: „Der Arbeitsstand wird lokal gespeichert; für Wiederherstellung und Gerätewechsel ist die externe Master-Sicherung vorgesehen.“

### Gerätewechsel
Nur freigeben, wenn Export auf Gerät A und Restore auf einer frischen Installation/einem frischen Kontext auf Gerät B bzw. einem gleichwertigen Testkontext erfolgreich geprüft wurden.

### PDF/Excel
Nur als „lokal erstellt“ bezeichnen, wenn die konkrete Engine ohne serverseitige Verarbeitung arbeitet. Speicher-/Share-Dialoge des Betriebssystems sind davon getrennt zu betrachten.

## 3. Plattformwahrheit
Jede Aussage wird getrennt bewertet für:
- Windows Desktop/Electron
- Apple iPad/iPhone Web/PWA/Standalone
- Browser/Web, falls angeboten

Ein bestandener Windows-Test ist kein Apple-Nachweis.

## 4. Quellcodeprüfung vor Laufzeittest
Vor dem praktischen Test prüfen:
- `http://` / `https://` Referenzen
- `fetch`, XHR, WebSocket, EventSource
- externe Fonts/CDNs
- externe Bilder/Skripte/Styles
- Analytics/Telemetry
- APIs
- Remote Electron Content
- Service-Worker-Routen
- Manifest-Ressourcen

Fundstellen werden klassifiziert: Kernabhängigkeit, optionale externe Navigation oder unkritische Dokumentationsreferenz.

## 5. Release-Prüfkarte
Für jede wichtige Aussage dokumentieren:

| Aussage | Plattform | technischer Nachweis | Ergebnis | zulässiger Wortlaut |
|---|---|---|---|---|
| {{CLAIM}} | {{PLATFORM}} | {{TEST}} | PASS/FAIL/OFFEN | {{APPROVED_WORDING}} |

FAIL oder OFFEN bedeutet: Aussage darf nicht als bestehende Produkteigenschaft veröffentlicht werden.

## 6. Wortlaut-Klassen
### FREIGEGEBEN
Praktisch nachgewiesen. Darf konkret verwendet werden.

### EINGESCHRÄNKT
Funktioniert unter dokumentierten Voraussetzungen. Wortlaut muss diese Voraussetzung nennen.

### NICHT FREIGEGEBEN
Nicht getestet, widersprüchlich oder technisch falsch. Nicht veröffentlichen.

## 7. Keine Übertragung alter Aussagen
Texte des Referenzprodukts werden nicht automatisch auf ein neues Produkt übertragen. Auch wenn dieselbe Masterarchitektur verwendet wird, muss das neue Release den Truth-Check erneut bestehen.

## 8. Käuferseite und Shop müssen denselben Stand beschreiben
Vor Release abgleichen:
- Produktname und Version
- unterstützte Plattform
- Installationsweg
- Offline-Fähigkeit
- Speicherprinzip
- Sicherungsformat
- PDF/Excel-Funktionen
- Einschränkungen

Widersprüche zwischen Shop, Begleitung, Übergabe und tatsächlicher Anwendung blockieren die Freigabe.

## 9. Änderung nach Freigabe
Ändert sich eine relevante technische Komponente, wird die betroffene Aussage erneut geprüft. Beispiele:
- neue PDF-Engine
- neue Excel-Engine
- neue Electron-Version
- neuer Service Worker
- neue Datenhaltung
- neue externe Ressource/API
- geänderter Installer

## 10. Referenzprodukt
Die Notfallakte dient als Referenz für die entstandene Architektur und die dort praktisch getesteten Abläufe. Sie ist jedoch kein pauschaler Beweis für jedes zukünftige Produkt.

## 11. Freigaberegel
Ein Produkt darf erst in den Verkauf/Release gehen, wenn:
1. technische Claims erfasst sind,
2. Plattform zugeordnet ist,
3. Nachweis durchgeführt wurde,
4. Wortlaut dem Ergebnis entspricht,
5. Shop/Begleitung/Übergabe/Produkt konsistent sind.

## 12. Master-Merksatz
**Erst bauen. Dann real testen. Dann behaupten.**
