/* BusinessBooster: live DOM -> A4 blocks with unchanged Hotel PDF drawing core.
   The Akademie PDF-Zentrale handles the finished blob without regenerating. */
(()=>{'use strict';
let corePromise;
const norm=s=>String(s??'').replace(/\s+/g,' ').trim();
const val=n=>norm(n?.textContent);
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
function formatted(input){const raw=norm(input?.value);if(!raw)return 'Keine Eingabe';const number=Number(raw.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(number))return raw;const id=input.id||'',pct=/Pct|Conversion|shift|percent/i.test(id),money=/Revenue|Booking|Value|Amount/i.test(id);return new Intl.NumberFormat('de-DE',{minimumFractionDigits:money?2:0,maximumFractionDigits:2}).format(number)+(pct?' %':money?' €':'')}
function profile(d){const hotel=d.defaultView?.parent?.LBHotelStorage?.getSection('hotel')||{};return norm(hotel.name)||norm(d.querySelector('#hotelName')?.value)||'Hotel';}
function isHidden(e){return e.hidden||e.getAttribute('aria-hidden')==='true'||e.style.display==='none'||e.closest('#bbStandalonePdfPanel')!==null||e.closest('.actions')!==null;}
async function readImage(img){const src=img.currentSrc||img.src;if(!src)throw Error('Bildquelle fehlt');const res=await fetch(src,{mode:'cors'});if(!res.ok)throw Error('Bild kann nicht abgerufen werden');const blob=await res.blob();const u=URL.createObjectURL(blob);try{const el=new Image();el.src=u;await (el.decode?el.decode():new Promise((a,b)=>{el.onload=a;el.onerror=b}));const max=1250,k=Math.min(1,max/Math.max(el.naturalWidth,el.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(el.naturalWidth*k));canvas.height=Math.max(1,Math.round(el.naturalHeight*k));canvas.getContext('2d').drawImage(el,0,0,canvas.width,canvas.height);const jpg=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('JPEG-Konvertierung fehlgeschlagen')),'image/jpeg',.83));return{data:new Uint8Array(await jpg.arrayBuffer()),width:canvas.width,height:canvas.height};}finally{URL.revokeObjectURL(u)}}
function addImage(p,k,img){const w=k.W,h=Math.min(310,w*img.height/img.width);p.ensure(h+19);const y=p.current.y-h;p.current.stream.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${k.M.toFixed(2)} ${y.toFixed(2)} cm /Im${p._imgs.length+1} Do Q\n`);p._imgs.push({page:p.current,key:'Im'+(p._imgs.length+1),...img});p.current.y=y-19;}
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
 const blockText=(s,b=false,z=9.5,c='ink')=>{if(!norm(s))return;p.ensure(Math.min(57,k.PH-k.TOP-k.BOT));p.lines(s,k.M+3,k.W-6,z,b,c,z*1.4,8)};
 const cards=items=>{for(const item of items){const title=norm(item.title),body=norm(item.body);if(!title&&!body)continue;const paragraphs=[];if(body)for(let i=0;i<body.length;i+=560)paragraphs.push(body.slice(i,i+560));p.cards({kind:'grid2',cards:[{title,paragraphs,notes:[],theme:item.theme||'mint'}]});}};
 const field=e=>{const label=e.querySelector('label')||e.closest('label');const input=e.querySelector('input,select')|| (e.matches('label')?e.querySelector('input,select'):null);if(!input)return;let labelText=norm(label?.childNodes[0]?.textContent)||norm(label?.textContent).replace(norm(input.value),'');const selected=input.tagName==='SELECT'?input.selectedOptions[0]?.textContent:formatted(input);cards([{title:labelText||input.id,body:selected}]);};
 const metrics=root=>{const out=[...root.children].map(e=>({label:val(e.querySelector('span'))||val(e.querySelector('small'))||val(e.querySelector('h3')),value:val(e.querySelector('strong'))||val(e.querySelector('.bigNumber'))||val(e.querySelector('b')),theme:e.classList.contains('mag')?'mag':e.classList.contains('mint')?'mint':'white'})).filter(x=>x.label&&x.value);if(out.length)p.metrics(out);};
 async function awaitNode(n){if(!n||n.nodeType!==1||isHidden(n))return;const tag=n.tagName.toLowerCase(),cls=n.classList;
 if(n.matches('.field,.bbScenarioField')){field(n);return;}
 if(n.matches('.summary,.bbScenarioResult')){metrics(n);return;}
 if(n.matches('.bbMediaFigure,figure.stepImg')){const im=n.querySelector('img'),caption=val(n.querySelector('figcaption'));if(caption)blockText(caption,true,10);if(im){try{addImage(p,k,await readImage(im));}catch(e){missed.push(im.alt||'Abbildung');blockText('Abbildung: '+(im.alt||'Bild aus der Gesprächsseite')+' (konnte technisch nicht eingebettet werden).',false,8,'muted');}}return;}
 if(n.matches('input,select,button,script,style,.top,.actions'))return;
 if(n.matches('h3,h4,h5')){p.ensure(47);blockText(val(n),true,12,'navy');return;}
 if(n.matches('p,li,figcaption,small')){blockText((tag==='li'?'• ':'')+val(n),false,9.3);return;}
 if(n.matches('table')){const rows=[...n.querySelectorAll('tr')];for(const row of rows){const cells=[...row.querySelectorAll('th,td')].map(val);if(cells.length)blockText(cells.join('   ·   '),row.querySelector('th')!==null,8.8);}return;}
 if(n.matches('.bbMonths')){cards([...n.children].map(e=>({title:val(e)})));return;}
 if(n.matches('.planBar')){for(const b of n.querySelectorAll('[data-plan]'))cards([{title:val(b.querySelector('b'))+(b.classList.contains('active')?' · ausgewählt':''),body:val(b.querySelector('strong'))+' pro Monat'}]);return;}
 if(n.matches('.metric,.compareSide,.bbScenarioResult > div')){const l=val(n.querySelector('span,h3')),v=val(n.querySelector('strong,.bigNumber'));if(l&&v){p.metrics([{label:l,value:v,theme:cls.contains('mag')?'mag':cls.contains('mint')?'mint':'white'}]);const extra=val(n.querySelector('p,small'));if(extra)blockText(extra);}else blockText(val(n));return;}
 if(n.matches('.bbNotice,.note,.bbScenarioNote')){p.callout({text:val(n),theme:cls.contains('mag')?'mag':'mint'});return;}
 if(n.matches('.bbMini,.bbDetail,.service,.package,.flow,.bbOffer,.bbNode,.bbHub,.time,.costBox,.bbSum')){const heading=val(n.querySelector('h3,h4,strong,b'))||val(n.querySelector('.n'));const copy=norm(val(n).replace(heading,''));cards([{title:heading,body:copy,theme:cls.contains('mag')?'mag':'mint'}]);return;}
 if(n.matches('.bbScenarioForm,.calc,.bbDetailsGrid,.bbTriplet,.bbOfferGrid,.bbNetwork,.grid3,.packageGrid,.systemFlow,.steps,.timeline,.costVs,.bbRegion,.bbSums,.compareStrip,.calcGrid,.planBar,.bbOpt,.body,.bbExtras,.bbExtra,.bbFullserviceDetails,.bbRegionCenter,.regionGrid')){for(const child of n.children)await awaitNode(child);return;}
 if(n.matches('.bbScenarioHeading')){blockText(val(n),true,11);return;}
 if(n.matches('.matrix')){for(const row of n.querySelectorAll('tr'))blockText([...row.cells].map(val).join(' · '),false,9);return;}
 if(n.querySelector('input')&&n.children.length===1){for(const child of n.children)await awaitNode(child);return;}
 if(n.children.length){for(const child of n.children)await awaitNode(child);return;}
 if(val(n))blockText(val(n));
 }
 const hero=d.querySelector('.hero');p.hero({eyebrow:val(hero.querySelector('.eyebrow')),hero:val(hero.querySelector('h1')),lead:val(hero.querySelector('.lead')),chips:[...hero.querySelectorAll('.heroLine span')].map(val)});
 const sections=[...d.querySelectorAll('.wrap > section.card.section')];if(sections.length<8)throw Error('Nicht alle BusinessBooster-Abschnitte sind vorhanden.');
 for(let i=0;i<sections.length;i++){const s=sections[i],h=s.querySelector(':scope > .head'),b=s.querySelector(':scope > .body');if(!h||!b)throw Error('Business-Abschnitt unvollständig: '+(i+1));if(i===0&&p.current.y<k.PH-k.TOP-200)p.page();p.section({idx:i,kicker:val(h.querySelector('.kicker')),heading:val(h.querySelector('h2')),lead:val(h.querySelector('p'))});for(const child of b.children)await awaitNode(child);progress?.(i+1,sections.length);if(i%2===1)await new Promise(r=>setTimeout(r,0));}
 p.footer({foot:val(d.querySelector('.foot'))+' · Rechenbeispiele sind keine Erfolgsgarantie.'});const bytes=finishWithImages(p,k),dt=new Date(),date=[dt.getFullYear(),String(dt.getMonth()+1).padStart(2,'0'),String(dt.getDate()).padStart(2,'0')].join('-');return{blob:new Blob([bytes],{type:'application/pdf'}),pages:p.pages.length,filename:`BusinessBooster_${filePart(name)}_Gespraech_${date}.pdf`,missingImages:missed};
}
window.BusinessBoosterAkademiePdf=Object.freeze({version:'BUSINESS_AKADEMIE_PDF_DOM_V1',generate,validDoc});
})();