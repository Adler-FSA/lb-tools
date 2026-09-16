/* LiquidityBooster · Produktiv-Adapter fuer die unveraenderte Hotel-Broschuere V6.
 * Nutzt den ORIGINAL-Generator aus hotel-2-pdf-test.html; keine neue PDF-Gestaltung.
 * hotel.html, die V5-/V6-Layouts und andere Hotel-Bereiche bleiben unveraendert.
 */
(function(global){
'use strict';
const VERSION='HOTEL_PRINT_FIRST_V6_LIVE_12P';
if(new URLSearchParams(location.search).has('pdf-design-test'))return;
let pdfUrl='',pending=null;
const $=id=>document.getElementById(id);
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function state(kind,html){const e=$('pdfState');if(e){e.className='pdfState show '+kind;e.innerHTML=html}}
function localDate(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function hotelName(){return ($('hotelName')?.value||global.LBHotelStorage?.getSection('hotel')?.name||'').trim()||'Ihr Haus'}
function safePart(s){return String(s||'Hotel').trim().replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'-').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^[-. ]+|[-. ]+$/g,'')||'Hotel'}

/* Die Test-Datei laedt V5 und das V6-Addon mit allen fertigen Layout-Fixes.
 * Die unsichtbare Hilfsseite wird nur fuer eine angeforderte PDF geladen.
 */
function readyFrame(){return new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
  frame.style.cssText='position:fixed;left:-10000px;top:0;width:1200px;height:900px;visibility:hidden;pointer-events:none;border:0';
  let settled=false;const started=Date.now();
  function fail(err){if(settled)return;settled=true;frame.remove();reject(err)}
  function check(){
    if(settled)return;
    if(Date.now()-started>30000){fail(new Error('Die 12-Seiten-Broschuere wurde nicht rechtzeitig geladen.'));return}
    try{
      const inner=frame.contentDocument?.getElementById('hotelFrame');
      const doc=inner?.contentDocument;
      const btn=doc?.getElementById('pdfBtn');
      const version=frame.contentWindow?.HotelBrochureTestV6?.version;
      if(version==='HOTEL_BROCHURE_TEST_V6_ADDON_12P'&&doc?.readyState==='complete'&&btn?.textContent?.includes('12-seitige Broschüren-PDF')){
        settled=true;resolve({frame,doc});return;
      }
    }catch(err){fail(new Error('Hotel-Broschuere kann nicht aus demselben Ursprung gelesen werden.'));return}
    setTimeout(check,120);
  }
  frame.addEventListener('error',()=>fail(new Error('Hotel-Broschuere konnte nicht geladen werden.')),{once:true});
  frame.addEventListener('load',check,{once:true});
  frame.src='./hotel-2-pdf-test.html?hotel-pdf-production=1&v=20260916';
  document.body.appendChild(frame);
  setTimeout(check,200);
})}

function copyInput(from,to,id){
  const a=from.getElementById(id),b=to.getElementById(id);
  if(!a||!b)throw new Error('Hotel-Eingabefeld fehlt: '+id);
  b.value=a.value;
  b.dispatchEvent(new Event('input',{bubbles:true}));
  b.dispatchEvent(new Event('change',{bubbles:true}));
  if(b.value!==a.value)throw new Error('Hotel-Eingabe wurde nicht vollstaendig uebernommen: '+id);
}
function syncValues(to){
  const from=document;
  ['hotelName','booking','voucherPct','reservePct','otaPct','offerPrice','offerCost','offerVoucher'].forEach(id=>copyInput(from,to,id));
  const sourceRows=[...from.querySelectorAll('tr[data-service]')],targetRows=[...to.querySelectorAll('tr[data-service]')];
  if(sourceRows.length!==targetRows.length||!sourceRows.length)throw new Error('Die Hotel-Leistungstabelle ist nicht vollstaendig geladen.');
  sourceRows.forEach((row,i)=>{
    ['data-price','data-cost','data-voucher'].forEach(attr=>{
      const a=row.querySelector('['+attr+']'),b=targetRows[i].querySelector('['+attr+']');
      if(!a||!b)throw new Error('Leistungswert fehlt in Zeile '+(i+1));
      b.value=a.value;b.dispatchEvent(new Event('input',{bubbles:true}));
      if(b.value!==a.value)throw new Error('Leistungswert konnte nicht uebernommen werden.');
    });
  });
}

/* Nur die Testbeschriftung ersetzen: gleiche Byte-Laenge im bestehenden
 * unkomprimierten PDF-Textstrom, unveraenderte Seitengeometrie und Fonts.
 */
function ascii(s){return new TextEncoder().encode(s)}
function latinHex(s){return [...String(s)].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('').toUpperCase()}
function stripTestLabel(input){
  const oldText='DESIGN-TEST · PRINT-FIRST',newText='PERSÖNLICHE AUSGABE';
  const old=ascii(latinHex(oldText)),replacement=ascii(latinHex(newText.padEnd(oldText.length,' ')));
  const out=input.slice();let at=-1,count=0;
  for(let i=0;i<=out.length-old.length;i++){
    let same=true;for(let j=0;j<old.length;j++){if(out[i+j]!==old[j]){same=false;break}}
    if(same){out.set(replacement,i);at=i;count++;i+=old.length-1}
  }
  if(count!==1)throw new Error('Das V6-Deckblatt weicht vom freigegebenen Stand ab; PDF nicht ausgegeben.');
  return out;
}
function assertPdf(u8){
  if(u8.length<15000||new TextDecoder('ascii').decode(u8.slice(0,8)).indexOf('%PDF-')!==0)throw new Error('Keine gueltige Hotel-PDF erhalten.');
  const t=new TextDecoder('latin1').decode(u8);
  const pages=[...t.matchAll(/\/Type\s*\/Page(?=\s|\/)/g)].length;
  if(pages!==12||!t.includes('/Count 12'))throw new Error('Hotel-PDF hat nicht genau 12 Seiten.');
}
async function generate(){
  const {frame,doc}=await readyFrame();
  try{
    syncValues(doc);
    const btn=doc.getElementById('pdfBtn');btn.click();
    const result=doc.querySelector('#pdfState a[download]');
    if(!result?.href?.startsWith('blob:'))throw new Error('Der originale V6-Generator hat keine fertige Broschuere geliefert: '+(doc.getElementById('pdfState')?.textContent||''));
    const response=await fetch(result.href);
    if(!response.ok)throw new Error('Hotel-PDF konnte nicht gelesen werden.');
    const original=new Uint8Array(await response.arrayBuffer());
    assertPdf(original);
    const u8=stripTestLabel(original);
    assertPdf(u8);
    return{u8,hotelName:hotelName(),version:VERSION};
  }finally{frame.remove()}
}
function build(){if(!pending)pending=generate().finally(()=>{pending=null});return pending}
async function download(){
  const btn=$('pdfBtn');if(!btn)return;
  const previous=btn.textContent;btn.disabled=true;btn.textContent='PDF wird erstellt …';
  state('generating','<span class="pdfSpinner" aria-hidden="true"></span><div><strong>Ihre 12-seitige Hotelbroschuere wird erstellt.</strong><div class="pdfHint">Verwendet wird das bewaehrte V6-Layout mit Ihren aktuellen Hotelwerten.</div></div>');
  try{
    const result=await build(),store=global.LBHotelStorage,opts={hotelName:result.hotelName,date:localDate()};
    const name=store?.pdfFilename?store.pdfFilename('Hotel_Broschuere',opts):'Hotel_Broschuere_'+safePart(result.hotelName)+'_'+opts.date+'.pdf';
    const blob=new Blob([result.u8],{type:'application/pdf'});
    const file=store?.makeNamedPdfFile?store.makeNamedPdfFile(blob,'Hotel_Broschuere',opts):(typeof File!=='undefined'?new File([blob],name,{type:'application/pdf'}):blob);
    if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(file);
    state('success','<div class="pdfReadyTop"><span class="pdfCheck">✓</span><div><strong>Ihre 12-seitige Hotelbroschuere ist fertig.</strong><div class="pdfHint">Die Originalgestaltung der V6-Broschuere wurde uebernommen.</div></div></div><div class="pdfFile">'+esc(name)+'</div><a class="pdfDownload" href="'+pdfUrl+'" download="'+esc(name)+'" type="application/pdf" rel="noopener">PDF herunterladen / speichern</a>');
  }catch(err){console.error('[Hotel V6 PDF]',err);state('error','<strong>Die Hotelbroschuere konnte nicht erstellt werden.</strong><div class="pdfHint">'+esc(err?.message||String(err))+'</div>')}
  finally{btn.disabled=false;btn.textContent=previous}
}
function init(){
  if(new URLSearchParams(location.search).has('final-suite'))return;
  const old=$('pdfBtn');if(!old)return;
  const panel=$('pdfPanel');
  const label=panel?.querySelector('.miniLabel'),title=panel?.querySelector('.pdfCopy h3'),lead=panel?.querySelector('.pdfCopy p');
  if(label)label.textContent='Ihre persoenliche Entscheidungsunterlage';
  if(title)title.textContent='Hotelbroschuere im fertigen 12-Seiten-Design';
  if(lead)lead.textContent='Das bewaehrte Broschuerenlayout mit allen zwoelf Seiten. Ihre Hotel- und Rechnerwerte werden direkt uebernommen.';
  const btn=old.cloneNode(true);btn.textContent='Hotelbroschuere als PDF erstellen';old.replaceWith(btn);
  btn.addEventListener('click',download);
}
global.HotelBrochureStandalonePdf=Object.freeze({version:VERSION,build});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:globalThis);
