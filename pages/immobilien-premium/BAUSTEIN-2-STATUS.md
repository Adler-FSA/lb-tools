# Baustein 2 – technischer Abschlussstand vor den HTML-Seiten

**23.09.2026 · Technisch vollständig geprüft, noch nicht vom Auftraggeber freigegeben.** Der freigegebene `MASTERPLAN.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md` bleiben unverändert maßgeblich. Das frühere Nebenkosten-Werkzeug bleibt unangetastet. Michaels Sichtprüfung beginnt erst mit einer bedienbaren HTML-Oberfläche in Baustein 3; eine Codeabnahme durch den Nutzer ist nicht erforderlich.

## Technisches Fundament

- Eigenständiges Projektdatenmodell v1 mit stabilen IDs, Zeitbezug, getrennten Kosten-/Zahlungskreisen und validierten Versorgungsverträgen.
- Isolierte lokale Speicherung, JSON-Sicherung und Wiederherstellung. Originaldateien von Rechnungen, Bildern und PDFs sind weiterhin ausdrücklich **nicht** Bestandteil dieser JSON-Sicherung.
- Standardkosten mit Eigentümer-/Mieteranteilen, tatsächlichen Mietervorauszahlungen, getrennten Versorgerzahlungen, Nutzerwechseln, Leerstand, Vorauszahlungsänderungen und Messwertkontrollen.
- Heizung/Warmwasser mit eigenständigem Rechenkern, belegter Messbasis, Nutzerwechsel und verbundenen Anlagen einschließlich Originalrechnungsinventur, Vorabtrennung, temporärer Überleitung und Cent-Audit.
- CO₂-Prüfpfad für eng belegte Standardfälle; nicht unterstützte Sonderfälle bleiben gesperrt.
- Versorgungsverträge mit bestätigten Preisständen, Originalrechnungsreferenzen, tatsächlichen Zahlungen und getrennten Prognosen.
- Jahres-Orchestrator `previewAnnualPeriod` verbindet die echten Standard-, Wärme-, CO₂-, Versorger- und Integritätsmodule. Er liefert ausschließlich eine **nicht buchbare Jahresvorschau**; `combinedForPosting:false`, `legalRelease:false` und `pdfGenerated:false` bleiben zwingend.
- `year-scope.js` sperrt unvollständige Rechnungszeiträume, periodenfremde Zahlungen und unklare Jahreszuordnungen vor jedem Fachrechner.
- MH-09 bereitet ein Folgejahr nur als bestätigungsbedürftigen Vorschlag vor und verändert das Vorjahr nicht.

## Vollständiger reproduzierbarer Gesamttest

Der vollständige aktuelle Projektstand wurde am 23.09.2026 **direkt aus GitHub** bereitgestellt. Verwendet wurde das GitHub-Pages-Artefakt des letzten Commits, der `pages/immobilien-premium/` verändert hat:

`e9e15ebc0449808f3a15b1db2cdc35431b844ce8`  
`test(immobilien-premium): verify genuine linked annual workflow and original invoice reconciliation`

Seit diesem Commit gibt es im Repository weitere Änderungen außerhalb des Immobilien-Projekts; für `pages/immobilien-premium/` ist dies weiterhin der neueste Commit.

Im daraus extrahierten vollständigen Projektverzeichnis befinden sich **24 JavaScript-Module und 27 Testdateien**. Ausgeführt wurde im Projektordner:

```
npm test
```

Ergebnis des vollständigen gemeinsamen Laufs:

- **291 Tests**
- **291 bestanden**
- **0 fehlgeschlagen**
- **0 übersprungen**
- **0 abgebrochen**

Damit sind erstmals alle vorhandenen Testdateien in **einem** gemeinsamen reproduzierbaren Lauf geprüft worden. Darunter liegen die MH-01–MH-09-Grundfälle, Cent- und Überlaufkontrollen, Mieter-/Leerstands-/Nutzerwechsel, Vertrags- und Vorauszahlungshistorie, Zähler- und Messwertfälle, getrennte sowie verbundene Heiz-/Warmwasserpfade, CO₂-Sperren, Versorgungsverträge, Jahresquellenprüfung, Jahreswechsel und die echten Produktionseinstiege `annual-real-engines.test.mjs` und `annual-linked-real.test.mjs`.

Die echten Jahresintegrationsfälle bestätigen unter anderem, dass Original-Wärmerechnungen nur einmal eingehen, separate Wartungskosten einer verbundenen Anlage nur bei vollständigem Rechnungsinventar zugelassen werden und fehlende bzw. unbestätigte Mess-/Quellnachweise die Jahresvorschau sperren.

## Bewusst nicht freigegebene Sonderfälle

Der bestandene technische Test bedeutet **keine universelle fachliche oder rechtliche Freigabe**. Heizölbestände, nicht geprüfte CO₂-Fälle mit Eigennutzung/Leerstand, Direktversorgung, Ersatzwerte und weitere Rechtsausnahmen bleiben dort gesperrt, wo keine ausdrücklich getestete Fachlogik vorhanden ist. Sie werden nicht künstlich freigeschaltet, nur um Baustein 2 abzuschließen.

Ebenso sind Browser-/iPad-Sichtprüfung, PDF-Technik, Dokumentgestaltung, DE/EN-Oberfläche und rechtliche Endprüfung Gegenstand späterer Bausteine und **keine Voraussetzung für den technischen Kern von Baustein 2**.

## Abschlussbewertung Baustein 2

Die zuvor offene technische Voraussetzung – ein vollständiger gemeinsamer Lauf aller vorhandenen Module und Tests – ist erfüllt. Es besteht aktuell kein nachgewiesener technischer Fehler aus der Gesamtsuite.

**Baustein 2 ist damit technisch abnahmebereit.** Er bleibt formal offen, bis der Auftraggeber ihn ausdrücklich mit „Baustein fertig“ freigibt.

Nach dieser Freigabe beginnt unmittelbar **Baustein 3 – Immobilienzentrale/Eigentümer** mit der ersten responsiven und tatsächlich bedienbaren HTML-Oberfläche. Keine weitere unsichtbare Erweiterungsrunde vor der Sichtprüfung.
