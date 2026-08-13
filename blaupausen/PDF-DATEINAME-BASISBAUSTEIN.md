# PDF-Dateiname & Dokument-Export – fester FSA-Basisbaustein

Die Notfallakte verwendet `pages/notfallakte/pdf-core.js` als zentralen, geschützten PDF-Core und `pages/notfallakte/pdf-document-export.js` als echte lokale PDF-Dokumentengine.

Pflicht:
- Dateiname: `DEMO-Notfallakte-<Name>-YYYY-MM-DD-HHMM.pdf` bzw. `Notfallakte-<Name>-YYYY-MM-DD-HHMM.pdf`.
- `pdf-core.js` wird vor `v08-final.js` geladen.
- Der bestehende V08-PDF-Aufruf darf weiterhin `window.print()` verwenden; innerhalb der Notfallakte wird dieser Aufruf durch den geschützten Core auf die echte lokale PDF-Erzeugung umgeleitet.
- Die Endfassung wird nicht mehr vom Browser gedruckt. Browser-URL, Browser-Datum, Browsername sowie fremde Kopf-/Fußzeilen dürfen niemals Bestandteil der PDF sein.
- Eigene PDF-Fußzeile: `Akademie für finanzielle Souveränität · Persönliche Notfallvorsorge` plus Erstelldatum plus `Seite X von Y`.
- Die PDF wird vollständig lokal aus dem aktuellen Datenbestand erzeugt. Demo und persönliche Notfallakte verwenden dieselbe Engine.
- Die bestehende dynamische A4-Paginierung bleibt Grundlage der Seitenaufteilung; die Anzahl der Seiten richtet sich ausschließlich nach dem tatsächlichen Inhalt.
- Auf iPhone/iPad wird die erzeugte Datei über das native Teilen-/Dateien-Menü mit dem festgelegten Dateinamen ausgegeben. Auf Desktop-Browsern wird eine echte `.pdf`-Datei mit Download-Dateiname erzeugt.
- Der kanonische Core liegt zusätzlich unter `blaupausen/pdf-core-canonical.js`.
- Der Workflow `install-notfallakte-pdf-core.yml` läuft bei jeder Änderung unter `pages/notfallakte/**` und stellt den kanonischen PDF-Core V2 automatisch wieder her, falls er überschrieben oder entfernt wurde.
- Wenn die PDF-Struktur unerwartet verändert wurde oder die Dokumentengine fehlt, stoppt der Workflow mit `SCHUTZSTOPP` statt still eine fehlerhafte Version zu veröffentlichen.
