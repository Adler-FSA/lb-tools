# Nebenkosten Premium – verbundene Heizungs- und Warmwasseranlagen

**21.09.2026 · Baustein 2.3 · bestätigte Kosten-Vorabtrennung und technische Übergabebrücke. Keine Produkt-, Rechts-, PDF- oder fertige Mieterabrechnungsfreigabe.** Ergänzt `HEIZUNG.md` und `MASTERPLAN-ERGAENZUNG-VERSORGUNG.md`; der alte Nebenkostenrechner bleibt unverändert.

## 1. Belegte Rechnungen vorab getrennt

`assets/js/thermal-linked.js` mit `separateLinkedThermalCosts(project, accountingPeriodId, plan)` ordnet vollständige Originalrechnungspositionen als gemeinsame Energie-, reine Heizungs-, reine Warmwasser- bzw. separate CO₂-Positionen zu. Rechnungen brauchen eindeutige Beleg- und Positionskennungen, bestätigte jährliche Leistungszeiträume und eine centgenaue Übereinstimmung zwischen Rechnungspositionen **einschließlich CO₂** und Originalrechnungsbetrag. Doppelbuchung, unbekannte Rechnung und ungeklärte Klassifizierung sperren.

Bei gemeinsamer Energie benötigen Gesamtmenge und Warmwasseranteil dieselbe ausdrücklich belegte physikalische Bezugsbasis in Tausendstel kWh. Gasheizkessel verwenden eine bestätigte Brennstoff-Energiebasis, Wärmepumpe bzw. Wärmelieferung eine bestätigte Wärmebasis. Das Modul rechnet Brennstoffenergie nicht einfach in Wärmeabgabe um; es erfindet weder Werte noch gesetzliche Ersatzformeln. Die bestätigte Methode ist eine Eingabebestätigung, keine automatische fachliche Anerkennung. Heizöl mit Beständen bleibt gesperrt.

**Fiktiver Prüffall:** 1.800,01 € gemeinsame Energiekosten ohne separat erfasstes CO₂. Zusätzlich 100,00 € nur für Heizung und 50,00 € nur für Warmwasser. Belegte 200 kWh Gesamtenergie, davon 50 kWh Warmwasser. Daraus entstehen 1.450,01 € Heizungs- und 500,00 € Warmwasserkosten; zusammen **1.950,01 €**. Die CO₂-Rechnungsposition von **20,00 €** wird getrennt nachgewiesen, nicht einem Nutzer zugewiesen. Die beiden Originalrechnungen mit 1.820,01 € bzw. 150,00 € stimmen vollständig mit ihren Quellpositionen überein.

## 2. Neue technische Übergabe an den Heizkostenrechner

`assets/js/thermal-linked-integration.js` bietet:

- `prepareLinkedThermalAllocation(project, periodId, linkedPlan, thermalPlan)`: prüft zuerst die vollständige Vortrennung; danach erzeugt es **ausschließlich in einer tiefen Kopie im Arbeitsspeicher** zwei abgeleitete Kostentöpfe `derived_linked_heating` und `derived_linked_hot_water` mit den belegten Beträgen. Die originalen Heiz-/Warmwasser-/Gemeinschafts- und CO₂-Positionen werden nur aus dieser **temporären Kopie** entfernt, niemals aus der gespeicherten Immobilienakte. Andere Kosten bleiben unberührt. Alle ursprünglichen Belegkennungen und Beträge bleiben in der Rückverfolgung erhalten.
- `calculateLinkedThermalPeriod(project, periodId, linkedPlan, thermalPlan, calculateThermalPeriod)`: übergibt die temporären Kostentöpfe an die separat bereitgestellte Heizkostenfunktion. Originalrechnungen dürfen nicht zusätzlich als `expenseIds` in den beiden Heizkosten-Plänen enthalten sein. `linkedTransferConfirmed:true` ist verpflichtend; die beiden Dienste müssen eindeutig Heizung und Warmwasser sein.
- `assets/js/thermal-linked-runner.js` verbindet den Übergabeweg mit der **tatsächlichen** Funktion `calculateThermalPeriod` aus `thermal.js` über `calculateLinkedThermalWithEngine(project, periodId, linkedPlan, thermalPlan)`. Dieser Runner ist der reale Programmeinstieg; noch keine UI-Anbindung.

Die Übergabebrücke kontrolliert anschließend Quell-Gesamtkosten gegen beide Wärme-Kostentöpfe, die Teilberichte je Wärmeart sowie die Summe Eigentümer + Mieter. Bei Centdifferenzen, ungültiger Modellkennung, reservierter ID-Kollision, fehlendem Ursprungsnachweis oder gesperrtem Heizkostenrechner entsteht **kein positiver Teilbericht**.

Ein erfolgreicher Bericht trägt `scope:'thermal_linked_subreport_only'`, das `linkedCosts`-Audit mit ursprünglichen Beleg-IDs, Rechnungssummen, abgeleiteten Kennungen und der separat ausgeschlossenen CO₂-Summe. `combinedWithOtherCosts:false`, `co2Calculated:false`, `legalRelease:false` und `pdfGenerated:false` bleiben verbindlich. Die temporären Kosten sind **keine zusätzlichen echten Rechnungen** und werden nicht in Speicher oder Buchungsjournal geschrieben. Versorgerabschläge und Mietervorauszahlungen sind weder Quellkosten noch Bestandteil dieses Teilberichts.

## 3. Testabdeckung und Abnahmegrenzen

`tests/thermal-linked.test.mjs`: die bereits vorhandenen 16 lokalen Tests der Rechnungsvortrennung. **Neu** `tests/thermal-linked-integration.test.mjs`: 14 Tests für die temporäre Übergabe, Centgleichheit, unveränderte Originaldaten, separate CO₂-Positionen, doppelte Rechnungen, Sperren und Fehlerweitergabe. Lokal wurden **diese beiden Dateien gemeinsam ausgeführt: 30 Tests bestanden, 0 fehlgeschlagen**. SHA-Abgleich mit GitHub für neues Brückenmodul, Runner und neuen Test.

**Noch nicht durch diese Tests nachgewiesen:** vollständiger Lauf der gesamten Projekt-Testsuite und ein End-to-End-Test des realen Runners mit sämtlichen Produktmodulen und vollständigem Projektschema. Der neue Integrationstest verwendet zur Prüfung des Übergabevertrags eine kontrollierte Ersatzfunktion für `calculateThermalPeriod`, nicht den echten Heizkostenrechner. Der Runner importiert die echte Funktion, ist aber noch nicht als vollständige Anwendung abgenommen. Browser, iPad, PDF und Recht wurden ebenfalls nicht freigegeben.

## 4. Offene Aufgaben

Fachliche Überprüfung der bei verbundenen Anlagen gewählten §-9-Methode, Sonderfälle und Heizöl-Bestände; vollständiger realer End-to-End-Test mit Messwerten, Nutzerwechsel und Originalrechnungen; eigenständiger CO₂-Rechenweg einschließlich Abgrenzung möglicher Direktverträge; Versorgungsvertrags-Datenmodell; spätere Gesamtintegration aller Zahlungskreise ohne Doppelerfassung. Auch eine positive Teilrechnung ist **keine fertige Betriebskostenabrechnung**.

Fachlicher Prüfrahmen: § 9 HeizkostenV, https://www.gesetze-im-internet.de/heizkostenv/__9.html . **Baustein 2.3 und Baustein 2 bleiben offen.**
