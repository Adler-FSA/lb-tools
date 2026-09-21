# Verbindliche Masterplan-Ergänzung – Versorgung, Einkauf und reale Jahreskosten

**Stand: 21.09.2026 · Entscheidung im Projektgespräch bestätigt.** Ergänzt den bestehenden `MASTERPLAN.md` (insbesondere Abschnitte 3–5 und Bauabschnitte 2–4), ohne dessen bestehende Festlegungen zu ersetzen. Keine Änderung am früheren Nebenkosten-Werkzeug.

## Grundentscheidung

Der Hauseigentümer kennt seine eigenen Versorgungsverträge. Er erfasst **ausschließlich seine tatsächlichen Vertrags- und Rechnungswerte**; die Anwendung benötigt **keine Preis-Datenbank nach Bundesland, keinen automatischen Tarifvergleich, keine externen Anbieterabfragen und keine erfundenen Durchschnittspreise**. Daten nur dort erfragen, wo sie für Planung und Abrechnung benötigt werden. Die bestehende Navigation und die zwölf vereinbarten Werkzeuge bleiben bestehen: Versorgung und Einkauf sind Funktionen innerhalb der Immobilienakte bzw. „Kosten & Abrechnung“, **kein neues dreizehntes Werkzeug und keine neue Hauptnavigation**.

## Minimaler Erfassungsweg

1. **Versorgung je Objekt/Leistung:** Sparte (z. B. Gas, Strom, Wasser, Fernwärme, Heizöl), Vertrags-/Versorgerkennung, tatsächlicher Vertragspartner bzw. Rechnungsempfänger **Eigentümer oder Mieter direkt**, Bezug zum Gebäude oder zur Einheit. Keine personenbezogenen Daten erheben, die für den Zweck nicht notwendig sind.
2. **Vertragswerte zur Planung:** nach Bedarf Vertragsbeginn und Gültigkeitszeiträume, vereinbarter Grundpreis (mit Bezugszeitraum), Arbeits-/Verbrauchspreis samt Einheit und ausdrücklich dokumentierter Preisbasis, geplante Verbrauchsmenge und Abschlag/Fälligkeit. Preise in ganzzahligen Cent je klar definierter Einheit oder als exakte Dezimal-/Brucharithmetik; keine ungeprüften Gleitkommasummen. Tarif- und Preisänderungen als gültigkeitsdatierte neue Fassung, alte Vertragswerte bleiben historisch erhalten.
3. **Reale Kosten zur Abrechnung:** Verbrauch und endgültige Rechnungsbeträge aus der konkreten Jahres-/Schlussrechnung, Rechnungs- und Leistungszeitraum, nachprüfbare Kostenpositionen bzw. Belegreferenz. Geleistete Abschläge, Gutschriften und Nachzahlungen als **separate echte Eigentümer-/Versorgerzahlungen** führen. Die Abrechnung ist nicht aus geschätzten Vertragskosten abzuleiten. Unterjährige Preisänderungen werden anhand der Rechnung nachvollziehbar; keine frei erfundene Aufteilung.
4. **Direktvertrag eines Mieters:** Dieser übernimmt seine Versorgung unmittelbar selbst. Solche Lieferkosten gehen **nicht noch einmal** als Eigentümerrechnung in die Mieter-Betriebskostenabrechnung ein. Andere ggf. zu prüfende Sonderfragen (etwa CO₂-Kostenaufteilung bei eigener Gasversorgung) bleiben eigenständige, fachlich zu prüfende Fälle; kein pauschaler Automatismus.

## Strikte Ergebnis-Trennung

- **Prognose/Planung:** vertragliche Grund- und Arbeitspreise, angenommener Verbrauch, geplante Abschläge; ausdrücklich als Schätzung kennzeichnen.
- **Tatsächliche Gebäudekosten:** nur belegte, dem Gebäude zuzuordnende, bestätigte Ist-Kosten. Jede Rechnung wird genau einmal gezählt.
- **Versorger-Zahlungsstand:** tatsächlich bezahlte Abschläge/Erstattungen unabhängig von den Rechnungskosten; ein Versorgerguthaben ist **kein** automatisch identisches Mieterguthaben.
- **Individuelle Mieterabrechnung:** erst die dafür bestätigten und rechtlich zu prüfenden Kostenarten, Verträge, Umlageschlüssel, Verbräuche und tatsächlich anrechenbaren Mietervorauszahlungen berücksichtigen; Eigentümerkosten, Lieferantenzahlungen und Direktverträge der Mieter nicht vermischen.

## Datenmodell und technische Schutzregeln

Ergänzend zu den bestehenden Sammlungen wird bei Umsetzung eine eigene, versionierte Zuordnung für Versorgungsverträge, Preisstände und Rechnungsbelege modelliert. **Bestehende `expenses` und `cashflows` nicht duplizieren**, sondern über stabile IDs auf Versorgung, Versorgerkonto, Objekt, Einheit, Leistungszeitraum und Dokument verweisen. Ein Vertragspreis ist nicht automatisch eine echte Rechnung; ein Abschlag ist nicht automatisch ein Aufwand. Keine automatische Nutzung externer Preisquellen. Werden Schemaänderungen nötig, müssen sie ausdrücklich versioniert und gegen vorhandene Projektdaten/Backups getestet werden; keine stillen Änderungen am bereits angelegten Schema v1 oder Import aus dem Altwerkzeug.

## Umsetzung und Prüfungen

- **Baustein 2 (noch offen):** Eingabe-/Rechnungsobjekte und Prüfregeln planen, insbesondere Einheiten, Preiszeiträume, Vorzeichen/Gutschriften, direkte Mieterverträge, fehlende Belege und Nicht-Doppelzählung. Die Heiz-/Warmwasser-Messbasis absichern, Sonderregeln bei Nutzerwechsel, verbundenen Anlagen und CO₂ gesondert entwickeln; keine falsche Vollständigkeitsbehauptung.
- **Baustein 3:** geführte Erfassung der Eigentümer-Vertragsdaten, Plan-/Ist-Anzeige und separate Versorger-Zahlungsübersicht ohne Tarifdatenbank.
- **Baustein 4:** nur geprüfte Ist-Kosten und bestätigte Umlagen in Mieterabrechnungen aufnehmen; Direktverträge ausgrenzen und fachliche Sonderfälle anzeigen.
- **Abnahmetests:** Vertragsprognose ungleich Ist-Rechnung, Preiswechsel, Versorgerabschläge/Guthaben, zwei Versorger, Direktvertrag des Mieters, fehlende Jahresrechnung, Kosten- und Zahlungsduplikate sowie klare Eigentümer-/Mieter-Trennung.

**Produktfreigabe:** Es wird kein Vertragswert als rechtsgültiger Endabrechnungsbetrag, kein prognostiziertes Guthaben als ausgezahltes Geld und kein unfertiges Heiz-/CO₂-Rechenmodul als freigegebene Abrechnung ausgegeben. Die vorhandene gesondert freigegebene PDF-Zentrale bleibt unverändert vorgesehen; keine eigene PDF-Engine ergänzen.