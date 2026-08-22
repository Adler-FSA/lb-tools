# Akademie Research Engine

Interner Recherche-Motor für den **Projekt Frühwarn-Check** der Akademie für finanzielle Souveränität.

## Aufgabe

Die Engine bekommt das, was ein Nutzer tatsächlich kennt: einen Projekt-/Markennamen, eine Domain oder einen Referral-/Affiliate-Link. Daraus baut sie schrittweise eine belegbare öffentliche Faktenbasis auf.

Sie soll **nicht** entscheiden, ob ein Projekt seriös oder unseriös ist. Sie sammelt und strukturiert öffentlich auffindbare Hinweise, damit die Akademie anschließend Risiken, Fallstricke, Widersprüche und offene Fragen verständlich erklären kann.

## Recherche-Kaskade V1

1. Eingabe normalisieren.
2. Projektwebsite/Domain identifizieren.
3. Startseite und relevante Unterseiten lesen.
4. Produkt-/Geschäftsmodell-Hinweise erkennen.
5. Rendite-/APY-/APR-Angaben extrahieren.
6. Referral-/Affiliate-/Partnerstrukturen erkennen.
7. Laufzeiten und mögliche Kapitalbindung erkennen.
8. Auszahlung/KYC erkennen.
9. Trading/Leverage/Strategiehinweise erkennen.
10. Verwahrungs-/Custody-Aussagen erkennen.
11. Betreiber-/Rechtsträgerhinweise extrahieren.
12. Social-/Video-Spuren sammeln.
13. Alle Fundstellen mit Quelle speichern.

## Was V1 bewusst noch nicht tut

- keine automatische Gesamtbewertung;
- keine Behauptung „Betrug“/„seriös“;
- noch keine vollständige freie Websuche nach Presse, Foren und Nutzerstimmen;
- noch keine direkte Ausgabe für Klaus;
- Behörden-/Registerdaten bleiben ein eigener Quellenbaustein der großen Projektanalyse und können später als Adapter zugeschaltet werden.

## Dateien

- `engine.py` – Recherche-Motor
- `requirements.txt` – Python-Abhängigkeiten
- `tests/test_engine.py` – Regressionstests
- `output/` – strukturierte Test-/Rechercheergebnisse

## Datenprinzip

Jede Feststellung soll möglichst enthalten:

- `type` – Art des Hinweises
- `value` – erkannter Wert
- `source_url` – Fundstelle
- `evidence` – kurze belegende Textstelle
- `confidence` – technisch eindeutige Zuordnung (`high`, `medium`, `low`)

Fehlende Informationen werden nicht als Entwarnung behandelt.
