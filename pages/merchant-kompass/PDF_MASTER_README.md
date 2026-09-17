# Verbindliche Blaupause: HTML-Seite → persönliche PDF

**Projekt:** LiquidityBooster · Merchant-Kompass  
**Stand:** 17.09.2026 · aus der Abnahme des Hotel-PDF-Masters und den anschließenden Fehlerberichten  
**Status:** Verbindliche Arbeitsanweisung für neue PDF-Seiten; die Produktionsausgabe der Hotel-Seite ist nach dem letzten Nutzer-Screenshot **NICHT erneut abgenommen**. Diese README ist eine Dokumentation, kein Nachweis eines erfolgreichen Deployments.

## 1. Auftrag und Abnahmekriterium

Aus einer vollständig gestalteten HTML-Gesprächsseite wird auf dem Gerät eine **echte mehrseitige A4-PDF mit den aktuell eingegebenen Werten** erstellt. Kein Browser-Druckdialog, kein externer PDF-Dienst. Die PDF muss nach dem Speichern wirklich geöffnet werden können.

Das vom Nutzer gewünschte Ergebnis ist **nicht nur** `PDF erstellt`, sondern:

1. Der Download bzw. die native Dateifreigabe zeigt einen **lesbaren Dateinamen mit Hotel-/Objektname und Datum**; kein kryptischer UUID-Name.
2. Die gespeicherte PDF lässt sich in „Dateien“ beziehungsweise dem PDF-Programm öffnen, **alle Seiten enthalten sichtbaren Inhalt** und stimmen mit der freigegebenen Master-PDF überein.
3. Vorschau ist **auf der produktiven Hotel-Seite nicht gewünscht**. Dort nur „PDF erstellen“ und „PDF herunterladen / speichern“ beziehungsweise eine passende Dateifreigabe.
4. Die aktuell eingegebenen Werte, Berechnungen und das fertige PDF-Layout bleiben erhalten. Seitenzahl ist Ergebnis der Inhalte, keine starre Vorgabe.
5. Gleiches Ziel in Safari, Firefox und Brave; **Browser-Verhalten gesondert testen**, nicht aus JavaScript-/GitHub-Tests auf Browsererfolg schließen.

**Wichtig:** Eine angezeigte Dateigröße, `%PDF-`-Signatur oder `%%EOF` beweist noch nicht, dass Safari die Datei vollständig gespeichert hat. Die Datei selbst öffnen und alle Seiten prüfen. Ein korrekter Dateiname in einer iOS-Dateifreigabe beweist nicht, dass ein *separater* Browser-Download ebenfalls korrekt benannt ist.

## 2. Die einzige inhaltlich/gestalterisch freigegebene Hotel-Referenz

Repository: `Adler-FSA/lb-tools`; Verzeichnis: `pages/merchant-kompass/`.

- **Hotel-Master-Testseite:** [`hotel-pdf-eigen-test.html`](./hotel-pdf-eigen-test.html) – die vom Nutzer für die sieben Seiten freigegebene Entwicklungsseite. Sie bettet `hotel.html?pdf-design-test=1&hotel-pdf-eigen=1` ein und lädt `hotel-pdf-eigen-fix.js`. Sie erzeugt die PDF mit `HotelPdfEigen.generate(doc, progress)`; die Datei enthält `blob`, `filename` und `pages`.
- **Freigegebene Hotel-Engine:** [`hotel-pdf-eigen-fix.js`](./hotel-pdf-eigen-fix.js) auf Basis von [`hotel-pdf-eigen.js`](./hotel-pdf-eigen.js). Beim Nachbau **keine andere Hotel-Engine einschmuggeln** und nicht auf ältere Broschüren-/12-/24-/35-Seiten-Generatoren wechseln.
- **Produktionsseite:** [`hotel.html`](./hotel.html) mit Speicher-/Ladebrücke [`hotel-storage-hotel.js`](./hotel-storage-hotel.js) und Ausgabebrücke [`hotel-pdf-eigen-live.js`](./hotel-pdf-eigen-live.js).
- `hotel-pdf-abschluss-test.html` und `hotel-pdf-eigen-v2-test.html` sind **andere historische Teststände** und dürfen die obige ausdrücklich abgenommene Referenz nicht stillschweigend ersetzen.

**Master-Regel:** Vor jedem Bau die *aktuelle* freigegebene Testseite und ihren tatsächlich geladenen Generator aus GitHub abrufen. Nicht aus Erinnerung umsetzen. Generator-/Layoutänderungen nur in einer separaten Testkopie und nur für nachgewiesene Fehler. Die finale Hotel-Seite und bestehende Rechner nicht als Experimentierfeld benutzen.

## 3. Die Download-Falle aus September 2026 – nicht wiederholen

Die Hotel-Hauptseite wurde nach Freigabe mehrfach an der Dateiausgabe geändert: Blob-URL, künstlicher Service-Worker-Dateipfad (`__hotel_pdf__`), Browser-Download und native Dateifreigabe. Dokumentierte Fehlbilder: UUID-Dateinamen (`xxxxxxxx-xxxx-....pdf`), `0 KB`-Anzeige, leere PDF nach Öffnen, weiße Vorschau. Zuletzt (21:18 Uhr, 17.09.) wurde **wieder ein UUID-Dateiname** gemeldet. Der letzte Stand ist daher **nicht als erfolgreich abgenommen** zu kennzeichnen.

- **Nicht erneut** einen selbst erfundenen Service-Worker-PDF-Pfad, Cache-Routing, Browserfenster oder eine neue Ausgabe-Engine als Ersatz für den abgenommenen Master einführen. Keine ungetesteten Zustellmechanismen.
- Der Testmaster setzt nach der Generierung `URL.createObjectURL(out.blob)` auf einen Download-Link und `download.download = out.filename`. Das ist seine **Code-Referenz**, aber das `download`-Attribut wird von einigen Browsern (insbesondere bei `blob:`-Links) **nicht zuverlässig als Dateiname übernommen**. Es genügt deshalb nicht, einfach zu behaupten „1:1 übernommen“, wenn der End-to-End-Test etwas anderes zeigt.
- Auf iOS kann die **native Dateifreigabe** die `File` mit dem echten Namen sichtbar anzeigen (`new File([out.blob], out.filename, {type:'application/pdf'})` und, soweit unterstützt, `navigator.canShare({files:[file]})` / `navigator.share({files:[file]})`). Diese Funktion muss durch einen **eigenen Nutzerklick nach abgeschlossener Generierung** erfolgen, nicht aus einem verzögerten Hintergrund-Callback. Auch dieser Weg gilt erst nach realem Speichern **und Öffnen** als bestanden.
- Andere Browser können einen normalen benannten `<a download>`-Link verwenden **sofern deren Download tatsächlich richtig benannt und lesbar ist**. Wenn ein Browser die gewünschte Benennung verweigert, das offen benennen und eine geprüfte Dateifreigabe anbieten; **keine universelle Garantie behaupten**.
- Kein frühzeitiges `URL.revokeObjectURL`: PDF-Lebensdauer so steuern, dass Download/Viewer die Bytes erst vollständig gelesen haben. Niemals per `pagehide` direkt widerrufen und anschließend behaupten, ein Seitenwechsel sei sicher.

**Einziger Maßstab:** Die PDF nach dem echten Download oder „In Dateien sichern“ erneut aus dem Speicher öffnen; korrekter Inhalt auf *allen* Seiten und nachvollziehbarer Dateiname. PDF-Bytes müssen mit den vom Master erzeugten Bytes übereinstimmen, sofern kein bewusst dokumentierter technischer Container-/Metadatenwechsel erfolgt.

## 4. Pflichtablauf für JEDE weitere Seite (BusinessBooster, Direktmix, Voucher, VTravel …)

1. **Inhalt zuerst vervollständigen.** Die jeweilige aktuelle HTML-Seite ist die inhaltliche Quelle; ältere Broschüre nur nach Abgleich verwenden. Keine internen Bauanweisungen, Metatexte oder Verweise auf „die Broschüre“ im sichtbaren Nutzertext. Originale Hotel-Hauptseite unangetastet.
2. **Eigene Testseite erstellen.** Beispiel Business: `hotel-businessbooster-...-test.html`. Die Produktionsseite ist zunächst tabu. Live-Eingaben und berechnete Werte aus genau dieser Seite lesen; nicht blind alte LocalStorage-Werte drucken.
3. **Freigegebene PDF-Technik adaptieren.** A4-Hülle, Bausteinfolge, saubere Seitenumbrüche, zusammengehörige Karten, Zeichensatz, Wert- und Einheitenformatierung, ggf. Links. Nur Inhalts-/DOM-Zuordnung ändern; kein neues Design oder neue PDF-/Download-Architektur erfinden.
4. **Eine PDF-Datei erzeugen.** Derselbe `Blob` wird an den Ausgabeweg übergeben. Nie im Download ein zweites Mal generieren und damit andere Werte riskieren. `filename` mit bereinigtem Objektname + Datum; Inhalt ist eine echte PDF, nicht HTML-Druckansicht, nicht URL-Verweis, nicht leere Platzhalterdatei.
5. **Technisch und visuell prüfen.** PDF-Struktur, tatsächliche Seitenzahl, A4, sichtbare Inhalte, persönliche Werte, Rechnungen, fehlende/überlappende Elemente, typografischer Abstand. Alle PDF-Seiten rendern und ansehen, nicht nur Seite 1. Verschiedene Eingabefälle einbeziehen.
6. **Nutzer testet separate Testseite.** Eindeutigen, anklickbaren Testlink geben; echten Datei-Download und erneut geöffnetes PDF kontrollieren. Bei Fehlern ausschließlich die gefundene Stelle korrigieren, nicht im ganzen Projekt umbauen.
7. **Explizite Freigabe einholen.** Erst anschließend die nachweislich funktionierende **identische** Generator- UND Ausgabekombination auf die jeweilige Hauptseite übertragen. Script-Versionen/Cache prüfen und die Hauptseite erneut wie die Testseite end-to-end abnehmen.
8. **Nach Abnahme einfrieren.** GitHub-Commit und SHA notieren; keine späteren allgemeinen „Optimierungen“ an freigegebenen Seiten. Nächste Seite = neuer unabhängiger Baustein.

## 5. Minimale verbindliche Abnahmecheckliste

- [ ] Original-HTML und Rechner unverändert, außer explizit beauftragter Inhaltskorrektur.
- [ ] Nur der vereinbarte PDF-Generator geladen; kein doppelter Button/Event-Handler, kein altes Skript durch Cache.
- [ ] Alle Eingaben und aktuellen Ausgaben exakt im PDF; Euro/Prozent formatiert.
- [ ] PDF auf dem Gerät erzeugt, **alle** A4-Seiten sichtbar und richtig umbrochen.
- [ ] Dateiname mit Name und Datum im *tatsächlich verwendeten* Speicherweg.
- [ ] Heruntergeladene beziehungsweise gespeicherte Datei separat geöffnet: kein Weißbild, kein 0-KB-Download.
- [ ] Safari/iPad und weitere genutzte Browser (u. a. Firefox, Brave) einzeln geprüft; Abweichungen dokumentiert.
- [ ] Testseite und Hauptseite mit demselben Verfahren geprüft.
- [ ] Kein Druckdialog, kein externer PDF-Dienst; auf der Hotel-Hauptseite kein Vorschau-Button.
- [ ] Erst nach bestandenem Nutzertest als **final** bezeichnen.

## 6. Fehlerdisziplin und Berichterstattung

Bei erneuter Fehlermeldung: konkreten Screenshot, Browser, Zeitpunkt, geladenes Skript und GitHub-Commit dem letzten **funktionierenden und abgenommenen** Stand gegenüberstellen. Zuerst Regression isolieren; nur die betroffene Ausgabebrücke ändern. Änderungen an anderen Hotel-Seiten, PDF-Layouts, Business-Seite und lokalen Rechnungen bleiben ausgeschlossen. GitHub-Push, Dateisignaturtest oder Cachebuster sind **kein** Nachweis für erfolgreiche Bereitstellung oder erfolgreichen Download.

**Arbeitsreihenfolge ab hier:** Erst den aktuellen Hotel-Download gemäß obigen Kriterien wieder vom Nutzer abnehmen lassen; danach Business-Inhalte auf Testseite finalisieren, Business-PDF auf eigener Master-Testseite erstellen und *erst nach Freigabe* zur Business-Hauptseite umziehen.
