/* Direktmix PDF rendering only. Existing content, calculator and approved Hotel drawing core remain unchanged. */
(()=>{'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const text=e=>clean(e?.textContent).replace(/[✓✔]/g,'Ja');
const IDS=['totalRevenue','bookNow','otaNow','directNow','otherNow','bookTarget','otaTarget','directTarget','otherTarget','bookCost','otaCost','directCost','otherCost','guestAccesses','partnerRate','e2Rate','e2Avg','e3Rate','e3Avg','offerValue','benefitPct','marketBookings','directCostPct'];
const good=d=>!!(d?.querySelector('.hero h1')&&d.querySelector('#totalRevenue')&&d.querySelector('#leverTotal')&&d.querySelectorAll('.wrap > section.card.section').length===6&&!d.querySelector('#totalPdfAnchor'));
let corePromise;
async function core(){if(corePromise)return corePromise;corePromise=(async()=>{
 const res=await fetch('./hotel-pdf-eigen.js?v=1',{cache:'no-store'});if(!res.ok)throw Error('Der freigegebene Hotel-PDF-Zeichenkern ist nicht erreichbar.');
 const original=await res.text(),mark="window.HotelPdfEigen=Object.freeze({version:'HOTEL_PDF_EIGEN_V1',generate,capture});";
 if(original.split(mark).length!==2)throw Error('Der freigegebene Hotel-PDF-Zeichenkern wurde verändert.');
 const js=original.replace(mark,'window.LBDirectMixPdfCore=Object.freeze({PDF,split,measure,enc,join,rgb,hx,PW,PH,M,W,BOT,TOP});');
 const node=document.createElement('script');node.textContent=js;document.head.appendChild(node);node.remove();
 if(!window.LBDirectMixPdfCore?.PDF)throw Error('Hotel-PDF-Zeichenkern konnte nicht initialisiert werden.');
 return window.LBDirectMixPdfCore;
 })();return corePromise;}
function displayInput(input){if(!input)return '';const s=clean(input.value),number=Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s);if(!s||!Number.isFinite(number))return s;const id=input.id;const money=['totalRevenue','offerValue'].includes(id),count=['guestAccesses','marketBookings'].includes(id),percent=/^(bookNow|otaNow|directNow|otherNow|bookTarget|otaTarget|directTarget|otherTarget|bookCost|otaCost|directCost|otherCost|partnerRate|e2Rate|e3Rate|benefitPct|directCostPct)$/.test(id);return new Intl.NumberFormat('de-DE',{minimumFractionDigits:money?2:0,maximumFractionDigits:count?0:2}).format(number)+(money?' €':percent?' %':'');}
function validate(d){if(!good(d))throw Error('Die Direktmix-Lernseite ist nicht vollständig geladen.');for(const id of IDS){const input=d.getElementById(id),raw=clean(input?.value);if(!raw||!Number.isFinite(Number(raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw))||Number(raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw)<0)throw Error('Bitte das Rechnerfeld prüfen: '+id);}
 for(const suffix of ['Now','Target']){const total=['book','ota','direct','other'].reduce((sum,prefix)=>sum+Number(d.getElementById(prefix+suffix).value.replace(',','.')),0);if(Math.abs(total-100)>.001)throw Error('Die Anteile für '+(suffix==='Now'?'heute':'das Ziel')+' müssen zusammen 100 % ergeben.');}
 for(const id of ['costNow','costTarget','logicTotal','marketContribution','leverTotal'])if(!clean(d.getElementById(id)?.textContent)||d.getElementById(id).textContent.includes('—'))throw Error('Ein Rechnerergebnis fehlt: '+id);
}
function pdfBytes(p,k){const count=p.pages.length,obj=new Map(),pages=[],streams=[];let id=5;
 for(let i=0;i<count;i++){const page=p.pages[i];p.current=page;p.line(k.M,39,k.W,'line');p.text('LiquidityBooster · Hotel & Direktmix',k.M,26,7,false,'muted');p.text(`Seite ${i+1} von ${count}`,k.PW-k.M-93,26,7,false,'muted');pages.push(id++);streams.push(id++);}
 obj.set(1,k.enc('<< /Type /Catalog /Pages 2 0 R >>'));obj.set(2,k.enc(`<< /Type /Pages /Count ${count} /Kids [${pages.map(id=>id+' 0 R').join(' ')}] >>`));obj.set(3,k.enc('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));obj.set(4,k.enc('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
 for(let i=0;i<count;i++){const bytes=k.enc(p.pages[i].stream.join(''));obj.set(pages[i],k.enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${k.PW} ${k.PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streams[i]} 0 R >>`));obj.set(streams[i],k.join([k.enc(`<< /Length ${bytes.length} >>\nstream\n`),bytes,k.enc('\nendstream')]));}
 const header=k.enc('%PDF-1.4\n%DIREKTMIX\n'),arr=[header],offset=[0];let cursor=header.length;for(let i=1;i<id;i++){offset[i]=cursor;const parts=[k.enc(`${i} 0 obj\n`),obj.get(i),k.enc('\nendobj\n')];arr.push(...parts);cursor+=parts.reduce((s,a)=>s+a.length,0);}const start=cursor;let index=`xref\n0 ${id}\n0000000000 65535 f \n`;for(let i=1;i<id;i++)index+=String(offset[i]).padStart(10,'0')+' 00000 n \n';index+=`trailer\n<< /Size ${id} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;arr.push(k.enc(index));return k.join(arr);
}
async function generate(d,progress){validate(d);const k=await core();const name=clean(d.defaultView?.parent?.LBHotelStorage?.getSection('hotel')?.name)||'Hotel';const p=new k.PDF({brand:'LiquidityBooster',brandLine:'Hotel · Direktmix',name});
 const lines=(s,size=9.3,bold=false,color='ink',after=9)=>{if(clean(s))p.lines(s,k.M+3,k.W-6,size,bold,color,size*1.38,after);};
 const group=(list,kind='dual')=>{if(list.length)p.cards({kind,cards:list});};
 const metricCards=nodes=>p.metrics(nodes.map(el=>({label:text(el.querySelector('span')),value:text(el.querySelector('strong')),theme:el.classList.contains('mag')?'mag':el.classList.contains('mint')?'mint':'white'})));
 const note=el=>{if(el)p.callout({text:text(el),theme:el.classList.contains('mag')?'mag':'mint'});};
 // Compact field cards retain every source label/value/note while reducing empty space.
 const inputCards=fields=>{for(let i=0;i<fields.length;i+=2){const row=fields.slice(i,i+2);const gap=10,w=(k.W-(row.length===2?gap:0))/row.length;
   const data=row.map(el=>({label:text(el.querySelector('label')),value:displayInput(el.querySelector('input')),note:text(el.querySelector('small'))}));
   const heights=data.map(it=>13+k.split(it.label,w-24,8.4,true).length*11+4+k.split(it.value,w-24,12.5,true).length*16+(it.note?5+k.split(it.note,w-24,7.7).length*10:0)+11);
   const h=Math.max(...heights);p.ensure(h+9);const y=p.current.y;
   data.forEach((it,j)=>{const x=k.M+j*(w+gap);p.rect(x,y-h,w,h,'white','line');p.rect(x,y-h,3,h,'mint');let yy=y-15;
     for(const l of k.split(it.label,w-24,8.4,true)){p.text(l,x+12,yy,8.4,true,'navy');yy-=11;}yy-=4;
     for(const l of k.split(it.value,w-24,12.5,true)){p.text(l,x+12,yy,12.5,true,'navy');yy-=16;}
     if(it.note){yy-=4;for(const l of k.split(it.note,w-24,7.7)){p.text(l,x+12,yy,7.7,false,'muted');yy-=10;}}
     if(yy<y-h-2)throw Error('Direktmix-Rechnerfeld überläuft: '+it.label);
   });p.current.y=y-h-9;}};
 // Site tables use separate labels and values (not concatenated DOM text).
 const dataCards=(rows)=>{const cards=rows.map(el=>({label:text(el.querySelector('span')),value:text(el.querySelector('strong'))}));for(let i=0;i<cards.length;i+=2){const pair=cards.slice(i,i+2),gap=10,w=(k.W-gap)/2;
   const h=Math.max(...pair.map(it=>18+k.split(it.label,w-24,8.5,true).length*11+k.split(it.value,w-24,12.5,true).length*16+8));p.ensure(h+9);const y=p.current.y;
   pair.forEach((it,j)=>{const x=k.M+j*(w+gap);p.rect(x,y-h,w,h,'white','line');p.rect(x,y-h,3,h,'mint');let yy=y-15;for(const l of k.split(it.label,w-24,8.5,true)){p.text(l,x+12,yy,8.5,true,'navy');yy-=11;}yy-=5;for(const l of k.split(it.value,w-24,12.5,true)){p.text(l,x+12,yy,12.5,true,'navy');yy-=16;}if(yy<y-h-2)throw Error('Direktmix-Wertekarte überläuft.');});p.current.y=y-h-9;
 }};
 // Keep label, result and explanation in distinct text positions.
 const summary=el=>{if(!el)return;const label=text(el.querySelector('span')),value=text(el.querySelector('.big')),explanation=text(el.querySelector('small'));const lab=k.split(label,k.W-36,9.2,true),val=k.split(value,k.W-36,16,true),desc=k.split(explanation,k.W-36,8.5),h=15+lab.length*12+5+val.length*20+7+desc.length*11+12;
   p.ensure(h+11);const y=p.current.y;p.rect(k.M,y-h,k.W,h,'pale','line');p.rect(k.M,y-h,4,h,'mint');let yy=y-18;
   for(const l of lab){p.text(l,k.M+14,yy,9.2,true,'navy');yy-=12;}yy-=5;
   for(const l of val){p.text(l,k.M+14,yy,16,true,'navy');yy-=20;}yy-=7;
   for(const l of desc){p.text(l,k.M+14,yy,8.5,false,'ink');yy-=11;}if(yy<y-h-2)throw Error('Direktmix-Zusammenfassung überläuft.');p.current.y=y-h-11;
 };
 const sections=[...d.querySelectorAll('.wrap > section.card.section')];const hero=d.querySelector('.hero');p.section({kicker:text(hero.querySelector('.eyebrow')),heading:text(hero.querySelector('h1')),lead:text(hero.querySelector('.lead'))});
 // Four website chips: concise two-row display instead of four oversized empty cards.
 const chips=[...hero.querySelectorAll('.heroLine span')].map(text);for(let i=0;i<chips.length;i+=2){const pair=chips.slice(i,i+2),w=(k.W-10)/2,h=26;p.ensure(h+7);const y=p.current.y;pair.forEach((label,j)=>{const x=k.M+j*(w+10);p.rect(x,y-h,w,h,'white','line');p.rect(x,y-h,3,h,'mint');p.text(label,x+11,y-17,8.3,true,'navy');});p.current.y=y-h-7;}
 for(let i=0;i<sections.length;i++){const sec=sections[i],head=sec.querySelector(':scope > .head'),body=sec.querySelector(':scope > .body');if(!head||!body)throw Error('Direktmix-Abschnitt '+(i+1)+' unvollständig.');
 // These two calculations must not be split between input and output pages.
 if((i===3||i===4||i===5)&&p.current.y<k.PH-k.TOP-1)p.page();
 p.ensure(i===0?345:i===3?480:i===4?510:250);p.section({kicker:text(head.querySelector('.kicker')),heading:text(head.querySelector('h2')),lead:text(head.querySelector('p'))});
 if(i===0){const field=body.querySelector('#totalRevenue')?.closest('.field');if(field)inputCards([field]);
  const table=body.querySelector('.mixTable');if(!table)throw Error('Vertriebsmix-Tabelle fehlt.');const heads=[...table.querySelectorAll(':scope > .th')].map(text),rows=[...table.querySelectorAll(':scope > .mixRow')];const widths=[k.W*.32,k.W*.22,k.W*.22,k.W*.24],xx=[k.M,k.M+widths[0],k.M+widths[0]+widths[1],k.M+widths[0]+widths[1]+widths[2]];
  const h=26;p.ensure(h+rows.length*34+20);let y=p.current.y;p.rect(k.M,y-h,k.W,h,'navy');heads.forEach((v,j)=>p.text(v,xx[j]+7,y-17,7.5,true,'white'));y-=h;for(const row of rows){p.rect(k.M,y-34,k.W,34,'white','line');p.text(text(row.querySelector('.mixName')),xx[0]+7,y-21,8.6,true,'navy');[...row.querySelectorAll('input')].forEach((inp,j)=>p.text(displayInput(inp),xx[j+1]+7,y-21,9.2,true,'ink'));y-=34;}p.current.y=y-13;
  const mix=body.querySelector('#mixSum');const labels=[['Summe heute:',text(mix.querySelector('#sumNow'))],['Summe Ziel:',text(mix.querySelector('#sumTarget'))]];p.ensure(44);y=p.current.y;const sw=(k.W-10)/2;labels.forEach((item,j)=>{const x=k.M+j*(sw+10);p.rect(x,y-35,sw,35,'pale','line');p.text(item[0],x+10,y-21,8.7,true,'navy');p.text(item[1],x+130,y-21,9.5,true,'mint');});p.current.y=y-44;
  p.ensure(190);metricCards([...body.querySelectorAll('.metrics > .metric')]);note(body.querySelector('.note'));
 }else if(i===1){group([...body.querySelectorAll('.process > .phase')].map(el=>({title:text(el.querySelector('b')),paragraphs:[text(el.querySelector('p'))],notes:[],theme:el===body.querySelector('.phase:nth-child(2)')?'mag':'mint'})),'grid3');note(body.querySelector('.note'));
 }else if(i===2){group([...body.querySelectorAll('.funnel > .fstep')].map(el=>({title:text(el.querySelector('.n'))+' · '+text(el.querySelector('b')),paragraphs:[text(el.querySelector('p'))],notes:[],theme:'mint'})),'dual');
 }else if(i===3){const fields=[...body.querySelectorAll('.calc .field')];inputCards(fields);lines(text(body.querySelector('.calc > small')),8.5,false,'muted',12);group([...body.querySelectorAll('.levels > .level')].map(el=>({title:text(el.querySelector('span')),value:text(el.querySelector('b')),paragraphs:[text(el.querySelector('strong'))],notes:[],theme:'mint'})),'grid3');summary(body.querySelector('.totalBox'));
 }else if(i===4){lines(text(body.querySelector('.example > h3')),12,true,'navy',5);dataCards([...body.querySelectorAll('.example > .calcLine')]);note(body.querySelector('.example .note'));inputCards([...body.querySelectorAll('.calc > .field')]);dataCards([...body.querySelectorAll('.calc > .calcLine')]);
 }else if(i===5){group([...body.querySelectorAll('.leverGrid > .lever')].map(el=>({title:text(el.querySelector('b')),value:text(el.querySelector('strong')),paragraphs:[text(el.querySelector('p'))],notes:[],theme:'mint'})),'grid3');summary(body.querySelector('.totalBox'));note(body.querySelector('.note'));
 }
 progress?.(i+1,sections.length);if(i%2===1)await new Promise(resolve=>setTimeout(resolve,0));}
 // Avoid the formerly empty final page: only the existing legal footer is appended.
 p.footer({foot:text(d.querySelector('.foot'))});const bytes=pdfBytes(p,k),date=new Date(),stamp=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');const safe=name.replace(/ß/g,'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,55)||'Hotel';return{blob:new Blob([bytes],{type:'application/pdf'}),pages:p.pages.length,filename:`Direktmix_${safe}_Gespraech_${stamp}.pdf`};}
window.DirektmixAkademiePdf=Object.freeze({version:'DIREKTMIX_AKADEMIE_PDF_V2_LAYOUT_ONLY',generate,validDoc:good});
})();