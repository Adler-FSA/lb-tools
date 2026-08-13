(()=>{
'use strict';
const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
const MASTER_AT='lb_notfallakte_json_backup_at';
let saveTimer=null, noticeTimer=null;

function ensureStyles(){
  if(q('#v08FeedbackStyles')) return;
  const st=document.createElement('style');
  st.id='v08FeedbackStyles';
  st.textContent=`
  .v08-live{display:none;margin:10px 0;padding:12px 15px;border-radius:14px;border:1px solid #bfe5d9;background:#e8f7f2;color:#15735f;font-weight:800}
  .v08-live.show{display:block}.v08-live.demo{border-color:#edc5d9;background:#fff1f8;color:#8d1854}
  .v08-confirm{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;width:min(760px,calc(100% - 24px));background:#fff;border:2px solid #00a7ad;border-radius:18px;box-shadow:0 18px 48px rgba(19,34,56,.28);padding:18px;display:none}
  .v08-confirm.show{display:block}.v08-confirm strong{display:block;color:#132238;font-size:1.08rem;margin-bottom:5px}.v08-confirm p{margin:0 0 12px;line-height:1.55}.v08-confirm .v08-file{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f4f8f9;border:1px solid #d8e4e7;border-radius:10px;padding:9px 10px;overflow-wrap:anywhere;margin:8px 0 12px}.v08-confirm-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
  `;
  document.head.appendChild(st);
}

function ensureUI(){
  ensureStyles();
  if(!q('#v08LiveStatus')){
    const live=document.createElement('div'); live.id='v08LiveStatus'; live.className='v08-live'; live.setAttribute('role','status'); live.setAttribute('aria-live','polite');
    const anchor=q('#demoBanner')||q('#notice'); anchor?.parentNode.insertBefore(live,anchor.nextSibling);
  }
  if(!q('#v08ActionConfirm')){
    const box=document.createElement('div'); box.id='v08ActionConfirm'; box.className='v08-confirm'; box.setAttribute('role','dialog'); box.setAttribute('aria-live','assertive');
    box.innerHTML='<strong id="v08ConfirmTitle">Aktion ausgeführt</strong><p id="v08ConfirmText"></p><div id="v08ConfirmFile" class="v08-file" style="display:none"></div><div class="v08-confirm-actions"><button class="btn primary" id="v08ConfirmOk">Bestätigen</button></div>';
    document.body.appendChild(box);
    q('#v08ConfirmOk').onclick=()=>box.classList.remove('show');
  }
}

function live(msg,isDemo=false){
  const el=q('#v08LiveStatus'); if(!el)return;
  el.textContent=msg; el.className='v08-live show'+(isDemo?' demo':'');
  clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>el.classList.remove('show'),3200);
}

function persistent(title,text,fileName=''){
  const box=q('#v08ActionConfirm'); if(!box)return;
  q('#v08ConfirmTitle').textContent=title;
  q('#v08ConfirmText').textContent=text;
  const f=q('#v08ConfirmFile');
  if(fileName){f.textContent=fileName;f.style.display='block'}else{f.textContent='';f.style.display='none'}
  box.classList.add('show');
}

function stamp(d=new Date()){const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`}
function safeName(s){return(String(s||'notfallakte').trim().replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g,'-').replace(/^-+|-+$/g,'')||'notfallakte')}

function replaceLegacyCopy(){
  const exportBtn=q('#exportBtn'); if(exportBtn) exportBtn.textContent='Vollständige Sicherung erstellen';
  const oldImport=q('label[for="importFile"]');
  if(oldImport){oldImport.textContent='Sicherung wiederherstellen';oldImport.removeAttribute('for');oldImport.setAttribute('role','button');oldImport.tabIndex=0}
  const intro=qa('.intro .cardBody p');
  if(intro[0]) intro[0].textContent='Diese Anwendung speichert deine Angaben lokal in diesem Browser. Der lokale Browser-Speicher ist keine Cloud-Sicherung. Nutze möglichst immer dieselbe direkte Produkt-URL und denselben Browser und erstelle regelmäßig eine vollständige JSON-Master-Sicherung.';
  if(intro[1]) intro[1].textContent='Lege die Seite als Lesezeichen/Favorit oder auf dem Home-Bildschirm ab. Verwende keinen privaten Browsermodus. Vor einem Geräte- oder Browserwechsel immer zuerst eine aktuelle JSON-Master-Sicherung erstellen.';
  const endSection=qa('.section').find(s=>s.querySelector('h2')?.textContent.includes('Abschluss, Sicherung & Unterschrift'));
  if(endSection){
    const sec=endSection.querySelector('.learn.security');
    if(sec) sec.innerHTML='<strong>Wichtig zu deiner eigenen Sicherheit:</strong> Diese Notfallakte kann hochsensible Informationen enthalten. Erstelle zuerst eine aktuelle vollständige JSON-Master-Sicherung auf einem geschützten externen Speicherort, danach die PDF. Erst danach solltest du sensible Daten aus dem Browser löschen.';
    const cb=q('#confirmBackup')?.closest('label'); if(cb) cb.lastChild.textContent=' Ich habe eine aktuelle JSON-Master-Sicherung extern gespeichert.';
  }
}

function refreshTopStatus(){
  const a=q('#backupState'), b=q('#savedState'); if(!a||!b)return;
  if(typeof demoMode!=='undefined'&&demoMode){a.textContent='Demo-Sicherungstraining aktiv ✓';b.textContent='Persönliche Daten bleiben unberührt';return}
  const at=localStorage.getItem(MASTER_AT);
  a.textContent=at?'JSON-Master-Sicherung vorhanden ✓':'Noch keine JSON-Master-Sicherung erstellt';
  b.textContent=at?'Letzte Master-Sicherung: '+new Date(at).toLocaleString('de-DE'):(state?.updatedAt?'Letzte lokale Änderung: '+new Date(state.updatedAt).toLocaleString('de-DE'):'Noch nicht gespeichert');
}

function autoSave(source){
  if(typeof demoMode!=='undefined'&&demoMode){live('Demo: Eingabe erkannt – persönliche Daten werden nicht verändert.',true);return}
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    try{
      readTop();
      state.updatedAt=new Date().toISOString();
      localStorage.setItem(KEY,JSON.stringify(state));
      live('Änderung lokal gespeichert ✓');
      refreshTopStatus();
      if(typeof refreshBackupStatus==='function')refreshBackupStatus();
    }catch(e){console.warn('V08 auto-save failed',e);live('Änderung konnte nicht automatisch gespeichert werden. Bitte „Alles speichern“ wählen.')}
  },180);
}

function wireInputs(){
  document.addEventListener('input',e=>{
    if(e.target.matches('input[type="file"]'))return;
    autoSave(e.target);
  },true);
  document.addEventListener('change',e=>{
    if(e.target.matches('input[type="file"]'))return;
    autoSave(e.target);
  },true);
  q('#signatureCanvas')?.addEventListener('pointerup',()=>setTimeout(()=>autoSave(q('#signatureCanvas')),0),true);
}

function wirePrimaryBackup(){
  const topExport=q('#exportBtn');
  if(topExport) topExport.onclick=e=>{e.preventDefault();q('#v08JsonExport')?.click()};
  const oldImport=q('label[role="button"]');
  if(oldImport){
    oldImport.onclick=e=>{e.preventDefault();q('#v08JsonImport')?.click()};
    oldImport.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();q('#v08JsonImport')?.click()}};
  }
  const oldFile=q('#importFile'); if(oldFile) oldFile.disabled=true;

  q('#v08JsonExport')?.addEventListener('click',()=>{
    const name=`${demoMode?'DEMO-':''}Notfallakte-${safeName(state?.owner)}-Sicherung-${stamp()}.json`;
    persistent(demoMode?'Demo-Sicherung vorbereitet ✓':'Vollständige Sicherung vorbereitet ✓','Die JSON-Master-Sicherung wurde erstellt. Speichere sie jetzt über „In Dateien sichern“ in deinem geschützten Sicherungsordner und bestätige anschließend diesen Hinweis.',name);
    setTimeout(refreshTopStatus,300);
  },true);
  q('#v08Excel')?.addEventListener('click',()=>{
    const name=`${demoMode?'DEMO-':''}Notfallakte-${safeName(state?.owner)}-Uebersicht-${stamp()}.xlsx`;
    persistent(demoMode?'Demo-Excel vorbereitet ✓':'Excel-Übersicht vorbereitet ✓','Die Excel-Datei wurde erstellt. Speichere sie an deinem gewünschten geschützten Speicherort und bestätige anschließend diesen Hinweis.',name);
  },true);
  q('#printBtn')?.addEventListener('click',()=>{
    persistent('PDF / Ausdruck geöffnet ✓','Speichere die PDF beziehungsweise drucke sie aus. Bestätige diesen Hinweis erst, wenn du den Vorgang abgeschlossen hast.');
  },true);
}

function wireRestoreFeedback(){
  const obs=new MutationObserver(()=>{
    const n=q('#notice'); if(!n)return; const t=n.textContent||'';
    if(/wiederhergestellt|eingelesen/i.test(t)){
      persistent(/Demo/i.test(t)?'Demo-Sicherung wiederhergestellt ✓':'Sicherung wiederhergestellt ✓','Die Sicherungsdatei wurde erfolgreich eingelesen. Prüfe die angezeigten Daten kurz und bestätige anschließend diesen Hinweis.');
      refreshTopStatus();
    }
  });
  const n=q('#notice'); if(n)obs.observe(n,{childList:true,subtree:true,characterData:true,attributes:true});
}

function wireActionFeedback(){
  document.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b)return;
    if(b.matches('#v08JsonExport,#v08Excel,#printBtn,#v08ConfirmOk'))return;
    if(b.classList.contains('addRec')){
      setTimeout(()=>live(demoMode?'Demo: zusätzlicher Eintrag wird nicht dauerhaft angelegt.':'Weiterer Eintrag angelegt ✓',demoMode),0);
    }else if(b.classList.contains('saveRec')){
      setTimeout(()=>live(demoMode?'Demo: Speichern nur als Übung – persönliche Daten bleiben unberührt.':'Eintrag gespeichert ✓',demoMode),0);
    }else if(b.classList.contains('delRec')){
      setTimeout(()=>{if(demoMode)live('Demo: Löschen ist gesperrt – persönliche Daten bleiben unberührt.',true);else live('Löschvorgang abgeschlossen oder abgebrochen.')},0);
    }else if(b.id==='saveAll'||b.id==='saveFamily'){
      setTimeout(()=>live(demoMode?'Demo: Speichern nur als Übung – persönliche Daten bleiben unberührt.':'Daten gespeichert ✓',demoMode),0);
    }else if(b.id==='clearSignature'){
      setTimeout(()=>live('Unterschrift gelöscht ✓',demoMode),0);
    }else if(b.id==='resetBtn'){
      setTimeout(()=>{if(!localStorage.getItem(KEY))persistent('Lokale Daten gelöscht ✓','Die lokal gespeicherten persönlichen Daten wurden aus diesem Browser entfernt. Bewahre deine JSON-Master-Sicherung weiterhin geschützt auf.')},250);
    }
  },true);
}

function patchPrintCopy(){
  if(typeof optimizePrint!=='function'||optimizePrint.__v08patched)return;
  const orig=optimizePrint;
  const wrapped=function(){orig();const root=q('#printSheet');if(root){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){n.nodeValue=n.nodeValue.replace(/CSV-Sicherung/g,'JSON-Master-Sicherung').replace(/CSV-Sicherungsdatei/g,'JSON-Master-Sicherung')}}};
  wrapped.__v08patched=true; optimizePrint=wrapped;
}

function boot(){
  ensureUI();
  replaceLegacyCopy();
  patchPrintCopy();
  wireInputs();
  wirePrimaryBackup();
  wireRestoreFeedback();
  wireActionFeedback();
  refreshTopStatus();
  setTimeout(refreshTopStatus,500);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,20));else setTimeout(boot,20);
})();