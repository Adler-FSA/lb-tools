(()=>{
'use strict';
/* HOTEL_PDF_V2_LOADER
   Lädt den bestehenden Hotel-PDF-Adapter unverändert.
   Die PDF wird von der FSA_CONTRACT_PDF_ENGINE_V2 erzeugt.
   Danach stellt die Seite den fertigen PDF-Download mit dem von der Engine
   vergebenen Dateinamen bereit. Kein Druckdialog, kein Browser-Druck-PDF.
*/
const core=document.createElement('script');
core.src='./hotel-pdf-v2-core.js?v=4';
core.onerror=()=>console.error('Hotel PDF Core konnte nicht geladen werden.');
document.head.appendChild(core);
})();
