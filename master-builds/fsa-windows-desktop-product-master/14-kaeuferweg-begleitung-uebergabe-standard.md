# 14 – Käuferweg: Begleitseite und Produktübergabe als fester Master-Standard

## Referenz
Der Standard wurde aus den finalen Käuferseiten des Referenzprodukts abgeleitet:
- `pages/notfallakte-desktop-download/begleitung.html`
- `pages/notfallakte-desktop-download/index.html`

Diese beiden Seiten erfüllen unterschiedliche Aufgaben und werden deshalb im Master nicht zu einer einzigen Seite zusammengezogen.

## 1. Zwei-Stufen-Prinzip
### Stufe A – Begleitseite
Aufgabe: Sinn, Nutzen, Einordnung und verantwortungsvolle Nutzung erklären.

### Stufe B – Produktübergabe
Aufgabe: Datei ausliefern und den Käufer technisch sicher durch Download, Installation, ersten Start und Sicherung führen.

Verbindliche Navigation:
- Begleitseite → klare CTA zur Produktübergabe
- Produktübergabe → Rücklink zur Einführung/Begleitseite

## 2. Begleitseite – feste Bausteine
Die Referenz zeigt folgenden sinnvollen Aufbau:
1. Produktbild als erster visueller Einstieg
2. Vorwort/Sinn und Nutzen
3. konkrete Situationen bzw. Anwendungsfälle
4. Einordnung des Produkts und seiner Grenzen
5. erklärende Inhaltsbereiche/Klappreiter
6. Datenschutz-/Offline-/Sicherungsprinzip
7. niedrigschwelliger Einstieg: nicht alles an einem Tag
8. klare CTA zur Produktübergabe
9. emotionaler, aber sachlich passender Abschluss

## 3. Produktbild als Start
Wenn ein Shop-/Produktbild den tatsächlichen ersten Blick auf das Produkt zeigt, kann es als oberster Einstieg verwendet werden. Ein zusätzlicher Hero-Banner mit nahezu identischem Text soll vermieden werden.

Master-Regel: Keine doppelte Botschaft nur aus Layoutgewohnheit.

## 4. Produktübergabe – feste Bausteine
1. klare Produktbezeichnung
2. kurzer Willkommen-/Orientierungstext
3. Rücklink zur Begleitseite
4. eindeutiger Downloadbereich mit tatsächlichem Setup-Dateinamen
5. Erklärung, was installiert/eingerichtet wird
6. nummerierte Installationsschritte
7. Windows-Sicherheits-/SmartScreen-Hinweis, wenn relevant
8. Virenschutz-Hinweis ohne Umgehungsversprechen
9. erster Start
10. Sicherungsroutine/JSON-Master-Sicherung
11. FAQ/Klappreiter
12. lokales Daten-/Offline-Prinzip
13. abschließender Sicherheits-/Nutzungshinweis

## 5. Download darf nicht allein stehen
Eine `.exe` ist keine vollständige Produktübergabe. Der Käufer muss wissen:
- welche Datei er herunterlädt
- wie sie gestartet wird
- welche Windows-Hinweise auftreten können
- welche Installationsoption gewählt werden soll
- wie das Produkt danach gestartet wird
- wie persönliche Daten gesichert werden

## 6. Technische Aussagen müssen zum tatsächlichen Build passen
Vor Freigabe prüfen:
- Setup-Dateiname
- Windows-Versionen
- Installer-Ablauf
- Desktop-Verknüpfung
- Startmenü-Verknüpfung
- Installationsmodus
- Offline-Fähigkeit
- Datenspeicherung
- Sicherungsformat
- Signatur-/Herausgeberstatus

Keine alte Web-/PWA-/Browser-Formulierung in eine Desktop-Übergabe übernehmen.

## 7. SmartScreen und Signatur
Wenn ein Setup nicht digital signiert ist, darf die Käuferseite das nicht verschleiern. Sie kann sachlich erklären, welche Windows-Abfrage auftreten kann und wie der tatsächlich getestete Installationsweg aussieht.

Wenn ein zukünftiges Produkt signiert wird, muss dieser Abschnitt angepasst werden. Er ist kein unveränderlicher Standardtext.

## 8. Sicherheit
Die Käuferseite soll nicht behaupten, lokale Speicherung sei automatisch eine externe Sicherung. JSON-Master-Sicherung bleibt getrennt zu erklären.

Bei sensiblen Produkten zusätzlich:
- Gerätesperre empfehlen
- System aktuell halten
- externe Sicherung an selbst kontrolliertem Ort
- keine hochsensiblen Geheimnisse ungeschützt in allgemeine Dokumente schreiben

## 9. Produktgrenzen
Bei Produkten mit rechtlichen, finanziellen, medizinischen oder anderen fachlichen Grenzen muss die Begleitseite klar einordnen, was das Produkt leistet und was es nicht ersetzt.

Diese Texte sind produktspezifisch und dürfen nicht blind aus dem Referenzprodukt übernommen werden.

## 10. Shop → Begleitung → Übergabe → Produkt
Der ideale Käuferweg ist:

**Shop/Verkauf → Begleit-/Einführungsseite → Produktübergabe/Installation → installierte Anwendung → Demo/Onboarding → eigene Nutzung → Master-Sicherung.**

Der Shop verkauft Nutzen. Die Begleitseite schafft Verständnis. Die Übergabeseite schafft technische Sicherheit. Das Produkt erfüllt anschließend die Leistung.

## 11. Release-Abnahme Käuferweg
Vor Freigabe mit einem frischen Testgerät/-profil prüfen:
- Shop-/Käuferlink öffnet richtige Seite
- Produktbild lädt
- CTA führt zur richtigen Übergabe
- Rücklink funktioniert
- Setup-Link lädt exakt das freigegebene Setup
- Installationsschritte stimmen mit Installer überein
- Anwendung startet
- Offline-Test funktioniert
- Sicherungshinweise stimmen mit Produkt überein

## 12. Template-Regel
Die HTML-Mastervorlagen übernehmen Struktur, responsive Grundlayout, Inline-SVG-Prinzip und Platzhalter. Inhalte, Rechtshinweise, Produktbild, Downloadname und produktspezifische Texte werden für jedes Produkt bewusst eingesetzt.

Die Referenzseiten bleiben unverändert.