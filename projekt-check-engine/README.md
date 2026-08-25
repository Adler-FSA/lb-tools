# Projekt-Check Engine – Neubau

Dieser Bereich ist die neue, eigenständige Projekt-Check-Engine. Er verwendet **keinen Code und keine Logik** aus der bisherigen `research-engine`.

## Feste Regeln

- Start nur aus konkreten öffentlichen Spuren: Referral-/Affiliate-Link, Telegram, Social Media, Video, Domain, Landingpage oder andere konkrete URL.
- Kein Projektname oder Tokenname als Identifikationsgrundlage.
- Eine optionale Aussage des Nutzers wird nur als unbestätigter Claim übernommen.
- Die Engine muss die Identität selbst aus den Spuren auflösen und absichern.
- Alle 37 Prüfbereiche laufen bei jedem Fall.
- Ein Bereich kann als `kein_befund`, `nicht_relevant`, `offen`, `bestaetigt` oder `widerspruch` enden; er darf aber nicht still übersprungen werden.
- Die Untersuchungstiefe wächst mit den gefundenen Spuren.
- Recherche und Auswertung bleiben getrennt.
- Aus einem gemeinsamen Evidenzbestand entstehen zwei unabhängige Ausgaben: Nutzer-Projekt-Check und vollständige Akademie-Projektanalyse.

## Struktur

- `intake/` – Eingang und Normalisierung der Spuren
- `identify/` – Identitätsauflösung und Zuordnungssicherheit
- `research/` – Web-/Quellenrecherche
- `sources/` – Quellentypen und Prioritäten
- `evidence/` – Evidenzobjekte und Gegenprüfungen
- `checks/` – technische Ausführung der 37 Prüfbereiche
- `schemas/` – Datenschemata und Übergabeverträge
- `tests/` – reale Testfälle und Regressionstests

Der sichtbare Status jedes Laufs wird als strukturierter Falldatensatz unter `data/projekt-check/cases/<CASE_ID>/status.json` bereitgestellt und vom Control Panel gelesen.
