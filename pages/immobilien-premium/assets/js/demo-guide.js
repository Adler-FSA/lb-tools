/** Gemeinsame DE/EN-Lernreise für Demo-Haus und Bedienungsanleitung. */
export const DEMO_LEARNING_STEPS=Object.freeze([
  {
    title:{de:'Willkommen im Demo-Haus',en:'Welcome to the demo house'},
    short:{de:'Orientierung',en:'Orientation'},
    url:'index.html?demo=1',
    copy:{de:'Du schaust dir ein vollständig eingerichtetes Mehrfamilienhaus an. Eine Wohnung wird selbst genutzt, zwei Wohnungen sind vermietet. Alle Personen, Adressen und Belege sind frei erfunden.',en:'You are looking at a fully set-up apartment building. One unit is owner-occupied and two are rented out. All people, addresses and documents are fictitious.'},
    why:{de:'Du kannst das gesamte System ansehen und verändern, ohne eigene Immobilien- oder Mieterdaten zu benötigen.',en:'You can explore and change the entire system without needing your own property or tenant data.'},
    facts:{de:['3 Wohnungen · insgesamt 235 m²','2 abgeschlossene Abrechnungsjahre','2025 mit echtem Mieterwechsel in Wohnung B'],en:['3 units · 235 m² in total','2 completed accounting years','2025 includes a real tenant change in unit B']}
  },
  {
    title:{de:'Das Gebäude und seine Wohnungen',en:'The building and its units'},
    short:{de:'Immobilie',en:'Property'},
    url:'immobilien.html?demo=1',
    copy:{de:'Eine Immobilie wird einmal als Grundlage angelegt. Darunter liegen die einzelnen Wohnungen mit ihrer Fläche und ihrer Nutzung.',en:'A property is created once as the foundation. The individual units, their areas and their usage are then assigned beneath it.'},
    why:{de:'Kosten können später nur sauber verteilt werden, wenn klar ist, welche Einheiten zum Haus gehören und welche Fläche zu welchem Zeitraum galt.',en:'Costs can only be allocated cleanly later if the system knows which units belong to the building and which area applied during each period.'},
    facts:{de:['EG · 95 m² · Eigennutzung','Wohnung A · 75 m² · vermietet','Wohnung B · 65 m² · vermietet'],en:['Ground floor · 95 m² · owner-occupied','Unit A · 75 m² · rented','Unit B · 65 m² · rented']}
  },
  {
    title:{de:'Wer wohnt wo – und wann?',en:'Who lives where – and when?'},
    short:{de:'Nutzung & Mieterwechsel',en:'Usage & tenant change'},
    url:'immobilien.html?demo=1',
    copy:{de:'Wohnung B wechselt zum 1. Juli 2025 den Mieter. Der alte Zeitraum bleibt erhalten; der neue Nutzer überschreibt ihn nicht.',en:'Unit B changes tenant on 1 July 2025. The previous period remains preserved; the new tenant does not overwrite it.'},
    why:{de:'Eine Jahresabrechnung muss Kosten dem richtigen Nutzerzeitraum zuordnen. Genau deshalb arbeitet das System mit Historien statt nur mit einem aktuellen Namen.',en:'An annual statement must assign costs to the correct occupancy period. That is why the system keeps history instead of storing only the current name.'},
    facts:{de:['Jonas Schneider · bis 30.06.2025','Nina Vogel · ab 01.07.2025','Familie Berger · ganzjährig in Wohnung A'],en:['Jonas Schneider · until 30 Jun 2025','Nina Vogel · from 1 Jul 2025','Berger family · full year in unit A']}
  },
  {
    title:{de:'Rechnungen und Zahlungen',en:'Invoices and payments'},
    short:{de:'Kosten & Belege',en:'Costs & documents'},
    url:'kosten.html?demo=1',
    copy:{de:'Hier liegen die tatsächlichen Jahreskosten. Rechnung, mögliche Umlage und die Zahlung an einen Anbieter bleiben getrennte Informationen.',en:'This is where the actual annual costs are recorded. The invoice, possible allocation and payment to a provider remain separate pieces of information.'},
    why:{de:'Eine bezahlte Rechnung ist nicht automatisch umlagefähig – und eine Versorgerzahlung ist nicht dasselbe wie die Kostenposition selbst.',en:'A paid invoice is not automatically chargeable to tenants, and a provider payment is not the same thing as the cost item itself.'},
    facts:{de:['2025 · 6.950,00 € Gesamtkosten','Grundsteuer, Versicherung, Müll, Allgemeinstrom und Kaltwasser','Reparatur bleibt als Eigentümerkosten getrennt'],en:['2025 · €6,950.00 total costs','Property tax, insurance, waste, common electricity and cold water','Repair remains separate as an owner cost']}
  },
  {
    title:{de:'Zähler und Zwischenablesung',en:'Meters and intermediate reading'},
    short:{de:'Verbrauch',en:'Consumption'},
    url:'verbrauch.html?demo=1',
    copy:{de:'Für Kaltwasser besitzt jede Wohnung einen eigenen Zähler. In Wohnung B gibt es zusätzlich eine Ablesung genau zum Mieterwechsel am 1. Juli 2025.',en:'Each unit has its own cold-water meter. Unit B also has an intermediate reading exactly at the tenant change on 1 July 2025.'},
    why:{de:'Bei einem Nutzerwechsel darf Verbrauch nicht einfach halbiert oder geschätzt werden. Die dokumentierte Zwischenablesung trennt die beiden Nutzer sachlich.',en:'Consumption must not simply be split in half or estimated when a tenant changes. The documented intermediate reading separates the two occupancies factually.'},
    facts:{de:['3 Kaltwasserzähler','2025: Anfangs- und Endstände vollständig','Wohnung B: zusätzliche Zwischenablesung am 01.07.2025'],en:['3 cold-water meters','2025: complete start and end readings','Unit B: additional intermediate reading on 1 Jul 2025']}
  },
  {
    title:{de:'Was kostet das Haus wirklich?',en:'What does the building actually cost?'},
    short:{de:'Eigentümer-Sicht',en:'Owner view'},
    url:'abrechnung-eigentuemer.html?demo=1',
    copy:{de:'Die Eigentümerübersicht zeigt Kosten des Hauses, Eigentümeranteil, Mieteranteile und dokumentierte Zahlungen getrennt voneinander.',en:'The owner overview shows building costs, the owner share, tenant shares and documented payments separately.'},
    why:{de:'Als Eigentümer brauchst Du zuerst das Gesamtbild. Erst danach ist sinnvoll zu beurteilen, welcher Anteil überhaupt bei Mietern landet.',en:'As an owner, you first need the overall picture. Only then does it make sense to assess which share is allocated to tenants.'},
    facts:{de:['2024 · 7.500,00 € Gesamtkosten','2025 · 6.950,00 € Gesamtkosten','2025 · Eigentümeranteil 3.355,35 € · Mieteranteile 3.594,65 €'],en:['2024 · €7,500.00 total costs','2025 · €6,950.00 total costs','2025 · owner share €3,355.35 · tenant shares €3,594.65']}
  },
  {
    title:{de:'Was entfällt auf welchen Mieter?',en:'Which costs belong to which tenant?'},
    short:{de:'Vermieter-Abrechnung',en:'Landlord statement'},
    url:'abrechnung-vermieter.html?demo=1',
    copy:{de:'Aus bestätigten Kosten, Nutzungszeiten, Zählerständen und tatsächlich eingegangenen Vorauszahlungen entsteht die individuelle technische Abrechnung.',en:'The individual technical statement is built from confirmed costs, occupancy periods, meter readings and actual advance payments received.'},
    why:{de:'Mieter sollen nur ihren eigenen Zeitraum und ihren eigenen Anteil sehen. Der Mieterwechsel in Wohnung B ist deshalb ein wichtiger Praxistest.',en:'Tenants should see only their own period and their own share. The tenant change in unit B is therefore an important real-world test.'},
    facts:{de:['Familie Berger · Kostenanteil 1.890,20 €','Jonas Schneider · Kostenanteil 829,25 €','Nina Vogel · Kostenanteil 875,20 €'],en:['Berger family · cost share €1,890.20','Jonas Schneider · cost share €829.25','Nina Vogel · cost share €875.20']}
  },
  {
    title:{de:'Mietvertrag, Hausordnung und Übergabe',en:'Lease, house rules and handover'},
    short:{de:'Mietservice',en:'Tenant service'},
    url:'mietvertragswerkstatt.html?demo=1&tenancy=demo_lease_berger',
    copy:{de:'Zum Vermieten gehören mehr als Zahlen. Im Demo-Haus liegen bereits Entwürfe für Mietvertrag, Hausordnung, Entsorgungsinformation, Übergabeprotokoll und Mieter-Serviceblatt.',en:'Letting involves more than numbers. The demo house already contains drafts for a lease, house rules, waste information, a handover record and a tenant service sheet.'},
    why:{de:'Dokumente sollen aus demselben Immobilienkontext entstehen. Fach- oder Rechtsprüfhinweise gehören separat zur Arbeitsoberfläche – nicht ungefragt in das eigentliche Vertragsdokument.',en:'Documents should come from the same property context. Professional or legal review notes belong separately in the workspace, not unexpectedly inside the actual contract document.'},
    facts:{de:['Wohnraum-Mietvertragswerkstatt für Familie Berger','Übergabeprotokoll zum Einzug von Nina Vogel','Hausordnung und Entsorgungsinformation vorbereitet'],en:['Residential lease workshop for the Berger family','Handover record for Nina Vogel moving in','House rules and waste information prepared']},
    extraUrl:'hausordnung-konfigurator.html?demo=1',
    extraLabel:{de:'Hausordnungs-Konfigurator öffnen',en:'Open house rules configurator'}
  },
  {
    title:{de:'Was sollte ein Eigentümer prüfen?',en:'What should an owner review?'},
    short:{de:'Sicherheit & Pflichten',en:'Safety & obligations'},
    url:'schutzcheck.html?demo=1',
    copy:{de:'Versicherung, Finanzierung, Energieausweis, Wartungen und örtliche Anforderungen werden nicht in einen Topf geworfen. Jeder Punkt erhält seine eigene Einordnung und Wiedervorlage.',en:'Insurance, financing, energy certificates, maintenance and local requirements are not lumped together. Each item gets its own classification and follow-up.'},
    why:{de:'Nicht alles ist automatisch eine gesetzliche Pflicht. Das System soll offenlassen, was geprüft werden muss, statt pauschal eine Rechtsentscheidung vorzugeben.',en:'Not everything is automatically a legal obligation. The system keeps review questions open instead of making blanket legal determinations.'},
    facts:{de:['9 vorbereitete Prüfpunkte','keine automatische Rechtsklassifizierung','offene Wiedervorlagen bleiben sichtbar'],en:['9 prepared review items','no automatic legal classification','open follow-ups remain visible']}
  },
  {
    title:{de:'Datensparsam vermieten',en:'Let with data minimisation'},
    short:{de:'Vermietungsprozess',en:'Letting process'},
    url:'vermietungscheck.html?demo=1',
    copy:{de:'Der Demo-Vorgang führt von der Besichtigung bis zur ausgewählten zukünftigen Vertragspartei, ohne Bewerberantworten oder Nachweisdateien im Check zu speichern.',en:'The demo process runs from viewing to the selected future contracting party without storing applicant answers or evidence files in the check.'},
    why:{de:'Welche Information angemessen ist, hängt auch davon ab, wie weit der Vermietungsprozess fortgeschritten ist. Der Check hilft beim Ablauf, nicht bei einer automatischen Auswahl.',en:'Which information is appropriate also depends on how far the letting process has progressed. The check supports the workflow, not automatic selection.'},
    facts:{de:['3 Stufen durchlaufen','keine Bewerberantworten gespeichert','kein Ranking, kein Score, keine automatische Auswahl'],en:['3 stages completed','no applicant answers stored','no ranking, score or automatic selection']}
  },
  {
    title:{de:'Vom Datenstand zum Dokument',en:'From data state to document'},
    short:{de:'PDF-Zentrale',en:'PDF centre'},
    url:'pdf-zentrale.html?demo=1',
    copy:{de:'Ein Dokument bekommt zuerst eine Prüffassung. Erst nach bewusster Freigabe wird genau dieser Datenstand fixiert und daraus die PDF erzeugt.',en:'A document first gets a review version. Only after deliberate release is that exact data state fixed and used to create the PDF.'},
    why:{de:'Spätere Änderungen am Haus oder an Kosten dürfen eine bereits freigegebene Fassung nicht heimlich verändern.',en:'Later changes to the property or costs must not silently alter a version that has already been released.'},
    facts:{de:['Prüffassung und Freigabe sind getrennt','PDF wird lokal erzeugt','Speichern oder Teilen verwendet dieselbe fertige Datei'],en:['Review and release are separate','PDF is generated locally','Save or share uses the same finished file']}
  },
  {
    title:{de:'Versionen und Übergaben',en:'Versions and deliveries'},
    short:{de:'Archiv',en:'Archive'},
    url:'archiv.html?demo=1',
    copy:{de:'Im Archiv bleiben freigegebene Fassungen nachvollziehbar. Ob ein Dokument tatsächlich per E-Mail, Papier, Portal oder persönlich übergeben wurde, wird separat vermerkt.',en:'Released versions remain traceable in the archive. Whether a document was actually delivered by email, paper, portal or in person is recorded separately.'},
    why:{de:'„PDF erstellt“ ist nicht dasselbe wie „an den Mieter übergeben“. Diese Trennung macht den Ablauf später nachvollziehbar.',en:'“PDF created” is not the same as “delivered to the tenant”. Keeping these separate makes the process traceable later.'},
    facts:{de:['Dokumentversion bleibt unverändert','Übergabe ist ein eigener Datensatz','PDF kann aus dem Snapshot erneut erzeugt werden'],en:['Document version remains unchanged','Delivery is a separate record','PDF can be recreated from the snapshot']}
  },
  {
    title:{de:'Sichern und ins nächste Jahr wechseln',en:'Back up and move to the next year'},
    short:{de:'Sicherung & Folgejahr',en:'Backup & next year'},
    url:'einstellungen.html?demo=1',
    copy:{de:'Zum Abschluss kannst Du den Projektstand sichern oder eine neue Abrechnungsperiode anlegen.',en:'Finally, you can back up the project state or create a new accounting period.'},
    why:{de:'Ein neues Jahr soll nicht versehentlich alte Rechnungen, Zahlungen oder Messwerte übernehmen. Deshalb startet die Folgeperiode bewusst leer und unbestätigt.',en:'A new year must not accidentally inherit old invoices, payments or readings. That is why the next period deliberately starts empty and unconfirmed.'},
    facts:{de:['JSON-Sicherung enthält Projektdaten','PDF- und Anhangsdateien werden nicht als mitgesichert behauptet','Folgejahr übernimmt keine alten Beträge'],en:['JSON backup contains project data','PDF and attachment files are not claimed to be included','Next year does not copy old amounts']}
  }
]);
