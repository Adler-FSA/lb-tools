# 12 – Referenz einfrieren, Entwicklungsklon, Rollback und Release

## Zweck
Dieser Prozess konserviert eine der wichtigsten Erkenntnisse aus der Entwicklung des Referenzprodukts: Ein funktionierender Stand darf nicht während einer größeren technischen Weiterentwicklung zum Versuchsfeld werden.

Der Master trennt deshalb verbindlich:
1. freigegebenes Referenzprodukt,
2. Entwicklungsklon,
3. geschützte technische Referenzstände,
4. Release-Kandidat,
5. freigegebenes Release.

---

## 1. Referenzprodukt einfrieren
Sobald ein Produkt einen nachweislich funktionierenden Stand erreicht hat, wird dieser Stand eingefroren.

Dokumentieren:
- Produktname
- Version
- Commit SHA
- Datum
- funktionierende Kernbereiche
- bekannte Einschränkungen
- zugehörige Setup-Datei, falls vorhanden
- Abnahmestatus

Ab diesem Zeitpunkt werden größere Umbauten nicht direkt im eingefrorenen Referenzstand durchgeführt.

## 2. Entwicklungsklon erzeugen
Für größere Änderungen wird ein isolierter Klon/Arbeitszweig erzeugt.

Beispiele für Änderungen, die einen Klon verlangen:
- neue PDF-Engine
- neue Pagination
- Offline-/PWA-Umbau
- Desktop-/Electron-Verpackung
- Änderung der Datenarchitektur
- Import-/Export-Umbau
- größere UI-/Navigationsänderungen
- Versionsmigration

Der Klon muss zu Beginn fachlich und technisch dem freigegebenen Ausgangsstand entsprechen.

## 3. Klon zuerst verifizieren
Bevor im Klon weiterentwickelt wird:
- Start testen
- Navigation testen
- Demo testen
- persönliche Daten mit Testdaten prüfen
- JSON prüfen
- Excel prüfen, falls vorhanden
- PDF prüfen, falls vorhanden
- relevante Kernfunktionen prüfen

Erst wenn der Klon den Ausgangsstand reproduziert, beginnt die neue Entwicklung.

## 4. Referenz niemals als Testfläche verwenden
Während der Klonentwicklung gilt:
- Referenzprodukt nicht „nebenbei“ anpassen
- keine experimentellen Scripts in den Referenzstand einbauen
- keine Cache-/Versionsänderungen am Referenzprodukt nur zum Testen
- keine unfertigen Käufertexte veröffentlichen

Wenn eine Erkenntnis später allgemein gültig ist, wird sie kontrolliert übernommen oder im Master konserviert.

## 5. Canonical-/Schutzstände
Bei besonders kritischen Engines können zusätzlich geschützte technische Referenzdateien bestehen.

Beispiele:
- PDF-Core
- Pagination
- Datenmigration
- Importengine

Ein Canonical-Stand ist ein bewusst gesicherter bekannter Zustand. Der Dateiname allein beweist jedoch nicht, dass er die aktuell aktive Runtime-Version ist.

Deshalb immer dokumentieren:
- Kennung/Version
- welche Runtime-Datei ihn verwendet
- welche Renderer-/Engine-Version dazugehört
- warum der Stand geschützt wurde

## 6. Script-Wiring dokumentieren
Bei modularen Produkten muss für jeden Release-Kandidaten nachvollziehbar sein:
- welche Scripts geladen werden
- in welcher Reihenfolge
- welche Version/Kennung erwartet wird
- welche Datei welche globale Schnittstelle bereitstellt

Besonders bei PDF, Daten- und Importengines verhindert dies Mischstände aus alten und neuen Dateien.

## 7. Cache-/Altstand-Prüfung
Bei Web-/PWA-Entwicklungsstufen muss geprüft werden, ob ein beobachteter Fehler tatsächlich aus dem aktuellen Code stammt oder ein alter Cache-/Service-Worker-Stand aktiv ist.

Vor destruktiven Codeänderungen:
1. aktuellen Commit verifizieren
2. geladene Scriptversion/Kennung prüfen
3. Cache-/Service-Worker-Einfluss prüfen
4. erst danach Code verändern

Für die installierte Windows-Desktop-App gilt zusätzlich: Produktversion und tatsächlich installierter Setup-Stand müssen eindeutig zuordenbar sein.

## 8. Reparaturhistorie erhalten
Fehlversuche und Reparaturwege dürfen nicht unkontrolliert aus dem Wissensbestand verschwinden.

Für relevante Fehler dokumentieren:
- Symptom
- betroffene Version
- Ursache, soweit geklärt
- nicht erfolgreiche Ansätze
- erfolgreiche Lösung
- Regressionstest

Alte Reparaturworkflows dürfen als inaktive Referenz erhalten bleiben, wenn sie wichtige Entwicklungskenntnisse konservieren. Sie dürfen aber nicht versehentlich parallel zum aktiven Releaseprozess laufen.

## 9. Rollback-Auslöser
Rollback prüfen, wenn:
- Kernfunktion nach Änderung bricht
- PDF unvollständig/fehlerhaft wird
- Nutzerdaten gefährdet sind
- Restore nicht zuverlässig funktioniert
- Update Daten verliert
- Build zwar erfolgreich ist, installierte App aber nicht
- mehrere Reparaturen neue Folgefehler erzeugen
- Ursache eines Fehlers nicht mehr sauber isolierbar ist

## 10. Rollback-Verfahren
1. Entwicklung stoppen.
2. letzten nachweislich funktionierenden Commit bestimmen.
3. Testdaten/Fehlerbild dokumentieren.
4. betroffene neue Änderungen isolieren.
5. geschützten Stand in einem sauberen Arbeitszweig wiederherstellen.
6. Grundtests durchführen.
7. neue Änderung anschließend einzeln erneut aufbauen.

Nicht versuchen, einen instabil gewordenen Stand endlos durch weitere Patches zu retten, wenn ein sauberer bekannter Ausgangspunkt existiert.

## 11. Release-Kandidat
Ein Entwicklungsklon wird erst zum Release-Kandidaten, wenn:
- neue Funktion fachlich fertig
- keine bekannten kritischen Fehler
- Datenpersistenz bestanden
- Backup/Restore bestanden
- relevante Exporte bestanden
- Stress-Test bestanden
- Windows-Build bestanden
- Installation bestanden
- Offline-Test bestanden
- Update-Test bestanden

Danach vollständige `04-abnahme-testmatrix.md` ausführen.

## 12. Release-Manifest
Jedes freigegebene Windows-Produkt erhält künftig ein Release-Manifest mit mindestens:
- Produktname
- Produktversion
- Release-Datum
- Commit SHA Produktkern
- Commit SHA Desktop-/Buildstand
- Setup-Dateiname
- App-ID
- userData-Verzeichnis
- Backup-Schema-Version
- PDF-Engine-Version
- Excel-Engine-Version, falls vorhanden
- Windows-Testsystem
- Offline-Testdatum
- Update-Test von Version → Version
- Käufer-Begleitseite
- Käufer-Übergabeseite
- bekannte Einschränkungen
- Freigabestatus

## 13. Freigabe
Erst nach erfolgreicher Gesamtabnahme:
- Release-Manifest finalisieren
- Commit/Tag oder sonstigen unveränderlichen Referenzpunkt festhalten
- Setup-Datei zuordnen
- Käuferdownload prüfen
- Käuferseiten prüfen
- Release als freigegeben markieren

## 14. Nach Release
Nach Freigabe keine stillen Änderungen.

Jede Änderung ist entweder:
- reine dokumentierte Inhaltskorrektur ohne technische Auswirkung,
- Patch-Version,
- Minor-Version,
- Major-Version.

Bei Änderungen mit Einfluss auf Daten, PDF, Import/Export, Installer oder Offline-Funktion sind die betroffenen Tests erneut auszuführen.

## 15. Master-Rückführung
Nach jedem abgeschlossenen Folgeprodukt wird geprüft, welche neue Erkenntnis allgemein gültig ist.

Nur getestete allgemeine Erkenntnisse werden in den Master übernommen. Produktspezifische Sonderlösungen bleiben beim Produkt.

---

# Verbindlicher Kurzablauf

**Funktionierenden Stand einfrieren → Klon erzeugen → Klon gegen Ausgangsstand testen → nur im Klon entwickeln → kritische Engines versionieren → Release-Kandidat vollständig testen → Manifest erstellen → Release freigeben → Referenz erneut einfrieren → allgemeine Erkenntnisse in Master zurückführen.**
