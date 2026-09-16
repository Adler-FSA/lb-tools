/* LiquidityBooster · 3 Original-VTravel-Seiten aus Commit a2277b21, 15.09.2026.
 * Layout/Inhalt: historische 35-Seiten-Engine; nur Footerzählung, lange Kennzahlen in vorhandenen Karten lesbar halten und unabhängiger PDF-Container.
 * Bestehende HTML-, 12-/19-/24-/35-Seiten-Dateien bleiben unangetastet.
 */
(function(global){
'use strict';
const VERSION='HOTEL_VTRAVEL_STANDALONE_V1_3P';
const PW=595.28,PH=841.89,ML=42,MR=42,W=PW-ML-MR;
const te=new TextEncoder();
const cp={8364:128,8211:150,8212:151,8216:145,8217:146,8220:147,8221:148,8222:132,8226:149,8230:133,8594:174,8776:126};
const C={navy:[.075,.133,.22],ink:[.145,.208,.27],gray:[.40,.46,.53],line:[.85,.89,.90],mint:[0,.655,.678],mintSoft:[.918,.976,.977],mag:[.776,0,.435],magSoft:[1,.945,.972],soft:[.97,.98,.985],white:[1,1,1]};
const ascii=s=>te.encode(String(s));
const cat=a=>{let n=0;a.forEach(x=>n+=x.length);const o=new Uint8Array(n);let p=0;a.forEach(x=>{o.set(x,p);p+=x.length});return o};
function clean(s){return String(s??'').replace(/[\u00AD\u2010\u2011\uFFFE\uFFFF]/g,'-').replace(/[\t\r]+/g,' ').replace(/ +/g,' ').trim()}
function bytes(s){const a=[];for(const ch of String(s??'')){const c=ch.codePointAt(0);a.push(c<=255?c:(cp[c]??63))}return new Uint8Array(a)}
const hex=s=>[...bytes(s)].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
const rgb=c=>`${c[0]} ${c[1]} ${c[2]} rg`,RGB=c=>`${c[0]} ${c[1]} ${c[2]} RG`;
function safeFilePart(v){return String(v||'').trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').replace(/-+/g,'')||'Hotel'}
function pad(x){return String(x).padStart(2,'0')}
function isoDate(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function displayDate(v){const d=v?new Date(v+'T12:00:00'):new Date();return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
function wrap(s,w,z,b=false){const f=b?.555:.505,m=Math.max(7,Math.floor(w/(z*f))),out=[];for(const p of String(s??'').split(/\n/)){const words=clean(p).split(/\s+/).filter(Boolean);if(!words.length){out.push('');continue}let line='';for(let word of words){const t=line?line+' '+word:word;if(t.length>m&&line){out.push(line);line=word}else line=t}if(line)out.push(line)}return out.length?out:['']}
function page(){return{c:[]}}
function text(pg,s,x,y,z=10,b=false,col=C.ink){if(clean(s))pg.c.push(`BT /${b?'F2':'F1'} ${z.toFixed(2)} Tf ${rgb(col)} ${x.toFixed(2)} ${y.toFixed(2)} Td <${hex(clean(s))}> Tj ET\n`)}
function lines(pg,s,x,y,w,z=10,l=13,b=false,col=C.ink,max=99){let yy=y;wrap(s,w,z,b).slice(0,max).forEach(q=>{if(q)text(pg,q,x,yy,z,b,col);yy-=l});return yy}
function fill(pg,x,y,w,h,col){pg.c.push(`q ${rgb(col)} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f Q\n`)}
function rule(pg,x,y,w,col=C.line,l=.7){pg.c.push(`q ${RGB(col)} ${l.toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} m ${(x+w).toFixed(2)} ${y.toFixed(2)} l S Q\n`)}
function roundPath(x,y,w,h,r){const k=.5522847498,kr=k*r;return `${x+r} ${y} m ${x+w-r} ${y} l ${x+w-r+kr} ${y} ${x+w} ${y+r-kr} ${x+w} ${y+r} c ${x+w} ${y+h-r} l ${x+w} ${y+h-r+kr} ${x+w-r+kr} ${y+h} ${x+w-r} ${y+h} c ${x+r} ${y+h} l ${x+r-kr} ${y+h} ${x} ${y+h-r+kr} ${x} ${y+h-r} c ${x} ${y+r} l ${x} ${y+r-kr} ${x+r-kr} ${y} ${x+r} ${y} c h`}
function roundRect(pg,x,y,w,h,r,fc,sc=null,l=.7){let s='q ';if(fc)s+=rgb(fc)+' ';if(sc)s+=RGB(sc)+` ${l} w `;s+=roundPath(x,y,w,h,r)+(fc&&sc?' B':fc?' f':' S')+' Q\n';pg.c.push(s)}
function top(pg,label='PERSÖNLICHE HOTEL-GESAMTAUSGABE'){text(pg,'LiquidityBooster',ML,PH-48,18,true,C.navy);text(pg,label,PW-MR-186,PH-45,7.2,true,C.gray);rule(pg,ML,PH-62,W,C.mint,1.2)}
function footer(pg,i,total=3,date){rule(pg,ML,31,W,C.line,.5);text(pg,`LiquidityBooster · VTravel · ${displayDate(date)}`,ML,17,6.5,false,C.gray);text(pg,`Seite ${i} von ${total}`,PW-MR-62,17,6.5,false,C.gray)}
function kicker(pg,s,y){text(pg,s.toUpperCase(),ML,y,8.3,true,C.mag)}
function title(pg,s,y,z=27,max=5){return lines(pg,s,ML,y,W,z,z*1.08,true,C.navy,max)}
function body(pg,s,y,z=10.3,max=9,col=C.gray){return lines(pg,s,ML,y,W,z,z*1.38,false,col,max)}
function card(pg,x,y,w,h,t,b,a=C.mint){roundRect(pg,x,y,w,h,12,C.white,C.line,.65);fill(pg,x,y+h-4,w,4,a);let ty=y+h-31;for(const q of wrap(t,w-30,10.5,true).slice(0,2)){text(pg,q,x+15,ty,10.5,true,C.navy);ty-=13}lines(pg,b,x+15,ty-7,w-30,8.5,11.3,false,C.gray,8)}
function stat(pg,x,y,w,h,v,l,a=C.mint){roundRect(pg,x,y,w,h,12,C.white,C.line,.7);fill(pg,x,y+h-4,w,4,a);const value=clean(v).replace(/≈/g,'~'),available=w-28;if(value.includes(' · ')){const k=value.indexOf(' · '),first=value.slice(0,k),second=value.slice(k+3);text(pg,first,x+14,y+h-31,Math.min(17.5,available/Math.max(1,first.length*.55)),true,C.navy);text(pg,second,x+14,y+h-49,Math.min(13,available/Math.max(1,second.length*.55)),true,C.navy);lines(pg,l,x+14,y+h-72,w-28,7.5,9.8,false,C.gray,3)}else{text(pg,value,x+14,y+h-37,Math.min(17.5,available/Math.max(1,value.length*.55)),true,C.navy);lines(pg,l,x+14,y+h-57,w-28,7.5,9.8,false,C.gray,3)}}
function callout(pg,y,h,t,b,fc=C.mintSoft,a=C.mint){roundRect(pg,ML,y,W,h,12,fc,C.line,.45);fill(pg,ML,y,6,h,a);text(pg,t,ML+18,y+h-26,11.4,true,C.navy);lines(pg,b,ML+18,y+h-46,W-36,9.1,12.2,false,C.ink,7)}
function render(pg){return ascii(pg.c.join(''))}
function textVal(doc,id,fallback='—'){const e=doc?.getElementById(id);return clean(e?.textContent||e?.value||'')||fallback}
/* Seiten 31–33 der historischen 35-Seiten-PDF; nur die Seitenzählung wird lokal 1–3. */
function vtravel1(m){const pg=page();fill(pg,0,0,PW,PH,C.white);top(pg,'TECHNISCHER ANHANG · VTRAVEL');kicker(pg,'VTravel',PH-100);let y=title(pg,'Reisebuchung und vCurrency-Nutzung im VOW-Umfeld.',PH-132,25,4);y-=7;body(pg,'VTravel ist eine Reisebuchungsplattform im VOW-Umfeld. Die Lernseite trennt die eigentliche Reisebuchung, die unterstützten Zahlungswege und den möglichen späteren vCurrency-/v$-Reward.',y,10.5,6,C.ink);const g=12,cw=(W-g*2)/3;card(pg,ML,420,cw,155,'Flüge','Suche nach Abflug, Ziel, Datum, Reisenden und Tarifklasse. Entscheidend sind Gesamtpreis und Bedingungen.',C.navy);card(pg,ML+cw+g,420,cw,155,'Hotels','Hotelangebote nach Ziel, Zeitraum und Belegung vergleichen. Preise und Leistungen müssen konkret geprüft werden.',C.mint);card(pg,ML+2*(cw+g),420,cw,155,'Staycation','Auch kurze Aufenthalte und Hotelangebote können unabhängig von einer Flugbuchung gesucht werden.',C.mag);callout(pg,235,135,'Rewards einfach erklärt','VTravel nennt aktuell USDC und USDT als unterstützte Zahlungswege und bewirbt bei berechtigten Buchungen einen v$-Reward. Der mit vCurrency eingelöste Anteil erhält nach Anbieterangabe keinen weiteren Reward.',C.mintSoft,C.mint);callout(pg,105,100,'Wichtig','Preise, Verfügbarkeit, Reward-Satz, Zahlungswege und Akzeptanz können sich ändern. Maßgeblich sind die jeweils aktuell beim Anbieter angezeigten Bedingungen.',C.magSoft,C.mag);footer(pg,1,3,m.meetingDate);return render(pg)}
function vtravel2(m,doc){const pg=page();fill(pg,0,0,PW,PH,C.white);top(pg,'TECHNISCHER ANHANG · VTRAVEL');kicker(pg,'EUR -> USDT -> v$ -> VTravel',PH-100);let y=title(pg,'Der aktuelle Lernweg aus Ihrem VTravel-Rechner',PH-132,24,4);y-=7;body(pg,'DEX-Handelskurs und VTravel-Nutzwert sind zwei unterschiedliche Werte. Die folgenden Felder übernehmen den aktuell sichtbaren Rechnerstand.',y,10.2,5,C.gray);const vals=[['Euro-Einsatz',textVal(doc,'routeEur',textVal(doc,'eurInput'))],['USDT rechnerisch',textVal(doc,'routeUsdt')],['v$ rechnerisch',textVal(doc,'routeV')],['Handelswert',textVal(doc,'tradeValue')],['VTravel-Nutzwert',textVal(doc,'useValue')],['Abstand zum 1-$-Nutzwert',textVal(doc,'marketDiscount')],['Nutzwert-Faktor',textVal(doc,'useMultiple')],['Rechnerische Differenz',textVal(doc,'useDifference')]];const g=10,cw=(W-g*3)/4;vals.forEach((r,i)=>stat(pg,ML+(i%4)*(cw+g),i<4?455:330,cw,95,r[1],r[0],i%4===0?C.navy:i%4===1?C.mint:i%4===2?C.mag:C.mint));callout(pg,130,135,'Einordnung','Der 1:1-Nutzwert ist kein garantierter Geld-, Verkaufs- oder Rückzahlungswert. Entscheidend ist, ob und in welchem Umfang v$ bei der konkreten VTravel-Buchung akzeptiert werden. Handelsgebühren und Slippage sind in der Lernrechnung nicht enthalten.',C.magSoft,C.mag);footer(pg,2,3,m.meetingDate);return render(pg)}
function vtravel3(m,doc){const pg=page();fill(pg,0,0,PW,PH,C.white);top(pg,'TECHNISCHER ANHANG · VTRAVEL');kicker(pg,'Preis & Reward vergleichen',PH-100);let y=title(pg,'Reisepreis und möglicher späterer Reward getrennt betrachten.',PH-132,24,4);y-=7;body(pg,'Der Vergleich ist eine Lernrechnung. Tatsächlicher Preis, Berechtigung, Wechselkurs und spätere Einlösung müssen für die konkrete Buchung geprüft werden.',y,10.2,5,C.gray);const market=textVal(doc,'market'),travel=textVal(doc,'travel'),rate=textVal(doc,'rateOut'),direct=textVal(doc,'direct'),reward=textVal(doc,'reward'),total=textVal(doc,'total');const g=12,cw=(W-g*2)/3;stat(pg,ML,470,cw,100,market,'Vergleichspreis anderes Portal',C.navy);stat(pg,ML+cw+g,470,cw,100,travel,'Preis bei VTravel',C.mint);stat(pg,ML+2*(cw+g),470,cw,100,rate+' %','angezeigter Reward-Satz',C.mag);stat(pg,ML,330,cw,100,direct,'unmittelbarer Preisunterschied',C.navy);stat(pg,ML+cw+g,330,cw,100,reward+' v$','rechnerischer Reward',C.mint);stat(pg,ML+2*(cw+g),330,cw,100,total,'rechnerischer Gesamteffekt',C.mag);callout(pg,145,125,'Was diese Seite nicht verspricht','Ein Preisvergleich ist nur belastbar, wenn Leistungen und Bedingungen vergleichbar sind. Ein Reward ist zudem nicht mit sofortigem Bargeld gleichzusetzen.',C.magSoft,C.mag);footer(pg,3,3,m.meetingDate);return render(pg)}
function pdfPages(streams){const n=streams.length;let next=5,pi=[],ci=[];for(let i=0;i<n;i++){pi.push(next++);ci.push(next++)}const o=new Map([[1,ascii('<< /Type /Catalog /Pages 2 0 R >>')],[2,ascii(`<< /Type /Pages /Count ${n} /Kids [${pi.map(x=>x+' 0 R').join(' ')}] >>`)],[3,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')],[4,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')]]);for(let i=0;i<n;i++){o.set(pi[i],ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${ci[i]} 0 R >>`));const s=streams[i];o.set(ci[i],cat([ascii(`<< /Length ${s.length} >>\nstream\n`),s,ascii('\nendstream')]))}const h=ascii('%PDF-1.4\n%FSA\n'),chunks=[h],offs=[0];let off=h.length;for(let i=1;i<next;i++){offs[i]=off;const a=ascii(`${i} 0 obj\n`),b=o.get(i),z=ascii('\nendobj\n');chunks.push(a,b,z);off+=a.length+b.length+z.length}const xo=off;let x=`xref\n0 ${next}\n0000000000 65535 f \n`;for(let i=1;i<next;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${next} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`;chunks.push(ascii(x));return cat(chunks)}
function getContent(doc){
 const owner=doc||(typeof document!=='undefined'?document:null);
 const content=owner?.getElementById('routeEur')?owner:owner?.getElementById('contentFrame')?.contentDocument;
 if(!content?.getElementById('routeEur')||!content.getElementById('rateOut'))throw new Error('VTravel-Lernrechner noch nicht geladen.');
 return content;
}
function build(doc){
 const content=getContent(doc),meta={meetingDate:isoDate()};
 const u8=pdfPages([vtravel1(meta),vtravel2(meta,content),vtravel3(meta,content)]);
 let hotelName='Hotel';try{hotelName=clean(global.LBHotelStorage?.getSection('hotel')?.name)||'Hotel'}catch(_){}
 return{u8,hotelName,version:VERSION};
}
let pdfUrl='';
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function state(kind,html){const e=document.getElementById('vtravelStandalonePdfState');if(e){e.style.display='block';e.style.borderColor=kind==='error'?'#edc4d8':'#bcdfe1';e.innerHTML=html}}
function addPanel(){
 const qs=new URLSearchParams(location.search);
 if(qs.has('final-suite')||qs.has('combined-pdf-test'))return;
 if(document.getElementById('vtravelStandalonePdfPanel'))return;
 const s=document.createElement('section');s.id='vtravelStandalonePdfPanel';
 s.style.cssText='margin:14px 0;padding:22px;background:#fff;border:1px solid #bcdfe1;border-radius:16px;box-shadow:0 10px 28px rgba(19,34,56,.08)';
 s.innerHTML='<strong style="color:#c6006f;font-size:12px;letter-spacing:.08em">PDF-AUSGABE</strong><h2 style="margin:9px 0;color:#132238">VTravel · Einzel-PDF</h2><p style="color:#667587">Die drei bewährten VTravel-Seiten mit den aktuell angezeigten Rechnerwerten.</p><button id="vtravelStandalonePdfBtn" type="button" style="border:0;background:#00a7ad;color:#fff;padding:13px 16px;border-radius:10px;font-weight:800;cursor:pointer">VTravel-PDF erstellen</button><div id="vtravelStandalonePdfState" style="display:none;margin-top:14px;padding:14px;background:#f7ffff;border:1px solid #bcdfe1;border-radius:10px"></div>';
 const lower=document.querySelector('.bottomBack');lower?.parentNode?.insertBefore(s,lower);
}
function download(){
 const b=document.getElementById('vtravelStandalonePdfBtn');if(!b)return;
 b.disabled=true;const before=b.textContent;b.textContent='PDF wird erstellt …';
 state('generating','<strong>Die 3-seitige VTravel-PDF wird erstellt.</strong>');
 try{
   const r=build(),date=isoDate(),opts={hotelName:r.hotelName,date},store=global.LBHotelStorage;
   const blob=new Blob([r.u8],{type:'application/pdf'});
   const name=store?.pdfFilename?store.pdfFilename('VTravel',opts):`VTravel_${safeFilePart(r.hotelName)}_${date}.pdf`;
   const file=store?.makeNamedPdfFile?store.makeNamedPdfFile(blob,'VTravel',opts):(typeof File!=='undefined'?new File([blob],name,{type:'application/pdf'}):blob);
   if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(file);
   state('success','<strong>Die VTravel-PDF ist fertig.</strong><div style="margin:9px 0;overflow-wrap:anywhere">'+esc(name)+'</div><a href="'+pdfUrl+'" download="'+esc(name)+'" type="application/pdf" rel="noopener" style="display:inline-block;background:#132238;color:#fff;padding:11px 15px;border-radius:9px;text-decoration:none;font-weight:800">PDF herunterladen / speichern</a>');
 }catch(e){console.error(e);state('error','<strong>Die VTravel-PDF konnte nicht erstellt werden.</strong><p>'+esc(e?.message||String(e))+'</p>')}
 finally{b.disabled=false;b.textContent=before}
}
function init(){addPanel();document.getElementById('vtravelStandalonePdfBtn')?.addEventListener('click',download)}
global.HotelVTravelStandalonePdf=Object.freeze({version:VERSION,build});
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
})(typeof window!=='undefined'?window:globalThis);
