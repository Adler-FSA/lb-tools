# Entwicklungsstandard – Build-Plan für lokale Softwarelösungen

Status: 13.08.2026

Dieser Ordner dokumentiert den aus der „Digitalen & finanziellen Notfallakte“ abgeleiteten technischen Standard für zukünftige browserbasierte bzw. installierbare Softwarelösungen der Akademie für finanzielle Souveränität.

Ziel ist, die in der Notfallakte gelösten Architektur-, Speicher-, Sicherungs-, Export-, Demo-, Browser- und UX-Probleme nicht erneut von Grund auf lösen zu müssen.

## Dokumente

- `01-systemarchitektur.md` – Gesamtarchitektur, Datenfluss, Zustände und Trennung der Schichten
- `02-datenspeicherung-und-sicherung.md` – LocalStorage, IndexedDB, JSON-Master-Sicherung, Wiederherstellung und Gerätewechsel
- `03-demo-blanko-und-onboarding.md` – Demo-/Echtmodus, Trainingslogik, Schutzregeln und Einstieg
- `04-ausgabe-engines.md` – JSON-, Excel- und PDF-Ausgabe, Dateinamen, Vorschau und Downloadlogik
- `05-pdf-engine-und-browserstandard.md` – PDF-Engine, iOS/iPadOS-Fallen, Browserunabhängigkeit und Zwei-Schritt-Download
- `06-excel-engine-und-import.md` – Excel-Erzeugung, Vorschau, Import, Mapping, Dublettenprüfung und Undo
- `07-feedback-und-bestaetigungsstandard.md` – sichtbare Klick-, Speicher-, Export- und Löschbestätigungen
- `08-sicherheits-und-datenschutzstandard.md` – Local-First, sensible Daten, Löschlogik und Datenschutzprinzipien
- `09-cache-deploy-und-schutzmechanismen.md` – Cache-Busting, kanonische Engines, GitHub-Actions-Schutz und Regression Prevention
- `10-ui-gestaltungsstandard.md` – Akademie-Look, Karten, Klappreiter, responsive Verhalten und Dokumentlayout
- `11-funktionstest-und-abnahmematrix.md` – vollständige Testmatrix für neue Softwarelösungen
- `12-wiederverwendbare-module.md` – konkrete Bausteine, die künftig übernommen oder als Engine abstrahiert werden sollen

## Grundsatz

Eine neue Softwarelösung beginnt künftig nicht mehr bei Null. Sie übernimmt zuerst diesen Build-Plan und entscheidet dann bewusst, welche Module benötigt werden.

Der zentrale Standard lautet:

**Lokal arbeiten. Sichtbar bestätigen. JSON sichern. Excel kontrollieren. PDF erzeugen. Browserunabhängig ausgeben. Demo und Echtmodus strikt trennen.**
