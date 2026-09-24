# Baustein 6.5 — Demo-Haus, Lernreise und Bedienung

Stand: 24.09.2026

## Status

Baustein 6.5 ist technisch abnahmebereit.

Ziel dieses Zwischenbausteins ist ausdrücklich **keine zweite Anwendung**. Demo und echtes Projekt verwenden dieselben Produktionsseiten, dieselben Rechenkerne und dieselben Dokumentfunktionen. Nur der lokale Speicher ist getrennt.

Baustein 7 — Gesamtabnahme — wurde noch nicht begonnen.

## Demo-Haus Lindenblick

Vollständig fiktiver Referenzfall:

- eine Immobilie: „Demo-Haus Lindenblick“
- Adresse und alle Personendaten ausdrücklich fiktiv
- 3 Einheiten / 235 m²
- EG: 95 m² Eigennutzung
- Wohnung A: 75 m² vermietet
- Wohnung B: 65 m² vermietet
- 3 Mietverhältnisse insgesamt
- 2025 echter Mieterwechsel in Wohnung B zum 01.07.2025
- dokumentierte Zwischenablesung zum Nutzerwechsel
- zwei vollständig abgeschlossene Referenzjahre: 2024 und 2025

Aktuelle Demo-Version:

`LINDENBLICK_V4_2026-09-24`

## Referenzrechnungen

Die Demo wird beim Aufbau gegen den echten Produktions-Rechenkern geprüft.

### Jahr 2024

- Gesamtkosten: 7.500,00 €
- Eigentümeranteil: 4.112,83 €
- Mieteranteile gesamt: 3.387,17 €

Mieter:
- Familie Berger: Kosten 1.811,23 € / Vorauszahlungen 2.640,00 € / Guthaben 828,77 €
- Jonas Schneider: Kosten 1.575,94 € / Vorauszahlungen 2.160,00 € / Guthaben 584,06 €

### Jahr 2025

- Gesamtkosten: 6.950,00 €
- Eigentümeranteil: 3.355,35 €
- Mieteranteile gesamt: 3.594,65 €

Mieter:
- Familie Berger: Kosten 1.890,20 € / Vorauszahlungen 2.640,00 € / Guthaben 749,80 €
- Jonas Schneider bis 30.06.2025: Kosten 829,25 € / Vorauszahlungen 1.080,00 € / Guthaben 250,75 €
- Nina Vogel ab 01.07.2025: Kosten 875,20 € / Vorauszahlungen 1.200,00 € / Guthaben 324,80 €

Die beiden Nutzer von Wohnung B werden nicht pauschal halbiert. Die zeitliche Kostenverteilung und die Kaltwasser-Zwischenablesung trennen die beiden Nutzungszeiträume.

## Demo-Inhalte

Der Ausgangsstand enthält:

- 1 Immobilie
- 3 Einheiten
- 3 Mietverhältnisse
- 12 Kostenpositionen
- 10 bestätigte Umlageregeln
- 3 Kaltwasserzähler
- 13 dokumentierte Ablesungen
- 17 Zahlungsdatensätze
- 5 Mietservice-Entwürfe
- 2 freigegebene Dokument-Snapshots
- 2 dokumentierte Übergaben
- 9 Eigentümer-Sicherheits-/Pflichtenchecks
- 1 datensparsamen Vermietungsvorgang bis Phase C_SELECTED
- kein Bewerber-Score
- kein Ranking
- keine automatische Mieterauswahl

## Mietservice und Vertragswerkstatt

Im Demo-Haus vorhanden:

- Mietvertragsentwurf
- Hausordnung
- Müll-/Entsorgungsinformation
- Einzugsprotokoll
- Mieter-Serviceblatt

Die Lernreise verlinkt zusätzlich auf die bestehende Vertragswerkstatt:

`../vertraege/club-marktplatz-vertragswerkstatt.html`

Grundprinzip:

**Dokumenteninhalt und Prüfhinweis bleiben getrennt.**

Ein Hinweis auf fachliche oder rechtliche Prüfung wird nicht in den eigentlichen Demo-Mietvertrag oder die Hausordnung geschrieben. Der Demo-Vertrag enthält nur sachliche Vertragsdaten; Prüfhinweise bleiben auf der Arbeits-/Freigabeebene.

## Eigener Demo-Speicher

Normalprojekt:

`akademie:nebenskosten-premium:v1:project`

Demo:

`akademie:nebenskosten-premium:v1:demo:project`

Geprüft:

- beide Speicher können gleichzeitig existieren
- Demo-Änderungen verändern das Live-Projekt nicht
- „Demo zurücksetzen“ schreibt ausschließlich den Demo-Schlüssel
- freigegebene Dokumente des normalen Projekts werden davon nicht berührt

## Demo-Bedienung

`demo.html`

Funktionen:

- geführte Lernreise
- freie Erkundung
- DE/EN-Lerntexte
- sichtbar als DEMO gekennzeichnet
- alle Personen, Adressen und Belege als fiktiv gekennzeichnet
- Demo mit einem Klick auf geprüften Ausgangsstand zurücksetzen
- Demo verlassen und in den normalen Speicher zurückkehren

## Akademische Lernreise

Gemeinsame Quelle:

`assets/js/demo-guide.js`

13 Lernschritte:

1. Orientierung
2. Immobilie
3. Nutzung und Mieterwechsel
4. Kosten und Belege
5. Verbrauch und Zwischenablesung
6. Eigentümer-Sicht
7. Vermieter-Abrechnung
8. Mietservice und Vertragswerkstatt
9. Sicherheit und Pflichten
10. datensparsamer Vermietungsprozess
11. PDF-Zentrale
12. Archiv
13. Sicherung und Folgejahr

Jeder Schritt beantwortet:

- Was passiert hier?
- Warum ist das wichtig?
- Was sehe ich konkret im Demo-Haus?

## Bedienungsanleitung

`bedienungsanleitung.html`

Die klassische Bedienungsanleitung verwendet **dieselbe Datenquelle wie die geführte Demo**.

Dadurch gibt es keine zwei getrennt gepflegten Anleitungen.

Von jedem Kapitel kann der passende Schritt direkt im Demo-Haus geöffnet werden.

## Käufer-Sprache

Die sichtbaren Hauptseiten wurden auf Entwickler-/Bauplan-Sprache geprüft.

Geprüft wurden unter anderem:

- Zentrale
- Immobilien
- Kosten
- Verbrauch
- Eigentümerübersicht
- Vermieterabrechnung
- Mietservice
- Sicherheit / Vermietungscheck
- PDF-Zentrale
- Archiv
- Sicherung
- Hilfe
- Bedienungsanleitung

In den sichtbaren Käuferoberflächen wurden Begriffe wie „Baustein 5“, „Bausteingrenze“ oder „technisch abnahmebereit“ entfernt.

Interne technische Kennungen wie `baustein5-mietservice-v1` bleiben als unsichtbare Datenherkunft bestehen.

## Startwege

Die Zentrale bietet direkt:

- „Immobilie verwalten“
- „Demo-Haus ansehen“
- „Bedienungsanleitung“

Die Hilfe verlinkt ebenfalls auf die Bedienungsanleitung.

## Demo-Dokumente und Archiv

Der Demo-Ausgangsstand enthält zwei bewusst freigegebene Beispieldokumente mit zwei getrennten Übergabevermerken.

Damit sind PDF-Zentrale und Archiv nicht leer, wenn ein Käufer die Demo zum ersten Mal öffnet.

Dokumentvorschauen, die in einem neuen Tab geöffnet werden, erhalten im Demo-Modus ausdrücklich `demo=1` und lesen dadurch weiterhin den Demo-Speicher.

## Feste Regressionen

### `tests/demo-project.test.mjs`
5 Tests

### `tests/demo-storage.test.mjs`
3 Tests

### `tests/demo-learning.test.mjs`
6 Tests

**Summe: 14 feste Regressionen für Baustein 6.5.**

Sie sind Bestandteil des bestehenden Testmusters `node --test tests/*.test.mjs`.

## In dieser Prüfengine tatsächlich ausgeführte Laufzeitprüfungen

Direkt aus dem aktuellen GitHub-`main`-Quellstand ausgeführt und bestanden:

- Demo V4 lässt sich vollständig erzeugen
- Projektschema akzeptiert den Demo-Datensatz
- 2024 wird vollständig berechnet
- 2025 wird vollständig berechnet
- 2025er Mieterwechsel wird getrennt ausgewiesen
- Kaltwasser-Zwischenablesung trennt Vor- und Nachmieter
- 5 Mietservice-Entwürfe vorhanden
- 2 freigegebene Dokumente vorhanden
- 2 Übergabevermerke vorhanden
- 9 Eigentümerchecks vorhanden
- Vermietungsvorgang endet in C_SELECTED
- automaticScore = false
- automaticSelection = false
- Live- und Demo-Speicherschlüssel sind getrennt
- Demo-Reset verändert den Live-Schlüssel nicht
- Syntax der neuen Demo-/Lern-/Speichermodule sauber

## Bewusst nicht als bestanden behauptet

Ein kompletter lokaler `npm test`-Lauf aller bestehenden Projektregressionen wurde in dieser Prüfengine nicht ausgeführt.

Auch eine abschließende visuelle iPad-/Laptop-Abnahme der veröffentlichten Demo ist noch nicht als bestanden markiert.

Genau dafür ist das Demo-Haus jetzt vorhanden: Der nächste praktische Schritt ist, die Lernreise selbst auf dem veröffentlichten System durchzugehen und Bedienungsprobleme als Produktoptimierungen festzuhalten.

## Bausteingrenze

Baustein 6.5 ist technisch abnahmebereit.

Baustein 7 beginnt erst nach ausdrücklicher Freigabe „Baustein fertig“.
