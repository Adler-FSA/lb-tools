# Baustein 2 – nachvollziehbarer Arbeitsstand und nächste Schritte

**Stand 21.09.2026.** Ergänzt den freigegebenen `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md`, ohne den Altbestand zu verändern. Maßgebliche technische Grenzen stehen auch in `BERECHNUNG.md`, `MESSWERTE.md`, `HEIZUNG.md` und `VERBUNDENE-ANLAGEN.md`.

## Tatsächlich umgesetzt

- **2.1 Datenmodell:** eigenständige Projektstruktur, stabile IDs, Zeitbezüge und grundlegende Prüfungen; noch keine umfassende materielle Rechtsprüfung.
- **2.2 Speicherung:** isolierte lokale Ablage, geprüfte JSON-Projektsicherung und Wiederherstellung mit ausdrücklicher Bestätigung; Originalrechnungen, PDFs und Bilddateien sind noch kein Bestandteil einer vollständigen Dateisicherung.
- **2.3 allgemeiner Rechenkern:** für eng bestätigte Standardfälle Gebäudekosten, Eigentümeranteile und einzelne Mieteranteile samt tatsächlich erfassten Vorauszahlungen sowie eigener Versorger-Zahlungskreis; nachgewiesene Nutzerwechsel, Leerstand, Vorauszahlungsänderungen, Kaltwasser-Zählerwechsel und Messwertqualitätsprüfung. Nicht unterstützte Fälle werden gesperrt.
- **2.3 Wärmeprototyp `thermal.js`:** getrennte, vollständig bekannte Heiz-/Warmwasserkostentöpfe für bestätigte Sonderfall-freie Anlagen; dokumentierte Messbasis und ein enger Nutzerwechsel-Fall mit Zwischenablesung und nachgewiesenem Grundkostenmaßstab. Weiterhin isolierter, nicht freigegebener Teilbericht.
- **Neu 2.3, verbundene Anlagen `thermal-linked.js`:** eigenständige **Vorabtrennung** echter, eindeutig erfasster gemeinsamer Rechnungspositionen nach bestätigtem vergleichbarem Energieanteil; individuelle Heizung-/Warmwasserkosten separat zuordnen, Originalrechnungs-Summen inklusive ausgeschlossener CO₂-Positionen abgleichen, doppelte Belegpositionen und fehlende Nachweise sperren. **Nicht** in `thermal.js` oder `calculation.js` integriert; Quellrechnungen bleiben unverändert.

## Testnachweis

Der zuvor dokumentierte Stand des Gesamtsystems nach Heizungs-Nutzerwechsel: **139 lokale automatisierte Tests bestanden**. Im aktuellen Unterabschnitt wurden **16 neue lokale Tests für `thermal-linked.js` separat ausgeführt: 16 bestanden, 0 fehlgeschlagen**. Die beiden neuen Dateien wurden auf GitHub gespeichert; deren Blob-SHAs wurden mit den lokal getesteten Dateien verglichen. **Ein erneuter gemeinsamer Gesamttest aller früheren Module wurde in diesem Unterabschnitt nicht ausgeführt.** Keine GitHub-CI-, Browser-, iPad-, PDF- oder fachliche Abnahme. Testzahlen sind keine Produktfreigabe.

## Verbindliche Versorgung-/Einkaufentscheidung

Der Eigentümer gibt eigene Verträge, reale Verbrauchs-/Preiswerte und endgültige Jahresrechnungen ein. Keine Bundesland-Preisdatenbank und kein Tarifvergleich. Vertragsprognosen, tatsächliche Rechnungen, Versorgerzahlungen, Eigentümerkosten und Mietervorauszahlungen werden separat geführt. Direkte Versorgungsverträge der Mieter dürfen nicht nochmals als Eigentümer-Lieferkosten erscheinen. Umsetzung im Datenmodell und in der späteren Benutzeroberfläche steht noch aus; keine neue Hauptnavigation und kein dreizehntes Werkzeug.

## Nächste technische Arbeiten innerhalb von Baustein 2

1. **Sichere Integration der verbundenen Anlage:** Vorab getrennte Heizung-/Warmwasserkostentöpfe genau einmal an die vorhandene Einzelwohnungs-/Nutzerberechnung übergeben. Jede originale Rechnungszeile nur einmal im Gesamtbestand führen. Der separate Wärme-Rechner darf bei vorhandenem gemeinsamen Kostenbestand nicht unbemerkt einen Teilbestand als vollständige Wärmekosten ausgeben. Provenienz und periodengenaue Cent-Reconciliation testen.
2. **CO₂-Kosten als eigener Rechen- und Prüfpfad:** Anwendbarkeit, Belege, Vermieter-/Mieteranteile, ggf. Direktvertrag und Doppelerfassung differenzieren. Bis dahin keine automatische CO₂-Umlage.
3. **Nicht unterstützte Heizkostensonderfälle:** insbesondere Ersatzermittlung, Geräteausfall, Heizöl-Alt-/Neubestand, nicht vergleichbare Energiebasis, Ausnahmefälle, Nutzergruppen und unbestätigte Kosten auf Prüfstatus belassen; fachliche Quellen und konkrete Varianten separat verifizieren.
4. **Versorgungsdaten:** Vertragsinhaber, individuelle Preisfassungen, reale Jahresrechnungen, echte Abschläge und Belegidentität im versionierten Datenmodell prüfen, ohne bereits vorhandene Kosten- oder Zahlungsdatensätze zu duplizieren. Eigene Regressionstests.
5. **Gesamtintegration und QA:** vollständigen Jahresbericht nur für nachweislich unterstützte Fälle zusammensetzen und Haus-/Eigentümer-/Mieter-/Versorgerkreise centgenau abgleichen, Datenmodell/Backup und MH-01 bis MH-09 gemeinsam neu testen. Die früher genehmigte Hotel-PDF-Vorlage erst in späterem Bauabschnitt nach Originalprüfung anbinden, keine neue Engine erfinden.

**Baustein 2 ist nicht fertig und nicht zur Produktnutzung freigegeben.** Keine fertige HTML-Immobilienzentrale, keine Mieter-PDF, keine verlässlich rechtsgeprüfte Abrechnung. Baustein 3 startet erst nach vollständigem technischen Abschluss und expliziter Freigabe dieses Abschnitts.
