# Projekt-Check Archiv

Dieser Bereich gehört ausschließlich zur neuen Projekt-Check-Architektur.

## Zweck

Jeder vollständig abgeschlossene Analysefall wird nach Abschluss aller 37 Prüfbereiche, aller drei Auswertungsperspektiven und aller drei PDF-Dokumente in das Archiv übernommen.

## Archivindex

Öffentliche Anzeigedatei für das Control Panel:

`data/projekt-check/archive/index.json`

Erwartete Struktur je Fall:

```json
{
  "case_id": "PCA-20260825-ABC12345",
  "project_label": "Identifizierte Projektbezeichnung",
  "completed_at": "2026-08-25T08:30:00Z",
  "traffic_light": "ROT",
  "checks_completed": 37,
  "perspectives_completed": {
    "customer": 37,
    "company": 37,
    "academy": 37
  },
  "delivery_document": "customer_check",
  "documents": {
    "customer_check": {
      "status": "fertig",
      "url": ".../kunden-projekt-check.pdf",
      "filename": "kunden-projekt-check.pdf",
      "pages": 6,
      "bytes": 430080,
      "generated_at": "2026-08-25T08:25:00Z"
    },
    "company_check": {
      "status": "fertig",
      "url": ".../firmen-projekt-check.pdf",
      "filename": "firmen-projekt-check.pdf",
      "pages": 12,
      "bytes": 819200,
      "generated_at": "2026-08-25T08:26:00Z"
    },
    "academy_full_analysis": {
      "status": "fertig",
      "url": ".../akademie-vollanalyse.pdf",
      "filename": "akademie-vollanalyse.pdf",
      "pages": 24,
      "bytes": 1887437,
      "generated_at": "2026-08-25T08:27:00Z"
    }
  }
}
```

## Regel

Ein Fall darf erst als vollständig abgeschlossen in das Archiv geschrieben werden, wenn:

- alle 37 Prüfbereiche einen finalen neutralen Befund besitzen,
- die Kunden-Perspektive 37/37 abgeschlossen ist,
- die Firmen-Perspektive 37/37 abgeschlossen ist,
- die Akademie-Perspektive 37/37 abgeschlossen ist,
- Kunden-PDF, Firmen-PDF und Akademie-Vollanalyse erfolgreich erzeugt wurden.

Welche externe PDF-Version an den Auftraggeber ausgeliefert wird, steht in `delivery_document`. Die Akademie-Vollanalyse bleibt intern.

Der spätere Hörsaal kann an einen archivierten Fall angebunden werden, ist aber keine Voraussetzung für den normalen Projekt-Check-Abschluss.

Keine Logik oder Daten aus der alten Research-/FBI-Engine werden verwendet.
