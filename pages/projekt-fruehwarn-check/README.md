# Projekt Frühwarn-Check

## Ziel
Ein schlankes Frühwarnsystem der Akademie für finanzielle Souveränität. Nutzer geben einen Projekt-, Unternehmens-, Plattformnamen oder eine Domain ein und sehen vorhandene offizielle Spuren aus Deutschland, Europa und globalen Quellen.

## Grundsätze
- Keine Projektbewertung und kein Seriositäts-Score.
- Kein Treffer ist kein Gütesiegel.
- Offizielle Quellen haben Vorrang vor Presse, Social Media und Nutzerbehauptungen.
- Ermittlungen, Anklagen, Urteile und Einstellungen werden getrennt dargestellt.
- Keine einzelne API darf ein Single Point of Failure sein.
- Fehlgeschlagene Aktualisierungen dürfen niemals einen gültigen letzten Datenbestand durch eine leere Datei ersetzen.
- Social-Media-Werbung allein ist kein Warnsignal. Relevant sind belegbare Widersprüche zwischen Werbung und offiziellen Fakten.

## Ordnerstruktur
- `index.html` – vollständige Oberfläche inkl. CSS, JavaScript und DE/EN-Umschaltung.
- `data/sources.json` – zentrales Quellenregister.
- `data/records.json` – normalisierter lokaler Trefferbestand; aktuell bewusst leer, bis echte Imports verdrahtet sind.

## Ergebnisbereiche
1. Deutschland
2. Europa
3. Global

## Informationsebenen
- Unternehmensidentität
- Finanzaufsicht
- Juristische Hinweise
- Wirtschaftlicher Status / Insolvenz
- Öffentliche Werbespuren

## Geplante Reihenfolge der Verdrahtung
1. ESMA MiCA CASP und Non-Compliant Entities aus offiziellen CSV-Datensätzen.
2. BaFin-Warnmeldungen.
3. Weitere nationale Aufsichten, soweit technisch und rechtlich sauber automatisierbar.
4. Juristische Quellen: nur offizielle Veröffentlichungen von Staatsanwaltschaften, Gerichten, Polizei, Eurojust, Europol etc.
5. Werbespuren / Transparenzbibliotheken als ergänzende Sicht.

## Normalisiertes Record-Schema
Ein späterer Datensatz kann u. a. enthalten:

```json
{
  "id": "source-record-id",
  "source_id": "esma-non-compliant",
  "region": "EU",
  "status": "warning",
  "name": "Example Project",
  "aliases": ["Example Ltd"],
  "domains": ["example.com"],
  "authority": "ESMA",
  "country": "EU",
  "date": "2026-08-21",
  "title": "Official notice",
  "summary_de": "Sachliche Zusammenfassung der offiziellen Veröffentlichung.",
  "summary_en": "Factual summary of the official publication.",
  "source_url": "https://official-source.example/notice"
}
```

## Technischer Hinweis
Ausführbare GitHub Actions müssen technisch unter `/.github/workflows/` des Repository liegen. Die dazugehörigen Importskripte und erzeugten Daten sollen dennoch im Projektordner `pages/projekt-fruehwarn-check/` gebündelt bleiben.
