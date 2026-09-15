(function(global){
'use strict';

const VERSION='HOTEL_BROCHURE_TEST_V6_ADDON_12P';
const PW=595.28,PH=841.89,ML=42,MR=42,W=PW-ML-MR;
const te=new TextEncoder();
const td=new TextDecoder('ascii');
const cp={8364:128,8211:150,8212:151,8216:145,8217:146,8220:147,8221:148,8222:132,8226:149,8230:133};
const C={navy:[.075,.133,.22],ink:[.145,.208,.27],gray:[.40,.46,.53],line:[.85,.89,.90],mint:[0,.655,.678],mintDark:[0,.48,.50],mintSoft:[.918,.976,.977],mag:[.776,0,.435],magSoft:[1,.945,.972],soft:[.975,.982,.984],white:[1,1,1]};
let pdfUrl='';

function clean(s){return String(s??'').replace(/[\u00AD\u2010\u2011\uFFFE\uFFFF]/g,'-').replace(/[\t\r]+/g,' ').replace(/ +/g,' ').trim()}
function bytes(s){const a=[];for(const ch of String(s??'')){const c=ch.codePointAt(0);a.push(c<=255?c:(cp[c]??63))}return new Uint8Array(a)}
const ascii=s=>te.encode(s);
const cat=a=>{let n=0;a.forEach(x=>n+=x.length);const o=new Uint8Array(n);let p=0;a.forEach(x=>{o.set(x,p);p+=x.length});return o};
const hex=s=>[...bytes(s)].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
const rgb=c=>`${c[0]} ${c[1]} ${c[2]} rg`;
const RGB=c=>`${c[0]} ${c[1]} ${c[2]} RG`;
function safeFilePart(v){return String(v||'').trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^[-.]+|[-.]+$/g,'')||'Hotel'}
function pad(x){return String(x).padStart(2,'0')}
function isoDate(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function displayDate(){return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}
function num(v){const n=Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
function euro(v){return new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0)+' €'}
function pct(v){return new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(Number(v)||0)+' %'}
function wrap(s,w,z,bold=false){const factor=bold?.555:.505,max=Math.max(7,Math.floor(w/(z*factor))),out=[];for(const para of String(s??'').split(/\n/)){const words=clean(para).split(/\s+/).filter(Boolean);if(!words.length){out.push('');continue}let line='';for(let word of words){while(word.length>max){if(line){out.push(line);line=''}out.push(word.slice(0,max));word=word.slice(max)}const t=line?line+' '+word:word;if(t.length>max&&line){out.push(line);line=word}else line=t}if(line)out.push(line)}return out.length?out:['']}
function page(){return{c:[]}}
function text(pg,s,x,y,z=10,b=false,col=C.ink){if(clean(s))pg.c.push(`BT /${b?'F2':'F1'} ${z.toFixed(2)} Tf ${rgb(col)} ${x.toFixed(2)} ${y.toFixed(2)} Td <${hex(clean(s))}> Tj ET\n`)}
function lines(pg,s,x,y,w,z=10,leading=13,b=false,col=C.ink,maxLines=99){const a=wrap(s,w,z,b).slice(0,maxLines);let yy=y;a.forEach(q=>{if(q)text(pg,q,x,yy,z,b,col);yy-=leading});return yy}
function fill(pg,x,y,w,h,col){pg.c.push(`q ${rgb(col)} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f Q\n`)}
function rule(pg,x,y,w,col=C.line,l=.7){pg.c.push(`q ${RGB(col)} ${l.toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} m ${(x+w).toFixed(2)} ${y.toFixed(2)} l S Q\n`)}
function roundPath(x,y,w,h,r){const k=.5522847498,kr=k*r;return `${(x+r).toFixed(2)} ${y.toFixed(2)} m ${(x+w-r).toFixed(2)} ${y.toFixed(2)} l ${(x+w-r+kr).toFixed(2)} ${y.toFixed(2)} ${(x+w).toFixed(2)} ${(y+r-kr).toFixed(2)} ${(x+w).toFixed(2)} ${(y+r).toFixed(2)} c ${(x+w).toFixed(2)} ${(y+h-r).toFixed(2)} l ${(x+w).toFixed(2)} ${(y+h-r+kr).toFixed(2)} ${(x+w-r+kr).toFixed(2)} ${(y+h).toFixed(2)} ${(x+w-r).toFixed(2)} ${(y+h).toFixed(2)} c ${(x+r).toFixed(2)} ${(y+h).toFixed(2)} l ${(x+r-kr).toFixed(2)} ${(y+h).toFixed(2)} ${x.toFixed(2)} ${(y+h-r+kr).toFixed(2)} ${x.toFixed(2)} ${(y+h-r).toFixed(2)} c ${x.toFixed(2)} ${(y+r).toFixed(2)} l ${x.toFixed(2)} ${(y+r-kr).toFixed(2)} ${(x+r-kr).toFixed(2)} ${y.toFixed(2)} ${(x+r).toFixed(2)} ${y.toFixed(2)} c h`}
function roundRect(pg,x,y,w,h,r,fillCol,strokeCol=null,l=.7){let cmd='q ';if(fillCol)cmd+=rgb(fillCol)+' ';if(strokeCol)cmd+=RGB(strokeCol)+` ${l} w `;cmd+=roundPath(x,y,w,h,r);cmd+=fillCol&&strokeCol?' B':fillCol?' f':' S';cmd+=' Q\n';pg.c.push(cmd)}
function arrow(pg,x1,y1,x2,y2,col=C.mint){pg.c.push(`q ${RGB(col)} 2.1 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q\n`);pg.c.push(`q ${rgb(col)} ${(x2-6).toFixed(2)} ${(y2+3.5).toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} ${(x2-6).toFixed(2)} ${(y2-3.5).toFixed(2)} l h f Q\n`)}
function topBrand(pg){text(pg,'LiquidityBooster',ML,PH-48,18,true,C.navy);text(pg,'HOTEL & GASTGEWERBE',PW-MR-112,PH-45,7.7,true,C.gray);rule(pg,ML,PH-62,W,C.mint,1.2)}
function footer(pg,i){rule(pg,ML,31,W,C.line,.5);text(pg,`LiquidityBooster · Hotel & Gastgewerbe · ${displayDate()}`,ML,17,6.5,false,C.gray);text(pg,`Seite ${i} von 12`,PW-MR-58,17,6.5,false,C.gray)}
function kicker(pg,s,y){text(pg,s.toUpperCase(),ML,y,8.3,true,C.mag)}
function bigTitle(pg,s,y,w=W,z=28,max=4){return lines(pg,s,ML,y,w,z,z*1.08,true,C.navy,max)}
function bodyText(pg,s,y,w=W,z=10.5,max=8,col=C.gray){return lines(pg,s,ML,y,w,z,z*1.38,false,col,max)}
function statCard(pg,x,y,w,h,value,label,accent=C.mint){roundRect(pg,x,y,w,h,12,C.white,C.line,.7);fill(pg,x,y+h-4,w,4,accent);text(pg,value,x+14,y+h-37,18,true,C.navy);lines(pg,label,x+14,y+h-56,w-28,7.7,10,false,C.gray,3)}
function callout(pg,y,h,titleStr,bodyStr,fillCol=C.mintSoft,accent=C.mint){roundRect(pg,ML,y,W,h,12,fillCol,C.line,.45);fill(pg,ML,y,6,h,accent);text(pg,titleStr,ML+18,y+h-26,11.5,true,C.navy);lines(pg,bodyStr,ML+18,y+h-45,W-36,9.3,12.4,false,C.ink,5)}
function infoCard(pg,x,y,w,h,titleStr,bodyStr,accent=C.mint){roundRect(pg,x,y,w,h,12,C.white,C.line,.65);fill(pg,x,y+h-4,w,4,accent);text(pg,titleStr,x+15,y+h-34,11.3,true,C.navy);lines(pg,bodyStr,x+15,y+h-56,w-30,8.8,11.8,false,C.gray,8)}
function renderPage(pg){return ascii(pg.c.join(''))}

function page9(data){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Das große Bild',PH-100);
  let y=bigTitle(pg,'Vom Zimmerverkauf zum Wertkreislauf',PH-132,W,27,3);y-=7;bodyText(pg,'Eine Direktbuchung kann mehr auslösen als nur eine Übernachtung. Entscheidend ist, wie der zusätzliche Nutzwert in weitere Berührungspunkte mit Ihrem Haus und der Region übersetzt wird.',y,W,10.4,6,C.gray);
  const gap=12,cw=(W-gap*2)/3,ch=142,top=426,bottom=252;
  infoCard(pg,ML,top,cw,ch,'1 · Direktbuchung','Der Gast entscheidet sich bewusst für die direkte Buchung beim Haus.',C.navy);
  infoCard(pg,ML+cw+gap,top,cw,ch,'2 · Wertgutschein','Zusätzlicher Nutzwert macht die Direktbuchung spürbar attraktiver.',C.mint);
  infoCard(pg,ML+2*(cw+gap),top,cw,ch,'3 · Nutzung im Haus','Restaurant, Wellness, Bar oder weitere Leistungen werden sichtbarer.',C.mag);
  infoCard(pg,ML,bottom,cw,ch,'4 · Region erleben','Teilnehmende Partner können den Erlebnisraum rund um den Aufenthalt erweitern.',C.mint);
  infoCard(pg,ML+cw+gap,bottom,cw,ch,'5 · Bindung stärken','Mehr Berührungspunkte schaffen zusätzliche Anlässe für Erinnerung und Wiederkehr.',C.navy);
  infoCard(pg,ML+2*(cw+gap),bottom,cw,ch,'6 · Neuer Buchungsanlass','Aus einem Aufenthalt kann ein weiterer direkter Kontakt zum Gast entstehen.',C.mag);
  arrow(pg,ML+cw+4,top+71,ML+cw+gap-4,top+71,C.mint);arrow(pg,ML+2*cw+gap+4,top+71,ML+2*(cw+gap)-4,top+71,C.mint);
  callout(pg,103,105,'Das Ziel ist kein Automatismus',`Das Modell schafft einen Rahmen. ${data.house==='Ihr Haus'?'Ihr Haus':data.house} entscheidet selbst, welche Leistungen teilnehmen, wie Gutscheinwerte eingesetzt werden und welche Angebote wirtschaftlich sinnvoll sind.`,C.mintSoft,C.mint);
  footer(pg,9);return pg;
}

function page10(data){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Ihre Zahlen',PH-100);
  let y=bigTitle(pg,`${data.house==='Ihr Haus'?'Ihr Haus':data.house}: Ihre Direktbuchung auf einen Blick`,PH-132,W,24,4);y-=7;bodyText(pg,'Die folgenden Werte stammen aus Ihrer aktuellen Beispielrechnung und werden für diese persönliche Entscheidungsunterlage neu zusammengeführt.',y,W,10.2,5,C.gray);
  const gap=10,cw=(W-gap*3)/4,sy=492,sh=92;
  statCard(pg,ML,sy,cw,sh,euro(data.booking),'Gast zahlt für die Buchung',C.navy);
  statCard(pg,ML+cw+gap,sy,cw,sh,euro(data.voucher),'Wertgutschein',C.mint);
  statCard(pg,ML+2*(cw+gap),sy,cw,sh,euro(data.reserve),'Reserveanteil',C.mint);
  statCard(pg,ML+3*(cw+gap),sy,cw,sh,euro(data.ota),'OTA-Kosten zum Vergleich',C.mag);
  const gap2=14,cw2=(W-gap2)/2;
  infoCard(pg,ML,318,cw2,132,'Was bleibt zunächst?','Von der regulären Zahlung wird in diesem Beispiel nur der berechnete Reserveanteil gebunden. Der Wertgutschein selbst wird nicht als Bargeld ausgezahlt.',C.mint);
  infoCard(pg,ML+cw2+gap2,318,cw2,132,'Was erhält der Gast?','Der Gast erhält zusätzlichen Nutzwert als Wertgutschein für zulässige Leistungen und teilnehmende Akzeptanzstellen.',C.mag);
  const free=Math.max(0,data.booking-data.reserve);
  callout(pg,132,132,'Rechnerischer Blick',`Bei ${euro(data.booking)} Buchungswert und ${pct(data.voucherPct)} Gutscheinanteil entstehen ${euro(data.voucher)} Wertgutschein. Bei ${pct(data.reservePct)} Reserve auf den Gutschein werden ${euro(data.reserve)} hinterlegt. Rechnerisch verbleiben zunächst ${euro(free)} freie Liquidität.`,C.mintSoft,C.mint);
  footer(pg,10);return pg;
}

function page11(data){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Konkrete Leistung',PH-100);
  let y=bigTitle(pg,'Was passiert, wenn der Gast seinen Gutschein einsetzt?',PH-132,W,25,4);y-=7;bodyText(pg,'Hier wird die Wirkung einer einzelnen Leistung transparent. Entscheidend sind Verkaufspreis, eingesetzter Gutscheinwert und die direkten Kosten.',y,W,10.3,5,C.gray);
  const gap=10,cw=(W-gap*2)/3,sy=480,sh=98;
  statCard(pg,ML,sy,cw,sh,euro(data.offerPrice),'Verkaufspreis der Leistung',C.navy);
  statCard(pg,ML+cw+gap,sy,cw,sh,euro(data.offerVoucher),'Gutscheinvorteil für den Gast',C.mint);
  statCard(pg,ML+2*(cw+gap),sy,cw,sh,euro(data.offerPay),'Gast zahlt regulär',C.mint);
  const gap2=14,cw2=(W-gap2)/2;
  statCard(pg,ML,330,cw2,105,euro(data.offerCost),'Direkte Kosten',C.navy);
  statCard(pg,ML+cw2+gap2,330,cw2,105,euro(data.offerMargin),'Verbleibt vor weiteren Kosten',C.mag);
  infoCard(pg,ML,184,W,110,'Der entscheidende Blick',`Der Gast erlebt ${euro(data.offerVoucher)} zusätzlichen Nutzwert und zahlt ${euro(data.offerPay)} regulär. Nach ${euro(data.offerCost)} direkten Kosten verbleiben ${euro(data.offerMargin)} vor Personal, Fixkosten, Steuern und weiteren Kosten.`,C.mint);
  callout(pg,93,70,'Wichtig','Die tatsächliche wirtschaftliche Wirkung hängt von der jeweiligen Leistung, ihrer Auslastung und Ihrer eigenen Kostenstruktur ab.',C.magSoft,C.mag);
  footer(pg,11);return pg;
}

function page12(){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Technischer Hintergrund',PH-100);
  let y=bigTitle(pg,'Wertgutschein, Voucher Currency und VTravel',PH-132,W,26,4);y-=7;bodyText(pg,'Hinter der sichtbaren Hotelrechnung steht ein technischer Hintergrund. Für die wirtschaftliche Betrachtung des Hauses bleibt entscheidend, die einzelnen Ebenen sauber voneinander zu trennen.',y,W,10.3,6,C.gray);
  const gap=14,cw=(W-gap)/2,ch=150;
  infoCard(pg,ML,423,cw,ch,'Wertgutschein','Der Gast sieht einen zusätzlichen Gutscheinwert, der für zulässige Angebote und bei teilnehmenden Akzeptanzstellen eingesetzt werden kann.',C.mint);
  infoCard(pg,ML+cw+gap,423,cw,ch,'Voucher Currency','Der digitale Gutscheinwert wird im zugrunde liegenden System technisch als Voucher Currency geführt.',C.mag);
  infoCard(pg,ML,253,cw,ch,'Technische Infrastruktur','Ausgabe, Übertragung und Annahme des digitalen Gutscheinwerts gehören zur technischen Ebene hinter dem sichtbaren Hotelbeispiel.',C.navy);
  infoCard(pg,ML+cw+gap,253,cw,ch,'VTravel','VTravel gehört zum Reiseumfeld des Systems und wird als eigener Anwendungsbereich neben dem Hotelbeispiel betrachtet.',C.mint);
  callout(pg,96,120,'Einordnung','Beispielrechnungen dienen der Veranschaulichung. Tatsächlicher Reserveanteil, Akzeptanzregeln, Kosten und wirtschaftliche Wirkung hängen von den jeweils geltenden Bedingungen und der eigenen Kalkulation des Hotels ab. Keine Umsatz- oder Erfolgsgarantie.',C.mintSoft,C.mint);
  footer(pg,12);return pg;
}

function findSeq(buf,seq,start=0){outer:for(let i=start;i<=buf.length-seq.length;i++){for(let j=0;j<seq.length;j++)if(buf[i+j]!==seq[j])continue outer;return i}return-1}
function extractStreams(pdfBytes){const startMark=ascii('stream\n'),endMark=ascii('\nendstream'),out=[];let pos=0;while(true){const s=findSeq(pdfBytes,startMark,pos);if(s<0)break;const a=s+startMark.length,e=findSeq(pdfBytes,endMark,a);if(e<0)break;let stream=pdfBytes.slice(a,e);let cmd=td.decode(stream).replace(/766F6E2038/g,'766F6E203132');stream=ascii(cmd);out.push(stream);pos=e+endMark.length}return out}
function pdf(streams){const n=streams.length;let id=5,pi=[],ci=[];for(let i=0;i<n;i++){pi.push(id++);ci.push(id++)}const o=new Map([[1,ascii('<< /Type /Catalog /Pages 2 0 R >>')],[2,ascii(`<< /Type /Pages /Count ${n} /Kids [${pi.map(x=>x+' 0 R').join(' ')}] >>`)],[3,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')],[4,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')]]);for(let i=0;i<n;i++){o.set(pi[i],ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${ci[i]} 0 R >>`));o.set(ci[i],cat([ascii(`<< /Length ${streams[i].length} >>\nstream\n`),streams[i],ascii('\nendstream')]))}const h=ascii('%PDF-1.4\n%FSA\n'),chunks=[h],offs=[0];let off=h.length;for(let i=1;i<id;i++){offs[i]=off;const a=ascii(`${i} 0 obj\n`),b=o.get(i),z=ascii('\nendobj\n');chunks.push(a,b,z);off+=a.length+b.length+z.length}const xo=off;let x=`xref\n0 ${id}\n0000000000 65535 f \n`;for(let i=1;i<id;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${id} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`;chunks.push(ascii(x));return cat(chunks)}

function collectData(doc){
  const booking=num(doc.querySelector('#booking')?.value||1000),voucherPct=num(doc.querySelector('#voucherPct')?.value||20),reservePct=num(doc.querySelector('#reservePct')?.value||20),otaPct=num(doc.querySelector('#otaPct')?.value||15);
  const voucher=booking*(voucherPct/100),reserve=voucher*(reservePct/100),ota=booking*(otaPct/100);
  const offerPrice=num(doc.querySelector('#offerPrice')?.value||120),offerCost=num(doc.querySelector('#offerCost')?.value||25),offerVoucher=Math.min(num(doc.querySelector('#offerVoucher')?.value||30),offerPrice),offerPay=Math.max(0,offerPrice-offerVoucher),offerMargin=offerPay-offerCost;
  return{house:(doc.querySelector('#hotelName')?.value||'').trim()||'Ihr Haus',booking,voucherPct,reservePct,otaPct,voucher,reserve,ota,offerPrice,offerCost,offerVoucher,offerPay,offerMargin};
}
function setState(doc,type,html){const box=doc.querySelector('#pdfState');if(!box)return;box.className='pdfState show '+type;box.innerHTML=html}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function wireFrame(frame){
  const doc=frame.contentDocument;if(!doc||!global.HotelBrochureTestBuilder)return;
  const panel=doc.querySelector('#pdfPanel'),oldBtn=doc.querySelector('#pdfBtn');
  if(panel){const label=panel.querySelector('.miniLabel'),h=panel.querySelector('.pdfCopy h3'),p=panel.querySelector('.pdfCopy p');if(label)label.textContent='PDF DESIGN-TEST · 12 SEITEN';if(h)h.textContent='Neue Hotel-Broschüre testen';if(p)p.textContent='Die Print-first-Testversion umfasst jetzt zwölf Broschürenseiten. Die produktive Hotel-Seite und ihre PDF bleiben unverändert.'}
  if(!oldBtn)return;
  const btn=oldBtn.cloneNode(true);btn.textContent='12-seitige Broschüren-PDF erstellen';oldBtn.replaceWith(btn);
  btn.addEventListener('click',()=>{
    const old=btn.textContent;btn.disabled=true;btn.textContent='PDF wird erstellt …';
    setState(doc,'generating','<span class="pdfSpinner" aria-hidden="true"></span><div><strong>Die 12-seitige Print-first-Broschüre wird erstellt.</strong><div class="pdfHint">Bestehende 8 Seiten + Wertkreislauf + persönliche Direktbuchung + konkrete Leistung + technischer Hintergrund</div></div>');
    try{
      const data=collectData(doc);
      const base=global.HotelBrochureTestBuilder.buildBrochurePdf({house:data.house,services:[...doc.querySelectorAll('tr[data-service]')].map(tr=>({name:tr.querySelector('.serviceName')?.textContent||'Leistung',price:tr.querySelector('[data-price]')?.value||0,cost:tr.querySelector('[data-cost]')?.value||0,voucher:tr.querySelector('[data-voucher]')?.value||0}))});
      const streams=extractStreams(base);if(streams.length!==8)throw new Error('Die 8 Ausgangsseiten konnten nicht eindeutig gelesen werden.');
      streams.push(renderPage(page9(data)),renderPage(page10(data)),renderPage(page11(data)),renderPage(page12()));
      const u8=pdf(streams),name=data.house==='Ihr Haus'?'Hotel_Broschuere_Design-Test_'+isoDate()+'.pdf':'Hotel_Broschuere_'+safeFilePart(data.house)+'_Design-Test_'+isoDate()+'.pdf';
      const blob=new Blob([u8],{type:'application/pdf'}),file=typeof File!=='undefined'?new File([blob],name,{type:'application/pdf'}):blob;
      if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(file);
      setState(doc,'success','<div class="pdfReadyTop"><span class="pdfCheck">✓</span><div><strong>Die 12-seitige Design-Test-PDF ist fertig.</strong><div class="pdfHint">Die neuen Seiten 9 bis 12 übernehmen jetzt auch die persönlichen Buchungs- und Leistungswerte sowie den technischen Hintergrund.</div></div></div><div class="pdfFile">'+escapeHtml(name)+'</div><a class="pdfDownload" href="'+pdfUrl+'" download="'+escapeHtml(name)+'" type="application/pdf" rel="noopener">PDF herunterladen / speichern</a>');
    }catch(err){console.error('Hotel brochure V6',err);setState(doc,'error','<strong>Die Test-PDF konnte nicht erstellt werden.</strong><div class="pdfHint">'+escapeHtml(err?.message||String(err))+'</div>')}
    finally{btn.disabled=false;btn.textContent=old}
  });
}
function init(){const frame=document.getElementById('hotelFrame');if(!frame)return;frame.addEventListener('load',()=>setTimeout(()=>wireFrame(frame),0));if(frame.contentDocument?.readyState==='complete')setTimeout(()=>wireFrame(frame),0)}
global.HotelBrochureTestV6={version:VERSION};
if(typeof document!=='undefined')init();
})(typeof window!=='undefined'?window:globalThis);
