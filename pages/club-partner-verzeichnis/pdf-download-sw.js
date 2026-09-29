/* LiquidityBooster Einladungskarten · benannte PDF-Ausgabe
 * Liefert lokal erzeugte PDF-Bytes über eine echte Same-Origin-URL.
 * Dadurch bestimmt Content-Disposition den Dateinamen statt einer blob:-UUID.
 */
'use strict';

const CACHE='lb-invitation-pdf-download-v1';
const PREFIX='/pages/club-partner-verzeichnis/__invite_pdf__/';

self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

function baseHeaders(cached,total){
  const h=new Headers(cached.headers);
  h.set('Content-Type','application/pdf');
  h.set('Cache-Control','no-store');
  h.set('Accept-Ranges','bytes');
  h.set('Content-Length',String(total));
  return h;
}

function parseRange(value,total){
  if(!value||!/^bytes=/i.test(value))return null;
  const spec=value.replace(/^bytes=/i,'').trim();
  if(spec.includes(','))return null;
  const m=spec.match(/^(\d*)-(\d*)$/);
  if(!m)return null;
  let start,end;
  if(m[1]===''&&m[2]!==''){
    const suffix=Number(m[2]);
    if(!Number.isFinite(suffix)||suffix<=0)return {invalid:true};
    start=Math.max(0,total-suffix);
    end=total-1;
  }else{
    start=Number(m[1]);
    if(!Number.isFinite(start)||start<0)return {invalid:true};
    end=m[2]===''?total-1:Number(m[2]);
    if(!Number.isFinite(end)||end<start)return {invalid:true};
    end=Math.min(end,total-1);
  }
  if(start>=total)return {invalid:true};
  return {start,end};
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);

  if(
    url.origin!==self.location.origin ||
    !url.pathname.startsWith(PREFIX) ||
    !['GET','HEAD'].includes(req.method)
  ) return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(url.href,{ignoreSearch:false});

    if(!cached){
      return new Response('Diese PDF ist nicht mehr vorhanden. Bitte auf der Einladungskarten-Seite erneut erstellen.',{
        status:404,
        headers:{
          'Content-Type':'text/plain; charset=utf-8',
          'Cache-Control':'no-store'
        }
      });
    }

    const bytes=new Uint8Array(await cached.arrayBuffer());
    const total=bytes.byteLength;
    const headers=baseHeaders(cached,total);

    if(req.method==='HEAD')return new Response(null,{status:200,headers});

    const raw=req.headers.get('Range');
    if(!raw)return new Response(bytes,{status:200,headers});

    const r=parseRange(raw,total);
    if(!r)return new Response(bytes,{status:200,headers});

    if(r.invalid){
      const h=new Headers(headers);
      h.set('Content-Range',`bytes */${total}`);
      h.set('Content-Length','0');
      return new Response(null,{status:416,headers:h});
    }

    const chunk=bytes.slice(r.start,r.end+1);
    const h=new Headers(headers);
    h.set('Content-Range',`bytes ${r.start}-${r.end}/${total}`);
    h.set('Content-Length',String(chunk.byteLength));

    return new Response(chunk,{status:206,headers:h});
  })());
});