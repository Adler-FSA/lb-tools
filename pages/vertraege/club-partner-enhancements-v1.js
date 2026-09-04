(()=>{
'use strict';
/* Club-Partner-Seite: zusätzliche Bestätigungs- und Download-UX.
   Keine Vertragsinhalte werden hier als PDF-Quelle dupliziert.
*/
const LOGO_URL='https://raw.githubusercontent.com/Adler-FSA/lp-anfang/main/library/logos/liquiditybooster-logo.png';
const texts={
  de:{
    title:'Elektronische Vertragsbestätigung',
    intro:'Bitte bestätige die nachstehenden Erklärungen aktiv. Die gesetzten Bestätigungen, deine Vertragsdaten sowie Ort, Datum und Name des Unterzeichners werden gemeinsam mit diesem Vertragsstand in der erzeugten A4-PDF dokumentiert.',
    note:'Die vorstehenden Erklärungen wurden durch aktive Auswahl bestätigt und werden gemeinsam mit Name, Ort und Datum in dieser Vertrags-PDF dokumentiert. Diese Funktion bezeichnet sich nicht als qualifizierte elektronische Signatur.',
    button:'Vertrag bestätigen & PDF erstellen',
    ready:'Deine PDF ist fertig',
    download:'PDF herunterladen',
    confirmations:[
      'Ich habe die Club-Partner-Vereinbarung vollständig gelesen.',
      'Ich akzeptiere die Club-Partner-Vereinbarung.',
      'Ich habe die für die Club-Partnerschaft geltenden AGB gelesen und akzeptiert.',
      'Ich habe die Datenschutzhinweise zur Kenntnis genommen.'
    ]
  },
  en:{
    title:'Electronic contract confirmation',
    intro:'Please actively confirm the statements below. The selected confirmations, your contract data, place, date and signatory name are documented together with this contract version in the generated A4 PDF.',
    note:'The statements above are confirmed by active selection and are documented together with name, place and date in this contract PDF. This function does not describe itself as a qualified electronic signature.',
    button:'Confirm contract & create PDF',
    ready:'Your PDF is ready',
    download:'Download PDF',
    confirmations:[
      'I have read the Club Partner Agreement in full.',
      'I accept the Club Partner Agreement.',
      'I have read and accept the terms and conditions applicable to the Club Partnership.',
      'I have taken note of the privacy information.'
    ]
  }
};
function lang(){return document.documentElement.lang==='en'?'en':'de'}
function installStyle(){if(document.getElementById('contractEnhancementStyle'))return;const s=document.createElement('style');s.id='contractEnhancementStyle';s.textContent='.main-download-card{display:none;margin:26px auto 4px;max-width:680px;border:2px solid var(--mint);border-radius:20px;padding:24px;background:linear-gradient(135deg,#efffff,#fff);box-shadow:0 18px 46px rgba(19,34,56,.12);text-align:center}.main-download-card.show{display:block}.main-download-check{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;margin:0 auto 11px;background:var(--mint);color:#fff;font-weight:900;font-size:26px}.main-download-card h3{margin:0 0 6px;color:var(--navy);font-size:22px}.main-download-meta{margin:0;color:var(--muted);font-size:13px}.main-download-name{margin:13px auto 15px;padding:11px 13px;border-radius:11px;background:#fff;border:1px solid var(--line);font-weight:900;color:var(--navy);overflow-wrap:anywhere}.main-download-card .btn{justify-content:center;min-width:220px}.confirmation-core{margin-bottom:16px;padding:13px 14px;background:#f4fbfb;border:1px solid #d4ecec;border-radius:12px}.confirmation-core .check:first-child{margin-top:0}.confirmation-core .check:last-child{margin-bottom:0}';document.head.appendChild(s)}
function ensureCard(){let c=document.getElementById('mainDownloadCard');if(c)return c;const accept=document.getElementById('acceptance');if(!accept)return null;c=document.createElement('section');c.className='main-download-card';c.id='mainDownloadCard';c.setAttribute('data-pdf-exclude','');c.innerHTML='<div class="main-download-check">✓</div><h3 id="mainDownloadTitle"></h3><p class="main-download-meta" id="mainDownloadMeta"></p><div class="main-download-name" id="mainDownloadFilename"></div><a class="btn primary" id="mainDownloadLink" href="#" download></a>';accept.insertAdjacentElement('afterend',c);return c}
function ensureCoreConfirmations(){const root=document.getElementById('acceptChecks');if(!root)return;let wrap=root.querySelector('.confirmation-core');const t=texts[lang()];if(!wrap){wrap=document.createElement('div');wrap.className='confirmation-core';root.prepend(wrap)}wrap.innerHTML='';t.confirmations.forEach((txt,i)=>{const label=document.createElement('label');label.className='check';label.innerHTML='<input type="checkbox" class="acceptCheck coreAcceptCheck" data-core-index="'+i+'"><span>'+txt+'</span>';wrap.appendChild(label)})}
function syncCopy(){const t=texts[lang()],accept=document.getElementById('acceptance');if(accept){const h=accept.querySelector('h3');if(h)h.textContent=t.title;const intro=accept.querySelector(':scope > p');if(intro)intro.textContent=t.intro;const note=accept.querySelector('.signature-note');if(note)note.textContent=t.note}const btn=document.querySelector('#pdfBtn span');if(btn)btn.textContent=t.button;const title=document.getElementById('mainDownloadTitle');if(title)title.textContent=t.ready;const dl=document.getElementById('mainDownloadLink');if(dl)dl.textContent=t.download}
function mirrorDownload(){const state=document.getElementById('downloadState'),src=document.getElementById('downloadLink'),info=document.getElementById('downloadInfo'),card=ensureCard();if(!state||!src||!card)return;if(!state.classList.contains('show')||!src.href||src.getAttribute('href')==='#'){card.classList.remove('show');return}const a=document.getElementById('mainDownloadLink');a.href=src.href;a.download=src.download||'Vertrag.pdf';document.getElementById('mainDownloadFilename').textContent=a.download;document.getElementById('mainDownloadMeta').textContent=info?.textContent||'';card.classList.add('show');syncCopy();setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'center'}),40)}
function syncAll(){document.body.dataset.pdfLogo=LOGO_URL;ensureCard();ensureCoreConfirmations();syncCopy();mirrorDownload()}
function init(){installStyle();syncAll();const root=document.getElementById('acceptChecks');if(root){let busy=false;new MutationObserver(()=>{if(busy)return;busy=true;queueMicrotask(()=>{ensureCoreConfirmations();syncCopy();busy=false})}).observe(root,{childList:true})}const state=document.getElementById('downloadState'),src=document.getElementById('downloadLink'),info=document.getElementById('downloadInfo');const obs=new MutationObserver(mirrorDownload);if(state)obs.observe(state,{attributes:true,attributeFilter:['class']});if(src)obs.observe(src,{attributes:true,attributeFilter:['href','download']});if(info)obs.observe(info,{childList:true,characterData:true,subtree:true});document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setTimeout(syncAll,0)));document.getElementById('resetBtn')?.addEventListener('click',()=>setTimeout(()=>{document.getElementById('mainDownloadCard')?.classList.remove('show');syncAll()},0))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
