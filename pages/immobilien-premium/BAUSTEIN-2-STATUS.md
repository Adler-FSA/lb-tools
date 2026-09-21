# Baustein 2 – technischer Zwischenstand vor den HTML-Seiten

**Stand: 22.09.2026 · Noch nicht abgeschlossen oder freigegeben.** Der unveränderte, freigegebene `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md` bleiben maßgeblich. Das alte Nebenkosten-Werkzeug bleibt unangetastet. Michael muss keinen JavaScript-Code abnehmen: Seine Sichtprüfung beginnt erst an einer tatsächlich bedienbaren HTML-Testseite nach dem technischen Abschluss und der Freigabe dieses Bausteins.

## Vorhandenes Fundament

- **2.1/2.2:** unabhängiges Projektdatenmodell v1, lokale Speichertrennung, strukturierte JSON-Sicherung und bestätigte Wiederherstellung. Original-PDFs, Bilder und Rechnungsdateien sind noch keine vollständig mitgesicherten Dateien.
- **2.3 Standardkosten:** eng begrenzte, belegte Kostenverteilung mit Eigentümer- und Mieteranteilen, tatsächlich gezahlten Mietervorauszahlungen und getrennten Versorgerkonten; bestätigte Nutzerwechsel, Leerstand, Vorauszahlungsänderungen, Kaltwasser-Zählerwechsel und Messwertprüfungen.
- **2.3 Wärme:** separater Heiz-/Warmwasser-Rechenkern mit Messbasis und belegtem Nutzerwechsel. Für verbundene Anlagen sind Rechnungsinventur, centgenaue Vorabtrennung, nicht persistente Überleitung und detaillierter Zeilen-Audit vorhanden. Noch keine vollständige freigegebene Jahresabrechnung.
- **2.3 CO₂:** Gebäudestufe und ungebuchte Einzelmieter-Vorschau für einen eng bestätigten Standardfall mit durchgehender Vermietung. Eigennutzung, Leerstand, Direktverträge und Rechtsausnahmen weiterhin gesperrt.
- **2.3 Versorgung:** bestätigte, lückenlose Preisfassungen, echte Rechnungsbeträge, Eigentümerzahlungen und Mieterdirektverträge werden im getrennten Prüfmodul `supply-review.js` behandelt. Keine Bundesland-Preisdatenbank, kein Tarifvergleich.
- **MH-09:** `year-rollover.js` erstellt nur einen überprüfungsbedürftigen Vorschlag für das Folgejahr, ohne alte Belege, Zahlungen oder Zählerstände zu kopieren oder bereits etwas zu speichern.

## Neu in diesem Arbeitspaket – zwei technische Prüfschritte

1. `assets/js/period-integrity.js` stellt den **reinen Jahres-Abgleich als nicht buchende Vorschau** bereit. Er vergleicht jede originale Kostenposition mit Standard-, Heiz-/Warmwasser- und CO₂-Teilberichten genau einmal. Beträge je Kostenposition, Mieter und Eigentümer werden centgenau abgeglichen; temporäre Kostentöpfe einer verbundenen Anlage werden nicht als zweite Originalrechnung addiert. Gezahlt gemeldete Mietervorauszahlungen werden zusätzlich mit tatsächlichen Quellzahlungen verglichen: Miete und bloß fällige Vorauszahlungen gelten nicht als bezahlt. Die Versorgerbilanz umfasst auch Versorger mit Originalrechnung, aber ohne Zahlung; Guthaben im Versorgerkonto bleibt vom Mieterguthaben getrennt. Fehlende Positionen, doppelte Belege, Abweichungen, nicht geprüfte Rückerstattungen und unsichere Beträge sperren. **Noch kein produktiver Gesamtrechenaufruf, keine Buchung, keine rechtliche Freigabe.** Der Auditor erhält bereits ermittelte Teilberichte; die durchgehende Anwendungskette muss noch eingerichtet und mit Originalmodulen getestet werden.
2. `assets/js/supply-registry.js` prüft **mehrere tatsächliche Versorgerverträge eines Gebäudes im selben Jahr** anhand des bestehenden `supply-review.js`: eindeutige Vertrags- und Kontokennungen, keine mehrfach erfassten Originalrechnungspositionen, vollständige als versorgungsrelevant markierte Kosten, bestätigter Vertragspartner Eigentümer bzw. direkter Mieter und korrekte Wohnungszuordnung. Ein anderer noch nicht überprüfter Versorger wird als solcher ausgewiesen. Dieses Modul verarbeitet ausdrücklich übergebene Datensätze nur lesend; das dauerhafte versionierte Versorgungsformat, seine Validierung im Projektschema und die sichere Speicherung fehlen noch.

## Ehrlicher Testnachweis

Im aktuell verfügbaren lokalen **Teil-Arbeitsverzeichnis** am 22.09.2026 ausgeführt: `node --test tests/*.test.mjs` mit **86 Tests aus 9 Testdateien: 86 bestanden, 0 fehlgeschlagen**. Die beiden neuen Module und ihre Testdateien wurden ausschließlich unter `pages/immobilien-premium/` nach GitHub `main` übertragen; ihre Git-Blob-Hashes stimmen mit den getesteten lokalen Dateien überein. In diesem Teilverzeichnis fehlen weiterhin ältere Grundlagenmodule samt ihren Testdateien. **Daher kein vollständiger GitHub-Gesamttest und keine Addition früherer Testzahlen zu dieser Zahl.** Keine Browser-/iPad-, GitHub-CI-, End-to-End-, PDF- oder juristische Freigabe.

## Noch nötig, bevor Baustein 2 vollständig ist

1. Neue Versorgungsvertragsversionen und Belegreferenzen in das gültige, persistente Projektschema und seine Sicherung integrieren, ohne parallele Kosten- oder Zahlungsdatensätze anzulegen. Den Eintrag als versorgungsrelevant formal validieren.
2. Standard-, Wärme-/Verbund- und CO₂-Rechnung in einen tatsächlichen, quellengeprüften Aufruf mit der Jahres-Abgleichsvorschau überführen; nicht unterstützte Gebäude- und Rechtsfälle einschließlich Heizöl, Eigennutzung und Direktversorgung zuverlässig sperren. Offene Zuordnungs-, Überlauf- und unvollständige Datumsfälle beheben.
3. Vor dem echten Jahreswechsel die Sperre für unbestätigte Folgejahre in **allen** relevanten Rechenwegen nachweisen; Vorjahressnapshots dürfen nicht verändert werden.
4. Sämtliche früheren Grundlagenmodule und MH-01–MH-09-Tests wieder in einem vollständigen, reproduzierbaren Testlauf zusammenführen; zusätzliche End-to-End- und Sonderfallprüfungen durchführen. Juristische Anwendbarkeit und Rechtsstände separat prüfen.
5. Erst nach technischem Abschluss und expliziter Freigabe folgt **Baustein 3: eine tatsächlich bedienbare responsive HTML-Immobilienzentrale zur Sichtprüfung**. Eine PDF-Anbindung erfolgt später nur nach Prüfung der bereits genehmigten Originalvorlage; keine neue PDF-Engine erfinden.

**Baustein 2 ist offen. Kein freigegebenes Produkt, keine HTML-Bedienoberfläche, keine Mieter-PDF und keine verbindliche Abrechnung.**
