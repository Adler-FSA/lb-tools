/* Isolierter V3-Testloader: bewahrt vollständige Service-Titel vor den numerischen Badges.
   Lädt ausschließlich eigene, lokale Skripte; keine Änderung am Hotel-Master. */
(()=>{'use strict';
(async()=>{try{
 const response=await fetch('./hotel-businessbooster-akademie-pdf-v3.js?v=1',{cache:'no-store'});
 if(!response.ok)throw Error('Business-PDF-V3 konnte nicht geladen werden.');
 const code=await response.text();
 const before="const title=read(el.querySelector(':scope > h3,:scope > h4,:scope > strong,:scope > b,.bbOfferTop strong,.n'))||read(el.querySelector('h3,h4,strong,b'));";
 const after="const title=read(el.querySelector(':scope > h3,:scope > h4,:scope > strong,:scope > b,.bbOfferTop strong'))||read(el.querySelector('h3,h4,strong,b'))||read(el.querySelector('.n'));";
 if(code.split(before).length!==2)throw Error('PDF-V3-Struktur geändert. Keine unvollständige PDF freigegeben.');
 const script=document.createElement('script');script.textContent=code.replace(before,after);document.head.appendChild(script);script.remove();
 if(window.BusinessBoosterAkademiePdf?.version!=='BUSINESS_AKADEMIE_PDF_V3')throw Error('Business-PDF-Modul nicht gestartet.');
 }catch(error){console.error('[Business-PDF-V3]',error);window.BusinessBoosterAkademiePdf=Object.freeze({validDoc:()=>false,generate:async()=>{throw error}});}
})();
})();