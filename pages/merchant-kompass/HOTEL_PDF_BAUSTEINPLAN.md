# Hotel: Bausteinplan für einen eigenen PDF-Generator

**Status: Konzept / Quellkartierung, keine Implementierung und keine Freigabe einer PDF.**

## Verbindliche Grundlagen

- Originalquelle ist `hotel.html` **einschließlich des nach Initialisierung durch `hotel-pdf-v2-core.js` veränderten sichtbaren DOM** und der aktuellen Gesprächseingaben. Das fertige HTML-Design und die Rechenlogik bleiben erhalten.
- Die Architektur der Notfallakte dient als Referenz: `pages/notfallakte/index.html` (`buildPrint()`), `pdf-pagination-v08.js` (A4-Container und Aufteilung), `pdf-document-export-v3.js` (lokale PDF-Bytes), `pdf-core.js` (benannte Datei/Download). **Nicht ungeprüft den Notfallakten-Zeichner übernehmen:** Er zeichnet mit eigener Helvetica-Geometrie und bildet Hotel-CSS nicht automatisch originalgetreu ab.
- Hotel-PDF: vollständig lokal aus aktuellem DOM und Browserdaten; keine externe API, kein `window.print()`, kein Druckdialog. Eine erzeugte Blob-/File-PDF liefert *dieselben Bytes* an Vorschau und Download.
- Kein festes Seitenziel (weder 12 noch 35); Anzahl folgt aus vollständigem Inhalt und A4-Platz. Keine erfundenen Texte, keine automatische Kürzung/Abschneidung und keine neuen statischen Rechnungen.
- Eintragungen in HTML-Formularen als gesetzte Werte, bereits angezeigte Rechenergebnisse als Ergebnisse. Fixe Beispielbeträge der Erklärstrecke deutlich als *Beispiel* belassen, nicht mit persönlichen Hotelwerten verwechseln.

## Vollständige Inhaltskartierung in tatsächlicher Reihenfolge

| ID | HTML-Quelle und Inhalt | Vorgesehene A4-Regel | Datenstatus |
|---|---|---|---|
| H00 | `.top .brand`: Markenzeichen (SVG), LiquidityBooster, „Hotels · Regionen · Wachstum“ | Schmale wiederverwendbare Markenleiste, nicht als eigene volle Seite; `.top .nav` ist nur Navigation und entfällt | statisch, SVG bei Vektorunterstützung als Pfade |
| H01 | `.hero`: Eyebrow „Hotels. Regionen. Wachstum.“, H1 „Ihr Hotel kann mehr als Zimmer verkaufen.“, Lead und vier Nutzen-Chips | Eigener Einstieg auf erster A4-Seite; kein erneuertes Broschüren-Deckblatt, alle Originaltexte; verbleibenden Platz nur für Folgetext nutzen, falls optisch sinnvoll | statisch; Hotelname kann als klar gekennzeichnete Personalisierung aus `#hotelName` erscheinen, nicht als Ersatz des HTML-Titels |
| H02 | Erste `section.card.section`: „Warum jetzt?“, Einleitung, drei `.problem`-Karten, Callout „Die bessere Frage“ | Titel/Einleitung zusammen; drei Karten zusammen als Gruppe, Callout nicht isoliert; bei fehlendem Platz ganze Gruppe auf nächste Seite | statisch |
| H03 | `#direktbuchung`: „Paradigmenwechsel“, `.compare` mit Rabatt/Wertgutschein/VS, Callout | Vergleich als unteilbare Einheit, Callout anhängen, sonst sinnvoll nächste Seite; feste 20 €/100 € ausdrücklich Originalbeispiel | statisch |
| H04 | Folgende Section „Buchungsmagnet“: vier `.step`-Karten, zwei `.perspective`-Karten, goldener Callout | 4 Schritte zusammen oder 2+2 mit eindeutiger Fortsetzung; Perspektiven paarweise; kein Abschneiden einer Karte | statisches Beispiel 2.000 €/400 €/80 €, NICHT Live-Rechner |
| H05 | `#erlebnisse`: Einleitung, zwei `.perspective`, `.serviceTable` mit fünf `tr[data-service]`, vier `.summary`-Kennzahlen und Callout | Perspektiven als Paar; Tabelle mit wiederholter Kopfzeile und vollständigen einzelnen Zeilen, notfalls auf mehrere Seiten; Zusammenfassung direkt nach Tabelle; Callout nicht isolieren | 5× Name + `data-price`, `data-cost`, `data-voucher`; `data-pay`, `data-margin` und `#svcSales`, `#svcVouchers`, `#svcCash`, `#svcMargin` aus laufendem Rechner |
| H06 | Nächste Section „Sie bestimmen die Spielregeln“: vier `.rule`, vier `.level`, magentafarbener Callout | Regeln 2+2 oder alle vier; Staffel-Karten möglichst als komplette Gruppe; einzelne Karten nicht aufteilen | statisch: 30/40/50/75 € sind Beispiele |
| H07 | `#region`: vier `.region`-Karten, Callout | Karten 2+2 oder 4er-Gruppe; Callout möglichst im selben thematischen Abschnitt | statisch; Partnerannahme im Originaltext bleibt enthalten |
| H08 | Nächste Section „Aus einer Buchung wird ein Erlebnis-Kreislauf“: `.loop`, zwei `.perspective` | Drei Kreislauf-Karten samt Pfeilen als Schaubild zusammen; Perspektiven möglichst paarweise | statisches Beispiel 1.000 €/200 €/480 €, nicht mit Hotelrechner mischen |
| H09 | `#eigene-zahlen`: Head, erste `.calcGrid`, nachträglich verschobener `.calcResultBlock` und drei `.explain`; zweite `.calcGrid` plus Ergebnisblock und Explanation | Zwei eigenständige Unterblöcke: **(A) Direktbuchung Eingaben + Ergebnisse + Erklärungen**, **(B) konkrete Leistung Eingaben + Ergebnisse + Erklärung**. Jeden Rechner mit Resultat semantisch binden, auf Fortsetzungsseiten nur bei Bedarf trennen; keine Eingabefelder als UI abdrucken | `#hotelName`, `#booking`, `#voucherPct`, `#reservePct`, `#otaPct`; `#calcBooking`, `#calcVoucher`, `#calcReserve`, `#calcOta`, `#liquidityExplain`, `#guestExplain`; `#offerPrice`, `#offerCost`, `#offerVoucher`, `#offerPay`, `#offerBenefit`, `#offerCostOut`, `#offerMargin`, `#offerExplain` |
| H10 | Letzte Section „Hintergrund“: `<details>` mit Voucher-Currency- und VTravel-Erklärung und zwei weiterführenden Links | Erklärung unabhängig vom aktuellen Aufklappzustand vollständig übernehmen; Links optional als echte PDF-Linkannotation UND mit lesbarer Beschriftung; nicht auf technische URLs reduzieren | statisch, tatsächlicher Text kann durch `enhanceHotelUi()` aktualisiert worden sein: aktiven DOM auslesen |
| H11 | `.foot`: gesamter Hinweis zu Beispielrechnungen, Reserveanteil, Akzeptanzregeln, Kosten und fehlender Erfolgsgarantie | Vollständig am Dokumentende mit ausreichendem Freiraum; keine Verkürzung | statisch, Pflichtinhalt |

## Explizit keine Dokumentinhalte

- `.top .nav`, `#pdfPanel`, `#pdfState`, `#pdfBtn`, `.actions`/„Zurück zum Cockpit“, Eingaberahmen und Klick-/Bedien-UI. Ihre Inhalte werden nicht als technische Hinweise in der sichtbaren PDF gezeigt.
- Die in `hotel-pdf-v2-core.js` nur für den früheren Erklärreport neu formulierten Inhalte aus `buildPdfSource()` sind **keine** Quelle für diesen neuen Dokumentweg.
- Keine Texte oder Beispielzahlen aus V5/V6-Broschüre als Ersatz für den aktuellen HTML-Inhalt. Die V5/V6-Generatoren bleiben als unveränderte Sicherung vorhanden.

## Daten- und Gestaltungsvertrag

1. Vor Erfassung sicherstellen, dass `hotel-pdf-v2-core.js` die vorhandenen Rechner initialisiert hat und `hotel-storage-hotel.js` gespeicherte Werte restauriert hat; aktuelle, nicht erneut geladene Benutzereingaben haben Vorrang. Momentaufnahme lesen, die laufende Seite selbst nicht mutieren.
2. Aktive DOM-Beschriftungen, vollständige Texte, Werte und angezeigte Ergebnisse sammeln. Der Generator zeichnet die bestehenden Varianten von Karten, Pfeilen, Tabellen und Schaubildern als passende Vektor-/Textobjekte. Nicht die Webseite als großes Bild rasterisieren.
3. Design-Tokens aus HTML: Navy `#132238`, Mint `#00a7ad`, Magenta `#c6006f`, helle Karten, bestehende Akzente, Typohierarchie. Browser-Systemschriften dürfen nicht stillschweigend durch sichtbar abweichende PDF-Schriften ersetzt werden; geeignete lokale Schrifteinbettung und Sonderzeichen sind in der Probe zu belegen.
4. **Eine gemeinsame Geometrie** (A4 ca. 595,28 × 841,89 pt, Rand, Kopf-/Fußbereich) für Platzmessung UND PDF-Zeichnung; nutzbare Höhe pro Seite exakt berechnen. Baustein vor Platzierung messen, bei Nichtpassen verschieben; übergroße Textbereiche an Absatzgrenzen, Tabellen nur an Zeilengrenzen teilen. Keine abgeschnittenen, überlagerten oder stumm ausgelassenen Elemente.
5. Bausteinplan ist eine semantische Zuordnung, **keine zugesagte Seitenzahl oder starre Seitengruppierung**. Tatsächliches Packing erst am PDF-Prototyp und bei extrem langen Hotelnamen, Zahlen und Texten visuell prüfen.
6. PDF als echte, möglichst durchsuchbare A4-Datei lokal erzeugen; exakt dieselbe Blob-Datei in einer Vorschau öffnen und über einen zweiten Button mit sicherem Namen herunterladen. Keine Browser-Druckfunktion und keine externe Render-/PDF-API.
7. Fehler offen anzeigen und keinen Download als „fertig“ melden, wenn Quelle unvollständig, ein Asset nicht übernommen oder ein Inhaltsblock nicht platzierbar ist.

## Nächster einzelner Baustein (noch NICHT umgesetzt)

Eine unabhängige, nicht produktiv verdrahtete Probe mit H00–H03 sowie einem separaten H09-Rechnerdatenblock bauen und als echte A4-PDF mit Vorschau/Download liefern. Gegen die aktuelle HTML-Fassung Text für Text und visuell vergleichen. Erst nach Freigabe die restlichen Quellgruppen in denselben Generator aufnehmen und am Ende den Hotel-Button umschalten; bestehende HTML und alte PDFs bis dahin unberührt lassen.
