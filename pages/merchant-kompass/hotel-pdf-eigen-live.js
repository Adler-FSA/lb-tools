/* Hotel-Hauptseite: nur Ausgabe der freigegebenen Master-PDF mit Dateinamen.
 * PDF-Generator, Hotel-HTML und Rechner bleiben unveraendert.
 * Keine Vorschau, kein Druckdialog, kein externer PDF-Dienst.
 */
(()=>{'use strict';
const params=new URLSearchParams(location.search);
if(params.has('pdf-design-test')||params.has('final-suite'))return;
const $=id=>document.getElementById(id);
const CACHE='lb-hotel-pdf-delivery-v1';
let fallbackUrl='',fallbackFile=null,busy=false;
function feedback(message,error=false){const status=$('pdfState');if(!status)return;status.className='pdfState show '+(error?'error':'generating');status.textContent=message;}
function timeout(p,ms){return Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(Error('Benannte PDF-Ausgabe nicht rechtzeitig bereit.')),ms))]);}
// Bestehende, vom Nutzer erfolgreich getestete Ausgabe mit echtem Dateinamen.
async function namedDelivery(out){
 if(!('serviceWorker' in navigator)||!('caches' in window))throw Error('Lokale Dateiausgabe wird von diesem Browser nicht unterstuetzt.');
 const registration=await timeout(navigator.serviceWorker.register('./hotel-pdf-delivery-sw.js?v=20260917-1',{scope:'./',updateViaCache:'none'}),7500);
 await timeout(navigator.serviceWorker.ready,7500);
 const ours=()=>navigator.serviceWorker.controller?.scriptURL?.includes('hotel-pdf-delivery-sw.js');
 if(!ours())await timeout(new Promise(resolve=>{
   const changed=()=>{if(ours()){navigator.serviceWorker.removeEventListener('controllerchange',changed);resolve();}};
   navigator.serviceWorker.addEventListener('controllerchange',changed);changed();
 }),7500);
 if(!registration.active||!ours())throw Error('Benannte PDF-Ausgabe wurde nicht aktiviert.');
 const filename=out.filename;
 if(!/^[A-Za-z0-9_.-]+\.pdf$/.test(filename))throw Error('Hotel-PDF-Dateiname ist nicht sicher.');
 const base=new URL('./__hotel_pdf__/'+encodeURIComponent(filename),location.href);
 base.searchParams.set('id',Date.now()+'-'+Math.random().toString(36).slice(2));
 const preview=new URL(base.href),download=new URL(base.href);
 preview.searchParams.set('mode','preview');download.searchParams.set('mode','download');
 const cache=await caches.open(CACHE);
 const headers=(mode)=>({'Content-Type':'application/pdf','Content-Disposition':mode+'; filename="'+filename+'"','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'});
 await cache.put(preview.href,new Response(out.blob,{headers:headers('inline')}));
 await cache.put(download.href,new Response(out.blob,{headers:headers('attachment')}));
 const check=await timeout(fetch(preview.href,{cache:'no-store'}),7500);
 if(!check.ok||!check.headers.get('Content-Disposition')?.includes(filename))throw Error('Dateipfad konnte nicht geprueft werden.');
 const old=await cache.keys();
 await Promise.all(old.filter(r=>r.url!==preview.href&&r.url!==download.href).map(r=>cache.delete(r)));
 return{download:download.href,named:true};
}
function init(){
 const panel=$('pdfPanel'),original=$('pdfBtn');if(!panel||!original||!$('pdfState'))return;
 const label=panel.querySelector('.miniLabel'),heading=panel.querySelector('.pdfCopy h3'),lead=panel.querySelector('.pdfCopy p');
 if(label)label.textContent='Ihre persoenliche Gespraechsunterlage';
 if(heading)heading.textContent='Ihre Hotel-Auswertung als PDF';
 if(lead)lead.textContent='Gespraechswerte eingeben, PDF erstellen und mit Dateinamen speichern.';
 const btn=original.cloneNode(true);btn.textContent='PDF erstellen';btn.disabled=true;original.replaceWith(btn);
 const result=document.createElement('div');result.id='hotelPdfMasterResult';result.className='result';
 result.innerHTML='<strong>Ihre PDF ist fertig.</strong><div class="file" id="hotelPdfFilename"></div><div class="links"><a class="action" id="hotelPdfDownload" type="application/pdf">PDF herunterladen / speichern</a></div><div class="file" id="hotelPdfSaveHint" hidden></div>';
 panel.appendChild(result);
 const style=document.createElement('style');style.textContent=`
 #hotelPdfMasterResult{display:none;padding:14px 18px;background:#fff;border:1px solid #dbe5e9;border-radius:17px;margin:12px 24px 24px;color:#263545}
 #hotelPdfMasterResult.show{display:block}#hotelPdfMasterResult [hidden]{display:none!important}#hotelPdfMasterResult strong{display:block;color:#132238}
 #hotelPdfMasterResult .links{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}
 #hotelPdfMasterResult .action{appearance:none;border:0;background:#132238;color:white;font:inherit;font-weight:850;border-radius:10px;padding:11px 15px;cursor:pointer;text-decoration:none;display:inline-flex;gap:6px;align-items:center}
 #hotelPdfMasterResult .file{padding:7px 0;overflow-wrap:anywhere;color:#536778;font-size:14px}
 @media(max-width:600px){#hotelPdfMasterResult{margin:10px 12px 16px;padding:12px}#hotelPdfMasterResult .links .action{flex:1 1 100%;justify-content:center}}`;
 document.head.appendChild(style);
 const download=$('hotelPdfDownload');
 download.addEventListener('click',event=>{
   if(!fallbackFile||typeof navigator.canShare!=='function'||typeof navigator.share!=='function')return;
   if(!navigator.canShare({files:[fallbackFile]}))return;
   event.preventDefault();
   navigator.share({files:[fallbackFile],title:fallbackFile.name}).catch(err=>{
     if(err?.name!=='AbortError')feedback('Dateifreigabe fehlgeschlagen. Bitte den Browser-Download versuchen.',true);
   });
 });
 btn.addEventListener('click',async()=>{
  if(busy)return;busy=true;btn.disabled=true;result.classList.remove('show');feedback('PDF wird aus der aktuellen Hotel-Seite erzeugt …');
  try{
   if(typeof window.HotelPdfEigen?.generate!=='function')throw Error('Freigegebener Hotel-PDF-Master konnte nicht geladen werden.');
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const out=await window.HotelPdfEigen.generate(document,(done,total)=>feedback(`PDF wird erzeugt: Bereich ${done} von ${total}`));
   if(!out?.blob||out.blob.type!=='application/pdf'||!out.filename?.endsWith('.pdf')||!Number.isInteger(out.pages))throw Error('Der Master hat keine gueltige PDF geliefert.');
   fallbackFile=typeof File==='function'?new File([out.blob],out.filename,{type:'application/pdf'}):null;
   if(fallbackUrl)URL.revokeObjectURL(fallbackUrl);
   fallbackUrl=URL.createObjectURL(out.blob);
   let delivery,warning='';
   try{delivery=await namedDelivery(out);}catch(err){console.warn('[Hotel PDF Dateiausgabe]',err);delivery={download:fallbackUrl,named:false};warning='Dieser Browser konnte den benannten Dateipfad nicht aktivieren. Bei Bedarf die Datei ueber die Systemfreigabe speichern.';}
   $('hotelPdfFilename').textContent=`${out.filename} · ${out.pages} A4-Seiten`;
   download.href=delivery.download;download.download=out.filename;
   const hint=$('hotelPdfSaveHint');hint.hidden=!warning;hint.textContent=warning;
   result.classList.add('show');feedback(`Fertig: ${out.pages} A4-Seiten. PDF zum Speichern bereit.`);
   result.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(err){console.error('[Hotel PDF Master]',err);feedback('PDF nicht erstellt: '+(err?.message||String(err)),true)}
  finally{busy=false;btn.disabled=false;}
 });
 const engine=document.createElement('script');engine.src='./hotel-pdf-eigen-fix.js?v=20260917-master';engine.async=false;
 engine.onload=()=>{if(typeof window.HotelPdfEigen?.generate==='function'){btn.disabled=false;feedback('Hotel-Seite geladen. Werte eingeben und PDF erstellen.');}else feedback('PDF-Master nicht verfuegbar. Bitte Seite neu laden.',true);};
 engine.onerror=()=>feedback('PDF-Master konnte nicht geladen werden. Bitte Seite neu laden.',true);
 document.head.appendChild(engine);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('pagehide',()=>{if(fallbackUrl)URL.revokeObjectURL(fallbackUrl)});
})();
