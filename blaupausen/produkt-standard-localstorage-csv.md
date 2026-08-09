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
- Nach dem Kauf erhält der Nutzer die echte direkte Produkt-URL außerhalb des Clubhauses, z. B. in der Kaufbestätigung.
- Diese direkte Produkt-URL wird einmal im normalen Browser geöffnet und als Lesezeichen/Favorit bzw. – wo sinnvoll – auf dem Home-Bildschirm gespeichert.
- Der Nutzer soll das Produkt anschließend dauerhaft über genau diesen gespeicherten Zugang und möglichst denselben Browser aufrufen.
- Keine wechselnden GitHub-Pages-, Test-, iFrame- oder alternativen Domains als regulärer Nutzerzugang.

Leitsatz für Nutzer: **Dein gespeicherter Favorit ist dein fester Zugang zum Produkt – deine Master-Sicherungsdatei ist deine dauerhafte Sicherung.**

## 3. Lokale Datenspeicherung

- Nutzerdaten werden lokal im Browser gespeichert; je nach Produkt über LocalStorage und/oder IndexedDB.
- Gespeicherte Daten müssen nach erneutem Öffnen der Anwendung wieder geladen werden.
- Änderungen überschreiben nicht unbemerkt andere Datensätze.
- Jeder relevante Datensatz bleibt bearbeitbar.
- Löschvorgänge benötigen eine bewusste Bestätigung.
- Die Oberfläche muss transparent erklären, dass Browser-Speicher keine Cloud-Sicherung ist.

## 4. Sicherung und Gerätewechsel

Für komplexe Produkte gilt folgende Architektur:

**Eingaben → LocalStorage/IndexedDB für sofortiges Arbeiten → JSON als vollständige Master-Sicherung → PDF als lesbare Endfassung.**

Zusätzlich:

- JSON-Export sichert den kompletten Zustand des Produkts.
- JSON-Import stellt diesen Zustand 1:1 wieder her.
- CSV bleibt dort sinnvoll, wo echte tabellarische Daten vorliegen.
- Excel `.xlsx` kann als übersichtliche Arbeits- und Kontrollansicht aus den vorhandenen Eingaben erzeugt werden.
- Klar sichtbare Angabe des letzten Master-Sicherungszeitpunkts, sofern technisch sinnvoll.
- Nach Änderungen muss erkennbar sein, dass seit der letzten Master-Sicherung neue oder geänderte Daten vorliegen.
- Import darf bestehende Daten nicht unbemerkt zerstören; vor kritischen Importen ist eine Bestätigung bzw. klare Auswahl erforderlich.

Die externe Master-Sicherungsdatei ist der zentrale Schutz gegen Browserwechsel, Geräteverlust oder gelöschte Browserdaten.

## 5. Sicherungsordner für den Nutzer

Die Anwendung erklärt den Sicherungsvorgang ohne technisches Vorwissen:

1. Einen geschützten Ordner anlegen, z. B. `Meine Notfallakte – Sicherungen`.
2. `Vollständige Sicherung erstellen` wählen.
3. Die erzeugte JSON-Datei in diesem Ordner ablegen.
4. Nach wichtigen Änderungen eine neue Sicherung erstellen.
5. Bei Bedarf über `Sicherung wiederherstellen` die letzte JSON-Datei wieder einlesen.

Sicherungsdateien mit sensiblen Informationen sind wie das Originaldokument selbst zu schützen.

## 6. Verbindlicher Dateinamen-Standard

Jede erzeugte Datei erhält einen verständlichen und eindeutigen Namen. Keine UUID-, Zahlen- oder kryptischen Browsernamen als vorgesehener Produktstandard.

Beispiele:

`Notfallakte-Daniel-Muster-Sicherung-2026-08-09-1242.json`  
`Notfallakte-Daniel-Muster-Uebersicht-2026-08-09-1242.xlsx`  
`Notfallakte-Daniel-Muster-2026-08-09.pdf`

Demo-Dateien beginnen mit `DEMO-`.

Datum und Uhrzeit werden bei Sicherungs- und Arbeitsdateien verwendet, damit mehrere Versionen desselben Tages eindeutig unterscheidbar bleiben.

## 7. Verbindlicher Download-/Dateiübergabe-Standard für iPad und iPhone

Auf iPad/iPhone darf bei erzeugten JSON-, Excel- oder vergleichbaren Dateien nicht ausschließlich auf einen normalen Blob-Download vertraut werden. iOS/WebKit kann dabei eigene kryptische Dateinamen vergeben.

Deshalb gilt für FSA-/LiquidityBooster-Tools:

- Die erzeugte Datei wird als echte `File` mit dem vollständigen vorgesehenen Dateinamen vorbereitet.
- Auf iPad/iPhone wird – sofern vom Browser unterstützt – das native Teilen-Menü über die Web Share API mit `files` verwendet.
- Der Nutzer erhält den klaren Hinweis: **`In Dateien sichern` wählen.**
- Dadurch kann der vorgesehene Dateiname beim Speichern erhalten bleiben.
- Vor Öffnung des Teilen-Menüs erfolgt eine sichtbare Rückmeldung, z. B. `Datei ist vorbereitet – wähle im Teilen-Menü „In Dateien sichern“ ✓`.
- Auf Desktop und Browsern, bei denen der direkte Download zuverlässig funktioniert, bleibt der normale Download mit vorgegebenem Dateinamen bestehen.
- Ist das Teilen von Dateien technisch nicht verfügbar, muss ein sauberer Fallback vorhanden sein.

Dieser Ablauf ist auf iPad/iPhone als fester Testfall vor Freigabe eines Produkts zu prüfen.

## 8. Eingabefelder

- Eingabefelder erhalten verständliche Bezeichnungen.
- Wo hilfreich, enthalten sie Beispiel-/Platzhaltertexte.
- Beispieltexte sind eindeutig als Beispiele erkennbar und werden nicht als echte Nutzerdaten gespeichert.
- Beispiele sollen zeigen, welche Art von Information erwartet wird.

Beispiel:

`Wallet-Bezeichnung`  
Platzhalter: `Beispiel: Tangem – Hauptwallet`

## 9. Sichtbare Aktionsbestätigungen

Jeder Button, der eine Aktion ausführt, gibt eine sichtbare Rückmeldung.

Beispiele:

- `Daten gespeichert ✓`
- `Änderung übernommen ✓`
- `Eintrag gelöscht ✓`
- `Sicherungsdatei erstellt ✓`
- `Excel-Datei erstellt ✓`
- `Sicherung erfolgreich eingelesen ✓`
- `Datei ist vorbereitet – wähle im Teilen-Menü „In Dateien sichern“ ✓`

Die Rückmeldung muss insbesondere auf Smartphone und Tablet eindeutig wahrnehmbar sein. Kritische Aktionen und Dateiaktionen dürfen nicht still im Hintergrund stattfinden.

## 10. Bearbeiten statt Einmal-Abschluss

Lebenssituationen und persönliche Daten verändern sich. Deshalb gilt:

- Kein Datensatz wird technisch endgültig abgeschlossen, wenn eine spätere Änderung sinnvoll sein kann.
- Nutzer können bestehende Angaben öffnen, ändern und erneut speichern.
- Die Bedienoberfläche unterscheidet klar zwischen Neu anlegen, Bearbeiten, Speichern und Löschen.

## 11. Demo-Version

Zu jedem komplexeren Produkt wird eine vollständig ausgefüllte Demo bereitgestellt.

Die Demo:

- verwendet ausschließlich fiktive Daten;
- zeigt den vorgesehenen Endzustand;
- erklärt durch Anschauung, wie Felder sinnvoll ausgefüllt werden;
- ist klar von den persönlichen Echtdaten getrennt;
- darf persönliche Nutzerdaten niemals überschreiben;
- muss auch die vorgesehenen Exportfunktionen testbar machen;
- erzeugt Demo-Dateien eindeutig mit dem Präfix `DEMO-`.

## 12. Ersteinrichtung / Geräte- und Browser-Anleitung

Das Produkt erhält eine leicht verständliche Anleitung, bevor der Nutzer mit wichtigen Daten beginnt.

Sie erklärt mindestens:

1. die direkte Produkt-URL aus der Kaufbestätigung im normalen Browser öffnen;
2. keinen privaten/incognito Modus verwenden;
3. möglichst einen festen Browser für das Produkt verwenden;
4. immer dieselbe direkte Produkt-URL unter `tools.liquiditybooster.de` benutzen;
5. diese Seite als Lesezeichen/Favorit speichern;
6. auf geeigneten Mobilgeräten optional einen Home-Screen-Zugang anlegen;
7. Browserdaten nicht ungeprüft löschen;
8. regelmäßig vollständige JSON-Master-Sicherungen erstellen;
9. vor einem Geräte- oder Browserwechsel eine aktuelle Master-Sicherung exportieren;
10. auf dem neuen Gerät die Sicherung importieren und den Datenbestand kontrollieren.

Für verbreitete Browser/Geräte werden konkrete Anleitungen vorgesehen, insbesondere Safari/iPhone/iPad, Firefox und Chrome.

Wichtig: Das Lesezeichen selbst schützt Browserdaten nicht. Entscheidend sind derselbe Browser-/Speicherkontext und die externe Master-Sicherungsdatei.

## 13. Transparenz beim ersten Start

Beim ersten Start muss verständlich erklärt werden:

> Deine Daten werden auf diesem Gerät in deinem Browser gespeichert. Sie werden dadurch nicht automatisch in einer Cloud gesichert. Erstelle deshalb regelmäßig eine vollständige Sicherungsdatei.

Wo sinnvoll kann zusätzlich gefragt werden, ob das aktuelle Gerät als Hauptgerät für dieses Produkt verwendet werden soll.

## 14. Mobile Nutzung

Die Produkte werden konsequent für Smartphone und Tablet mitgedacht.

- Touch-Bedienung muss zuverlässig funktionieren.
- Aktionsflächen ausreichend groß.
- Keine Funktionen, die ausschließlich Hover oder Maus voraussetzen.
- Rückmeldungen müssen auch auf kleinen Displays sichtbar sein.
- Formulare müssen auf iPhone/iPad sinnvoll bedienbar bleiben.
- Datei-Export und Datei-Wiederherstellung werden ausdrücklich auf iPad/iPhone getestet.

## 15. Sicherheitsprinzip

Browser-Speicher ist Komfortspeicher, keine vollständige Datensicherung und kein geeigneter Ort für ungeschützt gesammelte Hochrisiko-Geheimnisse.

Bei Produkten mit sensiblen Informationen wird vor der Entwicklung festgelegt, welche Daten überhaupt lokal gespeichert werden dürfen. Seed Phrases, Private Keys, Banking-Passwörter, TAN-Zugänge oder vergleichbare Generalschlüssel dürfen nicht allein aus Bequemlichkeit gemeinsam und ungeschützt gesammelt werden.

JSON-, Excel-, CSV- und PDF-Dateien können hochsensible Informationen enthalten und müssen entsprechend geschützt aufbewahrt werden.

## 16. Produktstart-Checkliste

Vor dem Bau eines neuen Produkts prüfen:

- [ ] Fester Produktpfad unter `tools.liquiditybooster.de` definiert
- [ ] Direkter Produktzugang außerhalb des Clubhaus-iFrames vorgesehen
- [ ] LocalStorage-/IndexedDB-Datenmodell definiert
- [ ] Alle gespeicherten Inhalte wieder bearbeitbar
- [ ] JSON-Master-Export vorgesehen
- [ ] JSON-Wiederherstellung 1:1 vorgesehen
- [ ] CSV nur dort vorgesehen, wo tabellarisch sinnvoll
- [ ] Excel-Ausgabe geprüft, sofern für das Produkt sinnvoll
- [ ] PDF-Endfassung geprüft, sofern erforderlich
- [ ] Import-/Löschschutz definiert
- [ ] Sichtbare Rückmeldung für jeden Aktionsbutton
- [ ] Saubere Dateinamen mit Produkt, Person, Typ, Datum/Uhrzeit
- [ ] iPad/iPhone-Dateiübergabe über `File` + Teilen-Menü geprüft
- [ ] Hinweis `In Dateien sichern` vorhanden
- [ ] Desktop-Download-Fallback vorhanden
- [ ] Beispieltexte/Platzhalter für Eingabefelder
- [ ] Vollständig ausgefüllte Demo geplant
- [ ] Demo und Echtdaten sauber getrennt
- [ ] Demo-Exporte mit `DEMO-` gekennzeichnet
- [ ] Ersteinrichtungs-Anleitung vorhanden
- [ ] Browser-/Gerätehinweise vorhanden
- [ ] Master-Backup-Hinweis vorhanden
- [ ] Smartphone/iPad getestet
- [ ] Sicherheitsprüfung sensibler Felder durchgeführt

---

## Leitgedanke

**Ein neues Produkt soll nicht bei null beginnen. Diese Blaupause ist vor Entwicklungsbeginn aufzurufen und bildet den gemeinsamen technischen Grundstandard. Produktspezifische Anforderungen kommen darauf aufbauend hinzu.**
