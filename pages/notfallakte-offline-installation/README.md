# Notfallakte Offline-Installation – Entwicklungs-Klon

Dieser Ordner ist ein technisch isolierter 1:1-Ausgangspunkt der fertigen Online-Notfallakte.

## Schutzregel
- `pages/notfallakte/` bleibt das eingefrorene produktive Original.
- Entwicklung findet ausschließlich unter `pages/notfallakte-offline-installation/` statt.
- Keine Offline-Datei und kein Offline-Workflow darf Dateien unter `pages/notfallakte/` verändern.
- Die Daniel-Muster-Stress-Demo bleibt vollständig erhalten.

## Mitgenommene Bestandteile
- index.html
- v08-final.js
- demo-stress-test.js
- pdf-core.js
- pdf-document-export.js
- pdf-document-export-v3.js
- pdf-pagination-v08.js
- eigene Kopie des kanonischen PDF-Core
- Referenzkopien aller Notfallakten-spezifischen GitHub-Workflows

Die Dateien unter `workflows-reference/` sind bewusst nicht aktiv. Sie dienen als vollständige technische Referenz der Entwicklungs- und Reparaturhistorie. Der aktive Offline-Schutz liegt separat unter `.github/workflows/protect-notfallakte-offline.yml`.
