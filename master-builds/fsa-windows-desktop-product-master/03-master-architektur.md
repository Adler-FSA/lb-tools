# 03 – Master-Architektur

## Ziel
Diese Architektur beschreibt den verbindlichen Aufbau eines zukünftigen FSA-Windows-Desktop-Produkts. Sie wurde aus dem final funktionierenden Referenzprodukt „Meine digitale & finanzielle Notfallakte – Windows Desktop-Version“ extrahiert.

Die Architektur trennt bewusst Produktinhalt, wiederverwendbare Engines, Desktop-Hülle, Build und Käufer-Auslieferung.

## 1. Produktkern
Der Produktkern enthält die eigentliche Fachanwendung:
- HTML-Struktur
- CSS/Design
- JavaScript-Logik
- Module und Formulare
- gemeinsamer State/Datenmodell
- Benutzerführung
- Akademie-Erklärungen
- Demo-/Blanko-Prinzip

Der Produktkern muss zunächst als eigenständige Anwendung funktionieren. Windows-spezifische Texte oder Installationslogik gehören nicht direkt in den Kern, sofern sie sauber über die Desktop-Schicht getrennt werden können.

## 2. Daten- und Persistenzschicht
Der Nutzer muss seinen Arbeitsstand dauerhaft selbst weiterbearbeiten können.

Referenzprinzip:
- unmittelbare lokale Speicherung
- zusätzliche lokale Persistenz/Spiegelung soweit im Produkt vorgesehen
- keine Abhängigkeit von einer Cloud für die Kernfunktion
- vollständige transportable Master-Sicherung

Für das Referenzprodukt ist JSON die vollständige Master-Sicherung.

## 3. Sicherungs- und Wiederherstellungsschicht
Eine Sicherung ist nur dann vollständig, wenn sie den vorgesehenen Produktzustand wiederherstellen kann.

Pflichtprinzipien:
- Export der vollständigen Master-Sicherung
- Import/Wiederherstellung
- Gerätewechsel/Neuinstallation berücksichtigen
- verständliche sichtbare Bestätigung nach Sicherungsaktionen
- PDF/Excel niemals stillschweigend als vollständiges Backup darstellen

## 4. Demo-/Trainingsschicht
Die Demo ist Bestandteil der Produktarchitektur.

Sie soll:
- eine realistische vollständig ausgefüllte Nutzung zeigen
- Eingabefelder und Zusammenhänge verständlich machen
- dem Nutzer den Einstieg erleichtern
- bei geeigneten Produkten als technischer Belastungstest dienen

Demo-Daten und persönliche Nutzerdaten müssen logisch sauber unterscheidbar bleiben.

## 5. Excel-/Kontrollschicht
Excel dient als strukturierte Kontroll-, Arbeits- oder Übergabeausgabe, sofern das Produkt sie benötigt.

Sie ist eine Ausgabe des Datenbestands, nicht automatisch dessen vollständige technische Sicherung.

## 6. PDF-Dokument-Engine
PDF wird als eigene Engine behandelt.

Der Referenzstandard umfasst:
- A4-Dokumentlogik
- reproduzierbare Seitenmessung
- Pagination/Seitenpackung
- Seitenzahlen
- Fortsetzungsseiten
- lange Texte
- viele Datensätze
- definierte Abschlusslogik
- stabilen Dateinamen
- sichtbare Fertigmeldung
- Stress-/Regressionstest

PDF-Core und professionelle Layout-/Dokument-Engine werden getrennt von produktspezifischen Textinhalten betrachtet. Änderungen am Core benötigen vollständige Regressionstests.

## 7. Desktop-Hülle
Die Windows-Version verwendet Electron als Desktop-Hülle um den freigegebenen Produktkern.

Referenzprinzipien:
- eigener Anwendungsbereich
- eigene lokale Datenumgebung
- Trennung von normalen Browserdaten
- Sandbox/Context-Isolation gemäß Referenzkonfiguration
- keine unnötige Node-Integration in der Produktoberfläche
- externe Weblinks außerhalb der App öffnen
- Desktop-spezifische UX separat behandeln

## 8. Desktop-UX
Die Desktop-Anwendung darf keine überholten Browser-/PWA-/iFrame-Texte enthalten.

Vor jedem Release erfolgt deshalb ein eigener Relikt-Check auf:
- Browserhinweise
- PWA-Installationshinweise
- Website-/iFrame-Texte
- falsche Speicherhinweise
- nicht mehr zutreffende Download-/Installationsanweisungen

## 9. Build-Schicht
Die Windows-Anwendung wird reproduzierbar gebaut.

Referenzweg:
GitHub → GitHub Actions → Node → freigegebenen Produktkern zusammenstellen → Electron-Abhängigkeiten → electron-builder → NSIS x64 → Setup-EXE.

Keine finale Käufer-EXE soll durch nicht dokumentiertes manuelles Zusammenkopieren entstehen.

## 10. Installer-Schicht
Der Käufer erhält nach Möglichkeit eine einzelne geführte Setup-Datei.

Referenzfunktionen:
- Setup-EXE
- Installation nur für den aktuellen Nutzer als empfohlener persönlicher Weg
- Installationsordner
- Desktop-Verknüpfung
- Startmenü-Verknüpfung
- Start nach Abschluss

## 11. Update-Schicht
Programmdateien und Nutzerdaten müssen so getrennt sein, dass ein vorgesehenes Update nicht automatisch den persönlichen Datenbestand zerstört.

Jede Updatefreigabe benötigt einen Test mit vorhandenen realistischen Testdaten.

## 12. Offline-Schicht
Offline-Nutzung muss technisch real vorhanden und getestet sein.

Abnahmeprinzip:
Installation abschließen → Anwendung schließen → Netzwerk/WLAN trennen → Anwendung neu über Desktop/Startmenü öffnen → Kernfunktionen prüfen.

## 13. Produkt-Begleitseite
Fester Bestandteil des Produktformats.

Standarddramaturgie:
Produktbild → Sinn/Problem → Nutzen → typische Situationen → Leistungsverständnis → Datensouveränität/Sicherheit → einfacher Einstieg → Call-to-Action zur Produktübergabe.

Diese Seite verkauft nicht nur; sie erklärt, warum das Produkt relevant ist.

## 14. Produkt-Übergabeseite
Von der Begleitseite getrennte Käuferseite.

Standarddramaturgie:
Begrüßung → Setup-Download → was wird eingerichtet → Installation Schritt für Schritt → SmartScreen → Virenschutz → erster Start → Offline → lokale Daten → Master-Sicherung → FAQ/Hilfe → Sicherheitsprinzip.

## 15. Produktbild und Verkaufsmedien
Das Produktbild soll das reale Produkt wiedererkennbar machen. Wenn sinnvoll, wird eine tatsächliche Softwareansicht verwendet.

Daraus können Shopbild, Videocover und weitere Verkaufsmedien abgeleitet werden.

## 16. Shop- und Verkaufsschicht
Zum vollständigen Produkt gehören:
- kurze Produkt-/Nutzenbeschreibung
- ausführliche Leistungsbeschreibung „Leistungen auf einen Klick“
- technische Voraussetzungen
- sachliche Abgrenzungen/Haftungshinweise je Produkt
- KI-Sprechertext für Produktvideo
- eindeutiger Call-to-Action

## 17. Abnahme
Ein Produkt wird nicht freigegeben, weil es einmal startet. Die verbindliche Abnahmematrix ist in `04-abnahme-testmatrix.md` definiert.

## 18. Gesamtfluss
**Produktidee → Produktkern → Demo → Datenmodell/Persistenz → JSON-Master → Excel → PDF → Desktop-UX → Electron-Hülle → reproduzierbarer Build → Installer → technische Abnahme → Produktbild → Begleitseite → Übergabeseite → Shop/Video → Käuferfreigabe.**

## 19. Schutzregel
Das jeweilige fertige Referenzprodukt wird nicht als Experimentierfläche für neue Master-Entwicklungen benutzt. Änderungen am Master oder an Engines werden separat entwickelt und erst nach vollständiger Prüfung in neue Produkte übernommen.