# Nebenkosten Premium — technischer Arbeitsstand

**Stand: Baustein 2.2 (lokale Speicherung und JSON-Datensicherung), 21.09.2026.** Grundlage ist der freigegebene `MASTERPLAN.md` im selben Projektordner. Vollständige Neuentwicklung; keine technische Übernahme, Migration oder Kopplung des alten Nebenkosten-Werkzeugs.

## Stand der Umsetzung

- `assets/js/model.js`: eigenständiges Projektschema v1, leere Projekterstellung und strukturelle Validierung ohne automatische Rechtsentscheidung.
- `assets/js/storage.js`: isolierte lokale Speicherfunktion, geprüfte JSON-Sicherung, reine Sicherungsvorschau und ausdrücklich bestätigte Wiederherstellung mit vorherigem Wiederherstellungsstand.
- `tests/model.test.mjs` und `tests/storage.test.mjs`: automatisierte Prüfungen ausschließlich mit fiktiven Testdaten; keine Daten echter Nutzer.
- `package.json`: `npm test` verwendet nur Node.js-Bordmittel, ohne externe Pakete.

## Speichervertrag

**Projekt-Schlüssel:** `akademie:nebenskosten-premium:v1:project`. Das Modul liest/schreibt ausschließlich den eigenen Projekt-Schlüssel und bei einer bestätigten Wiederherstellung einen zusätzlichen eigenen Sicherungs-Schlüssel mit Präfix `akademie:nebenskosten-premium:v1:before-restore:`. Alte und fremde Daten werden weder gelesen noch verändert.

`loadProject()` liefert `null`, wenn noch kein Projekt vorhanden ist; es erzeugt keine Musterdaten. Fehlerhafte Speicherinhalte werden gemeldet, aber nicht automatisch ersetzt. `saveProject(project)` validiert vor dem Schreiben Schema, eindeutige IDs, vorhandene Referenzen und weitere bereits im Modell abgedeckte Datenregeln. Ein anderes Projekt darf den aktuellen Stand nicht still überschreiben. Bereits freigegebene Dokumentdatensätze dürfen über den normalen Speichervorgang nicht gelöscht oder nachträglich verändert werden; Änderungen benötigen eine neue Dokumentversion. Der lokale Speichervorgang verwendet pro Projekt einen einzelnen `localStorage.setItem`-Aufruf. Speicherfehler, zum Beispiel durch Quota/Datenschutzmodus, werden gemeldet; es gibt keine behauptete Erfolgsmeldung ohne erfolgreichen Aufruf.

**JSON-Datensicherung:** `createBackup(project)` erzeugt ein eigenständig versioniertes Format mit Erstellungszeitpunkt, Projektkennung und einem strukturell geprüften Projektdatensatz. `previewBackup(text)` kontrolliert Format, Schema und Daten und zeigt Metadaten/Datensatzanzahlen ohne zu schreiben. Ein altes Nebenkostenformat oder eine inkompatible Version wird nicht importiert. `restoreBackup(text, { confirmation: 'REPLACE_PROJECT' })` ist ausschließlich nach bewusster Bestätigung möglich. Vor dem Ersetzen wird der bisherige rohe Stand unverändert unter einem neuen eigenen Wiederherstellungsschlüssel gespeichert. Scheitert diese Sicherung, wird das Zielprojekt nicht überschrieben. Die Wiederherstellung ist keine automatische Synchronisierung und ersetzt gegebenenfalls bewusst das momentan aktive Projekt.

**Wichtig zu PDF/Belegen:** Die JSON-Sicherung enthält nur strukturierte Projektdaten und Dateiverweise, **keine tatsächlichen Rechnungs-, Bild- oder PDF-Dateien**. Beide Ausschlüsse sind in der Datei ausdrücklich markiert. Erkannte eingebettete Binärdatenfelder in Dokument- oder Anhangsdatensätzen werden für dieses Sicherungsformat abgewiesen. Eine vollständige Dateiarchivierung, Download-Bedienung, sichere Ablage und deren Wiederherstellung müssen in einem späteren Bauabschnitt separat umgesetzt und getestet werden. Die JSON-Datei ist **nicht verschlüsselt**; sie kann personenbezogene Daten enthalten und muss vom Nutzer geschützt aufbewahrt werden. Daten im `localStorage` sind weder cloud-synchronisiert noch ein verlässliches dauerhaftes Gerätebackup. Nutzung in mehreren Browser-Tabs mit gleichzeitiger Bearbeitung ist noch nicht abgesichert.

## Datenmodell

Separate Sammlungen für Immobilien, Wohnungen, Nutzungszeiträume, Mietverhältnisse, Vertragsversionen, Abrechnungsperioden, Kosten, Verteilungsregeln, Zähler, Ablesungen, Zahlungskreise, Dokumente, Checkpunkte und Dateiverweise. Beträge in Cent; Flächen in Hundertstel Quadratmeter; ISO-Datumswerte. Kosten, Zahlungen des Eigentümers und tatsächliche Mietervorauszahlungen sind strikt getrennt. Die Kennzeichnung „umlagefähig“ ist keine automatisierte rechtliche Freigabe. Das Modell bildet noch keine vollständige materielle Prüfung aller fachlichen Abrechnungsregeln ab.

## Teststatus

Lokaler Testaufruf aus `pages/immobilien-premium/`: `npm test` (Node.js-Bordmittel). **25 Tests bestanden, 0 fehlgeschlagen**: 11 Strukturtests aus 2.1 und 14 zusätzliche Speicherung-/Backup-/Wiederherstellungstests aus 2.2. Geprüft wurden unter anderem Fremdschlüssel-Trennung, fehlerhafte Daten, Schreibsperren für freigegebene Dokumente, Versionsprüfung, Bestätigungspflicht, Wiederherstellungskopie und simulierte Speicherfehler. Dies sind automatisierte lokale Tests, keine Browser- oder iPad-Tests und keine GitHub-Actions-Bestätigung.

## Bewusst noch nicht fertig

Keine HTML-Oberfläche, keine nutzbare Download-Schaltfläche, keine fertige Nebenkostenabrechnung, keine Heizkosten-/CO₂-Berechnung, keine PDF-Erzeugung, keine vollständige Sicherung von Originalbelegen und PDF-Dateien. Die Freigabe einer rechtswirksamen Abrechnung wird nicht behauptet.

**Nächster Schritt: Baustein 2.3 — unabhängiger Berechnungskern und die Referenz- sowie Sonderfalltests MH-01 bis MH-09.** Baustein 2 insgesamt ist noch nicht freigegeben oder abgeschlossen.
