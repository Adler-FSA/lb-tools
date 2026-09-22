# Baustein 2 – technischer Zwischenstand vor den HTML-Seiten

**22.09.2026 · Offen, nicht freigegeben.** Der freigegebene `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md` bleiben unverändert maßgeblich. Das frühere Nebenkosten-Werkzeug bleibt unangetastet. Michaels Sichtprüfung beginnt mit einer tatsächlich bedienbaren HTML-Oberfläche nach der technischen Freigabe von Baustein 2; keine Codeabnahme durch den Nutzer.

## Bereits vorhandenes Fundament

- Eigenständiges Projektdatenmodell v1, speicherbare Vertragsentwürfe und bestätigte Versorgungsverträge, isolierte lokale Speicherung, JSON-Backup und bestätigte Wiederherstellung. Originaldateien von Rechnungen, Bildern und PDFs sind ausdrücklich **nicht** Teil dieser JSON-Sicherung.
- Standardkosten: Eigentümer-/Mieteranteile, tatsächliche Mietervorauszahlungen, separater Versorger-Zahlungskreis, unterstützte Nutzerwechsel, Leerstände, Änderungen von Vorauszahlungen und Kaltwasser-Zählerprüfungen.
- Heizung/Warmwasser: eigenständiger Rechenkern, belegte Messbasis und Nutzerwechsel; verbundene Anlagen mit Originalrechnungsinventur, Vorabtrennung, temporärer Überleitung und Cent-Audit. `linked-inventory-guard.js` erlaubt zusätzlich eindeutig inventarisierte direkte Wartungs-/Einzelkosten statt einer pauschalen Mischkosten-Sperre.
- CO₂: Gebäudeprüfung und nicht buchende Einzelmieter-Vorschau nur für eng bestätigte Standardfälle. Andere Gebäude-, Nutzungs- und Rechtsfälle nicht allgemein unterstützt.
- `year-workflow-runner.js` verbindet die echten Standard-, Wärme-, CO₂-, Versorger- und Prüffunktionen mit einer ausschließlich nicht buchbaren Jahresvorschau. Jahreswechsel bleibt ein nicht gespeicherter, bestätigungsbedürftiger Vorschlag.

## Neu: verlässliche Jahres- und Zahlungszuordnung vor dem echten Rechenaufruf

`assets/js/year-scope.js` und seine Tests sind neu. Der Produktionseinstieg `previewAnnualPeriod` führt den Quellencheck nun **vor** sämtlichen Fachrechnern aus. Ein Rechnungsdatensatz mit offenem bzw. fehlendem Enddatum darf nicht wie zuvor bei der ursprünglichen Quellenfilterung unbemerkt aus dem Jahresinventar verschwinden: Alle überlappenden Originalpositionen werden erfasst; nur genau zum ausgewählten Jahr passende, vollständige Zeiträume gehen weiter. Teilüberlappungen blockieren statt geschätzt zu werden.

Auch Mieter- und Versorgerzahlungen im ausgewählten Gebäude werden geprüft. Einem Jahr zugewiesene Zahlungen mit Buchungsdatum außerhalb dieses Jahres sowie im Jahr datierte, aber keiner Abrechnungsperiode zugewiesene Zahlungen sperren die Jahresvorschau. Zahlungen, die ausdrücklich einem anderen Jahr zugeordnet sind, werden **nicht** automatisch umgebucht. Für legitime periodenfremde Zahlungen ist später ein eigens bestätigter Zuordnungsweg nötig. Dieser Check speichert, ändert oder verbucht keine Daten.

## Testnachweis – Zahlen nicht vermischen

**Aktuell in diesem lokalen Teilverzeichnis tatsächlich ausgeführt:** `node --test tests/linked-inventory-guard.test.mjs tests/year-scope.test.mjs` → **17 bestanden, 0 fehlgeschlagen** (8 ursprüngliche Inventurtests + 9 neue Quellen-/Zahlungsperioden-Tests). Syntax der neuen Dateien geprüft; die SHA der beiden neuen Dateien auf GitHub entspricht den getesteten lokalen Git-Blobs. Die Produktionsverknüpfung ist auf GitHub `main` gespeichert.

**Noch kein bestandener Gesamttest:** `tests/annual-real-engines.test.mjs` enthält drei genuine End-to-End-Testfälle, kann im aktuellen lokalen Teilverzeichnis jedoch nicht starten (`ERR_MODULE_NOT_FOUND: assets/js/model.js` sowie weitere dort fehlende Originalmodule). Im aktuellen lokalen Versuch ergibt `npm test` daher **8 bestanden, 1 nicht gestartet** vor Hinzunahme der neuen Tests; das ist kein bestandener Gesamtlauf. Frühere Teiltestzahlen dürfen nicht aufaddiert werden. Keine Browser-, iPad-, GitHub-CI-, PDF- oder Rechtsabnahme.

## Eng begrenzte Abschlussstrecke – keine neuen unsichtbaren Funktionspakete

1. Vollständigen Repository-Teststand mit sämtlichen echten Originalmodulen und MH-01–MH-09-Testfällen in einem einzigen reproduzierbaren Lauf prüfen; erst dann einen Gesamt-Teststand berichten. Die drei echten Jahresintegrationsfälle und Negativfälle mit verbundenen Anlagen, CO₂, Kosten- und Zahlungsquellen gemeinsam durchlaufen lassen, Schnittstellenfehler beheben.
2. Nicht unterstützte Fälle (u. a. Heizöl, Eigennutzung/Leerstand beim CO₂, Direktversorgung, Ersatzwerte und nicht geprüfte Rechtsausnahmen) konsequent gesperrt lassen. Originalbelegidentität, Jahreswechsel-Prüfstatus, Cent-Bilanzen, Speicher- und Vorjahresintegrität kontrollieren. Keine fiktive Rechtsfreigabe.
3. Baustein 2 erst nach nachgewiesener technischer Prüfung ausdrücklich zur Freigabe vorlegen; **unmittelbar danach Baustein 3 mit einer responsiven, bedienbaren HTML-Immobilienzentrale** zur Sichtprüfung beginnen. Weitere Sonderfallfunktionen können nach Scope-Prüfung später bearbeitet werden, statt die erste Oberfläche unbegrenzt hinauszuzögern. PDF-Anbindung erst später nach Prüfung der genehmigten Originalvorlage.

**Weiterhin keine freigegebene Abrechnung, keine fertige HTML-Anwendung und keine Mieter-PDF. Baustein 2 bleibt offen.**
