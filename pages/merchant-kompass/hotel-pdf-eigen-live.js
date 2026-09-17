/* Hotel-Hauptseite: exakt der PDF-Generator der freigegebenen
 * hotel-pdf-eigen-test.html; nur die Ausgabe ohne Vorschau.
 * Eine PDF je Klick erzeugen, danach dieselben Bytes als benannte Datei
 * bereitstellen. Keine zweite Generierung, kein Server und kein Druckdialog.
 */
(()=>{'use strict';
const params=new URLSearchParams(location.search);
if(params.has('pdf-design-test')||params.has('final-suite'))return;
const $=id=>document.getElementById(id);
let objectUrl='',namedFile=null,busy=false,shareFailed=false;
function feedback(message,error=false){const status=$('pdfState');if(!status)return;status.className='pdfState show '+(error?'error':'generating');status.textContent=message;}

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
 // Firefox auf iOS kann beim <a download> fuer blob:-URLs den Namen durch
 // eine UUID ersetzen. Die fertige Datei stattdessen mit ihrem File.name an
 // die native Dateifreigabe uebergeben. Safari und Brave behalten den
 // bestaetigten Downloadablauf des Masters; alle anderen Browser ebenso.
 download.addEventListener('click',event=>{
   if(!objectUrl){event.preventDefault();feedback('Bitte zuerst die PDF erstellen.',true);return;}
   if(!/FxiOS\//i.test(navigator.userAgent)||shareFailed||!namedFile)return;
   let canShare=false;
   try{canShare=typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[namedFile]});}catch(e){canShare=false;}
   if(!canShare){feedback('Dieser Firefox bietet keine Dateifreigabe an. Der normale PDF-Download wird verwendet.',true);return;}
   event.preventDefault();
   try{
     // Direkt im echten Klick ausloesen, bevor die Nutzeraktivierung verfaellt.
     const operation=navigator.share({files:[namedFile],title:namedFile.name});
     Promise.resolve(operation).catch(error=>{
       if(error?.name==='AbortError')return;
       shareFailed=true;
       feedback('Dateifreigabe fehlgeschlagen. Beim naechsten Klick steht der normale Download bereit.',true);
     });
   }catch(error){
     shareFailed=true;
     feedback('Dateifreigabe fehlgeschlagen. Beim naechsten Klick steht der normale Download bereit.',true);
   }
 });
 btn.addEventListener('click',async()=>{
  if(busy)return;busy=true;btn.disabled=true;result.classList.remove('show');feedback('PDF wird aus der aktuellen Hotel-Seite erzeugt …');
  try{
   if(typeof window.HotelPdfEigen?.generate!=='function')throw Error('Freigegebener Hotel-PDF-Master konnte nicht geladen werden.');
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   // Wie auf der Master-Testseite: aktuelle HTML-Eingaben direkt lesen.
   const out=await window.HotelPdfEigen.generate(document,(done,total)=>feedback(`PDF wird erzeugt: Bereich ${done} von ${total}`));
   if(!out?.blob||!out.filename||!out.pages)throw Error('Der PDF-Master hat keine fertige Datei geliefert.');
   const url=URL.createObjectURL(out.blob);
   // Die Seite haelt die einmal erzeugte PDF selbst vor. Download und
   // Dateifreigabe verwenden dieselben Bytes und denselben Dateinamen.
   objectUrl=url;
   namedFile=typeof File==='function'?new File([out.blob],out.filename,{type:'application/pdf'}):null;
   shareFailed=false;
   download.href=objectUrl;
   download.download=out.filename;
   $('hotelPdfFilename').textContent=out.filename+' · '+out.pages+' A4-Seiten';
   result.classList.add('show');feedback('PDF erstellt – Download ist bereit.');
   result.scrollIntoView({block:'start',behavior:'smooth'});
  }catch(error){console.error('[Hotel PDF Master]',error);feedback('PDF nicht erstellt: '+(error?.message||String(error)),true);}
  finally{busy=false;btn.disabled=false;}
 });
 // Dieselbe Engine wie die vom Nutzer getestete Master-Testseite.
 const engine=document.createElement('script');engine.src='./hotel-pdf-eigen-fix.js?v=2';engine.async=false;
 engine.onload=()=>{if(typeof window.HotelPdfEigen?.generate==='function'){btn.disabled=false;feedback('Hotel-Seite geladen. Werte eingeben und PDF erstellen.');}else feedback('PDF-Master nicht verfügbar. Bitte Seite neu laden.',true);};
 engine.onerror=()=>feedback('PDF-Master konnte nicht geladen werden. Bitte Seite neu laden.',true);
 document.head.appendChild(engine);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
// Blob-URLs bewusst nicht beim Seitenwechsel widerrufen: einige Browser
// lesen den Download erst nach dem Klick. Freigabe erfolgt beim Entladen.
})();
