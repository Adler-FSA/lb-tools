import {buildDemoProject,DEMO_VERSION} from './demo-project.js';
import {loadProject,resetDemoProject,setDemoMode} from './storage.js';

const steps=[
  {
    title:'Willkommen im Demo-Haus',
    short:'Orientierung',
    url:'index.html?demo=1',
    copy:'Du schaust dir ein vollständig eingerichtetes Mehrfamilienhaus an. Eine Wohnung wird selbst genutzt, zwei Wohnungen sind vermietet. Alle Personen, Adressen und Belege sind frei erfunden.',
    why:'Du kannst das gesamte System ansehen und verändern, ohne eigene Immobilien- oder Mieterdaten zu benötigen.',
    facts:['3 Wohnungen · insgesamt 235 m²','2 abgeschlossene Abrechnungsjahre','2026 mit echtem Mieterwechsel in Wohnung B']
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
];

const shell=document.querySelector('[data-demo-shell]');
const frame=document.querySelector('[data-demo-frame]');
const toast=document.querySelector('[data-demo-toast]');
let current=0,free=false,toastTimer=null;

function showToast(message){
  toast.textContent=message;toast.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},4200);
}
function ensureDemo(){
  setDemoMode(true);
  const existing=loadProject({mode:'demo'});
  if(!existing||existing.demoMetadata?.demoVersion!==DEMO_VERSION){
    resetDemoProject(buildDemoProject(),{confirmation:'RESET_DEMO_PROJECT'});
  }
}
function renderGuide(){
  const step=steps[current];
  document.querySelector('[data-guide-step]').textContent=`Schritt ${current+1} von ${steps.length}`;
  document.querySelector('[data-guide-title]').textContent=step.title;
  document.querySelector('[data-guide-copy]').textContent=step.copy;
  document.querySelector('[data-guide-why]').textContent=step.why;
  const facts=document.querySelector('[data-guide-facts]');
  facts.innerHTML='<strong>Im Demo-Haus siehst du:</strong><ul>'+step.facts.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul>'+
    (step.extraUrl?'<a class="demo-btn primary" style="display:inline-block;margin-top:7px" target="_blank" rel="noopener" href="'+escapeHtml(step.extraUrl)+'">'+escapeHtml(step.extraLabel)+'</a>':'');
  document.querySelector('[data-prev]').disabled=current===0;
  document.querySelector('[data-next]').disabled=current===steps.length-1;
  document.querySelector('[data-guide-list]').innerHTML=steps.map((x,i)=>
    '<button type="button" data-jump="'+i+'" class="'+(i===current?'active':'')+'">'+(i+1)+'. '+escapeHtml(x.short)+'<small>'+escapeHtml(x.title)+'</small></button>'
  ).join('');
  document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>go(Number(btn.dataset.jump))));
}
function go(index,{navigate=true}={}){
  if(index<0||index>=steps.length)return;current=index;renderGuide();
  if(navigate)frame.src=steps[current].url;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}

function cleanDevelopmentLanguage(){
  try{
    const doc=frame.contentDocument;if(!doc)return;
    doc.querySelectorAll('.eyebrow').forEach(node=>{
      const text=node.textContent.trim();
      if(/^Baustein\s/i.test(text)) node.textContent='Praxisbereich';
      else if(/^Neu in Baustein\s/i.test(text)) node.textContent='Praxisbereich';
      else if(/^Bausteingrenze$/i.test(text)) node.textContent='Hinweis';
    });
    doc.querySelectorAll('.notice').forEach(node=>{
      const text=node.textContent.trim();
      if(/^Baustein\s+6\s+ist gestartet/i.test(text)){
        node.textContent='Im Demo-Haus sind Immobilienakte, Kosten, Verbrauch, Abrechnung, Dokumente und Archiv bereits miteinander verbunden.';
      }
    });
    doc.querySelectorAll('h2').forEach(h=>{
      if(h.textContent.trim()==='Noch keine PDF-Ausgabe'){
        h.textContent='Von der Vorbereitung zur PDF';
        const p=h.parentElement?.querySelector('.kicker');
        if(p)p.textContent='Gespeicherte Entwürfe können anschließend in der PDF-Zentrale als eigene Prüffassung übernommen werden.';
      }
    });
    const storageText=doc.querySelector('[data-storage-text]');
    if(storageText)storageText.textContent='Demo lokal gespeichert';
    const title=doc.querySelector('.brand-title');
    if(title&&!doc.querySelector('[data-demo-inner-badge]')){
      const badge=doc.createElement('span');badge.dataset.demoInnerBadge='1';badge.textContent='DEMO';
      badge.style.cssText='display:inline-block;margin-left:8px;padding:2px 6px;border-radius:999px;background:#c6006f;color:#fff;font-size:10px;font-weight:800;vertical-align:middle';
      title.appendChild(badge);
    }
  }catch{}
}

document.querySelector('[data-prev]').addEventListener('click',()=>go(current-1));
document.querySelector('[data-next]').addEventListener('click',()=>go(current+1));
document.querySelector('[data-toggle-mode]').addEventListener('click',event=>{
  free=!free;shell.classList.toggle('free',free);
  event.currentTarget.textContent=free?'Geführte Demo':'Frei erkunden';
});
document.querySelector('[data-reset-demo]').addEventListener('click',()=>{
  if(!confirm('Demo-Haus auf den Ausgangszustand zurücksetzen? Nur Demo-Änderungen gehen verloren. Eigene Projektdaten bleiben unberührt.'))return;
  resetDemoProject(buildDemoProject(),{confirmation:'RESET_DEMO_PROJECT'});
  frame.src=steps[current].url;showToast('Demo-Haus wurde auf den geprüften Ausgangszustand zurückgesetzt.');
});
document.querySelector('[data-exit-demo]').addEventListener('click',()=>{
  setDemoMode(false);window.location.href='index.html?demo=0';
});
frame.addEventListener('load',()=>{
  cleanDevelopmentLanguage();
  setTimeout(cleanDevelopmentLanguage,250);
});

try{
  ensureDemo();renderGuide();frame.src=steps[0].url;
}catch(error){
  renderGuide();
  showToast('Demo konnte nicht gestartet werden: '+(error?.message||String(error)));
}
