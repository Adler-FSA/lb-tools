# Projekt-Check JS-Poststelle

Diese Poststelle ist der einzige kleine Serverbaustein zwischen der öffentlichen Projekt-Check-Seite und dem internen Control Panel.

## Zweck

- `POST /submit` – Kunde/Firma reicht Case-ID, öffentliche Spuren und optionale Aussage ein.
- `GET /inbox` – geschützter Posteingang für das Control Panel.
- `GET /case/<CASE_ID>` – geschützter Abruf eines vollständigen Auftrags.
- `POST /case/<CASE_ID>/start-ticket` – erzeugt ein kurzlebiges Einmal-Ticket für den internen GitHub-Start.
- `GET /start/<CASE_ID>?ticket=...` – GitHub/Startprozess holt den Intake einmalig ab; das Ticket wird sofort verbraucht.
- `GET /receipt/<CASE_ID>?key=...` – grober Status für die einreichende Person ohne Offenlegung der Auftragsdaten.
- `GET /health` – einfacher Funktionstest der Poststelle.

Die Poststelle startet **keine Analyse automatisch**.

## Sicherheit

Der öffentliche `/submit`-Endpunkt akzeptiert nur Requests von `https://tools.liquiditybooster.de`, validiert Case-ID, HTTP/HTTPS-Links, maximale Linkanzahl und maximale Länge der optionalen Aussage.

`/inbox`, `/case/...`, `/case/.../start-ticket` und Statusänderungen sind geschützt. Das Control Panel sendet dafür denselben lokal gespeicherten GitHub-Token, den es ohnehin für den manuellen Analyse-Start verwendet. Die Poststelle prüft diesen Token live gegen `https://api.github.com/user` und erlaubt nur die in `ADMIN_GITHUB_USERS` eingetragenen GitHub-Logins.

Der GitHub-Token wird von der Poststelle nicht gespeichert.

## Speicherung

Cloudflare KV Binding: `ORDERS`

Die vollständigen Auftragsdaten liegen damit nicht im öffentlichen `lb-tools`-Repository.

## Einmaliges Deployment

1. Kostenlosen Cloudflare Worker `projekt-check-poststelle` anlegen.
2. Einen KV Namespace anlegen, z. B. `PROJEKT_CHECK_ORDERS`.
3. Den Namespace im Worker als Binding `ORDERS` verbinden.
4. `handler.mjs` als Worker-Code verwenden oder das Verzeichnis mit Wrangler deployen.
5. `ALLOWED_ORIGIN=https://tools.liquiditybooster.de` setzen.
6. `ADMIN_GITHUB_USERS=Adler-FSA` setzen.
7. Die veröffentlichte Worker-URL anschließend in `data/projekt-check/config.json` als `poststelle_base` eintragen.

Beispiel:

```json
{
  "poststelle_base": "https://projekt-check-poststelle.<account>.workers.dev"
}
```

Danach verwenden Kundenseite und Control Panel dieselbe Poststelle.
