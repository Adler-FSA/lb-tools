# Baustein 3 – Immobilienzentrale / Eigentümer

**23.09.2026 · Begonnen nach ausdrücklicher Freigabe von Baustein 2.**

## Sichtbarer erster Stand

Der erste bedienbare Oberflächenstand ist angelegt. Er besteht aus:

- `index.html` – responsive „Meine Zentrale“ mit Projektstatus, Kennzahlen und Immobilienübersicht.
- `immobilien.html` – geführte Immobilienakte für Immobilie, Einheiten, Fläche und aktuellen Nutzungsstatus.
- `assets/css/app.css` – gemeinsame responsive Oberfläche für Laptop, iPad und kleinere Displays; sechs Hauptbereiche ohne horizontale Seitennavigation.
- `assets/js/ui-core.js` – gemeinsame Darstellungs- und Speicherhilfen.
- `assets/js/dashboard.js` – liest ausschließlich den neuen lokalen Projektbestand und erzeugt daraus die Zentrale.
- `assets/js/immobilien-ui.js` – legt neue Immobilien und Einheiten im bestehenden v1-Datenmodell an und speichert sie über die geprüfte Speicherschicht.

## Aktuelle Bedienung

Ein neuer Nutzer kann:

1. eine Immobilie mit Bezeichnung, Arbeitsbereich, Gebäudetyp und Adresse anlegen,
2. die Immobilie öffnen,
3. Wohnungen/Nutzungseinheiten mit Fläche anlegen,
4. Eigennutzung, Vermietung oder Leerstand mit Startdatum erfassen,
5. bei Vermietung bereits ein minimales eigenständiges Mietverhältnis anlegen,
6. zur Zentrale zurückkehren und dort die gespeicherten Immobilien, Einheiten, Nutzungen und bereits vorhandenen Kosten sehen.

Es werden keine Alt-Daten gelesen oder importiert. Die Speicherung erfolgt über den separaten Namensraum von Nebenkosten Premium. Kosten, PDF, Mietservice und rechtliche Freigaben werden auf dieser Seite noch nicht vorgetäuscht.

## Bewusste Begrenzung dieses Sichtstands

Die Oberfläche enthält bereits die sechs Hauptnavigationsbereiche, aber nur „Meine Zentrale“ und „Immobilien“ sind freigeschaltet. Die übrigen Bereiche sind sichtbar, aber deaktiviert, bis der jeweilige Teil innerhalb der folgenden Bauarbeit angeschlossen wurde.

Noch offen innerhalb von Baustein 3:

- Kosten- und Belegverwaltung,
- Verbrauch/Versorger-Zahlungsaufnahme für den Eigentümerfluss,
- Eigentümer-Jahresübersicht auf Basis des geprüften Rechenkerns,
- Bearbeitungs- und Historienfunktionen für bestehende Immobilien-/Einheitsdaten,
- DE/EN-Vervollständigung und spätere formale Browser-/iPad-Abnahme.

**Baustein 3 bleibt offen. Michaels erste Sichtprüfung kann jetzt an den HTML-Seiten beginnen.**
