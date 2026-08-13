(()=>{
'use strict';
/* FSA_PDF_FILENAME_CORE_V1
   Fester FSA-Basisbaustein. Pagination, Demo, Excel, JSON und UI duerfen
   diese Dateinamenslogik nicht ersetzen oder umgehen. */
const CORE_VERSION='FSA_PDF_FILENAME_CORE_V1';
let originalTitle=null,activeFilename='',restoreTimer=null;
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
window.addEventListener('beforeprint',reassert);
window.NotfallaktePdfCore=Object.freeze({version:CORE_VERSION,buildFilename,prepare,reassert,markPrintDialogClosed,restore,printDelay:320});
})();
