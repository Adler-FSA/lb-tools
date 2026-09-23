# Baustein 3 – Immobilienzentrale / Eigentümer

**23.09.2026 · In Arbeit.** Baustein 2 ist freigegeben. Baustein 3 baut ausschließlich auf dem neuen Datenmodell und der geprüften Speicherschicht auf; das frühere Nebenkosten-Werkzeug bleibt unberührt.

## Sichtbarer Stand

Aktuell bedienbar:

- `index.html` – „Meine Zentrale“ mit Projektstatus, Kennzahlen, Immobilienübersicht und Direkteinstiegen.
- `immobilien.html` – Immobilienakte für Immobilie, Einheiten, Flächen und aktuellen Nutzungsstatus.
- `kosten.html` – Kosten- und Belegverwaltung mit getrenntem Versorger-Zahlungskreis.
- `abrechnung-eigentuemer.html` – interne Eigentümer-Kostenübersicht mit getrennten tatsächlichen Kosten und Versorgerbewegungen.
- `verbrauch.html` – Zähler- und Ableseerfassung für Kaltwasser, Heizung und Warmwasser; nur tatsächlich gemessene Werte.
- gemeinsame responsive Gestaltung unter `assets/css/app.css`.
- gemeinsame UI-/Speicherhilfen sowie Seitenskripte unter `assets/js/`.

Die Hauptnavigation „Kosten & Abrechnung“ ist jetzt aktiv. Mietservice, Sicherheit & Checks sowie Dokumente & Hilfe bleiben sichtbar, aber gesperrt, bis die jeweiligen Bausteine angeschlossen werden.

## Kosten- und Zahlungsaufnahme

Kosten werden als tatsächliche Originalkostenpositionen gespeichert: Betrag, Kostenart, Leistungszeitraum, Belegreferenz und Einordnung. Die Einordnung kann bewusst auf „ungeklärt“ stehen. „Umlage später prüfen“ setzt **keine** rechtliche Umlagefreigabe.

Versorgerzahlungen und Versorgererstattungen werden in einem eigenen Cashflow-Kreis mit Abrechnungsperiode gespeichert. Sie verändern weder den Rechnungsbetrag noch automatisch eine Mieterabrechnung.

Ein vollständiges Kalenderjahr wird beim ersten Kosten-/Zahlungsvorgang als Abrechnungsperiode angelegt, ohne bestehende Perioden zu überschreiben.

## Eigentümerübersicht

Das neue reine Modul `assets/js/owner-summary.js` bildet eine nicht buchbare Organisationsauswertung. Es trennt:

- tatsächliche Kosten,
- bereits als Eigentümerkosten eingeordnete Beträge,
- nur zur späteren Umlageprüfung markierte Beträge,
- ungeklärte Beträge,
- Versorgerzahlungen und -erstattungen.

Der Vergleich zwischen tatsächlichen Kosten und netto erfassten Versorgerzahlungen wird ausdrücklich **nicht** als Guthaben oder Nachzahlung behauptet.

## Zähler und Verbrauch

`verbrauch.html` legt Geräte pro Immobilie/Einheit an und speichert Ablesungen mit Datum und Messwert. Kaltwasser und Warmwasser werden in m³, Heizenergie in kWh geführt. Mehrfachablesungen am selben Tag, Ablesungen außerhalb der Gerätelebensdauer und nicht monotone Zwischenwerte werden bereits in der Oberfläche gesperrt. Zählerwechsel, Überlauf und Ersatzwerte werden nicht automatisch erfunden, sondern bleiben eigener Prüfpfad des technischen Kerns.

Automatisierter Test: `tests/owner-summary.test.mjs` prüft die Trennung der Rechnungskreise, Fremdobjektschutz, fehlende Belegreferenzen und ungültige Perioden.

## Noch offen innerhalb von Baustein 3

- Bearbeitungs- und Historienfunktionen für bestehende Immobilien-/Einheitsdaten sowie explizite Zählerwechsel,
- geführte Verbindung der Eigentümeransicht mit dem vollständigen Jahres-Rechenkern, sobald alle dafür nötigen Fachangaben in der Oberfläche erfasst werden können,
- weitere Browser-/iPad-Sichtprüfung und Korrekturen,
- DE/EN-Vervollständigung.

**Baustein 3 bleibt offen.** Es gibt weiterhin keine rechtlich freigegebene Mieterabrechnung oder PDF-Ausgabe.
