import {DEMO_LEARNING_STEPS} from './demo-guide.js';
import {buildDemoProject,DEMO_VERSION} from './demo-project.js';
import {loadProject,resetDemoProject,setDemoMode} from './storage.js';

const steps=DEMO_LEARNING_STEPS;

const shell=document.querySelector('[data-demo-shell]');
const frame=document.querySelector('[data-demo-frame]');
const toast=document.querySelector('[data-demo-toast]');
let current=0,free=false,toastTimer=null;

function showToast(message){
  toast.textContent=message;toast.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},4200);
}
function ensureDemo(){
  setDemoMode(true);
  const existing=loadProject({mode:'demo'});
  if(!existing||existing.demoMetadata?.demoVersion!==DEMO_VERSION){
    resetDemoProject(buildDemoProject(),{confirmation:'RESET_DEMO_PROJECT'});
  }
}
function renderGuide(){
  const step=steps[current];
  document.querySelector('[data-guide-step]').textContent=`Schritt ${current+1} von ${steps.length}`;
  document.querySelector('[data-guide-title]').textContent=step.title;
  document.querySelector('[data-guide-copy]').textContent=step.copy;
  document.querySelector('[data-guide-why]').textContent=step.why;
  const facts=document.querySelector('[data-guide-facts]');
  facts.innerHTML='<strong>Im Demo-Haus siehst du:</strong><ul>'+step.facts.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul>'+
    (step.extraUrl?'<a class="demo-btn primary" style="display:inline-block;margin-top:7px" target="_blank" rel="noopener" href="'+escapeHtml(step.extraUrl)+'">'+escapeHtml(step.extraLabel)+'</a>':'');
  document.querySelector('[data-prev]').disabled=current===0;
  document.querySelector('[data-next]').disabled=current===steps.length-1;
  document.querySelector('[data-guide-list]').innerHTML=steps.map((x,i)=>
    '<button type="button" data-jump="'+i+'" class="'+(i===current?'active':'')+'">'+(i+1)+'. '+escapeHtml(x.short)+'<small>'+escapeHtml(x.title)+'</small></button>'
  ).join('');
  document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>go(Number(btn.dataset.jump))));
}
function go(index,{navigate=true}={}){
  if(index<0||index>=steps.length)return;current=index;renderGuide();
  if(navigate)frame.src=steps[current].url;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}

function cleanDevelopmentLanguage(){
  try{
    const doc=frame.contentDocument;if(!doc)return;
    doc.querySelectorAll('.eyebrow').forEach(node=>{
      const text=node.textContent.trim();
      if(/^Baustein\s/i.test(text)) node.textContent='Praxisbereich';
      else if(/^Neu in Baustein\s/i.test(text)) node.textContent='Praxisbereich';
      else if(/^Bausteingrenze$/i.test(text)) node.textContent='Hinweis';
    });
    doc.querySelectorAll('.notice').forEach(node=>{
      const text=node.textContent.trim();
      if(/^Baustein\s+6\s+ist gestartet/i.test(text)){
        node.textContent='Im Demo-Haus sind Immobilienakte, Kosten, Verbrauch, Abrechnung, Dokumente und Archiv bereits miteinander verbunden.';
      }
    });
    doc.querySelectorAll('h2').forEach(h=>{
      if(h.textContent.trim()==='Noch keine PDF-Ausgabe'){
        h.textContent='Von der Vorbereitung zur PDF';
        const p=h.parentElement?.querySelector('.kicker');
        if(p)p.textContent='Gespeicherte Entwürfe können anschließend in der PDF-Zentrale als eigene Prüffassung übernommen werden.';
      }
    });
    const storageText=doc.querySelector('[data-storage-text]');
    if(storageText)storageText.textContent='Demo lokal gespeichert';
    const title=doc.querySelector('.brand-title');
    if(title&&!doc.querySelector('[data-demo-inner-badge]')){
      const badge=doc.createElement('span');badge.dataset.demoInnerBadge='1';badge.textContent='DEMO';
      badge.style.cssText='display:inline-block;margin-left:8px;padding:2px 6px;border-radius:999px;background:#c6006f;color:#fff;font-size:10px;font-weight:800;vertical-align:middle';
      title.appendChild(badge);
    }
  }catch{}
}

document.querySelector('[data-prev]').addEventListener('click',()=>go(current-1));
document.querySelector('[data-next]').addEventListener('click',()=>go(current+1));
document.querySelector('[data-toggle-mode]').addEventListener('click',event=>{
  free=!free;shell.classList.toggle('free',free);
  event.currentTarget.textContent=free?'Geführte Demo':'Frei erkunden';
});
document.querySelector('[data-reset-demo]').addEventListener('click',()=>{
  if(!confirm('Demo-Haus auf den Ausgangszustand zurücksetzen? Nur Demo-Änderungen gehen verloren. Eigene Projektdaten bleiben unberührt.'))return;
  resetDemoProject(buildDemoProject(),{confirmation:'RESET_DEMO_PROJECT'});
  frame.src=steps[current].url;showToast('Demo-Haus wurde auf den geprüften Ausgangszustand zurückgesetzt.');
});
document.querySelector('[data-exit-demo]').addEventListener('click',()=>{
  setDemoMode(false);window.location.href='index.html?demo=0';
});
frame.addEventListener('load',()=>{
  cleanDevelopmentLanguage();
  setTimeout(cleanDevelopmentLanguage,250);
});

try{
  ensureDemo();
  const requested=Number(new URLSearchParams(window.location.search).get('step'));
  if(Number.isInteger(requested)&&requested>=0&&requested<steps.length)current=requested;
  renderGuide();frame.src=steps[current].url;
}catch(error){
  renderGuide();
  showToast('Demo konnte nicht gestartet werden: '+(error?.message||String(error)));
}
