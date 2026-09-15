(function(global){
'use strict';

const VERSION='HOTEL_BROCHURE_TEST_V1';
const PW=595.28,PH=841.89,ML=42,MR=42,W=PW-ML-MR;
const te=new TextEncoder();
const cp={8364:128,8211:150,8212:151,8216:145,8217:146,8220:147,8221:148,8222:132,8226:149,8230:133};
const C={navy:[.075,.133,.22],ink:[.145,.208,.27],gray:[.40,.46,.53],line:[.85,.89,.90],mint:[0,.655,.678],mintDark:[0,.48,.50],mintSoft:[.918,.976,.977],mag:[.776,0,.435],white:[1,1,1]};
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

function wrap(s,w,z,bold=false){
  const factor=bold?.555:.505;
  const max=Math.max(7,Math.floor(w/(z*factor)));
  const out=[];
  for(const para of String(s??'').split(/\n/)){
    const words=clean(para).split(/\s+/).filter(Boolean);
    if(!words.length){out.push('');continue}
    let line='';
    for(let word of words){
      while(word.length>max){if(line){out.push(line);line=''}out.push(word.slice(0,max));word=word.slice(max)}
      const t=line?line+' '+word:word;
      if(t.length>max&&line){out.push(line);line=word}else line=t;
    }
    if(line)out.push(line);
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
function pill(pg,label,x,y,w,fillCol,textCol=C.navy){roundRect(pg,x,y,w,25,12,fillCol,C.line,.4);text(pg,label,x+11,y+8,8.4,true,textCol)}
function topBrand(pg){text(pg,'LiquidityBooster',ML,PH-48,18,true,C.navy);text(pg,'HOTEL & GASTGEWERBE',PW-MR-112,PH-45,7.7,true,C.gray);rule(pg,ML,PH-62,W,C.mint,1.2)}
function footer(pg,i,total){rule(pg,ML,31,W,C.line,.5);text(pg,`LiquidityBooster · Hotel & Gastgewerbe · ${displayDate()}`,ML,17,6.5,false,C.gray);text(pg,`Seite ${i} von ${total}`,PW-MR-54,17,6.5,false,C.gray)}
function kicker(pg,s,y){text(pg,s.toUpperCase(),ML,y,8.3,true,C.mag)}
function bigTitle(pg,s,y,w=W,z=28,max=4){return lines(pg,s,ML,y,w,z,z*1.08,true,C.navy,max)}
function bodyText(pg,s,y,w=W,z=10.5,max=8,col=C.gray){return lines(pg,s,ML,y,w,z,z*1.38,false,col,max)}
function card(pg,x,y,w,h,titleStr,bodyStr,accent=C.mint,iconText=''){
  roundRect(pg,x,y,w,h,12,C.white,C.line,.65);
  fill(pg,x,y+h-5,w,5,accent);
  if(iconText){roundRect(pg,x+16,y+h-43,28,28,8,accent,null);text(pg,iconText,x+25,y+h-34,10,true,C.white)}
  text(pg,titleStr,x+16,y+h-63,11.2,true,C.navy);
  lines(pg,bodyStr,x+16,y+h-82,w-32,8.8,11.8,false,C.gray,6);
}
function callout(pg,y,h,titleStr,bodyStr,fillCol=C.mintSoft,accent=C.mint,textCol=C.ink){roundRect(pg,ML,y,W,h,12,fillCol,null);fill(pg,ML,y,6,h,accent);text(pg,titleStr,ML+18,y+h-26,11.5,true,C.navy);lines(pg,bodyStr,ML+18,y+h-45,W-36,9.3,12.4,false,textCol,5)}
function arrow(pg,x1,y1,x2,y2,col=C.mint){pg.c.push(`q ${RGB(col)} 2.4 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q\n`);pg.c.push(`q ${rgb(col)} ${(x2-7).toFixed(2)} ${(y2+4).toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} ${(x2-7).toFixed(2)} ${(y2-4).toFixed(2)} l h f Q\n`)}

function page1(data){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);
  kicker(pg,'Hotels. Regionen. Wachstum.',PH-100);
  let y=bigTitle(pg,'Ihr Hotel kann mehr als Zimmer verkaufen.',PH-132,W,31,4);y-=10;
  y=bodyText(pg,'Mehr Direktbuchungen. Mehr Marge. Mehr eigene Gästebeziehungen.',y,W,13,3,C.ink);
  const py=y-38;
  pill(pg,'Mehr Kontrolle',ML,py,108,C.white);pill(pg,'Mehr Wiederkehrer',ML+116,py,118,C.white);pill(pg,'Mehr Markenstärke',ML+242,py,124,C.white);pill(pg,'Mehr Datenhoheit',ML+374,py,112,C.white);
  const panelY=126,panelH=300;
  roundRect(pg,ML,panelY,W,panelH,18,C.navy,null);fill(pg,ML,panelY,W,8,C.mint);
  text(pg,'IHRE PERSÖNLICHE ENTSCHEIDUNGSUNTERLAGE',ML+26,panelY+panelH-42,8.2,true,[.49,.88,.89]);
  lines(pg,data.house==='Ihr Haus'?'Für Ihr Haus':'Für '+data.house,ML+26,panelY+panelH-82,W-52,25,29,true,C.white,2);
  lines(pg,'Direktbuchung, zusätzlicher Nutzwert und mehr Wirkung rund um den Aufenthalt.',ML+26,panelY+panelH-141,W-52,12.5,16,false,[.86,.91,.94],4);
  rule(pg,ML+26,panelY+114,W-52,[.20,.44,.50],.8);
  text(pg,'DESIGN-TEST · ERSTE 4 BROSCHÜRENSEITEN',ML+26,panelY+86,7.7,true,[.49,.88,.89]);text(pg,'Stand '+displayDate(),ML+26,panelY+60,9.5,false,C.white);text(pg,'LiquidityBooster',ML+26,panelY+33,9.5,true,C.white);
  footer(pg,1,4);return pg;
}
function page2(){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Warum jetzt?',PH-100);
  let y=bigTitle(pg,'Die Frage ist nicht, ob Gäste buchen. Sondern: Wo buchen sie - und wem gehört danach die Beziehung zum Gast?',PH-132,W,24,5);y-=8;
  bodyText(pg,'Viele Hotels investieren Monat für Monat in Reichweite, Portale und kurzfristige Aktionen. Dabei entstehen Abhängigkeiten, die Marge kosten und den direkten Zugang zum Gast schwächen.',y,W,10.5,6,C.gray);
  const gap=12,cw=(W-gap*2)/3,cy=344,ch=190;
  card(pg,ML,cy,cw,ch,'OTA-Abhängigkeit','Zu viele Buchungen laufen über fremde Plattformen statt direkt ins Haus.',C.mag,'1');
  card(pg,ML+cw+gap,cy,cw,ch,'Hohe Provisionen','Ein Teil der Marge fließt mit jeder vermittelten Buchung ab.',C.navy,'2');
  card(pg,ML+(cw+gap)*2,cy,cw,ch,'Schwankende Auslastung','Lücken in Nebenzeiten erzeugen kurzfristigen Buchungsdruck.',C.mint,'3');
  callout(pg,160,130,'Die bessere Frage:','Wie wird aus Marketingaufwand ein eigener, wachsender Wert - und aus einem Gast mehr Nutzung rund um seinen Aufenthalt?',C.mintSoft,C.mint,C.ink);
  footer(pg,2,4);return pg;
}
function page3(){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Paradigmenwechsel',PH-100);
  let y=bigTitle(pg,'Belohnungssystem statt Rabattschlachten',PH-132,W,27,3);y-=6;bodyText(pg,'Der Unterschied liegt darin, ob Sie Preis verschenken - oder Kaufkraft schaffen.',y,W,11,3,C.gray);
  const gap=24,cw=(W-gap)/2,cy=320,ch=310;
  roundRect(pg,ML,cy,cw,ch,16,C.white,C.line,.7);fill(pg,ML,cy+ch-6,cw,6,C.mag);text(pg,'-20 %',ML+24,cy+ch-70,28,true,C.mag);text(pg,'Klassischer Rabatt',ML+24,cy+ch-106,14,true,C.navy);lines(pg,'Der Preis wird sofort reduziert. Der Rabatt ist nach dem Kauf verbraucht. Für Ihr Hotel sinken Marge und Ertrag unmittelbar.',ML+24,cy+ch-138,cw-48,10,13.4,false,C.gray,8);
  roundRect(pg,ML+cw+gap,cy,cw,ch,16,C.white,C.line,.7);fill(pg,ML+cw+gap,cy+ch-6,cw,6,C.mint);text(pg,'20 € -> 100 €',ML+cw+gap+24,cy+ch-70,24,true,C.mintDark);text(pg,'Digitaler Wertgutschein',ML+cw+gap+24,cy+ch-106,14,true,C.navy);lines(pg,'Im Beispiel wird für 100 € Gutscheinwert ein Reserveanteil von 20 € hinterlegt. Der Gast erhält zusätzliche Kaufkraft, ohne dass der Buchungspreis sofort reduziert wird.',ML+cw+gap+24,cy+ch-138,cw-48,10,13.4,false,C.gray,9);
  circle(pg,PW/2,cy+ch/2,25,C.navy);text(pg,'VS',PW/2-9,cy+ch/2-4,11,true,C.white);
  callout(pg,148,118,'Nicht billiger werden. Attraktiver werden.','Das ist die Grundidee hinter dem LiquidityBooster-Modell.',C.mintSoft,C.mint,C.ink);
  footer(pg,3,4);return pg;
}
function stepCard(pg,x,y,w,h,nr,titleStr,bodyStr){roundRect(pg,x,y,w,h,14,C.white,C.line,.7);roundRect(pg,x+16,y+h-48,32,32,8,C.mint,null);text(pg,String(nr),x+27,y+h-37,11,true,C.white);text(pg,titleStr,x+16,y+h-76,11.4,true,C.navy);lines(pg,bodyStr,x+16,y+h-96,w-32,8.8,11.8,false,C.gray,5)}
function page4(){
  const pg=page();fill(pg,0,0,PW,PH,C.white);topBrand(pg);kicker(pg,'Buchungsmagnet',PH-100);
  let y=bigTitle(pg,'Was wäre, wenn die Direktbuchung spürbar attraktiver wird?',PH-132,W,25,4);y-=6;bodyText(pg,'Nicht durch einen sofortigen Rabatt - sondern durch zusätzliche Kaufkraft. Der Gast bekommt einen nachvollziehbaren Grund, direkt bei Ihnen zu buchen.',y,W,10.4,5,C.gray);
  const gap=14,cw=(W-gap)/2,ch=150;
  stepCard(pg,ML,410,cw,ch,1,'Direkt buchen','Der Gast entscheidet sich für die eigene Hotel-Website.');stepCard(pg,ML+cw+gap,410,cw,ch,2,'Belohnung erhalten','Die Buchung wird mit einem attraktiven Wertgutschein kombiniert.');stepCard(pg,ML,244,cw,ch,3,'Mehr Möglichkeiten','Der Gast kann zusätzliche Kaufkraft für weitere Angebote nutzen.');stepCard(pg,ML+cw+gap,244,cw,ch,4,'Mehr Wirkung','Direktumsatz, Gästebindung und Folgegeschäft bekommen einen zusätzlichen Impuls.');
  roundRect(pg,ML,105,W,103,14,C.navy,null);text(pg,'BEISPIEL AUS DER SEITE',ML+18,183,7.4,true,[.49,.88,.89]);text(pg,'2.000 €',ML+18,145,20,true,C.white);text(pg,'reguläre Buchung',ML+18,126,8.4,false,[.84,.90,.93]);arrow(pg,ML+125,150,ML+177,150,C.mint);text(pg,'400 €',ML+194,145,20,true,C.white);text(pg,'Wertgutschein',ML+194,126,8.4,false,[.84,.90,.93]);arrow(pg,ML+290,150,ML+342,150,C.mint);text(pg,'80 €',ML+360,145,20,true,C.white);text(pg,'Reserveanteil im Beispiel',ML+360,126,8.4,false,[.84,.90,.93]);
  footer(pg,4,4);return pg;
}
function renderPage(pg){return ascii(pg.c.join(''))}
function pdf(streams){
  const n=streams.length;let id=5,pi=[],ci=[];for(let i=0;i<n;i++){pi.push(id++);ci.push(id++)}
  const o=new Map([[1,ascii('<< /Type /Catalog /Pages 2 0 R >>')],[2,ascii(`<< /Type /Pages /Count ${n} /Kids [${pi.map(x=>x+' 0 R').join(' ')}] >>`)],[3,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')],[4,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')]]);
  for(let i=0;i<n;i++){o.set(pi[i],ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${ci[i]} 0 R >>`));o.set(ci[i],cat([ascii(`<< /Length ${streams[i].length} >>\nstream\n`),streams[i],ascii('\nendstream')]))}
  const h=ascii('%PDF-1.4\n%FSA\n'),chunks=[h],offs=[0];let off=h.length;for(let i=1;i<id;i++){offs[i]=off;const a=ascii(`${i} 0 obj\n`),b=o.get(i),z=ascii('\nendobj\n');chunks.push(a,b,z);off+=a.length+b.length+z.length}
  const xo=off;let x=`xref\n0 ${id}\n0000000000 65535 f \n`;for(let i=1;i<id;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${id} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`;chunks.push(ascii(x));return cat(chunks)
}
function buildBrochurePdf(data={}){const d={house:clean(data.house)||'Ihr Haus'};return pdf([page1(d),page2(d),page3(d),page4(d)].map(renderPage))}
function setState(doc,type,html){const box=doc.querySelector('#pdfState');if(!box)return;box.className='pdfState show '+type;box.innerHTML=html}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function wireFrame(frame){
  const doc=frame.contentDocument;if(!doc)return;
  const panel=doc.querySelector('#pdfPanel'),oldBtn=doc.querySelector('#pdfBtn');
  if(panel){const label=panel.querySelector('.miniLabel'),h=panel.querySelector('.pdfCopy h3'),p=panel.querySelector('.pdfCopy p');if(label)label.textContent='PDF DESIGN-TEST · 4 SEITEN';if(h)h.textContent='Neue Hotel-Broschüre testen';if(p)p.textContent='Diese Testversion verändert nur die Gestaltung der PDF. Die funktionierende PDF-Ausgabe und die produktive Hotel-Seite bleiben unangetastet.'}
  if(oldBtn){
    const btn=oldBtn.cloneNode(true);btn.textContent='Broschüren-PDF Test erstellen';oldBtn.replaceWith(btn);
    btn.addEventListener('click',()=>{
      const old=btn.textContent;btn.disabled=true;btn.textContent='PDF wird erstellt …';
      setState(doc,'generating','<span class="pdfSpinner" aria-hidden="true"></span><div><strong>Die 4-seitige Design-Test-PDF wird erstellt.</strong><div class="pdfHint">Titel · Warum jetzt? · Paradigmenwechsel · Buchungsmagnet</div></div>');
      try{
        const house=(doc.querySelector('#hotelName')?.value||'').trim()||'Ihr Haus',u8=buildBrochurePdf({house}),name=house==='Ihr Haus'?'Hotel_Broschuere_Design-Test_'+isoDate()+'.pdf':'Hotel_Broschuere_'+safeFilePart(house)+'_Design-Test_'+isoDate()+'.pdf';
        const blob=new Blob([u8],{type:'application/pdf'}),file=typeof File!=='undefined'?new File([blob],name,{type:'application/pdf'}):blob;
        if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(file);
        setState(doc,'success','<div class="pdfReadyTop"><span class="pdfCheck">✓</span><div><strong>Die Design-Test-PDF ist fertig.</strong><div class="pdfHint">Vier Seiten im neuen Broschürenstil. Noch keine Änderung an der produktiven Hotel-PDF.</div></div></div><div class="pdfFile">'+escapeHtml(name)+'</div><a class="pdfDownload" href="'+pdfUrl+'" download="'+escapeHtml(name)+'" type="application/pdf" rel="noopener">PDF herunterladen / speichern</a>');
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
