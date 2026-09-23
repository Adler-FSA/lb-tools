# Baustein 4 – Vermieterabrechnung

**23.09.2026 · Begonnen nach ausdrücklicher Freigabe von Baustein 3.**

## Ziel

Baustein 4 verbindet Mietverhältnisse, Vertragsfassungen, Vorauszahlungen, tatsächliche Mieterzahlungen und bestätigte Verteilungsmaßstäbe mit dem bereits geprüften Berechnungskern.

Die drei Rechnungskreise bleiben getrennt:

1. tatsächliche Gebäudekosten,
2. Eigentümer-/Versorgerzahlungen,
3. individuelle Mieterabrechnung.

Keine Differenz wird automatisch als rechtlich fällige Forderung, Rückstand oder freigegebenes Guthaben behauptet.

## Bereits angelegt

- `assets/js/landlord-management.js` – reine Datenfunktionen für:
  - erste Vertragsbasis eines Mietverhältnisses,
  - historische Vorauszahlungsänderung,
  - getrennte Soll- und Ist-Zahlungen,
  - explizite Bestätigung des Zahlungskreises pro Abrechnungsjahr,
  - bestätigte Standard-Umlageschlüssel Fläche, Verbrauch oder direkte Einheit.
- `tests/landlord-management.test.mjs` – Regressionen für Vertrags-/Zahlungs- und Schlüsseltrennung.
- `assets/js/landlord-preview.js` – read-only Einzelvorschau über den vorhandenen Standard-Rechenkern.
- `tests/landlord-preview.test.mjs` – prüft individuelle Mieteranteile, tatsächliche Zahlungen und Nicht-Freigabe.

## Sichtbarer erster Stand

`abrechnung-vermieter.html` ist jetzt bedienbar angebunden. Der aktuelle Standardpfad ermöglicht:

- Mietverhältnisse je Gebäude/Jahr auswählen,
- Vertragsbasis als Vorauszahlung, Pauschale oder ungeklärt erfassen,
- vertraglich bestätigte Standard-Kostenarten dokumentieren,
- Vorauszahlungsänderungen ab Monatsanfang historisch speichern,
- tatsächliche Mieterzahlungen und bestätigte Soll-Einträge getrennt erfassen,
- Zahlungskreis je Mietverhältnis/Jahr ausdrücklich bestätigen,
- Standard-Umlageschlüssel Fläche, Verbrauch oder direkte Einheit speichern,
- individuelle technische Mieterergebnisse über den bestehenden Rechenkern anzeigen.

Die Oberfläche erzeugt weder eine rechtlich freigegebene Forderung noch ein PDF.

## Als Nächstes

Als Nächstes werden die spezialisierten Heiz-/Warmwasser-/CO₂- und Sonderfallpfade in denselben Vermieterfluss eingebunden. Pauschalen und nicht unterstützte Fälle bleiben bis dahin gesperrt, statt in den Standardrechner gezwungen zu werden.

**Baustein 4 bleibt offen.**
