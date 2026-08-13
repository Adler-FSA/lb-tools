const CACHE='notfallakte-offline-v1-20260813';
const FILES=['./','./index.html','./install.html','./manifest.json','./offline-bootstrap.js','./v08-final.js','./demo-stress-test.js','./pdf-core.js','./pdf-core-canonical.js','./pdf-document-export-v3.js','./pdf-document-export.js','./pdf-pagination-v08.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request)))});
