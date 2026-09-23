# Baustein 4 – Vermieterabrechnung

**23.09.2026 · Technisch abnahmebereit.** Baustein 3 ist ausdrücklich freigegeben. Baustein 4 baut ausschließlich auf dem neuen Datenmodell und den geprüften Rechenkernen auf; das frühere Nebenkosten-Werkzeug bleibt unberührt.

## Ziel

Baustein 4 verbindet Mietverhältnisse, Vertragsfassungen, tatsächliche Vorauszahlungen, Verteilungsmaßstäbe, Wärme-/CO₂-Fachpfade und den vollständigen Jahres-Orchestrator zu einer nicht buchbaren Vermieter-Jahresvorschau.

Die Rechnungskreise bleiben getrennt:

1. tatsächliche Gebäudekosten,
2. Eigentümer-/Versorgerzahlungen,
3. Mieter-Soll- und Ist-Zahlungen,
4. technische Mieterabrechnung.

Keine Differenz wird automatisch als rechtlich fällige Forderung, Mietrückstand oder freigegebenes Guthaben behauptet.

## Sichtbarer Vermieterfluss

`abrechnung-vermieter.html` ist bedienbar angebunden und enthält derzeit:

- Mietverhältnisse je Gebäude und Abrechnungsjahr,
- explizite Bestätigung des Zahlungskreises,
- erste Vertragsbasis als Vorauszahlung, Pauschale oder ungeklärt,
- historisierte Vorauszahlungsänderungen ab Monatsanfang,
- tatsächlich eingegangene Mieterzahlungen getrennt von bestätigten Soll-Einträgen,
- Standard-Umlageschlüssel Fläche, Verbrauch oder direkte Einheit,
- technische Standard-Einzelvorschau,
- getrennten Heizungs-/Warmwasserpfad,
- Nutzerwechselprüfung mit echten Zwischenablesungen,
- CO₂-Gebäude- und Mieterpfad für den bereits unterstützten engen Fall,
- verbundene Heizungs-/Warmwasseranlage,
- vollständige Gesamtjahresprüfung über den Produktions-Orchestrator.

Die Oberfläche erzeugt weiterhin weder eine rechtlich freigegebene Forderung noch ein PDF.

## Vertrags-, Zahlungs- und Verteilungslogik

`assets/js/landlord-management.js` verwaltet read-only vorbereitet bzw. historisch:

- Vertragsfassungen,
- Vorauszahlungsänderungen,
- tatsächliche Mieterzahlungen,
- bestätigte Soll-Einträge,
- bestätigte Zahlungskreise pro Jahr,
- Standard-Umlageschlüssel.

Die zugehörigen Regressionen liegen in `tests/landlord-management.test.mjs`.

`assets/js/landlord-preview.js` erzeugt eine technische Einzelvorschau über den vorhandenen Standard-Rechenkern. Sie bleibt `legalRelease:false`, `pdfGenerated:false` und nicht buchbar.

## Getrennte Heizung und Warmwasser

`assets/js/landlord-thermal.js` bindet den vorhandenen Wärme-Rechenkern an den Vermieterfluss an.

Er verlangt ausdrücklich bestätigte Angaben zu:

- Kostenbasis,
- CO₂-Abgrenzung,
- Ausnahmen,
- Verbrauchsquote,
- Messwerten,
- Messbasis,
- ggf. Nutzerwechsel-Zwischenablesungen.

Fehlende Messwerte oder nicht unterstützte Sonderfälle bleiben gesperrt. Eine automatische Schätzung oder Gradtagzahlen-Verteilung ohne belegte Grundlage findet nicht statt.

## CO₂

`assets/js/landlord-co2.js` bindet den vorhandenen Gebäude- und Mieter-CO₂-Fachpfad an.

Der sichtbare CO₂-Pfad unterstützt bewusst nur den bereits abgesicherten engen Fall:

- vollständiges Kalenderjahr 2026,
- Wohngebäude mit zentraler Eigentümer-Versorgung,
- vollständige CO₂-Originalkostenpositionen,
- bestätigte Gebäudewohnfläche und Emissionsangabe,
- geprüfte Sonder-/Kürzungsfälle,
- individuelle Mieteraufteilung nur für lückenlose reine Mieternutzung aller Einheiten,
- Verteilung nur auf Basis des geprüften Wärme-Teilberichts.

Die Gebäudestufe kann separat sichtbar werden. Eigennutzung oder Leerstand sperren die individuelle Mieteraufteilung, statt einen Wert zu erfinden.

Der Adapter stellt die geprüften `co2BuildingPlan`- und `co2TenantPlan`-Daten außerdem dem vollständigen Jahres-Orchestrator zur Verfügung.

Regressionen liegen in `tests/landlord-co2.test.mjs`.

## Verbundene Heizungs-/Warmwasseranlage

`assets/js/landlord-linked-thermal.js` verbindet die bereits geprüfte Vortrennung verbundener Anlagen mit dem echten Wärme-Rechenkern.

Die Oberfläche verlangt ausdrücklich:

- Anlagenart Gas-Zentralanlage, Wärmepumpe oder gewerbliche Wärmelieferung,
- vollständiges Originalrechnungsinventar,
- vollständigen bestätigten Gesamtbetrag jeder verwendeten Originalrechnung,
- separate CO₂-Abgrenzung,
- Gesamtenergie und Warmwasserenergie auf derselben physikalischen Bezugsgröße,
- getrennte Nachweise für Gesamt- und Warmwasserenergie,
- bestätigte Verbrauchsquoten, Messwerte und Messbasis für Heizung und Warmwasser.

Gemeinsame Kosten werden unter `thermal_shared` einmal als Originalkosten erfasst. Die Trennung in Heizung und Warmwasser erfolgt ausschließlich temporär für den Rechenkern. Die Originalrechnungen bleiben unverändert und werden nicht doppelt eingespielt. Heizölbestände bleiben gesperrt.

Regressionen liegen in `tests/landlord-linked-thermal.test.mjs`.

## Gesamtjahresvorschau

`assets/js/landlord-annual.js` ist ein dünner read-only Adapter über den vollständigen Produktions-Orchestrator `previewAnnualPeriod`.

Der neue sichtbare Abschnitt **„Gesamtes Abrechnungsjahr prüfen“** führt nur dann zusammen:

- Standardkosten und gespeicherte Umlageschlüssel,
- getrennte Heizung/Warmwasser oder alternativ die verbundene Anlage,
- CO₂-Gebäude- und Mieterplan, sofern CO₂-Kosten vorhanden sind,
- tatsächliche Mietervorauszahlungen,
- bestätigte Versorgungsverträge,
- abschließenden Jahres-Integritätsabgleich,

wenn sämtliche benötigten Fachpfade den vorhandenen Rechenkern passieren.

Fehlt ein Fachplan oder ist ein Fall nicht unterstützt, stoppt der Orchestrator fail-closed. Eine erfolgreiche Gesamtvorschau bleibt zwingend:

- `combinedForPosting:false`
- `legalRelease:false`
- `pdfGenerated:false`

Regressionen liegen in `tests/landlord-annual.test.mjs`.

## Korrigierte UI-Verdrahtung

Beim Ausbau wurde ein Integrationsfehler entdeckt und korrigiert: Wärme- und CO₂-Submit-Handler lagen versehentlich innerhalb der lokalen `load()`-Funktion und hätten bei wiederholtem Laden mehrfach registriert werden können.

Die Handler sind jetzt einmalig außerhalb von `load()` angebunden. Die aktuelle Vermieteroberfläche sowie die neuen Vermieter-, Wärme-, CO₂-, Verbund- und Jahresadapter wurden anschließend erneut syntaktisch geprüft.

## Technischer Prüfstand

Der zuletzt vollständig gemeinsam ausgeführte Kernstand lag bei:

- **331 Tests**
- **331 bestanden**
- **0 fehlgeschlagen**
- **0 übersprungen**
- **0 abgebrochen**

Die danach neu bzw. erweitert hinzugekommenen Baustein-4-Regressionen wurden gegen den aktuellen GitHub-Stand zusätzlich gezielt ausgeführt:

- `landlord-management.test.mjs`: **8/8**
- `landlord-preview.test.mjs`: **2/2**
- `landlord-thermal.test.mjs`: **7/7**
- `landlord-linked-thermal.test.mjs`: **5/5**
- `landlord-co2.test.mjs`: **6/6**
- `landlord-annual.test.mjs`: **2/2**

Damit sind **30/30 aktuelle Baustein-4-Regressionen** erfolgreich. Zusätzlich wurden echte Produktionspfad-Smokes für die verbundene Anlage, verbundene Anlage → CO₂-Mieterpfad sowie die vollständige Jahres-Orchestrierung ausgeführt.

Dabei wurden drei echte Integrationsfehler gefunden und behoben:

1. Spezialkosten wie Heizung, Warmwasser, gemeinsame Wärmekosten, CO₂ und Heizöl konnten im Vermieter-UI noch als normale Standard-Umlageposition erscheinen. Sie sind jetzt aus dem Standardpfad ausgeschlossen und werden ausschließlich ihren Fachpfaden übergeben.
2. Eine separat erfasste CO₂-Originalposition konnte den getrennten Wärme-Teilbericht blockieren, obwohl CO₂ ausdrücklich separat verarbeitet werden soll. Der Wärmeadapter verwendet jetzt eine disposable Berechnungskopie ohne CO₂/Heizöl und verändert die Originalakte nicht.
3. Der CO₂-Mieterpfad konnte einen bereits geprüften verbundenen Wärme-Teilbericht nicht übernehmen und erwartete fälschlich nur den separaten Wärmepfad. Beide geprüften Wärmeformen werden jetzt akzeptiert.

Die aktuelle Vermieteroberfläche und alle geänderten Baustein-4-Module wurden nach den Korrekturen syntaktisch geprüft. Der aktuelle GitHub-Pages-Stand wurde für den neuesten Commit erfolgreich gebaut und veröffentlicht.

Eine neue Gesamtzahl für die komplette historische Projektsuite wird bewusst nicht aus **331 + 30** hochgerechnet, weil einzelne Baustein-4-Tests bereits in früheren Zwischenständen enthalten waren. Maßgeblich sind deshalb der bestätigte Kernstand **331/331** plus der aktuelle gezielte Baustein-4-Stand **30/30**.

## Abschlussbewertung

Die Masterplan-Ziele von **Baustein 4 – Vermieterabrechnung** sind im ausdrücklich unterstützten Umfang technisch umgesetzt:

- Mietverhältnisse und Vertragsfassungen,
- Vorauszahlungen und tatsächliche Zahlungen,
- Standard-Umlageschlüssel,
- getrennte Heizung/Warmwasser,
- Nutzerwechsel mit echten Zwischenablesungen,
- verbundene Heizungs-/Warmwasseranlagen,
- enger CO₂-Standardfall,
- individuelle technische Mieterergebnisse,
- vollständige nicht buchbare Jahresvorschau über den Produktions-Orchestrator.

Pauschalen, Heizölbestände, unbelegte Gradtagzahlen, nicht unterstützte CO₂-Eigennutzungs-/Leerstandsfälle und sonstige nicht ausdrücklich getestete Rechtsausnahmen bleiben bewusst fail-closed.

**Baustein 4 ist technisch abnahmebereit und bleibt formal offen, bis der Auftraggeber ihn ausdrücklich mit „Baustein fertig“ freigibt.**
