# Projekt-Check Engine – Neubau

Dieser Bereich ist die neue, eigenständige Projekt-Check-Engine. Er verwendet **keinen Code und keine Logik** aus der bisherigen `research-engine`.

## Feste Regeln

- Start nur aus konkreten öffentlichen Spuren: Referral-/Affiliate-Link, Telegram, Social Media, Video, Domain, Landingpage oder andere konkrete URL.
- Kein Projektname oder Tokenname als Identifikationsgrundlage.
- Eine optionale Aussage des Nutzers wird nur als unbestätigter Claim übernommen.
- Die Engine muss die Identität selbst aus den Spuren auflösen und absichern.
- Alle 37 Prüfbereiche laufen bei jedem Fall.
- Der technische Verarbeitungsstatus und der fachliche Befundstatus werden getrennt geführt.
- Ein fachlicher Bereich kann als `bestaetigt`, `eigenaussage`, `offen`, `widerspruch`, `kein_befund` oder `nicht_relevant` enden; er darf aber nicht still übersprungen werden.
- Die Untersuchungstiefe wächst mit den gefundenen Spuren.
- Recherche, neutraler Befund und zielgruppenspezifische Auswertung bleiben getrennt.
- Für jeden der 37 Bereiche entstehen drei unabhängige Perspektiven: Kunde, Firma und Akademie.
- Aus einem gemeinsamen Evidenz- und Befundbestand entstehen drei unabhängige Ausgaben: Kunden-Projekt-Check, Firmen-Projekt-Check und vollständige Akademie-Projektanalyse.
- Der verbindliche Neutralitätsstandard gilt für alle drei Perspektiven: Fakten zuerst, Pro und Contra sichtbar, offene Punkte offen lassen, Widersprüche belegen, Fragen statt Unterstellungen.

## Struktur

- `intake/` – Eingang und Normalisierung der Spuren
- `identify/` – Identitätsauflösung und Zuordnungssicherheit
- `research/` – Web-/Quellenrecherche
- `sources/` – Quellentypen und Prioritäten
- `evidence/` – Evidenzobjekte und Gegenprüfungen
- `checks/` – technische Ausführung der 37 Prüfbereiche
- `schemas/` – Datenschemata und Übergabeverträge
- `tests/` – reale Testfälle und Regressionstests

Die Auswertungsregeln liegen separat unter `projekt-check-auswertung/`:

- `NEUTRALITAETSSTANDARD.md`
- `AUSWERTUNGSPROFILE.md`
- `guidance/checks-37-guidance.json`
- `schemas/evaluation.schema.json`

Der sichtbare Status jedes Laufs wird als strukturierter Falldatensatz unter `data/projekt-check/cases/<CASE_ID>/status.json` bereitgestellt und vom Control Panel gelesen.

Ein neu eingereichter Auftrag startet nicht automatisch die Analyse. Er wird zunächst mit dem Zustand `wartet_auf_start` angelegt und soll anschließend im internen Control Panel manuell freigegeben werden.
