/* Hotel-Hauptseite: freigegebenen PDF-Master verwenden, ohne Layout oder Rechner zu verändern.
 * Quelle: hotel-pdf-eigen-test.html + hotel-pdf-eigen-fix.js (freigegebener Stand 17.09.2026).
 * Die alte V6-Broschüre bleibt für final-suite über die bestehende Speicherbrücke erreichbar.
 */
(()=>{'use strict';
if(new URLSearchParams(location.search).has('pdf-design-test')||new URLSearchParams(location.search).has('final-suite'))return;
const $=id=>document.getElementById(id);
let pdfUrl='',busy=false;
function state(kind){const el=$('pdfState');if(!el)return null;el.className='pdfState show '+kind;el.replaceChildren();return el}
function text(parent,tag,content,cls){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=content;parent.appendChild(el);return el}
function info(kind,title,details){const el=state(kind);if(!el)return; text(el,'strong',title);if(details)text(el,'div',details,'pdfHint')}
function prepare(){
 const panel=$('pdfPanel'),old=$('pdfBtn');if(!panel||!old)return;
 const label=panel.querySelector('.miniLabel'),heading=panel.querySelector('.pdfCopy h3'),lead=panel.querySelector('.pdfCopy p');
 if(label)label.textContent='Ihre persönliche Gesprächsunterlage';
 if(heading)heading.textContent='Ihre Hotel-Auswertung als fertige PDF';
 if(lead)lead.textContent='Die vollständige Hotel-Seite wird mit Ihren aktuellen Eingaben und Rechenergebnissen als mehrseitige PDF erstellt. Anschließend können Sie die fertige Datei ansehen und speichern.';
 // Der bisherige Hotel-PDF-Listener hängt am alten Knopf. Klonen entfernt ausschließlich
 // diesen Listener, ohne die Seite, Eingaben oder die alte PDF-Engine zu verändern.
 const btn=old.cloneNode(true);btn.id='pdfBtn';btn.textContent='Hotel-PDF erstellen';btn.disabled=true;old.replaceWith(btn);
 btn.addEventListener('click',async()=>{
   if(busy)return;busy=true;btn.disabled=true;btn.textContent='PDF wird erstellt …';
   info('generating','Ihre Hotel-PDF wird erstellt.','Aktuelle Gesprächswerte und vollständige Inhalte werden übernommen.');
   try{
     // Der unveränderte Master-Patch lädt asynchron: zunächst ist die Proxy-Version
     // aktiv, nach dem Einspielen der zwölf Korrekturen die korrigierte V1-Engine.
     if(typeof window.HotelPdfEigen?.generate!=='function')throw Error('Der freigegebene PDF-Master ist noch nicht geladen.');
     await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
     const out=await window.HotelPdfEigen.generate(document,(done,total)=>info('generating','Ihre Hotel-PDF wird erstellt.','Abschnitt '+done+' von '+total+' wird übernommen.'));
     if(!(out?.blob instanceof Blob)||out.blob.type!=='application/pdf'||!Number.isInteger(out.pages)||out.pages<1)throw Error('Der Generator hat keine gültige PDF-Datei zurückgegeben.');
     const newUrl=URL.createObjectURL(out.blob);
     const el=state('success');
     if(!el){URL.revokeObjectURL(newUrl);throw Error('PDF-Anzeigebereich fehlt.');}
     text(el,'strong','Ihre Hotel-PDF ist fertig.');
     text(el,'div',out.filename+' · '+out.pages+' A4-Seiten','pdfFile');
     const actions=text(el,'div','','hotelPdfMasterActions');
     const preview=text(actions,'a','PDF-Vorschau öffnen','pdfDownload');preview.href=newUrl;preview.target='_blank';preview.rel='noopener';preview.type='application/pdf';
     const download=text(actions,'a','PDF herunterladen / speichern','pdfDownload');download.href=newUrl;download.download=out.filename;download.type='application/pdf';download.rel='noopener';
     const viewer=document.createElement('iframe');viewer.title='Vorschau der fertigen Hotel-PDF';viewer.src=newUrl;viewer.style.cssText='display:block;width:100%;height:72vh;min-height:440px;margin-top:14px;border:1px solid #cce5e7;border-radius:10px;background:white';el.appendChild(viewer);
     if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=newUrl;
     el.scrollIntoView({block:'start',behavior:'smooth'});
   }catch(err){console.error('[Hotel PDF Master]',err);info('error','Die PDF konnte nicht erstellt werden.',err?.message||String(err))}
   finally{busy=false;btn.disabled=false;btn.textContent='Hotel-PDF erstellen';}
 });
 const styles=document.createElement('style');styles.textContent='.hotelPdfMasterActions{display:flex;gap:10px;flex-wrap:wrap}.hotelPdfMasterActions .pdfDownload{margin-top:12px}@media(max-width:560px){.hotelPdfMasterActions .pdfDownload{width:100%;justify-content:center}}';document.head.appendChild(styles);
 const engine=document.createElement('script');engine.src='./hotel-pdf-eigen-fix.js?v=20260917-master';engine.async=false;
 engine.onload=()=>{if(typeof window.HotelPdfEigen?.generate==='function'){btn.disabled=false;}else info('error','PDF-Master nicht verfügbar.','Bitte laden Sie die Seite erneut.');};
 engine.onerror=()=>info('error','PDF-Master konnte nicht geladen werden.','Bitte laden Sie die Seite erneut.');
 document.head.appendChild(engine);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prepare,{once:true});else prepare();
window.addEventListener('pagehide',()=>{if(pdfUrl)URL.revokeObjectURL(pdfUrl)});
})();
