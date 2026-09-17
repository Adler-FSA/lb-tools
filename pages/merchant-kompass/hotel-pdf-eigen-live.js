/* Hotel-Hauptseite: freigegebener PDF-Master, direkte lokale PDF-Datei.
 * Nur Ausgabebruecke. Generator, Rechner und Hotel-HTML bleiben unveraendert.
 * Kein virtueller Service-Worker-Dateipfad: Browser-Downloads muessen echte PDF-Bytes erhalten.
 */
(()=>{'use strict';
const params=new URLSearchParams(location.search);
if(params.has('pdf-design-test')||params.has('final-suite'))return;
const $=id=>document.getElementById(id);
let pdfUrl='',busy=false;
function feedback(message,error=false){const status=$('pdfState');if(!status)return;status.className='pdfState show '+(error?'error':'generating');status.textContent=message;}
async function verifyPdf(out){
  if(!out?.blob||out.blob.type!=='application/pdf'||!out.filename?.endsWith('.pdf')||!Number.isInteger(out.pages)||out.pages<1)throw Error('Der PDF-Master hat keine gueltige Datei geliefert.');
  const raw=await out.blob.arrayBuffer();
  if(raw.byteLength<2000)throw Error('Die erstellte PDF ist unvollstaendig.');
  const header=new TextDecoder('ascii').decode(raw.slice(0,8));
  const footer=new TextDecoder('ascii').decode(raw.slice(-256));
  if(!header.startsWith('%PDF-')||!footer.includes('%%EOF'))throw Error('Die erstellte PDF ist unvollstaendig.');
  return raw.byteLength;
}
function init(){
 const panel=$('pdfPanel'),original=$('pdfBtn');if(!panel||!original||!$('pdfState'))return;
 const label=panel.querySelector('.miniLabel'),heading=panel.querySelector('.pdfCopy h3'),lead=panel.querySelector('.pdfCopy p');
 if(label)label.textContent='Ihre persoenliche Gespraechsunterlage';
 if(heading)heading.textContent='Ihre Hotel-Auswertung als PDF';
 if(lead)lead.textContent='Gespraechswerte eingeben, PDF erstellen und speichern.';
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
 btn.addEventListener('click',async()=>{
  if(busy)return;busy=true;btn.disabled=true;result.classList.remove('show');feedback('PDF wird aus der aktuellen Hotel-Seite erzeugt …');
  try{
   if(typeof window.HotelPdfEigen?.generate!=='function')throw Error('Freigegebener Hotel-PDF-Master konnte nicht geladen werden.');
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const out=await window.HotelPdfEigen.generate(document,(done,total)=>feedback(`PDF wird erzeugt: Bereich ${done} von ${total}`));
   const bytes=await verifyPdf(out);
   // Der Link zeigt direkt auf den lokal erzeugten PDF-Blob, nicht auf einen
   // virtuellen Service-Worker-Pfad, den Safaris Downloadmanager umgehen kann.
   const nextUrl=URL.createObjectURL(out.blob);
   const oldUrl=pdfUrl;pdfUrl=nextUrl;
   download.href=pdfUrl;download.download=out.filename;
   $('hotelPdfFilename').textContent=`${out.filename} · ${out.pages} A4-Seiten · ${Math.ceil(bytes/1024)} KB`;
   const hint=$('hotelPdfSaveHint');hint.hidden=true;hint.textContent='';
   result.classList.add('show');feedback(`Fertig: ${out.pages} A4-Seiten. PDF zum Speichern bereit.`);
   result.scrollIntoView({behavior:'smooth',block:'start'});
   // Alte URL erst nach Erstellen einer neuen Datei freigeben; nicht bei pagehide:
   // Safari kann den Download erst nach dem Seitenwechsel vollstaendig lesen.
   if(oldUrl)URL.revokeObjectURL(oldUrl);
  }catch(err){console.error('[Hotel PDF Master]',err);feedback('PDF nicht erstellt: '+(err?.message||String(err)),true)}
  finally{busy=false;btn.disabled=false;}
 });
 const engine=document.createElement('script');engine.src='./hotel-pdf-eigen-fix.js?v=20260917-master';engine.async=false;
 engine.onload=()=>{if(typeof window.HotelPdfEigen?.generate==='function'){btn.disabled=false;feedback('Hotel-Seite geladen. Werte eingeben und PDF erstellen.');}else feedback('PDF-Master nicht verfuegbar. Bitte Seite neu laden.',true);};
 engine.onerror=()=>feedback('PDF-Master konnte nicht geladen werden. Bitte Seite neu laden.',true);
 document.head.appendChild(engine);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();