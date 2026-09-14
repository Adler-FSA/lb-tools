(()=>{
'use strict';
/* HANDEL_PDF_V2_ADAPTER
   Nutzt exakt die FSA_CONTRACT_PDF_ENGINE_V2 wie die Hotel-Seite.
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
function businessName(){return ($('#businessName')?.value||'').trim()||'Geschäft'}
function sectorName(){return ($('.sectorTab.active')?.textContent||$('#ownSector')?.textContent||'Handel').trim()}

function enhanceTradeUi(){
  const style=document.createElement('style');
  style.textContent=`
    .pdfPanel{margin-top:22px;border-radius:22px;overflow:hidden;border:1px solid #bcdfe1;background:linear-gradient(135deg,#132238 0 38%,#0f4b58 100%);box-shadow:0 18px 34px rgba(19,34,56,.13)}
    .pdfPanelInner{display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center;padding:24px}.pdfCopy{color:#fff}.pdfCopy .miniLabel{font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase;color:#7ce0e4}.pdfCopy h3{color:#fff;font-size:27px;margin:4px 0 8px}.pdfCopy p{margin:0;color:#d6e7eb;max-width:760px}.pdfAction{display:flex;justify-content:flex-end}.pdfCreate{background:#00a7ad;color:#fff;border:1px solid rgba(255,255,255,.25);padding:13px 18px;border-radius:13px;font-weight:950;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.15)}.pdfCreate:disabled{opacity:.7;cursor:wait}
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
    panel.innerHTML=`<div class="pdfPanelInner"><div class="pdfCopy"><div class="miniLabel">Ihre persönliche Auswertung</div><h3>Handels-Potenzialreport als fertige PDF</h3><p>Ihre gewählte Branche, die aktuellen Rechnerwerte und die Folgeprodukte werden direkt zu einer professionellen Auswertung zusammengeführt.</p></div><div class="pdfAction"><button class="pdfCreate" id="pdfBtn" type="button">Handels-Auswertung als PDF erstellen</button></div></div><div class="pdfState" id="pdfState" aria-live="polite"></div>`;
    actions.insertAdjacentElement('beforebegin',panel);
  }
}

function mainData(){
  const price=n('#mainPrice'),cost=n('#mainCost'),rewardPct=n('#rewardPct'),reservePct=n('#reservePct');
  const voucher=price*(rewardPct/100),reserve=voucher*(reservePct/100),gross=price-cost;
  return{price,cost,rewardPct,reservePct,voucher,reserve,gross};
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

function buildPdfSource(){
  const main=mainData(),next=nextData(),rows=itemRows(),tot=itemTotals(rows),sector=sectorName();
  const root=document.createElement('section');root.className='pdfSource';root.setAttribute('aria-hidden','true');

  add(root,'h2','1 · Ihre Ausgangslage');
  add(root,'p','Diese Auswertung verbindet Ihren Hauptverkauf, zusätzlichen Wertgutschein und mögliches Folgegeschäft zu einem nachvollziehbaren Branchenmodell.');
  table(root,[['Geschäft / Betrieb',businessName()],['Gewählte Branche',sector],['Erstellt am',displayDate()],['Verkaufspreis Hauptkauf',eur(main.price)],['Direkte Warenkosten',eur(main.cost)],['Belohnung als Wertgutschein',pct(main.rewardPct)],['Wertgutschein',eur(main.voucher)],['Reserveanteil',eur(main.reserve)+' ('+pct(main.reservePct)+' des Gutscheinwerts)'],['Rohertrag vor weiteren Kosten',eur(main.gross)]]);

  add(root,'h2','2 · Sicht des Kunden');
  add(root,'p','Der Kunde bezahlt den Hauptkauf zum regulären Verkaufspreis von '+eur(main.price)+' und erhält zusätzlich '+eur(main.voucher)+' Kaufkraft als Wertgutschein. Der Gutscheinwert ist keine Barauszahlung, sondern kann bei dafür vorgesehenen Angeboten eingesetzt werden.');
  add(root,'p','Damit entsteht ein zusätzlicher Anlass, Zubehör, Ergänzungen, Service oder spätere Käufe in Betracht zu ziehen.');

  add(root,'h2','3 · Sicht des Geschäfts');
  add(root,'p','Gutscheinwert, Reserveanteil und die tatsächlichen Kosten eines später verkauften Produkts sind drei unterschiedliche Größen. Entscheidend sind Verkaufspreis, Warenkosten und der Gutscheinwert, den Sie beim jeweiligen Folgeangebot zulassen.');
  table(root,[['Hauptverkauf',eur(main.price)],['Direkte Warenkosten',eur(main.cost)],['Rohertrag vor weiteren Kosten',eur(main.gross)],['Ausgegebener Wertgutschein',eur(main.voucher)],['Rechnerischer Reserveanteil',eur(main.reserve)]]);

  add(root,'h2','4 · Folgegeschäft im gewählten Branchenmodell');
  add(root,'p','Die folgenden Werte entsprechen den aktuell auf der Seite eingetragenen Folgeprodukten und können zuvor individuell angepasst werden.');
  rows.forEach(x=>table(root,[[x.name,`${eur(x.price)} Verkauf · ${eur(x.voucher)} Gutschein · ${eur(x.pay)} reguläre Zahlung · ${eur(x.cost)} direkte Kosten · ${eur(x.margin)} vor weiteren Kosten`]]));
  table(root,[['Leistungswert gesamt',eur(tot.sales)],['Gutscheinwert eingesetzt',eur(tot.voucher)],['Reguläre Zahlungen',eur(tot.cash)],['Direkte Kosten gesamt',eur(tot.costs)],['Verbleibt vor weiteren Kosten',eur(tot.margin)]]);

  add(root,'h2','5 · Ihr konkretes Folgeprodukt');
  table(root,[['Verkaufspreis Folgeprodukt',eur(next.price)],['Einsetzbarer Gutscheinwert',eur(next.voucher)],['Reguläre Zahlung des Kunden',eur(next.pay)],['Direkte Warenkosten',eur(next.cost)],['Verbleibt vor weiteren Kosten',eur(next.margin)]]);
  add(root,'p','Der eingesetzte Gutscheinwert ist nicht automatisch die tatsächliche Kostenbelastung des Folgeprodukts. Maßgeblich bleiben reguläre Zahlung, Warenkosten und Ihre eigene Kalkulation.');

  add(root,'h2','6 · Mögliche Steuerungshebel');
  const ul=document.createElement('ul');[
    'Hohe Marge: Produkte mit guter Marge können mehr Spielraum für einsetzbaren Gutscheinwert bieten.',
    'Lager bewegen: Bestände oder Auslaufmodelle können gezielt attraktiver gestaltet werden.',
    'Zubehör fördern: Ergänzungen und Serviceleistungen können nach dem Hauptkauf stärker in den Fokus rücken.',
    'Wiederkehr schaffen: Der Wertgutschein kann einen konkreten Anlass für den nächsten Kundenkontakt schaffen.'
  ].forEach(x=>{const li=document.createElement('li');li.textContent=x;ul.appendChild(li)});root.appendChild(ul);

  add(root,'h2','7 · Technische Einordnung');
  add(root,'p','Der auf dieser Seite als Wertgutschein bezeichnete digitale Gutscheinwert wird im zugrunde liegenden System technisch als Voucher Currency geführt. Die technische Infrastruktur wird im Voucher Business Kompass separat erklärt.');

  add(root,'h2','8 · Wichtige Einordnung');
  add(root,'p','Diese PDF ist eine Beispielrechnung zur Veranschaulichung des Modells. Tatsächlicher Reserveanteil, Akzeptanzregeln, Kosten und wirtschaftliche Wirkung hängen von den jeweils geltenden Bedingungen und Ihrer eigenen Kalkulation ab. Keine Umsatz- oder Erfolgsgarantie.');

  document.body.appendChild(root);return root;
}

function setState(type,html){const box=$('#pdfState');if(!box)return;box.className='pdfState show '+type;box.innerHTML=html;requestAnimationFrame(()=>box.scrollIntoView({behavior:'smooth',block:'center'}))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function makePdf(){
  const enteredName=($('#businessName')?.value||'').trim();
  if(!enteredName){setState('error','<strong>Bitte tragen Sie zuerst den Namen Ihres Geschäfts oder Betriebs ein.</strong><div class="pdfHint">Der Name wird für die persönliche Auswertung und den eindeutigen Dateinamen benötigt.</div>');$('#businessName')?.focus();return}
  if(!window.FSAContractPdfEngine||window.FSAContractPdfEngine.version!==EXPECTED){setState('error','<strong>PDF Engine V2 konnte nicht geladen werden.</strong><div class="pdfHint">Bitte laden Sie die Seite neu und versuchen Sie es erneut.</div>');return}
  const btn=$('#pdfBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='PDF wird erstellt …';
  setState('generating','<span class="pdfSpinner" aria-hidden="true"></span><div><strong>Ihre Handels-Auswertung wird erstellt.</strong><div class="pdfHint">Die PDF wird direkt aus Ihrer gewählten Branche, Ihren Rechnerwerten und den aktuellen Folgeprodukten aufgebaut.</div></div>');
  const source=buildPdfSource();
  try{
    const safeName=window.FSAContractPdfEngine.safeFilePart(businessName());
    const safeSector=window.FSAContractPdfEngine.safeFilePart(sectorName());
    const filename=`Handel_Auswertung_${safeName}_${safeSector}_${isoDate()}.pdf`;
    const out=await window.FSAContractPdfEngine.generate({
      contentRoot:source,fieldsRoot:source,
      titleText:'Handel & Produktverkauf – Potenzialreport',
      subtitleText:businessName()+' · '+sectorName()+' · '+displayDate(),
      footerText:'LiquidityBooster · Handel & Produktverkauf',
      filename,autoDownload:false
    });
    if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(out.blob);
    setState('success','<div class="pdfReadyTop"><span class="pdfCheck">✓</span><div><strong>Ihre PDF ist fertig erstellt.</strong><div class="pdfHint">Die Datei ist vollständig vorbereitet und kann jetzt direkt gespeichert werden.</div></div></div><div class="pdfFile">'+escapeHtml(out.filename)+'</div><a class="pdfDownload" id="pdfDownloadLink" href="'+pdfUrl+'" download="'+escapeHtml(out.filename)+'" type="application/pdf" rel="noopener">PDF herunterladen / speichern</a>');
  }catch(err){console.error('Handel PDF V2',err);setState('error','<strong>Die PDF konnte nicht erstellt werden.</strong><div class="pdfHint">'+escapeHtml(err?.message||String(err))+'</div>')}
  finally{source.remove();btn.disabled=false;btn.textContent=old}
}

enhanceTradeUi();
$('#pdfBtn')?.addEventListener('click',makePdf);
window.addEventListener('pagehide',()=>{if(pdfUrl)URL.revokeObjectURL(pdfUrl)});
})();
