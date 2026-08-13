(()=>{
'use strict';
/* FSA_PDF_CORE_V2
   Fester FSA-Basisbaustein fuer Dateiname UND echte PDF-Dateierzeugung.
   Pagination, Demo, Excel, JSON und UI duerfen diesen Baustein nicht ersetzen
   oder umgehen. window.print() wird innerhalb der Notfallakte bewusst auf den
   lokalen PDF-Dokumentexport umgeleitet, damit keine Browser-URL oder fremde
   Browser-Kopf-/Fusszeilen in die Endfassung gelangen. */
const CORE_VERSION='FSA_PDF_CORE_V2';
let originalTitle=null,activeFilename='',restoreTimer=null,exporterPromise=null;
const safeName=s=>(String(s||'notfallakte').trim().replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g,'-').replace(/^-+|-+$/g,'')||'notfallakte');
const stamp=(d=new Date())=>{const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`};
const buildFilename=({demo=false,owner='',date=new Date()}={})=>`${demo?'DEMO-':''}Notfallakte-${safeName(owner)}-${stamp(date)}.pdf`;
function applyTitle(filename){
  activeFilename=filename;
  if(originalTitle===null)originalTitle=document.title;
  const base=filename.replace(/\.pdf$/i,'');
  document.title=base;
  document.documentElement.setAttribute('data-fsa-pdf-filename',filename);
  try{sessionStorage.setItem('fsa_notfallakte_pdf_filename',filename)}catch{}
  let meta=document.querySelector('meta[name="application-name"]');
  if(!meta){meta=document.createElement('meta');meta.name='application-name';document.head.appendChild(meta)}
  meta.content=base;
  return base;
}
function prepare(opts={}){clearTimeout(restoreTimer);const filename=buildFilename(opts);applyTitle(filename);return{filename,base:filename.replace(/\.pdf$/i,''),version:CORE_VERSION}}
function reassert(){if(activeFilename)applyTitle(activeFilename)}
function markPrintDialogClosed(){clearTimeout(restoreTimer);restoreTimer=setTimeout(restore,20000)}
function restore(){clearTimeout(restoreTimer);if(originalTitle!==null)document.title=originalTitle;originalTitle=null;activeFilename='';document.documentElement.removeAttribute('data-fsa-pdf-filename')}
function showBox(title,text='',file=''){
  const box=document.getElementById('v08ActionBox');if(!box)return;
  box.className='v08ActionBox show';
  const t=document.getElementById('v08ActionTitle'),x=document.getElementById('v08ActionText'),f=document.getElementById('v08ActionFile');
  if(t)t.textContent=title;if(x)x.textContent=text;if(f){f.style.display=file?'block':'none';f.textContent=file||''}
}
function ensureExporter(){
  if(window.NotfallaktePdfExport)return Promise.resolve(window.NotfallaktePdfExport);
  if(exporterPromise)return exporterPromise;
  exporterPromise=new Promise((resolve,reject)=>{
    const old=document.querySelector('script[data-fsa-pdf-export]');if(old){old.addEventListener('load',()=>resolve(window.NotfallaktePdfExport),{once:true});old.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.src='./pdf-document-export.js';s.async=true;s.dataset.fsaPdfExport='1';s.onload=()=>window.NotfallaktePdfExport?resolve(window.NotfallaktePdfExport):reject(new Error('PDF-Engine wurde geladen, ist aber nicht verfügbar.'));s.onerror=()=>reject(new Error('PDF-Engine konnte nicht geladen werden.'));document.head.appendChild(s)
  });
  return exporterPromise;
}
async function saveFile(blob,name){
  const file=new File([blob],name,{type:'application/pdf',lastModified:Date.now()});
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(ios&&navigator.share&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:name});return 'share'}catch(err){if(err?.name==='AbortError')return 'cancel';throw err}
  }
  const a=document.createElement('a'),u=URL.createObjectURL(file);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);return 'download'
}
async function generatedPrint(){
  const filename=activeFilename||buildFilename({demo:typeof demoMode!=='undefined'&&!!demoMode,owner:typeof state!=='undefined'?state.owner:''});applyTitle(filename);
  try{
    const engine=await ensureExporter();
    showBox('PDF wird erzeugt','Die Notfallakte wird lokal Seite für Seite als eigenständige PDF-Datei aufgebaut. Browser-URL und Browser-Kopf-/Fußzeilen gehören nicht zur Datei.',filename);
    const result=await engine.generate({filename,onProgress:(done,total)=>{if(done===1||done===total||done%10===0)showBox(`PDF wird erzeugt – ${done} von ${total} Seiten`,'Die Datei wird vollständig lokal auf diesem Gerät erstellt.',filename)}});
    const mode=await saveFile(result.blob,filename);
    try{window.dispatchEvent(new Event('afterprint'))}catch{}
    setTimeout(()=>{if(mode==='cancel')showBox('PDF wurde erzeugt – Speichern noch offen','Die PDF wurde vollständig erstellt, aber das Speichern/Teilen wurde abgebrochen. Starte die PDF-Erstellung erneut, um sie abzulegen.',filename);else showBox('✓ PDF wurde erstellt',`Die Notfallakte wurde als eigenständige PDF-Datei mit ${result.pages} Seiten erzeugt. Keine Browser-URL und keine Browser-Kopf-/Fußzeilen wurden eingebaut.`,filename)},40);
  }catch(err){console.error(err);showBox('PDF konnte nicht erstellt werden',err?.message||'Unbekannter Fehler bei der PDF-Erzeugung.',filename)}
}
window.addEventListener('beforeprint',reassert);
window.NotfallaktePdfCore=Object.freeze({version:CORE_VERSION,buildFilename,prepare,reassert,markPrintDialogClosed,restore,printDelay:320,ensureExporter});
/* Kritischer Schutzpunkt: Der bestehende V08-Button darf window.print() weiterhin
   aufrufen; ab hier bedeutet dieser Aufruf aber immer echte lokale PDF-Erzeugung. */
window.print=generatedPrint;
ensureExporter().catch(()=>{});
})();
