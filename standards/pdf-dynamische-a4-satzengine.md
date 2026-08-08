# Blaupause: Dynamische PDF-/A4-Satzengine

## Zweck
Dieser Standard ist der feste Basis-Baustein für alle künftigen Produkte unter `tools.liquiditybooster.de`, sobald eine PDF-/Druckausgabe benötigt wird.

Die PDF darf nicht als statische Browser-Druckansicht behandelt werden. Sie wird beim Klick auf den PDF-/Druck-Button jedes Mal neu aus dem aktuellen Datenstand erzeugt und vor dem Öffnen des Druckdialogs auf A4-Seiten verteilt.

## Grundprinzip
Die PDF passt sich dem tatsächlichen Inhalt des Nutzers an. Der Nutzer passt sich nicht an eine feste PDF-Vorlage an.

Das gilt insbesondere bei vielen wiederholbaren Einträgen, langen Freitexten, persönlichen Hinweisen, dynamisch wachsenden Formularen, Signaturen, wechselnder Sprache und unterschiedlichen Datenmengen.

## Verbindliche Architektur

### 1. Aktuellen Zustand lesen
Beim Klick auf `PDF / Ausdruck` wird zuerst der vollständige aktuelle Zustand aus Formular/State/LocalStorage gelesen. Die Druckansicht darf nicht auf einem alten Snapshot beruhen.

### 2. Druck-DOM vollständig neu erzeugen
Ein separater, nur für die Ausgabe bestimmter Druck-DOM wird aus den aktuellen Daten neu aufgebaut. Bildschirmkarten werden nicht einfach 1:1 gedruckt.

### 3. A4-Seiten in JavaScript paginieren
JavaScript entscheidet anhand einer definierten nutzbaren A4-Fläche, welche Inhalte zusammen auf eine Seite gehören. Die Browser-Druckengine darf nicht gleichzeitig eine zweite, konkurrierende Paginierung erzwingen.

### 4. Blöcke vor dem Druck messen
Alle Druckblöcke werden außerhalb des sichtbaren Bereichs mit der späteren Druckbreite gerendert und mit ihrer tatsächlichen Höhe gemessen. Zu messende Einheiten sind mindestens Dokumentkopf, Bereichsüberschrift, Datensatzüberschrift, Feldgruppen, Freitextblöcke, Hinweise/Callouts, persönliche Worte, Signaturblock und Footer.

### 5. Intelligente Paginierung
Verbindliche Regeln:
- Eine Bereichsüberschrift darf nie allein am Seitenende stehen.
- Eine Bereichsüberschrift muss mit mindestens dem ersten sinnvollen Inhalt zusammenbleiben.
- Eine Datensatzüberschrift darf nicht vom ersten Feldblock getrennt werden.
- Kleine Datensätze bleiben vollständig zusammen, wenn sie auf eine Seite passen.
- Große Datensätze dürfen an sinnvollen Feldgrenzen geteilt werden.
- Freitexte dürfen kontrolliert über Seiten laufen.
- Einzelne Labels dürfen nicht von ihrem Wert getrennt werden.
- Callouts/Sicherheitshinweise bleiben möglichst vollständig zusammen.
- Der Abschluss- und Signaturbereich bleibt möglichst als geschlossene Einheit.
- Unnötig große Leerflächen sind zu vermeiden.

### 6. Fortsetzungen kennzeichnen
Wird ein Datensatz oder Bereich auf einer Folgeseite weitergeführt, wird automatisch eine eindeutige Fortsetzungskennzeichnung gesetzt, zum Beispiel `Kryptowerte & Wallets 2 – Fortsetzung`.

### 7. Dynamische Datenmengen
Die Engine darf keine feste Anzahl von Seiten oder Datensätzen voraussetzen. Sie muss gleichermaßen bei einem oder vielen Wallets, Bankkonten, Verträgen sowie kurzen oder mehrseitigen persönlichen Texten funktionieren.

### 8. Browserneutrale physische Seitenausgabe
Diese Regel ist verbindlich für Firefox, Chrome, Edge, Safari auf macOS sowie Safari/WebKit auf iPad und iPhone.

Die Erkenntnis aus dem Version-07-Test der Notfallakte: Eine Kombination aus festem `height:297mm`, eigener Innenhöhe, `@page`-Rändern und gleichzeitig erzwungenem `break-after: page` beziehungsweise `page-break-after: always` kann je nach Browser zu zusätzlichen leeren Seiten führen. Im Firefox-Test entstand dadurch nach jeder Inhaltsseite eine komplett leere Seite.

Deshalb gilt künftig:
- Inhalts-Paginierung erfolgt ausschließlich durch JavaScript.
- Die Druck-CSS darf nicht parallel eine zweite Seitenlogik erzeugen.
- Keine widersprüchliche Kombination aus physischer A4-Höhe, zusätzlicher Innenhöhe, Druckrändern und mehrfachen Break-Regeln.
- `@page` bleibt minimal und browserneutral.
- Seitencontainer erhalten keine unnötigen doppelten `break-after`-/`page-break-after`-Regeln.
- Die letzte Seite erzwingt niemals einen Folgeumbruch.
- Vor `window.print()` werden leere Seitencontainer entfernt.
- Die erzeugte Seitenliste wird auf leere Zwischen- und Endseiten geprüft.
- Messlayout und Drucklayout müssen dieselbe nutzbare Breite besitzen.
- Browserweichen werden vermieden; dieselbe Dokumentstruktur muss in allen unterstützten Browsern funktionieren.

### 9. PDF-/Druck-Button
Der Druckdialog wird erst geöffnet, wenn die Seiten vollständig aufgebaut, vermessen, auf leere Seiten geprüft und finalisiert sind.

Ablauf:
1. aktuellen Zustand lesen,
2. Druck-DOM bauen,
3. Inhalte anhand der A4-Nutzfläche paginieren,
4. Fortsetzungen prüfen,
5. leere Seitencontainer entfernen,
6. Layout finalisieren,
7. `window.print()` öffnen.

### 10. Responsive Bildschirmansicht und Druckansicht trennen
Die Bildschirmansicht bleibt responsiv und benutzerfreundlich. Die PDF-/Druckansicht ist ein eigener Satz und wird nicht durch die Bildschirmbreite bestimmt.

### 11. Mehrsprachigkeit
Alle dynamisch erzeugten Drucktexte, Fortsetzungskennzeichnungen, Überschriften und Hinweise müssen die aktive Sprache der Anwendung verwenden.

### 12. Signaturen
Digitale Signaturen werden nur übernommen, wenn der Nutzer dies ausdrücklich gewählt hat. Bei Papierunterschrift bleibt eine klar definierte Unterschriftszeile frei.

### 13. Offline-Fähigkeit
Ein Service Worker kann ergänzend für Offline-Verfügbarkeit und Caching eingesetzt werden. Er ist nicht für die Satzlogik zuständig. Die A4-Paginierung erfolgt durch JavaScript im Browser.

## Qualitätsprüfung vor Freigabe
Vor Abschluss jedes Produkts muss mindestens eine vollständig ausgefüllte Demo als PDF erzeugt und visuell geprüft werden.

Verbindlich zu testen sind:
- Firefox Desktop,
- Chrome/Chromium Desktop,
- Edge Desktop,
- Safari Desktop,
- Safari/WebKit auf iPad/iPhone.

Zu prüfen sind insbesondere keine alleinstehenden Überschriften, keine abgeschnittenen Inhalte, keine getrennten Label/Wert-Paare, sinnvolle Fortsetzungsmarkierungen, keine unnötig leeren Seiten, keine automatisch eingeschobenen Leerseiten, sauberer Abschluss, korrekte Unterschriftsdarstellung, lange Texte, viele wiederholbare Einträge sowie DE und EN.

## Referenzimplementierung
Referenz ist die Notfallakte Version 07 unter `pages/notfallakte/index.html`.

Der erste V07-PDF-Test zeigte, dass die JavaScript-Inhaltsverteilung funktionierte, die Kombination aus A4-Seitencontainer und Browser-Break-Regeln jedoch in Firefox fünf zusätzliche Leerseiten erzeugte. Diese Erkenntnis ist Bestandteil dieses Standards und darf in zukünftigen Produkten nicht erneut eingeführt werden.

## Fester Projektstandard
Für neue Produkte wird dieser Baustein von Beginn an eingeplant, sobald eine PDF-/Druckfunktion vorgesehen ist. Die PDF-Funktion wird nicht erst am Ende als statischer Export ergänzt.

Stand: 08.08.2026 · Revision 2 – browserneutrale Seitenausgabe