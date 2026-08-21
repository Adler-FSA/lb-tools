# Projekt Frühwarn-Check

## Ziel
Ein schlankes Frühwarnsystem der Akademie für finanzielle Souveränität für den Moment **vor Einstieg, Registrierung oder Geldfluss**.

Typischer Anwendungsfall: Eine Person sieht Werbung, wird von einem Bekannten auf eine Firma, ein Projekt oder ein Investment angesprochen, erhält eine Website oder eine Einladung zu einem Zoom und möchte vor einer Entscheidung wissen:

- Mit wem habe ich es zu tun?
- Welche offizielle und öffentliche Reputation ist nachvollziehbar?
- Gibt es Warnhinweise oder behördliche Maßnahmen?
- Gibt es eine passende Zulassung oder Registrierung?
- Gibt es juristische oder wirtschaftliche Spuren?
- Gibt es Werbeaussagen, die mit offiziellen Fakten abgeglichen werden sollten?

## Nutzerprinzip
Jede Eingabe erzeugt **immer einen lesbaren Bericht mit sieben Bereichen**. Deutschland, Europa und Global bleiben technische Such- und Quellenebenen im Hintergrund; sie sind nicht mehr die primäre Ergebnisdarstellung.

## Die sieben Antworten
1. **Identität & Unternehmen** – Rechtsträger, Register- und Unternehmensspuren.
2. **Regulierung & Erlaubnisse** – passende Zulassungen und beaufsichtigte Tätigkeiten.
3. **Behördenwarnungen & Maßnahmen** – Warnungen, Non-Compliance, Prospekt- oder Erlaubnishinweise.
4. **Ermittlungen & Justiz** – nur öffentlich bestätigte Ermittlungen, Verfahren und Entscheidungen.
5. **Wirtschaftlicher Status** – Insolvenz-, Liquidations- und wirtschaftliche Registerspuren.
6. **Öffentliche Reputation & Spuren** – belastbare öffentliche Spuren ohne künstlichen Reputations-Score.
7. **Werbung & öffentliche Versprechen** – Werbespuren als Kontext; relevant sind Widersprüche zu offiziellen Fakten.

## Ergebnislogik
Jeder Bereich liefert Text – auch wenn nichts gefunden wurde.

Dabei werden drei Fälle strikt getrennt:

- **Treffer gefunden:** eindeutiger Bezug zwischen Suche und offiziellem Datensatz.
- **Kein Treffer in tatsächlich automatisch geprüften Quellen:** ein konkretes Suchergebnis, aber kein Gütesiegel.
- **Bereich noch nicht vollständig automatisch angeschlossen:** ausdrücklich als Teil-/Direktprüfung gekennzeichnet; daraus wird keine Aussage „es liegt nichts vor“ abgeleitet.

Ähnliche Namen werden separat als **nicht zugeordnet** angezeigt und niemals automatisch als Warnung gegen den gesuchten Anbieter gewertet.

## Grundsätze
- Keine Projektbewertung und kein Seriositäts-Score.
- Kein Treffer ist kein Gütesiegel.
- Offizielle Quellen haben Vorrang vor Presse, Social Media und Nutzerbehauptungen.
- Ermittlungen, Anklagen, Urteile, Einstellungen und Freisprüche werden getrennt dargestellt.
- Keine einzelne API darf ein Single Point of Failure sein.
- Fehlgeschlagene Aktualisierungen dürfen niemals einen gültigen letzten Datenbestand durch eine leere Datei ersetzen.
- Social-Media-Werbung allein ist kein Warnsignal. Relevant sind belegbare Widersprüche zwischen Werbung und offiziellen Fakten.
- Eine Unternehmensregistrierung ist nicht automatisch eine Erlaubnis für eine angebotene Finanzdienstleistung.

## Ordnerstruktur
- `index.html` – Oberfläche, Sieben-Bereiche-Bericht, Such- und Matchlogik, DE/EN.
- `data/sources.json` – zentrales Quellenregister mit Modus `auto`, `direct` oder vorbereitet.
- `data/records.json` – normalisierter lokaler Trefferbestand aus angeschlossenen automatischen Quellen.
- `scripts/` – Import- und Normalisierungsskripte.

Ausführbare GitHub Actions liegen technisch unter `/.github/workflows/`; die fachliche Logik und erzeugten Daten bleiben im Projektordner gebündelt.

## Aktuell automatisch angeschlossen
- BaFin Verbraucherwarnungen
- ESMA MiCA – autorisierte CASP
- ESMA MiCA – Non-Compliant Entities

Weitere Register und Behördenquellen werden modular ergänzt. Direktprüfungen bleiben verfügbar, wenn eine rechtlich und technisch saubere automatische Anbindung nicht möglich oder noch nicht umgesetzt ist.

## Matching
Gesucht wird normalisiert über:
- offiziellen Namen
- Alias-/Handelsnamen
- Domains
- definierte Match-Begriffe
- URL-/Domain-Normalisierung
- Rechtsform-Normalisierung

Eindeutige Matches und bloße Namensähnlichkeiten werden getrennt behandelt.

## Normalisiertes Record-Schema
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

## Ausbauziel
Der Frühwarn-Check soll nicht zu einer allgemeinen Internet-Suchmaschine werden. Er führt qualifizierte offizielle und belastbare öffentliche Spuren zusammen und sagt transparent, **was gefunden wurde, was in den geprüften Quellen nicht gefunden wurde und was noch nicht automatisch geprüft werden kann**.
