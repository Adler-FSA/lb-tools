# 08 – PDF-Master-Vorlagen

## Status
Auf Basis der Kartierung in `07-pdf-engine-kartierung.md` wurden vier produktneutrale Startvorlagen extrahiert.

**Wichtig:** Dies sind Master-Startvorlagen für neue Produkte. Sie ersetzen nicht die getestete PDF-Engine der fertigen Notfallakte und werden dort nicht eingebaut.

## Dateien

### 1. `templates/pdf/pdf-master-writer.template.js`
Generischer PDF-Unterbau:
- A4-Geometrie
- Text-Encoding
- Text-Wrapping
- Painter-Primitiven
- Helvetica/Helvetica-Bold
- PDF-Objektstruktur
- Page Tree
- Content Streams
- xref
- Trailer
- Binärausgabe

Keine Notfallakten-Titel, keine Seed-Regeln und keine fachlichen Produkttexte.

### 2. `templates/pdf/pdf-master-pagination.template.js`
Produktneutraler Seitenpacker mit dokumentiertem Print-DOM-Vertrag.

Vertrag:
- `#printSheet`
- `.pPage`
- `.pPageInner`
- `.pSection`
- `.pSectionHead`
- `.pBody`

Die Vorlage übernimmt das Grundprinzip der erprobten DOM-Höhenmessung und Fortsetzungsseiten. Die sehr spezielle Record-/Grid-Zerlegung des Referenzprodukts bleibt zunächst außerhalb der generischen Basis und kann über produktspezifische Erweiterungen ergänzt werden.

### 3. `templates/pdf/pdf-product-adapter.template.js`
Zentrale Stelle für alles Produktspezifische:
- Produktname
- PDF-Dateipräfix
- Eigentümerquelle
- Demo-Erkennung
- PDF-Button
- Header
- Footer
- CI/Farben
- produktspezifischer Seitenrenderer

Dadurch müssen Core und Writer für ein neues Produkt nicht mit Produktnamen durchsetzt werden.

### 4. `templates/pdf/pdf-master-core.template.js`
Orchestrierung:
- Dateiname
- Start der Pagination
- Seiten einsammeln
- produktspezifischen Renderer aufrufen
- Fortschrittsanzeige
- Writer aufrufen
- Blob erzeugen
- Object-URL verwalten
- separaten Download anbieten
- Fehler sichtbar ausgeben

## Vorgesehene Lade-Reihenfolge
Für ein neues Produkt:

1. Produktkern mit `buildPrint()`
2. `pdf-master-writer`
3. `pdf-product-adapter`
4. produktspezifischer Renderer, der `FsaPdfProductAdapter.renderPage` bereitstellt bzw. den Adapter entsprechend erzeugt
5. `pdf-master-pagination`
6. `pdf-master-core`

Die konkrete Implementierung darf technisch anders gebündelt werden, solange diese Verantwortlichkeiten getrennt bleiben.

## Noch bewusst nicht als „fertige Universalengine“ freigegeben
Die Vorlagen wurden aus dem erfolgreichen Referenzsystem abgeleitet, sind aber als neue generische Architektur noch nicht in einem zweiten realen Produkt vollständig getestet.

Daher gilt:
- **Referenztechnik: erprobt.**
- **Generische Mastervorlagen: extrahiert, aber noch zu validieren.**

Sie dürfen nicht ohne Test als bereits produktionsbewährte Universalengine bezeichnet werden.

## Validierung beim ersten Folgeprodukt
Beim ersten neuen Windows-Produkt müssen mindestens geprüft werden:
- kurzer Text
- sehr langer Text
- viele Records
- einzelne übergroße Inhalte
- Fortsetzungsseiten
- Sonderzeichen/Umlaute
- Demo-Dateiname
- echter Dateiname
- 1 Seite
- viele Seiten
- keine Leerseiten
- korrekte Reihenfolge
- korrekter Header/Footer
- Seite X von Y
- Downloadname
- Offline-Erzeugung
- erneute Erzeugung in derselben Sitzung
- Object-URL-Aufräumlogik

Wenn diese Tests erfolgreich sind, wird der getestete Stand versioniert und im Master von „Template“ zu „freigegebener PDF-Master-Engine“ hochgestuft.

## Schutz der Referenz
Die funktionierenden Dateien des Referenzprodukts bleiben unverändert:
- `pdf-core.js`
- `pdf-core-canonical.js`
- `pdf-document-export-v3.js`
- `pdf-document-export.js`
- `pdf-pagination-v08.js`

Neue Erkenntnisse werden zuerst im Master bzw. in einem neuen Produkt getestet und nicht rückwirkend in das abgeschlossene Referenzprodukt eingebaut.
