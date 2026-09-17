/* Gezielt nur Hotel-PDF-Test: Originalgenerator zur Laufzeit lokal laden und bekannte Fehler beheben. */
(()=>{'use strict';
const initial=window.HotelPdfEigen;
let resolve,reject;
const ready=new Promise((a,b)=>{resolve=a;reject=b});
window.HotelPdfEigen=Object.freeze({version:'HOTEL_PDF_FIX_V2',generate:async(...args)=>(await ready).generate(...args)});
function fix(source){
 let s=source,count=0;
 const change=(from,to,name)=>{const at=s.indexOf(from);if(at<0||s.indexOf(from,at+1)>=0)throw Error('Korrektur '+name+' passt nicht zur Original-PDF-Engine.');s=s.slice(0,at)+to+s.slice(at+from.length);count++};
 // Überschrift plus zugehörigen ersten Inhalt gemeinsam umbrechen; regionale Vierergruppe nicht trennen.
 change('this.ensure(Math.min(height+65,PH-TOP-BOT));','this.ensure(Math.min(height+(s.idx===1?240:s.idx===5?335:s.idx===7?610:100),PH-TOP-BOT));','Kapitel');
 change('if(estimated<=PH-TOP-BOT&&this.current.y-estimated<BOT)this.page();','if(this.current.y<PH-TOP-155&&this.current.y-estimated<BOT)this.page();','Rechner');
 change('for(let i=0;i<cards.length;i+=cols)this.cardRow(cards.slice(i,i+cols),Math.min(cols,cards.length-i),b.kind);',
 `if(/regionGrid/.test(b.kind)&&cards.length===4){const w=(W-10)/2;const h=Math.max(cardH(cards[0],w,b.kind),cardH(cards[1],w,b.kind))+Math.max(cardH(cards[2],w,b.kind),cardH(cards[3],w,b.kind))+24+85;this.ensure(h);}
 if(/grid2/.test(b.kind)&&cards.some(c=>/Beispiel aus Sicht/.test(c.title))){const w=(W-10)/2;const h=Math.max(...cards.map(c=>cardH(c,w,b.kind)))+12+80;this.ensure(h);}
 for(let i=0;i<cards.length;i+=cols)this.cardRow(cards.slice(i,i+cols),Math.min(cols,cards.length-i),b.kind);`, 'Kartengruppen');
 // Nur Darstellung von Eingaben: Rechnungslogik aus HTML wird nicht verändert.
 change("value:x.querySelector('input')?.value||''",`value:(()=>{const field=x.querySelector('input'),v=(field?.value||'').trim();if(!v)return '—';if(field.id==='hotelName')return v;const n=Number(v.includes(',')?v.replace(/\\./g,'').replace(',','.'):v);if(!Number.isFinite(n))return v;const percent=/Pct$/.test(field.id);return new Intl.NumberFormat('de-DE',{minimumFractionDigits:percent?0:2,maximumFractionDigits:2}).format(n)+(percent?' %':' €');})()`, 'Eingaben');
 change("cells:[...tr.cells].map(c=>c.querySelector('input')?.value??txt(c))",`cells:[...tr.cells].map(c=>{const field=c.querySelector('input');if(!field)return txt(c);const v=(field.value||'').trim(),n=Number(v.includes(',')?v.replace(/\\./g,'').replace(',','.'):v);return v&&Number.isFinite(n)?new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' €':v;})`,'Tabelle');
 // Original-HTML-Links als echte PDF-Linkannotation übernehmen.
 change("const p=children(d,'.detailsBody p').map(txt);","const p=children(d,'.detailsBody p').filter(x=>!x.querySelector('a[href]')).map(txt);",'Linktexte');
 change("sec.blocks.push({type:'paragraphs',texts:p.filter(Boolean)});}",`sec.blocks.push({type:'paragraphs',texts:p.filter(Boolean)});const anchors=children(d,'.detailsBody a[href]').map(a=>({label:txt(a),url:new URL(a.getAttribute('href'),doc.baseURI).href}));if(anchors.length)sec.blocks.push({type:'links',items:anchors});}`,'Linkdaten');
 change('const p={stream:[],y:PH-TOP};','const p={stream:[],annots:[],y:PH-TOP};','PDF-Linkspeicher');
 change('PDF.prototype.footer=function(d){',`PDF.prototype.links=function(items){for(const link of items){if(!link.label||!String(link.url).startsWith('http'))continue;this.ensure(26);const y=this.current.y;this.text(link.label,M+4,y-11,9.3,true,'mint');const w=Math.min(W-8,measure(link.label,9.3,true)+22);this.current.annots.push({url:link.url,rect:[M+2,y-18,M+w,y+3]});this.current.y-=25;}};PDF.prototype.footer=function(d){`,'Linkanzeige');
 change("else if(b.type==='paragraphs')p.paragraphs(b);else if(b.type==='calculator')","else if(b.type==='paragraphs')p.paragraphs(b);else if(b.type==='links')p.links(b.items);else if(b.type==='calculator')",'Linkausgabe');
 change("for(let i=0;i<n;i++){const stream=enc(this.pages[i].stream.join(''));",`const annotsIds=this.pages.map(p=>(p.annots||[]).map(link=>{const aid=id++;const uri=[...te.encode(link.url)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase(),rect=link.rect.map(v=>v.toFixed(2)).join(' ');obj.set(aid,enc('<< /Type /Annot /Subtype /Link /Rect ['+rect+'] /Border [0 0 0] /A << /S /URI /URI <'+uri+'> >> >>'));return aid;}));for(let i=0;i<n;i++){const stream=enc(this.pages[i].stream.join(''));`,'PDF-Linkobjekte');
 change(' /Contents ${cids[i]} 0 R >>`)',' /Contents ${cids[i]} 0 R ${annotsIds[i].length?\'/Annots [\'+annotsIds[i].map(v=>v+\' 0 R\').join(\' \')+\']\':\'\'} >>`)','Seitenannotation');
 if(count!==12)throw Error('Korrekturen unvollständig');return s;
}
(async()=>{try{const response=await fetch('./hotel-pdf-eigen.js?v=1',{cache:'no-store'});if(!response.ok)throw Error('Original-PDF-Generator fehlt.');const s=fix(await response.text());const script=document.createElement('script');script.textContent=s;document.head.appendChild(script);script.remove();const active=window.HotelPdfEigen;if(active?.version!=='HOTEL_PDF_EIGEN_V1'||active===initial)throw Error('Hotel-PDF-Korrekturen konnten nicht geladen werden.');resolve(active);}catch(e){reject(e);console.error('[Hotel-PDF]',e);}})();
})();
