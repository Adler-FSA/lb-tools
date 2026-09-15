(function(global){
'use strict';

const VERSION='HOTEL_BROCHURE_TEST_V5_PRINT_FIRST_8P';
const PW=595.28,PH=841.89,ML=42,MR=42,W=PW-ML-MR;
const te=new TextEncoder();
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

function wrap(s,w,z,bold=false){
  const factor=bold?.555:.505,max=Math.max(7,Math.floor(w/(z*factor))),out=[];
  for(const para of String(s??'').split(/\n/)){
    const words=clean(para).split(/\s+/).filter(Boolean);if(!words.length){out.push('');continue}
    let line='';for(let word of words){while(word.length>max){if(line){out.push(line);line=''}out.push(word.slice(0,max));word=word.slice(max)}const t=line?line+' '+word:word;if(t.length>max&&line){out.push(line);line=word}else line=t}if(line)out.push(line)
  }
  return out.length?out:[''];
}
function page(){return{c:[]}}
function text(pg,s,x,y,z=10,b=false,col=C.ink){if(clean(s))pg.c.push(`BT /${b?'F2':'F1'} ${z.toFixed(2)} Tf ${rgb(col)} ${x.toFixed(2)} ${y.toFixed(2)} Td <${hex(clean(s))}> Tj ET\n`)}
function lines(pg,s,x,y,w,z=10,leading=13,b=false,col=C.ink,maxLines=99){const a=wrap(s,w,z,b).slice(0,maxLines);let yy=y;a.forEach(q=>{if(q)text(pg,q,x,yy,z,b,col);yy-=leading});return yy}
function fill(pg,x,y,w,h,col){pg.c.push(`q ${rgb(col)} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f Q\n`)}
function rule(pg,x,y,w,col=C.line,l=.7){pg.c.push(`q ${RGB(col)} ${l.toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} m ${(x+w).toFixed(2)} ${y.toFixed(2)} l S Q\n`)}
function roundPath(x,y,w,h,r){const k=.5522847498,kr=k*r;return `${(x+r).toFixed(2)} ${y.toFixed(2)} m ${(x+w-r).toFixed(2)} ${y.toFixed(2)} l ${(x+w-r+kr).toFixed(2)} ${y.toFixed(2)} ${(x+w).toFixed(2)} ${(y+r-kr).toFixed(2)} ${(x+w).toFixed(2)} ${(y+r).toFixed(2)} c ${(x+w).toFixed(2)} ${(y+h-r).toFixed(2)} l ${(x+w).toFixed(2)} ${(y+h-r+kr).toFixed(2)} ${(x+w-r+kr).toFixed(2)} ${(y+h).toFixed(2)} ${(x+w-r).toFixed(2)} ${(y+h).toFixed(2)} c ${(x+r).toFixed(2)} ${(y+h).toFixed(2)} l ${(x+r-kr).toFixed(2)} ${(y+h).toFixed(2)} ${x.toFixed(2)} ${(y+h-r+kr).toFixed(2)} ${x.toFixed(2)} ${(y+h-r).toFixed(2)} c ${x.toFixed(2)} ${(y+r).toFixed(2)} l ${x.toFixed(2)} ${(y+r-kr).toFixed(2)} ${(x+r-kr).toFixed(2)} ${y.toFixed(2)} ${(x+r).toFixed(2)} ${y.toFixed(2)} c h`}
function roundRect(pg,x,y,w,h,r,fillCol,strokeCol=null,l=.7){let cmd='q ';if(fillCol)cmd+=rgb(fillCol)+' ';if(strokeCol)cmd+=RGB(strokeCol)+` ${l} w `;cmd+=roundPath(x,y,w,h,r);cmd+=fillCol&&strokeCol?' B':fillCol?' f':' S';cmd+=' Q\n';pg.c.push(cmd)}
function circle(pg,cx,cy,r,fillCol){const k=.5522847498,kr=k*r;pg.c.push(`q ${rgb(fillCol)} ${(cx+r).toFixed(2)} ${cy.toFixed(2)} m ${(cx+r).toFixed(2)} ${(cy+kr).toFixed(2)} ${(cx+kr).toFixed(2)} ${(cy+r).toFixed(2)} ${cx.toFixed(2)} ${(cy+r).toFixed(2)} c ${(cx-kr).toFixed(2)} ${(cy+r).toFixed(2)} ${(cx-r).toFixed(2)} ${(cy+kr).toFixed(2)} ${(cx-r).toFixed(2)} ${cy.toFixed(2)} c ${(cx-r).toFixed(2)} ${(cy-kr).toFixed(2)} ${(cx-kr).toFixed(2)} ${(cy-r).toFixed(2)} ${cx.toFixed(2)} ${(cy-r).toFixed(2)} c ${(cx+kr).toFixed(2)} ${(cy-r).toFixed(2)} ${(cx+r).toFixed(2)} ${(cy-kr).toFixed(2)} ${(cx+r).toFixed(2)} ${cy.toFixed(2)} c f Q\n`)}
function pill(pg,label,x,y,w,fillCol=C.white,textCol=C.navy,strokeCol=C.line){roundRect(pg,x,y,w,25,12,fillCol,strokeCol,.5);text(pg,label,x+11,y+8,8.4,true,textCol)}
function topBrand(pg){text(pg,'LiquidityBooster',ML,PH-48,18,true,C.navy);text(pg,'HOTEL & GASTGEWERBE',PW-MR-112,PH-45,7.7,true,C.gray);rule(pg,ML,PH-62,W,C.mint,1.2)}
function footer(pg,i,total=8){rule(pg,ML,31,W,C.line,.5);text(pg,`LiquidityBooster · Hotel & Gastgewerbe · ${displayDate()}`,ML,17,6.5,false,C.gray);text(pg,`Seite ${i} von ${total}`,PW-MR-54,17,6.5,false,C.gray)}
function kicker(pg,s,y){text(pg,s.toUpperCase(),ML,y,8.3,true,C.mag)}
function bigTitle(pg,s,y,w=W,z=28,max=4){return lines(pg,s,ML,y,w,z,z*1.08,true,C.navy,max)}
function bodyText(pg,s,y,w=W,z=10.5,max=8,col=C.gray){return lines(pg,s,ML,y,w,z,z*1.38,false,col,max)}
function card(pg,x,y,w,h,titleStr,bodyStr,accent=C.mint,iconText=''){roundRect(pg,x,y,w,h,12,C.white,C.line,.65);fill(pg,x,y+h-5,w,5,accent);if(iconText){roundRect(pg,x+16,y+h-43,28,28,8,C.white,accent,1.2);text(pg,iconText,x+25,y+h-34,10,true,accent)}text(pg,titleStr,x+16,y+h-63,11.2,true,C.navy);lines(pg,bodyStr,x+16,y+h-82,w-32,8.8,11.8,false,C.gray,6)}
function callout(pg,y,h,titleStr,bodyStr,fillCol=C.mintSoft,accent=C.mint,textCol=C.ink){roundRect(pg,ML,y,W,h,12,fillCol,C.line,.45);fill(pg,ML,y,6,h,accent);text(pg,titleStr,ML+18,y+h-26,11.5,true,C.navy);lines(pg,bodyStr,ML+18,y+h-45,W-36,9.3,12.4,false,textCol,5)}
function arrow(pg,x1,y1,x2,y2,col=C.mint){pg.c.push(`q ${RGB(col)} 2.1 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q\n`);pg.c.push(`q ${rgb(col)} ${(x2-6).toFixed(2)} ${(y2+3.5).toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} ${(x2-6).toFixed(2)} ${(y2-3.5).toFixed(2)} l h f Q\n`)}

function page1(data){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Hotels. Regionen. Wachstum.',PH-100);
  let y=bigTitle(pg,'Ihr Hotel kann mehr als Zimmer verkaufen.',PH-132,W,31,4);y-=10;y=bodyText(pg,'Mehr Direktbuchungen. Mehr Marge. Mehr eigene Gästebeziehungen.',y,W,13,3,C.ink);
  const py=y-38;pill(pg,'Mehr Kontrolle',ML,py,108);pill(pg,'Mehr Wiederkehrer',ML+116,py,118);pill(pg,'Mehr Markenstärke',ML+242,py,124);pill(pg,'Mehr Datenhoheit',ML+374,py,112);
  const panelY=126,panelH=300;roundRect(pg,ML,panelY,W,panelH,18,C.white,C.line,1.0);fill(pg,ML,panelY+panelH-7,W,7,C.mint);fill(pg,ML,panelY,6,panelH,C.mag);
  text(pg,'IHRE PERSÖNLICHE ENTSCHEIDUNGSUNTERLAGE',ML+28,panelY+panelH-42,8.2,true,C.mag);lines(pg,data.house==='Ihr Haus'?'Für Ihr Haus':'Für '+data.house,ML+28,panelY+panelH-82,W-58,25,29,true,C.navy,2);lines(pg,'Direktbuchung, zusätzlicher Nutzwert und mehr Wirkung rund um den Aufenthalt.',ML+28,panelY+panelH-141,W-58,12.5,16,false,C.gray,4);rule(pg,ML+28,panelY+114,W-58,C.line,.8);text(pg,'DESIGN-TEST · PRINT-FIRST',ML+28,panelY+86,7.7,true,C.mintDark);text(pg,'Stand '+displayDate(),ML+28,panelY+60,9.5,false,C.gray);text(pg,'LiquidityBooster',ML+28,panelY+33,9.5,true,C.navy);
  footer(pg,1);return pg;
}
function page2(){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Warum jetzt?',PH-100);
  let y=bigTitle(pg,'Die Frage ist nicht, ob Gäste buchen. Sondern: Wo buchen sie - und wem gehört danach die Beziehung zum Gast?',PH-132,W,24,5);y-=8;bodyText(pg,'Viele Hotels investieren Monat für Monat in Reichweite, Portale und kurzfristige Aktionen. Dabei entstehen Abhängigkeiten, die Marge kosten und den direkten Zugang zum Gast schwächen.',y,W,10.5,6,C.gray);
  const gap=12,cw=(W-gap*2)/3,cy=344,ch=190;card(pg,ML,cy,cw,ch,'OTA-Abhängigkeit','Zu viele Buchungen laufen über fremde Plattformen statt direkt ins Haus.',C.mag,'1');card(pg,ML+cw+gap,cy,cw,ch,'Hohe Provisionen','Ein Teil der Marge fließt mit jeder vermittelten Buchung ab.',C.navy,'2');card(pg,ML+(cw+gap)*2,cy,cw,ch,'Schwankende Auslastung','Lücken in Nebenzeiten erzeugen kurzfristigen Buchungsdruck.',C.mint,'3');
  callout(pg,160,130,'Die bessere Frage:','Wie wird aus Marketingaufwand ein eigener, wachsender Wert - und aus einem Gast mehr Nutzung rund um seinen Aufenthalt?',C.mintSoft,C.mint,C.ink);footer(pg,2);return pg;
}
function page3(){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Paradigmenwechsel',PH-100);
  let y=bigTitle(pg,'Belohnungssystem statt Rabattschlachten',PH-132,W,27,3);y-=6;bodyText(pg,'Der Unterschied liegt darin, ob Sie Preis verschenken - oder Kaufkraft schaffen.',y,W,11,3,C.gray);
  const gap=24,cw=(W-gap)/2,cy=320,ch=310;roundRect(pg,ML,cy,cw,ch,16,C.white,C.line,.7);fill(pg,ML,cy+ch-6,cw,6,C.mag);text(pg,'-20 %',ML+24,cy+ch-70,28,true,C.mag);text(pg,'Klassischer Rabatt',ML+24,cy+ch-106,14,true,C.navy);lines(pg,'Der Preis wird sofort reduziert. Der Rabatt ist nach dem Kauf verbraucht. Für Ihr Hotel sinken Marge und Ertrag unmittelbar.',ML+24,cy+ch-138,cw-48,10,13.4,false,C.gray,8);
  roundRect(pg,ML+cw+gap,cy,cw,ch,16,C.white,C.line,.7);fill(pg,ML+cw+gap,cy+ch-6,cw,6,C.mint);text(pg,'20 € -> 100 €',ML+cw+gap+24,cy+ch-70,24,true,C.mintDark);text(pg,'Digitaler Wertgutschein',ML+cw+gap+24,cy+ch-106,14,true,C.navy);lines(pg,'Im Beispiel wird für 100 € Gutscheinwert ein Reserveanteil von 20 € hinterlegt. Der Gast erhält zusätzliche Kaufkraft, ohne dass der Buchungspreis sofort reduziert wird.',ML+cw+gap+24,cy+ch-138,cw-48,10,13.4,false,C.gray,9);
  circle(pg,PW/2,cy+ch/2,25,C.navy);text(pg,'VS',PW/2-9,cy+ch/2-4,11,true,C.white);callout(pg,148,118,'Nicht billiger werden. Attraktiver werden.','Das ist die Grundidee hinter dem LiquidityBooster-Modell.',C.mintSoft,C.mint,C.ink);footer(pg,3);return pg;
}
function stepCard(pg,x,y,w,h,nr,titleStr,bodyStr){roundRect(pg,x,y,w,h,14,C.white,C.line,.7);roundRect(pg,x+16,y+h-48,32,32,8,C.white,C.mint,1.2);text(pg,String(nr),x+27,y+h-37,11,true,C.mintDark);text(pg,titleStr,x+16,y+h-76,11.4,true,C.navy);lines(pg,bodyStr,x+16,y+h-96,w-32,8.8,11.8,false,C.gray,5)}
function statCard(pg,x,y,w,h,value,label,accent=C.mint){roundRect(pg,x,y,w,h,12,C.white,C.line,.7);fill(pg,x,y+h-4,w,4,accent);text(pg,value,x+14,y+h-37,18,true,C.navy);lines(pg,label,x+14,y+h-56,w-28,7.7,10,false,C.gray,3)}
function page4(){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Buchungsmagnet',PH-100);
  let y=bigTitle(pg,'Was wäre, wenn die Direktbuchung spürbar attraktiver wird?',PH-132,W,25,4);y-=6;bodyText(pg,'Nicht durch einen sofortigen Rabatt - sondern durch zusätzliche Kaufkraft. Der Gast bekommt einen nachvollziehbaren Grund, direkt bei Ihnen zu buchen.',y,W,10.4,5,C.gray);
  const gap=14,cw=(W-gap)/2,ch=150;stepCard(pg,ML,410,cw,ch,1,'Direkt buchen','Der Gast entscheidet sich für die eigene Hotel-Website.');stepCard(pg,ML+cw+gap,410,cw,ch,2,'Belohnung erhalten','Die Buchung wird mit einem attraktiven Wertgutschein kombiniert.');stepCard(pg,ML,244,cw,ch,3,'Mehr Möglichkeiten','Der Gast kann zusätzliche Kaufkraft für weitere Angebote nutzen.');stepCard(pg,ML+cw+gap,244,cw,ch,4,'Mehr Wirkung','Direktumsatz, Gästebindung und Folgegeschäft bekommen einen zusätzlichen Impuls.');
  text(pg,'BEISPIEL AUS DER SEITE',ML,192,7.7,true,C.mag);const sw=148,sg=23,sy=105,sh=72;statCard(pg,ML,sy,sw,sh,'2.000 €','reguläre Buchung',C.navy);arrow(pg,ML+sw+4,sy+36,ML+sw+sg-4,sy+36,C.mint);statCard(pg,ML+sw+sg,sy,sw,sh,'400 €','Wertgutschein',C.mint);arrow(pg,ML+2*sw+sg+4,sy+36,ML+2*sw+2*sg-4,sy+36,C.mint);statCard(pg,ML+2*(sw+sg),sy,sw,sh,'80 €','Reserveanteil im Beispiel',C.mag);
  footer(pg,4);return pg;
}

function page5(){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Mehr Möglichkeiten',PH-100);
  let y=bigTitle(pg,'Zusätzlicher Nutzwert für den Gast. Gezielte Steuerung für Ihr Hotel.',PH-132,W,25,4);y-=8;bodyText(pg,'Der Wertgutschein schafft einen Anlass, Leistungen bewusster wahrzunehmen. Entscheidend bleibt: Sie bestimmen, welche Leistungen teilnehmen und wie hoch der einsetzbare Gutscheinwert ist.',y,W,10.5,6,C.gray);
  const gap=18,cw=(W-gap)/2,cy=300,ch=330;
  roundRect(pg,ML,cy,cw,ch,16,C.white,C.line,.75);fill(pg,ML,cy+ch-6,cw,6,C.mint);text(pg,'FÜR IHREN GAST',ML+22,cy+ch-42,8,true,C.mintDark);text(pg,'Mehr entdecken.',ML+22,cy+ch-78,22,true,C.navy);lines(pg,'Aus „Das kostet extra“ wird „Dafür kann ich meinen Wertgutschein nutzen“. Der vorhandene Gutscheinwert schafft einen zusätzlichen Anreiz, Angebote im Haus auszuprobieren.',ML+22,cy+ch-109,cw-44,10,13.2,false,C.gray,9);
  pill(pg,'Sauna',ML+22,cy+95,74,C.white,C.navy,C.mint);pill(pg,'Massage',ML+104,cy+95,82,C.white,C.navy,C.mint);pill(pg,'Dinner',ML+22,cy+58,74,C.white,C.navy,C.mint);pill(pg,'Hotelbar',ML+104,cy+58,82,C.white,C.navy,C.mint);
  roundRect(pg,ML+cw+gap,cy,cw,ch,16,C.white,C.line,.75);fill(pg,ML+cw+gap,cy+ch-6,cw,6,C.mag);text(pg,'FÜR IHR HOTEL',ML+cw+gap+22,cy+ch-42,8,true,C.mag);text(pg,'Mehr steuern.',ML+cw+gap+22,cy+ch-78,22,true,C.navy);lines(pg,'Der eingesetzte Gutscheinwert ist nicht automatisch Ihre tatsächliche Kostenbelastung. Maßgeblich sind Verkaufspreis, direkte Kosten, Auslastung und der Gutscheinanteil, den Sie zulassen.',ML+cw+gap+22,cy+ch-109,cw-44,10,13.2,false,C.gray,9);
  pill(pg,'Verkaufspreis',ML+cw+gap+22,cy+95,110,C.white,C.navy,C.navy);pill(pg,'Gutscheinwert',ML+cw+gap+140,cy+95,105,C.white,C.mag,C.mag);pill(pg,'direkte Kosten',ML+cw+gap+22,cy+58,110,C.white,C.navy,C.navy);
  callout(pg,120,120,'Der Perspektivwechsel','Der Gast sieht zusätzlichen Nutzwert. Ihr Hotel sieht zusätzlichen Konsum und kann gleichzeitig über die zugelassenen Gutscheinwerte steuern, welche Leistungen besonders attraktiv werden.',C.mintSoft,C.mint,C.ink);footer(pg,5);return pg;
}
function serviceRow(pg,x,y,w,h,s,idx){roundRect(pg,x,y,w,h,10,C.white,C.line,.55);fill(pg,x,y+h-3,w,3,idx%2?C.mint:C.mag);text(pg,s.name,x+12,y+h-23,9.2,true,C.navy);const cols=[['Preis',euro(s.price)],['Kosten',euro(s.cost)],['Gutschein',euro(s.voucher)],['Gast zahlt',euro(s.pay)],['Verbleibt',euro(s.margin)]];let cx=x+132;for(const [lab,val] of cols){text(pg,lab,cx,y+h-18,6.3,true,C.gray);text(pg,val,cx,y+14,8.3,true,C.navy);cx+=72}}
function page6(data){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Leistungen im Haus',PH-100);
  let y=bigTitle(pg,'Was kann der Gutschein in Ihren Leistungen auslösen?',PH-132,W,25,4);y-=6;bodyText(pg,'Die folgenden Beispiele zeigen, wie sich unterschiedliche Leistungen wirtschaftlich darstellen können. Verkaufspreis, direkte Kosten, einsetzbarer Gutscheinwert und reguläre Zahlung werden transparent gegenübergestellt.',y,W,10.2,5,C.gray);
  const services=(data.services||[]).slice(0,5);let ry=526;services.forEach((s,i)=>{serviceRow(pg,ML,ry,W,58,s,i);ry-=67});
  const totals=services.reduce((a,s)=>({price:a.price+s.price,cost:a.cost+s.cost,voucher:a.voucher+s.voucher,pay:a.pay+s.pay,margin:a.margin+s.margin}),{price:0,cost:0,voucher:0,pay:0,margin:0});
  text(pg,'SUMME DER GEZEIGTEN LEISTUNGEN',ML,182,7.6,true,C.mag);const gap=9,cw=(W-gap*3)/4,sy=101,sh=64;statCard(pg,ML,sy,cw,sh,euro(totals.price),'Leistungswert gesamt',C.navy);statCard(pg,ML+cw+gap,sy,cw,sh,euro(totals.voucher),'Gutscheinwert genutzt',C.mint);statCard(pg,ML+2*(cw+gap),sy,cw,sh,euro(totals.pay),'Reguläre Zahlung',C.mint);statCard(pg,ML+3*(cw+gap),sy,cw,sh,euro(totals.margin),'Vor weiteren Kosten',C.mag);
  footer(pg,6);return pg;
}
function ruleCard(pg,x,y,w,h,titleStr,bodyStr,accent){roundRect(pg,x,y,w,h,12,C.white,C.line,.65);fill(pg,x,y+h-4,w,4,accent);text(pg,titleStr,x+15,y+h-34,11.2,true,C.navy);lines(pg,bodyStr,x+15,y+h-55,w-30,8.6,11.3,false,C.gray,7)}
function levelCard(pg,x,y,w,h,nr,value){roundRect(pg,x,y,w,h,12,C.soft,C.line,.5);text(pg,'Stufe '+nr,x+14,y+h-22,7.2,true,C.gray);text(pg,String(value)+' €',x+14,y+29,19.5,true,C.navy);text(pg,'Gutscheinwert',x+14,y+11,7.5,true,C.mag)}
function page7(){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Sie bestimmen die Spielregeln',PH-100);
  let y=bigTitle(pg,'Nicht jede Leistung muss denselben Gutscheinwert zulassen.',PH-132,W,25,4);y-=6;bodyText(pg,'Sie können den Gutscheinanteil an Marge, Auslastung und gewünschter Wirkung ausrichten.',y,W,10.6,4,C.gray);
  const gap=14,cw=(W-gap)/2,ch=132;ruleCard(pg,ML,455,cw,ch,'Hohe Marge','Leistungen mit hohem Verkaufspreis und niedrigen direkten Kosten können mehr Spielraum bieten.',C.mint);ruleCard(pg,ML+cw+gap,455,cw,ch,'Freie Kapazität','Ein freier Spa-Termin oder eine schwache Nebenzeit kann mit mehr Gutscheinwert attraktiver werden.',C.mag);ruleCard(pg,ML,307,cw,ch,'Gezielt fördern','Sie können genau die Leistungen hervorheben, die Sie stärker verkaufen möchten.',C.navy);ruleCard(pg,ML+cw+gap,307,cw,ch,'Flexibel staffeln','Gutscheinanteile können nach Angebot, Saison, Wochentag oder Auslastung unterschiedlich gestaltet werden.',C.mint);
  text(pg,'BEISPIELHAFTE STAFFELUNG',ML,263,7.7,true,C.mag);const lg=10,lw=(W-lg*3)/4;levelCard(pg,ML,170,lw,76,1,30);levelCard(pg,ML+lw+lg,170,lw,76,2,40);levelCard(pg,ML+2*(lw+lg),170,lw,76,3,50);levelCard(pg,ML+3*(lw+lg),170,lw,76,4,75);
  callout(pg,88,68,'Die Staffelung ist ein Steuerungsinstrument','Sie entscheiden, wie attraktiv eine Leistung in einer bestimmten Situation sein soll - statt pauschal auf alles denselben Rabatt zu geben.',C.magSoft,C.mag,C.ink);footer(pg,7);return pg;
}
function regionCard(pg,x,y,w,h,titleStr,price,bodyStr,accent){
  roundRect(pg,x,y,w,h,14,C.white,C.line,.65);fill(pg,x,y+h-5,w,5,accent);text(pg,titleStr,x+16,y+h-40,11.2,true,C.navy);text(pg,price,x+16,y+h-78,21,true,C.mag);
  const parts=String(bodyStr||'').split('→').map(clean);
  if(parts.length===2){
    text(pg,parts[0],x+16,y+h-105,8.9,false,C.gray);
    arrow(pg,x+16,y+25,x+42,y+25,accent);
    text(pg,parts[1],x+52,y+22,8.9,false,C.gray);
  }else{
    lines(pg,bodyStr,x+16,y+h-102,w-32,8.9,11.8,false,C.gray,6);
  }
}
function page8(){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Regionale Wirkung',PH-100);
  let y=bigTitle(pg,'Ihr Gast kann seinen Vorteil auch rund um Ihr Hotel erleben.',PH-132,W,25,4);y-=6;bodyText(pg,'Vorausgesetzt, die jeweiligen Anbieter sind teilnehmende Akzeptanzstellen, kann zusätzliche Kaufkraft auch bei Partnern in der Region Wirkung entfalten.',y,W,10.4,5,C.gray);
  const gap=14,cw=(W-gap)/2,ch=150;regionCard(pg,ML,410,cw,ch,'Kutschfahrt','120 €','40 € Wertgutschein einsetzen → 80 € regulär bezahlen.',C.mint);regionCard(pg,ML+cw+gap,410,cw,ch,'Sport- oder Skiverleih','150 €','50 € Wertgutschein einsetzen → 100 € regulär bezahlen.',C.mag);regionCard(pg,ML,244,cw,ch,'Restaurant in der Region','140 €','60 € Wertgutschein einsetzen → 80 € regulär bezahlen.',C.navy);regionCard(pg,ML+cw+gap,244,cw,ch,'E-Bike / Freizeitangebot','90 €','50 € Wertgutschein einsetzen → 40 € regulär bezahlen.',C.mint);
  callout(pg,105,102,'Mehr als ein einzelnes Hotelangebot','Hotel, Gastronomie, Freizeit und regionale Erlebnisse können gemeinsam einen größeren Erlebnisraum schaffen. Partnerangebote gelten dabei ausschließlich bei teilnehmenden Akzeptanzstellen.',C.mintSoft,C.mint,C.ink);footer(pg,8);return pg;
}

function renderPage(pg){return ascii(pg.c.join(''))}
function pdf(streams){
  const n=streams.length;let id=5,pi=[],ci=[];for(let i=0;i<n;i++){pi.push(id++);ci.push(id++)}
  const o=new Map([[1,ascii('<< /Type /Catalog /Pages 2 0 R >>')],[2,ascii(`<< /Type /Pages /Count ${n} /Kids [${pi.map(x=>x+' 0 R').join(' ')}] >>`)],[3,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')],[4,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')]]);
  for(let i=0;i<n;i++){o.set(pi[i],ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${ci[i]} 0 R >>`));o.set(ci[i],cat([ascii(`<< /Length ${streams[i].length} >>\nstream\n`),streams[i],ascii('\nendstream')]))}
  const h=ascii('%PDF-1.4\n%FSA\n'),chunks=[h],offs=[0];let off=h.length;for(let i=1;i<id;i++){offs[i]=off;const a=ascii(`${i} 0 obj\n`),b=o.get(i),z=ascii('\nendobj\n');chunks.push(a,b,z);off+=a.length+b.length+z.length}
  const xo=off;let x=`xref\n0 ${id}\n0000000000 65535 f \n`;for(let i=1;i<id;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${id} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`;chunks.push(ascii(x));return cat(chunks)
}
function normalizeServices(services){const fallback=[{name:'Sauna / Wellness',price:45,cost:5,voucher:15},{name:'Massage',price:120,cost:40,voucher:30},{name:'Candlelight-Dinner',price:180,cost:55,voucher:40},{name:'Getränke an der Hotelbar',price:100,cost:22,voucher:20},{name:'Champagner',price:120,cost:25,voucher:30}];return (services?.length?services:fallback).map(s=>{const price=num(s.price),cost=num(s.cost),voucher=Math.min(num(s.voucher),price),pay=Math.max(0,price-voucher),margin=pay-cost;return{name:clean(s.name)||'Leistung',price,cost,voucher,pay,margin}})}
function buildBrochurePdf(data={}){const d={house:clean(data.house)||'Ihr Haus',services:normalizeServices(data.services)};return pdf([page1(d),page2(d),page3(d),page4(d),page5(d),page6(d),page7(d),page8(d)].map(renderPage))}
function setState(doc,type,html){const box=doc.querySelector('#pdfState');if(!box)return;box.className='pdfState show '+type;box.innerHTML=html}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function collectServices(doc){return [...doc.querySelectorAll('tr[data-service]')].map(tr=>({name:tr.querySelector('.serviceName')?.textContent||'Leistung',price:tr.querySelector('[data-price]')?.value||0,cost:tr.querySelector('[data-cost]')?.value||0,voucher:tr.querySelector('[data-voucher]')?.value||0}))}
function wireFrame(frame){
  const doc=frame.contentDocument;if(!doc)return;
  const panel=doc.querySelector('#pdfPanel'),oldBtn=doc.querySelector('#pdfBtn');
  if(panel){const label=panel.querySelector('.miniLabel'),h=panel.querySelector('.pdfCopy h3'),p=panel.querySelector('.pdfCopy p');if(label)label.textContent='PDF DESIGN-TEST · 8 SEITEN';if(h)h.textContent='Neue Hotel-Broschüre testen';if(p)p.textContent='Die Print-first-Testversion umfasst jetzt acht Broschürenseiten. Die produktive Hotel-Seite und ihre PDF bleiben unverändert.'}
  if(oldBtn){
    const btn=oldBtn.cloneNode(true);btn.textContent='8-seitige Broschüren-PDF erstellen';oldBtn.replaceWith(btn);
    btn.addEventListener('click',()=>{
      const old=btn.textContent;btn.disabled=true;btn.textContent='PDF wird erstellt …';
      setState(doc,'generating','<span class="pdfSpinner" aria-hidden="true"></span><div><strong>Die 8-seitige Print-first-Broschüre wird erstellt.</strong><div class="pdfHint">Titel · Warum jetzt? · Paradigmenwechsel · Buchungsmagnet · Gast & Hotel · Leistungen · Steuerung · Region</div></div>');
      try{
        const house=(doc.querySelector('#hotelName')?.value||'').trim()||'Ihr Haus',services=collectServices(doc),u8=buildBrochurePdf({house,services}),name=house==='Ihr Haus'?'Hotel_Broschuere_Design-Test_'+isoDate()+'.pdf':'Hotel_Broschuere_'+safeFilePart(house)+'_Design-Test_'+isoDate()+'.pdf';
        const blob=new Blob([u8],{type:'application/pdf'}),file=typeof File!=='undefined'?new File([blob],name,{type:'application/pdf'}):blob;
        if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(file);
        setState(doc,'success','<div class="pdfReadyTop"><span class="pdfCheck">✓</span><div><strong>Die 8-seitige Design-Test-PDF ist fertig.</strong><div class="pdfHint">Print-first: große dunkle Flächen bleiben vermieden. Seiten 5 bis 8 übernehmen weitere sichtbare Inhalte der Hotel-Seite.</div></div></div><div class="pdfFile">'+escapeHtml(name)+'</div><a class="pdfDownload" href="'+pdfUrl+'" download="'+escapeHtml(name)+'" type="application/pdf" rel="noopener">PDF herunterladen / speichern</a>');
      }catch(err){console.error('Hotel brochure test',err);setState(doc,'error','<strong>Die Test-PDF konnte nicht erstellt werden.</strong><div class="pdfHint">'+escapeHtml(err?.message||String(err))+'</div>')}
      finally{btn.disabled=false;btn.textContent=old}
    });
  }
  const fit=()=>{try{frame.style.height=Math.max(900,doc.documentElement.scrollHeight,doc.body.scrollHeight)+'px'}catch(_){}};fit();if(global.ResizeObserver){const ro=new ResizeObserver(fit);ro.observe(doc.body)}else setInterval(fit,1500)
}
function init(){const frame=document.getElementById('hotelFrame');if(!frame)return;frame.addEventListener('load',()=>wireFrame(frame));if(frame.contentDocument?.readyState==='complete')wireFrame(frame)}
global.HotelBrochureTestBuilder={version:VERSION,buildBrochurePdf,safeFilePart};
if(typeof document!=='undefined')init();
})(typeof window!=='undefined'?window:globalThis);