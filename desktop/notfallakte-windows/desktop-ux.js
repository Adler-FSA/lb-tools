(()=>{
'use strict';
const intro='<p>Diese Notfallakte ist auf deinem Windows-Computer installiert und kann vollständig offline genutzt werden. Deine Arbeitsdaten werden lokal auf diesem Gerät gespeichert. Erstelle regelmäßig eine vollständige JSON-Master-Sicherung und bewahre sie zusätzlich an einem geschützten, selbst kontrollierten Ort auf.</p><p class="muted">Für einen Gerätewechsel oder eine Neuinstallation installierst du die Windows-Version erneut und stellst anschließend deine letzte JSON-Master-Sicherung wieder her. PDF und Excel ergänzen deine Sicherung, ersetzen die JSON-Master-Sicherung aber nicht.</p>';
const pairs=[
['Diese direkte Produkt-URL als Favorit/Lesezeichen speichern.','Einen geschützten Ordner „Meine Notfallakte – Sicherungen“ anlegen.'],
['Bei Gerätewechsel oder neuem Browser kannst du deine letzte JSON-Master-Sicherung direkt wiederherstellen.','Bei einem Gerätewechsel oder einer Neuinstallation kannst du deine letzte JSON-Master-Sicherung direkt wiederherstellen.'],
['Auf dem alten Gerät aktuelle JSON erstellen → auf dem neuen Gerät direkte Produkt-URL öffnen und als Favorit speichern → „Sicherung wiederherstellen“ → JSON auswählen → Daten kontrollieren → neue Master-Sicherung erstellen.','Auf dem bisherigen Gerät eine aktuelle JSON-Master-Sicherung erstellen → Windows-Version auf dem neuen Computer installieren → „Sicherung wiederherstellen“ → JSON auswählen → Daten kontrollieren → neue Master-Sicherung erstellen.'],
['Erst danach solltest du sensible Daten aus diesem Browser löschen.','Erst danach solltest du sensible Daten aus der lokalen Arbeitskopie dieser Anwendung löschen.'],
['LocalStorage, IndexedDB und interne Import-Wiederherstellungspunkte wurden entfernt.','Der lokale Arbeitsstand und interne Import-Wiederherstellungspunkte wurden aus dieser Anwendung entfernt.'],
['Lokaler Arbeitsstand aus der Gerätesicherung wiederhergestellt ✓','Lokaler Arbeitsstand der Anwendung wiederhergestellt ✓']
];
function text(root=document.body){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const a=[];while(w.nextNode())a.push(w.currentNode);for(const n of a){let s=n.nodeValue;for(const [x,y] of pairs)s=s.split(x).join(y);n.nodeValue=s}}
function clean(){
  const i=document.querySelector('.intro .card .cardBody');
  if(i&&!i.dataset.win){i.innerHTML=intro;i.dataset.win='1'}
  const g=document.querySelector('#v08AcademyGuide .v08DetailsBody');
  if(g&&!g.dataset.win){const tabs=g.querySelector('.v08DeviceTabs');if(tabs){let n=tabs.nextElementSibling;while(n&&n.classList.contains('v08DevicePanel')){const x=n.nextElementSibling;n.remove();n=x}tabs.outerHTML='<div class="v08AccordionNote"><strong>Windows-Desktop-Version:</strong><br>JSON oder Excel erstellen → im Windows-Speicherdialog deinen geschützten Sicherungsordner auswählen → speichern → anschließend prüfen, ob die Datei dort vorhanden ist. Für die tägliche Nutzung ist keine Internetverbindung erforderlich.</div>'}g.dataset.win='1'}
  text();
  const ol=document.querySelector('#v08Onboarding .v08OnboardCard ol');
  if(ol){const items=[...ol.querySelectorAll('li')];for(let x=items.length-1;x>0;x--){if(items[x].textContent.trim()===items[x-1].textContent.trim())items[x].remove()}}
}
const oldConfirm=window.confirm.bind(window);window.confirm=m=>oldConfirm(String(m).replace('Lokale Arbeitskopie wirklich vollständig aus diesem Browser löschen?','Lokale Arbeitskopie wirklich vollständig von diesem Gerät löschen?'));
new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean);else clean();
})();
