# Baustein 2 – technischer Zwischenstand vor den HTML-Seiten

**22.09.2026 · Offen, nicht freigegeben.** `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md` bleiben unverändert maßgeblich. Das alte Nebenkosten-Werkzeug wurde nicht verändert. Michael muss keinen Programmcode prüfen; seine Sichtprüfung erfolgt erst an einer tatsächlich bedienbaren HTML-Oberfläche nach technischer Freigabe von Baustein 2.

## Vorhandene Bauteile

- Eigenständiges Datenmodell v1, bestätigbare Versorgungsverträge und Entwürfe, getrennte lokale Speicherung, JSON-Sicherung und Wiederherstellung. Die reinen JSON-Sicherungen enthalten noch nicht die Originaldateien von Rechnungen, Bildern oder PDFs.
- Standardkosten mit Eigentümer-/Mieteranteilen, getrennten echten Mietervorauszahlungen und Versorgerzahlungen. Unterstützte Nutzerwechsel, Leerstände, historische Vorauszahlungen und Kaltwasserzählerkontrollen.
- Isolierte Heiz-/Warmwasser-Berechnung mit belegten Messgrößen und Nutzerwechsel. Für verbundene Anlagen Originalrechnungsinventur, Vorabtrennung, temporäre Überleitung und Zeilen-Audit.
- Separater CO₂-Gebäude- und Einzelmieter-Prüfpfad für begrenzte belegte Standardfälle; keine allgemeine Sonderfallfreigabe.
- `year-workflow-runner.js` ruft die echten Standard-, Wärme-, CO₂-, Versorgungs- und Abgleichmodule auf und kann ausschließlich eine **nicht buchbare Jahresvorschau** liefern. Jahreswechsel bisher lediglich als ungeprüfter, nicht gespeicherter Vorschlag.

## Aktuelles Arbeitspaket: konkrete Schnittstellenlücke erkannt und behoben

Die bisherige Jahresablaufsteuerung hatte eine sachlich zu grobe Sperre: Bei verbundenen Anlagen wurde jede gemeinsame Heiz-/Warmwasserrechnung zusammen mit einer ausschließlich zur Heizung oder zum Warmwasser gehörenden Wartungsrechnung als unzulässiger Mischbestand blockiert. **Gerade diese Rechnungsart ist im bereits entwickelten Modul `thermal-linked.js` ausdrücklich vorgesehen.**

`assets/js/linked-inventory-guard.js` prüft jetzt, ob eine verbundene Anlage sämtliche gemeinsam und einzeln entstandenen Wärme-Kostenpositionen eindeutig, vollständig und ausdrücklich bestätigt im Anlagenplan führt. `year-workflow.js` benutzt diese Prüfung statt der bisherigen pauschalen Sperre. Eine fehlende, falsche, doppelte oder unbestätigte Originalposition sperrt weiterhin; die bestehende echte Kosten-Vorabtrennung kontrolliert danach Originalrechnungen, Beträge, Energiebelege und Cent-Summen. Es entstehen keine zusätzlichen gespeicherten Rechnungen oder Zahlungen.

Neu hinterlegt sind `tests/linked-inventory-guard.test.mjs` mit acht positiven/negativen Tests und `tests/annual-real-engines.test.mjs` mit drei **echten, noch auszuführenden** Integrationsfällen über den Produktionseinstieg `previewAnnualPeriod` (Standardkosten und getrennte Wärme gemeinsam, unbestätigtes Folgejahr, fehlender Rechnungs- oder Messnachweis). Die Integrationsfälle nutzen keine injizierten Test-Rechner.

## Tatsächlich verifizierter Teststand und offen gelegte Blockade

Die acht Tests des eigenständigen Originalrechnungs-Inventurprüfers wurden lokal ausgeführt: **8 bestanden, 0 fehlgeschlagen**. JavaScript-Syntax des neuen Integrations-Tests wurde separat geprüft. Nach Einbeziehung des echten Integrationstests schlug der lokale Gesamtversuch fehl, weil im aktuellen Arbeitscontainer `assets/js/model.js` und weitere früher entwickelte Originalmodule nicht vorhanden sind: **9 Tests erfasst, 8 bestanden, 1 wegen `ERR_MODULE_NOT_FOUND` nicht gestartet.** Dies ist ein fehlendes vollständiges Testumfeld, kein erfolgreich absolvierter End-to-End-Test. Die früher berichteten Teiltestergebnisse sind keine gemeinsame Gesamt-Testzahl. Die neuen Dateien und die geänderte Ablaufsteuerung sind auf GitHub `main` gespeichert; die Integrationsfälle sind dort **noch nicht als erfolgreich ausgeführt nachgewiesen**. Keine Browser-, iPad-, CI-, Rechts- oder PDF-Abnahme.

## Nächste unverzichtbare Arbeit vor Baustein 3

1. Alle tatsächlichen GitHub-Originalmodule und sämtliche Testdateien MH-01 bis MH-09 in **einem** reproduzierbaren vollständigen Testumfeld zusammenführen. Die neu gespeicherten drei echten Jahresablauf-Integrationstests ausführen, Fehler nach Ergebnis korrigieren; anschließend getrennte und verbundene Anlagen mit CO₂, echten Zahlungen, Versorgern, Leerstand und Direktversorgung ergänzen bzw. nicht unterstützte Varianten eindeutig sperren.
2. Originalbeleg-, Gebäude-/Perioden- und Cent-Reconciliation sowie Vertragsregister, Speicherung und Datenintegrität im vollständigen Projekt prüfen. Jahre im Prüfstatus dürfen nirgends versehentlich berechenbar sein. Jahreswechsel darf keine Vorjahreswerte überschreiben.
3. Offen gebliebene rechtliche Sonderfälle, insbesondere CO₂ bei Eigentümern/Leerstand, Direktversorgung, Heizölbestände, Ersatzwerte und gesetzliche Ausnahmen, gesondert fachlich prüfen. Bis dahin keine automatische Freigabe solcher Fälle.
4. Erst nach reproduzierbarer Gesamtsuite und technischer Abnahme Baustein 2 abschließen. **Danach Baustein 3 mit tatsächlich bedienbarer responsiver HTML-Immobilienzentrale für Michaels Sichtprüfung.** PDF-Integration später nur anhand der genehmigten Originalvorlage.

**Aktuell: keine fertige HTML-Seite, keine Mieter-PDF, keine rechtlich freigegebene oder vollständig end-to-end getestete Jahresabrechnung. Baustein 2 bleibt offen.**
