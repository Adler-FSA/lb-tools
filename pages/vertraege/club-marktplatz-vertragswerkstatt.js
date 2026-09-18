(()=>{
'use strict';
/* Separate draft workshop only. The published Club Leader contract is read, never modified. */
const $=id=>document.getElementById(id);
const leader=$('leaderEditor'),annex=$('annexEditor'),notes=$('reviewNotes');
const checks=[...document.querySelectorAll('[data-review]')];
const approval=$('approval'),status=$('saveState'),result=$('pdfResult'),error=$('pdfError');
const KEY='lb-marktplatz-vertragswerkstatt-entwurf-v1';
const annexInitial=annex.innerHTML;
let leaderInitial='',loading=true,saveTimer=null,activeEditor=annex;
const ALLOWED=new Set(['H1','H2','H3','H4','H5','P','DIV','SECTION','ARTICLE','HEADER','FOOTER','BR','B','STRONG','I','EM','U','S','UL','OL','LI','SPAN','TABLE','THEAD','TBODY','TFOOT','TR','TD','TH','LABEL','SMALL','BLOCKQUOTE','HR']);
const CLASSES=new Set(['contract-title','party-card','section','data-table','contract-table','signature-grid','signature-box','signature-line','small','check','callout']);
const setStatus=t=>{status.textContent=t};
function cleanHtml(html){
  const parsed=new DOMParser().parseFromString('<div id="safeRoot">'+String(html||'')+'</div>','text/html');
  const root=parsed.getElementById('safeRoot'),out=document.createElement('div');
  function add(node,parent){
    if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.textContent||''));return}
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    const tag=node.tagName;
    if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','BUTTON','TEXTAREA','SELECT','LINK','META'].includes(tag))return;
    if(tag==='INPUT'){
      if(node.getAttribute('type')==='checkbox'||node.getAttribute('type')==='radio')parent.appendChild(document.createTextNode(node.hasAttribute('checked')?'[X] ':'[ ] '));
      return;
    }
    if(!ALLOWED.has(tag)){[...node.childNodes].forEach(n=>add(n,parent));return}
    const el=document.createElement(tag.toLowerCase());
    const safeClass=(node.getAttribute('class')||'').split(/\s+/).filter(x=>CLASSES.has(x));
    if(safeClass.length)el.className=safeClass.join(' ');
    if(['TD','TH'].includes(tag))for(const attr of ['colspan','rowspan']){
      const value=Number(node.getAttribute(attr));if(Number.isInteger(value)&&value>1&&value<=20)el.setAttribute(attr,String(value));
    }
    [...node.childNodes].forEach(n=>add(n,el));parent.appendChild(el);
  }
  if(root)[...root.childNodes].forEach(n=>add(n,out));
  return out.innerHTML;
}
function readSaved(){try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null}catch(e){return null}}
function saveNow(){
  if(loading)return;
  try{
    const payload={kind:'LiquidityBoosterClubMarktplatzDraft',version:1,savedAt:new Date().toISOString(),leader:cleanHtml(leader.innerHTML),annex:cleanHtml(annex.innerHTML),notes:notes.value,checks:checks.filter(x=>x.checked).map(x=>x.dataset.review)};
    localStorage.setItem(KEY,JSON.stringify(payload));setStatus('Lokal gesichert: '+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' · Entwurfsdatei zusätzlich exportieren.');
  }catch(e){setStatus('Lokales Speichern nicht verfügbar. Bitte jetzt die Entwurfsdatei exportieren.');}
}
function scheduleSave(){if(loading)return;clearTimeout(saveTimer);setStatus('Ungesicherte Änderung …');saveTimer=setTimeout(saveNow,350)}
function invalidate(){if(approval.checked)approval.checked=false;result.classList.remove('show');error.textContent='';updateGate();scheduleSave()}
function updateGate(){
  const count=checks.filter(x=>x.checked).length;
  $('progressBar').style.width=(count/checks.length*100)+'%';
  $('progressText').textContent=count+' von '+checks.length+' geklärt';
  const ready=count===checks.length&&approval.checked&&leaderInitial&&leader.textContent.trim().length>1500&&annex.textContent.trim().length>1000;
  $('pdfLeader').disabled=!ready;$('pdfAnnex').disabled=!ready;
  if(!ready)result.classList.remove('show');
}
function restoreSaved(draft){
  if(!draft||draft.kind!=='LiquidityBoosterClubMarktplatzDraft'||draft.version!==1)return false;
  if(typeof draft.leader==='string'&&draft.leader.length>1000)leader.innerHTML=cleanHtml(draft.leader);
  if(typeof draft.annex==='string'&&draft.annex.length>1000)annex.innerHTML=cleanHtml(draft.annex);
  notes.value=typeof draft.notes==='string'?draft.notes.slice(0,30000):'';
  checks.forEach(c=>{c.checked=Array.isArray(draft.checks)&&draft.checks.includes(c.dataset.review)});
  approval.checked=false;
  updateGate();return true;
}
async function initialize(){
  const saved=readSaved();
  try{
    const response=await fetch('./club-leader.html',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const html=await response.text();
    const source=new DOMParser().parseFromString(html,'text/html');
    const original=source.querySelector('[data-contract-document] .contract');
    if(!original||original.textContent.trim().length<8000)throw new Error('Originalvertrag konnte nicht vollständig gelesen werden.');
    leaderInitial=cleanHtml(original.innerHTML);
    leader.innerHTML=leaderInitial;
    const restored=restoreSaved(saved);
    setStatus(restored?'Lokaler Entwurf wiederhergestellt. Bitte eine zusätzliche Entwurfsdatei sichern.':'Vollständige Arbeitskopie aus dem Original geladen. Änderungen bleiben auf dieser Seite.');
  }catch(e){
    if(saved&&restoreSaved(saved)){leaderInitial=leader.innerHTML;setStatus('Original gerade nicht erreichbar – gesicherten lokalen Entwurf geladen. Vor Freigabe mit dem Original abgleichen.');}
    else{leader.removeAttribute('contenteditable');leader.textContent='Fehler: Club-Leader-Original nicht vollständig verfügbar ('+(e.message||e)+'). Bitte später erneut laden. PDF-Ausgabe ist gesperrt.';setStatus('Originalvertrag nicht verfügbar. Die Anlage bleibt als Entwurf bearbeitbar.');}
  }
  loading=false;updateGate();
}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function exportDraft(){
  clearTimeout(saveTimer);saveNow();
  const payload={kind:'LiquidityBoosterClubMarktplatzDraft',version:1,savedAt:new Date().toISOString(),source:'pages/vertraege/club-leader.html',leader:cleanHtml(leader.innerHTML),annex:cleanHtml(annex.innerHTML),checks:checks.filter(x=>x.checked).map(x=>x.dataset.review),notes:notes.value};
  download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),'Club-Marktplatz-Vertragsentwurf-'+new Date().toISOString().slice(0,10)+'.json');
  setStatus('Entwurfsdatei exportiert. Die Freigabe muss nach erneutem Laden immer neu bestätigt werden.');
}
async function importDraft(file){
  if(!file)return;
  if(file.size>2_500_000){setStatus('Datei zu groß: maximal 2,5 MB.');return}
  try{
    const draft=JSON.parse(await file.text());
    if(draft.kind!=='LiquidityBoosterClubMarktplatzDraft'||draft.version!==1||typeof draft.leader!=='string'||typeof draft.annex!=='string')throw new Error('Keine gültige Entwurfsdatei.');
    if(!confirm('Den aktuellen lokalen Entwurf durch die ausgewählte Entwurfsdatei ersetzen?'))return;
    restoreSaved(draft);invalidate();saveNow();setStatus('Entwurfsdatei importiert. Bitte alle Inhalte und Prüfpunkte erneut kontrollieren.');
  }catch(e){setStatus('Import fehlgeschlagen: '+(e.message||e));}
  finally{$('importDraft').value=''}
}
function editableFromNode(node){return node?.closest?.('#leaderEditor,#annexEditor')||null}
for(const editor of [leader,annex]){
  editor.addEventListener('focusin',()=>{activeEditor=editor});
  editor.addEventListener('input',invalidate);
  editor.addEventListener('paste',e=>{
    const html=e.clipboardData?.getData('text/html');
    if(!html)return;
    e.preventDefault();
    const clean=cleanHtml(html);
    if(document.execCommand)document.execCommand('insertHTML',false,clean);
  });
}
document.querySelectorAll('[data-toolbar] button').forEach(btn=>{
  btn.addEventListener('mousedown',e=>e.preventDefault());
  btn.addEventListener('click',()=>{
    if(!activeEditor||!activeEditor.isContentEditable)return;
    activeEditor.focus();
    if(btn.dataset.block)document.execCommand('formatBlock',false,btn.dataset.block);
    else document.execCommand(btn.dataset.command,false,null);
    invalidate();
  });
});
checks.forEach(c=>c.addEventListener('change',invalidate));
notes.addEventListener('input',scheduleSave);
approval.addEventListener('change',()=>{error.textContent='';updateGate()});
$('exportDraft').addEventListener('click',exportDraft);
$('importDraftBtn').addEventListener('click',()=>$('importDraft').click());
$('importDraft').addEventListener('change',e=>importDraft(e.target.files?.[0]));
$('resetDraft').addEventListener('click',()=>{
  if(!confirm('Alle lokalen Bearbeitungen beider Dokumente, Prüfhäkchen und Notizen verwerfen? Bitte zuvor eine Entwurfsdatei sichern.'))return;
  clearTimeout(saveTimer);try{localStorage.removeItem(KEY)}catch(e){}
  leader.innerHTML=leaderInitial||'<p>Originalvertrag muss erneut geladen werden.</p>';
  annex.innerHTML=annexInitial;notes.value='';checks.forEach(c=>c.checked=false);approval.checked=false;
  setStatus('Auf Ausgangsfassung zurückgesetzt.');error.textContent='';updateGate();
});
async function createPdf(which){
  error.textContent='';result.classList.remove('show');
  updateGate();
  if($('pdfLeader').disabled||$('pdfAnnex').disabled){error.textContent='Bitte zuerst alle Prüfpunkte bearbeiten und die aktuelle Fassung ausdrücklich freigeben.';return}
  if(!window.FSAContractPdfEngine||window.FSAContractPdfEngine.version!=='FSA_CONTRACT_PDF_ENGINE_V2'){
    error.textContent='Die bestehende Vertrags-PDF-Engine konnte nicht geladen werden.';return;
  }
  const editor=which==='leader'?leader:annex;
  const filename=which==='leader'?'Club-Leader-Vereinbarung-ARBEITSFASSUNG.pdf':'Anlage-1-Club-Marktplatz-ARBEITSFASSUNG.pdf';
  const title=which==='leader'?'CLUB-LEADER-VEREINBARUNG · ARBEITSFASSUNG':'ANLAGE 1 · CLUB-MARKTPLATZ · ARBEITSFASSUNG';
  const btn=which==='leader'?$('pdfLeader'):$('pdfAnnex');
  btn.disabled=true;btn.textContent='PDF wird erstellt …';
  try{
    const pdf=await window.FSAContractPdfEngine.generate({root:editor,contentRoot:editor,fieldsRoot:$('pdfEmptyFields'),titleText:title,subtitleText:'ONLY INSIDE Software-Solution GmbH · Entwurf',logoUrl:document.body.dataset.pdfLogo,footerText:title,filename,autoDownload:true});
    result.textContent='PDF erzeugt: '+pdf.filename+' · '+pdf.pages+' Seiten. Vor Weitergabe bitte Vollständigkeit und Layout prüfen.';
    result.classList.add('show');
  }catch(e){error.textContent='PDF-Fehler: '+(e.message||e)}
  finally{btn.textContent=which==='leader'?'PDF A: Club-Leader-Vertrag':'PDF B: Anlage 1';updateGate()}
}
$('pdfLeader').addEventListener('click',()=>createPdf('leader'));
$('pdfAnnex').addEventListener('click',()=>createPdf('annex'));
window.addEventListener('beforeunload',()=>{if(!loading){clearTimeout(saveTimer);saveNow()}});
initialize();
})();