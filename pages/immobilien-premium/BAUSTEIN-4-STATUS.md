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

## Technischer Prüfstand

Der vollständige Projektstand einschließlich des sichtbaren Heizungs-/Warmwasserpfads wurde erneut gemeinsam ausgeführt:

- **331 Tests**
- **331 bestanden**
- **0 fehlgeschlagen**
- **0 übersprungen**
- **0 abgebrochen**
- **40 JavaScript-Dateien** unter `assets/js/` zusätzlich mit `node --check` syntaktisch geprüft.

Damit sind Vertrags-, Vorauszahlungs-, Zahlungskreis-, Umlageschlüssel-, Einzelvorschau- sowie die neue Heizungs-/Warmwasser-Adapterlogik gemeinsam mit dem bisherigen technischen Fundament geprüft.

## Heizungs- und Warmwasserpfad

`assets/js/landlord-thermal.js` verbindet den vorhandenen geprüften Wärme-Rechenkern mit dem Vermieterfluss. Der Adapter leitet **keine** fachliche oder rechtliche Bestätigung automatisch ab. Er verlangt ausdrücklich bestätigte Angaben zu:

- getrennter Heiz-/Warmwasserkostenbasis,
- CO₂-Abgrenzung,
- geprüften Ausnahmen,
- fehlender Nutzergruppen-Vorverteilung,
- Verbrauchsquote je vorhandener Leistung,
- Messwerten und Messbasis,
- ausdrücklich bestätigtem Nichtvorhandensein einer Leistung.

Kostenpositionen und Zähler werden aus dem gespeicherten Objekt gelesen. Fehlt einer Einheit ein passender Zähler oder ein erforderlicher Beleg, bleibt der Teilbericht gesperrt. Der erzeugte Bericht bleibt `combinedWithOtherCosts:false`, `legalRelease:false` und `pdfGenerated:false`.

`abrechnung-vermieter.html` enthält dafür jetzt einen eigenen sichtbaren Prüfabschnitt „Heizung & Warmwasser“.

Automatisierte Regressionen liegen in `tests/landlord-thermal.test.mjs`.

## CO₂-Pfad

`assets/js/landlord-co2.js` verbindet den vorhandenen Gebäude- und Mieter-CO₂-Fachpfad mit der Vermieteroberfläche.

Der Adapter unterstützt bewusst nur den bereits abgesicherten engen Fall:

- vollständiges Kalenderjahr 2026,
- Wohngebäude mit zentraler Eigentümer-Versorgung,
- vollständige CO₂-Originalkostenpositionen,
- bestätigte Gebäudewohnfläche und Emissionsangabe,
- ausdrücklich geprüfte Sonder-/Kürzungsfälle,
- individuelle Mieteraufteilung nur bei lückenloser reiner Mieternutzung aller Einheiten,
- Mieteraufteilung ausschließlich auf Basis des zuvor geprüften Wärme-Teilberichts.

Die Gebäudestufe kann separat angezeigt werden. Ist eine individuelle Mieteraufteilung nicht unterstützt – etwa bei Eigennutzung oder Leerstand – bleibt nur diese Einzelaufteilung gesperrt; sie wird nicht künstlich berechnet.

`abrechnung-vermieter.html` enthält dafür jetzt den sichtbaren Abschnitt „CO₂“. Originalbetrag, Gebäudestufe, Eigentümeranteil und noch nicht zugeordneter Mieterpool werden getrennt dargestellt. Individuelle Werte bleiben ausdrücklich technische Vorschau.

Regressionen liegen in `tests/landlord-co2.test.mjs`. Die neuen CO₂-Dateien und die aktualisierte UI wurden zusätzlich syntaktisch geprüft; der GitHub-Pages-Build für diesen Stand wurde erfolgreich veröffentlicht.

## Nutzerwechsel bei Heizung/Warmwasser

Der bereits vorhandene Nutzerwechsel-Pfad ist jetzt ebenfalls in der Vermieteroberfläche erreichbar.

Für Heizung und Warmwasser kann ausdrücklich bestätigt werden, dass bei einem dokumentierten Nutzerwechsel:

- der Verbrauch über echte Zwischenablesungen am Wechselstichtag getrennt wird,
- die Grundkosten im aktuell sichtbaren Pfad für diesen Fall nach Kalendertagen verteilt werden,
- die Methode ausdrücklich geprüft wurde.

Diese Bestätigung ersetzt die Messwerte nicht. Fehlt am Nutzerwechsel eine notwendige Zwischenablesung, sperrt der vorhandene Rechenkern die Vorschau weiterhin mit `METER_INTERMEDIATE_READING_REQUIRED`. Eine Gradtagzahlen-Verteilung wird von dieser Oberfläche noch nicht automatisch erzeugt.

Zusätzliche Regressionen wurden in `tests/landlord-thermal.test.mjs` ergänzt. Die aktualisierten Thermal-/CO₂-/UI-Dateien und Testdateien wurden syntaktisch geprüft.

## Als Nächstes

Als Nächstes werden die noch offenen Sonderfälle innerhalb von Baustein 4 systematisch gegen den vorhandenen Rechenkern abgegrenzt und der Vermieterfluss zur Gesamtabnahme gebracht. Pauschalen, Gradtagzahlen ohne belegte Gewichte sowie nicht unterstützte Eigennutzungs-/Leerstands-CO₂-Fälle bleiben fail-closed.

**Baustein 4 bleibt offen.**
