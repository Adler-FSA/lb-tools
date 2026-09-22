# Nebenkosten Premium – gemeinsamer Jahresablauf (Baustein 2.3)

**22.09.2026 · Technische, nicht buchende Vorschau. Keine Produkt-, Rechts-, HTML- oder PDF-Freigabe.** Der genehmigte `MASTERPLAN.md`, `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md`, das alte Nebenkosten-Werkzeug und die genehmigte PDF-Mastervorlage bleiben unverändert.

## Zusammenschaltung

Der echte Einstieg `assets/js/year-workflow-runner.js` stellt `previewAnnualPeriod(project, periodId, plans)` bereit und verbindet die vorhandenen Funktionen für Projektvalidierung, Standardkosten, getrennte beziehungsweise verbundene Heiz-/Warmwasserkosten, CO₂-Vorschau, Versorgerkonten und den Jahres-Abgleich. `year-workflow.js` steuert diese Schritte, legt aber nichts in der Projektakte an. Für jede Berechnungsstufe werden Wegwerfkopien angelegt; dadurch kann ein fehlerhaftes oder mutierendes Teilmodul weder die Eingaben des Eigentümers noch die nachfolgenden Prüfungen verändern. Plansätze werden ebenso isoliert.

Es wird gegen den **unveränderten Originalkostenbestand** geprüft. Standard- und Wärmerechner erhalten nur vorübergehende relevante Ansichten. CO₂ wird gesondert behandelt; Lieferantenzahlungen werden nie als Kosten addiert und temporäre Wärmetöpfe niemals als zusätzliche Originalrechnung gezählt. Ein ungeprüftes Folgejahr, fehlende Rechnung, falscher Plan, Heizöl-Sonderfall, gemischte Wärmearten, ungeprüfter Vertrag oder fehlendes Fachergebnis sperrt vollständig.

## Neuer abschließender Schutz

Nach dem spezialisierten `auditPeriodPreview` verifiziert die Ablaufsteuerung unabhängig noch einmal, dass alle Originalrechnungs-IDs vollständig und ausschließlich einmal im Bericht vorkommen, Gebäude und Abrechnungsjahr übereinstimmen und die Originalkosten exakt Eigentümer- plus Mieteranteilen entsprechen. Sie sperrt bei Cent-Überlauf oder wenn Prognosen, Versorgerzahlungen oder ungebuchte CO₂-Kosten als gebuchte Kosten bezeichnet werden. Ein positives Ergebnis bleibt `status:'preview'`, `calculationReady:false`, `scope:'annual_workflow_preview_only'`, `combinedForPosting:false`, `legalRelease:false`, `pdfGenerated:false`. Keine Mieter-PDF, kein Bescheid, keine Buchung.

## Verifizierte Tests und ihre Grenzen

Im derzeit verfügbaren lokalen **Teilprojekt** wurden am 22.09.2026 `node --test tests/*.test.mjs` ausgeführt: **60 Tests in sechs Dateien bestanden, 0 fehlgeschlagen**. Die 13 Jahresablauf-Tests prüfen die Ablaufsteuerung mit tatsächlichem Projektschema und überwiegend injizierten Test-Rechnern. Davon vier neu: fehlende/manipulierte Originalbelege und Summen, Überlauf, Isolation selbst bei verändernden Rechenmodulen und ein zusammengesetzter Fall mit der **echten** Versorgervertragsprüfung `reviewSupplyRegistry` einschließlich Prognose, Originalrechnung und Abschlag. Die übrigen Standard-, Wärme- und Abschlussrechner sind in diesem zusammengesetzten Fall weiterhin Test-Rechner. Quellcode und Testdatei wurden nach GitHub `main` übertragen und stimmen anhand ihrer Git-Blob-Hashes mit dem lokalen Teststand überein.

**Ausdrücklich weiterhin offen:** Der komplette echte Einstieg mit sämtlichen früher entwickelten Standard-/Wärme-/CO₂-Modulen sowie sämtlichen MH-01–MH-09-Tests konnte noch nicht in einem gemeinsamen Prüfumfeld ausgeführt werden, weil im lokalen Arbeitsverzeichnis ältere Module fehlen. Die 60 sind kein Gesamtnachweis. Keine GitHub-CI-, Browser-/iPad-, PDF- oder juristische Abnahme. Die vollständige Integration und ihre Sonderfallprüfungen sind der nächste technische Meilenstein.

Danach ist Baustein 2 ausdrücklich technisch abzunehmen; erst anschließend werden in Baustein 3 bedienbare responsive HTML-Seiten für Michaels tatsächliche Sichtprüfung gebaut. Der Jahreswechsel bleibt vorerst ein ungespeicherter Vorschlag und darf Vorjahreswerte nicht verändern.
