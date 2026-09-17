/* Hotel-PDF-Ausgabe: lokale, benannte Datei statt blob:-UUID.
 * Kein Upload, kein Fremddienst, keine Veraenderung am freigegebenen PDF-Master.
 * Greift ausschliesslich auf /__hotel_pdf__/ im eigenen Ordner zu. */
'use strict';
const CACHE='lb-hotel-pdf-delivery-v1';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  const prefix=new URL('./__hotel_pdf__/',self.registration.scope).pathname;
  if(url.origin!==self.location.origin||!url.pathname.startsWith(prefix)||event.request.method!=='GET')return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const saved=await cache.match(event.request.url);
    if(!saved)return new Response('Diese PDF ist nicht mehr vorhanden. Bitte auf der Hotel-Seite erneut erstellen.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    const range=event.request.headers.get('Range');
    if(!range)return saved;
    const match=/^bytes=(\d+)-(\d*)$/.exec(range.trim());
    if(!match)return saved;
    const all=await saved.arrayBuffer();
    const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),all.byteLength-1):all.byteLength-1;
    if(start>=all.byteLength||end<start)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+all.byteLength}});
    const headers=new Headers(saved.headers);
    headers.set('Content-Range',`bytes ${start}-${end}/${all.byteLength}`);
    headers.set('Content-Length',String(end-start+1));
    headers.set('Accept-Ranges','bytes');
    return new Response(all.slice(start,end+1),{status:206,headers});
  })());
});
