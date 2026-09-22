# Baustein 2 – technischer Zwischenstand vor den HTML-Seiten

**22.09.2026 · Noch nicht abgeschlossen oder freigegeben.** Der unveränderte `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md` bleiben maßgeblich. Das alte Nebenkosten-Werkzeug ist unangetastet. Michael soll keine GitHub-Dateien oder JavaScript-Skripte prüfen; seine Sichtprüfung beginnt mit einer tatsächlich bedienbaren HTML-Testseite nach dem technischen Abschluss und der Freigabe dieses Bausteins.

## Tatsächlich vorhandenes Fundament

- **2.1/2.2:** unabhängiges Datenmodell v1, isolierte lokale Speicherung, geprüfte JSON-Sicherung und ausdrücklich bestätigte Wiederherstellung. Original-PDFs, Bilder und Rechnungsdateien werden durch diese JSON-Sicherung weiterhin nicht vollständig gesichert.
- **2.3 Basis:** für unterstützte und bestätigte Fälle eigenständige Kostenverteilung auf Eigentümer/Mieter, echte Mietervorauszahlungen und separater Versorger-Zahlungskreis; Mieterwechsel, Leerstand, Vorauszahlungsänderungen, Kaltwasser-Zählerwechsel und Messwertprüfungen. Keine rechtliche Gesamtfreigabe.
- **2.3 Wärme:** separater Heiz-/Warmwasser-Rechner mit Messbasis und eng belegtem Nutzerwechsel. Verbundene Anlagen: Originalrechnungsinventur, Vorabtrennung, nicht persistente Überleitung und Zeilen-Audit; noch kein freigegebener gemeinsamer Jahresbericht.
- **2.3 CO₂:** Gebäudestufe und ungebuchte Einzelmieter-Vorschau für einen engen, vollständig vermieteten Standardfall. Eigennutzung, Leerstand, Direktverträge und Rechtsausnahmen bleiben gesperrt.
- **2.3 Jahres-Abgleich:** `period-integrity.js` prüft vorhandene Standard-/Wärme-/CO₂-Teilberichte lesend gegen originale Kosten, Eigentümer/Mieter-Anteile und echte Zahlungen. Ein tatsächlicher Orchestrator, der die Original-Rechner einheitlich aufruft und einen geprüften Gesamtbericht erstellt, fehlt noch.
- **MH-09 Jahreswechsel:** `year-rollover.js` erstellt lediglich einen überprüfungsbedürftigen Vorschlag; es speichert oder kopiert keine alten Kosten, Ablesungen oder Zahlungen in ein neues Jahr.

## Neues Arbeitspaket: dauerhaft erfasste reale Versorgungsverträge

**Umgesetzt und auf GitHub `main` gespeichert:**

1. `supply-schema.js` prüft die rückwärtskompatible Projekterweiterung `supplyRegistryVersion:1` und `supplyRegistry` mit Vertragsinhaber, Versorgerkonto, historischen Preisfassungen, Gebäude-/Jahresbezug und genau einmal referenzierten Originalrechnungen. Ein **Entwurf** ist vor Vorliegen der Jahresrechnung speicherbar; erst ein vollständiger, bestätigter Jahresdatensatz erhält `confirmed:true` und kann durch die vorhandene Versorger-Jahresprüfung gehen. Direktverträge eines Mieters dürfen keine Eigentümerkosten tragen. Keine Preise nach Bundesland und kein Tarifvergleich.
2. `model.js` legt die leere Erweiterung für neue Projekte an, bindet ihre Validierung in `validateProject` ein und gibt bei fehlerhaften Nicht-Array-Sammlungen strukturierte Fehler statt eines unkontrollierten Absturzes zurück. Bereits gespeicherte **Premium-v1-Projekte ohne Erweiterung** bleiben unverändert les-/speicherbar; Schema- und Speicherschlüssel bleiben v1. Keine Migration fremder oder alter Nebenkosten-Daten.
3. `storage.js` prüft die Erweiterung jetzt beim Speichern, Lesen, bei der Sicherung und Wiederherstellung; gespeicherte Versorgungsverträge und Entwürfe bleiben Teil **derselben** Projekt-JSON-Datei. Die Sicherungsvorschau nennt bei vorhandenen Datensätzen deren Anzahl; Originaldateiinhalte werden weiterhin ausgeschlossen. Ein neuer echter Regressionstest verbindet Speicher/Laden mit `reviewSupplyRegistry(...)` und sperrt einen Entwurf ausdrücklich.

Ausführliche Datensatz- und Eingabegrenzen: `VERSORGUNG-SCHEMA-V1.md`. Originalkosten bleiben in `expenses`, echte Zahlungen in `cashflows`; Vertragsdaten erzeugen keine neue Kosten- oder Zahlungsbuchung. Die Prüfung ist noch kein zentraler Abrechnungsaufruf und keine HTML-Eingabemaske.

## Verifizierter Teststand dieses Pakets

Die im GitHub-Repository vorhandenen ursprünglichen `tests/model.test.mjs` und `tests/storage.test.mjs` wurden **inhaltlich und per Git-Blob-SHA identisch** ins lokale Testverzeichnis zurückgeholt. Zusammen mit den neuen Tests für Vertragsformat, Entwurf, Preisänderung, Speicher-/Backup-/Wiederherstellungsweg und Versorgerprüfung wurden am 22.09.2026 **47 Tests aus fünf Dateien gemeinsam ausgeführt: 47 bestanden, 0 fehlgeschlagen**. Geänderte und neue Dateien wurden über GitHub gespeichert und mit den lokalen Git-Blobs abgeglichen. Dies ist ein **gezielter Regressionstest für Datenmodell, Speicherung und Versorgung**, nicht der Gesamttest der vollständigen Anwendung. Frühere Teiltestzahlen werden nicht hinzuaddiert. Keine Browser-, iPad-, GitHub-CI-, PDF- oder rechtliche Abnahme.

## Noch bis zum technischen Abschluss erforderlich

1. Originalmodule für Standard-, Wärme-/Verbund- und CO₂-Kosten unter einem einzigen sicheren Aufruf verbinden. Vollständige Belegidentität, Periodengrenzen, Mieter-/Eigentümer-/Versorgerkonten, Rundungsreste und die Jahres-Abgleichsvorschau gemeinsam prüfen. Bei nicht unterstützten Sonderfällen vollständig sperren.
2. CO₂- und Heizungs-Sonderfälle einschließlich Direktversorgung, Eigennutzung/Leerstand, Heizöl-Bestand, Ersatzwerte, rechtliche Ausnahme- und Verteilungstatbestände fachlich abgrenzen; keine fiktive Freigabe.
3. Erst nach nachgewiesener Sperre für ungeprüfte Folgeperioden: tatsächliches Anlegen neuer Jahre, Vorjahressnapshots und Revisions-/Jahreswechselprüfungen.
4. Fehlende früher entwickelte Grundlagenmodule und sämtliche MH-01–MH-09-Tests in einem vollständigen, reproduzierbaren Gesamtlauf vereinigen; fehlende End-to-End- und negative Prüfungen ergänzen. Danach erst technische Freigabe von **Baustein 2**.

**Nächster sichtbarer Meilenstein nach Baustein 2:** Baustein 3 mit einer bedienbaren, responsiven HTML-Immobilienzentrale für Michaels echte Sichtprüfung. PDF nur später nach Prüfung der genehmigten Originalvorlage. Aktuell gibt es weder eine nutzbare HTML-Seite noch eine freigegebene Abrechnung oder Mieter-PDF.
