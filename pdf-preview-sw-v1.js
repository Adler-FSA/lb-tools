/* FSA_NAMED_PDF_PREVIEW_SW_V1
   Serves only locally generated PDF preview URLs from Cache Storage.
   All other requests pass through untouched.
*/
'use strict';
const CACHE_NAME='fsa-named-pdf-preview-v1';
const PREFIX='/__fsa_pdf_preview__/';

self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(PREFIX))return;

  event.respondWith((async()=>{
    const cached=await caches.match(event.request,{ignoreSearch:false});
    if(cached)return cached;
    return new Response('PDF-Vorschau ist nicht mehr verfügbar. Bitte die PDF auf der Ausgangsseite erneut erstellen.',{
      status:404,
      headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}
    });
  })());
});
