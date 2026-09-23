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

## Als Nächstes

Die Funktionen werden jetzt in `abrechnung-vermieter.html` bedienbar angebunden. Danach folgen die spezialisierten Heiz-/Warmwasser-/CO₂- und Sonderfallpfade, ohne sie in den Standardrechner zu zwingen.

**Baustein 4 bleibt offen.**
