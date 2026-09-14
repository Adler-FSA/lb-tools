(()=>{
'use strict';
/* HANDEL_PDF_V2_ADAPTER
   Nutzt die FSA_CONTRACT_PDF_ENGINE_V2 wie die Hotel-Seite.
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
function businessName(){return ($('#businessName')?.value||'').trim()||'Geschäft'}
function sectorName(){return ($('.sectorTab.active')?.textContent||$('#ownSector')?.textContent||'Handel').trim()}
function sectorKey(){return $('.sectorTab.active')?.dataset?.sector||'kueche'}

const sectorStories={
  kueche:{
    headline:'Aus einem Küchenverkauf kann eine längere Kundenreise entstehen.',
    intro:'Nach dem Hauptkauf können Armatur, Geräte, Beleuchtung, Zubehör oder spätere Erweiterungen weitere Kaufentscheidungen auslösen. Der Wertgutschein schafft dafür einen konkreten Anlass zur Rückkehr.',
    mainWord:'Küche',
    followWord:'Ausstattung, Ergänzungen und spätere Erweiterungen'
  },
  auto:{
    headline:'Das Fahrzeug ist der Anfang - nicht das Ende der Kundenbeziehung.',
    intro:'Winterräder, Inspektion, Dachbox, Träger, Fahrzeugpflege und weitere Serviceleistungen schaffen nach dem Fahrzeugkauf zusätzliche Kontaktpunkte und mögliche Folgeumsätze.',
    mainWord:'Fahrzeug',
    followWord:'Zubehör, Service und wiederkehrende Fahrzeugleistungen'
  },
  moebel:{
    headline:'Ein Raum führt oft zum nächsten.',
    intro:'Aus einem Möbelkauf können weitere Einrichtungsentscheidungen entstehen - etwa Teppich, Beleuchtung, Esstisch, Accessoires oder die nächste Raumgestaltung.',
    mainWord:'Einrichtung',
    followWord:'weitere Räume, Ergänzungen und Einrichtungsprodukte'
  },
  wohnmobil:{
    headline:'Nach dem Wohnmobilkauf beginnt häufig erst die Ausstattung.',
    intro:'Markise, Fahrradträger, Solaranlage, Service, Nachrüstung und Einlagerung sind typische Folgekontakte, die aus einem großen Erstkauf eine längerfristige Kundenbeziehung machen können.',
    mainWord:'Wohnmobil',
    followWord:'Nachrüstung, Reiseausstattung und Service'
  }
};

function story(){return sectorStories[sectorKey()]||sectorStories.kueche}

function enhanceTradeUi(){
  const style=document.createElement('style');
  style.textContent=`
    .pdfPanel{margin-top:22px;border-radius:22px;overflow:hidden;border:1px solid #bcdfe1;background:linear-gradient(135deg,#132238 0 38%,#0f4b58 100%);box-shadow:0 18px 34px rgba(19,34,56,.13)}
    .pdfPanelInner{display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center;padding:24px}.pdfCopy{color:#fff}.pdfCopy .miniLabel{font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase;color:#7ce0e4}.pdfCopy h3{color:#fff;font-size:27px;margin:4px 0 8px}.pdfCopy p{margin:0;color:#d6e7eb;max-width:760px}.pdfAction{display:flex;justify-content:flex-end}.pdfCreate{background:#00a7ad;color:#fff;border:1px solid rgba(255,255,255,.25);padding:13px 18px;border-radius:13px;font-weight:950;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.15)}.pdfCreate:disabled{opacity:.7;cursor:wait}
    .pdfSectorBadge{display:inline-flex;margin-top:12px;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:13px;font-weight:900}
    .pdfState{display:none;margin:0 24px 24px;background:#fff;border:1px solid #d7e5e8;border-radius:17px;padding:16px;color:#132238}.pdfState.show{display:block}.pdfState.generating{display:flex;align-items:center;gap:12px}.pdfState.success{display:block;border-color:#9edadd;background:#f5ffff}.pdfState.error{display:block;border-color:#efc8d8;background:#fff7fa}.pdfSpinner{width:24px;height:24px;border:3px solid #d4ecee;border-top-color:#00a7ad;border-radius:50%;animation:tradePdfSpin .9s linear infinite;flex:0 0 auto}.pdfReadyTop{display:flex;align-items:flex-start;gap:12px}.pdfCheck{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#00a7ad;color:#fff;font-weight:950}.pdfFile{margin-top:9px;padding:10px 12px;background:#fff;border:1px solid #cce5e7;border-radius:11px;font-size:13px;color:#506272;word-break:break-word}.pdfDownload{display:inline-flex;margin-top:12px;text-decoration:none;background:#132238;color:#fff;padding:11px 15px;border-radius:11px;font-weight:950}.pdfHint{margin-top:7px;font-size:12px;color:#6a7a89}.pdfSource{position:fixed;left:-100000px;top:0;width:720px;background:#fff;padding:20px;pointer-events:none}.businessNameField{border-color:#b7dfe1!important;background:#f8ffff!important}@keyframes tradePdfSpin{to{transform:rotate(360deg)}}
    @media(max-width:980px){.pdfPanelInner{grid-template-columns:1fr}.pdfAction{justify-content:flex-start}}
    @media(max-width:560px){.pdfPanelInner{padding:20px}.pdfState{margin:0 20px 20px}.pdfCreate{width:100%}}
  `;
  document.head.appendChild(style);

  const mainCalc=$('#eigene-zahlen .calc');
  if(mainCalc&&!$('#businessName')){
    const h=mainCalc.querySelector('h3');
    const field=document.createElement('div');field.className='field';
    field.innerHTML='<label for="businessName">Name Ihres Geschäfts / Betriebs</label><input class="businessNameField" id="businessName" placeholder="z. B. Autohaus Müller" autocomplete="organization"><small>Wird für Ihre persönliche PDF-Auswertung und den Dateinamen verwendet.</small>';
    h?.insertAdjacentElement('afterend',field);
  }

  const actions=$('#eigene-zahlen .actions');
  if(actions&&!$('#pdfPanel')){
    const panel=document.createElement('div');panel.className='pdfPanel';panel.id='pdfPanel';
    panel.innerHTML=`<div class="pdfPanelInner"><div class="pdfCopy"><div class="miniLabel">Ihre persönliche Entscheidungsunterlage</div><h3>Handels-Erklärreport als fertige PDF</h3><p>Die PDF erklärt zuerst die Idee und den Kreislauf, danach Ihre gewählte Branche und erst dann Ihre eigenen Zahlen. So kann die Unterlage auch ohne das ursprüngliche Gespräch intern weitergegeben werden.</p><span class="pdfSectorBadge" id="pdfSectorBadge"></span></div><div class="pdfAction"><button class="pdfCreate" id="pdfBtn" type="button">Erklärreport als PDF erstellen</button></div></div><div class="pdfState" id="pdfState" aria-live="polite"></div>`;
    actions.insertAdjacentElement('beforebegin',panel);
  }
  syncPdfSector();
  $$('.sectorTab').forEach(b=>b.addEventListener('click',()=>setTimeout(syncPdfSector,0)));
}
function syncPdfSector(){const b=$('#pdfSectorBadge');if(b)b.textContent='Aktuell gewählt: '+sectorName()}

function mainData(){
  const price=n('#mainPrice'),cost=n('#mainCost'),rewardPct=n('#rewardPct'),reservePct=n('#reservePct');
  const voucher=price*(rewardPct/100),reserve=voucher*(reservePct/100),gross=price-cost,discounted=Math.max(0,price-voucher);
  return{price,cost,rewardPct,reservePct,voucher,reserve,gross,discounted};
}
function nextData(){
  const price=n('#nextPrice'),cost=n('#nextCost'),voucher=Math.min(n('#nextVoucher'),price),pay=Math.max(0,price-voucher),margin=pay-cost;
  return{price,cost,voucher,pay,margin};
}
function itemRows(){
  return $$('[data-item]').map(r=>{
    const name=(r.querySelector('.serviceName')?.textContent||'Produkt / Leistung').trim();
    const price=n(r.querySelector('[data-price]')),cost=n(r.querySelector('[data-cost]')),voucher=Math.min(n(r.querySelector('[data-voucher]')),price),pay=Math.max(0,price-voucher),margin=pay-cost;
    return{name,price,cost,voucher,pay,margin};
  });
}
function itemTotals(rows){return rows.reduce((a,x)=>({sales:a.sales+x.price,costs:a.costs+x.cost,voucher:a.voucher+x.voucher,cash:a.cash+x.pay,margin:a.margin+x.margin}),{sales:0,costs:0,voucher:0,cash:0,margin:0})}

function add(parent,tag,text){const el=document.createElement(tag);el.textContent=text;parent.appendChild(el);return el}
function table(parent,rows){const t=document.createElement('table');const tb=document.createElement('tbody');t.appendChild(tb);rows.forEach(([a,b])=>{const tr=document.createElement('tr');const c1=document.createElement('td'),c2=document.createElement('td');c1.textContent=a;c2.textContent=b;tr.append(c1,c2);tb.appendChild(tr)});parent.appendChild(t);return t}
function list(parent,items){const ul=document.createElement('ul');items.forEach(x=>{const li=document.createElement('li');li.textContent=x;ul.appendChild(li)});parent.appendChild(ul);return ul}

function buildPdfSource(){
  const main=mainData(),next=nextData(),rows=itemRows(),tot=itemTotals(rows),sector=sectorName(),s=story();
  const root=document.createElement('section');root.className='pdfSource';root.setAttribute('aria-hidden','true');

  add(root,'h1','Mehr verkaufen, ohne den Preis zu verschenken.');
  add(root,'p',businessName()+' · '+sector+' · Entscheidungsunterlage vom '+displayDate());
  add(root,'p','Diese Unterlage erklärt das Modell so, dass es auch ohne das ursprüngliche Gespräch nachvollziehbar bleibt: zuerst die Idee, dann der Kreislauf, anschließend das Branchenbeispiel und erst danach die individuellen Zahlen.');

  add(root,'h2','Der Gedanke in 30 Sekunden');
  add(root,'p','Der Kunde bezahlt den Hauptkauf zum regulären Preis. Zusätzlich erhält er einen Wertgutschein, der bei dafür vorgesehenen Folgeangeboten eingesetzt werden kann. Dadurch wird der Kundenvorteil nicht als sofortiger Preisnachlass verbraucht, sondern kann einen Anlass für weitere Kaufentscheidungen schaffen.');
  table(root,[
    ['Hauptkauf heute',eur(main.price)+' regulärer Verkaufspreis'],
    ['Zusätzlicher Kundenvorteil',eur(main.voucher)+' Wertgutschein'],
    ['Ziel des Modells','Wiederkehr, Zubehör, Service und weitere Kaufentscheidungen'],
    ['Gewählte Branche',sector]
  ]);

  add(root,'h2','Rabatt oder zusätzliche Kaufkraft?');
  add(root,'p','Würde derselbe Prozentsatz als klassischer Preisnachlass gegeben, reduzierte sich der heutige Verkaufspreis sofort. Beim Wertgutschein-Modell bleibt der Hauptverkauf zum regulären Preis bestehen und der Vorteil wird in die nächste Nutzung verlagert.');
  table(root,[
    ['Klassischer Rabatt mit '+pct(main.rewardPct),eur(main.discounted)+' heutiger Verkaufspreis'],
    ['Wertgutschein-Modell',eur(main.price)+' heutiger Verkaufspreis + '+eur(main.voucher)+' Wertgutschein'],
    ['Der Unterschied','Rabatt senkt den heutigen Preis. Wertgutschein schafft einen möglichen Grund für den nächsten Kauf.']
  ]);

  add(root,'h1','So funktioniert der Kreislauf');
  add(root,'h2','1 · Der Hauptkauf bleibt regulär');
  add(root,'p','Ihr Kunde bezahlt den Hauptkauf in diesem Beispiel mit '+eur(main.price)+'. Der Wertgutschein wird nicht als Bargeld vom Kaufpreis abgezogen.');
  add(root,'h2','2 · Der Kunde erhält zusätzlichen Nutzwert');
  add(root,'p','Aus der eingestellten Belohnung von '+pct(main.rewardPct)+' entstehen '+eur(main.voucher)+' Wertgutschein. Dieser Wert kann bei dafür vorgesehenen Produkten oder Leistungen eingesetzt werden.');
  add(root,'h2','3 · Ihr Geschäft bestimmt die Spielregeln');
  add(root,'p','Nicht jedes Folgeprodukt muss denselben Gutscheinwert zulassen. Sie können den einsetzbaren Gutscheinwert an Marge, Warenkosten, Lagerbestand, Servicebedarf und gewünschtes Folgegeschäft anpassen.');
  add(root,'h2','4 · Der Wertgutschein kann Folgegeschäft anstoßen');
  add(root,'p','Wenn der Kunde für ein Folgeprodukt Gutscheinwert einsetzt, zahlt er den übrigen Anteil regulär. Entscheidend für die Wirtschaftlichkeit sind deshalb nicht nur Gutscheinwerte, sondern auch reguläre Zahlung und direkte Kosten des jeweiligen Folgeprodukts.');

  add(root,'h2','Zwei Perspektiven - derselbe Vorgang');
  table(root,[
    ['Was der Kunde sieht',eur(main.voucher)+' zusätzliche Kaufkraft für weitere Angebote'],
    ['Was Ihr Geschäft sieht',eur(main.price)+' regulärer Hauptverkauf und ein Instrument für Folgekontakte'],
    ['Wichtig','Gutscheinwert, Reserveanteil und tatsächliche Produktkosten sind unterschiedliche Größen.']
  ]);

  add(root,'h1','Ihr Branchenmodell: '+sector);
  add(root,'h2',s.headline);
  add(root,'p',s.intro);
  add(root,'p','Im gewählten Modell geht es deshalb nicht nur um den Verkauf von '+s.mainWord+', sondern um '+s.followWord+'.');

  add(root,'h2','Typische Folgeangebote in Ihrer aktuellen Auswahl');
  rows.forEach(x=>add(root,'h3',x.name));
  add(root,'p','Die Beispiele auf der Seite sind Startwerte. Sie können Verkaufspreise, direkte Kosten und einsetzbaren Gutscheinwert vor der PDF-Erstellung an Ihre reale Kalkulation anpassen.');

  add(root,'h1','Ihre Zahlen - jetzt wird das Modell konkret');
  add(root,'h2','Ihr Hauptverkauf');
  table(root,[
    ['Geschäft / Betrieb',businessName()],
    ['Branche',sector],
    ['Verkaufspreis Hauptkauf',eur(main.price)],
    ['Direkte Warenkosten',eur(main.cost)],
    ['Belohnung als Wertgutschein',pct(main.rewardPct)],
    ['Wertgutschein',eur(main.voucher)],
    ['Reserveanteil im Rechenmodell',eur(main.reserve)+' ('+pct(main.reservePct)+' des Gutscheinwerts)'],
    ['Rohertrag vor weiteren Kosten',eur(main.gross)]
  ]);
  add(root,'p','Der Reserveanteil ist eine eigene Größe des Modells. Er ist weder mit dem Nennwert des Wertgutscheins noch mit den tatsächlichen Kosten eines späteren Folgeprodukts gleichzusetzen.');

  add(root,'h2','Ihre Folgeprodukte');
  rows.forEach(x=>{
    add(root,'h3',x.name);
    table(root,[
      ['Verkaufspreis',eur(x.price)],
      ['Einsetzbarer Gutscheinwert',eur(x.voucher)],
      ['Kunde zahlt regulär',eur(x.pay)],
      ['Direkte Kosten',eur(x.cost)],
      ['Verbleibt vor weiteren Kosten',eur(x.margin)]
    ]);
  });
  add(root,'h2','Gesamtbild der gewählten Folgeprodukte');
  table(root,[
    ['Verkaufswert gesamt',eur(tot.sales)],
    ['Gutscheinwert eingesetzt',eur(tot.voucher)],
    ['Reguläre Zahlungen',eur(tot.cash)],
    ['Direkte Kosten gesamt',eur(tot.costs)],
    ['Verbleibt vor weiteren Kosten',eur(tot.margin)]
  ]);

  add(root,'h2','Ihr konkretes Folgeprodukt');
  table(root,[
    ['Verkaufspreis',eur(next.price)],
    ['Einsetzbarer Gutscheinwert',eur(next.voucher)],
    ['Reguläre Zahlung des Kunden',eur(next.pay)],
    ['Direkte Warenkosten',eur(next.cost)],
    ['Verbleibt vor weiteren Kosten',eur(next.margin)]
  ]);
  add(root,'p','Der entscheidende Blick: Der Kunde erlebt '+eur(next.voucher)+' Gutscheinvorteil. Ihr Geschäft erhält gleichzeitig '+eur(next.pay)+' reguläre Zahlung. Ob das Angebot wirtschaftlich attraktiv ist, entscheidet Ihre reale Kosten- und Margenstruktur.');

  add(root,'h1','Was Sie selbst steuern können');
  list(root,[
    'Hohe Marge: Produkte mit guter Marge können mehr Spielraum für einsetzbaren Gutscheinwert bieten.',
    'Lager bewegen: Bestände oder Auslaufmodelle können gezielt attraktiver gestaltet werden.',
    'Zubehör und Service fördern: Folgeprodukte können bewusst stärker in den Fokus gerückt werden.',
    'Wiederkehr schaffen: Der Wertgutschein kann einen konkreten Grund für den nächsten Kundenkontakt geben.',
    'Individuell staffeln: Nicht jedes Produkt muss denselben Gutscheinwert zulassen.'
  ]);

  add(root,'h2','So lässt sich das Modell intern in vier Sätzen erklären');
  list(root,[
    'Wir reduzieren den Hauptkauf nicht automatisch um den Gutscheinwert, sondern verkaufen zunächst zum regulären Preis.',
    'Der Kunde erhält zusätzlichen Wert, den er bei dafür vorgesehenen Folgeangeboten einsetzen kann.',
    'Wir bestimmen selbst, bei welchen Produkten wie viel Gutscheinwert eingesetzt werden kann.',
    'Für die Wirtschaftlichkeit zählen reguläre Zahlung, direkte Kosten und unsere eigene Kalkulation - nicht allein der Gutschein-Nennwert.'
  ]);

  add(root,'h2','Technischer Hintergrund');
  add(root,'p','Der auf dieser Unterlage als Wertgutschein bezeichnete digitale Gutscheinwert wird im zugrunde liegenden System technisch als Voucher Currency geführt. VOW, Reserve-Logik und Voucher Ledger gehören zur technischen Infrastruktur und werden im Voucher Business Kompass separat erklärt. Für das Verständnis des Geschäftsmodells müssen diese technischen Begriffe nicht zuerst verstanden werden.');

  add(root,'h2','Wichtige Einordnung');
  add(root,'p','Diese Unterlage ist eine Beispiel- und Entscheidungsrechnung zur Veranschaulichung des Modells. Tatsächlicher Reserveanteil, Akzeptanzregeln, Kosten und wirtschaftliche Wirkung hängen von den jeweils geltenden Bedingungen und Ihrer eigenen Kalkulation ab. Keine Umsatz- oder Erfolgsgarantie.');

  document.body.appendChild(root);return root;
}

function setState(type,html){const box=$('#pdfState');if(!box)return;box.className='pdfState show '+type;box.innerHTML=html;requestAnimationFrame(()=>box.scrollIntoView({behavior:'smooth',block:'center'}))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function makePdf(){
  const enteredName=($('#businessName')?.value||'').trim();
  if(!enteredName){setState('error','<strong>Bitte tragen Sie zuerst den Namen Ihres Geschäfts oder Betriebs ein.</strong><div class="pdfHint">Der Name wird für die persönliche Auswertung und den eindeutigen Dateinamen benötigt.</div>');$('#businessName')?.focus();return}
  if(!window.FSAContractPdfEngine||window.FSAContractPdfEngine.version!==EXPECTED){setState('error','<strong>PDF Engine V2 konnte nicht geladen werden.</strong><div class="pdfHint">Bitte laden Sie die Seite neu und versuchen Sie es erneut.</div>');return}
  const btn=$('#pdfBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='PDF wird erstellt …';
  setState('generating','<span class="pdfSpinner" aria-hidden="true"></span><div><strong>Ihre Erklär- und Entscheidungsunterlage wird erstellt.</strong><div class="pdfHint">Die PDF baut zuerst das Modell verständlich auf und übernimmt anschließend Ihre gewählte Branche und alle aktuellen Rechnerwerte.</div></div>');
  const source=buildPdfSource();
  try{
    const safeName=window.FSAContractPdfEngine.safeFilePart(businessName());
    const safeSector=window.FSAContractPdfEngine.safeFilePart(sectorName());
    const filename=`Handel_Erklaerreport_${safeName}_${safeSector}_${isoDate()}.pdf`;
    const out=await window.FSAContractPdfEngine.generate({
      contentRoot:source,fieldsRoot:source,
      titleText:'Mehr verkaufen, ohne den Preis zu verschenken',
      subtitleText:businessName()+' · '+sectorName()+' · Erklär- und Entscheidungsunterlage · '+displayDate(),
      footerText:'LiquidityBooster · Handel & Produktverkauf · '+sectorName(),
      filename,autoDownload:false
    });
    if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(out.blob);
    setState('success','<div class="pdfReadyTop"><span class="pdfCheck">✓</span><div><strong>Ihre PDF ist fertig erstellt.</strong><div class="pdfHint">Die Unterlage ist so aufgebaut, dass sie auch ohne das ursprüngliche Gespräch intern weitergegeben werden kann.</div></div></div><div class="pdfFile">'+escapeHtml(out.filename)+'</div><a class="pdfDownload" id="pdfDownloadLink" href="'+pdfUrl+'" download="'+escapeHtml(out.filename)+'" type="application/pdf" rel="noopener">PDF herunterladen / speichern</a>');
  }catch(err){console.error('Handel PDF V2',err);setState('error','<strong>Die PDF konnte nicht erstellt werden.</strong><div class="pdfHint">'+escapeHtml(err?.message||String(err))+'</div>')}
  finally{source.remove();btn.disabled=false;btn.textContent=old}
}

enhanceTradeUi();
$('#pdfBtn')?.addEventListener('click',makePdf);
window.addEventListener('pagehide',()=>{if(pdfUrl)URL.revokeObjectURL(pdfUrl)});
})();
