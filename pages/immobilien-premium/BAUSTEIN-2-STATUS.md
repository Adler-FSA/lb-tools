# Baustein 2 – technischer Zwischenstand vor den HTML-Seiten

**22.09.2026 · Offen, nicht freigegeben.** Der freigegebene `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md` bleiben unverändert maßgeblich. Das frühere Nebenkosten-Werkzeug bleibt unangetastet. Michaels Sichtprüfung beginnt mit einer tatsächlich bedienbaren HTML-Oberfläche nach der technischen Freigabe von Baustein 2; keine Codeabnahme durch den Nutzer.

## Bereits vorhandenes Fundament

- Eigenständiges Projektdatenmodell v1, speicherbare Vertragsentwürfe und bestätigte Versorgungsverträge, isolierte lokale Speicherung, JSON-Backup und bestätigte Wiederherstellung. Originaldateien von Rechnungen, Bildern und PDFs sind ausdrücklich **nicht** Teil dieser JSON-Sicherung.
- Standardkosten: Eigentümer-/Mieteranteile, tatsächliche Mietervorauszahlungen, separater Versorger-Zahlungskreis, unterstützte Nutzerwechsel, Leerstände, Änderungen von Vorauszahlungen und Kaltwasser-Zählerprüfungen.
- Heizung/Warmwasser: eigenständiger Rechenkern, belegte Messbasis und Nutzerwechsel; verbundene Anlagen mit Originalrechnungsinventur, Vorabtrennung, temporärer Überleitung und Cent-Audit. `linked-inventory-guard.js` erlaubt zusätzlich eindeutig inventarisierte direkte Wartungs-/Einzelkosten statt einer pauschalen Mischkosten-Sperre.
- CO₂: Gebäudeprüfung und nicht buchende Einzelmieter-Vorschau nur für eng bestätigte Standardfälle. Andere Gebäude-, Nutzungs- und Rechtsfälle nicht allgemein unterstützt.
- `year-workflow-runner.js` verbindet die echten Standard-, Wärme-, CO₂-, Versorger- und Prüffunktionen mit einer ausschließlich nicht buchbaren Jahresvorschau. Jahreswechsel bleibt ein nicht gespeicherter, bestätigungsbedürftiger Vorschlag.

## Neues Paket: Jahres- und Zahlungszuordnung tatsächlich in den Rechenweg integriert

**Korrektur des vorigen Zwischenstands:** Der Quellenprüfer `assets/js/year-scope.js` war vorhanden, aber in `year-workflow.js` bislang noch nicht aufgerufen. Die frühere Formulierung, der Produktionseinstieg führe diesen Check bereits aus, war verfrüht. Jetzt ist `inspectAnnualSources` nach Datenmodell- und Jahresstatusprüfung direkt in `runAnnualWorkflow` eingebaut: Der echte Produktionseinstieg `previewAnnualPeriod` führt über diesen Aufruf den Quellencheck **vor** sämtlichen Fachrechnern aus und verwendet dessen verifizierte Originalkosteninventur.

Rechnungen mit offenem/fehlendem Enddatum oder einem nicht vollständig passenden Zeitraum dürfen nicht unbemerkt aus dem Jahresinventar verschwinden; Teilüberlappungen blockieren. Zahlungen für das Gebäude oder seine Mietverhältnisse, die einem Jahr zugewiesen sind, aber ein Datum außerhalb dieses Jahres tragen, sperren; ebenso innerhalb des Jahres datierte, aber keiner Periode zugewiesene Zahlungen. Fremde Immobilien bleiben getrennt. Explizit einem anderen Jahr zugewiesene Zahlungen werden nicht automatisch umgebucht. Für zulässige Zahlungen über Periodengrenzen hinweg ist später eine gesonderte geprüfte Fachlogik nötig. Der Check speichert, verbucht oder mutiert keine Daten.

Neu ist `tests/year-workflow-scope.test.mjs` mit sieben Regressionstests des **tatsächlichen Jahres-Orchestrators einschließlich des echten Quellen-/Jahresprüfers**. Die nachfolgenden Spezialrechner werden in diesen Tests bewusst injiziert simuliert, damit nachgewiesen wird, dass beim fehlenden Nachweis keiner aufgerufen wird. Der Fall mit validen Daten prüft den sicheren Vorschau-Aufruf, nicht die rechnerische Korrektheit aller Fachmodule.

## Testnachweis – Zahlen nicht vermischen

**Neu tatsächlich ausgeführt:** `node --test tests/linked-inventory-guard.test.mjs tests/year-scope.test.mjs tests/year-workflow-scope.test.mjs`: **24 Tests aus drei Dateien bestanden, 0 fehlgeschlagen** (8 Rechnungsinventur, 9 Quellen-/Perioden-Prüfung, 7 verdrahteter Orchestrator). JavaScript-Syntax geprüft; die SHA der aktualisierten Jahresablaufsteuerung und der neuen Testdatei auf GitHub stimmen mit den lokal getesteten Git-Blobs überein.

**Noch kein bestandener Gesamttest:** `tests/annual-real-engines.test.mjs` mit drei echten End-to-End-Testfällen kann im aktuellen lokalen Teilverzeichnis nicht starten (`ERR_MODULE_NOT_FOUND: assets/js/model.js` sowie weitere dort fehlende Originalmodule). Die vorhergehenden früheren Teiltestzahlen dürfen nicht aufaddiert werden. Keine Browser-, iPad-, GitHub-CI-, PDF- oder Rechtsabnahme.

## Konkreter Engpass und begrenzte Abschlussstrecke

Das aktuelle Arbeitsverzeichnis enthält nur Teile des GitHub-Projekts. Der GitHub-Connector ermöglicht die Einzeldateiübertragung, stellt aber keine vollständige lokale Repository-Kopie bereit. Ein direkter GitHub-Download per Terminal scheitert in diesem Arbeitscontainer an der DNS-Auflösung. Für den verlangten **reproduzierbaren vollständigen Testlauf** muss das gesamte aktuelle Projektverzeichnis `pages/immobilien-premium/` lokal bereitgestellt werden, etwa durch Hochladen des Verzeichnisses als ZIP oder einen Arbeitsmodus mit direktem Repository-Zugriff. Ohne das wäre eine behauptete vollständige Abnahme unseriös.

Sobald der vollständige Projektstand vorliegt: in **einem** Durchlauf sämtliche MH-01–MH-09-Tests und die drei echten Jahresablauf-Integrationstests ausführen, nur nachgewiesene Schnittstellenfehler korrigieren, Originalbelegidentität, centgenaue Kosten-/Zahlungsbilanz, Jahr-/Gebäudeschutz und unveränderte Speicher- und Vorjahresdaten verifizieren. Heizöl, nicht geprüfte CO₂-/Leerstands-/Direktversorgungsfälle und weitere ungeklärte Rechtsausnahmen bleiben gesperrt, nicht durch weitere unsichtbare Features künstlich freigegeben. Baustein 2 erst nach bestandener technischer Prüfung ausdrücklich zur Freigabe vorlegen. **Unmittelbar danach Baustein 3 mit der ersten responsiven, tatsächlich bedienbaren HTML-Immobilienzentrale**; PDF später ausschließlich nach Prüfung der genehmigten Originalvorlage.

**Keine fertige HTML-Anwendung, keine Mieter-PDF, keine rechtlich freigegebene Jahresabrechnung. Baustein 2 bleibt offen.**
