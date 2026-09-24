# Baustein 6.5 — Demo-Haus, Lernreise und Vertragswerkzeuge

Stand: 24.09.2026

## Status

Baustein 6.5 ist technisch für die praktische Nutzerprüfung vorbereitet. Die Demo ist jetzt als vollständig ausgefülltes Anschauungsmodell ausgelegt; die Lernreise ist optional.

Baustein 7 — Gesamtabnahme — wurde noch nicht begonnen.

## Grundprinzip

Demo und echtes Projekt verwenden dieselben Produktionsseiten, dieselben Rechenkerne und dieselben Dokumentfunktionen. Nur der lokale Speicher ist getrennt.

Die neue Wohnraum-Mietvertragswerkstatt und der Hausordnungs-Konfigurator sind eigenständige Immobilien-Werkzeuge. Die frühere Club-Leader-Vertragswerkstatt unter `pages/vertraege/` wurde nur als Funktions-/Bedienreferenz untersucht. Ihr Vertragsinhalt wurde nicht übernommen.

## Demo-Haus Lindenblick

Aktuelle Demo-Version:

`LINDENBLICK_V6_2026-09-24`

Vollständig fiktiver Referenzfall:

- eine Immobilie: Demo-Haus Lindenblick
- Adresse und alle Personendaten ausdrücklich fiktiv
- 3 Einheiten / 235 m²
- EG: 95 m² Eigennutzung
- Wohnung A: 75 m² vermietet
- Wohnung B: 65 m² vermietet
- 3 Mietverhältnisse insgesamt
- 2025 Mieterwechsel in Wohnung B zum 01.07.2025
- dokumentierte Zwischenablesung zum Nutzerwechsel
- zwei vollständig abgeschlossene Referenzjahre: 2024 und 2025

### Referenzrechnung 2024

- Gesamtkosten: 7.500,00 €
- Eigentümeranteil: 4.112,83 €
- Mieteranteile gesamt: 3.387,17 €
- Familie Berger: Kosten 1.811,23 € / Vorauszahlungen 2.640,00 € / Guthaben 828,77 €
- Jonas Schneider: Kosten 1.575,94 € / Vorauszahlungen 2.160,00 € / Guthaben 584,06 €

### Referenzrechnung 2025

- Gesamtkosten: 6.950,00 €
- Eigentümeranteil: 3.355,35 €
- Mieteranteile gesamt: 3.594,65 €
- Familie Berger: Kosten 1.890,20 € / Vorauszahlungen 2.640,00 € / Guthaben 749,80 €
- Jonas Schneider bis 30.06.2025: Kosten 829,25 € / Vorauszahlungen 1.080,00 € / Guthaben 250,75 €
- Nina Vogel ab 01.07.2025: Kosten 875,20 € / Vorauszahlungen 1.200,00 € / Guthaben 324,80 €

Der Nutzerwechsel wird zeitlich und über die Kaltwasser-Zwischenablesung getrennt verarbeitet.

## Demo-Inhalte V6

Der Ausgangsstand enthält unter anderem:

- 1 Immobilie
- 3 Einheiten
- 3 Mietverhältnisse
- 12 Kostenpositionen
- 10 bestätigte Umlageregeln
- 3 Kaltwasserzähler
- 13 Ablesungen
- 17 Zahlungsdatensätze
- 5 bestehende Mietservice-Entwürfe
- 1 vorkonfigurierten Wohnraum-Mietvertragswerkstatt-Entwurf
- 1 vorkonfigurierten Hausordnungs-Konfigurator-Entwurf
- 2 freigegebene Dokument-Snapshots
- 2 dokumentierte Übergaben
- 9 Eigentümer-Sicherheits-/Pflichtenchecks
- 1 datensparsamen Vermietungsvorgang bis C_SELECTED
- kein Bewerber-Score
- kein Ranking
- keine automatische Mieterauswahl

## Getrennter Demo-Speicher

Normalprojekt:

`akademie:nebenskosten-premium:v1:project`

Demo:

`akademie:nebenskosten-premium:v1:demo:project`

Geprüft:

- beide Speicher können gleichzeitig existieren
- Demo-Änderungen verändern das Live-Projekt nicht
- „Demo zurücksetzen“ schreibt ausschließlich den Demo-Schlüssel
- normale Projektdaten und freigegebene Dokumente werden vom Demo-Reset nicht verändert

## Vollständig ausgefüllte Anschauungsdemo

Die Demo startet nicht mehr primär als Trainings-/Lernansicht.

Standard:

- `demo.html` öffnet als freies Anschauungsmodell
- die Lernreise ist optional über „Lernreise starten“
- direkte Links aus der Bedienungsanleitung können weiterhin einen konkreten Lernschritt öffnen

Der Demo-Datensatz wurde auf V6 erweitert um:

- Gebäudetyp „Mehrfamilienhaus“
- bestätigte fiktive Wasser-Versorgerakte 2024 und 2025
- vollständige Tarif-/Preisreferenzen
- periodengerecht getrennte Versorgerkonten
- vollständigere Mietvertragsdaten einschließlich fiktiver Bankverbindung, Stellplatz, Inventar und weiterer Vereinbarungen
- aktiviertes Kleinreparatur-/Schönheitsreparaturbeispiel mit separatem Prüfbedarf

Die Kostenseite öffnet im Demo-Modus bewusst das Referenzjahr 2025 statt automatisch das aktuelle Kalenderjahr 2026.

### Demo-spezifische Formularbefüllung

`assets/js/demo-showcase.js`

Formularintensive Produktseiten werden innerhalb der Demo mit vollständig ausgefüllten Anschauungswerten vorbelegt:

- Immobilien
- Kosten & Versorger
- Zähler & Verbrauch
- Vermieterabrechnung
- Mietservice
- Vermietungscheck
- Sicherung / Einstellungen

Dabei gilt:

- gespeicherte Demo-Daten werden mit ihren tatsächlichen Beispielwerten gezeigt
- reine Aktionsformulare erhalten vollständige fiktive Beispielwerte
- die Vorbelegung schreibt nichts in den Speicher, solange der Nutzer nicht selbst speichert
- ein Demo-Reset stellt den geprüften Ausgangsstand wieder her
- fachlich nicht anwendbare Sonderbereiche werden nicht mit erfundenen Fachwerten befüllt

Beispiel: Heiz-/Warmwasser-, verbundene Anlagen- und CO₂-Sonderpfade werden im Referenzjahr 2025 als „nicht erforderlich“ gekennzeichnet, weil der Demo-Fall diese Kostenarten bewusst nicht enthält.

Ein Browser-Dateiupload kann aus Sicherheitsgründen nicht programmatisch mit einer echten Datei befüllt werden. In der Demo wird deshalb an dieser Stelle eine fiktive Sicherungsdatei als Anschauungswert angezeigt.

## Lernreise und Bedienungsanleitung

Gemeinsame Quelle:

`assets/js/demo-guide.js`

Die geführte Demo und die klassische Bedienungsanleitung verwenden dieselbe Lernquelle.

13 Lernschritte:

1. Orientierung
2. Immobilie
3. Nutzung und Mieterwechsel
4. Kosten und Belege
5. Verbrauch und Zwischenablesung
6. Eigentümer-Sicht
7. Vermieter-Abrechnung
8. Mietvertrag, Hausordnung und Übergabe
9. Sicherheit und Pflichten
10. datensparsamer Vermietungsprozess
11. PDF-Zentrale
12. Archiv
13. Sicherung und Folgejahr

Der Dokument-Lernschritt führt jetzt direkt zu:

- `mietvertragswerkstatt.html?demo=1&tenancy=demo_lease_berger`
- `hausordnung-konfigurator.html?demo=1`

Alte Verweise auf eine nicht vorhandene Wohnraum-Vertragswerkstatt wurden entfernt.

## Wohnraum-Mietvertragswerkstatt

Produktionsseite:

`mietvertragswerkstatt.html`

Kern:

`assets/js/lease-workshop.js`

UI:

`assets/js/mietvertragswerkstatt-ui.js`

Version:

`DE_WOHNRAUM_V1_2026-09-24`

### Funktionsumfang

Konfigurierbar sind aktuell:

- Vermieter und Mieter
- Mietobjekt, Lage, Fläche, Zimmer, Keller, Stellplatz
- unbefristetes Mietverhältnis
- befristeter Zeitmietvertrag mit gesondertem Befristungsgrund
- Nettokaltmiete
- Betriebskostenvorauszahlung / Pauschale / keine gesonderte Umlage
- Bankverbindung
- gesetzliche Mietanpassung / Staffelmiete / Indexmiete
- Mietsicherheit
- Personenzahl
- Kleinreparaturregelung
- Schönheitsreparaturregelung
- Tierhaltung
- Hausordnung als Anlage
- Übergabeprotokoll
- Inventarliste
- Schlüssel
- mitvermietete Ausstattung
- zusätzliche individuelle Vereinbarungen

### Technische Schutzregeln

Die Werkstatt blockiert unter anderem:

- fehlende zentrale Vertragsdaten
- Kaution über drei Nettokaltmieten
- befristeten Vertrag ohne vorgesehenen Befristungsgrund
- befristeten Vertrag ohne konkrete Begründung
- Staffelmieten mit weniger als zwölf Monaten Abstand
- ungültige Geldbeträge

Komplexe Themen werden nicht automatisch als rechtlich sicher bewertet, sondern separat als Prüfbedarf geführt, z. B.:

- zulässige Miethöhe / örtliche Begrenzungen
- Staffelmiete
- Indexmiete
- Kleinreparaturklausel
- Schönheitsreparaturklausel
- Zeitmietvertrag

### Trennung Dokument / Prüfebene

Verbindliches Produktprinzip:

**Prüfhinweise, Anwaltshinweise und interne Freigabevermerke gehören nicht in den Mietvertrag.**

Die Werkstatt hat deshalb zwei getrennte Bereiche:

- links: Konfiguration, Fehler, Prüfbedarf und gesetzliche Referenzen
- rechts: ausschließlich das Vertragsdokument

Der tatsächlich erzeugte Vertrags-HTML wurde mit aktivierter Kleinreparatur- und Schönheitsreparaturfunktion geprüft. Ergebnis:

- separate Prüfwarnungen vorhanden
- kein „vor Verwendung prüfen“
- kein Anwaltshinweis
- kein „fachlich/rechtlich prüfen“
- kein Prüfbedarf-Hinweis im Vertragsdokument

### Rechtsstatus

Die aktuelle Fassung ist eine **konfigurierbare Muster-/Prüffassung**.

Sie ist **noch keine anwaltlich freigegebene Masterfassung** und wird nicht als pauschal „rechtssicher“ garantiert.

Der vorgesehene spätere Prozess ist:

1. Masterfassung funktional fertigstellen
2. konkrete Fassung extern fachlich/juristisch prüfen lassen
3. geprüfte Version eindeutig versionieren
4. spätere materielle Klauseländerungen erneut als prüfbedürftig kennzeichnen

Gesetzliche Referenzen werden in der Werkstatt separat verlinkt und erscheinen nicht im Vertragsdokument.

## Hausordnungs-Konfigurator

Produktionsseite:

`hausordnung-konfigurator.html`

Kern:

`assets/js/house-rules-workshop.js`

UI:

`assets/js/hausordnung-konfigurator-ui.js`

Version:

`DE_HAUSORDNUNG_V1_2026-09-24`

### Funktionsumfang

Konfigurierbar:

- Bewohnerinformation oder Vertragsanlage
- Ruhezeiten
- optionale Mittagsruhe
- Gemeinschaftsflächen
- Müll und Entsorgung
- Fahrräder und abgestellte Gegenstände
- Waschküche / Gemeinschaftsgeräte
- Garten / Außenflächen
- Grillen
- Tiere in Gemeinschaftsbereichen
- Flucht- und Rettungswege
- Haus- und Zugangstüren
- Rauchen in Gemeinschaftsbereichen
- Reinigungsregel
- Winterdienst
- eigene zusätzliche Regeln

### Schutzprinzip

Werden Reinigung oder Winterdienst Bewohnern als Pflicht zugeordnet, markiert das System dies separat als Prüfbedarf.

Der Konfigurator behauptet nicht automatisch, dass eine solche Pflicht wirksam übertragen wurde.

Auch hier bleiben Prüfinformationen außerhalb des eigentlichen Dokuments.

## PDF-Ausgabe

Beide neuen Werkzeuge verwenden die bereits vorhandene generische Vertrags-PDF-Engine:

`pages/vertraege/contract-pdf-engine-v2.js`

Die Engine enthält selbst keine Club-Leader- oder Mietvertragslogik.

Die fertige PDF wird an die bestehende Akademie-PDF-Übergabe gereicht:

`pages/merchant-kompass/akademie-pdf-uebergabe.js`

Es wurde keine zweite Vertrags-PDF-Engine gebaut.

Bei den neuen Werkzeugen wird kein externes Logo für die PDF geladen (`logoUrl:''`).

## Mietservice-Verknüpfung

`mietservice.html` bietet jetzt zusätzlich zwei direkte Einstiege:

- „Mietvertragswerkstatt öffnen“
- „Hausordnung konfigurieren“

Die bisherigen einfachen Mietservice-Entwürfe bleiben erhalten. Sie wurden nicht gelöscht oder umgebaut.

## Demo V6 — Vertragswerkzeuge

Das Demo-Haus enthält vorkonfiguriert:

### Mietvertrag Familie Berger

- Vermieter: Eva Linden · fiktiv
- Mieter: Familie Berger · fiktiv
- Wohnung A / 1. OG links
- 75 m²
- 3 Zimmer
- Mietbeginn 01.01.2024
- Nettokaltmiete 980,00 €
- Betriebskostenvorauszahlung 220,00 €
- Kaution 2.940,00 € = drei Nettokaltmieten
- Hausordnung als Anlage
- Übergabeprotokoll als Anlage
- Schlüssel und mitvermietete Ausstattung

### Hausordnung Demo-Haus Lindenblick

- Vertragsanlage
- Ruhe / Rücksicht
- Gemeinschaftsflächen
- Müll
- Fahrräder
- Waschküche
- Außenflächen
- Grillen
- Tiere in Gemeinschaftsbereichen
- Sicherheitsbereiche
- keine automatisch zugewiesene Reinigungs- oder Winterdienstpflicht im Ausgangsstand

## DE / EN

Statisch geprüft:

- Mietvertragswerkstatt: 73 verwendete i18n-Schlüssel, 0 fehlend
- Hausordnungs-Konfigurator: 46 verwendete i18n-Schlüssel, 0 fehlend
- Mietservice nach Verknüpfung: 76 verwendete i18n-Schlüssel, 0 fehlend

Die Lernreise zeigt nur auf vorhandene Produktseiten.

## Projektschema / Speicherung

Gezielt zur Laufzeit geprüft:

- Wohnraum-Mietvertragsentwurf passiert das bestehende Projektschema
- Hausordnungsentwurf passiert das bestehende Projektschema
- beide können mit dem bestehenden `saveProject/loadProject` gespeichert und wieder gelesen werden
- keine zweite Datenbank oder Schattenablage erforderlich
- Demo V6 passiert weiterhin das bestehende Projektschema
- Referenzrechnungen 2024 / 2025 bleiben unverändert

## Feste Regressionen Baustein 6.5

- `tests/demo-project.test.mjs` — 9 Tests
- `tests/demo-storage.test.mjs` — 3 Tests
- `tests/demo-learning.test.mjs` — 8 Tests
- `tests/lease-workshop.test.mjs` — 7 Tests
- `tests/house-rules-workshop.test.mjs` — 4 Tests

**Summe: 31 feste Regressionen für Baustein 6.5.**

## In dieser Prüfengine tatsächlich ausgeführte gezielte Checks

Bestanden wurden unter anderem:

- Demo V6 vollständig erzeugt
- Projektschema Demo V6 gültig
- 2024 Referenzrechnung unverändert
- 2025 Referenzrechnung unverändert
- Mieterwechsel / Zwischenablesung unverändert
- Demo-/Live-Speicher weiterhin getrennt
- Mietvertrags-Standardkonfiguration gültig
- Kaution über drei Nettokaltmieten blockiert
- Zeitmietvertrag ohne Grund blockiert
- Hausordnung Standard gültig
- Reinigungs-/Winterdienst-Zuordnung erzeugt separaten Prüfbedarf
- Mietvertragsentwurf durch bestehendes Schema und Storage
- Hausordnungsentwurf durch bestehendes Schema und Storage
- Vertragsdokument frei von Meta-/Prüfhinweisen
- Syntax der vier neuen Werkstattmodule sauber
- DE/EN-Schlüssel der neuen Seiten vollständig
- alle Lernreise-Ziele vorhanden
- keine alte `wohnraum-vertragswerkstatt`-Referenz mehr vorhanden

## Bewusst nicht als bestanden behauptet

- kein vollständiger lokaler `npm test`-Lauf der gesamten Anwendung in dieser Prüfengine
- keine anwaltliche Freigabe des Mietvertragsmasters
- keine anwaltliche Freigabe der Hausordnungs-Masterfassung
- keine abschließende visuelle Live-Abnahme auf iPad/Laptop

Diese Punkte sind von der technischen Werkstattfunktion getrennt.

## Nächster praktischer Schritt

Baustein 6.5 bleibt geöffnet, bis die neue Mietvertragswerkstatt und der Hausordnungs-Konfigurator praktisch im Demo-Haus angesehen wurden und daraus ggf. Bedien-/Inhaltskorrekturen entstehen.

Baustein 7 beginnt erst nach ausdrücklicher Freigabe „Baustein fertig“.
