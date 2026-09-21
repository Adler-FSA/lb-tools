# Akademie Immobilien- & Mietservice — Nebenkosten Premium

**Projektmasterplan · Version 1.0 · Stand 21.09.2026**  
**Status: Baustein 1 vom Auftraggeber freigegeben. Baustein 2 begonnen: technische Grundlage.**

## 0. Verbindlicher Projektbeschluss und Bestandsschutz

Dies ist ein **vollständiger Neuaufbau**. Das frühere Nebenkosten-Werkzeug war ausschließlich Analyse- und Hintergrundmaterial und ist **weder Vorlage noch Datenquelle**. Aus ihm werden **keine HTML-Dateien, keine Skripte, keine Stylesheets, keine Formulare, keine Lernmodule, keine Inhalte, keine PDF-Vorlagen und keine Nutzerwerte** übernommen. Es wird keine Alt-Daten-Migration und keine technische Kopplung entwickelt. Das frühere System bleibt vollständig unberührt. Aus der Voranalyse bekannte Fehlerklassen dienen lediglich als unabhängige Anforderungen für Tests (insbesondere Trennung von Kosten und unterschiedlichen Zahlungsströmen).

**Separat davon** ist die bereits freigegebene *Akademie-PDF-Zentrale des Hotel-Projekts* als spätere Dokumenttechnik vorgesehen. Vor Einbindung werden aktueller Master, konkrete Implementierung, Berechtigungen und Referenzgestaltung geprüft. Keine neue parallele PDF-Engine und kein ungeprüftes Übernehmen alter Nebenkosten-PDFs.

Die neue Anwendung erhält eigenen Projektordner, eigenen lokalen Speicher-Namensraum, eigene Datenversion und eigene Freigabeschritte. Es dürfen keine existierenden Seiten oder Speicherinhalte des früheren Werkzeugs geändert oder ausgelesen werden.

**GitHub-Ziel am 21.09.2026 durch Screenshot ausdrücklich bestätigt:** Repository `Adler-FSA/lb-tools`, Standardbranch `main`, darin `pages/immobilien-premium/`. Die eigenständige Projektdatei `pages/immobilien-premium/MASTERPLAN.md` wird als erster isolierter Schritt erstellt. Alle übrigen Dateien und das frühere Nebenkosten-Werkzeug bleiben unangetastet. Die Domain des Repositories lautet laut CNAME `tools.liquiditybooster.de`; eine öffentliche Produktstartseite wird mit dem Masterplan allein noch nicht angelegt.

## 1. Produktziel und Adressaten

Premium-Bildungs- und Organisationsservice für private Eigentümer und Vermieter. Der Eigentümer organisiert sein eigenes Haus, Kosten, Verbräuche, Versicherungs- und Pflichtenthemen. Der Vermieter verwaltet zusätzlich Mietobjekte, Mietverhältnisse, Vertragsunterlagen und individuelle Betriebskostenabrechnungen. Dieselbe Person kann in einem Gebäude eigene und vermietete Wohnungen haben. Keine Anlage-, Versicherungs- oder individuelle Rechtsberatung; keine automatisierte Bewerberbewertung. Die App unterstützt Aufgaben, Kennzeichnung offener Fragen, rechnerische Nachvollziehbarkeit und professionelle PDFs.

**Leitprinzip:** Immobilie einmal anlegen; ergänzende Angaben nur im passenden Werkzeug erfragen; alle Ergebnisse aus einem gemeinsamen, versionierten Daten- und Rechenkern ableiten.

## 2. Sechs Produktbereiche, zwölf Werkzeuge

**Hauptbereiche:** (1) Meine Zentrale, (2) Immobilien, (3) Mietservice, (4) Kosten & Abrechnung, (5) Sicherheit & Checks, (6) Dokumente, Archiv & Hilfe. Die Navigation darf auf Laptop nicht horizontal scrollen; iPad ist ausdrücklich Zielgerät. DE/EN via einheitlichem `data-i18n`-System; Inline-SVGs, keine externen Laufzeitabhängigkeiten.

**Werkzeuge:**
1. Immobilienakte — Immobilien, Wohnungen, Mietverhältnisse und Historie.
2. Mietvertragsassistent — fachlich freigegebene/versionierte Vertragsvorlage, individueller Entwurf.
3. Hausordnung — vertragliche Pflichten vs. organisatorische Hinweise differenzieren.
4. Müll- und Entsorgungsinformation — objektbezogene Hinweise, örtliche Daten durch Nutzer bestätigen.
5. Ein- und Auszugsprotokoll — Zustand, Schlüssel, Zählerstände, Mängel.
6. Mieter-Serviceblatt — anlassbezogene Mitteilungen und optionale zweckgebundene Jahresabfrage; keine unbegrenzte pauschale Auskunftspflicht.
7. Kosten- und Belegverwaltung — Rechnung einmal erfassen und nach Kostenart/Objekt/Zeitraum zuordnen.
8. Eigentümer-Kostenübersicht — Gesamtkosten, Eigenanteil, Verbrauch, Versorger-Abschläge, Jahresvergleich.
9. Mieter-Betriebskostenabrechnung — individuelle Kostenanteile, Vorauszahlungen, nachvollziehbare PDF.
10. Akademie-PDF-Zentrale — dokumenteigene HTML-Vorlagen, Originalansicht, Vorschau, Speichern, Teilen, Dateiname, Archiv.
11. Eigentümer-Sicherheits- und Pflichtencheck — Versicherungen, Energieausweis, Wartung und Wiedervorlagen.
12. Bewerber- und Vermietungscheck — zulässige, stufenweise Angaben, datensparsame Nachweise, kein Score.

## 3. Datenmodell — Trennung und Zeitbezug

- **Immobilie**: unveränderliche ID, Bezeichnung, Adresse, Gebäudetyp, Eigentümer/Vermieter, Gesamtdaten, ggf. gemeinschaftliche Messstellen.
- **Nutzungseinheit/Wohnung**: unveränderliche ID, Gebäude-ID, Bezeichnung, Lage, Flächenhistorie, Nutzungsstatus-Zeiträume (Eigennutzung, Vermietung, Leerstand), zugehörige Zähler.
- **Mietverhältnis**: eigene ID, Wohnungs-ID, Vertragsparteien nur soweit nötig, Beginn/Ende, Vertragsfassung, vereinbarte Betriebskostenmodelle und Verteilungsregeln; Nachmieter überschreiben Vorgänger nicht.
- **Vertragsänderungen**: Gültigkeitsbeginn und ggf. -ende, Version, Änderungsgrund; Miete, Vorauszahlung und Vereinbarungen nicht rückwirkend überschreiben.
- **Abrechnungsperiode**: tatsächliche Beginn-/Enddaten, Objekt-ID, eindeutig identifizierte Nutzungs-/Mietzeiträume.
- **Kostenposition/Rechnung**: ID, Betrag in Cent, Kostenart, Rechnungs-/Leistungsdatum und Zeitraum, Objekt-/Einheitszuordnung, rechtliche Klassifizierung (gegebenenfalls umlagefähig / Eigentümerkosten / ungeklärt), gültiger Umlageschlüssel, Referenz/Belegstatus.
- **Verteilung**: je Kostenart/Periode dokumentierter Maßstab mit Zähler, Nenner, Einheit, Eingabebasis, Berechnung und Rundungsrest.
- **Zähler und Ablesungen**: Zähler-ID, Einbau/Ausbau, Messart, Datum, Wert, Einheit, Quelle; Zählerwechsel und Zwischenablesung als Ereignisse.
- **Zahlungen**: getrennte Typen für (a) Zahlung an Versorger, (b) geschuldete Mietervorauszahlung und (c) tatsächlich zuordenbare Mieterzahlung; Datum, Betrag, Zuordnung, Klärstatus.
- **Dokument**: Typ, Dokument-ID, Quelldaten-Version, Prüfstatus, Erstelldatum, Freigabe, Versionsnummer, Ausgabe- und Übergabevermerk; Freigabe fixiert den Datenstand.
- **Checks/Aufgaben**: Typ, Anlass, Status, Nachweis/Notiz, Wiedervorlage, Gültigkeit, Verantwortlichkeit. Bewerbungsdaten getrennt und löschbar.

Im Datenmodell keine monetären Gleitkommasummen; Beträge als ganzzahlige Centwerte oder explizite Dezimalarithmetik. Stabile Kennungen statt Namen als Schlüssel. Schema-Versionen von Anfang an dokumentieren. Historische Objekt-, Flächen-, Vertrags- und Dokumentdaten dürfen nicht still überschrieben werden.

## 4. Drei strikt getrennte Rechnungskreise

**A. Gebäudekosten:** tatsächliche Kosten aller erfassten Positionen, einschließlich nicht umlagefähiger Kosten; jede Rechnung zählt genau einmal. Für jede Position ist die Zuordnung zu Einheiten und Zeiträumen nachvollziehbar.

**B. Eigentümer/Versorger:** tatsächliche Zahlung des Eigentümers an den Versorger unabhängig vom Mieter abrechnen. Guthaben oder Nachzahlung des Versorgers verändern nicht automatisch die Mieterabrechnung.

**C. Individuelle Mieterabrechnung:** wirksam vereinbarte und im Einzelfall rechtlich umlagefähige Kosten nach korrektem Schlüssel zuordnen; individuelle Kostenanteile bilden; getrennt erfasste und rechtlich korrekt zu berücksichtigende Vorauszahlungen abziehen; Guthaben/Nachzahlung pro Mietverhältnis berechnen. Vereinbarte und tatsächlich eingegangene Beträge getrennt erfassen; bei Zahlungsstreit die rechtliche Behandlung vor endgültiger Ausgabe prüfen. Pauschale und Vorauszahlung unterscheiden.

Eigennutzung/Leerstand bleiben explizite Kostenanteile; kein unerklärter Rest und keine automatische Mehrbelastung anderer Mieter. Pro Kostenart Gesamtbetrag, Umlageschlüssel, Bezugsgröße, Mieteranteil sowie Rechenweg sichern und ausgeben. Abweichungen, ungeklärte Umlagefähigkeit, fehlende Daten und Rundungsreste als Prüfbedarf anzeigen, nie stillschweigend nullen.

### Referenztest MH-01 — fiktives Zweifamilienhaus, 2026

Wohnung A: 120 m², Eigentümer; Wohnung B: 80 m², ein ganzjähriger Mieter; Gesamt: 200 m².

| Position | Euro | Beispielschlüssel |
|---|---:|---|
| Grundsteuer | 600,00 | Fläche |
| Gebäudeversicherung | 900,00 | Fläche |
| Müllentsorgung | 500,00 | Fläche |
| Allgemeinstrom | 200,00 | Fläche |
| Kaltwasser | 500,00 | Verbrauch (55/45 m³, 5 €/m³) |
| Dachreparatur | 1.000,00 | Eigentümerkosten |
| **Gesamt** | **3.700,00** | |

Die ersten vier Positionen ergeben 2.200 €: Eigentümer 1.320 €, Mieter 880 €. Wasser: Eigentümer 275 €, Mieter 225 €. Dach: Eigentümer 1.000 €, Mieter 0 €. **Eigentümeranteil 2.595 €, Mieteranteil 1.105 €, Summe 3.700 €.** Bei 1.200 € anrechenbaren Mietervorauszahlungen ergibt sich ein **Mieterguthaben von 95 €**. Separat: Wasserabschläge an den Versorger 600 € bei 500 € tatsächlichen Wasserkosten ergeben **100 € Versorgerguthaben**, das nicht das Mieterguthaben ist. Sämtliche Beträge sind reine Testdaten; die gewählten Schlüssel sind nur unter den Testannahmen gültig.

### Verbindliche Sonderfalltests

- MH-02: zwei Mietverhältnisse in derselben Wohnung (01.01.–30.06. und 01.07.–31.12.) mit separaten Abrechnungen, Zahlungen, Verbrauchsdaten.
- MH-03: Leerstand als eigener Zeitraum, Kostenanteile nicht auf andere Wohnungen umlegen.
- MH-04: unterjährige Änderung von Vorauszahlungen; Vereinbarung und Zahlungen separat; Pauschale nicht als Vorauszahlung behandeln.
- MH-05: Zählerwechsel/Überlauf; Anfang/Ende und Gerätehistorie nachvollziehbar.
- MH-06: fehlende oder unplausible Messwerte; begründete zulässige Ersatzermittlung nur bei passendem Sachverhalt, sonst Freigabesperre.
- MH-07: Heizung/Warmwasser mit anwendbarer Verbrauchs-/Grundkostenverteilung, Trennung verbundener Anlagen, Nutzerwechsel und Sonderregeln (auch selbst bewohntes Zweifamilienhaus).
- MH-08: CO₂-Kostenaufteilung, getrennt nach Vermieter- und Mieteranteil, gesetzliche Anwendbarkeit prüfen.
- MH-09: Jahreswechsel erstellt neuen Zeitraum ohne Veränderung des Vorjahres; Beträge/Zeiträume/Zähler/Zahlungen müssen aktuell bestätigt werden.
- Weitere Tests: doppelte Rechnungs-ID, unterschiedliche Flächenhistorie, Rundungssumme, unzulässige Kostenart, fehlender Schlüssel, PDF-Snapshot gegen Datenänderung, Schutz fremder Mieterdaten.

**Rechtliche Freigabe:** Die jeweiligen aktuellen Vorschriften, Rechtsprechung und Ausnahmen zu Betriebskosten, Heiz-/Warmwasserkosten, CO₂, Energieausweis, Versicherungen, Bewerberdaten und Mietvertragsklauseln sind vor Produktfreigabe anhand offizieller und belastbarer Quellen zu prüfen. Dieser Plan behauptet keine universelle rechtliche Richtigkeit automatisch erzeugter Entwürfe. Nicht unterstützte Fälle werden markiert und nicht als abschlussreif ausgegeben.

## 5. Nutzerführung

Erststart: „Eigenes Haus“, „Vermietung“ oder beide (Arbeitsbereich, keine irreversible Objekttyp-Wahl). Geführte Erstanlage Haus → Einheiten → Nutzungsstatus → bei Bedarf Mietverhältnis. Bei vorhandenem Vertrag direkte Erfassung seiner Eckdaten möglich, ohne einen neuen Mietvertrag zu erzwingen.

Dashboard: Objekt/Jahr auswählen, offene Aufgaben, Werkzeuge, laufende Entwürfe und Direkteinstiege. Eigentümerfluss: Haus → Kosten → Verbrauch/Versorgerzahlungen → persönliche Auswertung → Prüfung → PDF. Vermieterfluss: Jahr/Objekt → Einheiten/Mietzeiträume → Kosten → Schlüssel/Verbrauch → Vorauszahlungen → Mieterergebnisse → Einzelprüfung → PDF pro Mietverhältnis. Längere Formulare in kurzen Schritten mit Zwischenspeicherung; Kontext-Hilfen bei den zugehörigen Feldern. Kein Status „versendet“ aus PDF-Erzeugung ableiten.

Status je Dokument: Entwurf → Prüfbedarf oder Bereit zur Freigabe → bewusst freigegeben. Ausgabe/Teilen und dokumentierte tatsächliche Übergabe an Mieter sind getrennte Vorgänge. Korrekturen erzeugen neue Fassungen.

## 6. PDF- und Dokumentenarchitektur

Die unabhängig freigegebene Akademie-PDF-Zentrale aus dem Hotel-Master wird nach Verifikation eingebunden. **Keine zweite PDF-Engine und keine alte Nebenkosten-PDF**. Eine spezialisierte HTML-Dokumentvorlage je Dokumenttyp, nicht Eingabe-Dashboard drucken; Originalgestaltung ohne eigenmächtigen Nachbau. Daten werden aus geprüftem, unveränderlichem Dokument-Snapshot übernommen.

Dokumenttypen: Eigentümer-Jahresübersicht, individuelle Betriebskostenabrechnung je Mietverhältnis, Mietvertragsentwurf, Hausordnung, Müllinformation, Ein-/Auszugsprotokoll, Mieter-Serviceblatt, Eigentümer-Schutz-/Pflichtenübersicht, sachliche Vermietungs-Checkliste; später ggf. Sammelmappe aus freigegebenen Einzelunterlagen. Vorschau, Speichern, Teilen, Dateiname kopieren und Archiv. Datenschutz: Mieter A sieht nie Angaben von Mieter B. Vertragsvorlagen sind fachlich freizugeben und zu versionieren.

Persistenz fertiger PDF-Dateien im Browser und exportierte Sicherungen werden technisch auf reale Grenzen geprüft. Keine Behauptung dauerhafter PDF-Speicherung oder vollständiger Belegsicherung, wenn das nicht umgesetzt/verifiziert ist.

## 7. Sicherheits- und Pflichtencheck

Eigentümer: Wohngebäudeversicherung (Feuer, Leitungswasser, Sturm/Hagel und Vertragsumfang), Elementarschutz, Gebäude-/Grundstückshaftpflicht abhängig von Fall, finanzierende Bank/Darlehensvorgaben, eigene Hausratabsicherung, besondere Anlagen, Deckungssummen/Ausschlüsse, Energieausweis und Gültigkeit/Anlass, weitere anwendbare Gebäude- und Wartungspflichten. Jeder Eintrag markiert **gesetzliche Pflicht**, **vertragliche Verpflichtung**, **Empfehlung** oder **nicht zutreffend/ungeklärt**, inklusive Notiz und Wiedervorlage. Keine pauschale Behauptung allgemeiner gesetzlicher Wohngebäudeversicherungspflicht oder automatische Erstellung eines amtlichen Energieausweises.

Vermieter: Stufenprozess für Besichtigung, Mietinteresse, zeitlich angemessene Nachweise, Vertragsvorbereitung und Einzug. Schufa-/Bonitätsnachweise und Bewerberdaten nach Erforderlichkeit/Datenschutz; kein Ranking, Score oder automatische Mieterauswahl. Hausrat-/Privathaftpflicht des Mieters als sachliches Informationsangebot, nicht pauschal verpflichtende Standardklausel. Abgelaufene/unnötige Bewerberdaten löschbar.

## 8. Seitenarchitektur — Planungsstand

Sechs Hauptnavigationsbereiche und 13 zentrale HTML-Seiten; genaue Dateinamen vor Anlage einmal mit Ziel-Repository abgleichen:

```
pages/immobilien-premium/
  index.html                     # Einstieg / Dashboard
  immobilien.html                # Immobilien, Wohnungen, Mietverhältnisse
  mietservice.html               # Vertrag und Dokumentassistenten
  kosten.html                    # Rechnungen, Belege, Zahlungen
  verbrauch.html                 # Zähler, Heizung/Warmwasser
  abrechnung-eigentuemer.html    # Eigene Jahresübersicht
  abrechnung-vermieter.html      # Mieteranteile und Einzelabrechnungen
  pdf-zentrale.html             # Dokumentvorschau und Ausgabe
  archiv.html                    # Jahre, Fassungen, Übergaben
  schutzcheck.html               # Eigentümer-Check
  vermietungscheck.html          # Bewerber-/Einzugscheck
  hilfe.html                     # NEU zu erstellende Hinweise/Lerninhalte
  einstellungen.html             # Sprache, Sicherung, Restore
  assets/css/                    # Gemeinsame Gestaltung
  assets/js/                     # Datenmodell, Rechnen, Prüfung, i18n
  dokumentvorlagen/              # Eigenständige neue Dokument-HTMLs
  MASTERPLAN.md                  # Dieses Dokument
```

Direkteinstiege erhalten stabile IDs und validieren fehlende Voraussetzungen. Kein eigener Seitenwildwuchs für einfache Hilfsfunktionen, sofern die Nutzbarkeit gewährleistet ist.

## 9. Speicherung, Privatsphäre und Export

Eigener Namensraum/Version für Nebenkosten Premium; keine alte Speicherung lesen, importieren oder verändern. Zunächst lokaler Ansatz, ohne erfundene geräteübergreifende Synchronisierung. Nutzer sieht Speicher-/Sicherungsstatus. Backup mit Schema-Version und Validierung; Wiederherstellung vor Übernahme prüfen und ursprüngliche Daten schützen. Sensible Bewerber- und Mieterdaten minimieren; Lösch- und Aufbewahrungsfragen fachlich klären. Rechnungsdateien/PDFs aufgrund Browser-Quota separat und transparent behandeln: exportierte Sicherung dokumentiert explizit, welche Daten und Dateien enthalten sind. Kein ungesichertes Versprechen eines vollständigen Archivs.

## 10. Bauabschnitte und Freigaben

- **Baustein 1 – Planung:** vollständig besprochen und am 21.09.2026 freigegeben.
- **Baustein 2 – Technisches Fundament:** Ziel-Repository und -pfad eindeutig prüfen; Masterplan dort versionieren; neue, unabhängige Schemas/Validatoren/Speicherschicht; Berechnungskern mit MH-01–MH-09 als automatisierte Tests. Noch keine fertige Produktbehauptung.
- **Baustein 3 – Immobilienzentrale/Eigentümer:** Datenaufnahme, Dashboard, Kosten, Eigentümerrechnung.
- **Baustein 4 – Vermieterabrechnung:** Umlage, Mietverhältnisse, Zahlungen, Sonderfälle.
- **Baustein 5 – Mietservice/Checks:** Dokumentassistenten und Checklisten.
- **Baustein 6 – PDF/Archiv/Komfort:** separaten PDF-Master integrieren, Dokumentvorlagen, Versionierung, Jahreswechsel, Backup.
- **Baustein 7 – Gesamtabnahme:** Rechentests, PDF-Konsistenz, Vertrags-/Rechtsvorlagen, Datenschutz, iPad/Laptop, DE/EN, keine Regression.

Jeden Abschnitt nachvollziehbar prüfen; der Auftraggeber gibt den nächsten jeweils mit „Baustein fertig“ frei. Keine eigenmächtigen Änderungen an freigegebenen Bestandteilen oder anderem Repository.

## 11. Zielbestätigung und offene Entscheidungen für die spätere Implementierung

1. **Ziel-Repository geklärt (21.09.2026):** `Adler-FSA/lb-tools`, `main`, Verzeichnis `pages/immobilien-premium/`. Keine Änderung außerhalb dieses neuen Bereichs ohne gesonderten Auftrag.
2. **PDF-Master:** konkreten freigegebenen Hotel-Master und Dokumentation identifizieren/prüfen, bevor PDF-Code eingebunden wird.
3. **Beleg-/PDF-Speicherung:** lokaler Speicher, Nutzerdateien und Exportumfang festlegen und gegen Browserverhalten testen.
4. **Rechtliche Fachprüfung:** endgültige Vertrags- und Abrechnungsvorlagen und regulatorische Ausnahmen vor Veröffentlichung prüfen.

**Diese Masterdatei ist das eigenständige Planungsartefakt des Neuaufbaus. Sie enthält keine übernommenen Programmteile oder Daten des Altwerkzeugs.**