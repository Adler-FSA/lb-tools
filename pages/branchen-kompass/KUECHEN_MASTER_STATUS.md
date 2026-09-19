# Küchenstudio – Pilotstand (19.09.2026)

## Auftrag
Eine Branche = vier eigenständige, zusammengehörige Gesprächsseiten: Küchenstudio, BusinessBooster, Direktmix/Gastzugang, Voucher Currency. VTravel gehört ausschließlich zur Hotelbranche. Keine Entwicklungsmetadaten im sichtbaren Kundeninhalt. Keine Änderung der Hotel-Referenzen. Die elf weiteren Branchen bleiben vorerst unangetastet.

## Erstellte Seiten
- `branchen/kuechen.html`: unverändertes Linkziel des Branchen-Kompasses; Rahmen mit vier Links. Inhalt `branchen/kuechen-inhalt.html`: Küchenverkauf, Gutschein, Reserve, konkrete Folgeprodukte, Haupt- und Folge-Rechner, Kundenkreislauf.
- `branchen/kuechen-businessbooster.html`: Inhalt `branchen/kuechen-business-inhalt.html`; diese liest zur Laufzeit die aktuelle Referenz `../merchant-kompass/hotel-businessbooster.html` und lädt die vier auch im aktuellen Akademie-Inhaltstest verwendeten Ergänzungsskripte. Das Hotel-/OTA-Budgetmodell wird nicht gezeigt; stattdessen angepasster Küchen-Budgetrechner. Fullservice, drei Pakete, Magazinbild, Ablaufgrafiken, CRM, Presse, Marktplatz, Mitgliedschaften und Kontakt-/Auftragsszenario bleiben zugänglich. Keine Hotel-Speicher-/Alt-PDF-Skripte laden.
- `branchen/kuechen-direktmix.html`: Inhalt `branchen/kuechen-direktmix-inhalt.html` liest die vollständige Inhalts-Basis der aktuellen Direktmix-Akademie-Vorschau; entfernt nur alten Kopf, kombiniertes PDF und Hotelspeicher. OTA-Vertriebsmix und OTA-abhängige Summierung werden durch Küchen-Vertriebsmix und drei getrennte Szenario-Kennzahlen ersetzt. Gastzugang, drei Ebenen und Marktplatz einschließlich ihrer Rechner bleiben erhalten.
- `branchen/kuechen-voucher.html`: bindet direkt die aktuelle sechs Bereiche umfassende `../merchant-kompass/voucher-currency-content.html` ein; die dortige DE/EN-Umschaltung bleibt erhalten. Keine VTravel-Seite oder VTravel-Navigation.

Gemeinsamer Seitenrahmen `css/kuechen-akademie.css` und `js/kuechen-akademie.js`; Kundenwerte ausschließlich in eigenen Küchen-LocalStorage-Schlüsseln, nicht in Hotel-Speicherschlüsseln. Das Foto wird aus `assets/kuechen.jpg` eingebunden.

## Status / Abnahme
**Test-/Pilotstand, kein freigegebener Master.** Die Dateien und Ziele sind über GitHub-API gespeichert. Eine echte Browser-/iPad-Abnahme der dynamisch zusammengesetzten Fullservice-Inhalte und Live-Rechner konnte noch nicht durchgeführt werden; Live-Websiteabruf war über das verfügbare Lesewerkzeug nicht möglich. Browserfehler/Screenshots vom Nutzer gezielt beheben, nicht pauschal Seiten neu gestalten.

**PDF fehlt bewusst noch:** Erst vollständigen HTML-Inhalt und Werte fachlich abnehmen, dann je Seite seitenspezifische DOM-Erfassung aus der freigegebenen PDF-Master-Technik und gemeinsame `akademie-pdf-uebergabe.js` anbinden. Kein älterer Hotel-/Handels-PDF-Generator, kein Drucken, keine PDFs behaupten, ehe alle Inhalte und Ausgaben testbar sind. Die Küchen-Seiten haben derzeit noch keinen PDF-Button.

**Sprache:** Die Voucher-Quelle enthält DE/EN; die anderen drei Pilotseiten wurden in dieser Umbauphase nur auf Deutsch umgesetzt. Vollständige EN-Übertragung erst nach fachlicher Freigabe und vor endgültiger Wiederverwendung als Branchen-Master durchführen.

## Referenzen (unverändert)
`pages/merchant-kompass/hotel-akademie-master-test.html`, `hotel-businessbooster-akademie-test.html`, `hotel-direktmix-akademie-vorschau.html`, `hotel-voucher-akademie-vorschau.html`, `AKADEMIE_PDF_ZENTRALE_MASTER.md`, `akademie-pdf-uebergabe.js`.
