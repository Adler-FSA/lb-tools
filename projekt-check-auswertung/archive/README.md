# Projekt-Check Archiv

Dieser Bereich gehört ausschließlich zur neuen Projekt-Check-Architektur.

## Zweck

Jeder vollständig abgeschlossene Analysefall wird nach Abschluss aller 37 Prüfbereiche in das Archiv übernommen.

## Archivindex

Öffentliche Anzeigedatei für das Control Panel:

`data/projekt-check/archive/index.json`

Erwartete Struktur je Fall:

```json
{
  "case_id": "PCA-2026-0001",
  "project_label": "Identifizierte Projektbezeichnung",
  "completed_at": "2026-08-25T08:30:00+02:00",
  "traffic_light": "ROT",
  "checks_completed": 37,
  "documents": {
    "user_check": {
      "status": "ready",
      "url": ".../projekt-check.pdf",
      "pages": 6,
      "size_label": "420 KB"
    },
    "full_analysis": {
      "status": "ready",
      "url": ".../vollanalyse.pdf",
      "pages": 24,
      "size_label": "1,8 MB"
    }
  }
}
```

## Regel

Ein Fall darf erst als abgeschlossen in das Archiv geschrieben werden, wenn alle 37 Prüfbereiche einen finalen Status besitzen und beide PDF-Dokumente erfolgreich erzeugt wurden.

Keine Logik oder Daten aus der alten Research-/FBI-Engine werden verwendet.
