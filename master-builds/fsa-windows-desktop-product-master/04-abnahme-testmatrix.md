# 04 – Abnahme- und Testmatrix

## Grundregel
Ein FSA-Windows-Desktop-Produkt ist erst freigabefähig, wenn die für das Produkt relevanten Prüfungen dokumentiert erfolgreich durchgeführt wurden.

Status je Test:
- `[ ]` nicht geprüft
- `[x]` bestanden
- `[!]` Fehler / Nacharbeit erforderlich
- `[-]` für dieses Produkt nicht relevant – Begründung dokumentieren

---

## A. Produktkern
- [ ] Anwendung startet ohne JavaScript-Fehler
- [ ] alle vorgesehenen Module/Bereiche erreichbar
- [ ] Navigation vollständig
- [ ] Eingabefelder funktionieren
- [ ] Buttons/Aktionen funktionieren
- [ ] jede speichernde/exportierende Nutzeraktion erhält eine sichtbare Rückmeldung
- [ ] Pflicht-/Hinweistexte stimmen mit dem finalen Produkt überein
- [ ] keine internen Entwicklerhinweise in Käuferansicht
- [ ] keine veralteten Produkttexte

## B. Demo / Blanko
- [ ] Demo vollständig erreichbar
- [ ] Demo zeigt realistische Beispieldaten
- [ ] Demo erklärt die vorgesehene Nutzung
- [ ] Blanko-/eigener Arbeitsbereich ist klar von der Demo unterscheidbar
- [ ] Demo überschreibt keine persönlichen Daten
- [ ] Stress-Test-Demo vorhanden, falls für Ausgabe/Skalierung erforderlich

## C. Lokale Speicherung
- [ ] Testdaten eingeben
- [ ] Anwendung schließen
- [ ] Anwendung erneut starten
- [ ] Testdaten vollständig vorhanden
- [ ] Änderungen erneut speichern
- [ ] zweiter Neustart bestätigt Persistenz

## D. Browserdaten-Unabhängigkeit
- [ ] Testdaten in Desktop-App vorhanden
- [ ] normalen Browser schließen
- [ ] Browser-Verlauf/Cookies/Websitedaten im vorgesehenen Testbrowser löschen
- [ ] Desktop-App erneut starten
- [ ] Desktop-Daten weiterhin vorhanden

Hinweis: Nur mit Testdaten durchführen.

## E. JSON-Master-Sicherung
- [ ] vollständigen JSON-Export erstellen
- [ ] Dateiname plausibel
- [ ] sichtbare Fertigmeldung
- [ ] Sicherungsdatei extern ablegen
- [ ] Testdaten im Testsystem verändern/zurücksetzen
- [ ] JSON importieren
- [ ] Daten vollständig wiederhergestellt
- [ ] Wiederherstellung nach Neustart weiterhin vorhanden

## F. Excel-Ausgabe
- [ ] Excel-Datei wird erzeugt
- [ ] Dateiname korrekt
- [ ] Datei lässt sich öffnen
- [ ] erwartete Bereiche/Spalten vorhanden
- [ ] Sonderzeichen/Umlaute korrekt
- [ ] lange Inhalte bleiben nachvollziehbar
- [ ] Excel wird nicht als vollständige Master-Sicherung bezeichnet, sofern sie dies nicht ist

## G. PDF-Engine
- [ ] PDF wird erzeugt
- [ ] stabiler korrekter Dateiname
- [ ] A4-Format korrekt
- [ ] Seitenränder/Layout korrekt
- [ ] Seite X von Y korrekt
- [ ] lange Texte getestet
- [ ] viele Datensätze getestet
- [ ] Seitenumbrüche sauber
- [ ] Fortsetzungsseiten sauber
- [ ] keine abgeschnittenen Inhalte
- [ ] keine ungewollten Leerseiten
- [ ] Abschlussseite/Abschlusslogik korrekt
- [ ] sichtbare Fertigmeldung
- [ ] PDF lässt sich unabhängig öffnen
- [ ] Stress-Test mit realistisch großer Datenmenge bestanden

## H. Desktop-Reliktprüfung
- [ ] keine falschen Browserhinweise
- [ ] keine alten PWA-Installationshinweise
- [ ] keine iFrame-spezifischen Texte, die im Desktopprodukt falsch sind
- [ ] keine falschen Speicherort-Aussagen
- [ ] keine internen Test-/Entwicklertexte
- [ ] Produktname überall korrekt

## I. Windows-Build
- [ ] GitHub-Workflow startet erfolgreich
- [ ] vorgesehener freigegebener Produktkern wird übernommen
- [ ] alle benötigten Engines werden übernommen
- [ ] Abhängigkeiten installieren erfolgreich
- [ ] electron-builder erfolgreich
- [ ] NSIS-x64-Setup erzeugt
- [ ] Build-Artefakt vorhanden
- [ ] finale Setup-Datei entspricht dem vorgesehenen Release

## J. Neuinstallation
- [ ] Setup-EXE auf Windows-Rechner herunterladen
- [ ] Setup per Doppelklick starten
- [ ] SmartScreen-Situation dokumentiert/geprüft
- [ ] Virenschutz-Prüfung abwarten
- [ ] Installer startet
- [ ] „Nur für mich“ bzw. vorgesehene Installationsart funktioniert
- [ ] Installationsordner funktioniert
- [ ] Installation erfolgreich
- [ ] Desktop-Verknüpfung vorhanden
- [ ] Startmenü-Verknüpfung vorhanden
- [ ] Start nach Installation funktioniert

## K. Virenschutz / Windows-Sicherheit
- [ ] Setup mit aktivem Windows-Schutz testen
- [ ] zusätzlich vorhandenen Virenschutz nicht deaktivieren
- [ ] eventuelle Prüfung/Quarantäne/Warnung dokumentieren
- [ ] Käuferanleitung entspricht dem real beobachteten Ablauf
- [ ] keine Anleitung fordert pauschal zum Abschalten der Schutzsoftware auf

## L. Offline-Test
- [ ] Anwendung online einmal vollständig installiert
- [ ] Anwendung schließen
- [ ] WLAN/Netzwerk ausschalten
- [ ] Anwendung über Desktop-Verknüpfung starten
- [ ] Start funktioniert
- [ ] Navigation funktioniert
- [ ] Eingaben funktionieren
- [ ] lokale Speicherung funktioniert
- [ ] relevante lokale Exporte funktionieren
- [ ] Anwendung schließen und offline erneut starten
- [ ] Daten weiterhin vorhanden

## M. Update über bestehende Installation
- [ ] Ausgangsversion installieren
- [ ] realistische Testdaten anlegen
- [ ] JSON-Master-Sicherung zusätzlich erstellen
- [ ] neue Setup-Version über bestehenden Stand installieren
- [ ] Anwendung startet
- [ ] vorhandene Testdaten weiterhin vorhanden
- [ ] Kernfunktionen funktionieren
- [ ] PDF/Excel/JSON erneut prüfen
- [ ] Desktop-/Startmenü-Verknüpfungen weiterhin korrekt

## N. Käufer-Begleitseite
- [ ] finales Produktbild oben
- [ ] keine doppelte Startbotschaft
- [ ] Sinn/Problem verständlich
- [ ] Nutzen verständlich
- [ ] Leistungsverständnis korrekt
- [ ] Datenschutz-/Sicherheitsdarstellung entspricht der Technik
- [ ] keine falschen Rechts-/Leistungsversprechen
- [ ] Call-to-Action führt zur Übergabeseite
- [ ] mobil lesbar

## O. Produkt-Übergabeseite
- [ ] Käuferbegrüßung vorhanden
- [ ] richtige Setup-Datei verlinkt
- [ ] Dateiname stimmt
- [ ] Download funktioniert
- [ ] Installationsschritte entsprechen dem realen Installer
- [ ] SmartScreen-Hinweis korrekt
- [ ] Virenschutz-Hinweis korrekt
- [ ] erster Start erklärt
- [ ] Offline-Nutzung korrekt erklärt
- [ ] lokale Datenführung korrekt erklärt
- [ ] JSON-Master-Sicherung erklärt
- [ ] FAQ/Klappbereiche funktionieren
- [ ] keine internen Hinweise
- [ ] mobil lesbar

## P. Produktbild / Shop / Video
- [ ] Produktbild entspricht dem realen Produkt
- [ ] Shop-Kurzbeschreibung vorhanden
- [ ] Nutzenbeschreibung vorhanden
- [ ] „Leistungen auf einen Klick“ vorhanden
- [ ] technische Voraussetzungen korrekt
- [ ] notwendige Abgrenzungen/Hinweise vorhanden
- [ ] KI-Sprechertext flüssig sprechbar
- [ ] Produktnutzen enthalten
- [ ] eindeutiger Call-to-Action enthalten

## Q. Endfreigabe
Vor Freigabe müssen mindestens folgende Kernbereiche bestanden sein:
- [ ] Produktkern
- [ ] Persistenz
- [ ] Master-Sicherung/Wiederherstellung
- [ ] relevante Ausgaben
- [ ] PDF-Stresstest, wenn PDF Bestandteil ist
- [ ] Windows-Build
- [ ] Neuinstallation
- [ ] Offline-Test
- [ ] Update-Test
- [ ] Begleitseite
- [ ] Übergabeseite
- [ ] Käufer-Setup-Download

## Abnahmeprotokoll
Produkt: ______________________________

Version: ______________________________

Setup-Datei: __________________________

Windows-Testsystem: ___________________

Datum: ________________________________

Getestet durch: _______________________

Ergebnis: `[ ] FREIGEGEBEN`  `[ ] NICHT FREIGEGEBEN`

Offene Punkte / Abweichungen:

____________________________________________________________

____________________________________________________________

## Schlussregel
Eine erfolgreiche GitHub Action allein ist keine Produktfreigabe. Eine erfolgreiche Installation allein ist keine Produktfreigabe. Erst das Zusammenspiel aus Produktkern, Daten, Sicherung, Ausgaben, Desktop-Hülle, Installer, Offline-/Update-Test und vollständiger Käuferführung bildet die Abnahme.