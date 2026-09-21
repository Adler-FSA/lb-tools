# Baustein 2 – technischer Zwischenstand vor den HTML-Seiten

**Stand: 22.09.2026 · Nicht abgeschlossen, nicht freigegeben.** Grundlage sind der unveränderte freigegebene `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md`. Das alte Nebenkosten-Werkzeug wurde nicht angefasst. Michael muss keinen Quellcode prüfen; seine Sichtabnahme beginnt mit der ersten tatsächlich bedienbaren HTML-Testseite nach dem technischen Abschluss von Baustein 2.

## Vorhandenes Fundament

- **2.1/2.2:** eigenständiges Projektdatenmodell, lokale Speichertrennung, JSON-Sicherung und bestätigte Wiederherstellung. Originalbelege/Bilder/PDF-Dateien sind noch nicht als vollständige Dateisicherung enthalten.
- **2.3 Basiskosten:** getrennte Eigentümer-, Mieter- und Versorgerkreise mit centgenauer Aufteilung für belegte Standardfälle; Nutzerwechsel, Leerstand, Vorauszahlungsänderungen, Kaltwasser-Zählerwechsel und Messwertkontrollen. Keine fachliche Gesamtfreigabe.
- **2.3 Wärme:** separate Heiz- und Warmwasserkosten mit belegten Messgrößen und engem Nutzerwechsel-Fall. Verbundene Anlagen: Rechnungsinventur, centgenaue Kosten-Vorabtrennung und nicht persistente Übergabebrücke mit Zeilen-Audit. Keine freigegebene Kombination mit Standardkosten und CO₂.
- **2.3 CO₂-Gebäudestufe:** `co2-building.js` prüft für einen eng bestätigten Wohngebäude-Standardfall das belegte Gesamtjahr 2026. Neu: `co2-tenants.js` erzeugt für **vollständig und lückenlos vermietete** Wohngebäude mit bestätigtem Heizkostenschlüssel eine **ungebuchte Einzelmieter-Vorschau**, gleicht jede Wärme-Kostenzeile, Mietergewicht und gesonderte CO₂-Originalrechnungen ab. Eigennutzung, Leerstand, Direktverträge, Ausnahmen und unbewiesene Aufteilungen werden nicht als berechnete Mieterabrechnung ausgegeben. Keine Veröffentlichung, kein PDF und keine echten Mieterbuchungen.
- **2.3 Versorgung/Einkauf:** `supply-review.js` verarbeitet nun mehrere lückenlos aufeinanderfolgende, bestätigte Preisfassungen einschließlich dokumentiertem Teilperioden-Grundpreis und geplanter Menge. Vertragsprognose, reale Originalrechnung, Versorgerzahlungen und Direktvertrag eines Mieters bleiben getrennt. Keine regionale Preis-Datenbank und kein automatischer Tarifvergleich. Persistentes, vollständiges Versorgungs- und Belegmodell fehlt noch.
- **MH-09 Jahreswechsel:** `year-rollover.js` bereitet ein neues vollständiges Kalenderjahr nur als **reinen, noch nicht gespeicherten Vorschlag** mit erneuter Beleg-/Vertrags-/Zähler-/Zahlungsprüfung vor. Alte Kosten, Zahlungsbeträge, Ablesungen und Dokumente werden nicht kopiert. Absichtlich keine tatsächliche Einfügung in die Immobilienakte, bis die Berechnungsmodule neue, unbestätigte Perioden durchgängig sperren.

## Teststand und tatsächliche Grenzen

Am 22.09.2026 wurden im aktuell verfügbaren **lokalen Teil-Arbeitsverzeichnis 72 Node-Tests aus sieben Testdateien gemeinsam ausgeführt: 72 bestanden, 0 fehlgeschlagen**. Die betroffenen neuen und aktualisierten Dateien wurden separat auf GitHub `main` geschrieben; Git-Blobs können dort abgeglichen werden. Das lokale Verzeichnis enthält derzeit **nicht alle früheren Grundlagenmodule und deren Testdateien**, deshalb ist dies **kein Gesamttest der vollständigen GitHub-Anwendung**. Frühere Testergebnisse dürfen nicht mit dieser Teilprüfung als aktuelle Gesamtsuite addiert werden. Keine Browser-/iPad-, CI-, End-to-End-, PDF- oder juristische Freigabe.

## Noch nötig vor Freigabe von Baustein 2

1. CO₂ bei eigengenutzten und leerstehenden Einheiten, direkten Mieterversorgungsverträgen und gesetzlichen Sonderfällen; dann sichere gemeinsame Kosten- und Mieterbilanz ohne Doppelzählung. Aktuelle Rechtsgrundlagen und 2026er Änderungen am CO₂KostAufG fachlich nachprüfen.
2. Versorgungsverträge, historische Preisfassungen und Originalrechnungen in das persistente versionierte Projektschema und die Sicherung aufnehmen; kein zweiter paralleler Kostenbestand.
3. Jahreswechsel tatsächlich erst nach gebäudeweit wirksamer Prüfsperre für unbestätigte neue Perioden einfügen, Vorjahressnapshots und Periodenwechsel testen.
4. Fehlende Grundmodule und Tests für den Gesamtprüflauf wieder zusammenführen; MH-01–MH-09 erneut gemeinsam testen, inklusive Sicherheits- und Cent-Abgleich und dokumentierten Sperrfällen.
5. Erst dann den technischen Stand zur Freigabe vorlegen. **Baustein 3** erstellt die sichtbare, responsive Immobilienzentrale als überprüfbare HTML-Seiten. PDF-Integration später ausschließlich nach Sichtung der bereits genehmigten Originalvorlage; keine neue PDF-Engine erfinden.

**Keine fertige HTML-Anwendung, keine Mieter-PDF, keine Rechts- oder Produktfreigabe. Baustein 2 bleibt offen.**
