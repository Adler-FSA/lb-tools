/* Die freigegebene PDF-Testseite ist die Referenz fuer Erzeugung und Ausgabe.
   Integration auf hotel.html: gleiche Engine, Ergebnisstruktur und Download-Zuweisung.
   Hotel-Layout, Rechner und PDF-Renderer bleiben unveraendert. */
(()=>{'use strict';
const params=new URLSearchParams(location.search);
if(params.has('pdf-design-test')||params.has('final-suite'))return;
const $=id=>document.getElementById(id);
let url='';
function init(){
 const panel=$('pdfPanel'),old=$('pdfBtn'),status=$('pdfState');
 if(!panel||!old||!status)return;
 const label=panel.querySelector('.miniLabel'),heading=panel.querySelector('.pdfCopy h3'),lead=panel.querySelector('.pdfCopy p');
 if(label)label.textContent='Ihre persönliche Gesprächsunterlage';
 if(heading)heading.textContent='Ihre Hotel-Auswertung als PDF';
 if(lead)lead.textContent='Gesprächswerte auf der Hotel-Seite eingeben, PDF erzeugen, ansehen und speichern.';
 const btn=old.cloneNode(true);btn.textContent='PDF erstellen';btn.disabled=true;old.replaceWith(btn);
 // Gleiche Struktur wie die bestaetigte Master-Testseite.
 const result=document.createElement('div');result.id='hotelPdfMasterResult';result.className='result';
 result.innerHTML='<strong>Ihre PDF ist fertig.</strong><div class="file" id="hotelPdfFilename"></div><div class="links"><a class="action preview" id="hotelPdfOpen" target="_blank" rel="noopener">PDF-Vorschau öffnen</a><a class="action" id="hotelPdfDownload" type="application/pdf">PDF herunterladen / speichern</a></div><iframe class="viewer" id="hotelPdfViewer" title="Vorschau der fertigen PDF"></iframe>';
 panel.appendChild(result);
 const style=document.createElement('style');style.textContent=`
 #hotelPdfMasterResult{display:none;padding:14px 18px;background:#fff;border:1px solid #dbe5e9;border-radius:17px;margin:12px 24px 24px;color:#263545}
 #hotelPdfMasterResult.show{display:block}
 #hotelPdfMasterResult strong{display:block;color:#132238}
 #hotelPdfMasterResult .links{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}
 #hotelPdfMasterResult .action{appearance:none;border:0;background:#132238;color:white;font:inherit;font-weight:850;border-radius:10px;padding:11px 15px;cursor:pointer;text-decoration:none;display:inline-flex;gap:6px;align-items:center}
 #hotelPdfMasterResult .action.preview{background:#c6006f}
 #hotelPdfMasterResult .file{padding:7px 0;overflow-wrap:anywhere;color:#536778;font-size:14px}
 #hotelPdfMasterResult .viewer{width:100%;height:680px;max-height:75vh;border:1px solid #dbe5e9;border-radius:12px;background:#eef4f5}
 @media(max-width:600px){#hotelPdfMasterResult{margin:10px 12px 16px;padding:12px}#hotelPdfMasterResult .viewer{height:64vh}#hotelPdfMasterResult .links .action{flex:1 1 100%;justify-content:center}}`;
 document.head.appendChild(style);
 function feedback(message,error=false){status.className='pdfState show '+(error?'error':'generating');status.textContent=message;}
 btn.addEventListener('click',async()=>{
  btn.disabled=true;result.classList.remove('show');feedback('PDF wird aus der aktuellen Hotel-Seite erzeugt …');
  try{
   if(!window.HotelPdfEigen)throw Error('Lokaler PDF-Generator konnte nicht geladen werden.');
   const doc=document;
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const out=await window.HotelPdfEigen.generate(doc,(done,total)=>feedback(`PDF wird erzeugt: Bereich ${done} von ${total}`));
   if(!out?.blob||out.blob.type!=='application/pdf')throw Error('Der PDF-Generator hat keine gültige PDF zurückgegeben.');
   if(url)URL.revokeObjectURL(url);
   url=URL.createObjectURL(out.blob);
   $('hotelPdfFilename').textContent=`${out.filename} · ${out.pages} A4-Seiten`;
   const open=$('hotelPdfOpen'),download=$('hotelPdfDownload');
   open.href=url;download.href=url;download.download=out.filename;
   $('hotelPdfViewer').src=url;
   result.classList.add('show');feedback(`Fertig: ${out.pages} A4-Seiten. PDF-Vorschau und Download stehen bereit.`);
   result.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){console.error('[Hotel PDF Master]',e);feedback('PDF nicht erstellt: '+(e?.message||String(e)),true)}
  finally{btn.disabled=false}
 });
 const engine=document.createElement('script');engine.src='./hotel-pdf-eigen-fix.js?v=20260917-master';engine.async=false;
 engine.onload=()=>{if(typeof window.HotelPdfEigen?.generate==='function'){btn.disabled=false;feedback('Hotel-Seite geladen. Werte eingeben und PDF erstellen.');}else feedback('PDF-Master nicht verfügbar. Bitte Seite neu laden.',true)};
 engine.onerror=()=>feedback('PDF-Master konnte nicht geladen werden. Bitte Seite neu laden.',true);
 document.head.appendChild(engine);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('pagehide',()=>{if(url)URL.revokeObjectURL(url)});
})();
