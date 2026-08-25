# Projekt-Check Auftragsposteingang

Der Auftragsposteingang trennt bewusst Kundendaten vom öffentlichen GitHub-Repository.

## Öffentlicher Spiegel

`data/projekt-check/inbox/index.json`

Dieser Spiegel darf nur pseudonyme Metadaten enthalten:

- `case_id`
- `submitted_at`
- `requested_output` (`customer_check` oder `company_check`)
- `status`
- `trace_count`
- `has_claim`
- optional ein nicht personenbezogener Bestellstatus

**Nicht in den öffentlichen Spiegel gehören:** Name, E-Mail, Telefonnummer, vollständige Bestelldaten, freie Kundentexte, eingereichte Referral-/Telegram-/Social-Links oder Zugangsschlüssel.

## Geschützter Auftrag

Das Control Panel ist dafür vorbereitet, vollständige Auftragsdaten später aus einem geschützten `inbox_endpoint` zu laden. Erst dort werden die eigentlichen Spuren und der optionale Claim bereitgestellt.

## Manueller Start

Ein Auftrag startet die Analyse nicht selbst. Im Control Panel wird der Auftrag geprüft und anschließend intern über `workflow_dispatch` an `.github/workflows/projekt-check-neuer-fall.yml` übergeben.

Ablauf:

`Bestellung -> Eingabe -> Posteingang -> interne Prüfung -> Analyse starten -> GitHub Actions -> 37 Prüfbereiche -> 3 Auswertungen -> 3 PDFs -> Auslieferung + Archiv`
