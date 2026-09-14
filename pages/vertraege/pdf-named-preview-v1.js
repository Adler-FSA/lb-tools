(()=>{
'use strict';
/* FSA_PDF_NAMED_PREVIEW_V1
   Standard delivery layer for locally generated PDFs.
   It keeps the PDF generation local, but exposes the finished file under a
   same-origin URL that contains the real filename. This avoids iPad/Safari
   blob/file UUID names in PDF preview and save flows.
*/
const VERSION='FSA_PDF_NAMED_PREVIEW_V1';
const CACHE_NAME='fsa-named-pdf-preview-v1';
const SW_URL='/pdf-preview-sw-v1.js';
const PREFIX='/__fsa_pdf_preview__/';
let swPromise=null;

function asciiFallback(filename){
  return String(filename||'Dokument.pdf')
    .replace(/ß/g,'ss').replace(/ẞ/g,'SS')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\x20-\x7E]/g,'-')
    .replace(/["\\]/g,'-');
}
function safeFilename(filename){
  const f=String(filename||'Dokument.pdf').trim().replace(/[\\/:*?"<>|]+/g,'-');
  return /\.pdf$/i.test(f)?f:(f+'.pdf');
}
async function ensureServiceWorker(){
  if(!('serviceWorker' in navigator))throw new Error('Dieser Browser unterstützt die benannte PDF-Vorschau nicht.');
  if(!('caches' in window))throw new Error('Cache Storage für die PDF-Vorschau ist nicht verfügbar.');
  if(!swPromise){
    swPromise=(async()=>{
      const reg=await navigator.serviceWorker.register(SW_URL,{scope:'/',updateViaCache:'none'});
      try{await reg.update()}catch{}
      await navigator.serviceWorker.ready;
      if(reg.installing){
        await new Promise(resolve=>{
          const w=reg.installing;
          const done=()=>{if(w.state==='activated'||w.state==='redundant')resolve()};
          w.addEventListener('statechange',done);
          done();
        });
      }
      return reg;
    })().catch(err=>{swPromise=null;throw err});
  }
  return swPromise;
}
async function blobFromInput({blob,file,sourceUrl}){
  const direct=file||blob;
  if(direct instanceof Blob)return direct;
  if(sourceUrl){
    const r=await fetch(sourceUrl);
    if(!r.ok)throw new Error('Die erzeugte PDF konnte nicht für die Vorschau übernommen werden.');
    return await r.blob();
  }
  throw new Error('Keine erzeugte PDF zum Bereitstellen gefunden.');
}
async function prepare(input={}){
  const filename=safeFilename(input.filename);
  const pdfBlob=await blobFromInput(input);
  await ensureServiceWorker();

  const cache=await caches.open(CACHE_NAME);
  const old=await cache.keys();
  await Promise.all(old.map(req=>cache.delete(req)));

  const token=(globalThis.crypto?.randomUUID?.()||(`${Date.now()}-${Math.random().toString(16).slice(2)}`));
  const url=new URL(`${PREFIX}${encodeURIComponent(token)}/${encodeURIComponent(filename)}`,location.origin).href;
  const fallback=asciiFallback(filename);
  const headers=new Headers({
    'Content-Type':'application/pdf',
    'Content-Disposition':`inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'Cache-Control':'no-store, max-age=0',
    'Pragma':'no-cache'
  });
  await cache.put(url,new Response(pdfBlob,{status:200,headers}));
  return Object.freeze({url,filename,version:VERSION});
}

window.FSAPdfNamedPreview=Object.freeze({version:VERSION,prepare});
})();
