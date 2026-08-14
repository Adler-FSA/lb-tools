# 02 – Entwicklungsentscheidungen: Fehler nicht zweimal machen

Dieses Dokument sichert nicht nur den Endstand, sondern die Erkenntnisse aus dem Weg dorthin.

## 1. Browser-/iFrame-Datenhaltung ist nicht gleich Desktop-Datenhaltung
Ausgangspunkt waren browserbasierte lokale Daten. Tests auf unterschiedlichen Geräten und insbesondere eingebetteten/iFrame-Kontexten zeigten, dass browsergebundene Speicherung für ein dauerhaftes Windows-Produkt nicht die gewünschte Unabhängigkeit bietet.

**Master-Regel:** Eine echte Windows-Desktop-Version erhält einen eigenen Anwendungs-/Datenbereich und darf nicht davon abhängen, dass ein bestimmter Browser seine Website-Daten dauerhaft behält.

## 2. PWA und Windows Desktop sind unterschiedliche Auslieferungsformen
Die PWA-/Offline-Erkenntnisse bleiben wertvoll, ersetzen aber nicht die Desktop-Hülle.

**Master-Regel:** Produktkern möglichst gemeinsam halten; Auslieferungsschichten bewusst trennen.

## 3. Produktkern nicht für Windows duplizieren
Die Desktop-Version soll keine zweite unabhängig weiterentwickelte Kopie des Produkts werden.

**Master-Regel:** Freigegebenen Produktkern beim Build in die Windows-Hülle übernehmen. Desktop-spezifische Anpassungen separat halten.

## 4. Desktop-Texte müssen zur Desktop-Realität passen
Browser-, PWA- oder Website-Texte können in einer installierten Desktop-Anwendung sachlich falsch oder verwirrend sein.

**Master-Regel:** Desktop-spezifische UX-Schicht verwenden und vor Freigabe systematisch nach alten Browser-/PWA-Relikten suchen.

## 5. JSON ist die Master-Sicherung
PDF ist für Menschen lesbar. Excel ist für Kontrolle und Weiterverarbeitung geeignet. Beide bilden aber nicht automatisch den vollständigen internen Datenzustand ab.

**Master-Regel:** Vollständige Wiederherstellung benötigt eine eigenständige Master-Sicherung. Im Referenzprodukt ist dies JSON.

## 6. PDF ist eine Engine, kein Nebenbutton
Die PDF-Ausgabe benötigte mehrere Entwicklungsstufen: Seitenmessung, A4-Packung, Pagination, Dateinamenstabilität, Schutz des PDF-Cores, professionelle Layout-Engine und Belastungstests.

**Master-Regel:** PDF-Core und Layout-/Dokument-Engine als geschützte wiederverwendbare Komponenten behandeln. Änderungen daran nur kontrolliert und mit vollständigem Regressionstest.

## 7. Demo ist Lernsystem und Testinstrument
Die Demo dient nicht nur der Optik. Sie zeigt Nutzern die Verwendung und erzeugt gleichzeitig realistische Datenmengen für Funktions- und PDF-Stresstests.

**Master-Regel:** Jedes geeignete Produkt erhält eine realistische Demo und, wenn nötig, eine separate Stress-Test-Befüllung.

## 8. ZIP + CMD war eine Zwischenlösung
Eine frühere Windows-Auslieferung verlangte ZIP-Download, Entpacken und Start einer `INSTALLIEREN.cmd`.

**Erkenntnis:** technisch machbar, für Laien aber unnötig komplex und fehleranfällig.

**Master-Regel:** Käufer erhalten nach Möglichkeit eine einzelne geführte Setup-Datei. Technische Komplexität bleibt im Buildprozess.

## 9. NSIS-Komfortinstaller ist der Referenzweg
Der finale Referenzweg verwendet eine einzelne Setup-EXE mit geführtem Installer, wählbarem Installationsordner sowie Desktop-/Startmenü-Verknüpfung.

## 10. Codesignatur ist keine Voraussetzung des Produktformats
Beim Referenzprodukt wurde bewusst ohne digitale Herausgebersignatur ausgeliefert. Dadurch kann Windows SmartScreen „Unbekannter Herausgeber“ anzeigen.

**Master-Regel:** Käuferführung muss diesen Fall verständlich erklären. Eine spätere Signierung kann produktspezifisch ergänzt werden, ist aber nicht Voraussetzung des Masters.

## 11. Virenschutz-Prüfungen gehören zur realen Installation
Neue Setup-Dateien können von Sicherheitssoftware zunächst geprüft oder zurückgehalten werden.

**Master-Regel:** Übergabeseite erklärt diesen Vorgang sachlich und fordert nicht zum Abschalten von Schutzsoftware auf.

## 12. Offline muss real getestet werden
„Offline-fähig“ ist keine Designaussage.

**Master-Regel:** Installation abschließen, Anwendung schließen, WLAN/Netzwerk trennen, Anwendung über Desktop/Startmenü neu starten und Kernfunktionen prüfen.

## 13. Datenpersistenz muss real getestet werden
Eingaben müssen nach Schließen und erneutem Start weiterhin vorhanden sein.

**Master-Regel:** Testdaten eingeben → speichern → Anwendung schließen → erneut starten → Daten prüfen.

## 14. Browserdaten-Unabhängigkeit ist ein eigenes Prüfkriterium
Eine Desktop-App darf ihren vorgesehenen Datenbestand nicht verlieren, nur weil Verlauf/Cookies/Websitedaten eines normalen Browsers gelöscht werden.

## 15. Updatefähigkeit gehört zum Produkt
Ein zukünftiges Setup darf bestehende Nutzerdaten nicht unkontrolliert zerstören.

**Master-Regel:** Update über vorhandene Installation mit Testdaten durchführen und danach Datenbestand sowie Kernfunktionen erneut prüfen.

## 16. Käuferbegleitung und Übergabe sind getrennte Produktschichten
Eine Seite erklärt Sinn, Nutzen und Produktverständnis. Die andere führt durch Download und Installation.

**Master-Regel:** Nicht vermischen. Erst verstehen, dann technisch übernehmen.

## 17. Produkt ist erst nach der Auslieferung fertig
Eine funktionierende EXE allein ist kein vollständiges FSA-Produkt.

**Master-Regel:** Fertig bedeutet Software + Engines + Sicherung + Installer + Käuferführung + Produktbild + Shop-/Leistungsbeschreibung + Verkaufskommunikation + Abnahmetest.

## 18. Referenzprodukt schützen
Die fertige Notfallakte wird nicht zum Experimentierfeld für den Master.

**Master-Regel:** Master separat extrahieren. Referenzprodukt unverändert lassen und bei neuen Entwicklungen aus dem Master arbeiten.