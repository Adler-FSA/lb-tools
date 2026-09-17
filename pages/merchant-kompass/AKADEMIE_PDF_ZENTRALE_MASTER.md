# Verbindlicher Master: Akademie-PDF-Zentrale und einheitlicher Fünf-Seiten-Aufbau

Stand: 17.09.2026. Auftraggeber hat die separate `hotel-pdf-uebergabe-test.html` nach seinem Test der PDF-Zentrale ausdrücklich als funktionierendes PDF-System freigegeben. Diese Datei dokumentiert die Arbeitsvorgabe für künftige Merchant-Kompass-Seiten. Keine automatische Freigabe des bisherigen Downloads auf `hotel.html` und kein Nachweis aller Geräte durch einen einzigen Test.

## PFLICHTABFRAGE VOR JEDEM NEUEN SEITEN- ODER PDF-AUFTRAG

Vor der Umsetzung prüfen und im Arbeitsbericht kurz beantworten:

1. Ist dies eine der fünf Merchant-Kompass-Seiten: Hotel, BusinessBooster, Direktmix, Voucher Currency oder VTravel? Wenn ja: diese Blaupause anwenden.
2. Ist der HTML-Inhalt einschließlich Live-Eingaben, Rechner, Texte, Bilder und Beispiele der betreffenden Seite vollständig und fachlich freigegeben? Inhalt zuerst, PDF danach.
3. Stammt der PDF-Erzeuger aus der freigegebenen Hotel-Master-Technik bzw. ist der seitenspezifische Inhaltsadapter davon getrennt? Keine neue PDF-Engine, kein Browserdruck, kein Server, kein Fremdkonverter.
4. Entsteht genau eine fertige PDF pro Klick aus den AKTUELLEN DOM-Eingaben und sichtbaren Berechnungen? Ergebnis muss mindestens `blob`, `filename`, `pages` enthalten.
5. Wird das fertige Ergebnis UNVERÄNDERT an die Akademie-PDF-Zentrale übergeben? Kein erneutes PDF-Erzeugen beim Speichern, kein isolierter Blob-Link als einzige Zusage für den Dateinamen.
6. Zeigt die PDF-Zentrale einen verständlichen PDF-Dateinamen mit Hotel-/Gesprächsbezeichnung und Datum sowie Herkunft und Seitenzahl? Kann der Nutzer Speichern/Teilen auswählen? Gerät/Betriebssystem bestimmt den tatsächlichen Dateidialog; keine universelle Garantie behaupten.
7. Wurden gespeicherte Datei und alle PDF-Seiten samt richtigen Live-Werten, Dateiname und Speicherweg im tatsächlich verwendeten Browser geprüft? Falls nicht: nur Teststand, nicht final.
8. Sind Original-Hauptseiten, frühere freigegebene Generatoren und fremde Seiten bis zur ausdrücklichen Freigabe unverändert geblieben?

## Die freigegebene technische Referenz – nicht neu erfinden

Repo `Adler-FSA/lb-tools`, Ordner `pages/merchant-kompass/`:

- `hotel-pdf-uebergabe-test.html`: akzeptierte separate Benutzeroberfläche und End-to-End-Aufruf für die HOTEL-PDF. Diese Testseite liest die Original-Hotel-Eingaben aus ihrem gleichursprünglichen Frame und ruft `HotelPdfEigen.generate(frame.contentDocument, progress)` auf.
- `hotel-pdf-eigen-fix.js`: freigegebener Hotel-PDF-Generator; Generator und Dokumentlayout unverändert lassen.
- `akademie-pdf-uebergabe.js`: gemeinsames Werkzeug. `AkademiePdfUebergabe.setDocument({blob:out.blob,filename:out.filename,pages:out.pages,origin:...})` übernimmt ausschließlich die schon fertig erzeugte PDF, erstellt eine benannte `File` und öffnet ein eigenes zentriertes Fenster. `show()` zeigt die vorgehaltene fertige Datei erneut. Speicher- und Teiloptionen verwenden dieselbe Datei. Die PDF liegt nur vorübergehend im Speicher der geöffneten Seite.
- Freigabe 17.09.2026: Benutzer bestätigt die PDF-Zentrale nach Test auf dem iPad als funktionierend. Das ist die Referenz für diese neue Oberfläche; andere Browser/Endgeräte und der Austausch der Hauptseiten bleiben separat abzunehmen.

Beibehalten: Kein Druckdialog, kein Service-Worker-Dateipfad, kein PDF-Dienst, kein erneutes Generieren beim Download und keine nicht benannte Datei als beabsichtigtes Ergebnis. Für die Wahl eines konkreten Verzeichnisses ist die jeweilige Geräte-/Browserfunktion nötig: falls verfügbar `showSaveFilePicker`, sonst benannte `File` über native Dateifreigabe; normaler Browser-Download nur als eindeutig gekennzeichneter Fallback, dessen Dateinamen der Browser ändern kann. Niemals Speicherung behaupten, bevor sie nachgewiesen ist. Personenbezogene Gesprächs-PDFs nicht an GitHub oder einen Server senden.

## Verbindliches Seitenschema für alle fünf Seiten

Jede der fünf Lern-/Gesprächsseiten hat **dieselbe sichtbare Kopfstruktur** und unterscheidet sich erst im jeweiligen Inhalt darunter:

1. **Eine einzige globale Navigation direkt oben:** Hotel | BusinessBooster | Direktmix | Voucher Currency | VTravel. Auf iPad, Handy und Desktop ohne seitliches Wegschneiden bedienen können; aktuelle Seite klar markieren. Innerhalb der eingebundenen Inhalte keine zweite konkurrierende globale Navigation darstellen.
2. **Kurzer Begrüßungs- und Orientierungstext je Seite:** Was wird hier im Gespräch gezeigt, welche Werte kann ich eingeben, was enthält die Gesprächs-PDF? Kein technischer Testseitentitel, keine internen Entwicklungsnotizen, kein übergroßer „PDF-Übergabe testen“-Banner.
3. **Einheitliche Akademie-PDF-Zentrale unmittelbar danach:** schlichte, gut sichtbare Aktion „PDF erstellen“. Nach erfolgreicher einmaliger Erstellung öffnet sich automatisch das bewährte zentrierte Overlay mit Dateiname, Datum/Herkunft, Seitenzahl, Speichern und Teilen. Eine erneute Öffnung der VORHANDENEN Datei soll möglich bleiben, aber nicht als aufdringlicher, dauerhaft deaktivierter Doppel-Button im Kopf stehen. Keine Vorschau und kein Druckzwang auf der Hauptseite.
4. **Danach die vollständige, unverfälschte Lern-/Gesprächsseite:** Alle vorhandenen Abschnitte, Grafiken, Rechner, Eingabefelder und Ergebnisse der jeweiligen Seite; die aktuelle HTML-Seite ist die Inhaltsquelle. Keine Reduktion auf eine Broschürenkopie. Werte und Seitenstruktur bleiben seitenspezifisch.
5. **Einheitlicher Abschluss/Fußbereich:** Bestehende sachlich relevante Hinweise erhalten, kein Entwicklungs-Metatext sichtbar.

Einheitlicher Kopf bedeutet **nicht** identische PDFs oder bloß den Hotel-Inhalt austauschen. Jede Seite braucht ihre eigene fachlich korrekte Erfassung der Live-Daten, Bausteinfolge und A4-PDF. Gemeinsame Komponenten: Navigation, nutzerfreundlicher Seitenrahmen, PDF-Übergabe/Overlay, Dateinamensregeln, Test-/Abnahmeverfahren.

## Migrations- und Freigabereihenfolge – nur ein Baustein gleichzeitig

1. ZUERST eine **neue, getrennte Hotel-Layout-Testseite** mit diesem Aufbau erstellen. Als Vorlage ausschließlich die akzeptierte `hotel-pdf-uebergabe-test.html` und unveränderte Original-Hotel-Inhalte nehmen. Dabei genau eine Navigation anzeigen; den technischen Testbanner und die störenden doppelten Bedienelemente weglassen. Keine Hauptseite ersetzen.
2. Auf der Testseite prüfen: alle Inhalte ohne abgeschnittenen iframe/zusätzliche Scrollfallen sichtbar, Live-Eingaben funktionieren, PDF wird einmal erzeugt, Overlay und benannte Datei bleiben erreichbar, erneut geöffnetes PDF enthält alle Seiten.
3. Nach ausdrücklicher Freigabe durch den Auftraggeber die getestete Kombination auf `hotel.html` übertragen, alte/konkurrierende PDF-Brücken nur kontrolliert deaktivieren, Hauptseite selbst erneut testen. Vorher den bestehenden Stand für Rückfall sichern. Kein stiller Tausch nur wegen erfolgreichen GitHub-Commits.
4. Danach **BusinessBooster**: vollständige Business-Inhalte der bereits vorhandenen Inhalts-Testseite erst freigeben; dann gleicher Seitenshell + Akademie-PDF-Zentrale und eigener Business-PDF-Adapter auf separater Testseite. Erst nach Test Hauptseite.
5. Nacheinander **Direktmix**, **Voucher Currency**, **VTravel** genauso; bei Voucher/VTravel Live-Daten und ihre Frame-/Wallet-/Kurs-Schnittstellen unverändert erhalten. Keine fünf parallelen Umbauten.

## Abnahmeprotokoll pro Seite

Notieren: Test-URL, GitHub-Datei/Commit, Gerät und Browser, eingegebener Objektname und Beispielwerte, PDF-Dateiname und Seitenzahl, tatsächlicher Speicherweg, nach dem Speichern separat geöffnetes PDF (alle Seiten sichtbar), Beobachtungen. Getestete Browser nicht auf andere Systeme verallgemeinern. Erst nach Nutzer-Freigabe Produktionsumbau und Schlussstatus FINAL.

Diese neue Blaupause konkretisiert die ältere `PDF_MASTER_README.md`: Für den Stand der nun akzeptierten **Akademie-PDF-Zentrale** und die neue gemeinsame Fünf-Seiten-Kopfstruktur gilt dieses Dokument; ältere dortige Angaben zum noch nicht abgenommenen PDF-Übergabestand sind historisch und dürfen nicht als jüngste Bewertung verwendet werden.