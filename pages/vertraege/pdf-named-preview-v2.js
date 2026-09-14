(()=>{
'use strict';
/* FSA_NAMED_PDF_PREVIEW_V2
   Bereitet eine von der FSA-PDF-Engine erzeugte PDF als gleich-originige,
   benannte Vorschau-Ressource fuer Safari/iPadOS vor.
   V2 materialisiert echte PDF-Bytes, validiert Header/EOF und gibt den Link
   erst nach einem erfolgreichen Range-Selbsttest frei.
*/
const VERSION='FSA_NAMED_PDF_PREVIEW_V2';
const CACHE_NAME='fsa-named-pdf-preview-v2';
const PREFIX='/__fsa_pdf_preview_v2__/';
const SW='/pdf-preview-sw-v2.js';
let swReadyPromise=null;

function safeFilename(name){
  let s=String(name||'Dokument.pdf').replace(/[\r\n\0]/g,'').replace(/[\\/:*?"<>|]+/g,'-').trim();
  if(!/\.pdf$/i.test(s))s+='.pdf';
  return s||'Dokument.pdf';
}
function asciiFallback(name){
  return safeFilename(name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'-').replace(/["\\]/g,'-');
}
function disposition(name){
  const safe=safeFilename(name),fallback=asciiFallback(safe);
  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}
function token(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  const a=new Uint8Array(16);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function waitActivated(reg){
  const worker=reg.installing||reg.waiting||reg.active;
  if(!worker)return;
  if(worker.state==='activated')return;
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('PDF-Vorschau-Service konnte nicht aktiviert werden.')),10000);
    const done=()=>{if(worker.state==='activated'){clearTimeout(timer);worker.removeEventListener('statechange',done);resolve()}};
    worker.addEventListener('statechange',done);done();
  });
}
async function ensureServiceWorker(){
  if(!('serviceWorker' in navigator))throw new Error('Dieser Browser unterstuetzt die benannte PDF-Vorschau nicht.');
  if(swReadyPromise)return swReadyPromise;
  swReadyPromise=(async()=>{
    const reg=await navigator.serviceWorker.register(SW,{scope:'/',updateViaCache:'none'});
    try{await reg.update()}catch{}
    await waitActivated(reg);
    if(!navigator.serviceWorker.controller || !navigator.serviceWorker.controller.scriptURL.endsWith(SW)){
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('PDF-Vorschau-Service hat die Seite nicht uebernommen.')),10000);
        const check=()=>{
          const c=navigator.serviceWorker.controller;
          if(c&&c.scriptURL.endsWith(SW)){clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',check);resolve()}
        };
        navigator.serviceWorker.addEventListener('controllerchange',check);check();
      });
    }
    return reg;
  })();
  try{return await swReadyPromise}catch(err){swReadyPromise=null;throw err}
}
async function sourceBlob(opts){
  if(opts.file instanceof Blob)return opts.file;
  if(opts.blob instanceof Blob)return opts.blob;
  if(opts.sourceUrl){
    const r=await fetch(opts.sourceUrl,{cache:'no-store'});
    if(!r.ok)throw new Error('Erzeugte PDF konnte nicht uebernommen werden (HTTP '+r.status+').');
    return await r.blob();
  }
  throw new Error('Es wurde keine erzeugte PDF uebergeben.');
}
function validatePdf(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<64)throw new Error('Die erzeugte PDF ist leer oder unvollstaendig.');
  const head=new TextDecoder('latin1').decode(bytes.slice(0,5));
  if(head!=='%PDF-')throw new Error('Die erzeugte Datei ist keine gueltige PDF.');
  const tail=new TextDecoder('latin1').decode(bytes.slice(Math.max(0,bytes.length-2048)));
  if(!tail.includes('%%EOF'))throw new Error('Die erzeugte PDF wurde nicht vollstaendig abgeschlossen.');
}
async function verifyNamedUrl(url,expectedLength){
  const head=await fetch(url,{method:'HEAD',cache:'no-store'});
  if(!head.ok)throw new Error('PDF-Vorschau konnte nicht verifiziert werden (HEAD '+head.status+').');
  const reported=Number(head.headers.get('Content-Length')||0);
  if(reported&&reported!==expectedLength)throw new Error('PDF-Vorschau hat eine falsche Dateigroesse.');
  const test=await fetch(url,{headers:{Range:'bytes=0-4'},cache:'no-store'});
  if(test.status!==206)throw new Error('PDF-Vorschau unterstuetzt den benoetigten Byte-Range-Abruf nicht.');
  const b=new Uint8Array(await test.arrayBuffer());
  const sig=new TextDecoder('latin1').decode(b);
  if(sig!=='%PDF-')throw new Error('PDF-Vorschau liefert keine gueltigen PDF-Daten.');
}
async function prepare(opts={}){
  const filename=safeFilename(opts.filename);
  const blob=await sourceBlob(opts);
  const bytes=new Uint8Array(await blob.arrayBuffer());
  validatePdf(bytes);
  await ensureServiceWorker();
  const path=`${PREFIX}${token()}/${encodeURIComponent(filename)}`;
  const url=new URL(path,location.origin).href;
  const cache=await caches.open(CACHE_NAME);
  await cache.put(url,new Response(bytes,{status:200,headers:{
    'Content-Type':'application/pdf',
    'Content-Disposition':disposition(filename),
    'Cache-Control':'no-store',
    'Accept-Ranges':'bytes',
    'Content-Length':String(bytes.byteLength),
    'X-FSA-PDF-Filename':filename,
    'X-FSA-PDF-Version':VERSION
  }}));
  await verifyNamedUrl(url,bytes.byteLength);
  return{url,filename,bytes:bytes.byteLength,version:VERSION};
}
window.FSAPdfNamedPreview=Object.freeze({version:VERSION,prepare});
})();
