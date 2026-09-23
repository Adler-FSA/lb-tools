# Baustein 3 – Immobilienzentrale / Eigentümer

**23.09.2026 · In Arbeit, sichtbarer Funktionsstand weit fortgeschritten.** Baustein 2 ist freigegeben. Baustein 3 baut ausschließlich auf dem neuen Datenmodell und der geprüften Speicherschicht auf; das frühere Nebenkosten-Werkzeug bleibt unberührt.

## Aktuell bedienbar

- `index.html` – „Meine Zentrale“ mit Projektstatus, Kennzahlen, Immobilienübersicht und Direkteinstiegen.
- `immobilien.html` – Immobilienakte für Immobilie, Einheiten, Flächen und Nutzungsstatus.
- `kosten.html` – Kosten- und Belegverwaltung mit getrenntem Versorger-Zahlungskreis.
- `verbrauch.html` – Zähler, Ablesungen und dokumentierter Zählerwechsel.
- `abrechnung-eigentuemer.html` – interne Eigentümer-Jahresübersicht mit Kosten, Versorgerbewegungen, dokumentiertem Verbrauch und Jahresvergleich.
- gemeinsame responsive Gestaltung unter `assets/css/app.css`.
- gemeinsame UI-/Speicherhilfen sowie Seitenskripte unter `assets/js/`.

Die Hauptnavigation „Kosten & Abrechnung“ ist aktiv. Mietservice, Sicherheit & Checks sowie Dokumente & Hilfe bleiben sichtbar, aber gesperrt, bis die jeweiligen späteren Bausteine angeschlossen werden.

## Datenaufnahme und Historie

Immobilien und Einheiten werden getrennt angelegt. Fläche und Nutzung besitzen echte Zeiträume.

Das reine Modul `assets/js/history-changes.js` ergänzt jetzt ausdrücklich historische Änderungen:

- neue Fläche ab Datum beendet den vorherigen Flächenzeitraum einen Tag vorher,
- Nutzungswechsel beendet den bisherigen Nutzungszeitraum und legt einen neuen an,
- ein neuer Mieter erhält ein eigenes Mietverhältnis; das bisherige Mietverhältnis wird historisch beendet,
- ein Zählerwechsel erhält altes Gerät, alten Endstand, Wechseldatum, neues Gerät und neuen Anfangsstand,
- vorhandene Startwerte werden nicht still überschrieben,
- widersprüchliche Wechsel oder Gerätehistorien werden gesperrt.

Automatisierte Regressionen liegen in `tests/history-changes.test.mjs`.

## Kosten und Versorger

Kosten werden als tatsächliche Originalkostenpositionen gespeichert: Betrag, Kostenart, Leistungszeitraum, Belegreferenz und Einordnung. „Ungeklärt“ bleibt möglich. „Umlage später prüfen“ ist keine rechtliche Umlagefreigabe.

Versorgerzahlungen und Versorgererstattungen werden in einem eigenen Cashflow-Kreis mit Abrechnungsperiode gespeichert. Sie verändern weder den Rechnungsbetrag noch automatisch eine Mieterabrechnung.

## Eigentümerübersicht

`assets/js/owner-summary.js` trennt tatsächliche Kosten, Eigentümerkosten, nur zur späteren Umlageprüfung markierte Beträge, ungeklärte Beträge sowie Versorgerzahlungen und -erstattungen.

`assets/js/owner-insights.js` ergänzt:

- dokumentierte Verbrauchsdifferenzen ausschließlich aus tatsächlich gespeicherten Ablesungen,
- keine Schätzung bei nur einem Messwert,
- Jahresvergleich tatsächlicher Kosten und separat erfasster Versorgerzahlungen,
- Überlaufschutz für die Verbrauchsaggregation.

Die Differenz zwischen tatsächlichen Kosten und netto erfassten Versorgerzahlungen wird ausdrücklich nicht automatisch als Guthaben oder Nachzahlung behauptet.

Automatisierte Regressionen liegen in `tests/owner-summary.test.mjs` und `tests/owner-insights.test.mjs`.

## Technischer Prüfstand

Vor dem aktuellen Historien-/Vergleichspaket war die vollständige Suite mit **295/295 Tests** fehlerfrei. Die neuen Historien- und Insight-Tests sind im Repository ergänzt. Nach dem letzten UI-/Testpaket wurde GitHub Pages erfolgreich gebaut und veröffentlicht. Ein erneuter vollständiger lokaler Node-Gesamtlauf ist für die neuen Tests noch nachzuholen; bis dahin wird keine höhere Gesamttestzahl behauptet.

## Noch offen innerhalb von Baustein 3

- erneuter vollständiger Gesamttest inklusive der neuen Historien-/Insight-Tests,
- geführte Abschlussprüfung der Eigentümerdaten: Was ist vollständig, was fehlt noch für den geprüften Jahres-Rechenkern,
- letzte sichtbare Browser-/iPad-Korrekturen.

DE/EN gehört laut Masterplan zur Gesamtabnahme in Baustein 7 und hält Baustein 3 nicht auf.

**Baustein 3 bleibt offen.** Es gibt weiterhin keine rechtlich freigegebene Mieterabrechnung oder PDF-Ausgabe.
