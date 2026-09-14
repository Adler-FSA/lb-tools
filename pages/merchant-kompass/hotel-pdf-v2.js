(()=>{
'use strict';
/* HOTEL_PDF_V2_LOADER + FSA NAMED PDF HANDOFF
   Lädt den bestehenden Hotel-PDF-Adapter.
   Die PDF wird von der FSA_CONTRACT_PDF_ENGINE_V2 lokal erzeugt.
   Danach wird der benannte Download exakt nach dem bewährten FSA PDF-Core-V3-
   Prinzip vorbereitet: echter PDF-Blob, download-Dateiname, Dokumenttitel,
   application-name und synchrones Reassert beim Klick.
   Kein Druckdialog, kein Browser-Druck-PDF.
*/

let originalTitle=document.title;
function applyPdfIdentity(filename){
  if(!filename)return;
  const base=filename.replace(/\.pdf$/i,'');
  document.title=base;
  document.documentElement.setAttribute('data-fsa-pdf-filename',filename);
  try{sessionStorage.setItem('fsa_hotel_pdf_filename',filename)}catch{}
  let meta=document.querySelector('meta[name="application-name"]');
  if(!meta){meta=document.createElement('meta');meta.name='application-name';document.head.appendChild(meta)}
  meta.content=base;
}

function wireNamedPdfHandoff(){
  const link=document.getElementById('pdfDownloadLink');
  if(!link||link.dataset.fsaNamedHandoff==='1')return;
  const filename=(link.getAttribute('download')||'').trim();
  if(!filename)return;
  link.dataset.fsaNamedHandoff='1';
  link.setAttribute('type','application/pdf');
  applyPdfIdentity(filename);
  link.addEventListener('click',()=>applyPdfIdentity(filename));
}

const core=document.createElement('script');
core.src='./hotel-pdf-v2-core.js?v=4';
core.onload=()=>{
  const state=document.getElementById('pdfState');
  if(state)new MutationObserver(wireNamedPdfHandoff).observe(state,{childList:true});
  wireNamedPdfHandoff();
};
core.onerror=()=>console.error('Hotel PDF Core konnte nicht geladen werden.');
document.head.appendChild(core);

window.addEventListener('pagehide',()=>{
  if(document.documentElement.getAttribute('data-fsa-pdf-filename')){
    document.title=originalTitle;
    document.documentElement.removeAttribute('data-fsa-pdf-filename');
  }
});
})();
