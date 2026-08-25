# Projekt-Check Intake Gateway

Dieser Ordner gehört ausschließlich zum neuen Projekt-Check. Keine Abhängigkeit zur alten `research-engine`.

## Aufgabe

Die öffentliche GitHub-Pages-Seite darf keinen GitHub-Token enthalten. Der Gateway nimmt den Intake entgegen, erzeugt eine CASE_ID und löst im Repository das Ereignis `projekt_check_intake_v1` aus.

## Geheimnisse

Nur serverseitig setzen:

- `GITHUB_TOKEN`: Fine-grained Token mit minimal notwendigem Zugriff zum Auslösen des Repository-Dispatch für `Adler-FSA/lb-tools`.
- `GITHUB_REPO`: optional, Standard `Adler-FSA/lb-tools`.
- `ALLOWED_ORIGIN`: Standard `https://tools.liquiditybooster.de`.

Niemals ein Token in `pages/`, `data/` oder ausgeliefertem JavaScript speichern.

## HTTP

`POST` JSON gemäß `projekt-check-engine/schemas/intake.schema.json`.

Antwort bei Annahme:

```json
{
  "accepted": true,
  "case_id": "PCA-20260825-ABC12345",
  "status_url": "/data/projekt-check/cases/PCA-20260825-ABC12345/status.json"
}
```

## Runtime

`handler.mjs` benutzt nur Web-Standard-APIs (`Request`, `Response`, `fetch`, `crypto.getRandomValues`). Der Code ist bewusst nicht an Vercel oder eine andere Plattform gebunden. Für die konkrete Runtime wird nur ein dünner Adapter benötigt, der eingehende Requests an `handleRequest(request, env)` übergibt.
