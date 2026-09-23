# Baustein 3 – Immobilienzentrale / Eigentümer

**23.09.2026 · Technisch vollständig geprüft und vom Auftraggeber mit „Baustein fertig“ freigegeben.** Baustein 2 ist freigegeben. Baustein 3 baut ausschließlich auf dem neuen Datenmodell und der geprüften Speicherschicht auf; das frühere Nebenkosten-Werkzeug bleibt unberührt.

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

Der vollständige aktuelle GitHub-Pages-Artefaktstand wurde am 23.09.2026 erneut lokal ausgeführt. Ergebnis:

- **318 Tests**
- **318 bestanden**
- **0 fehlgeschlagen**
- **0 übersprungen**
- **0 abgebrochen**

Zusätzlich wurden alle **36 JavaScript-Dateien** unter `assets/js/` mit `node --check` syntaktisch geprüft.

Während des Gesamtlaufs wurde eine echte Regression im Versorgungsvertrags-Entwurf sichtbar: eine bereits vorhandene, als Versorgung markierte Jahresrechnung konnte den Vertragsentwurf wegen `SUPPLY_UNASSIGNED_EXPENSE` blockieren. Der Entwurfsablauf wurde so korrigiert, dass genau die zum gewählten Versorger gehörenden bestehenden Originalrechnungen vorgemerkt werden dürfen, ohne fremde/verwaiste Versorgungsrechnungen zu entschuldigen. Ein zusätzlicher Regressionstest schützt diesen Fall.

## Jahresprüfung und Abschlussstand

Die Eigentümerübersicht enthält jetzt eine geführte **Jahresprüfung gegen den echten Produktions-Rechenkern**. `assets/js/owner-readiness.js` ruft `previewAnnualPeriod` read-only auf. Unterstützte vollständige Eigentümerjahre erreichen eine echte, ausdrücklich nicht buchbare Vorschau. Fehlende Angaben werden mit dem Original-Blocker des Rechenkerns angezeigt und zu Immobilien, Kosten oder Verbrauch zurückgeführt. Verteilungs-/Mieterthemen und Sonderkosten bleiben bewusst für die dafür vorgesehenen späteren Fachpfade gesperrt.

Damit sind die Ziele des Masterplans für **Baustein 3 – Datenaufnahme, Dashboard, Kosten und Eigentümerrechnung** im unterstützten Umfang umgesetzt. DE/EN, PDF/Archiv, Vermieter-Umlage und rechtliche Endfreigaben gehören ausdrücklich zu späteren Bausteinen.

**Baustein 3 ist abgeschlossen und freigegeben.** Die ausdrückliche Freigabe „Baustein fertig“ erfolgte am 23.09.2026. Es gibt weiterhin keine rechtlich freigegebene Mieterabrechnung oder PDF-Ausgabe; diese Funktionen gehören zu späteren Bausteinen.
