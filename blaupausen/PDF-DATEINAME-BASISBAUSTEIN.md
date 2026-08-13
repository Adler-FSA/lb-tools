# PDF-Dateiname – fester FSA-Basisbaustein

Die Notfallakte verwendet `pages/notfallakte/pdf-core.js` als zentrale Dateinamenslogik.

Pflicht:
- `DEMO-Notfallakte-<Name>-YYYY-MM-DD-HHMM.pdf` bzw. `Notfallakte-<Name>-YYYY-MM-DD-HHMM.pdf`.
- `pdf-core.js` wird vor `v08-final.js` geladen.
- Vor jedem `window.print()` wird der Dateiname erneut gesetzt.
- Der Seitentitel wird nach dem Druck nicht sofort zurueckgesetzt, weil Browser den PDF-Namen teilweise erst spaeter uebernehmen.
- Der Workflow `install-notfallakte-pdf-core.yml` laeuft bei jeder Aenderung unter `pages/notfallakte/**` und stellt den Basisbaustein automatisch wieder her.
- Wenn die Struktur des PDF-Aufrufs unerwartet veraendert wurde, stoppt der Workflow mit SCHUTZSTOPP statt still etwas zu zerstoeren.
