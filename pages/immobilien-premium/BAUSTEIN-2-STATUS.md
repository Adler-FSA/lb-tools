# Baustein 2 – technischer Zwischenstand vor den HTML-Seiten

**22.09.2026 · Nicht abgeschlossen, nicht freigegeben.** Maßgeblich bleiben `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md`. Das frühere Nebenkosten-Werkzeug bleibt unangetastet. Michael soll keinen Programmcode prüfen; seine Sichtprüfung beginnt erst mit bedienbaren HTML-Seiten nach dem Abschluss von Baustein 2.

## Vorhandene technische Teile

- Eigenständiges Projektdatenmodell v1 mit rückwärtskompatiblem Versorgungsverzeichnis; getrennte lokale Speicherung, JSON-Sicherung und bestätigte Wiederherstellung. **Original-PDFs, Bilder und Rechnungsdateien werden noch nicht vollständig mitgesichert.**
- Allgemeiner Berechnungskern für bestätigte Standardkosten, Eigentümer- und Mieteranteile, tatsächlich gezahlte Mietervorauszahlungen und getrennte Versorgerzahlungen. Bekannte Sonderfälle werden gesperrt.
- Separater Heiz-/Warmwasserrechner, geprüfte Messbasis und belegter Nutzerwechsel; für verbundene Anlagen Vorabtrennung, temporäre Überleitung und Zeilen-Audit. Noch keine fachlich freigegebene Heizkostenabrechnung.
- CO₂-Gebäudeprüfung und nicht buchende Einzelmieter-Vorschau für einen engen, vollständig vermieteten Standardfall. Eigennutzung, Leerstand, Direktverträge und rechtliche Ausnahmen sind nicht allgemein umgesetzt.
- Versorgungsverträge als bestätigbare, speicherbare Datensätze mit eigenen Preisständen, Originalrechnungsreferenzen und getrennten Abschlägen. Entwürfe bleiben ausdrücklich Entwürfe; keine regionale Preis-Datenbank.
- `year-workflow-runner.js` verbindet die bestehenden echten Standard-, Wärme-/Verbund-, CO₂-, Versorger- und Jahresprüfungsfunktionen. Der gemeinsame Ablauf `year-workflow.js` erzeugt ausschließlich eine **nicht buchbare Jahresvorschau**, keinen Bescheid, keine Freigabe und kein PDF.
- MH-09 bereitet ein neues Jahr bislang nur als ungespeicherten, überprüfungsbedürftigen Vorschlag vor. Der eigentliche Jahreswechsel gehört gemäß Masterplan zur späteren PDF-/Archivphase und darf die Vorjahresdaten nicht verändern.

## Neues überprüftes Arbeitspaket: Jahresablauf absichern

Der Orchestrator nutzt jetzt getrennte Kopien von Originalprojekt und Fachplänen pro Rechenstufe. Selbst ein versehentlich verändernder Prüfer oder Spezialrechner kann dadurch weder die übergebene Projektakte noch die Daten des nächsten Prüfschritts verändern. Der Abschluss prüft unabhängig nochmals die vollständige Menge und Kennungen aller Originalrechnungen, Gebäude und Jahr, die Originalkostensumme, Eigentümer- und Mietersumme sowie die Kennzeichnung, dass weder Prognosen noch Versorgerzahlungen als Kosten oder CO₂ als Buchung hinzugerechnet wurden. Fehlende Kostenposition, Betragsabweichung, falsches Gebäude, manipulierte Freigabekennzeichen oder Cent-Überlauf sperren den Bericht.

Neu getestet ist außerdem ein Ablauf mit **echtem** Projektschema und **echtem** `reviewSupplyRegistry` für einen belegten Versorger inklusive Prognose, Jahresrechnung und Abschlägen; Standard-, Wärme- und Jahresauditor bleiben hierbei bewusst Test-Rechner. Dieses Szenario beweist die Versorger-Anbindung, nicht die volle Jahresabrechnung.

**Nachweis vom 22.09.2026:** Im derzeit verfügbaren lokalen Teilverzeichnis wurden `node --test tests/*.test.mjs` mit **60 Tests aus sechs Testdateien ausgeführt: 60 bestanden, 0 fehlgeschlagen**. Vier neue Tests überprüfen Manipulationssperren, Überlauf, gegenseitige Isolation und echte Versorger-Anbindung. Die beiden geänderten Quell-/Testdateien wurden nach GitHub `main` geschrieben; Git-Blob-Hashes entsprechen den lokal getesteten Fassungen. Das lokale Verzeichnis enthält noch nicht alle früheren Grundlagen- und Spezialmodule. **Keine durchgängige End-to-End-Prüfung des echten `previewAnnualPeriod`, keine vollständige GitHub-Gesamtsuite**, keine Browser-/iPad-, PDF-, CI- oder Rechtsfreigabe. Frühere Testzahlen werden nicht addiert.

## Verbleibend vor technischer Abnahme

1. Alle ursprünglichen Grundlagen- und Spezialmodule samt MH-01–MH-09-Tests in einem vollständigen Prüfumfeld bereitstellen. Den realen `previewAnnualPeriod` mit belegten Originalrechnungen, echten Mieterzahlungen, getrennten bzw. verbundenen Wärmefällen, CO₂ und Versorgern positiv und negativ prüfen und entdeckte Schnittstellenfehler korrigieren.
2. Heizungs-/CO₂-Sonderfälle, Ausnahmen und Direktverträge fachlich abgrenzen; nicht unterstützte Fälle bleiben gesperrt. Fehlende Zahlungseingänge, falsche Originalbelege, doppelte Rechnungen, Überläufe und Gebäude-/Jahreswechsel mit Originalmodulen nachvollziehbar nachweisen.
3. Daten- und Snapshot-Integrität, MH-01–MH-09 und vollständige Testsuite reproduzierbar nachweisen. Rechtsfragen vor einer Abrechnungsfreigabe getrennt prüfen.
4. Erst nach vollständig geprüfter technischer Grundlage Baustein 2 explizit abnehmen; **Baustein 3** liefert die responsive, bedienbare HTML-Immobilienzentrale für Michaels eigentliche Sichtprüfung. PDF-Anbindung ausschließlich später nach Einsicht der freigegebenen Originalvorlage.

**Keine fertige HTML-Anwendung, Mieter-PDF oder rechtlich freigegebene Jahresabrechnung. Baustein 2 bleibt offen.**
