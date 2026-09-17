/* Hotel-PDF: gezielte Korrekturen für den bestehenden Testgenerator.
   Keine Änderung an hotel.html, an Rechenregeln oder am V6-Broschürengenerator. */
(()=>{'use strict';
  const base='./hotel-pdf-eigen.js?v=1';
  function replaceOnce(source, oldText, replacement, name){
    const pos=source.indexOf(oldText);
    if(pos<0 || source.indexOf(oldText,pos+oldText.length)>=0)
      throw Error('PDF-Korrektur '+name+' passt nicht zum Original. Ausgabe aus Sicherheitsgründen angehalten.');
    return source.slice(0,pos)+replacement+source.slice(pos+oldText.length);
  }
  function fix(source){
    let s=source;
    // A4-Abschnitte starten nur, wenn genug Platz für zugehörigen Inhalt ist.
    s=replaceOnce(s,
      'this.ensure(Math.min(height+65,PH-TOP-BOT));',
      'const reserve=s.idx===1?238:s.idx===6?330:s.idx===7?610:65;this.ensure(Math.min(height+reserve,PH-TOP-BOT));',
      'Kapitelüberschriften');
    // Der Großrechner beginnt nach seiner Abschnittsüberschrift, statt diese allein zurückzulassen.
    s=replaceOnce(s,
      'if(estimated<=PH-TOP-BOT&&this.current.y-estimated<BOT)this.page();',
      'if(this.current.y<PH-TOP-155&&this.current.y-estimated<BOT)this.page();',
      'Rechnerbeginn');
    // Inhaltliche Gruppen vor dem Zeichnen insgesamt vermessen: regionale Vierergruppe und Beispiel samt Hinweis.
    s=replaceOnce(s,
      'for(let i=0;i<cards.length;i+=cols)this.cardRow(cards.slice(i,i+cols),Math.min(cols,cards.length-i),b.kind);',
      `if(/regionGrid/.test(b.kind)&&cards.length===4){const w=(W-10)/2;const a=Math.max(cardH(cards[0],w,b.kind),cardH(cards[1],w,b.kind));const z=Math.max(cardH(cards[2],w,b.kind),cardH(cards[3],w,b.kind));this.ensure(a+z+24+78);}
       if(/grid2/.test(b.kind)&&cards.some(c=>/Beispiel aus Sicht/.test(c.title))){const w=(W-10)/2;const h=Math.max(...cards.map(c=>cardH(c,w,b.kind)));const old=this.pages.length;this.ensure(h+12+76);if(this.pages.length>old){this.text('BUCHUNGSMAGNET · FORTSETZUNG',M+2,this.current.y-11,8,true,'mag');this.current.y-=28;}}
       for(let i=0;i<cards.length;i+=cols)this.cardRow(cards.slice(i,i+cols),Math.min(cols,cards.length-i),b.kind);`,
      'zusammengehörige Karten');
    // Aktuelle Eingaben erhalten nachvollziehbare Zahlenformate und Einheiten; Name bleibt Freitext.
    s=replaceOnce(s,
      "value:x.querySelector('input')?.value||''",
      `value:(()=>{const input=x.querySelector('input');const value=(input?.value||'').trim();if(!value)return '—';if(input.id==='hotelName')return value;const n=Number(value.replace(',','.'));if(!Number.isFinite(n))return value;const percent=/Pct$/.test(input.id);return new Intl.NumberFormat('de-DE',{minimumFractionDigits:percent?0:2,maximumFractionDigits:2}).format(n)+(percent?' %':' €');})()`,
      'Rechnerwerte und Einheiten');
    s=replaceOnce(s,
      "cells:[...tr.cells].map(c=>c.querySelector('input')?.value??txt(c))",
      `cells:[...tr.cells].map(c=>{const el=c.querySelector('input');if(!el)return txt(c);const v=(el.value||'').trim();const n=Number(v.replace(',','.'));return v&&Number.isFinite(n)?new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' €':v;})`,
      'Tabelleneinheiten');
    // Die beiden bereits in hotel.html vorhandenen Links als URI-Annotationen erhalten.
    s=replaceOnce(s,
      "sec.blocks.push({type:'paragraphs',texts:p.filter(Boolean)});}",
      `sec.blocks.push({type:'paragraphs',texts:p.filter(Boolean)});const anchors=children(d,'.detailsBody a[href]').map(a=>({label:txt(a),url:new URL(a.getAttribute('href'),doc.baseURI).href}));if(anchors.length)sec.blocks.push({type:'links',items:anchors});}`,
      'Originalverweise');
    s=replaceOnce(s,
      "const p={stream:[],y:PH-TOP};",
      "const p={stream:[],annots:[],y:PH-TOP};",
      'Linkseiten');
    s=replaceOnce(s,
      'PDF.prototype.footer=function(d){',
      `PDF.prototype.links=function(items){for(const link of items){if(!link.label||!/^https?:\/\//.test(link.url))continue;this.ensure(26);const y=this.current.y;this.text(link.label,M+4,y-11,9.3,true,'mint');const width=Math.min(W-8,measure(link.label,9.3,true)+22);this.current.annots.push({url:link.url,rect:[M+2,y-18,M+width,y+3]});this.current.y-=25;}};
       PDF.prototype.footer=function(d){`,
      'anklickbare Texte');
    s=replaceOnce(s,
      "else if(b.type==='paragraphs')p.paragraphs(b);else if(b.type==='calculator')",
      "else if(b.type==='paragraphs')p.paragraphs(b);else if(b.type==='links')p.links(b.items);else if(b.type==='calculator')",
      'Verweis-Ausgabe');
    s=replaceOnce(s,
      "for(let i=0;i<n;i++){const stream=enc(this.pages[i].stream.join(''));",
      `const annotsIds=this.pages.map(p=>(p.annots||[]).map(link=>{const aid=id++;const bytes=te.encode(link.url);const uri=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();const rect=link.rect.map(v=>v.toFixed(2)).join(' ');obj.set(aid,enc('<< /Type /Annot /Subtype /Link /Rect ['+rect+'] /Border [0 0 0] /A << /S /URI /URI <'+uri+'> >> >>'));return aid;}));for(let i=0;i<n;i++){const stream=enc(this.pages[i].stream.join(''));`,
      'Linkobjekte');
    s=replaceOnce(s,
      ' /Contents ${cids[i]} 0 R >>`)',
      " /Contents ${cids[i]} 0 R ${annotsIds[i].length?'/Annots ['+annotsIds[i].map(v=>v+' 0 R').join(' ')+']':''} >>`)",
      'PDF-Seitenverweise');
    return s;
  }
  const ready=(async()=>{
    const r=await fetch(base,{cache:'no-store'});
    if(!r.ok)throw Error('Der bestehende Hotel-PDF-Generator ist nicht erreichbar.');
    const source=fix(await r.text());
    const script=document.createElement('script');
    script.textContent=source;document.head.appendChild(script);script.remove();
    if(!window.HotelPdfEigen?.generate)throw Error('Korrigierter Hotel-PDF-Generator startet nicht.');
    return window.HotelPdfEigen;
  })();
  window.HotelPdfEigen=Object.freeze({version:'HOTEL_PDF_FIX_V1',generate:async(...args)=>(await ready).generate(...args)});
  ready.catch(err=>console.error('[Hotel-PDF-Korrekturen]',err));
})();
