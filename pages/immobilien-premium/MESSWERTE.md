# Nebenkosten Premium — Messwertqualität, MH-06 (technischer Zwischenstand)

**Stand: 21.09.2026.** Eigenständiger Neubau. Ergänzung zu `BERECHNUNG.md`, keine fertige/gesetzlich freigegebene Betriebskostenabrechnung.

## Umsetzung

`assets/js/meter-quality.js` prüft sämtliche im Abrechnungsjahr erfassten Werte **jedes tatsächlich verwendeten Geräts**, auch zusätzliche Zwischenwerte, die für die Rechnung nicht unmittelbar benötigt werden. `assets/js/temporal.js` ruft die reine Prüfung vor der Verbrauchsermittlung auf. Es werden weder Daten verändert noch fehlende Werte erfunden.

- Erforderliche Anfangs-, Schluss-, Nutzerwechsel- und Gerätewechselstände fehlen oder liegen mehrfach vor: die bestehende Grenzwertprüfung sperrt.
- Zusätzliche doppelte Werte am gleichen Tag, negative Verlaufsdifferenzen, Werte außerhalb der Geräte-Betriebszeit, zu viele Nachkommastellen und ausdrücklich `disputed:true` markierte Werte: neue eindeutige Prüfmeldungen, kein Rechenergebnis.
- `readingType` ist ein **optionales technisches Feld**. Falls angegeben, ist derzeit nur `measured` unterstützt; `estimated`, `calculated` oder unbekannt sperren. Die bloße Angabe `measured` ist noch kein Beweis einer echten Ablesung. Bestehende fiktive Testdaten ohne Feld bleiben für Regressionen kompatibel. Vor einer realen Freigabe sind Messwert-Herkunft und Belegführung in der Benutzeroberfläche fachlich zu spezifizieren.
- Optional lässt sich am Gerät `plausibilityLimitMilliPerDay` als **positiver ganzzahliger Orientierungswert** in Tausendsteln der jeweiligen Messwert-Einheit pro Kalendertag mit `plausibilityLimitConfirmed:true` eintragen. Er wird auf jedes Paar aufeinanderfolgender Messungen angewendet; Überschreitungen sperren zur Prüfung. Es gibt **keinen erfundenen allgemeingültigen Standard-Grenzwert**. Ohne individuellen Wert kann die Software einen ungewöhnlich hohen, aber durchgängig steigenden Verbrauch nicht zuverlässig als auffällig erkennen.
- Optionales `registerMaxMilli` bezeichnet den maximal dokumentierten Anzeigewert in Tausendsteln. Werte darüber lösen Prüfbedarf aus; Überläufe werden weiterhin nicht automatisch ermittelt.
- Nullverbrauch kann bei identischen tatsächlich erfassten Werten korrekt null sein, wenn das gesamte Verteilungsmodell einen positiven Gesamtverbrauch hat. Eine fehlende Messung wird niemals in null umgedeutet.

## Bewusst nicht unterstützt

Automatische Schätzung, errechnete Ersatzwerte, Zählerüberlauf, veränderte Messung ohne nachvollziehbare Korrekturhistorie sowie pauschale rechtliche Zulässigkeitsentscheidungen. Die später zu entwickelnde Korrekturfunktion muss Originalwert, belegte Korrektur, Datum, verantwortliche Bestätigung und Dokumentversion nachvollziehbar sichern. Bis dahin bleibt ein als widersprüchlich erkannter Fall gesperrt.

**Nachweisgrenze:** Die implementierte Prüfung stellt ausschließlich formale und rechnerische Konsistenz fest. Ein überschrittener Orientierungswert ist eine Auffälligkeit, keine bewiesene Fehlmessung. Die Software bestätigt weder die Authentizität hochgeladener Belege noch die Zulässigkeit eines Ersatzverfahrens. Heizungs-, Warmwasser- und CO₂-Abrechnungen bleiben separate ausstehende Rechenmodule.

## Prüfung

`npm test` im neuen Projektordner: 102 Tests bestanden, 0 fehlgeschlagen (vorher 87; 15 neue MH-06-Tests). Neuer Regressionstest `tests/meter-quality.test.mjs` deckt positive echte Messungen, zusätzliche Ausreißer/Duplikate, Schätzkennzeichnung, strittige Werte, fehlende Pflichtstände, ungültige Präzision, optionale Grenzwerte, Zählerregister und Nullverbrauch ab. Browser-, CI-, Dokument- und rechtliche Freigabe stehen aus.
