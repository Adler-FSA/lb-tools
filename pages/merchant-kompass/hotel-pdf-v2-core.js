(()=>{
'use strict';
/* HOTEL_PDF_V2_ADAPTER
   Nutzt die FSA_CONTRACT_PDF_ENGINE_V2.
   Kein Druckdialog: PDF wird direkt erzeugt und anschließend mit festem Dateinamen angeboten.
   Die PDF ist bewusst als Erklär- und Entscheidungsunterlage aufgebaut, nicht als technischer Rechnerauszug.
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
function enteredHouseName(){return ($('#hotelName')?.value||'').trim()}
function hotelName(){return enteredHouseName()||'Ihr Haus'}

function enhanceHotelUi(){
  const style=document.createElement('style');
  style.textContent=`
    #eigene-zahlen .calcGrid{grid-template-columns:minmax(330px,.82fr) minmax(0,1.18fr);align-items:start}
    #eigene-zahlen .calcGrid>div:last-child{min-width:0}
    .calcResultBlock{margin:14px 0 24px;border:1px solid #dbe5e9;border-radius:20px;background:linear-gradient(180deg,#fbfdfd,#f4f8f9);padding:18px 18px 16px}
    .calcResultHead{display:flex;align-items:center;gap:10px;margin-bottom:12px;color:#132238;font-weight:950;font-size:18px}
    .calcResultHead:before{content:'';width:9px;height:32px;border-radius:999px;background:#00a7ad;flex:0 0 auto}
    .calculatorResults{margin-top:0!important;grid-template-columns:repeat(4,minmax(0,1fr))!important}
    .calculatorResults .metric{min-height:112px;display:flex;flex-direction:column;justify-content:flex-start;padding:18px}
    .calculatorResults .metric span{font-size:14px;line-height:1.35}
    .calculatorResults .metric strong{font-size:clamp(24px,2.2vw,34px);line-height:1.1;margin-top:auto;padding-top:8px}
    .detailsBody p:first-child{max-width:1050px}
    .detailsBody p:has(a){display:inline-block;margin:10px 10px 0 0}
    .detailsBody a{display:inline-flex;text-decoration:none;background:#132238;color:#fff!important;padding:10px 14px;border-radius:11px;font-weight:900}
    @media(max-width:980px){#eigene-zahlen .calcGrid{grid-template-columns:1fr}.calculatorResults{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media(max-width:560px){.calculatorResults{grid-template-columns:1fr!important}.calcResultBlock{padding:14px}.calculatorResults .metric{min-height:auto}}
  `;
  document.head.appendChild(style);

  const nameLabel=document.querySelector('label[for="hotelName"]'),nameInput=$('#hotelName');
  if(nameLabel)nameLabel.textContent='Name des Hauses / Betriebs';
  if(nameInput)nameInput.placeholder='z. B. Fischerhaus';

  const details=$('.detailsBody');
  if(details){
    const intro=details.querySelector('p');
    if(intro)intro.textContent='Der auf dieser Seite als Wertgutschein bezeichnete digitale Gutscheinwert wird im zugrunde liegenden System technisch als Voucher Currency geführt. Die technischen Zusammenhänge und VTravel werden auf zwei eigenständigen Informationsseiten dieses Business-Kompasses erklärt.';
    const links=[...details.querySelectorAll('a')];
    if(links[0]){links[0].href='voucher-currency.html?from=hotel';links[0].removeAttribute('target');links[0].removeAttribute('rel')}
    if(links[1]){links[1].href='vtravel.html?from=hotel';links[1].removeAttribute('target');links[1].removeAttribute('rel')}
  }

  const panel=$('#pdfPanel');
  if(panel){
    const label=panel.querySelector('.miniLabel'),h=panel.querySelector('.pdfCopy h3'),p=panel.querySelector('.pdfCopy p'),btn=$('#pdfBtn');
    if(label)label.textContent='Ihre persönliche Entscheidungsunterlage';
    if(h)h.textContent='Hotel-Erklärreport als fertige PDF';
    if(p)p.textContent='Die PDF erklärt zuerst den Nutzen und den Kreislauf, danach die Hotelbeispiele und erst dann Ihre eigenen Zahlen. So kann die Unterlage auch ohne das ursprüngliche Gespräch intern weitergegeben werden.';
    if(btn)btn.textContent='Erklärreport als PDF erstellen';
  }

  const grids=$$('#eigene-zahlen .calcGrid');
  grids.forEach((grid,i)=>{
    const right=grid.children[1];
    const summary=right?.querySelector('.summary');
    if(!summary||summary.closest('.calcResultBlock'))return;
    const block=document.createElement('div');block.className='calcResultBlock';
    const head=document.createElement('div');head.className='calcResultHead';
    head.textContent=i===0?'Ihre Direktbuchung auf einen Blick':'Ihre konkrete Leistung auf einen Blick';
    summary.classList.add('calculatorResults');
    block.append(head,summary);
    grid.insertAdjacentElement('afterend',block);
  });
}

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
  const voucher=booking*vp,reserve=voucher*rp,otaCost=booking*ota,free=Math.max(0,booking-reserve),discounted=Math.max(0,booking-voucher);
  $('#calcBooking').textContent=eur(booking);$('#calcVoucher').textContent=eur(voucher);$('#calcReserve').textContent=eur(reserve);$('#calcOta').textContent=eur(otaCost);
  $('#liquidityExplain').textContent='Von '+eur(booking)+' regulärer Zahlung werden in diesem Beispiel '+eur(reserve)+' als Reserveanteil hinterlegt. Rechnerisch bleiben zunächst '+eur(free)+' freie Liquidität. Der Wertgutschein von '+eur(voucher)+' wird nicht als Bargeld ausgezahlt.';
  $('#guestExplain').textContent='Ihr Gast erhält '+eur(voucher)+' zusätzliche Kaufkraft als Wertgutschein für zulässige weitere Leistungen und Akzeptanzstellen.';
  const price=n('#offerPrice'),cost=n('#offerCost'),gv=Math.min(n('#offerVoucher'),price),pay=Math.max(0,price-gv),margin=pay-cost;
  $('#offerPay').textContent=eur(pay);$('#offerBenefit').textContent=eur(gv);$('#offerCostOut').textContent=eur(cost);$('#offerMargin').textContent=eur(margin);
  $('#offerExplain').textContent='Ihr Gast erlebt bei dieser Leistung '+eur(gv)+' Gutscheinvorteil und zahlt '+eur(pay)+' regulär. Bei '+eur(cost)+' direkten Kosten verbleiben '+eur(margin)+' vor Personal, Fixkosten, Steuern und weiteren Kosten.';
  return{booking,voucher,reserve,otaCost,free,discounted,price,cost,gv,pay,margin};
}
$$('[data-service] input').forEach(i=>i.addEventListener('input',calcServices));
['#booking','#voucherPct','#reservePct','#otaPct','#offerPrice','#offerCost','#offerVoucher'].forEach(id=>$(id)?.addEventListener('input',calcOwn));

function add(parent,tag,text){const el=document.createElement(tag);el.textContent=text;parent.appendChild(el);return el}
function table(parent,rows){const t=document.createElement('table');const tb=document.createElement('tbody');t.appendChild(tb);rows.forEach(([a,b])=>{const tr=document.createElement('tr');const c1=document.createElement('td'),c2=document.createElement('td');c1.textContent=a;c2.textContent=b;tr.append(c1,c2);tb.appendChild(tr)});parent.appendChild(t);return t}
function list(parent,items){const ul=document.createElement('ul');items.forEach(x=>{const li=document.createElement('li');li.textContent=x;ul.appendChild(li)});parent.appendChild(ul);return ul}
function serviceRows(){return $$('[data-service]').map(r=>{
  const name=(r.querySelector('.serviceName')?.textContent||'Leistung').trim(),price=n(r.querySelector('[data-price]')),cost=n(r.querySelector('[data-cost]')),g=Math.min(n(r.querySelector('[data-voucher]')),price),pay=Math.max(0,price-g),left=pay-cost;
  return{name,price,cost,g,pay,left};
})}

function buildPdfSource(){
  const own=calcOwn(),svc=calcServices(),rows=serviceRows(),root=document.createElement('section');root.className='pdfSource';root.setAttribute('aria-hidden','true');

  add(root,'h1','Mehr Direktbuchungen. Mehr Nutzung im Haus. Mehr eigene Gästebeziehung.');
  add(root,'p',hotelName()+' · Entscheidungsunterlage vom '+displayDate());
  add(root,'p','Diese Unterlage erklärt das Modell so, dass es auch ohne das ursprüngliche Gespräch nachvollziehbar bleibt: zuerst die Idee und der Nutzen, dann der Hotel-Kreislauf und anschließend Ihre eigenen Zahlen.');

  add(root,'h2','Der Gedanke in 30 Sekunden');
  add(root,'p','Der Gast bezahlt seine Buchung zum regulären Preis. Zusätzlich erhält er einen Wertgutschein, den er bei dafür vorgesehenen Leistungen einsetzen kann. Dadurch wird der Vorteil nicht als sofortiger Zimmerpreis-Rabatt verbraucht, sondern kann weitere Nutzung im Hotel oder bei teilnehmenden Partnern anstoßen.');
  table(root,[
    ['Reguläre Buchung',eur(own.booking)],
    ['Zusätzlicher Kundenvorteil',eur(own.voucher)+' Wertgutschein'],
    ['OTA-Kosten zum Vergleich',eur(own.otaCost)+' bei '+pct(n('#otaPct'))],
    ['Ziel des Modells','Direktbuchung, zusätzlicher Konsum, Wiederkehr und stärkere Gästebeziehung']
  ]);

  add(root,'h2','Rabatt oder zusätzlicher Wert?');
  add(root,'p','Würde derselbe Prozentsatz als klassischer Preisnachlass gegeben, reduzierte sich der heutige Buchungsumsatz sofort. Beim Wertgutschein-Modell bleibt die Buchung zum regulären Wert bestehen und der Vorteil wird auf weitere Nutzung verlagert.');
  table(root,[
    ['Klassischer Rabatt mit '+pct(n('#voucherPct')),eur(own.discounted)+' heutiger Buchungsumsatz'],
    ['Wertgutschein-Modell',eur(own.booking)+' heutiger Buchungsumsatz + '+eur(own.voucher)+' Wertgutschein'],
    ['Der Unterschied','Rabatt senkt den heutigen Preis. Wertgutschein schafft einen möglichen Grund für weitere Nutzung.']
  ]);

  add(root,'h1','So funktioniert der Hotel-Kreislauf');
  add(root,'h2','1 · Der Gast bucht zum regulären Preis');
  add(root,'p','Die Buchung bleibt in diesem Beispiel bei '+eur(own.booking)+'. Der Wertgutschein wird nicht als Bargeld vom Zimmerpreis abgezogen.');
  add(root,'h2','2 · Der Gast erhält zusätzlichen Nutzwert');
  add(root,'p','Aus der eingestellten Belohnung von '+pct(n('#voucherPct'))+' entstehen '+eur(own.voucher)+' Wertgutschein. Für den Gast entsteht damit zusätzliche Kaufkraft für dafür vorgesehene Angebote.');
  add(root,'h2','3 · Ihr Hotel bestimmt die Einlösung');
  add(root,'p','Sie entscheiden, bei welchen Leistungen wie viel Gutscheinwert eingesetzt werden darf. Sauna, Massage, Dinner, Bar oder andere Angebote müssen nicht denselben Gutscheinanteil haben.');
  add(root,'h2','4 · Aus Vorteil kann zusätzlicher Konsum entstehen');
  add(root,'p','Wenn der Gast seinen Wertgutschein für eine Leistung nutzt, zahlt er den übrigen Anteil regulär. Entscheidend für Ihr Hotel sind deshalb Verkaufspreis, einsetzbarer Gutscheinwert und die tatsächlichen direkten Kosten der jeweiligen Leistung.');

  add(root,'h2','Zwei Perspektiven - derselbe Vorgang');
  table(root,[
    ['Was der Gast sieht',eur(own.voucher)+' zusätzliche Kaufkraft und mehr nutzbare Angebote'],
    ['Was Ihr Hotel sieht',eur(own.booking)+' reguläre Buchung und einen möglichen Impuls für Zusatzkonsum'],
    ['Wichtig','Gutscheinwert, Reserveanteil und tatsächliche Leistungskosten sind unterschiedliche Größen.']
  ]);

  add(root,'h1','Was kann im Hotel daraus entstehen?');
  add(root,'p','Die folgenden Leistungen stammen aus den aktuell auf der Seite eingetragenen Hotel-Beispielen. Sie zeigen, wie unterschiedlich einsetzbarer Gutscheinwert und direkte Kosten sein können.');
  rows.forEach(x=>{
    add(root,'h3',x.name);
    table(root,[
      ['Verkaufspreis',eur(x.price)],
      ['Einsetzbarer Gutscheinwert',eur(x.g)],
      ['Gast zahlt regulär',eur(x.pay)],
      ['Direkte Kosten',eur(x.cost)],
      ['Verbleibt vor weiteren Kosten',eur(x.left)]
    ]);
  });
  add(root,'h2','Gesamtbild der Hotel-Beispiele');
  table(root,[
    ['Leistungswert gesamt',eur(svc.sales)],
    ['Gutscheinwert eingesetzt',eur(svc.gutschein)],
    ['Reguläre Zahlungen',eur(svc.cash)],
    ['Direkte Kosten gesamt',eur(svc.costs)],
    ['Verbleibt vor weiteren Kosten',eur(svc.margin)]
  ]);
  add(root,'p','Der entscheidende Gedanke: Der Gast sieht zusätzlichen Nutzwert. Ihr Hotel sieht die Chance auf zusätzlichen Konsum. Ob daraus tatsächlich Mehrumsatz entsteht, hängt von Angebot, Nachfrage, Kosten und Gestaltung ab.');

  add(root,'h2','Auch die Region kann Teil des Erlebnisses werden');
  add(root,'p','Sofern die jeweiligen Anbieter teilnehmende Akzeptanzstellen sind, kann Wertgutschein auch bei Partnern rund um das Hotel eingesetzt werden - zum Beispiel bei Freizeitangeboten, Gastronomie, E-Bike, Kutschfahrt oder Sport- und Skiverleih.');
  add(root,'p','Damit kann der wahrgenommene Wert des Aufenthalts über das Hotel hinaus wachsen, ohne dass das Hotel jede Leistung selbst anbieten muss.');

  add(root,'h1','Ihre Hotelrechnung - jetzt wird das Modell konkret');
  add(root,'h2','Ihre Direktbuchung');
  table(root,[
    ['Hotel',hotelName()],
    ['Buchungswert',eur(own.booking)],
    ['Belohnung als Wertgutschein',pct(n('#voucherPct'))],
    ['Wertgutschein',eur(own.voucher)],
    ['Reserveanteil im Rechenmodell',eur(own.reserve)+' ('+pct(n('#reservePct'))+' des Gutscheinwerts)'],
    ['Rechnerisch freie Liquidität im Beispiel',eur(own.free)],
    ['OTA-Kosten zum Vergleich',eur(own.otaCost)+' bei '+pct(n('#otaPct'))]
  ]);
  add(root,'p','Der Reserveanteil ist eine eigene Größe des Modells. Er ist weder mit dem Nennwert des Wertgutscheins noch mit den tatsächlichen Kosten einer später genutzten Leistung gleichzusetzen.');

  add(root,'h2','Ihre konkrete Leistung');
  table(root,[
    ['Verkaufspreis',eur(own.price)],
    ['Einsetzbarer Gutscheinwert',eur(own.gv)],
    ['Reguläre Zahlung des Gastes',eur(own.pay)],
    ['Direkte Kosten',eur(own.cost)],
    ['Verbleibt vor weiteren Kosten',eur(own.margin)]
  ]);
  add(root,'p','Hier wird der Unterschied sichtbar: Der Gast erlebt '+eur(own.gv)+' Gutscheinvorteil und zahlt gleichzeitig '+eur(own.pay)+' regulär. Die tatsächliche Wirtschaftlichkeit entscheidet Ihre eigene Kosten- und Margenstruktur.');

  add(root,'h1','Was Ihr Hotel selbst steuern kann');
  list(root,[
    'Hohe Marge: Leistungen mit gutem Verhältnis von Verkaufspreis zu direkten Kosten können mehr Spielraum bieten.',
    'Freie Kapazität: Nebenzeiten oder freie Spa-Termine können gezielt attraktiver gestaltet werden.',
    'Gezielt fördern: Leistungen, die Sie stärker verkaufen möchten, können mehr Gutscheinwert zulassen.',
    'Flexibel staffeln: Gutscheinwerte können je Angebot, Saison, Wochentag oder Auslastung unterschiedlich festgelegt werden.',
    'Region einbinden: Teilnehmende Partner können den nutzbaren Erlebnisraum für den Gast erweitern.'
  ]);

  add(root,'h2','So lässt sich das Modell intern in vier Sätzen erklären');
  list(root,[
    'Wir reduzieren den Zimmerpreis nicht automatisch um den Gutscheinwert, sondern halten die Buchung zunächst zum regulären Wert.',
    'Der Gast erhält zusätzlichen Wert, den er bei dafür vorgesehenen Leistungen einsetzen kann.',
    'Wir bestimmen selbst, bei welchen Leistungen wie viel Gutscheinwert akzeptiert wird.',
    'Für die Wirtschaftlichkeit zählen reguläre Zahlung, direkte Kosten und unsere eigene Kalkulation - nicht allein der Gutschein-Nennwert.'
  ]);

  add(root,'h2','Technischer Hintergrund');
  add(root,'p','Der auf dieser Unterlage als Wertgutschein bezeichnete digitale Gutscheinwert wird im zugrunde liegenden System technisch als Voucher Currency geführt. VOW, Reserve-Logik, Voucher Ledger und VTravel gehören zur technischen Infrastruktur und werden im Voucher Business Kompass separat erklärt. Für das Verständnis des Hotel-Modells müssen diese Begriffe nicht zuerst verstanden werden.');

  add(root,'h2','Wichtige Einordnung');
  add(root,'p','Diese Unterlage ist eine Beispiel- und Entscheidungsrechnung zur Veranschaulichung des Modells. Tatsächlicher Reserveanteil, Akzeptanzregeln, Kosten und wirtschaftliche Wirkung hängen von den jeweils geltenden Bedingungen und Ihrer eigenen Kalkulation ab. Keine Umsatz- oder Erfolgsgarantie.');

  return root;
}

function setState(type,html){const box=$('#pdfState');if(!box)return;box.className='pdfState show '+type;box.innerHTML=html}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function makePdf(){
  const enteredName=enteredHouseName();
  if(!window.FSAContractPdfEngine||window.FSAContractPdfEngine.version!==EXPECTED){setState('error','<strong>PDF Engine V2 konnte nicht geladen werden.</strong><div class="pdfHint">Bitte laden Sie die Seite neu und versuchen Sie es erneut.</div>');return}
  const btn=$('#pdfBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='PDF wird erstellt …';
  setState('generating','<span class="pdfSpinner" aria-hidden="true"></span><div><strong>Ihre Erklär- und Entscheidungsunterlage wird erstellt.</strong><div class="pdfHint">Die PDF baut zuerst das Hotel-Modell verständlich auf und übernimmt anschließend Ihre aktuellen Rechnerwerte und Hotel-Beispiele.</div></div>');
  const source=buildPdfSource();
  try{
    const safe=enteredName?window.FSAContractPdfEngine.safeFilePart(enteredName):'';
    const filename=enteredName?`Hotel_Erklaerreport_${safe}_${isoDate()}.pdf`:`Hotel_Erklaerreport_${isoDate()}.pdf`;
    const out=await window.FSAContractPdfEngine.generate({contentRoot:source,fieldsRoot:source,titleText:'Mehr Direktbuchungen. Mehr Nutzung im Haus.',subtitleText:hotelName()+' · Erklär- und Entscheidungsunterlage · '+displayDate(),footerText:'LiquidityBooster · Hotel & Gastgewerbe',filename,autoDownload:false});
    if(pdfUrl)URL.revokeObjectURL(pdfUrl);const pdfFile=out.file||out.blob;pdfUrl=URL.createObjectURL(pdfFile);
    setState('success','<div class="pdfReadyTop"><span class="pdfCheck">✓</span><div><strong>Ihre PDF ist fertig erstellt.</strong><div class="pdfHint">Die Unterlage ist so aufgebaut, dass sie auch ohne das ursprüngliche Gespräch intern weitergegeben werden kann.</div></div></div><div class="pdfFile">'+escapeHtml(out.filename)+'</div><a class="pdfDownload" id="pdfDownloadLink" href="'+pdfUrl+'" download="'+escapeHtml(out.filename)+'" type="application/pdf" rel="noopener">PDF herunterladen / speichern</a>');
  }catch(err){console.error('Hotel PDF V2',err);setState('error','<strong>Die PDF konnte nicht erstellt werden.</strong><div class="pdfHint">'+escapeHtml(err?.message||String(err))+'</div>')}
  finally{source.remove();btn.disabled=false;btn.textContent=old}
}
$('#pdfBtn')?.addEventListener('click',makePdf);
window.addEventListener('pagehide',()=>{if(pdfUrl)URL.revokeObjectURL(pdfUrl)});
enhanceHotelUi();
calcServices();calcOwn();
})();