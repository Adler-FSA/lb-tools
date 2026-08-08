# Blaupause – LiquidityBooster Produktstandard für lokale Tools

**Status:** Interner Entwicklungsstandard  
**Zweck:** Vor Beginn eines neuen Produkts prüfen und als technische Grundarchitektur verwenden.  
**Geltungsbereich:** Produkte und Werkzeuge unter `tools.liquiditybooster.de`, die persönliche Daten lokal im Browser verwalten.

---

## 1. Grundprinzip

Das Produkt ist keine starre Einmal-Ausgabe. Es ist eine dauerhaft nutzbare Anwendung, die der Nutzer im Laufe der Zeit immer wieder öffnen, ergänzen, korrigieren und aktualisieren kann.

Alle Inhalte müssen deshalb nach dem Speichern erneut bearbeitbar bleiben.

## 2. Hosting und fester Zugangsweg

- Entwicklung im Repository `Adler-FSA/lb-tools`.
- Veröffentlichung unter `tools.liquiditybooster.de`.
- Der Nutzer soll das Produkt dauerhaft über dieselbe Produkt-URL und denselben Browser aufrufen.
- Keine wechselnden GitHub-Pages-, Test- oder alternativen Domains als regulärer Nutzerzugang.
- Für den Alltag wird ein Lesezeichen/Favorit bzw. – wo sinnvoll – ein Home-Screen-Zugang empfohlen.

## 3. Lokale Datenspeicherung

- Nutzerdaten werden per LocalStorage im Browser gespeichert.
- Gespeicherte Daten müssen nach erneutem Öffnen der Anwendung wieder geladen werden.
- Änderungen überschreiben nicht unbemerkt andere Datensätze.
- Jeder relevante Datensatz bleibt bearbeitbar.
- Löschvorgänge benötigen eine bewusste Bestätigung.
- Die Oberfläche muss transparent erklären, dass LocalStorage keine Cloud-Sicherung ist.

## 4. Sicherung und Gerätewechsel

Jedes geeignete Produkt erhält:

- CSV-Export als Sicherungsdatei.
- CSV-Import zur Wiederherstellung bzw. für den Gerätewechsel.
- Klar sichtbare Angabe des letzten Sicherungszeitpunkts, sofern technisch sinnvoll.
- Verständlichen Hinweis, regelmäßig eine externe Sicherung zu erstellen.
- Import darf bestehende Daten nicht unbemerkt zerstören; vor kritischen Importen ist eine Bestätigung bzw. klare Auswahl erforderlich.

Die Sicherungsdatei ist der zentrale Schutz gegen Browserwechsel, Geräteverlust, gelöschte Browserdaten oder einen Gerätewechsel.

## 5. Eingabefelder

- Eingabefelder erhalten verständliche Bezeichnungen.
- Wo hilfreich, enthalten sie Beispiel-/Platzhaltertexte.
- Beispieltexte sind eindeutig als Beispiele erkennbar und werden nicht als echte Nutzerdaten gespeichert.
- Beispiele sollen zeigen, welche Art von Information erwartet wird.

Beispiel:

`Wallet-Bezeichnung`  
Platzhalter: `Beispiel: Tangem – Hauptwallet`

## 6. Sichtbare Aktionsbestätigungen

Jeder Button, der eine Aktion ausführt, gibt eine sichtbare Rückmeldung.

Beispiele:

- `Daten gespeichert ✓`
- `Änderung übernommen ✓`
- `Eintrag gelöscht ✓`
- `Sicherungsdatei erstellt ✓`
- `Sicherung erfolgreich eingelesen ✓`

Die Rückmeldung muss insbesondere auf Smartphone und Tablet eindeutig wahrnehmbar sein. Kritische Aktionen dürfen nicht still im Hintergrund stattfinden.

## 7. Bearbeiten statt Einmal-Abschluss

Lebenssituationen und persönliche Daten verändern sich. Deshalb gilt:

- Kein Datensatz wird technisch endgültig abgeschlossen, wenn eine spätere Änderung sinnvoll sein kann.
- Nutzer können bestehende Angaben öffnen, ändern und erneut speichern.
- Die Bedienoberfläche unterscheidet klar zwischen Neu anlegen, Bearbeiten, Speichern und Löschen.

## 8. Demo-Version

Zu jedem komplexeren Produkt wird eine vollständig ausgefüllte Demo bereitgestellt.

Die Demo:

- verwendet ausschließlich fiktive Daten;
- zeigt den vorgesehenen Endzustand;
- erklärt durch Anschauung, wie Felder sinnvoll ausgefüllt werden;
- ist klar von den persönlichen Echtdaten getrennt;
- darf persönliche Nutzerdaten niemals überschreiben.

## 9. Ersteinrichtung / Geräte- und Browser-Anleitung

Das Produkt erhält eine leicht verständliche Anleitung, bevor der Nutzer mit wichtigen Daten beginnt.

Sie erklärt mindestens:

1. einen normalen Browser-Modus verwenden – keinen privaten/incognito Modus;
2. möglichst einen festen Browser für das Produkt verwenden;
3. immer dieselbe Produkt-URL unter `tools.liquiditybooster.de` benutzen;
4. die Seite als Lesezeichen/Favorit speichern;
5. auf geeigneten Mobilgeräten optional einen Home-Screen-Zugang anlegen;
6. Browserdaten nicht ungeprüft löschen;
7. regelmäßig CSV-Sicherungen erstellen;
8. vor einem Geräte- oder Browserwechsel eine aktuelle Sicherung exportieren;
9. auf dem neuen Gerät die Sicherung importieren und den Datenbestand kontrollieren.

Für verbreitete Browser/Geräte werden konkrete Anleitungen vorgesehen, insbesondere Safari/iPhone/iPad, Firefox und Chrome.

Wichtig: Das Lesezeichen selbst schützt LocalStorage nicht. Entscheidend sind derselbe Browser-/Speicherkontext und die externe Sicherungsdatei.

## 10. Transparenz beim ersten Start

Beim ersten Start muss verständlich erklärt werden:

> Deine Daten werden auf diesem Gerät in deinem Browser gespeichert. Sie werden dadurch nicht automatisch in einer Cloud gesichert. Erstelle deshalb regelmäßig eine Sicherungsdatei.

Wo sinnvoll kann zusätzlich gefragt werden, ob das aktuelle Gerät als Hauptgerät für dieses Produkt verwendet werden soll.

## 11. Mobile Nutzung

Die Produkte werden konsequent für Smartphone und Tablet mitgedacht.

- Touch-Bedienung muss zuverlässig funktionieren.
- Aktionsflächen ausreichend groß.
- Keine Funktionen, die ausschließlich Hover oder Maus voraussetzen.
- Rückmeldungen müssen auch auf kleinen Displays sichtbar sein.
- Formulare müssen auf iPhone/iPad sinnvoll bedienbar bleiben.

## 12. Sicherheitsprinzip

LocalStorage ist Komfortspeicher, keine vollständige Datensicherung und kein geeigneter Ort für ungeschützt gesammelte Hochrisiko-Geheimnisse.

Bei Produkten mit sensiblen Informationen wird vor der Entwicklung festgelegt, welche Daten überhaupt lokal gespeichert werden dürfen. Seed Phrases, Private Keys, Banking-Passwörter, TAN-Zugänge oder vergleichbare Generalschlüssel dürfen nicht allein aus Bequemlichkeit gemeinsam und ungeschützt gesammelt werden.

## 13. Produktstart-Checkliste

Vor dem Bau eines neuen Produkts prüfen:

- [ ] Fester Produktpfad unter `tools.liquiditybooster.de` definiert
- [ ] LocalStorage-Datenmodell definiert
- [ ] Alle gespeicherten Inhalte wieder bearbeitbar
- [ ] CSV-Export vorgesehen
- [ ] CSV-Import vorgesehen
- [ ] Import-/Löschschutz definiert
- [ ] Sichtbare Rückmeldung für jeden Aktionsbutton
- [ ] Beispieltexte/Platzhalter für Eingabefelder
- [ ] Vollständig ausgefüllte Demo geplant
- [ ] Demo und Echtdaten sauber getrennt
- [ ] Ersteinrichtungs-Anleitung vorhanden
- [ ] Browser-/Gerätehinweise vorhanden
- [ ] Backup-Hinweis vorhanden
- [ ] Smartphone/iPad getestet
- [ ] Sicherheitsprüfung sensibler Felder durchgeführt

---

## Leitgedanke

**Ein neues Produkt soll nicht bei null beginnen. Diese Blaupause ist vor Entwicklungsbeginn aufzurufen und bildet den gemeinsamen technischen Grundstandard. Produktspezifische Anforderungen kommen darauf aufbauend hinzu.**
