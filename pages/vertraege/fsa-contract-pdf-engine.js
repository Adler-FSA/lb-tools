(()=>{
'use strict';
/* Kompatibilitäts-Adapter für die erste Vertragsseite.
   Er enthält keine Vertragstexte und ignoriert übergebene PDF-Blocks vollständig.
   Die PDF-Quelle ist ausschließlich der aktuell gerenderte HTML-Vertrag plus Nutzereingaben.
*/
const VERSION='FSA_CONTRACT_PDF_ENGINE_V1';
let loader=null;
function safeFilePart(v){return String(v||'').trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^[-.]+|[-.]+$/g,'')||'Vertrag'}
function loadEngine(){
  if(window.FSAContractPdfEngine)return Promise.resolve(window.FSAContractPdfEngine);
  if(loader)return loader;
  loader=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='./contract-pdf-engine-v1.js?v=1';
    s.onload=()=>window.FSAContractPdfEngine?resolve(window.FSAContractPdfEngine):reject(new Error('Vertrags-PDF-Engine wurde nicht initialisiert.'));
    s.onerror=()=>reject(new Error('Vertrags-PDF-Engine konnte nicht geladen werden.'));
    document.head.appendChild(s);
  });
  return loader;
}
async function generate(opts={}){
  const engine=await loadEngine();
  const blank=/-Leer\.pdf$/i.test(String(opts.filename||''))||/-Blank\.pdf$/i.test(String(opts.filename||''));
  const controls=[...document.querySelectorAll('input,textarea,select')];
  const snapshot=blank?controls.map(el=>({el,value:el.value,checked:el.checked})):null;
  try{
    if(blank){
      controls.forEach(el=>{
        if(el.type==='checkbox'||el.type==='radio')el.checked=false;
        else el.value='';
      });
      const p=document.getElementById('partyPreview');
      if(p)p.textContent=document.documentElement.lang==='en'?'the Club Partner entered below':'dem unten eingetragenen Club Partner';
    }
    return await engine.generate({
      contentRoot:'.paper',
      fieldsRoot:'#partnerForm',
      fieldsTitle:document.querySelector('#partnerForm h2')?.textContent||'Vertragsdaten',
      footerText:opts.footerLeft||document.title,
      filename:opts.filename||safeFilePart(document.title)+'.pdf'
    });
  }finally{
    if(snapshot){
      snapshot.forEach(x=>{x.el.value=x.value;x.el.checked=x.checked});
      const form=document.getElementById('partnerForm');
      const p=document.getElementById('partyPreview');
      if(form&&p){
        const fd=new FormData(form);
        const text=[fd.get('company'),fd.get('fullName'),fd.get('street'),fd.get('city'),fd.get('country')].filter(Boolean).join(' · ');
        p.textContent=text||(document.documentElement.lang==='en'?'the Club Partner entered below':'dem unten eingetragenen Club Partner');
      }
    }
  }
}
window.FsaContractPdf=Object.freeze({version:VERSION,safeFilePart,generate});
})();
