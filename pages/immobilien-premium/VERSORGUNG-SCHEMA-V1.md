# Nebenkosten Premium – Versorgungsverträge im Projektdatenmodell

**Stand: 22.09.2026 · Baustein 2.3 · technische Umsetzung, keine Produkt-, Rechts- oder HTML-Freigabe.** Maßgeblich sind weiterhin `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md`. Der alte Nebenkostenrechner bleibt unangetastet.

## Entscheidung des Eigentümers

Es werden ausschließlich die eigenen Versorgungsverträge und später die tatsächlich erhaltenen Originalrechnungen erfasst. Keine Preise nach Bundesland, keine Tarifsuche, keine erfundenen Marktdaten. Der Versorger, die Sparte, der Vertragsinhaber, dokumentierte Preisstände und bei Bedarf der Wohnungsbezug genügen für die Erfassung. Es gibt keine zusätzliche Hauptnavigation und kein weiteres Werkzeug.

## Rückwärtskompatible v1-Erweiterung

`assets/js/model.js` erzeugt neue Projekte weiterhin mit `schemaVersion:1` und dem bisherigen isolierten Speicherschlüssel. Hinzu kommen `supplyRegistryVersion:1` und `supplyRegistry:[]`. Bestehende **Nebenkosten-Premium-v1-Projekte ohne diese beiden Felder** bleiben unverändert les- und speicherbar; es wird weder automatisch eine Migration des alten Nebenkostenrechners vorgenommen noch ein altes Projekt überschrieben. Wenn eines der beiden neuen Felder vorhanden ist, müssen beide gültig sein.

`assets/js/supply-schema.js` prüft eindeutige IDs und Versorgerkonten je Periode, Gebäude/Einheit/Perioden-Referenzen, bestätigte Vertragsinhaber, Preisfassungen, Originalbeleg- und Zahlungszuordnung. Änderungen erzeugen weder zweite `expenses` noch zweite `cashflows`.

### Vertragsdaten zuerst – Jahresrechnung später

Ein Datensatz mit `confirmed:false` ist ein **speicherbarer Entwurf**. Lieferant/Sparte, Vertragsinhaber und Gebäude/Abrechnungsperiode müssen stimmen. Schon eingegebene Preise haben gültige Datums- und Centformate. Noch unbekannte zukünftige Preisstände, Originalrechnungsbeträge und Verbrauchswerte werden nicht erfunden und müssen zur Speicherung eines Entwurfs nicht vorliegen. Vorhandene Rechnungsreferenzen müssen zum richtigen Versorger gehören. Bei direkter Mieterversorgung sind Eigentümerrechnungen und -zahlungen unzulässig.

`confirmed:true` bezeichnet ausschließlich einen **vollständig dokumentierten, bestätigten Jahresdatensatz**, nicht eine rechtlich freigegebene Betriebskostenabrechnung. Eigentümerverträge benötigen `contract.confirmed:true`, lückenlose belegte Preisversionen über das gesamte Jahr, alle eindeutig referenzierten Originalpositionen (`expenseIds`) und exakte belegte Rechnungssummen je `invoiceReference`. Der Ausweis als `supplyManaged:true` auf der **ursprünglichen** Kostenposition verknüpft sie mit dem Vertrag. Die Beträge selbst bleiben ausschließlich in `expenses`, wirkliche Zahlungen/Erstattungen ausschließlich in `cashflows`. Vertragsprognosen werden **nicht** als Ist-Kosten gebucht. Beim Direktvertrag eines Mieters gibt es in diesem Eigentümerkonto keine Versorgerkosten oder -zahlungen; Spezialansprüche wie CO₂ sind davon getrennt zu prüfen.

Die Prüfung verlangt für bestätigte Versorgerkosten im gegenwärtig unterstützten Ausschnitt vollständige Jahres-Leistungszeiträume. Unterjährige Originalrechnungen, Teiljahresverträge, Abschlagsschätzungen und komplizierte Lieferantenwechsel sind damit **noch nicht automatisch abrechenbar**; dafür braucht es einen eigenen belegten Rechenweg. Beim späteren HTML-Eingabefluss müssen ein neu erfasster versorgungsrelevanter Beleg und seine Vertragsreferenz im selben gesicherten Speichervorgang ergänzt werden, statt vorübergehend eine verwaiste Rechnung zu speichern.

## Speichern, sichern, wiederherstellen

Die bestehenden Funktionen `saveProject`, `loadProject`, `createBackup`, `previewBackup` und `restoreBackup` verwenden das erweiterte `validateProject`. Fehlerhafte Vertragssummen, Versionen, Doppelreferenzen oder beschädigte Datensätze werden nicht still korrigiert. Bestätigte Vertragsdaten und Entwürfe werden **im selben Projekt-JSON** gespeichert und nach bestätigter Wiederherstellung mitgeführt. Die Sicherungsvorschau zeigt bei vorhandenen Lieferantenverträgen zusätzlich deren Anzahl. Neue, bereits freigegebene Dokument-Snapshots bleiben unveränderbar; es gibt keine neue parallele Rechnungsdatenbank.

Originaldateien, Bilder und PDFs gehören weiterhin **nicht** zu dieser JSON-Sicherung. Eingebettete Dateiinhalte in Versorgungsdatensätzen werden für die Sicherung zurückgewiesen. Das JSON ist nicht verschlüsselt und ersetzt keine vollständige Dateisicherung.

## Verbindung zur vorhandenen Versorgerprüfung

`reviewSupplyRegistry(project, periodId, project.supplyRegistry.filter(r => r.accountingPeriodId === periodId))` kann bestätigte **gespeicherte Vertragsdatensätze** bereits auswerten; der reale Speicher-/Lade-/Prüfweg ist mit einem zusätzlichen Test geprüft. Ein Entwurf bleibt bei dieser Jahresprüfung gesperrt. Der Prüfbericht ist lesend und erstellt **keine** Buchungen; sein Feld `persisted:false` meint, dass der **Prüfbericht selbst** nicht gespeichert wurde, nicht dass die Vertragsdaten fehlen. Eine Bedienoberfläche und ein zentraler produktiver Abrechnungsaufruf sind weiterhin ausstehend.

## Testnachweis und Grenzen

Am 22.09.2026 lokal gemeinsam ausgeführt: **47 Tests, 0 Fehler** aus den originalgetreu wiederhergestellten vorhandenen Modell-/Speichertests und den neuen Tests für Schema, Speicherung und echte Übergabe an die Versorgerprüfung. Dieser Lauf deckt **nicht** den kompletten GitHub-Bestand mit Standard-, Heiz-, CO₂- und Jahreswechselmodulen ab; frühere separate Testzahlen dürfen nicht addiert werden. Kein Browser-/iPad-Test, keine juristische Freigabe, kein HTML oder PDF.

**Baustein 2 bleibt offen:** Es fehlen der durchgängige Gesamtrechenaufruf, nicht unterstützte CO₂- und Heizkostenfälle, der sicher geprüfte Jahreswechsel sowie ein reproduzierbarer Gesamttest. Erst nach vollständiger technischer Prüfung und Freigabe beginnt Baustein 3 mit der sichtbaren HTML-Immobilienzentrale für Michael.
