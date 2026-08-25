# Projekt-Check – Motorvertrag 1.0

Dieser Vertrag gehört ausschließlich zum neuen Projekt-Check. Die alte `research-engine` ist keine Abhängigkeit.

## Eingang

`POST /projekt-check/intake`

Payload gemäß `projekt-check-engine/schemas/intake.schema.json`:

- `contract_version`: `1.0`
- `submitted_at`: ISO-8601
- `language`: `de` oder `en`
- `traces`: 1–20 konkrete öffentliche HTTP/HTTPS-Spuren
- `claim`: optionale unbestätigte Aussage
- `source`: `projekt-check-web`

Der Eingang akzeptiert keine Pflichtfelder für Projektname, Tokenname oder Firmenname.

## Antwort des Eingangs

HTTP 202:

```json
{
  "accepted": true,
  "case_id": "PCA-20260825-ABC12345",
  "status_url": "/data/projekt-check/cases/PCA-20260825-ABC12345/status.json"
}
```

## Fallanlage

Für jeden angenommenen Fall entsteht:

```text
data/projekt-check/cases/<CASE_ID>/
  intake.json
  status.json
  evidence/
  result/
  documents/
```

`status.json` enthält von Beginn an exakt 37 Prüfbereiche.

## Statusfluss

`angenommen` → `identifizierung` → `recherche` → `auswertung` → `pdf_erstellung` → `abgeschlossen`

Bei einem nicht behebbaren technischen Fehler: `fehler`.

## Prüfbereiche

Quelle: `projekt-check-engine/checks/checks-37.json`.

Kein Prüfbereich wird vorab deaktiviert. Alle 37 laufen bei jedem Fall. Ein valides Ergebnis kann auch `kein_befund`, `nicht_relevant`, `offen` oder `widerspruch` sein.

## Dokumente

Nach der Auswertung entstehen unabhängig aus demselben geprüften Analysebestand:

1. Nutzer-Projekt-Check
2. vollständige Akademie-Projektanalyse

Beide werden direkt als PDF erzeugt. Browser-Druck ist kein Bestandteil des neuen Systems.

## Archivfreigabe

Ein Fall darf erst in `data/projekt-check/archive/index.json` aufgenommen werden, wenn:

- exakt 37 Prüfbereiche vorhanden sind,
- alle 37 einen finalen Status besitzen,
- Nutzer-PDF den Status `fertig` hat,
- Vollanalyse-PDF den Status `fertig` hat.

Die Prüfung übernimmt `projekt-check-engine/core/finalize_case.py`.

## Sicherheitsgrenze für die öffentliche Startseite

GitHub Pages ist statisch. Ein GitHub-Token darf niemals in `pages/projekt-check/` oder einer ausgelieferten JavaScript-Datei stehen. Der öffentliche Button benötigt deshalb einen kleinen serverseitigen Intake-Gateway, der den geheimen GitHub-Zugriff hält und diesen Vertrag aufruft. Der Gateway-Quellcode gehört zum neuen Projekt-Check und darf keine alte Engine verwenden.
