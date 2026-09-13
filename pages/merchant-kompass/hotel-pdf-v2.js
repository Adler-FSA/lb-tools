(()=>{
'use strict';
/* HOTEL_PDF_V2_ADAPTER
   Nutzt die FSA_CONTRACT_PDF_ENGINE_V2.
   Kein Druckdialog: PDF wird direkt erzeugt und anschließend mit festem Dateinamen angeboten.
*/
const EXPECTED='FSA_CONTRACT_PDF_ENGINE_V2';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let pdfUrl='';
function n(el){const v=typeof el==='string'?$(el)?.value:el?.value;const x=Number(String(v??0).trim().replace(',','.'));return Number.isFinite(x)?Math.max(0,x):0}
const eur=x=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(x||0);
const pct=x=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(x||0)+' %';
const pad=x=>String(x).padStart(2,'0');
function isoDate(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function displayDate(){return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}
function hotelName(){return ($('#hotelName')?.value||'').trim()||'Hotel'}

function calcServices(){
  let sales=0,costs=0,gutschein=0,cash=0,margin=0;
  $$('[data-service]').forEach(r=>{
    const price=n(r.querySelector('[data-price]')),cost=n(r.querySelector('[data-cost]')),value=Math.min(n(r.querySelector('[data-voucher]')),price),pay=Math.max(0,price-value),left=pay-cost;
    r.querySelector('[data-pay]').textContent=eur(pay);r.querySelector('[data-margin]').textContent=eur(left);
    sales+=price;costs+=cost;gutschein+=value;cash+=pay;margin+=left;
  });
  $('#svcSales').textContent=eur(sales);$('#svcVouchers').textContent=eur(gutschein);$('#svcCash').textContent=eur(cash);$('#svcMargin').textContent=eur(margin);
  return{sales,costs,gutschein,cash,margin};
}
function calcOwn(){
  const booking=n('#booking'),vp=n('#voucherPct')/100,rp=n('#reservePct')/100,ota=n('#otaPct')/100;
  const voucher=booking*vp,reserve=voucher*rp,otaCost=booking*ota,free=Math.max(0,booking-reserve);
  $('#calcBooking').textContent=eur(booking);$('#calcVoucher').textContent=eur(voucher);$('#calcReserve').textContent=eur(reserve);$('#calcOta').textContent=eur(otaCost);
  $('#liquidityExplain').textContent='Von '+eur(booking)+' regulärer Zahlung werden in diesem Beispiel '+eur(reserve)+' als Reserveanteil hinterlegt. Rechnerisch bleiben zunächst '+eur(free)+' freie Liquidität. Der Wertgutschein von '+eur(voucher)+' wird nicht als Bargeld ausgezahlt.';
  $('#guestExplain').textContent='Ihr Gast erhält '+eur(voucher)+' zusätzliche Kaufkraft als Wertgutschein für zulässige weitere Leistungen und Akzeptanzstellen.';
  const price=n('#offerPrice'),cost=n('#offerCost'),gv=Math.min(n('#offerVoucher'),price),pay=Math.max(0,price-gv),margin=pay-cost;
  $('#offerPay').textContent=eur(pay);$('#offerBenefit').textContent=eur(gv);$('#offerCostOut').textContent=eur(cost);$('#offerMargin').textContent=eur(margin);
  $('#offerExplain').textContent='Ihr Gast erlebt bei dieser Leistung '+eur(gv)+' Gutscheinvorteil und zahlt '+eur(pay)+' regulär. Bei '+eur(cost)+' direkten Kosten verbleiben '+eur(margin)+' vor Personal, Fixkosten, Steuern und weiteren Kosten.';
  return{booking,voucher,reserve,otaCost,free,price,cost,gv,pay,margin};
}
$$('[data-service] input').forEach(i=>i.addEventListener('input',calcServices));
['#booking','#voucherPct','#reservePct','#otaPct','#offerPrice','#offerCost','#offerVoucher'].forEach(id=>$(id)?.addEventListener('input',calcOwn));

function add(parent,tag,text){const el=document.createElement(tag);el.textContent=text;parent.appendChild(el);return el}
function table(parent,rows){const t=document.createElement('table');const tb=document.createElement('tbody');t.appendChild(tb);rows.forEach(([a,b])=>{const tr=document.createElement('tr');const c1=document.createElement('td'),c2=document.createElement('td');c1.textContent=a;c2.textContent=b;tr.append(c1,c2);tb.appendChild(tr)});parent.appendChild(t);return t}
function serviceRows(){return $$('[data-service]').map(r=>{
  const name=(r.querySelector('.serviceName')?.textContent||'Leistung').trim(),price=n(r.querySelector('[data-price]')),cost=n(r.querySelector('[data-cost]')),g=Math.min(n(r.querySelector('[data-voucher]')),price),pay=Math.max(0,price-g),left=pay-cost;
  return{name,price,cost,g,pay,left};
})}
function buildPdfSource(){
  const own=calcOwn(),svc=calcServices(),root=document.createElement('section');root.className='pdfSource';root.setAttribute('aria-hidden','true');
  add(root,'h2','1 · Ihre Ausgangslage');
  add(root,'p','Diese Auswertung verbindet Direktbuchung, Wertgutschein und zusätzliche Leistungen zu einem nachvollziehbaren Hotel-Beispiel.');
  table(root,[['Hotel',hotelName()],['Erstellt am',displayDate()],['Buchungswert',eur(own.booking)],['Belohnung als Wertgutschein',pct(n('#voucherPct'))],['Gutscheinwert',eur(own.voucher)],['Reserveanteil',eur(own.reserve)+' ('+pct(n('#reservePct'))+' des Gutscheinwerts)'],['Freie Liquidität im Beispiel',eur(own.free)],['OTA-Kosten zum Vergleich',eur(own.otaCost)+' bei '+pct(n('#otaPct'))]]);

  add(root,'h2','2 · Sicht des Gastes');
  add(root,'p','Der Gast bezahlt die Buchung zum regulären Buchungswert und erhält zusätzlich '+eur(own.voucher)+' Kaufkraft als Wertgutschein. Der Gutscheinwert ist keine Barauszahlung. Er kann bei zulässigen Leistungen und Akzeptanzstellen eingesetzt werden.');
  add(root,'p','Der Wertgutschein schafft damit einen zusätzlichen Anreiz, weitere Angebote rund um den Aufenthalt zu entdecken und zu nutzen.');

  add(root,'h2','3 · Sicht des Hotels');
  add(root,'p','Gutscheinwert, Reserveanteil und tatsächliche Kosten einer später eingelösten Leistung sind drei unterschiedliche Größen. Entscheidend ist, wie viel Gutscheinwert bei einer Leistung zugelassen wird und welche direkten Kosten diese Leistung verursacht.');
  table(root,[['Beispiel-Leistung',eur(own.price)+' Verkaufspreis'],['Einsetzbarer Gutscheinwert',eur(own.gv)],['Reguläre Zahlung des Gastes',eur(own.pay)],['Direkte Kosten',eur(own.cost)],['Verbleibt vor weiteren Kosten',eur(own.margin)]]);

  add(root,'h2','4 · Zusätzliche Leistungen im Hotel');
  add(root,'p','Die folgenden Werte stammen aus den aktuell eingetragenen Hotel-Beispielen. Sie zeigen, wie zusätzlicher Gutscheinwert Konsum anstoßen kann, ohne dass Gutscheinwert und tatsächliche Kosten gleichgesetzt werden.');
  const rows=serviceRows().map(x=>[x.name,`${eur(x.price)} Verkauf · ${eur(x.g)} Gutschein · ${eur(x.pay)} regulär · ${eur(x.left)} vor weiteren Kosten`]);
  table(root,rows);
  table(root,[['Leistungswert gesamt',eur(svc.sales)],['Gutscheinwert eingesetzt',eur(svc.gutschein)],['Reguläre Zahlungen',eur(svc.cash)],['Direkte Kosten gesamt',eur(svc.costs)],['Verbleibt vor weiteren Kosten',eur(svc.margin)]]);

  add(root,'h2','5 · Regionale Wirkung');
  add(root,'p','Der Wertgutschein kann - sofern die jeweiligen Anbieter teilnehmende Akzeptanzstellen sind - auch bei Partnern rund um das Hotel nutzbar sein. Beispiele sind Kutschfahrt, Sport- oder Skiverleih, regionale Gastronomie sowie E-Bike- und Freizeitangebote.');
  add(root,'p','So kann aus einer Hotelbuchung zusätzliche Nachfrage im Haus und in der Region entstehen.');

  add(root,'h2','6 · Ihr Hotel-Potenzial');
  add(root,'p','Die Kernidee lautet: Der Gast sieht zusätzlichen Nutzwert. Ihr Hotel sieht zusätzlichen Konsum. Welche Wirkung tatsächlich entsteht, hängt von Auslastung, Marge, Akzeptanzregeln, direkten Kosten und der konkreten Gestaltung der Angebote ab.');
  add(root,'h3','Orientierung für die Praxis');
  const ul=document.createElement('ul');['Hohe Marge: mehr Spielraum für einsetzbaren Gutscheinwert.','Freie Kapazität: Nebenzeiten können gezielt attraktiver gestaltet werden.','Gezielt fördern: Leistungen mit gewünschtem Zusatzumsatz können hervorgehoben werden.','Flexibel staffeln: Der einsetzbare Gutscheinwert kann je Angebot, Saison oder Auslastung unterschiedlich festgelegt werden.'].forEach(x=>{const li=document.createElement('li');li.textContent=x;ul.appendChild(li)});root.appendChild(ul);

  add(root,'h2','7 · Wichtige Einordnung');
  add(root,'p','Diese PDF ist eine Beispielrechnung zur Veranschaulichung des Modells. Tatsächlicher Reserveanteil, Akzeptanzregeln, Kosten und wirtschaftliche Wirkung hängen von den jeweils geltenden Bedingungen und der eigenen Kalkulation des Hotels ab. Keine Umsatz- oder Erfolgsgarantie.');
  document.body.appendChild(root);return root;
}

function setState(type,html){const box=$('#pdfState');if(!box)return;box.className='pdfState show '+type;box.innerHTML=html;requestAnimationFrame(()=>box.scrollIntoView({behavior:'smooth',block:'center'}))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function makePdf(){
  if(!window.FSAContractPdfEngine||window.FSAContractPdfEngine.version!==EXPECTED){setState('error','<strong>PDF Engine V2 konnte nicht geladen werden.</strong><div class="pdfHint">Bitte laden Sie die Seite neu und versuchen Sie es erneut.</div>');return}
  const btn=$('#pdfBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='PDF wird erstellt …';
  setState('generating','<span class="pdfSpinner" aria-hidden="true"></span><div><strong>Ihre Hotel-Auswertung wird erstellt.</strong><div class="pdfHint">Die PDF wird direkt aus Ihren aktuellen Angaben und Beispielwerten aufgebaut.</div></div>');
  const source=buildPdfSource();
  try{
    const safe=window.FSAContractPdfEngine.safeFilePart(hotelName()),filename=`Hotel_Auswertung_${safe}_${isoDate()}.pdf`;
    const out=await window.FSAContractPdfEngine.generate({contentRoot:source,fieldsRoot:source,titleText:'Hotel-Potenzialreport',subtitleText:hotelName()+' · '+displayDate(),footerText:'LiquidityBooster · Hotel-Auswertung',filename,autoDownload:false});
    if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(out.blob);
    setState('success','<div class="pdfReadyTop"><span class="pdfCheck">✓</span><div><strong>Ihre PDF ist fertig erstellt.</strong><div class="pdfHint">Die Datei ist vollständig vorbereitet und kann jetzt gespeichert werden.</div></div></div><div class="pdfFile">'+escapeHtml(out.filename)+'</div><a class="pdfDownload" id="pdfDownloadLink" href="'+pdfUrl+'" download="'+escapeHtml(out.filename)+'" type="application/pdf" rel="noopener">PDF herunterladen / speichern</a>');
  }catch(err){console.error('Hotel PDF V2',err);setState('error','<strong>Die PDF konnte nicht erstellt werden.</strong><div class="pdfHint">'+escapeHtml(err?.message||String(err))+'</div>')}
  finally{source.remove();btn.disabled=false;btn.textContent=old}
}
$('#pdfBtn')?.addEventListener('click',makePdf);
window.addEventListener('pagehide',()=>{if(pdfUrl)URL.revokeObjectURL(pdfUrl)});
calcServices();calcOwn();
})();
