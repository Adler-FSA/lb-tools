/** Gemeinsame Lernreise für Demo-Haus und Bedienungsanleitung. */
export const DEMO_LEARNING_STEPS=[
  {
    title:'Willkommen im Demo-Haus',
    short:'Orientierung',
    url:'index.html?demo=1',
    copy:'Du schaust dir ein vollständig eingerichtetes Mehrfamilienhaus an. Eine Wohnung wird selbst genutzt, zwei Wohnungen sind vermietet. Alle Personen, Adressen und Belege sind frei erfunden.',
    why:'Du kannst das gesamte System ansehen und verändern, ohne eigene Immobilien- oder Mieterdaten zu benötigen.',
    facts:['3 Wohnungen · insgesamt 235 m²','2 abgeschlossene Abrechnungsjahre','2025 mit echtem Mieterwechsel in Wohnung B']
  },
  {
    title:'Das Gebäude und seine Wohnungen',
    short:'Immobilie',
    url:'immobilien.html?demo=1',
    copy:'Eine Immobilie wird einmal als Grundlage angelegt. Darunter liegen die einzelnen Wohnungen mit ihrer Fläche und ihrer Nutzung.',
    why:'Kosten können später nur sauber verteilt werden, wenn klar ist, welche Einheiten zum Haus gehören und welche Fläche zu welchem Zeitraum galt.',
    facts:['EG · 95 m² · Eigennutzung','Wohnung A · 75 m² · vermietet','Wohnung B · 65 m² · vermietet']
  },
  {
    title:'Wer wohnt wo – und wann?',
    short:'Nutzung & Mieterwechsel',
    url:'immobilien.html?demo=1',
    copy:'Wohnung B wechselt zum 1. Juli 2026 den Mieter. Der alte Zeitraum bleibt erhalten; der neue Nutzer überschreibt ihn nicht.',
    why:'Eine Jahresabrechnung muss Kosten dem richtigen Nutzerzeitraum zuordnen. Genau deshalb arbeitet das System mit Historien statt nur mit einem aktuellen Namen.',
    facts:['Jonas Schneider · bis 30.06.2026','Nina Vogel · ab 01.07.2026','Familie Berger · ganzjährig in Wohnung A']
  },
  {
    title:'Rechnungen und Zahlungen',
    short:'Kosten & Belege',
    url:'kosten.html?demo=1',
    copy:'Hier liegen die tatsächlichen Jahreskosten. Rechnung, mögliche Umlage und die Zahlung an einen Anbieter bleiben getrennte Informationen.',
    why:'Eine bezahlte Rechnung ist nicht automatisch umlagefähig – und eine Versorgerzahlung ist nicht dasselbe wie die Kostenposition selbst.',
    facts:['2026 · 6.950,00 € Gesamtkosten','Grundsteuer, Versicherung, Müll, Allgemeinstrom und Kaltwasser','Reparatur bleibt als Eigentümerkosten getrennt']
  },
  {
    title:'Zähler und Zwischenablesung',
    short:'Verbrauch',
    url:'verbrauch.html?demo=1',
    copy:'Für Kaltwasser besitzt jede Wohnung einen eigenen Zähler. In Wohnung B gibt es zusätzlich eine Ablesung genau zum Mieterwechsel am 1. Juli.',
    why:'Bei einem Nutzerwechsel darf Verbrauch nicht einfach halbiert oder geschätzt werden. Die dokumentierte Zwischenablesung trennt die beiden Nutzer sachlich.',
    facts:['3 Kaltwasserzähler','2026: Anfangs- und Endstände vollständig','Wohnung B: zusätzliche Zwischenablesung am 01.07.2026']
  },
  {
    title:'Was kostet das Haus wirklich?',
    short:'Eigentümer-Sicht',
    url:'abrechnung-eigentuemer.html?demo=1',
    copy:'Die Eigentümerübersicht zeigt Kosten des Hauses, Eigentümeranteil, Mieteranteile und dokumentierte Zahlungen getrennt voneinander.',
    why:'Als Eigentümer brauchst du zuerst das Gesamtbild. Erst danach ist sinnvoll zu beurteilen, welcher Anteil überhaupt bei Mietern landet.',
    facts:['2025 · 7.500,00 € Gesamtkosten','2026 · 6.950,00 € Gesamtkosten','2026 · Eigentümeranteil 3.355,35 € · Mieteranteile 3.594,65 €']
  },
  {
    title:'Was entfällt auf welchen Mieter?',
    short:'Vermieter-Abrechnung',
    url:'abrechnung-vermieter.html?demo=1',
    copy:'Jetzt wird aus den bestätigten Kosten, Nutzungszeiten, Zählerständen und tatsächlich eingegangenen Vorauszahlungen die individuelle technische Abrechnung.',
    why:'Die Mieter sollen nur ihren eigenen Zeitraum und ihren eigenen Anteil sehen. Der Mieterwechsel in Wohnung B ist deshalb ein wichtiger Praxistest.',
    facts:['Familie Berger · Kostenanteil 1.890,20 €','Jonas Schneider · Kostenanteil 829,25 €','Nina Vogel · Kostenanteil 875,20 €']
  },
  {
    title:'Mietvertrag, Hausordnung und Übergabe',
    short:'Mietservice',
    url:'mietservice.html?demo=1',
    copy:'Zum Vermieten gehören mehr als Zahlen. Im Demo-Haus liegen bereits Entwürfe für Mietvertrag, Hausordnung, Entsorgungsinformation, Übergabeprotokoll und Mieter-Serviceblatt.',
    why:'Dokumente sollen aus demselben Immobilienkontext entstehen. Rechtliche oder fachliche Prüfhinweise gehören dabei separat zur Arbeitsoberfläche – nicht ungefragt in das eigentliche Vertragsdokument.',
    facts:['Mietvertragsentwurf für Familie Berger','Übergabeprotokoll zum Einzug von Nina Vogel','Hausordnung und Entsorgungsinformation vorbereitet'],
    extraUrl:'../vertraege/club-marktplatz-vertragswerkstatt.html',
    extraLabel:'Vertragswerkstatt separat öffnen'
  },
  {
    title:'Was sollte ein Eigentümer prüfen?',
    short:'Sicherheit & Pflichten',
    url:'schutzcheck.html?demo=1',
    copy:'Versicherung, Finanzierung, Energieausweis, Wartungen und örtliche Anforderungen werden nicht in einen Topf geworfen. Jeder Punkt erhält seine eigene Einordnung und Wiedervorlage.',
    why:'Nicht alles ist automatisch eine gesetzliche Pflicht. Das System soll offenlassen, was geprüft werden muss, statt pauschal eine Rechtsentscheidung vorzugeben.',
    facts:['9 vorbereitete Prüfpunkte','keine automatische Rechtsklassifizierung','offene Wiedervorlagen bleiben sichtbar']
  },
  {
    title:'Datensparsam vermieten',
    short:'Vermietungsprozess',
    url:'vermietungscheck.html?demo=1',
    copy:'Der Demo-Vorgang führt von der Besichtigung bis zur ausgewählten zukünftigen Vertragspartei, ohne Bewerberantworten oder Nachweisdateien im Check zu speichern.',
    why:'Welche Information angemessen ist, hängt auch davon ab, wie weit der Vermietungsprozess fortgeschritten ist. Der Check hilft beim Ablauf, nicht bei einer automatischen Auswahl.',
    facts:['3 Stufen durchlaufen','keine Bewerberantworten gespeichert','kein Ranking, kein Score, keine automatische Auswahl']
  },
  {
    title:'Vom Datenstand zum Dokument',
    short:'PDF-Zentrale',
    url:'pdf-zentrale.html?demo=1',
    copy:'Ein Dokument bekommt zuerst eine Prüffassung. Erst nach bewusster Freigabe wird genau dieser Datenstand fixiert und daraus die PDF erzeugt.',
    why:'Spätere Änderungen am Haus oder an Kosten dürfen eine bereits freigegebene Fassung nicht heimlich verändern.',
    facts:['Prüffassung und Freigabe sind getrennt','PDF wird lokal erzeugt','Speichern oder Teilen verwendet dieselbe fertige Datei']
  },
  {
    title:'Versionen und Übergaben',
    short:'Archiv',
    url:'archiv.html?demo=1',
    copy:'Im Archiv bleiben freigegebene Fassungen nachvollziehbar. Ob ein Dokument tatsächlich per E-Mail, Papier, Portal oder persönlich übergeben wurde, wird separat vermerkt.',
    why:'„PDF erstellt“ ist nicht dasselbe wie „an den Mieter übergeben“. Diese Trennung macht den Ablauf später nachvollziehbar.',
    facts:['Dokumentversion bleibt unverändert','Übergabe ist ein eigener Datensatz','PDF kann aus dem Snapshot erneut erzeugt werden']
  },
  {
    title:'Sichern und ins nächste Jahr wechseln',
    short:'Sicherung & Folgejahr',
    url:'einstellungen.html?demo=1',
    copy:'Zum Abschluss kannst du den Projektstand sichern oder eine neue Abrechnungsperiode anlegen.',
    why:'Ein neues Jahr soll nicht versehentlich alte Rechnungen, Zahlungen oder Messwerte übernehmen. Deshalb startet die Folgeperiode bewusst leer und unbestätigt.',
    facts:['JSON-Sicherung enthält Projektdaten','PDF- und Anhangsdateien werden nicht als mitgesichert behauptet','Folgejahr übernimmt keine alten Beträge']
  }
];;
