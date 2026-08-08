# Blaupause: Dynamische PDF-/A4-Satzengine

## Zweck
Dieser Standard ist der feste Basis-Baustein für alle künftigen Produkte unter `tools.liquiditybooster.de`, sobald eine PDF-/Druckausgabe benötigt wird.

Die PDF darf nicht als statische Browser-Druckansicht behandelt werden. Sie wird beim Klick auf den PDF-/Druck-Button jedes Mal neu aus dem aktuellen Datenstand erzeugt und vor dem Öffnen des Druckdialogs auf echte A4-Seiten verteilt.

## Grundprinzip
Die PDF passt sich dem tatsächlichen Inhalt des Nutzers an. Der Nutzer passt sich nicht an eine feste PDF-Vorlage an.

Das gilt insbesondere bei:
- vielen wiederholbaren Einträgen,
- langen Freitexten,
- persönlichen Hinweisen,
- dynamisch wachsenden Formularen,
- Signaturen,
- wechselnder Sprache,
- unterschiedlichen Datenmengen.

## Verbindliche Architektur

### 1. Aktuellen Zustand lesen
Beim Klick auf `PDF / Ausdruck` wird zuerst der vollständige aktuelle Zustand aus Formular/State/LocalStorage gelesen. Die Druckansicht darf nicht auf einem alten Snapshot beruhen.

### 2. Druck-DOM vollständig neu erzeugen
Ein separater, nur für die Ausgabe bestimmter Druck-DOM wird aus den aktuellen Daten neu aufgebaut. Bildschirmkarten werden nicht einfach 1:1 gedruckt.

### 3. A4-Seiten aktiv erzeugen
JavaScript erzeugt physische Seitencontainer im A4-Format. Jeder Seitencontainer besitzt eine definierte nutzbare Höhe und Breite, passend zu den `@page`-Rändern.

### 4. Blöcke vor dem Druck messen
Alle Druckblöcke werden im Browser unsichtbar bzw. außerhalb des sichtbaren Bereichs gerendert und mit ihrer tatsächlichen Höhe gemessen.

Zu messende Einheiten sind mindestens:
- Dokumentkopf,
- Bereichsüberschrift,
- Datensatzüberschrift,
- einzelne Feldgruppen,
- Freitextblöcke,
- Hinweise/Callouts,
- persönliche Worte,
- Signaturblock,
- Footer.

### 5. Intelligente Paginierung
Die Satzengine entscheidet selbst, welcher Block auf welche A4-Seite kommt.

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
Wird ein Datensatz oder Bereich auf einer Folgeseite weitergeführt, wird automatisch eine Fortsetzungskennzeichnung gesetzt, z. B.:

`Kryptowerte & Wallets 2 – Fortsetzung`

Die Kennzeichnung muss eindeutig dem ursprünglichen Datensatz zugeordnet sein.

### 7. Dynamische Datenmengen
Die Engine darf keine feste Anzahl von Seiten oder Datensätzen voraussetzen. Sie muss gleichermaßen funktionieren bei:
- 1 oder 30 Wallets,
- 1 oder 20 Bankkonten,
- wenigen oder sehr vielen Verträgen,
- kurzen oder mehrseitigen persönlichen Texten.

### 8. PDF-/Druck-Button
Der eigentliche Druckdialog wird erst geöffnet, wenn die A4-Seiten fertig aufgebaut und vermessen sind.

Ablauf:
1. aktuellen Zustand lesen,
2. Druck-DOM bauen,
3. A4-Seiten paginieren,
4. Fortsetzungen prüfen,
5. Layout finalisieren,
6. `window.print()` öffnen.

### 9. Responsive Bildschirmansicht und Druckansicht trennen
Die Bildschirmansicht bleibt responsiv und benutzerfreundlich. Die PDF-/Druckansicht ist ein eigener Satz und wird nicht durch die Bildschirmbreite bestimmt.

### 10. Mehrsprachigkeit
Alle dynamisch erzeugten Drucktexte, Fortsetzungskennzeichnungen, Überschriften und Hinweise müssen die aktive Sprache der Anwendung verwenden.

### 11. Signaturen
Digitale Signaturen werden nur übernommen, wenn der Nutzer dies ausdrücklich gewählt hat. Bei Papierunterschrift bleibt eine klar definierte Unterschriftszeile frei.

### 12. Offline-Fähigkeit
Ein Service Worker kann ergänzend für Offline-Verfügbarkeit und Caching eingesetzt werden. Er ist jedoch nicht für die Satzlogik zuständig. Die eigentliche A4-Paginierung erfolgt durch JavaScript im Browser.

## Qualitätsprüfung vor Freigabe
Vor Abschluss jedes Produkts muss mindestens eine vollständig ausgefüllte Demo als PDF erzeugt und visuell geprüft werden.

Zu prüfen sind:
- keine alleinstehenden Überschriften,
- keine abgeschnittenen Inhalte,
- keine getrennten Label/Wert-Paare,
- sinnvolle Fortsetzungsmarkierungen,
- keine unnötig leeren Seiten,
- sauberer Abschluss,
- korrekte Unterschriftsdarstellung,
- lange Texte,
- viele wiederholbare Einträge,
- DE und EN.

## Referenzimplementierung
Die Referenz für diesen Standard ist die Notfallakte ab Version 07:

`pages/notfallakte/index.html`

Dort wurde die dynamische A4-Satzengine eingeführt, nachdem normale Browser-Print-CSS-Regeln bei variablen Datenmengen zu alleinstehenden Überschriften, ungewollten Fortsetzungen und großen Leerflächen geführt hatten.

## Fester Projektstandard
Für neue Produkte wird dieser Baustein von Beginn an eingeplant, sobald eine PDF-/Druckfunktion vorgesehen ist. Die PDF-Funktion wird nicht erst am Ende als statischer Export ergänzt.

Stand: 08.08.2026
