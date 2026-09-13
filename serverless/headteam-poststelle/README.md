# Headteam Poststelle · Serverless Bridge

Zweck: Headteam 3 kann Feedback senden, ohne dass Headteam-Mitglieder einen GitHub-Token besitzen.

## Ablauf

1. Headteam 3 sendet nur `projectId`, Absender, Feedback-Art und Nachricht an `/api/feedback`.
2. Die Serverless-Funktion prüft die Projekt-ID gegen `data/headteam-vorlauf.json`.
3. Projektname, Bereich und Arbeitslink werden serverseitig aus den echten Projektdaten übernommen.
4. Jede Nachricht wird als eigene JSON-Datei unter `data/headteam-poststelle/inbox/` gespeichert.
5. Head Control 3 liest den Posteingang mit Michaels bereits vorhandenem lokalen GitHub-Token.
6. `Erledigt` verschiebt die Nachricht nach `data/headteam-poststelle/archive/`.

## Vercel

Root Directory des Vercel-Projekts:

`serverless/headteam-poststelle`

Umgebungsvariablen:

- `GITHUB_TOKEN` – Fine-grained Token mit Contents-Schreibrecht ausschließlich für das benötigte Repository.
- `GITHUB_REPO` – Standard: `Adler-FSA/lb-tools`
- `GITHUB_BRANCH` – Standard: `main`

Nach Deployment die öffentliche URL `/api/feedback` in `data/headteam-poststelle-config.json` als `endpoint` setzen und `mode` von `local-demo` auf `live` ändern.

Bis dahin arbeiten Head 3 und Head Control 3 bewusst im lokalen Testmodus. Head 2 bleibt unverändert.
