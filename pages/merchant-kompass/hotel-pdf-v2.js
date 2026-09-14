(()=>{
'use strict';
/* HOTEL_PDF_V2_LOADER + FSA NAMED PDF PREVIEW V2
   Die Hotel-PDF wird weiterhin ausschliesslich durch FSA_CONTRACT_PDF_ENGINE_V2
   aus den aktuellen Seiteninhalten und Eingaben erzeugt.
   Danach materialisiert FSA_NAMED_PDF_PREVIEW_V2 die echten PDF-Bytes und gibt
   erst nach erfolgreichem HEAD-/Range-Selbsttest die benannte Vorschau frei.
   Kein window.print(), kein Browser-Druck-PDF, kein anonymer file:///UUID-Link.
*/
const delivery=document.createElement('script');
delivery.src='../vertraege/pdf-named-preview-v2.js?v=1';
delivery.onload=()=>{
  const core=document.createElement('script');
  core.src='./hotel-pdf-v2-core.js?v=6';
  core.onload=()=>{
    const state=document.getElementById('pdfState');
    let busy=false;
    async function convertDownloadToNamedPreview(){
      if(busy)return;
      const link=document.getElementById('pdfDownloadLink');
      if(!link||link.dataset.fsaNamedPreview==='2'||link.dataset.fsaNamedPreview==='pending')return;
      const filename=(link.getAttribute('download')||'').trim();
      const sourceUrl=link.href;
      if(!filename||!sourceUrl||!window.FSAPdfNamedPreview)return;
      busy=true;
      link.dataset.fsaNamedPreview='pending';
      link.textContent='PDF-Vorschau wird vorbereitet ...';
      link.style.pointerEvents='none';
      link.style.opacity='.7';
      try{
        const prepared=await window.FSAPdfNamedPreview.prepare({sourceUrl,filename});
        link.href=prepared.url;
        link.removeAttribute('download');
        link.dataset.fsaNamedPreview='2';
        link.textContent='PDF herunterladen / speichern';
        link.style.pointerEvents='';
        link.style.opacity='';
        link.setAttribute('type','application/pdf');
        link.setAttribute('target','_blank');
        link.setAttribute('rel','noopener');
      }catch(err){
        console.error('FSA named PDF preview V2',err);
        link.dataset.fsaNamedPreview='error';
        link.textContent='PDF-Vorschau konnte nicht vorbereitet werden';
        link.style.pointerEvents='none';
        link.style.opacity='.7';
        const hint=document.createElement('div');
        hint.className='pdfHint';
        hint.textContent='Die erzeugte PDF wurde aus Sicherheitsgruenden nicht freigegeben: '+(err?.message||String(err));
        link.insertAdjacentElement('afterend',hint);
      }finally{busy=false}
    }
    if(state)new MutationObserver(()=>{convertDownloadToNamedPreview()}).observe(state,{childList:true});
    convertDownloadToNamedPreview();
  };
  core.onerror=()=>console.error('Hotel PDF Core konnte nicht geladen werden.');
  document.head.appendChild(core);
};
delivery.onerror=()=>console.error('FSA Named PDF Preview V2 konnte nicht geladen werden.');
document.head.appendChild(delivery);
})();
