/* Hotel-Hauptseite: derselbe Generator, Snapshot und Downloadablauf wie
 * hotel-pdf-abschluss-test.html (freigegebener Master).
 * Einziger UI-Unterschied: auf der Hauptseite bleibt die Vorschau entfernt.
 * Keine Service-Worker-Dateirouten, keine alternativen PDF-Generatoren.
 */
(()=>{'use strict';
const params=new URLSearchParams(location.search);
if(params.has('pdf-design-test')||params.has('final-suite'))return;
const $=id=>document.getElementById(id);
let objectUrl='',busy=false;
function feedback(message,error=false){const status=$('pdfState');if(!status)return;status.className='pdfState show '+(error?'error':'generating');status.textContent=message;}

// Wortgleich mit der Snapshot-Funktion der freigegebenen Abschluss-Testseite.
function snapshot(doc){const clone=doc.cloneNode(true),originalInputs=[...doc.querySelectorAll('input,textarea,select')],copiedInputs=[...clone.querySelectorAll('input,textarea,select')];if(originalInputs.length!==copiedInputs.length)throw Error('Gesprächseingaben konnten nicht vollständig übernommen werden.');originalInputs.forEach((el,i)=>{copiedInputs[i].value=el.value;if(el.type==='checkbox'||el.type==='radio')copiedInputs[i].checked=el.checked;});const sourceLinks=[...doc.querySelectorAll('.detailsBody a')],copyLinks=[...clone.querySelectorAll('.detailsBody a')];copyLinks.forEach((a,i)=>{if(sourceLinks[i])a.href=sourceLinks[i].href;});const box=clone.querySelector('.detailsBody');if(box){for(const p of [...box.querySelectorAll('p')]){const anchors=[...p.querySelectorAll('a')];if(!anchors.length)continue;let rest=p.textContent||'';for(const a of anchors)rest=rest.replace(a.textContent||'','');if(rest.trim())continue;anchors.forEach(a=>box.appendChild(a));p.remove();}}return clone;}

function init(){
 const panel=$('pdfPanel'),original=$('pdfBtn');if(!panel||!original||!$('pdfState'))return;
 const label=panel.querySelector('.miniLabel'),heading=panel.querySelector('.pdfCopy h3'),lead=panel.querySelector('.pdfCopy p');
 if(label)label.textContent='Ihre persönliche Gesprächsunterlage';
 if(heading)heading.textContent='Ihre Hotel-Auswertung als PDF';
 if(lead)lead.textContent='Gesprächswerte eingeben, PDF erstellen und speichern.';
 const btn=original.cloneNode(true);btn.textContent='PDF erstellen';btn.disabled=true;original.replaceWith(btn);
 const result=document.createElement('div');result.id='hotelPdfMasterResult';result.className='result';
 result.innerHTML='<strong>Ihre PDF ist fertig.</strong><div class="file" id="hotelPdfFilename"></div><div class="links"><a class="action" id="hotelPdfDownload" type="application/pdf">PDF herunterladen / speichern</a></div>';
 panel.appendChild(result);
 const style=document.createElement('style');style.textContent=`
 #hotelPdfMasterResult{display:none;padding:14px 18px;background:#fff;border:1px solid #dbe5e9;border-radius:17px;margin:12px 24px 24px;color:#263545}
 #hotelPdfMasterResult.show{display:block}#hotelPdfMasterResult strong{display:block;color:#132238}
 #hotelPdfMasterResult .links{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}
 #hotelPdfMasterResult .action{appearance:none;border:0;background:#132238;color:white;font:inherit;font-weight:850;border-radius:10px;padding:11px 15px;cursor:pointer;text-decoration:none;display:inline-flex;gap:6px;align-items:center}
 #hotelPdfMasterResult .file{padding:7px 0;overflow-wrap:anywhere;color:#536778;font-size:14px}
 @media(max-width:600px){#hotelPdfMasterResult{margin:10px 12px 16px;padding:12px}#hotelPdfMasterResult .links .action{flex:1 1 100%;justify-content:center}}`;
 document.head.appendChild(style);
 const download=$('hotelPdfDownload');
 btn.addEventListener('click',async()=>{
  if(busy)return;busy=true;btn.disabled=true;result.classList.remove('show');feedback('PDF wird aus der aktuellen Hotel-Seite erzeugt …');
  try{
   if(window.HotelPdfEigen?.version!=='HOTEL_PDF_EIGEN_V2')throw Error('Freigegebener Hotel-PDF-Master konnte nicht geladen werden.');
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const doc=snapshot(document);
   const out=await window.HotelPdfEigen.generate(doc,(i,n)=>feedback('PDF-Bereich '+i+' von '+n+' wird gesetzt …'));
   // Unveränderte Dateierstellung und Linkzuweisung des freigegebenen Masters.
   if(objectUrl)URL.revokeObjectURL(objectUrl);
   objectUrl=URL.createObjectURL(out.blob);
   download.href=objectUrl;
   download.download=out.filename;
   $('hotelPdfFilename').textContent=out.filename+' · '+out.pages+' A4-Seiten';
   result.classList.add('show');feedback('PDF erstellt – Download ist bereit.');
   result.scrollIntoView({block:'start',behavior:'smooth'});
  }catch(e){console.error('[Hotel PDF Master]',e);feedback('PDF nicht erstellt: '+(e?.message||String(e)),true)}
  finally{busy=false;btn.disabled=false;}
 });
 // EXAKT die Engine der Abschluss-Testseite, nicht mehr hotel-pdf-eigen-fix.js.
 const engine=document.createElement('script');engine.src='./hotel-pdf-eigen-v2.js?v=51672411';engine.async=false;
 engine.onload=()=>{if(window.HotelPdfEigen?.version==='HOTEL_PDF_EIGEN_V2'){btn.disabled=false;feedback('Hotel-Seite geladen. Werte eingeben und PDF erstellen.');}else feedback('PDF-Master nicht verfügbar. Bitte Seite neu laden.',true);};
 engine.onerror=()=>feedback('PDF-Master konnte nicht geladen werden. Bitte Seite neu laden.',true);
 document.head.appendChild(engine);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl)});
})();
