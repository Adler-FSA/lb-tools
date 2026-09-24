# Baustein 5 — Status

Stand: 24.09.2026

## Status

Baustein 5 „Mietservice & Checks“ ist technisch abnahmebereit.

Baustein 4 bleibt fachlich und technisch eingefroren. An dessen Rechenkernen für Vermieterabrechnung, Heizung/Warmwasser, verbundene Anlagen, CO₂ und Jahresvorschau wurden in Baustein 5 keine Änderungen vorgenommen.

## Produktionspfad Baustein 5

### Mietservice

Seite: `mietservice.html`

Produktionsmodule:
- `assets/js/rental-service.js`
- `assets/js/mietservice-ui.js`
- `assets/js/i18n.js`

Umgesetzt:
- Mietvertragsentwurf
- Hausordnung
- Müll- und Entsorgungsinformation
- Ein-/Auszugsprotokoll
- Mieter-Serviceblatt
- Mietvertragsentwurf, Ein-/Auszugsprotokoll und Mieter-Serviceblatt sind zwingend einem konkreten Mietverhältnis zugeordnet
- Hausordnung und Müll-/Entsorgungsinformation bleiben ohne künstliche Mietverhältnis-Zuordnung möglich
- lokale Entwurfsspeicherung im bestehenden Projekt
- Kautions-Prüfhinweis ohne automatische Rechtsfreigabe
- keine PDF-Erzeugung
- keine Dokumentfreigabe

### Sicherheit & Checks

Seite: `schutzcheck.html`

Produktionsmodule:
- `assets/js/safety-checks.js`
- `assets/js/schutzcheck-ui.js`
- `assets/js/i18n.js`

Umgesetzt:
- Eigentümer-Sicherheits- und Pflichtencheck
- getrennte Einordnung als ungeklärt, gesetzliche Pflicht, vertragliche Verpflichtung, Empfehlung oder nicht zutreffend
- Status und Wiedervorlage
- Notiz/Nachweis
- keine automatische Rechtsklassifizierung

### Bewerber- & Vermietungscheck

Seite: `vermietungscheck.html`

Produktionsmodule:
- `assets/js/letting-check.js`
- `assets/js/vermietungscheck-ui.js`
- `assets/js/i18n.js`

Umgesetzt:
- drei aufeinanderfolgende Stufen A/B/C
- A: Besichtigung
- B: konkretes Mietinteresse
- C: ausgewählte zukünftige Vertragspartei
- spätere Prüfpunkte sind vor ihrer Stufe gesperrt
- keine Bewerberantworten im Check gespeichert
- keine Nachweisdateien im Check gespeichert
- kein Score
- kein Ranking
- keine automatische Mieterauswahl
- Vorgang vollständig löschbar

Fachliche Datenschutzgrundlage des Stufenmodells:
Datenschutzkonferenz, Orientierungshilfe zur Einholung von Selbstauskünften bei Mietinteressent:innen, Version 2.0, Stand Januar 2026.

## DE/EN

Die drei neuen Seiten verwenden `data-i18n` und einen gemeinsamen lokalen DE/EN-Layer.

Geprüft:
- `mietservice.html`: kein fehlender verwendeter i18n-Schlüssel
- `schutzcheck.html`: kein fehlender verwendeter i18n-Schlüssel
- `vermietungscheck.html`: kein fehlender verwendeter i18n-Schlüssel

Regression:
- `tests/baustein5-i18n.test.mjs`

## Navigation

Mietservice und Sicherheit & Checks sind in der bestehenden Hauptnavigation freigeschaltet.

Die Zentrale `index.html` zeigt Baustein 5 als aktuellen Abschnitt und verlinkt die neuen Bereiche.

„Dokumente & Hilfe“ bleibt bewusst gesperrt; dieser Bereich gehört zu Baustein 6.

## Tests und Prüflauf

Gezielte Kernregressionen Baustein 5:
- 16/16 bestanden

Speicher-/Schema-Integrationssmokes:
- Mietservice → bestehendes Schema → bestehender Speicher: bestanden
- Eigentümer-Check → bestehendes Schema → bestehender Speicher: bestanden
- Vermietungscheck → bestehendes Schema → bestehender Speicher: bestanden
- Ergebnis: 3/3 bestanden

Mietverhältnis-Verdrahtung:
- Mietvertragsentwurf → konkretes Mietverhältnis: geprüft
- Ein-/Auszugsprotokoll → konkretes Mietverhältnis: geprüft
- Mieter-Serviceblatt → konkretes Mietverhältnis: geprüft
- Ergebnis: 3/3 geprüft

JavaScript-Syntax:
- `rental-service.js`: sauber
- `safety-checks.js`: sauber
- `letting-check.js`: sauber
- `i18n.js`: sauber
- `mietservice-ui.js`: sauber
- `schutzcheck-ui.js`: sauber
- `vermietungscheck-ui.js`: sauber

Neue feste Regressionen:
- `tests/rental-service.test.mjs`
- `tests/safety-checks.test.mjs`
- `tests/letting-check.test.mjs`
- `tests/baustein5-storage-integration.test.mjs`
- `tests/baustein5-i18n.test.mjs`

Der bisher vollständig bestätigte Kernstand von Baustein 4 bleibt als vorheriger Referenzstand 331/331. Daraus wird keine künstliche neue Gesamtsumme gebildet.

## Abgrenzung zu Baustein 6

Nicht Bestandteil von Baustein 5:
- PDF-Erzeugung
- PDF-Zentrale
- Dokumentvorschau als finale Ausgabe
- rechtliche Freigabe eines Mietvertrags
- finales Dokumentarchiv
- Freigabe-/Snapshot-Workflow für die neuen Mietservice-Dokumente

Diese Funktionen bleiben für Baustein 6 reserviert.

## Live-Prüfung

Die Quell- und Integrationsprüfungen sind abgeschlossen. Ein externer HTTP-Live-Smoke der veröffentlichten Domain konnte aus der aktuellen Prüfengine nicht ausgeführt werden, weil die Domain dort nicht aufgelöst/abgerufen werden konnte. Das ist kein festgestellter Seitenfehler und wird nicht als bestandener Live-Smoke ausgegeben.

## Produktionspfad bereinigt

Es existiert kein paralleler zweiter Baustein-5-Kern. Mietservice, Eigentümer-Check und Vermietungscheck verwenden ausschließlich die oben dokumentierten Produktionsmodule.
