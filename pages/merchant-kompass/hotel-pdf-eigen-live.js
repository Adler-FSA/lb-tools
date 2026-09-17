/* Freigegebener Hotel-PDF-Master: nur die Ausgabe auf der Hauptseite.
 * Die Master-PDF-Engine und die Hotel-HTML werden nicht veraendert.
 * iOS-Browser koennen Blob-Downloads als UUID speichern; deshalb wird
 * beim Speichern bevorzugt eine echte, benannte PDF-Datei geteilt.
 */
(()=>{'use strict';
const params=new URLSearchParams(location.search);
if(params.has('pdf-design-test')||params.has('final-suite'))return;
const $=id=>document.getElementById(id);
const touchApple=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let url='',namedFile=null;
function supportsFileShare(){
 try{return !!(namedFile&&typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[namedFile]}));}
 catch(_){return false;}
}
function init(){
 const panel=$('pdfPanel'),old=$('pdfBtn'),status=$('pdfState');
 if(!panel||!old||!status)return;
 const label=panel.querySelector('.miniLabel'),heading=panel.querySelector('.pdfCopy h3'),lead=panel.querySelector('.pdfCopy p');
 if(label)label.textContent='Ihre persönliche Gesprächsunterlage';
 if(heading)heading.textContent='Ihre Hotel-Auswertung als PDF';
 if(lead)lead.textContent='Gesprächswerte auf der Hotel-Seite eingeben, PDF erzeugen, ansehen und speichern.';
 const btn=old.cloneNode(true);btn.textContent='PDF erstellen';btn.disabled=true;old.replaceWith(btn);
 const result=document.createElement('div');result.id='hotelPdfMasterResult';result.className='result';
 result.innerHTML='<strong>Ihre PDF ist fertig.</strong><div class="file" id="hotelPdfFilename"></div><div class="links"><a class="action preview" id="hotelPdfOpen" target="_blank" rel="noopener">Vollständige PDF-Vorschau öffnen</a><a class="action" id="hotelPdfDownload" type="application/pdf">PDF herunterladen / speichern</a><a class="action" id="hotelPdfBrowserDownload" type="application/pdf" hidden>Alternativ im Browser herunterladen</a></div><div id="hotelPdfSaveHint" class="ipadPreview" hidden></div><iframe class="viewer" id="hotelPdfViewer" title="Vorschau der fertigen PDF"></iframe>';
 panel.appendChild(result);
 const style=document.createElement('style');style.textContent=`
 #hotelPdfMasterResult{display:none;padding:14px 18px;background:#fff;border:1px solid #dbe5e9;border-radius:17px;margin:12px 24px 24px;color:#263545}
 #hotelPdfMasterResult.show{display:block}#hotelPdfMasterResult [hidden]{display:none!important}
 #hotelPdfMasterResult strong{display:block;color:#132238}
 #hotelPdfMasterResult .links{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}
 #hotelPdfMasterResult .action{appearance:none;border:0;background:#132238;color:white;font:inherit;font-weight:850;border-radius:10px;padding:11px 15px;cursor:pointer;text-decoration:none;display:inline-flex;gap:6px;align-items:center}
 #hotelPdfMasterResult .action.preview{background:#c6006f}
 #hotelPdfMasterResult .file{padding:7px 0;overflow-wrap:anywhere;color:#536778;font-size:14px}
 #hotelPdfMasterResult .viewer{width:100%;height:680px;max-height:75vh;border:1px solid #dbe5e9;border-radius:12px;background:#eef4f5}
 #hotelPdfMasterResult .ipadPreview{border:1px solid #cce5e7;border-radius:12px;background:#f3fafa;padding:17px;font-size:15px;line-height:1.5;color:#132238}
 @media(max-width:600px){#hotelPdfMasterResult{margin:10px 12px 16px;padding:12px}#hotelPdfMasterResult .viewer{height:64vh}#hotelPdfMasterResult .links .action{flex:1 1 100%;justify-content:center}}`;
 document.head.appendChild(style);
 // Diese Einschraenkung betrifft iOS-Browser allgemein, nicht nur Safari.
 if(touchApple){const viewer=$('hotelPdfViewer'),hint=document.createElement('div');hint.id='hotelPdfPreviewHint';hint.className='ipadPreview';hint.textContent='Zum Durchblaettern aller Seiten die vollstaendige PDF-Vorschau oeffnen. Zum Speichern bitte den separaten Speichern-Button verwenden.';viewer.replaceWith(hint);}
 function feedback(message,error=false){status.className='pdfState show '+(error?'error':'generating');status.textContent=message;}
 const download=$('hotelPdfDownload'),alternative=$('hotelPdfBrowserDownload'),saveHint=$('hotelPdfSaveHint');
 // Der Aufruf von navigator.share MUSS direkt im Klick erfolgen; sonst geht
 // die erforderliche Nutzeraktivierung in Firefox/Safari/Brave verloren.
 download.addEventListener('click',event=>{
  if(!namedFile)return;
  if(supportsFileShare()){
   event.preventDefault();
   let operation;
   try{operation=navigator.share({files:[namedFile],title:namedFile.name});}
   catch(err){feedback('Datei konnte nicht an die Systemfreigabe uebergeben: '+err.message,true);alternative.hidden=false;return;}
   Promise.resolve(operation).catch(err=>{
    if(err?.name==='AbortError')return;
    feedback('Speichern ueber die Systemfreigabe fehlgeschlagen. Bitte den alternativen Browser-Download verwenden.',true);
    alternative.hidden=false;
   });
  }
  // Andere Browser verwenden ihren nativen Download mit explizitem Dateinamen.
 });
 btn.addEventListener('click',async()=>{
  btn.disabled=true;result.classList.remove('show');feedback('PDF wird aus der aktuellen Hotel-Seite erzeugt …');
  try{
   if(typeof window.HotelPdfEigen?.generate!=='function')throw Error('Lokaler PDF-Generator konnte nicht geladen werden.');
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const out=await window.HotelPdfEigen.generate(document,(done,total)=>feedback(`PDF wird erzeugt: Bereich ${done} von ${total}`));
   if(!out?.blob||out.blob.type!=='application/pdf'||!out.filename?.endsWith('.pdf'))throw Error('Der PDF-Generator hat keine gueltige PDF zurueckgegeben.');
   const file=typeof File==='function'?new File([out.blob],out.filename,{type:'application/pdf'}):null;
   const nextUrl=URL.createObjectURL(file||out.blob);
   if(url)URL.revokeObjectURL(url);
   url=nextUrl;namedFile=file;
   $('hotelPdfFilename').textContent=`${out.filename} · ${out.pages} A4-Seiten`;
   const open=$('hotelPdfOpen');open.href=url;
   download.href=url;download.download=out.filename;
   alternative.href=url;alternative.download=out.filename;alternative.hidden=true;
   if(supportsFileShare()){
    download.textContent='PDF mit Dateinamen speichern / teilen';
    saveHint.hidden=false;
    saveHint.textContent='Die PDF wird als benannte Datei '+out.filename+' an die Dateifreigabe des Geraets uebergeben. Dort „In Dateien sichern“ auswaehlen. Keine Druckfunktion.';
   }else{
    download.textContent='PDF herunterladen / speichern';
    saveHint.hidden=!touchApple;
    if(touchApple)saveHint.textContent='Dieser Browser bietet keine Datei-Freigabe an. Der Browser-Download kann die Datei anders benennen; der richtige Name steht direkt darueber.';
   }
   const viewer=$('hotelPdfViewer');if(viewer)viewer.src=url;
   const hint=$('hotelPdfPreviewHint');if(hint)hint.textContent=`Die PDF enthaelt ${out.pages} A4-Seiten. Zum Durchblaettern die vollstaendige Vorschau oeffnen; zum benannten Speichern den separaten Speicher-Button verwenden.`;
   result.classList.add('show');feedback(`Fertig: ${out.pages} A4-Seiten. Vorschau und Datei-Speicherung stehen bereit.`);
   result.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){console.error('[Hotel PDF Master]',e);feedback('PDF nicht erstellt: '+(e?.message||String(e)),true)}
  finally{btn.disabled=false}
 });
 const engine=document.createElement('script');engine.src='./hotel-pdf-eigen-fix.js?v=20260917-master';engine.async=false;
 engine.onload=()=>{if(typeof window.HotelPdfEigen?.generate==='function'){btn.disabled=false;feedback('Hotel-Seite geladen. Werte eingeben und PDF erstellen.');}else feedback('PDF-Master nicht verfuegbar. Bitte Seite neu laden.',true)};
 engine.onerror=()=>feedback('PDF-Master konnte nicht geladen werden. Bitte Seite neu laden.',true);
 document.head.appendChild(engine);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('pagehide',()=>{if(url)URL.revokeObjectURL(url)});
})();