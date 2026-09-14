(()=>{
'use strict';
/* HOTEL_PDF_V2_LOADER
   PDF-Erzeugung: FSA_CONTRACT_PDF_ENGINE_V2 + hotel-pdf-v2-core.js.
   PDF-Ausgabe: FSA_PDF_NAMED_PREVIEW_V1.
   Der fertige PDF-Blob wird NICHT direkt als blob:/file:-URL geöffnet. Vor der
   Freigabe des Buttons wird er unter einer gleichnamigen HTTPS-Vorschau-URL
   bereitgestellt, damit iPad/Safari den echten Dateinamen behält.
*/

async function prepareNamedLink(){
  const link=document.getElementById('pdfDownloadLink');
  if(!link||link.dataset.namedPreviewState)return;
  const filename=(link.getAttribute('download')||'').trim();
  const sourceUrl=link.href;
  if(!filename||!sourceUrl)return;

  link.dataset.namedPreviewState='preparing';
  link.setAttribute('aria-disabled','true');
  link.style.pointerEvents='none';
  const originalText=link.textContent||'PDF herunterladen / speichern';
  link.textContent='PDF-Vorschau wird vorbereitet …';

  try{
    if(!window.FSAPdfNamedPreview)throw new Error('FSA PDF Preview Layer wurde nicht geladen.');
    const out=await window.FSAPdfNamedPreview.prepare({sourceUrl,filename});
    link.href=out.url;
    link.removeAttribute('download');
    link.setAttribute('target','_blank');
    link.setAttribute('rel','noopener');
    link.setAttribute('type','application/pdf');
    link.removeAttribute('aria-disabled');
    link.style.pointerEvents='';
    link.textContent=originalText;
    link.dataset.namedPreviewState='ready';
  }catch(err){
    console.error('Hotel PDF named preview',err);
    link.dataset.namedPreviewState='error';
    link.textContent='PDF-Vorschau konnte nicht bereitgestellt werden';
    const state=document.getElementById('pdfState');
    if(state){
      const hint=document.createElement('div');
      hint.className='pdfHint';
      hint.textContent='Die PDF wurde erzeugt, aber die benannte Vorschau konnte nicht vorbereitet werden. Bitte die Seite neu laden und erneut erstellen.';
      state.appendChild(hint);
    }
  }
}

function wireObserver(){
  const state=document.getElementById('pdfState');
  if(state)new MutationObserver(prepareNamedLink).observe(state,{childList:true,subtree:true});
  prepareNamedLink();
}

function loadCore(){
  const core=document.createElement('script');
  core.src='./hotel-pdf-v2-core.js?v=6';
  core.onload=wireObserver;
  core.onerror=()=>console.error('Hotel PDF Core konnte nicht geladen werden.');
  document.head.appendChild(core);
}

const delivery=document.createElement('script');
delivery.src='../vertraege/pdf-named-preview-v1.js?v=1';
delivery.onload=loadCore;
delivery.onerror=()=>console.error('FSA PDF Preview Layer konnte nicht geladen werden.');
document.head.appendChild(delivery);
})();
