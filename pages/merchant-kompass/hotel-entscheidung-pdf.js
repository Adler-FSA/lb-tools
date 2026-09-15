(function(global){
'use strict';

const VERSION='HOTEL_ENTSCHEIDUNG_PRINT_FIRST_V2';
const PW=595.28, PH=841.89, ML=42, MR=42, W=PW-ML-MR;
const te=new TextEncoder();
const cp={8364:128,8211:150,8212:151,8216:145,8217:146,8220:147,8221:148,8222:132,8226:149,8230:133,8594:174,215:215};
const C={navy:[.075,.133,.22],ink:[.145,.208,.27],gray:[.40,.46,.53],line:[.85,.89,.90],mint:[0,.655,.678],mintDark:[0,.48,.50],mintSoft:[.918,.976,.977],mag:[.776,0,.435],magSoft:[1,.945,.972],soft:[.975,.982,.984],white:[1,1,1]};

const ascii=s=>te.encode(String(s));
function cat(parts){let n=0;for(const p of parts)n+=p.length;const out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
function clean(s){return String(s??'').replace(/[\u00AD\u2010\u2011\uFFFE\uFFFF]/g,'-').replace(/[\t\r]+/g,' ').replace(/ +/g,' ').trim()}
function bytes(s){const a=[];for(const ch of String(s??'')){const c=ch.codePointAt(0);a.push(c<=255?c:(cp[c]??63))}return new Uint8Array(a)}
const hex=s=>[...bytes(s)].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
const rgb=c=>`${c[0]} ${c[1]} ${c[2]} rg`, RGB=c=>`${c[0]} ${c[1]} ${c[2]} RG`;
function safe(v){return String(v||'').trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^[-.]+|[-.]+$/g,'')||'Ohne-Angabe'}
function pad(n){return String(n).padStart(2,'0')}
function isoDate(v){const d=v?new Date(v+'T12:00:00'):new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function displayDate(v){const d=v?new Date(v+'T12:00:00'):new Date();return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
function euro(v){return new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0)+' €'}
function usd(v){return new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0)+' USD'}
function pct(v){return new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(Number(v)||0)+' %'}
function num(v,d=1){return new Intl.NumberFormat('de-DE',{minimumFractionDigits:0,maximumFractionDigits:d}).format(Number(v)||0)}
function val(doc,id){const e=doc.getElementById(id);if(!e)return 0;let s=String(e.value||'').trim().replace(/\s/g,'');if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0}
function sval(doc,id,f=''){return clean(doc.getElementById(id)?.value||f)}
function wrap(s,w,z,b=false){const factor=b?.555:.505,max=Math.max(7,Math.floor(w/(z*factor))),out=[];for(const para of String(s??'').split(/\n/)){const words=clean(para).split(/\s+/).filter(Boolean);if(!words.length){out.push('');continue}let line='';for(let word of words){while(word.length>max){if(line){out.push(line);line=''}out.push(word.slice(0,max));word=word.slice(max)}const t=line?line+' '+word:word;if(t.length>max&&line){out.push(line);line=word}else line=t}if(line)out.push(line)}return out.length?out:['']}
function page(){return{c:[]}}
function text(pg,s,x,y,z=10,b=false,col=C.ink){if(clean(s))pg.c.push(`BT /${b?'F2':'F1'} ${z.toFixed(2)} Tf ${rgb(col)} ${x.toFixed(2)} ${y.toFixed(2)} Td <${hex(clean(s))}> Tj ET\n`)}
function lines(pg,s,x,y,w,z=10,leading=13,b=false,col=C.ink,maxLines=99){let yy=y;for(const q of wrap(s,w,z,b).slice(0,maxLines)){if(q)text(pg,q,x,yy,z,b,col);yy-=leading}return yy}
function fill(pg,x,y,w,h,col){pg.c.push(`q ${rgb(col)} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f Q\n`)}
function rule(pg,x,y,w,col=C.line,l=.7){pg.c.push(`q ${RGB(col)} ${l.toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} m ${(x+w).toFixed(2)} ${y.toFixed(2)} l S Q\n`)}
function roundPath(x,y,w,h,r){const k=.5522847498,kr=k*r;return `${x+r} ${y} m ${x+w-r} ${y} l ${x+w-r+kr} ${y} ${x+w} ${y+r-kr} ${x+w} ${y+r} c ${x+w} ${y+h-r} l ${x+w} ${y+h-r+kr} ${x+w-r+kr} ${y+h} ${x+w-r} ${y+h} c ${x+r} ${y+h} l ${x+r-kr} ${y+h} ${x} ${y+h-r+kr} ${x} ${y+h-r} c ${x} ${y+r} l ${x} ${y+r-kr} ${x+r-kr} ${y} ${x+r} ${y} c h`}
function roundRect(pg,x,y,w,h,r,fc,sc=null,l=.7){let s='q ';if(fc)s+=rgb(fc)+' ';if(sc)s+=RGB(sc)+` ${l} w `;s+=roundPath(x,y,w,h,r)+(fc&&sc?' B':fc?' f':' S')+' Q\n';pg.c.push(s)}
function topBrand(pg){text(pg,'LiquidityBooster',ML,PH-48,18,true,C.navy);text(pg,'HOTEL & GASTGEWERBE',PW-MR-112,PH-45,7.7,true,C.gray);rule(pg,ML,PH-62,W,C.mint,1.2)}
function footer(pg,i,total,date){rule(pg,ML,31,W,C.line,.5);text(pg,`LiquidityBooster · Hotel & Gastgewerbe · ${displayDate(date)}`,ML,17,6.5,false,C.gray);text(pg,`Seite ${i} von ${total}`,PW-MR-58,17,6.5,false,C.gray)}
function kicker(pg,s,y){text(pg,s.toUpperCase(),ML,y,8.3,true,C.mag)}
function bigTitle(pg,s,y,z=27,max=4){return lines(pg,s,ML,y,W,z,z*1.08,true,C.navy,max)}
function bodyText(pg,s,y,w=W,z=10.4,max=8,col=C.gray){return lines(pg,s,ML,y,w,z,z*1.38,false,col,max)}
function statCard(pg,x,y,w,h,value,label,accent=C.mint){roundRect(pg,x,y,w,h,12,C.white,C.line,.7);fill(pg,x,y+h-4,w,4,accent);text(pg,value,x+14,y+h-37,17.5,true,C.navy);lines(pg,label,x+14,y+h-56,w-28,7.6,10,false,C.gray,3)}
function callout(pg,y,h,titleStr,bodyStr,fc=C.mintSoft,a=C.mint){roundRect(pg,ML,y,W,h,12,fc,C.line,.45);fill(pg,ML,y,6,h,a);text(pg,titleStr,ML+18,y+h-26,11.5,true,C.navy);lines(pg,bodyStr,ML+18,y+h-46,W-36,9.2,12.2,false,C.ink,7)}
function infoCard(pg,x,y,w,h,titleStr,bodyStr,accent=C.mint){roundRect(pg,x,y,w,h,12,C.white,C.line,.65);fill(pg,x,y+h-4,w,4,accent);text(pg,titleStr,x+15,y+h-32,11.1,true,C.navy);lines(pg,bodyStr,x+15,y+h-54,w-30,8.8,11.7,false,C.gray,8)}
function render(pg){return ascii(pg.c.join(''))}

function collect(doc){
 const m={hotel:sval(doc,'hotelNameFinal','Ihr Hotel'),contact:sval(doc,'contactNameFinal',''),role:sval(doc,'contactRoleFinal',''),with:sval(doc,'meetingWithFinal',''),date:sval(doc,'meetingDateFinal','')};
 const booking=val(doc,'h_booking'),voucherPct=val(doc,'h_voucherPct'),reservePct=val(doc,'h_reservePct'),otaPctHotel=val(doc,'h_otaPct');
 const voucher=booking*voucherPct/100,reserve=voucher*reservePct/100,ota=booking*otaPctHotel/100;
 const offerPrice=val(doc,'h_offerPrice'),offerCost=val(doc,'h_offerCost'),offerVoucher=Math.min(val(doc,'h_offerVoucher'),offerPrice),offerPay=Math.max(0,offerPrice-offerVoucher),offerRemain=offerPay-offerCost;
 const services=[];for(let i=1;i<=5;i++){const p=val(doc,`s${i}p`),c=val(doc,`s${i}c`),v=Math.min(val(doc,`s${i}v`),p);services.push({p,c,v,pay:Math.max(0,p-v),remain:Math.max(0,p-v)-c})}
 const serviceNames=['Sauna / Wellness','Massage','Candlelight-Dinner','Getränke an der Hotelbar','Champagner'];
 const serviceTotals=services.reduce((a,s)=>({p:a.p+s.p,v:a.v+s.v,pay:a.pay+s.pay,remain:a.remain+s.remain}),{p:0,v:0,pay:0,remain:0});
 const plan=Number(doc.getElementById('b_plan')?.value)||499, otaRev=val(doc,'b_otaRevenue'),otaPct=val(doc,'b_otaPct'),avg=val(doc,'b_avgBooking'),shiftPct=val(doc,'b_shiftPct');
 const otaMonth=otaRev*otaPct/100, otaYear=otaMonth*12, firstYear=plan*13, commission=avg*otaPct/100, shiftCost=otaRev*shiftPct/100*otaPct/100;
 const total=val(doc,'d_totalRevenue'),now=[val(doc,'d_bookNow'),val(doc,'d_otaNow'),val(doc,'d_directNow'),val(doc,'d_otherNow')],tar=[val(doc,'d_bookTarget'),val(doc,'d_otaTarget'),val(doc,'d_directTarget'),val(doc,'d_otherTarget')],costs=[val(doc,'d_bookCost'),val(doc,'d_otaCost'),val(doc,'d_directCost'),val(doc,'d_otherCost')].map(x=>x/100);
 const cNow=now.reduce((s,x,i)=>s+total*(x/100)*costs[i],0),cTar=tar.reduce((s,x,i)=>s+total*(x/100)*costs[i],0),delta=(cNow-cTar)*12;
 const guest=val(doc,'d_guestAccesses'),e1=Math.round(guest*val(doc,'d_partnerRate')/100),e2=Math.round(e1*val(doc,'d_e2Rate')/100*val(doc,'d_e2Avg')),e3=Math.round(e2*val(doc,'d_e3Rate')/100*val(doc,'d_e3Avg'));
 const logic=e1*99*.20+e2*99*.15+e3*99*.10;
 const offer=val(doc,'d_offerValue'),benefit=offer*val(doc,'d_benefitPct')/100,directCost=offer*val(doc,'d_directCostPct')/100,marketBookings=val(doc,'d_marketBookings'),marketRemain=Math.max(0,offer-benefit)-directCost,market=marketRemain*marketBookings;
 const vAmount=val(doc,'v_voucherAmount'),alloc=val(doc,'v_allocation'),removed=Math.min(val(doc,'v_removed'),vAmount),vow=val(doc,'v_vowPrice'),reserveUsd=vAmount*alloc/100,reserveVow=vow>0?reserveUsd/vow:0,remainV=Math.max(0,vAmount-removed);
 const eur=val(doc,'t_eurInput'),usdtEur=val(doc,'t_usdtEur'),vUsdt=val(doc,'t_vUsdt'),usdEur=val(doc,'t_usdEur'),usdt=usdtEur>0?eur/usdtEur:0,vv=vUsdt>0?usdt/vUsdt:0,useEur=usdEur>0?vv*usdEur:0;
 return {m,booking,voucherPct,reservePct,otaPctHotel,voucher,reserve,ota,offerPrice,offerCost,offerVoucher,offerPay,offerRemain,services,serviceNames,serviceTotals,plan,otaRev,otaPct,avg,shiftPct,otaMonth,otaYear,firstYear,commission,shiftCost,total,now,tar,cNow,cTar,delta,guest,e1,e2,e3,logic,offer,benefit,directCost,marketBookings,marketRemain,market,vAmount,alloc,removed,vow,reserveUsd,reserveVow,remainV,eur,usdtEur,vUsdt,usdEur,usdt,vv,useEur};
}

function buildPages(d){
 const P=[],totalPages=6,g=12,cw=(W-g)/2;
 let pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Persönliche Rechen- und Entscheidungsunterlage',PH-106);let y=bigTitle(pg,'Die eigenen Zahlen schaffen Klarheit für eine fundierte Entscheidung.',PH-140,28,4);y-=10;bodyText(pg,'Kompakte Auswertung der gemeinsam eingetragenen Hotel-, BusinessBooster-, Vertriebsmix-, Marktplatz- und Technikwerte.',y,W,11,5,C.ink);
 const py=160,ph=315;roundRect(pg,ML,py,W,ph,18,C.white,C.line,1);fill(pg,ML,py+ph-7,W,7,C.mint);fill(pg,ML,py,6,ph,C.mag);text(pg,'ERSTELLT FÜR',ML+28,py+ph-44,8,true,C.mag);lines(pg,d.m.hotel,ML+28,py+ph-84,W-56,25,28,true,C.navy,2);if(d.m.contact)text(pg,d.m.contact+(d.m.role?' · '+d.m.role:''),ML+28,py+ph-142,11,true,C.navy);if(d.m.with)text(pg,'Gespräch geführt mit: '+d.m.with,ML+28,py+ph-174,9.5,false,C.gray);rule(pg,ML+28,py+102,W-56,C.line,.8);text(pg,'RECHNEN · VERGLEICHEN · ENTSCHEIDEN',ML+28,py+78,7.8,true,C.mintDark);text(pg,'Stand '+displayDate(d.m.date),ML+28,py+51,9.5,false,C.gray);text(pg,'LiquidityBooster',ML+28,py+26,9.5,true,C.navy);footer(pg,1,totalPages,d.m.date);P.push(render(pg));

 pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'1 · Hotelmodell',PH-100);y=bigTitle(pg,'Direktbuchung und Wertgutschein mit den eigenen Zahlen',PH-132,25,3);y-=8;bodyText(pg,'Die Rechnung trennt Buchungspreis, zusätzlichen Kundennutzen, Reserveanteil und den reinen OTA-Vergleichswert.',y,W,10.4,4,C.gray);
 statCard(pg,ML,500,cw,112,euro(d.booking),'Buchungswert',C.navy);statCard(pg,ML+cw+g,500,cw,112,euro(d.voucher),`Wertgutschein · ${pct(d.voucherPct)}`,C.mint);statCard(pg,ML,372,cw,112,euro(d.reserve),`Reserveanteil · ${pct(d.reservePct)} vom Gutschein`,C.mint);statCard(pg,ML+cw+g,372,cw,112,euro(d.ota),`OTA-Kosten zum Vergleich · ${pct(d.otaPctHotel)}`,C.mag);
 callout(pg,238,102,'Konkrete Leistung',`${euro(d.offerPrice)} Verkaufspreis · ${euro(d.offerVoucher)} Gutscheinvorteil · ${euro(d.offerPay)} reguläre Zahlung · ${euro(d.offerCost)} direkte Kosten · ${euro(d.offerRemain)} verbleibt vor weiteren Kosten.`);
 callout(pg,112,102,'Einordnung','Der Gutschein ist zusätzlicher Nutzwert und kein sofortiger Zimmerpreis-Rabatt. Die tatsächliche wirtschaftliche Wirkung hängt von Leistung, Auslastung, Kostenstruktur und den zugelassenen Gutscheinwerten ab.',C.magSoft,C.mag);footer(pg,2,totalPages,d.m.date);P.push(render(pg));

 pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'2 · BusinessBooster',PH-100);y=bigTitle(pg,'Aufbau-Budget und heutige Vermittlungskosten getrennt betrachten',PH-132,25,3);y-=8;bodyText(pg,'Der Vergleich setzt ein festes Aufbau-Budget nicht mit einer garantierten OTA-Einsparung gleich. Er macht nur die Größenordnungen sichtbar.',y,W,10.4,5,C.gray);
 statCard(pg,ML,500,cw,112,euro(d.otaMonth),'OTA-Kosten / Monat',C.mag);statCard(pg,ML+cw+g,500,cw,112,euro(d.plan),'BusinessBooster / Monat',C.mint);statCard(pg,ML,372,cw,112,euro(d.otaYear),'OTA-Kosten / Jahr',C.navy);statCard(pg,ML+cw+g,372,cw,112,euro(d.firstYear),'1. Jahr BusinessBooster inkl. Setup',C.mint);
 infoCard(pg,ML,210,cw,130,'Provisionswert je Ø Buchung',`${euro(d.commission)} bei ${euro(d.avg)} durchschnittlichem Buchungswert und ${pct(d.otaPct)} angenommener OTA-Provision.`,C.navy);infoCard(pg,ML+cw+g,210,cw,130,'Perspektivischer Zielanteil',`${euro(d.shiftCost)} heutiger Provisionswert pro Monat entfällt rechnerisch auf ${pct(d.shiftPct)} des OTA-Buchungsumsatzes.`,C.mint);
 callout(pg,92,94,'Wichtig','BusinessBooster ist ein Aufbau-Budget für eigene Sichtbarkeit, Prozesse und Vermarktungsstrukturen. Die tatsächliche Direktbuchungswirkung ist nicht automatisch und hängt von Hotel, Angebot, Markt und Umsetzung ab.',C.magSoft,C.mag);footer(pg,3,totalPages,d.m.date);P.push(render(pg));

 pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'3 · Direktmix, Gastzugang & Marktplatz',PH-100);y=bigTitle(pg,'Vom heutigen Vertriebs-Mix zu einem realistischen Zielbild',PH-132,25,3);y-=8;bodyText(pg,'Das Ziel ist kein abrupter Ausstieg aus OTA-Plattformen, sondern ein schrittweiser Aufbau von mehr Direktbuchungen und eigener Gästebeziehung.',y,W,10.4,5,C.gray);
 const gg=10,third=(W-gg*2)/3;statCard(pg,ML,495,third,110,pct(d.now[2]),'Direktanteil heute',C.navy);statCard(pg,ML+third+gg,495,third,110,pct(d.tar[2]),'Direktanteil Ziel',C.mint);statCard(pg,ML+(third+gg)*2,495,third,110,euro(d.delta),'rechnerische Veränderung Vertriebskosten / Jahr',C.mag);
 infoCard(pg,ML,305,third,150,'Gastzugang & 3 Ebenen',`${num(d.guest,0)} Gastzugänge / Jahr → ${num(d.e1,0)} E1, ${num(d.e2,0)} E2 und ${num(d.e3,0)} E3 im gewählten Szenario. Rechnerische Beteiligung: ${euro(d.logic)} / Jahr.`,C.mint);infoCard(pg,ML+third+gg,305,third,150,'Marktplatz-Beispiel',`${euro(d.offer)} Hotelangebot · ${euro(d.benefit)} Vorteil für den Gast · ${euro(d.marketRemain)} verbleibt je Angebot vor weiteren Kosten.`,C.navy);infoCard(pg,ML+(third+gg)*2,305,third,150,'Marktplatz / Jahr',`${euro(d.market)} bei ${num(d.marketBookings,0)} Buchungen`,C.mag);
 callout(pg,155,112,'Gesamtbild der drei Szenario-Hebel',`${euro(d.delta+d.logic+d.market)} pro Jahr als rechnerische Summe aus verändertem Vertriebsmix, 3-Ebenen-Logic und Marktplatz-Szenario. Keine Umsatz-, Einspar- oder Erfolgsgarantie.`,C.mintSoft,C.mint);footer(pg,4,totalPages,d.m.date);P.push(render(pg));

 pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'4 · Technischer Hintergrund',PH-100);y=bigTitle(pg,'Voucher Currency und VTravel als technische Orientierungswerte',PH-132,24,3);y-=8;bodyText(pg,'Diese Ebene ergänzt die kaufmännische Betrachtung. Sie erklärt die aktuellen Simulatorwerte, ohne die technische Infrastruktur mit dem wirtschaftlichen Ergebnis des Hotels gleichzusetzen.',y,W,10.2,6,C.gray);
 infoCard(pg,ML,405,cw,190,'Voucher Currency',`Beispielbetrag ${num(d.vAmount,1)} v$ · Reserveanteil ${pct(d.alloc)} · Reservewert ${usd(d.reserveUsd)} · ${d.vow>0?num(d.reserveVow,2)+' VOW rechnerisch':'VOW-Marktpreis erforderlich'} · verbleibend ${num(d.remainV,1)} v$.`,C.mint);infoCard(pg,ML+cw+g,405,cw,190,'VTravel',`${euro(d.eur)} Einsatz · ${d.usdtEur>0?num(d.usdt,2)+' USDT':'USDT-Kurs erforderlich'} · ${d.vUsdt>0?num(d.vv,2)+' v$':'v$-Kurs erforderlich'} · rechnerischer Nutzwert ${d.useEur>0?euro(d.useEur):'Kurse erforderlich'}.`,C.mag);
 callout(pg,240,125,'Warum diese Werte getrennt stehen','Marktpreise und technische Programmbedingungen können sich ändern. Deshalb werden sie als Orientierungswerte ausgewiesen und nicht als garantierter Geld-, Ertrags- oder Auszahlungswert behandelt.');
 callout(pg,105,112,'Für die Entscheidung des Hotels','Im Vordergrund bleiben Direktbuchung, Kosten, zugelassene Gutscheinwerte, Auslastung, Gästebeziehung und die eigene Kalkulation. Die technische Ebene liefert Hintergrund - nicht die Entscheidung selbst.',C.magSoft,C.mag);footer(pg,5,totalPages,d.m.date);P.push(render(pg));

 pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'5 · Zusammenfassung',PH-100);y=bigTitle(pg,`${d.m.hotel}: die eigenen Zahlen auf einen Blick`,PH-132,25,3);y-=8;bodyText(pg,'Die wichtigsten Werte werden hier noch einmal auf einen Punkt gebracht. Sie dienen als Gesprächs- und Entscheidungsgrundlage.',y,W,10.4,4,C.gray);
 const cols=4,cgap=8,sw=(W-cgap*(cols-1))/cols;statCard(pg,ML,500,sw,110,euro(d.booking),'Buchungswert',C.navy);statCard(pg,ML+(sw+cgap),500,sw,110,euro(d.voucher),'Wertgutschein',C.mint);statCard(pg,ML+2*(sw+cgap),500,sw,110,euro(d.plan),'BusinessBooster / Monat',C.navy);statCard(pg,ML+3*(sw+cgap),500,sw,110,`${pct(d.now[2])} → ${pct(d.tar[2])}`,'Direktanteil',C.mag);
 statCard(pg,ML,365,sw,110,euro(d.logic),'3-Ebenen-Logic / Jahr',C.mint);statCard(pg,ML+(sw+cgap),365,sw,110,euro(d.market),'Marktplatz / Jahr',C.navy);statCard(pg,ML+2*(sw+cgap),365,sw,110,usd(d.reserveUsd),'Voucher-Reservewert',C.mint);statCard(pg,ML+3*(sw+cgap),365,sw,110,d.useEur>0?euro(d.useEur):'—','VTravel Simulation',C.mag);
 callout(pg,185,135,'Entscheidungsbild','Die Zahlen zeigen, welche Hebel im gewählten Szenario sichtbar werden. Vor einer Umsetzung sollten insbesondere die eigene Kostenstruktur, realistische Direktbuchungsziele, zugelassene Gutscheinwerte, BusinessBooster-Paket und technische Rahmenbedingungen gemeinsam geprüft werden.',C.mintSoft,C.mint);
 text(pg,'Keine Anlage-, Rechts-, Steuer- oder Finanzberatung. Keine Umsatz-, Einspar-, Einkommens- oder Erfolgsgarantie.',ML,125,7.3,false,C.gray);footer(pg,6,totalPages,d.m.date);P.push(render(pg));
 return P;
}

function pdfFromStreams(streams){
 const n=streams.length;let id=5;const pi=[],ci=[];for(let i=0;i<n;i++){pi.push(id++);ci.push(id++)}
 const o=new Map();
 o.set(1,ascii('<< /Type /Catalog /Pages 2 0 R >>'));
 o.set(2,ascii(`<< /Type /Pages /Count ${n} /Kids [${pi.map(x=>x+' 0 R').join(' ')}] >>`));
 o.set(3,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
 o.set(4,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
 for(let i=0;i<n;i++){
   o.set(pi[i],ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${ci[i]} 0 R >>`));
   o.set(ci[i],cat([ascii(`<< /Length ${streams[i].length} >>\nstream\n`),streams[i],ascii('\nendstream')]));
 }
 const header=ascii('%PDF-1.4\n%FSA\n'),parts=[header],offs=[0];let off=header.length;
 for(let i=1;i<id;i++){
   offs[i]=off;const a=ascii(`${i} 0 obj\n`),b=o.get(i),z=ascii('\nendobj\n');parts.push(a,b,z);off+=a.length+b.length+z.length;
 }
 const xref=off;let xs=`xref\n0 ${id}\n0000000000 65535 f \n`;for(let i=1;i<id;i++)xs+=String(offs[i]).padStart(10,'0')+' 00000 n \n';xs+=`trailer\n<< /Size ${id} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;parts.push(ascii(xs));return cat(parts);
}

function build(doc){
 const d=collect(doc),streams=buildPages(d),u8=pdfFromStreams(streams);
 const filename=`Auswertung_Hotel-Rechnen-Entscheiden_${safe(d.m.hotel)}_${safe(d.m.contact||'Ansprechpartner')}_${isoDate(d.m.date)}.pdf`;
 return{u8,filename,pages:streams.length,version:VERSION};
}

global.HotelEntscheidungPdf=Object.freeze({version:VERSION,build});
})(typeof window!=='undefined'?window:globalThis);