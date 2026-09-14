(()=>{
'use strict';
/* HOTEL_PDF_PREVIEW_WRAPPER
   Lädt den bestehenden Hotel-PDF-Adapter unverändert und schaltet den
   fertigen PDF-Link auf direkte Ansicht statt Browser-Download um.
*/
const core=document.createElement('script');
core.src='./hotel-pdf-v2-core.js?v=1';
core.onload=()=>{
  const tunePreviewLink=()=>{
    const link=document.getElementById('pdfDownloadLink');
    if(!link)return;
    link.removeAttribute('download');
    link.setAttribute('target','_blank');
    link.setAttribute('rel','noopener');
    link.textContent='PDF ansehen / öffnen';
  };
  const state=document.getElementById('pdfState');
  if(state)new MutationObserver(tunePreviewLink).observe(state,{childList:true,subtree:true});
  tunePreviewLink();
};
core.onerror=()=>console.error('Hotel PDF Core konnte nicht geladen werden.');
document.head.appendChild(core);
})();
