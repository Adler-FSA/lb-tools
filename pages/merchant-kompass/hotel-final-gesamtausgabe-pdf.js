(function(global){
'use strict';
const VERSION='HOTEL_FINAL_GESAMTAUSGABE_V1_35P';
const PW=595.28,PH=841.89,ML=42,MR=42,W=PW-ML-MR;
const te=new TextEncoder();
const cp={8364:128,8211:150,8212:151,8216:145,8217:146,8220:147,8221:148,8222:132,8226:149,8230:133,8594:174};
const C={navy:[.075,.133,.22],ink:[.145,.208,.27],gray:[.40,.46,.53],line:[.85,.89,.90],mint:[0,.655,.678],mintSoft:[.918,.976,.977],mag:[.776,0,.435],magSoft:[1,.945,.972],soft:[.97,.98,.985],white:[1,1,1]};
const ascii=s=>te.encode(String(s));
const cat=a=>{let n=0;a.forEach(x=>n+=x.length);const o=new Uint8Array(n);let p=0;a.forEach(x=>{o.set(x,p);p+=x.length});return o};
function clean(s){return String(s??'').replace(/[\u00AD\u2010\u2011\uFFFE\uFFFF]/g,'-').replace(/[\t\r]+/g,' ').replace(/ +/g,' ').trim()}
function bytes(s){const a=[];for(const ch of String(s??'')){const c=ch.codePointAt(0);a.push(c<=255?c:(cp[c]??63))}return new Uint8Array(a)}
const hex=s=>[...bytes(s)].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
const rgb=c=>`${c[0]} ${c[1]} ${c[2]} rg`,RGB=c=>`${c[0]} ${c[1]} ${c[2]} RG`;
function safeFilePart(v){return String(v||'').trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^[-.]+|[-.]+$/g,'')||'Hotel'}
function pad(x){return String(x).padStart(2,'0')}
function isoDate(v){const d=v?new Date(v+'T12:00:00'):new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function displayDate(v){const d=v?new Date(v+'T12:00:00'):new Date();return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
function euro(v){return new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0)+' €'}
function pct(v){return new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(Number(v)||0)+' %'}
function wrap(s,w,z,b=false){const f=b?.555:.505,m=Math.max(7,Math.floor(w/(z*f))),out=[];for(const p of String(s??'').split(/\n/)){const words=clean(p).split(/\s+/).filter(Boolean);if(!words.length){out.push('');continue}let line='';for(let word of words){const t=line?line+' '+word:word;if(t.length>m&&line){out.push(line);line=word}else line=t}if(line)out.push(line)}return out.length?out:['']}
function page(){return{c:[]}}
function text(pg,s,x,y,z=10,b=false,col=C.ink){if(clean(s))pg.c.push(`BT /${b?'F2':'F1'} ${z.toFixed(2)} Tf ${rgb(col)} ${x.toFixed(2)} ${y.toFixed(2)} Td <${hex(clean(s))}> Tj ET\n`)}
function lines(pg,s,x,y,w,z=10,l=13,b=false,col=C.ink,max=99){let yy=y;wrap(s,w,z,b).slice(0,max).forEach(q=>{if(q)text(pg,q,x,yy,z,b,col);yy-=l});return yy}
function fill(pg,x,y,w,h,col){pg.c.push(`q ${rgb(col)} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f Q\n`)}
function rule(pg,x,y,w,col=C.line,l=.7){pg.c.push(`q ${RGB(col)} ${l.toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} m ${(x+w).toFixed(2)} ${y.toFixed(2)} l S Q\n`)}
function roundPath(x,y,w,h,r){const k=.5522847498,kr=k*r;return `${x+r} ${y} m ${x+w-r} ${y} l ${x+w-r+kr} ${y} ${x+w} ${y+r-kr} ${x+w} ${y+r} c ${x+w} ${y+h-r} l ${x+w} ${y+h-r+kr} ${x+w-r+kr} ${y+h} ${x+w-r} ${y+h} c ${x+r} ${y+h} l ${x+r-kr} ${y+h} ${x} ${y+h-r+kr} ${x} ${y+h-r} c ${x} ${y+r} l ${x} ${y+r-kr} ${x+r-kr} ${y} ${x+r} ${y} c h`}
function roundRect(pg,x,y,w,h,r,fc,sc=null,l=.7){let s='q ';if(fc)s+=rgb(fc)+' ';if(sc)s+=RGB(sc)+` ${l} w `;s+=roundPath(x,y,w,h,r)+(fc&&sc?' B':fc?' f':' S')+' Q\n';pg.c.push(s)}
function top(pg,label='PERSÖNLICHE HOTEL-GESAMTAUSGABE'){text(pg,'LiquidityBooster',ML,PH-48,18,true,C.navy);text(pg,label,PW-MR-186,PH-45,7.2,true,C.gray);rule(pg,ML,PH-62,W,C.mint,1.2)}
function footer(pg,i,total=35,date){rule(pg,ML,31,W,C.line,.5);text(pg,`LiquidityBooster · Persönliche Hotel-Gesamtausgabe · ${displayDate(date)}`,ML,17,6.5,false,C.gray);text(pg,`Seite ${i} von ${total}`,PW-MR-62,17,6.5,false,C.gray)}
function kicker(pg,s,y){text(pg,s.toUpperCase(),ML,y,8.3,true,C.mag)}
function title(pg,s,y,z=27,max=5){return lines(pg,s,ML,y,W,z,z*1.08,true,C.navy,max)}
function body(pg,s,y,z=10.3,max=9,col=C.gray){return lines(pg,s,ML,y,W,z,z*1.38,false,col,max)}
function card(pg,x,y,w,h,t,b,a=C.mint){roundRect(pg,x,y,w,h,12,C.white,C.line,.65);fill(pg,x,y+h-4,w,4,a);let ty=y+h-31;for(const q of wrap(t,w-30,10.5,true).slice(0,2)){text(pg,q,x+15,ty,10.5,true,C.navy);ty-=13}lines(pg,b,x+15,ty-7,w-30,8.5,11.3,false,C.gray,8)}
function stat(pg,x,y,w,h,v,l,a=C.mint){roundRect(pg,x,y,w,h,12,C.white,C.line,.7);fill(pg,x,y+h-4,w,4,a);text(pg,v,x+14,y+h-37,17.5,true,C.navy);lines(pg,l,x+14,y+h-57,w-28,7.5,9.8,false,C.gray,3)}
function callout(pg,y,h,t,b,fc=C.mintSoft,a=C.mint){roundRect(pg,ML,y,W,h,12,fc,C.line,.45);fill(pg,ML,y,6,h,a);text(pg,t,ML+18,y+h-26,11.4,true,C.navy);lines(pg,b,ML+18,y+h-46,W-36,9.1,12.2,false,C.ink,7)}
function render(pg){return ascii(pg.c.join(''))}
function textVal(doc,id,fallback='—'){const e=doc?.getElementById(id);return clean(e?.textContent||e?.value||'')||fallback}
function inputNum(doc,id){const e=doc?.getElementById(id);if(!e)return 0;const s=String(e.value??e.textContent??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');const n=Number(s);return Number.isFinite(n)?n:0}

function cover(m){const pg=page();fill(pg,0,0,PW,PH,C.white);fill(pg,0,PH-13,PW,13,C.mint);kicker(pg,'Persönliche Entscheidungsunterlage',PH-105);let y=title(pg,'Mehr Direktbuchungen. Mehr eigene Gästebeziehungen. Mehr wirtschaftliche Kontrolle.',PH-145,28,5);y-=14;body(pg,'Hotelmodell, BusinessBooster, Vertriebsmix, Gastzugang, Club-Marktplatz, 3-Ebenen-Logic sowie die technischen Anhänge zu Voucher Currency und VTravel - zusammengeführt in einer persönlichen Gesamtausgabe.',y,11.2,7,C.ink);
roundRect(pg,ML,300,W,250,18,C.white,C.line,1);fill(pg,ML,543,W,7,C.mint);fill(pg,ML,300,6,250,C.mag);text(pg,'ERSTELLT FÜR',ML+28,505,8.2,true,C.mag);lines(pg,m.hotelName,ML+28,465,W-56,28,31,true,C.navy,2);text(pg,'Ansprechpartner',ML+28,397,8,false,C.gray);text(pg,`${m.contactName}${m.contactRole?' · '+m.contactRole:''}`,ML+28,377,12,true,C.navy);text(pg,'Gespräch geführt mit',ML+28,337,8,false,C.gray);text(pg,m.meetingWith,ML+28,317,11.5,true,C.navy);text(pg,displayDate(m.meetingDate),PW-MR-92,317,9.5,false,C.gray);text(pg,'LiquidityBooster',ML,105,16,true,C.navy);text(pg,'Akademie für finanzielle Souveränität',ML,82,9,false,C.gray);footer(pg,1,35,m.meetingDate);return render(pg)}
function foreword(m){const pg=page();fill(pg,0,0,PW,PH,C.white);top(pg);kicker(pg,'Vorwort',PH-100);let y=title(pg,`Für ${m.hotelName}: ein Gesamtbild statt einzelner Bausteine.`,PH-132,25,4);y-=8;y=body(pg,`Diese Unterlage führt die im Gespräch betrachteten Themen in einer gemeinsamen Entscheidungsgrundlage zusammen. Sie zeigt, wie mehr Direktbuchungen schrittweise aufgebaut, bestehende OTA-Abhängigkeiten realistisch reduziert und eigene Gästebeziehungen wirtschaftlich weiterentwickelt werden können.`,y,10.7,8,C.ink);y-=14;y=body(pg,'Dabei werden drei Perspektiven bewusst getrennt: die Wirtschaftlichkeit des Hotelmodells, der Fullservice und das Aufbau-Budget des BusinessBoosters sowie die Entwicklung eines eigenen Club- und Marktplatzkreislaufs über Gastzugang und 3-Ebenen-Logic.',y,10.7,9,C.ink);callout(pg,260,155,'Wichtig für die Einordnung','Kein Hotel muss bestehende Buchungsplattformen von heute auf morgen verlassen. Die Szenarien zeigen einen Übergangsprozess: externe Plattformanteile können bestehen bleiben, während der eigene Direktkanal und die eigene Gästebeziehung Schritt für Schritt stärker werden. Alle Berechnungen sind Beispiel- und Szenariowerte, keine Umsatz-, Einspar-, Einkommens- oder Erfolgsgarantie.',C.magSoft,C.mag);roundRect(pg,ML,130,W,88,12,C.mintSoft,C.line,.5);text(pg,'Gesprächsdaten',ML+18,190,10.5,true,C.navy);text(pg,`${m.contactName}${m.contactRole?' · '+m.contactRole:''}`,ML+318,168,9.5,false,C.ink);text(pg,`${m.meetingWith} · ${displayDate(m.meetingDate)}`,ML+18,149,9,false,C.gray);footer(pg,2,35,m.meetingDate);return render(pg)}
function toc(m){const pg=page();fill(pg,0,0,PW,PH,C.white);top(pg);kicker(pg,'Inhaltsverzeichnis',PH-100);title(pg,'Ihre persönliche Gesamtausgabe',PH-132,27,2);const rows=[['1','Deckblatt','1'],['2','Vorwort','2'],['3','Inhaltsverzeichnis','3'],['4','Hotelmodell: Direktbuchung, Wertgutschein & Leistungens','4-15'],['5','BusinessBooster: Kosten, Fullservice & Umsetzung','16-22'],['6','Vertriebsmix, Gastzugang & 3-E