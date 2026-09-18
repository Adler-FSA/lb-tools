(()=>{
'use strict';
/* Arbeitswerkstatt: bestehende Vertrags-PDF-Engine erzeugt genau eine PDF; die freigegebene Akademie-PDF-Zentrale uebernimmt sie unveraendert. */
const $=id=>document.getElementById(id);
const leader=$('leaderEditor'),annex=$('annexEditor'),notes=$('reviewNotes');
const checks=[...document.querySelectorAll('[data-review]')];
const status=$('saveState'),result=$('pdfResult'),error=$('pdfError');
const KEY='lb-marktplatz-vertragswerkstatt-entwurf-v1';
const annexInitial=annex.innerHTML;
let leaderInitial='',loading=true,saveTimer=null,activeEditor=annex,zentralePromise=null,busy=false;
const ALLOWED=new Set(['H1','H2','H3','H4','H5','P','DIV','SECTION','ARTICLE','HEADER','FOOTER','BR','B','STRONG','I','EM','U','S','UL','OL','LI','SPAN','TABLE','THEAD','TBODY','TFOOT','TR','TD','TH','LABEL','SMALL','BLOCKQUOTE','HR']);
const CLASSES=new Set(['contract-title','party-card','section','data-table','contract-table','signature-grid','signature-box','signature-line','small','check','callout']);
const setStatus=text=>{status.textContent=text};
function cleanHtml(html){
  const parsed=new DOMParser().parseFromString('<div id="safeRoot">'+String(html||'')+'</div>','text/html');
  const root=parsed.getElementById('safeRoot'),out=document.createElement('div');
  function add(node,parent){
    if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.textContent||''));return}
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    const tag=node.tagName;
    if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','BUTTON','TEXTAREA','SELECT','LINK','META'].includes(tag))return;
    if(tag==='INPUT'){
      if(['checkbox','radio'].includes(node.getAttribute('type')))parent.appendChild(document.createTextNode(node.hasAttribute('checked')?'[X] ':'[ ] '));
      else parent.appendChild(document.createTextNode(node.getAttribute('value')||'________________________'));
      return;
    }
    if(!ALLOWED.has(tag)){[...node.childNodes].forEach(child=>add(child,parent));return}
    const el=document.createElement(tag.toLowerCase());
    const cls=(node.getAttribute('class')||'').split(/\s+/).filter(c=>CLASSES.has(c));
    if(cls.length)el.className=cls.join(' ');
    if(['TD','TH'].includes(tag))for(const attr of ['colspan','rowspan']){
      const value=Number(node.getAttribute(attr));if(Number.isInteger(value)&&value>1&&value<=20)el.setAttribute(attr,String(value));
    }
    [...node.childNodes].forEach(child=>add(child,el));parent.appendChild(el);
  }
  if(root)[...root.childNodes].forEach(child=>add(child,out));
  return out.innerHTML;
}
function readSaved(){try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null}catch(e){return null}}
function saveNow(){
  if(loading)return;
  try{
    const draft={kind:'LiquidityBoosterClubMarktplatzDraft',version:1,savedAt:new Date().toISOString(),leader:cleanHtml(leader.innerHTML),annex:cleanHtml(annex.innerHTML),notes:notes.value,checks:checks.filter(c=>c.checked).map(c=>c.dataset.review)};
    localStorage.setItem(KEY,JSON.stringify(draft));setStatus('Lokal gespeichert: '+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+'.');
  }catch(e){setStatus('Lokales Speichern nicht verfügbar. Du kannst den Entwurf als Datei sichern.');}
}
function scheduleSave(){if(loading)return;clearTimeout(saveTimer);setStatus('Änderungen werden gespeichert …');saveTimer=setTimeout(saveNow,350)}
function updateProgress(){
  const done=checks.filter(c=>c.checked).length;
  $('progressBar').style.width=(checks.length?done/checks.length*100:0)+'%';
  $('progressText').textContent=done+' von '+checks.length+' als geklärt markiert · optional';
  if(!busy){$('pdfLeader').disabled=false;$('pdfAnnex').disabled=false;}
}
function invalidate(){result.classList.remove('show');error.textContent='';updateProgress();scheduleSave()}
function restoreSaved(draft){
  if(!draft||draft.kind!=='LiquidityBoosterClubMarktplatzDraft'||draft.version!==1)return false;
  if(typeof draft.leader==='string'&&draft.leader.length>1000)leader.innerHTML=cleanHtml(draft.leader);
  if(typeof draft.annex==='string'&&draft.annex.length>1000)annex.innerHTML=cleanHtml(draft.annex);
  notes.value=typeof draft.notes==='string'?draft.notes.slice(0,30000):'';
  checks.forEach(c=>c.checked=Array.isArray(draft.checks)&&draft.checks.includes(c.dataset.review));
  updateProgress();return true;
}
function adaptWorkshop(){
  const hero=document.querySelector('.hero p');if(hero)hero.textContent='Zwei separat bearbeitbare Dokumente. PDF A und PDF B können jederzeit erstellt und über die Akademie-PDF-Zentrale gespeichert oder geteilt werden. Das Club-Leader-Original bleibt unverändert.';
  const notice=document.querySelector('.notice');if(notice)notice.textContent='Interne Arbeitswerkstatt: Vertragstexte frei bearbeiten, PDFs jederzeit testen und Entwurfsstände sichern. Die Prüfliste ist freiwillig.';
  const navigation=[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')==='#freigabe');if(navigation)navigation.textContent='PDF-Zentrale';
  const reviewHead=[...document.querySelectorAll('.side h3')].find(h=>h.textContent.includes('Prüfliste'));if(reviewHead)reviewHead.textContent='Prüfliste (optional)';
  const description=document.querySelector('#anlage .paperHead p');if(description)description.textContent='Separat bearbeiten und jederzeit als eigene PDF ausgeben – auch für bereits aktive Club Leader.';
  const pdfSection=$('freigabe');if(pdfSection){
    const tag=pdfSection.querySelector('.paperHead .tag');if(tag)tag.textContent='AKADEMIE · PDF-ZENTRALE';
    const title=pdfSection.querySelector('.paperHead h2');if(title)title.textContent='Zwei PDFs · Speichern · Teilen · Dateinamen kopieren';
    const lead=pdfSection.querySelector('.paperHead p');if(lead)lead.textContent='Beide PDFs können jederzeit erstellt werden. Die Akademie-PDF-Zentrale bietet dieselbe Dateiausgabe wie die freigegebene Hotel-Testseite.';
    const approval=$('approval');if(approval){const label=approval.closest('label');const hint=label?.nextElementSibling;if(hint?.classList.contains('hint'))hint.remove();label?.remove();}
    const box=pdfSection.querySelector('.signaturebox > p');if(box)box.innerHTML='<strong>PDF-Test und Vertragsausgabe</strong>';
    const bottom=pdfSection.querySelector('.panel > p.hint');if(bottom)bottom.textContent='Jedes Dokument wird einmal aus dem aktuellen Text als PDF erzeugt und unverändert an die Akademie-PDF-Zentrale übergeben. Dort Speichern, Teilen oder Dateinamen kopieren. Keine Freigabehäkchen nötig.';
  }
  const footer=document.querySelector('.footer');if(footer)footer.textContent='LiquidityBooster · Vertragswerkstatt · frei bearbeitbare Arbeitsfassung';
  updateProgress();
}
async function initialize(){
  const saved=readSaved();
  try{
    const response=await fetch('./club-leader.html',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const html=await response.text(),source=new DOMParser().parseFromString(html,'text/html');
    const original=source.querySelector('[data-contract-document] .contract');
    if(!original||original.textContent.trim().length<8000)throw new Error('Originalvertrag nicht vollständig gelesen.');
    leaderInitial=cleanHtml(original.innerHTML);leader.innerHTML=leaderInitial;
    const restored=restoreSaved(saved);
    setStatus(restored?'Gespeicherten Entwurf geladen.':'Originalvertrag vollständig als bearbeitbare Kopie geladen.');
  }catch(e){
    if(saved&&restoreSaved(saved)){leaderInitial=leader.innerHTML;setStatus('Gespeicherte Arbeitskopie geladen. Original derzeit nicht erreichbar.');}
    else{leader.textContent='Club-Leader-Original konnte derzeit nicht geladen werden: '+(e.message||e)+'. Anlage 1 und ihre PDF-Ausgabe sind trotzdem verfügbar.';setStatus('Originalvertrag nicht erreichbar; PDF B ist weiterhin nutzbar.');}
  }
  loading=false;updateProgress();
}
function download(blob,filename){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;link.style.display='none';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function exportDraft(){
  clearTimeout(saveTimer);saveNow();
  const draft={kind:'LiquidityBoosterClubMarktplatzDraft',version:1,savedAt:new Date().toISOString(),source:'pages/vertraege/club-leader.html',leader:cleanHtml(leader.innerHTML),annex:cleanHtml(annex.innerHTML),checks:checks.filter(c=>c.checked).map(c=>c.dataset.review),notes:notes.value};
  download(new Blob([JSON.stringify(draft,null,2)],{type:'application/json;charset=utf-8'}),'Club-Marktplatz-Vertragsentwurf-'+new Date().toISOString().slice(0,10)+'.json');
  setStatus('Entwurfsdatei heruntergeladen.');
}
async function importDraft(file){
  if(!file)return;
  if(file.size>2500000){setStatus('Datei zu groß: maximal 2,5 MB.');return}
  try{
    const draft=JSON.parse(await file.text());
    if(draft.kind!=='LiquidityBoosterClubMarktplatzDraft'||draft.version!==1||typeof draft.leader!=='string'||typeof draft.annex!=='string')throw new Error('Keine gültige Entwurfsdatei.');
    if(!confirm('Aktuellen lokalen Entwurf durch die ausgewählte Datei ersetzen?'))return;
    restoreSaved(draft);invalidate();saveNow();setStatus('Entwurf importiert. PDFs können direkt erzeugt werden.');
  }catch(e){setStatus('Import fehlgeschlagen: '+(e.message||e))}
  finally{$('importDraft').value=''}
}
for(const editor of [leader,annex]){
  editor.addEventListener('focusin',()=>activeEditor=editor);
  editor.addEventListener('input',invalidate);
  editor.addEventListener('paste',e=>{
    const html=e.clipboardData?.getData('text/html');if(!html)return;
    e.preventDefault();document.execCommand('insertHTML',false,cleanHtml(html));
  });
}
document.querySelectorAll('[data-toolbar] button').forEach(button=>{
  button.addEventListener('mousedown',event=>event.preventDefault());
  button.addEventListener('click',()=>{
    if(!activeEditor?.isContentEditable)return;
    activeEditor.focus();
    if(button.dataset.block)document.execCommand('formatBlock',false,button.dataset.block);
    else document.execCommand(button.dataset.command,false,null);
    invalidate();
  });
});
checks.forEach(check=>check.addEventListener('change',()=>{updateProgress();scheduleSave()}));
notes.addEventListener('input',scheduleSave);
$('exportDraft').addEventListener('click',exportDraft);
$('importDraftBtn').addEventListener('click',()=>$('importDraft').click());
$('importDraft').addEventListener('change',event=>importDraft(event.target.files?.[0]));
$('resetDraft').addEventListener('click',()=>{
  if(!confirm('Beide lokalen Arbeitsfassungen und Notizen auf Ausgangsstand zurücksetzen?'))return;
  clearTimeout(saveTimer);try{localStorage.removeItem(KEY)}catch(e){}
  leader.innerHTML=leaderInitial||'<p>Originalvertrag derzeit nicht verfügbar.</p>';
  annex.innerHTML=annexInitial;notes.value='';checks.forEach(c=>c.checked=false);
  error.textContent='';result.classList.remove('show');setStatus('Auf Ausgangsfassung zurückgesetzt.');updateProgress();
});
function ensureZentrale(){
  if(typeof window.AkademiePdfUebergabe?.setDocument==='function')return Promise.resolve(window.AkademiePdfUebergabe);
  if(zentralePromise)return zentralePromise;
  zentralePromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='../merchant-kompass/akademie-pdf-uebergabe.js?v=1';
    script.onload=()=>typeof window.AkademiePdfUebergabe?.setDocument==='function'?resolve(window.AkademiePdfUebergabe):reject(new Error('Die Akademie-PDF-Zentrale ist nicht verfügbar.'));
    script.onerror=()=>reject(new Error('Die freigegebene Akademie-PDF-Zentrale konnte nicht geladen werden.'));
    document.head.appendChild(script);
  }).catch(e=>{zentralePromise=null;throw e});
  return zentralePromise;
}
function datePart(){
  const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
}
async function createPdf(which){
  if(busy)return;
  error.textContent='';
  if(!window.FSAContractPdfEngine||window.FSAContractPdfEngine.version!=='FSA_CONTRACT_PDF_ENGINE_V2'){
    error.textContent='Die Vertrags-PDF-Engine wurde nicht geladen. Bitte die Seite neu laden.';return;
  }
  const editor=which==='leader'?leader:annex;
  if(which==='leader'&&editor.textContent.trim().length<1500){error.textContent='PDF A: Der vollständige Club-Leader-Text konnte nicht geladen werden. PDF B ist unabhängig davon verfügbar.';return;}
  const filename=(which==='leader'?'Club-Leader-Vereinbarung':'Anlage-1-Club-Marktplatz')+'-Entwurf-'+datePart()+'.pdf';
  const title=which==='leader'?'CLUB-LEADER-VEREINBARUNG':'ANLAGE 1 · CLUB-MARKTPLATZ';
  const button=which==='leader'?$('pdfLeader'):$('pdfAnnex');
  busy=true;$('pdfLeader').disabled=true;$('pdfAnnex').disabled=true;
  const label=button.textContent;button.textContent='PDF wird erstellt …';result.classList.remove('show');
  try{
    const zentrale=await ensureZentrale();
    const pdf=await window.FSAContractPdfEngine.generate({root:editor,contentRoot:editor,fieldsRoot:$('pdfEmptyFields'),titleText:title,subtitleText:'ONLY INSIDE Software-Solution GmbH · Arbeitsfassung',logoUrl:document.body.dataset.pdfLogo,footerText:title,filename,autoDownload:false});
    if(!pdf?.blob||!pdf?.filename||!pdf?.pages)throw new Error('Die PDF-Engine hat kein vollständiges Ergebnis geliefert.');
    // Fertige Datei unverändert uebergeben; KEIN zweiter Generator, kein Download-Link, kein Druckdialog.
    const handed=zentrale.setDocument({blob:pdf.blob,filename:pdf.filename,pages:pdf.pages,origin:(which==='leader'?'Club-Leader-Vertrag':'Anlage 1 · Club-Marktplatz')+' · tools.liquiditybooster.de'});
    result.replaceChildren();
    const line=document.createElement('p');line.textContent='Fertig: '+pdf.pages+' A4-Seiten · '+handed.filename+'. Akademie-PDF-Zentrale geöffnet.';
    const again=document.createElement('button');again.type='button';again.className='btn mint';again.textContent='Fertige PDF erneut anzeigen';
    again.addEventListener('click',()=>{try{zentrale.show()}catch(e){error.textContent=e?.message||String(e)}});
    result.append(line,again);result.classList.add('show');
  }catch(e){error.textContent='PDF-Fehler ('+(which==='leader'?'A':'B')+'): '+(e?.message||e)}
  finally{busy=false;button.textContent=label;updateProgress();}
}
$('pdfLeader').addEventListener('click',()=>createPdf('leader'));
$('pdfAnnex').addEventListener('click',()=>createPdf('annex'));
window.addEventListener('beforeunload',()=>{if(!loading){clearTimeout(saveTimer);saveNow()}});
adaptWorkshop();initialize();
// Zentrale direkt laden, damit sie beim ersten PDF-Klick bereitsteht.
ensureZentrale().catch(e=>{console.warn('[Akademie-PDF-Zentrale]',e?.message||e)});
})();