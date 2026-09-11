(()=>{
'use strict';
/* PERSONAL_MANAGEMENT_PDF_V2_ADAPTER
   Nutzt die vorhandene FSA_CONTRACT_PDF_ENGINE_V2 für die drei Standalone-Formulare.
   Kein Browser-Druckdialog. Die PDF wird im Browser erzeugt und anschließend über
   einen expliziten Download-Link mit festem Dateinamen angeboten (iPad-tauglicher Handoff).
*/
const EXPECTED='FSA_CONTRACT_PDF_ENGINE_V2';
let pendingPdfUrl='';

const $=s=>document.querySelector(s);
const val=id=>{const el=document.getElementById(id);return el&&String(el.value||'').trim()?String(el.value).trim():'—'};
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const labelFor=id=>{const el=document.querySelector(`label[for="${id}"]`);return el?clean(el.textContent).replace(/\s*\*\s*$/,''):id};
const checkedText=id=>{
  const nodes=[...document.querySelectorAll(`#${id} input:checked`)];
  if(!nodes.length)return '—';
  return nodes.map(n=>clean(n.closest('label')?.innerText||n.value||'')).filter(Boolean).join(', ');
};
const isoDate=()=>{
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
};
const displayDate=()=>new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-GB':'de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());

function pageType(){
  const p=location.pathname.toLowerCase();
  if(p.endsWith('/wissen.html'))return 'wissen';
  if(p.endsWith('/perspektiven.html'))return 'perspektiven';
  if(p.endsWith('/talent-business.html'))return 'talent';
  return '';
}

function currentRows(type){
  // Falls die Seite ihre bestehende rows-Struktur bereits gefüllt hat, verwenden wir sie.
  try{
    if(typeof rows!=='undefined'&&Array.isArray(rows)&&rows.length){
      return rows.map(r=>[clean(r[0]),clean(r[1]||'—')]);
    }
  }catch(_){/* eigener Fallback unten */}

  if(type==='wissen'){
    const interests=[checkedText('topics'),val('ownTopic')!=='—'?val('ownTopic'):''].filter(x=>x&&x!=='—').join(' · ')||'—';
    return [
      ['Name',val('name')],['E-Mail',val('email')],['Wichtigster Grund',val('reason')],
      ['Interessengebiete',interests],['Fehlendes Wissen / Orientierung',val('gap')],
      ['Wissen für die nächsten 12 Monate',val('next12')],
      ['Was danach selbstständig beurteilt werden soll',val('judge')],
      ['Gewünschte Unterstützung',checkedText('support')],['Vermisstes Angebot / Thema',val('missing')],
      ['Monatlicher Wissensimpuls',val('monthly')],['12 Monate Wissensimpulse per E-Mail',$('#consent')?.checked?'Ja':'Nein']
    ];
  }
  if(type==='perspektiven'){
    const rating=[...document.querySelectorAll('#ratingBody tr')].map(tr=>{
      const area=clean(tr.cells?.[0]?.innerText||'');
      const score=clean(tr.querySelector('select')?.value||'—');
      return area?`${area}: ${score}`:'';
    }).filter(Boolean).join('; ')||'—';
    return [
      ['Name',val('name')],['E-Mail',val('email')],['Was angesprochen hat',val('attracted')],
      ['Persönliches Ziel',val('goal')],['Zusätzliches Einkommen',val('income')],['Zeit',val('time')],
      ['Begleitung anderer',val('role')],['Erwartungen',rating],['Gute Betreuung',val('support')],
      ['Wann es sich gelohnt hat',val('worth')],['Was wir nicht falsch machen dürfen',val('wrong')],
      ['Weitere Erwartungen',val('other')]
    ];
  }
  if(type==='talent'){
    return [
      ['Name',val('name')],['E-Mail',val('email')],['Beruf',val('job')],['Expertise',val('expertise')],
      ['Erfahrung seit',val('years')],['Stärke',val('strength')],['Angebot',val('offer')],
      ['Zielgruppe',val('audience')],['Rollen',checkedText('roles')],['Netzwerk',val('network')],
      ['Angebot für Clubmitglieder',val('clubOffer')],['Akademie-Erfahrung',val('academy')],
      ['Formate',val('formats')],['Business-Idee',val('idea')],['Warum LiquidityBooster',val('why')],
      ['Wert für eigenes Business',val('businessValue')],['Erwartung',val('expect')],
      ['Gewünschte Unterstützung',val('support')],['Beidseitiger Nutzen',val('mutual')]
    ];
  }
  return [];
}

function config(type){
  const en=document.documentElement.lang==='en';
  const name=val('name');
  const safe=window.FSAContractPdfEngine?.safeFilePart||((s)=>String(s||'Gast').replace(/[^a-z0-9_-]+/gi,'-'));
  if(type==='wissen')return{
    title:en?'Personal Knowledge Request':'Persönliche Wissensanfrage',
    filename:`Wissensanfrage_${safe(name)}_${isoDate()}.pdf`,
    footer:en?'Knowledge Request · LiquidityBooster':'Wissensanfrage · LiquidityBooster'
  };
  if(type==='perspektiven')return{
    title:en?'Perspectives – Expectations':'Perspektiven – Erwartungsbogen',
    filename:`Perspektiven_${safe(name)}_${isoDate()}.pdf`,
    footer:en?'Perspectives · LiquidityBooster':'Perspektiven · LiquidityBooster'
  };
  return{
    title:'Talent & Business – Profil',
    filename:`Talent_Business_${safe(name)}_${isoDate()}.pdf`,
    footer:'Talent & Business · LiquidityBooster'
  };
}

function buildPdfDocument(title,data){
  const root=document.createElement('section');
  root.id='pmPdfV2Source';
  root.setAttribute('aria-hidden','true');
  root.style.cssText='position:fixed;left:-100000px;top:0;width:720px;background:#fff;pointer-events:none;';
  const h1=document.createElement('h1');h1.textContent=title;root.appendChild(h1);
  const date=document.createElement('p');date.textContent=(document.documentElement.lang==='en'?'Created: ':'Erstellt am: ')+displayDate();root.appendChild(date);
  for(const [label,value] of data){
    const h=document.createElement('h3');h.textContent=label;root.appendChild(h);
    const p=document.createElement('p');p.textContent=value||'—';root.appendChild(p);
  }
  document.body.appendChild(root);
  return root;
}

function downloadBox(){
  let box=document.getElementById('pmPdfV2Download');
  if(box)return box;
  box=document.createElement('div');box.id='pmPdfV2Download';box.className='mailbox';
  const result=document.getElementById('result');
  const firstMailbox=result?.querySelector('.mailbox');
  if(firstMailbox)firstMailbox.insertAdjacentElement('beforebegin',box);
  else result?.appendChild(box);
  return box;
}

function offerPdf(filename,blob,pages){
  if(pendingPdfUrl)URL.revokeObjectURL(pendingPdfUrl);
  pendingPdfUrl=URL.createObjectURL(blob);
  const box=downloadBox();
  if(!box)return;
  box.innerHTML='';
  const row=document.createElement('div');row.className='row';
  const strong=document.createElement('strong');strong.textContent=document.documentElement.lang==='en'?'PDF ready':'PDF fertig';
  const info=document.createElement('span');info.textContent=`${filename}${pages?` · ${pages} ${pages===1?'Seite':'Seiten'}`:''}`;
  const a=document.createElement('a');
  a.href=pendingPdfUrl;a.download=filename;a.setAttribute('type','application/pdf');a.rel='noopener';
  a.textContent=document.documentElement.lang==='en'?'Download / save PDF':'PDF herunterladen / speichern';
  a.style.cssText='display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #bcdfe1;background:#e9f9f9;color:#132238;font-weight:900;border-radius:10px;padding:9px 11px;white-space:nowrap';
  row.append(strong,info,a);box.appendChild(row);
  const note=document.createElement('div');note.className='note';note.textContent=document.documentElement.lang==='en'?'The PDF was created directly on this page without a browser print dialog. Tap the download button to save the named file.':'Die PDF wurde direkt auf dieser Seite ohne Browser-Druckdialog erzeugt. Tippe jetzt auf den Download-Button, um die Datei unter dem angezeigten Namen zu speichern.';box.appendChild(note);
  box.scrollIntoView({behavior:'smooth',block:'center'});
}

function showError(message){
  const st=document.getElementById('status');
  if(st){st.className='status show err';st.textContent=message;st.scrollIntoView({behavior:'smooth',block:'center'});}
  else alert(message);
}

async function createPdf(){
  const type=pageType();
  if(!type)return;
  if(!window.FSAContractPdfEngine||window.FSAContractPdfEngine.version!==EXPECTED){
    showError('PDF Engine V2 konnte nicht geladen werden. Bitte die Seite neu laden.');return;
  }
  const data=currentRows(type),cfg=config(type);
  if(!data.length){showError('Für die PDF wurden keine Formulardaten gefunden.');return;}
  const btn=document.getElementById('pdfBtn');
  const oldText=btn?.textContent||'';
  if(btn){btn.disabled=true;btn.textContent=document.documentElement.lang==='en'?'Creating PDF…':'PDF wird erstellt…';}
  const source=buildPdfDocument(cfg.title,data);
  try{
    const result=await window.FSAContractPdfEngine.generate({
      contentRoot:source,
      fieldsRoot:source,
      titleText:cfg.title,
      subtitleText:`${val('name')} · ${displayDate()}`,
      footerText:cfg.footer,
      filename:cfg.filename,
      autoDownload:false
    });
    offerPdf(result.filename,result.blob,result.pages);
  }catch(err){
    console.error('Personal Management PDF V2',err);
    showError('Die PDF konnte nicht erstellt werden: '+(err?.message||String(err)));
  }finally{
    source.remove();
    if(btn){btn.disabled=false;btn.textContent=oldText;}
  }
}

function wire(){
  const btn=document.getElementById('pdfBtn');
  if(!btn||!pageType())return;
  // Vorhandenen lokalen PDF-Handler bewusst ersetzen. E-Mail- und Formularlogik bleibt unverändert.
  btn.onclick=createPdf;
  btn.dataset.pdfEngine='FSA_CONTRACT_PDF_ENGINE_V2';
}

wire();
window.addEventListener('pagehide',()=>{if(pendingPdfUrl)URL.revokeObjectURL(pendingPdfUrl)});
})();
