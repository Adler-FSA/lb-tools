/* BusinessBooster: live DOM -> A4 blocks, using the unchanged Hotel PDF drawing core.
   Only the existing Akademie PDF-Zentrale handles the finished blob. */
(()=>{'use strict';
let corePromise;
const norm=s=>String(s??'').replace(/\s+/g,' ').trim();
const val=n=>norm(n?.textContent).replace(/[✓✔☑]/g,'Ja').replace(/[✗✘]/g,'Nein').replace(/[✦♡◈]/g,'');
const validDoc=d=>!!(d?.querySelector('#otaRevenue')&&d.querySelector('#businessBrochureExtras')&&d.querySelector('#bbFullserviceDetailsV2')&&d.querySelector('#bbScenarioForm')&&d.querySelector('.bbMediaFigure img'));
async function core(){if(corePromise)return corePromise;corePromise=(async()=>{
 const r=await fetch('./hotel-pdf-eigen.js?v=1',{cache:'no-store'});if(!r.ok)throw Error('Der freigegebene Hotel-PDF-Zeichenkern fehlt.');
 const src=await r.text(),mark="window.HotelPdfEigen=Object.freeze({version:'HOTEL_PDF_EIGEN_V1',generate,capture});";
 if(src.split(mark).length!==2)throw Error('PDF-Master wurde verändert; Business-Adapter abgebrochen.');
 const code=src.replace(mark,'window.LBBusinessPdfCore=Object.freeze({PDF,split,measure,enc,join,rgb,hx,PW,PH,M,W,BOT,TOP});');
 const script=document.createElement('script');script.textContent=code;document.head.appendChild(script);script.remove();
 if(!window.LBBusinessPdfCore?.PDF)throw Error('PDF-Master konnte nicht geladen werden.');return window.LBBusinessPdfCore;
 })();return corePromise;}
function filePart(s){return (norm(s)||'Hotel').replace(/ß/g,'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,55)||'Hotel'}
function formatted(input){const raw=norm(input?.value);if(!raw)return 'Keine Eingabe';const number=Number(raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw);if(!Number.isFinite(number))return raw;const id=input.id||'',pct=/Pct|Conversion|shift|percent/i.test(id),money=/^(otaRevenue|avgBooking|bbBookingValue)$/i.test(id),count=/^(bbBookings|bbContacts)$/i.test(id);return new Intl.NumberFormat('de-DE',{minimumFractionDigits:money?2:0,maximumFractionDigits:count?0,2}).format(number)+(pct?' %':money?' €':'')}
function profile(d){const hotel=d.defaultView?.parent?.LBHotelStorage?.getSection('hotel')||{};return norm(hotel.name)||norm(d.querySelector('#hotelName')?.value)||'Hotel';}
function isHidden(e){return e.hidden||e.getAttribute('aria-hidden')==='true'||e.style.display==='none'||e.closest('#bbStandalonePdfPanel')!==null||e.closest('.actions')!==null;}
async function readImage(img){const src=img.currentSrc||img.src;if(!src)throw Error('Bildquelle fehlt');const res=await fetch(src,{mode:'cors'});if(!res.ok)throw Error('Bild kann nicht abgerufen werden');const blob=await res.blob();const u=URL.createObjectURL(blob);try{const el=new Image();el.src=u;await (el.decode?el.decode():new Promise((a,b)=>{el.onload=a;el.onerror=b}));const max=1250,k=Math.min(1,max/Math.max(el.naturalWidth,el.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(el.naturalWidth*k));canvas.height=Math.max(1,Math.round(el.naturalHeight*k));canvas.getContext('2d').drawImage(el,0,0,canvas.width,canvas.height);const jpg=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('JPEG-Konvertierung fehlgeschlagen')),'image/jpeg',.83));return{data:new Uint8Array(await jpg.arrayBuffer()),width:canvas.width,height:canvas.height};}finally{URL.revokeObjectURL(u)}}
function addImage(p,k,img){const scale=Math.min(k.W/img.width,310/img.height),w=img.width*scale,h=img.height*scale,x=k.M+(k.W-w)/2;p.ensure(h+19);const y=p.current.y-h;p.current.stream.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im${p._imgs.length+1} Do Q\n`);p._imgs.push({page:p.current,key:'Im'+(p._imgs.length+1),...img});p.current.y=y-19;}
function finishWithImages(p,k){const count=p.pages.length,assets=p._imgs;
 for(let j=0;j<count;j++){p.current=p.pages[j];p.line(k.M,39,k.W,'line');p.text('LiquidityBooster · Hotel & BusinessBooster',k.M,26,7,false,'muted');p.text(`Seite ${j+1} von ${count}`,k.PW-k.M-93,26,7,false,'muted');}
 const obj=new Map(),pids=[],cids=[];let id=5;for(let j=0;j<count;j++){pids.push(id++);cids.push(id++);}for(const image of assets)image.id=id++;
 obj.set(1,k.enc('<< /Type /Catalog /Pages 2 0 R >>'));
 obj.set(2,k.enc(`<< /Type /Pages /Count ${count} /Kids [${pids.map(q=>q+' 0 R').join(' ')}] >>`));
 obj.set(3,k.enc('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
 obj.set(4,k.enc('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
 for(let j=0;j<count;j++){const stream=k.enc(p.pages[j].stream.join('')),used=assets.filter(a=>a.page===p.pages[j]),images=used.length?' /XObject << '+used.map(a=>`/${a.key} ${a.id} 0 R`).join(' ')+' >>':'';
 obj.set(pids[j],k.enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${k.PW} ${k.PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${images} >> /Contents ${cids[j]} 0 R >>`));
 obj.set(cids[j],k.join([k.enc(`<< /Length ${stream.length} >>\nstream\n`),stream,k.enc('\nendstream')]));}
 for(const im of assets)obj.set(im.id,k.join([k.enc(`<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>\nstream\n`),im.data,k.enc('\nendstream')]));
 const hdr=k.enc('%PDF-1.4\n%LBBUSINESS\n'),arr=[hdr],offsets=[0];let cursor=hdr.length;
 for(let j=1;j<id;j++){offsets[j]=cursor;const blocks=[k.enc(`${j} 0 obj\n`),obj.get(j),k.enc('\nendobj\n')];arr.push(...blocks);cursor+=blocks.reduce((x,a)=>x+a.length,0);}
 const start=cursor;let x=`xref\n0 ${id}\n0000000000 65535 f \n`;for(let j=1;j<id;j++)x+=String(offsets[j]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${id} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;arr.push(k.enc(x));return k.join(arr);
}
async function generate(d,progress){if(!validDoc(d))throw Error('Business-Inhalte oder Rechner fehlen noch. Bitte die Seite neu laden.');
 const invalid=[...d.querySelectorAll('#otaRevenue,#otaPct,#avgBooking,#shiftPct,#bbScenarioForm input')].filter(e=>!norm(e.value)||(e.validity&&!e.validity.valid));if(invalid.length)throw Error('Bitte ungültige oder leere Rechnerfelder korrigieren.');
 const k=await core(),name=profile(d),p=new k.PDF({brand:'LiquidityBooster',brandLine:'Hotel · BusinessBooster',name});p._imgs=[];let missed=[];
 const blockText=(s,b=false,z=9.5,c='ink')=>{if(!norm(s))return;const height=k.split(s,k.W-6,z,b).length*z*1.4+8;p.ensure(Math.min(height+(b?33:0),k.PH-k.TOP-k.BOT));p.lines(s,k.M+3,k.W-6,z,b,c,z*1.4,8)};
 const cards=(items,kind='dual')=>{const group=items.filter(item=>norm(item.title)||norm(item.body)||item.paragraphs?.length).map(item=>({title:norm(item.title),value:norm(item.value),paragraphs:item.paragraphs||[norm(item.body)].filter(Boolean),notes:[],theme:item.theme||'mint'}));if(group.length)p.cards({kind,cards:group});};
 const field=e=>{const label=e.querySelector('label')||e.closest('label');const input=e.querySelector('input,select')|| (e.matches('label')?e.querySelector('input,select'):null);if(!input)return;let labelText=norm(label?.childNodes[0]?.textContent)||norm(label?.textContent).replace(norm(input.value),'');const selected=input.tagName==='SELECT'?input.selectedOptions[0]?.textContent:formatted(input);cards([{title:labelText||input.id,body:selected}]);};
 const metrics=root=>{const out=[...root.children].map(e=>({label:val(e.querySelector('span'))||val(e.querySelector('small'))||val(e.querySelector('h3')),value:val(e.querySelector('strong'))||val(e.querySelector('.bigNumber'))||val(e.querySelector('b')),theme:e.classList.contains('mag')?'mag':e.classList.contains('mint')?'mint':'white',note:val(e.querySelector('small'))})).filter(x=>x.label&&x.value);if(out.length){p.metrics(out);for(const x of out)if(x.note&&x.note!==x.label)blockText(x.label+': '+x.note,false,7.8,'muted');}};
 // Keep multi-column content in the same visual group, while still allowing natural A4 flow.
 const simpleCard=n=>{
  const title=val(n.querySelector('h3,h4,.bbOfferTop strong'))||val(n.querySelector('strong,b'))||val(n.querySelector('.n'));
  const paragraphs=[...n.querySelectorAll('p,li,.bbExample')].filter(e=>!e.closest('table')).map(val).filter(Boolean);
  if(n.matches('.package')){const price=val(n.querySelector('.price'));if(price)paragraphs.unshift('Preis: '+price);}
  if(n.matches('.bbOffer')){const subtitle=val(n.querySelector('.bbOfferText b'));if(subtitle)paragraphs.unshift(subtitle);}
  if(!paragraphs.length){const direct=[...n.children].filter(e=>e.matches('span,small,em')).map(val).filter(Boolean);paragraphs.push(...direct);}
  return {title:title||val(n.querySelector('b'))||val(n).slice(0,55),paragraphs,theme:n.classList.contains('mag')?'mag':'mint'};
 };
 const table=n=>{
  const rows=[...n.querySelectorAll('tr')].map(row=>[...row.querySelectorAll('th,td')].map(cell=>val(cell)||'–'));
  if(!rows.length)return;
  const cols=Math.max(...rows.map(row=>row.length));if(cols>5){for(const row of rows)blockText(row.join(' | '));return;}
  const w=k.W,first=cols===4?w*.45:w/cols,rest=(w-first)/(cols-1),widths=Array.from({length:cols},(_,i)=>i?rest:first);
  const xs=[k.M];for(let i=1;i<cols;i++)xs[i]=xs[i-1]+widths[i-1];
  function drawHeader(){const h=35;p.ensure(h+42);const y=p.current.y;p.rect(k.M,y-h,w,h,'navy');rows[0].forEach((cell,i)=>k.split(cell,widths[i]-12,7.7,true).slice(0,3).forEach((line,j)=>p.text(line,xs[i]+6,y-11-j*10,7.7,true,'white')));p.current.y=y-h;}
  drawHeader();for(let r=1;r<rows.length;r++){
   const cells=rows[r],splits=widths.map((cw,i)=>k.split(cells[i]||'',cw-12,8,i===0));const h=Math.max(30,...splits.map(a=>a.length*11+10));
   if(p.current.y-h<k.BOT+3){p.page();p.current.y-=12;drawHeader();}
   const y=p.current.y;p.rect(k.M,y-h,w,h,r%2?'soft':'white','line');let x=k.M;
   for(let i=0;i<cols;i++){if(i)p.rect(x,y-h,.5,h,'line');splits[i].forEach((line,j)=>p.text(line,x+6,y-12-j*11,8,i===0,'ink'));x+=widths[i];}
   p.current.y=y-h;
  }p.current.y-=17;
 };
 // Only this existing PDF section is drawn in the original HTML order and color scheme.
 const impuls=n=>{
  p.ensure(340);
  const top=p.current.y,round=(x,y,w,h,r,fill,stroke)=>{
   const f=v=>v.toFixed(2),a=p.current.stream;
   const path=`${f(x+r)} ${f(y)} m ${f(x+w-r)} ${f(y)} l ${f(x+w-r+r*.55228475)} ${f(y)} ${f(x+w)} ${f(y+r-r*.55228475)} ${f(x+w)} ${f(y+r)} c ${f(x+w)} ${f(y+h-r)} l ${f(x+w)} ${f(y+h-r+r*.55228475)} ${f(x+w-r+r*.55228475)} ${f(y+h)} ${f(x+w-r)} ${f(y+h)} c ${f(x+r)} ${f(y+h)} l ${f(x+r-r*.55228475)} ${f(y+h)} ${f(x)} ${f(y+h-r+r*.55228475)} ${f(x)} ${f(y+h-r)} c ${f(x)} ${f(y+r)} l ${f(x)} ${f(y+r-r*.55228475)} ${f(x+r-r*.55228475)} ${f(y)} ${f(x+r)} ${f(y)} c h`;
   a.push(`q ${k.rgb(fill)} rg ${stroke?k.rgb(stroke)+' RG .65 w ':''}${path} ${stroke?'B':'f'} Q\n`);
  };
  const centered=(s,x,w,baseline,size=9,bold=false,color='navy')=>p.text(s,x+(w-k.measure(s,size,bold))/2,baseline,size,bold,color);
  round(k.M,top-325,k.W,325,15,'white','line');
  const x=k.M+15,w=k.W-30;
  p.text(val(n.querySelector('.bbKicker')).toUpperCase(),x,top-24,8.2,true,'mint');
  p.text(val(n.querySelector(':scope > h3')),x,top-51,19,true,'navy');
  p.text(val(n.querySelector('.bbIntro')),x,top-73,10.5,false,'mag');
  const months=[...n.querySelectorAll('.bbMonths > .bbMonth')].map(val),gap=4,cw=(w-gap*11)/12;
  months.forEach((name,i)=>{
   const odd=i%2===1,mx=x+i*(cw+gap),mt=top-(odd?110:102),color=odd?'mag':'mint';
   round(mx,mt-52,cw,52,7,odd?'pink':'pale');
   round(mx+(cw-14)/2,mt-27,14,14,4,'white');
   round(mx+(cw-6)/2,mt-23,6,6,2,color);
   centered(name,mx,cw,mt-43,8.3,true,color);
  });
  centered(val(n.querySelector(':scope > h4')),x,w,top-191,12.5,true,'navy');
  centered(val(n.querySelector(':scope > p:not(.bbIntro)')),x,w,top-210,9.1,false,'ink');
  const items=[...n.querySelectorAll('.bbTriplet > .bbMini')],cgap=8,cardW=(w-2*cgap)/3;
  items.forEach((item,i)=>{
   const cx=x+i*(cardW+cgap),ct=top-229,ch=86;
   round(cx,ct-ch,cardW,ch,10,'white','line');
   p.rect(cx+2,ct-5,cardW-4,4,i===1?'mag':'mint');
   let ty=ct-23;
   for(const line of k.split(val(item.querySelector('h4')),cardW-19,9.8,true)){p.text(line,cx+10,ty,9.8,true,'navy');ty-=12;}
   ty-=4;
   for(const line of k.split(val(item.querySelector('p')),cardW-19,8.3,false)){p.text(line,cx+10,ty,8.3,false,'ink');ty-=10.5;}
  });
  p.current.y=top-339;
 };
 const months=n=>{
  const names=[...n.children].map(val);if(!names.length)return;
  const cols=6,gap=7,cw=(k.W-gap*5)/cols,rh=48,total=2*rh+14;p.ensure(total+15);const y=p.current.y;
  names.forEach((label,i)=>{const row=Math.floor(i/cols),col=i%cols,x=k.M+col*(cw+gap),yy=y-row*(rh+9);p.rect(x,yy-rh,cw,rh,row===0?'pale':'pink','line');p.text(label,x+12,yy-29,11,true,row===0?'mint':'mag');});
  p.current.y=y-total-12;
 };
 const region=n=>{
  const center=n.querySelector(':scope > .bbRegionCenter');
  const names=[...n.querySelectorAll(':scope > .bbRegion > div')].map(val).filter(Boolean);if(names.length<3)return;
  const cols=3,gap=12,cw=(k.W-gap*2)/cols,ch=60,h=3*ch+22;p.ensure(h+14);let y=p.current.y;
  const draw=(s,x,yy,filled=false)=>{p.rect(x,yy-ch,cw,ch,filled?'mint':'white','line');k.split(s,cw-20,10,true).slice(0,3).forEach((line,j)=>p.text(line,x+10,yy-19-j*13,10,true,filled?'white':'mint'));};
  names.slice(0,3).forEach((s,i)=>draw(s,k.M+i*(cw+gap),y));
  draw(center?(norm(center.firstChild?.textContent)+' · '+val(center.querySelector('small'))):'Ihr Hotel · mehr Gäste = mehr Wirkung',k.M+cw+gap,y-ch-11,true);
  names.slice(3,6).forEach((s,i)=>draw(s,k.M+i*(cw+gap),y-2*(ch+11)));
  p.current.y=y-h-14;
 };
 async function awaitNode(n){if(!n||n.nodeType!==1||isHidden(n))return;const tag=n.tagName.toLowerCase(),cls=n.classList;
 if(n.id==='bb-impulsmarketing'){impuls(n);return;}
 if(n.matches('.field,.bbScenarioField')){field(n);return;}
 if(n.matches('.summary,.bbScenarioResult')){metrics(n);return;}
 if(n.matches('.bbMediaFigure,figure.stepImg')){const im=n.querySelector('img'),caption=val(n.querySelector('figcaption'));if(im){try{const image=await readImage(im),h=Math.min(310,k.W*image.height/image.width),cap=caption?k.split(caption,k.W-6,10,true).length*14+8:0;p.ensure(h+19+cap+10);if(caption)blockText(caption,true,10);addImage(p,k,image);}catch(e){missed.push(im.alt||'Abbildung');if(caption)blockText(caption,true,10);blockText('Abbildung: '+(im.alt||'Bild aus der Gesprächsseite')+' (konnte technisch nicht eingebettet werden).',false,8,'muted');}}else if(caption)blockText(caption,true,10);return;}
 if(n.matches('input,select,button,script,style,.top,.actions'))return;
 if(n.matches('h3,h4,h5')){p.ensure(n.nextElementSibling?.matches('.bbMonths')?165:88);blockText(val(n),true,12,'navy');return;}
 if(n.matches('p,li,figcaption,small')){blockText((tag==='li'?'• ':'')+val(n),false,9.3);return;}
 if(n.matches('table')){table(n);return;}
 if(n.matches('.bbMonths')){months(n);return;}
 if(n.matches('.planBar')){for(const b of n.querySelectorAll('[data-plan]'))cards([{title:val(b.querySelector('b'))+(b.classList.contains('active')?' · ausgewählt':''),body:val(b.querySelector('strong'))+' pro Monat'}]);return;}
 if(n.matches('.metric,.compareSide,.bbScenarioResult > div')){const l=val(n.querySelector('span,h3')),v=val(n.querySelector('strong,.bigNumber'));if(l&&v){p.metrics([{label:l,value:v,theme:cls.contains('mag')?'mag':cls.contains('mint')?'mint':'white'}]);const extra=val(n.querySelector('p,small'));if(extra)blockText(extra);}else blockText(val(n));return;}
 if(n.matches('.bbNotice,.note,.bbScenarioNote')){p.callout({text:val(n),theme:cls.contains('mag')?'mag':'mint'});return;}
 if(n.matches('.bbMini,.bbDetail,.service,.package,.flow,.bbOffer,.bbNode,.bbHub,.time,.costBox,.bbSum')){if(n.matches('.bbDetail--wide')&&n.querySelector('table')){blockText(val(n.querySelector('strong')),true,10);table(n.querySelector('table'));return;}cards([simpleCard(n)]);return;}
 if(n.matches('#bb-region > .body')){region(n);const note=n.querySelector(':scope > .bbNotice');if(note)await awaitNode(note);return;}
 if(n.matches('.bbTriplet,.bbOfferGrid,.grid3')){const items=[...n.children].map(simpleCard);cards(items,'grid3');return;}
 if(n.matches('.bbRegion')){region(n);return;}
 if(n.matches('.bbRegionCenter,.bbRegionLine'))return;
 if(n.matches('.bbScenarioForm')){cards([...n.children].map(fieldNode=>{const inp=fieldNode.querySelector('input'),label=val(fieldNode.childNodes[0]);return{title:label||inp?.id,body:inp?formatted(inp):''}}),'dual');return;}
 if(n.matches('.bbDetailsGrid')){const arr=[...n.children];for(let i=0;i<arr.length;){if(arr[i].matches('.bbDetail--wide')){await awaitNode(arr[i]);i++;continue;}const group=[arr[i]];if(arr[i+1]&&!arr[i+1].matches('.bbDetail--wide'))group.push(arr[i+1]);cards(group.map(simpleCard),'dual');i+=group.length;}return;}
 if(n.matches('.bbExtra')&&n.id==='bb-medien')p.ensure(400);
 if(n.matches('.bbScenarioForm,.calc,.bbNetwork,.packageGrid,.systemFlow,.steps,.timeline,.costVs,.bbSums,.compareStrip,.calcGrid,.planBar,.bbOpt,.body,.bbExtras,.bbExtra,.bbFullserviceDetails,.regionGrid')){for(const child of n.children)await awaitNode(child);return;}
 if(n.matches('.bbScenarioHeading')){blockText(val(n),true,11);return;}
 if(n.matches('.matrix')){table(n);return;}
 if(n.querySelector('input')&&n.children.length===1){for(const child of n.children)await awaitNode(child);return;}
 if(n.children.length){for(const child of n.children)await awaitNode(child);return;}
 if(val(n))blockText(val(n));
 }
 const hero=d.querySelector('.hero');p.hero({eyebrow:val(hero.querySelector('.eyebrow')),hero:val(hero.querySelector('h1')),lead:val(hero.querySelector('.lead')),chips:[...hero.querySelectorAll('.heroLine span')].map(val)});
 const sections=[...d.querySelectorAll('.wrap > section.card.section')];if(sections.length<8)throw Error('Nicht alle BusinessBooster-Abschnitte sind vorhanden.');
 for(let i=0;i<sections.length;i++){const s=sections[i],h=s.querySelector(':scope > .head'),b=s.querySelector(':scope > .body');if(!h||!b)throw Error('Business-Abschnitt unvollständig: '+(i+1));p.ensure(s.id==='bb-region'||s.querySelector('.stepImg')?470:230);/* Überschrift und nächster Abschnitt bleiben zusammen. */
 p.section({idx:i,kicker:val(h.querySelector('.kicker')),heading:val(h.querySelector('h2')),lead:val(h.querySelector('p'))});
 for(const child of b.children)await awaitNode(child);progress?.(i+1,sections.length);if(i%2===1)await new Promise(r=>setTimeout(r,0));}
 p.footer({foot:val(d.querySelector('.foot'))+' · Rechenbeispiele sind keine Erfolgsgarantie.'});
 const bytes=finishWithImages(p,k),dt=new Date(),date=[dt.getFullYear(),String(dt.getMonth()+1).padStart(2,'0'),String(dt.getDate()).padStart(2,'0')].join('-');
 return{blob:new Blob([bytes],{type:'application/pdf'}),pages:p.pages.length,filename:`BusinessBooster_${filePart(name)}_Gespraech_${date}.pdf`,missingImages:missed};
}
window.BusinessBoosterAkademiePdf=Object.freeze({version:'BUSINESS_AKADEMIE_PDF_DOM_V2',generate,validDoc});
})();