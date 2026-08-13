# 09 – Offline-/Local-First-Zielarchitektur

## Ziel

Künftige persönliche Softwarelösungen sollen möglichst auch als installierbare lokale Anwendung nutzbar werden.

## Prinzip

- Anwendung auf dem eigenen Gerät installierbar
- nach Installation ohne Internet nutzbar
- persönliche Inhalte bleiben primär auf dem Gerät
- JSON bleibt portables Wiederherstellungsformat
- Excel- und PDF-Erzeugung funktionieren lokal
- Updates der Anwendung bleiben von den persönlichen Inhalten getrennt

## Technische Richtung

Die bestehende HTML/CSS/JavaScript-Struktur kann dafür als Progressive Web App weiterentwickelt werden.

Erforderliche Bausteine:
- Manifest
- Service Worker
- definierter Offline-App-Shell-Cache
- lokale Datenhaltung
- klare Update-Strategie
- weiterhin externer JSON-Export

## Wichtig

Offline bedeutet nicht automatisch dauerhafte Sicherung. Auch eine installierte Anwendung benötigt weiterhin eine bewusst erzeugte externe Masterdatei.

## Vorteil

Das Softwareprodukt wird unabhängiger vom Browseraufruf und kann sich auf iPad, Smartphone, Windows und Mac stärker wie eine eigenständige Anwendung verhalten.