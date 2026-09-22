# Baustein 2 – technischer Zwischenstand vor den HTML-Seiten

**22.09.2026 · Weiterhin nicht abgeschlossen oder freigegeben.** Der unveränderte `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md` bleiben maßgeblich. Das alte Nebenkosten-Werkzeug ist unangetastet. Michael muss keine GitHub-Dateien oder JavaScript-Skripte prüfen; seine Sichtprüfung beginnt erst mit einer tatsächlich bedienbaren HTML-Testseite nach technischem Abschluss und Freigabe dieses Bausteins.

## Vorhandenes Fundament

- **2.1/2.2:** unabhängiges Datenmodell v1, isolierte lokale Speicherung, geprüfte JSON-Sicherung und bestätigte Wiederherstellung. Original-PDFs, Bilder und Rechnungsdateien werden durch diese JSON-Sicherung weiterhin nicht vollständig gesichert.
- **2.3 Basis:** unterstützte bestätigte Kostenverteilung auf Eigentümer/Mieter; tatsächlich gezahlte Vorauszahlungen getrennt vom Versorger-Zahlungskreis; Mieterwechsel, Leerstand, Vorauszahlungsänderungen, Kaltwasser-Zählerwechsel und Messwertprüfungen. Keine rechtliche Gesamtfreigabe.
- **2.3 Wärme:** getrennter Heiz-/Warmwasser-Rechner mit Messbasis und eng belegtem Nutzerwechsel. Verbundene Anlagen mit Rechnungsinventur, Vorabtrennung, nicht persistenter Überleitung und Zeilen-Audit. Fachlich offene Varianten bleiben gesperrt.
- **2.3 CO₂:** Gebäudestufe und nicht buchende Einzelmieter-Vorschau für einen eng bestätigten, vollständig vermieteten Standardfall. Eigennutzung, Leerstand, Direktverträge und Rechtsausnahmen bleiben gesperrt.
- **2.3 Versorgung:** rückwärtskompatible `supplyRegistryVersion:1` und `supplyRegistry` im Projektschema, gespeichert und in JSON-Sicherung erhalten. Entwürfe sind speicherbar; bestätigte Preisfassungen, Rechnungsreferenzen und Eigentümerzahlungen werden getrennt geprüft. Keine Tarifdatenbank, kein Tarifvergleich, keine doppelten Kostenbuchungen.
- **2.3 Jahres-Abgleich:** `period-integrity.js` prüft Originalkosten und bereits ermittelte Teilberichte einschließlich Mieter-/Eigentümer-/Versorgerkonten; bloß fällige Vorauszahlungen sind keine Zahlungen.
- **MH-09 Jahreswechsel:** `year-rollover.js` erstellt ausschließlich einen überprüfungsbedürftigen Vorschlag ohne Speicherung, Kopie alter Rechnungen oder Zahlungen.

## Neu: Gemeinsamer technischer Jahresaufruf

**Auf GitHub `main` neu gespeichert:** `assets/js/year-workflow.js`, `assets/js/year-workflow-runner.js` und `tests/year-workflow.test.mjs`. Der Einstieg `previewAnnualPeriod(project, periodId, plans)` ist nun tatsächlich mit den unabhängigen Standard-, Wärme-/Verbund-, CO₂-, Versorger- und Jahresprüffunktionen verdrahtet. Die Ablaufsteuerung validiert die Originalakte, bildet nur **temporäre** fachspezifische Kostenansichten und übergibt den vollständigen unveränderten Originalbestand an den Abschluss-Auditor. Lieferantenzahlungen sind keine zusätzlichen Kosten; temporäre Wärme-Kostentöpfe keine zusätzliche Rechnung. Ein fehlendes Ergebnis, ein Spezialfall ohne unterstützten Berechnungsweg, unbestätigte Versorger oder fehlende Jahressumme sperren vollständig.

Die Rückgabe ist ausschließlich eine **ungebuchte Vorschau**, niemals eine freigegebene Abrechnung: `calculationReady:false`, `combinedForPosting:false`, `legalRelease:false`, `pdfGenerated:false`. Aktuell werden unter anderem gemischte Heizungs-Originalkosten, Heizöl und Wärme-/CO₂-Jahre ohne separat geprüfte Mietervorauszahlungen gesperrt. Der neue Einstieg ist **noch nicht mit allen echten Modulen in einem vollständigen End-to-End-Lauf geprüft**. Details und technische Grenzen: `JAHRESABLAUF.md`.

## Aktueller ehrlicher Testnachweis

Im derzeit verfügbaren lokalen **Teilverzeichnis** am 22.09.2026: **56 Tests aus sechs Dateien bestanden, 0 fehlgeschlagen**. Davon **9 neue Tests der Ablaufsteuerung mit echtem Projektschema, jedoch injizierten Test-Rechnern**; zusätzlich Tests für Datenmodell, Speicherung, Vertragsdaten und deren Persistenz. Die neuen Ablauf-Dateien sowie die Testdatei wurden nach GitHub gespeichert und mit lokalen Git-Blob-Hashes abgeglichen. Die zuvor entwickelten Standard-/Wärme-/CO₂-Module liegen in GitHub, aber nicht vollständig im lokalen gemeinsamen Testverzeichnis. Daher ausdrücklich **kein vollständiger echter Gesamt- oder End-to-End-Test**, keine Addition früherer Teiltestzahlen. Auch keine Browser-/iPad-, GitHub-CI-, PDF- oder rechtliche Abnahme.

## Verbleibende Schritte bis zum technischen Abschluss

1. Sämtliche früheren Grundlagenmodule und MH-01–MH-09-Tests in einem einzigen, reproduzierbaren Prüfumfeld zusammenführen. Den echten neuen `previewAnnualPeriod` mit lückenlosen Originalrechnungen, Mieterwechseln, CO₂, Versorgerkonten und tatsächlichen Vorauszahlungen positiv und negativ prüfen; Abweichungen beheben. Sonderfälle ohne belastbare Lösung bleiben gesperrt.
2. CO₂- und Heizungs-Sonderfälle einschließlich Direktversorgung, Eigennutzung/Leerstand, Heizöl-Bestand, Ersatzwerte und gesetzliche Ausnahmen fachlich eingrenzen. Ununterstützte Fälle dürfen nicht als berechnete Abrechnung ausgegeben werden.
3. Erst nach vollständiger Sperre für ungeprüfte Folgeperioden in **allen** Rechenwegen: tatsächliches Anlegen des Folgejahres sowie Vorjahressnapshots, revisionssichere Änderungslogik und Periodenwechsel testen.
4. MH-01–MH-09 zusammen, Quellenidentität, Datensicherung, Überläufe und Cent-Bilanzen vollständig testen. Danach Baustein 2 zur ausdrücklichen technischen Freigabe vorlegen.

**Erst danach Baustein 3:** tatsächlich bedienbare responsive HTML-Immobilienzentrale zur Sichtprüfung. PDF-Anbindung später nur anhand der genehmigten, zuvor einzusehenden Originalvorlage; keine neue PDF-Engine. Weiterhin keine fertige HTML-Anwendung, keine Mieter-PDF, keine rechtlich geprüfte oder freigegebene Jahresabrechnung.
