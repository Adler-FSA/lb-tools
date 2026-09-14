(()=>{
'use strict';
/* HOTEL_PDF_V2_LOADER
   Fester Akademie-Standard fuer PDF-Ausgaben:
   Die FSA_CONTRACT_PDF_ENGINE_V2 erzeugt die echte application/pdf-Datei.
   Der Core stellt diese erzeugte PDF direkt als benannten Download bereit.
   Kein Service-Worker-Preview, kein virtueller URL-Pfad, kein window.print().
*/
const core=document.createElement('script');
core.src='./hotel-pdf-v2-core.js?v=6';
core.onerror=()=>console.error('Hotel PDF Core konnte nicht geladen werden.');
document.head.appendChild(core);
})();
