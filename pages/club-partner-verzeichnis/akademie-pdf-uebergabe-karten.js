/* Akademie PDF-Uebergabe fuer Einladungskarten.
 * Lokale fertige PDF, kein Browser-Druckdialog.
 * Zusaetzlich: direkte PDF-Ansicht und robuste Fallbacks fuer iPad/WebView.
 */
(()=>{'use strict';
if(window.AkademiePdfUebergabe)return;

let documentFile=null, metadata=null, modal=null, previousFocus=null, objectUrl='';

const style=document.createElement('style');
style.textContent=`
.ak-pdf-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(9,20,34,.73);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}
.ak-pdf-backdrop[hidden]{display:none!important}
.ak-pdf-dialog{width:min(580px,100%);max-height:min(90vh,920px);overflow:auto;background:#fff;border:1px solid #cfe0e6;border-radius:22px;box-shadow:0 25px 80px #0005;padding:24px;color:#132238;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
.ak-pdf-dialog *{box-sizing:border-box}
.ak-pdf-top{display:flex;justify-content:space-between;gap:12px;align-items:start}
.ak-pdf-eyebrow{font-size:12px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#008e96}
.ak-pdf-dialog h2{font-size:clamp(22px,4vw,28px);margin:4px 0 8px;line-height:1.2}
.ak-pdf-close{border:1px solid #d3e1e7;background:#fff;color:#132238;border-radius:10px;padding:7px 12px;cursor:pointer;font:inherit;font-weight:700}
.ak-pdf-file{margin:18px 0;background:#f1fafb;border:1px solid #d1e6e9;border-left:5px solid #00a7ad;border-radius:15px;padding:17px;overflow-wrap:anywhere}
.ak-pdf-file strong{font-size:16px;display:block}
.ak-pdf-detail{font-size:13px;color:#536778;margin-top:6px}
.ak-pdf-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ak-pdf-action{border:0;border-radius:11px;padding:13px 10px;background:#132238;color:#fff;cursor:pointer;font:inherit;font-weight:800}
.ak-pdf-action.primary{background:#008e98}
.ak-pdf-action.light{background:#e8f1f3;color:#132238}
.ak-pdf-action.copy{grid-column:1/-1}
.ak-pdf-notice{font-size:13px;color:#44586b;margin:14px 0 0}
.ak-pdf-status{font-size:13px;margin:10px 0 0;color:#007c74;min-height:19px}
.ak-pdf-status.error{color:#b00045}
@media(max-width:480px){.ak-pdf-dialog{padding:17px;border-radius:17px}.ak-pdf-actions{grid-template-columns:1fr}.ak-pdf-action.copy{grid-column:auto}}
`;
document.head.appendChild(style);

function elem(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}

function makeDialog(){
  if(modal)return;
  modal=elem('div','ak-pdf-backdrop');
  modal.hidden=true;

  const box=elem('section','ak-pdf-dialog');
  box.setAttribute('role','dialog');
  box.setAttribute('aria-modal','true');
  box.setAttribute('aria-labelledby','akPdfHeading');

  const top=elem('div','ak-pdf-top');
  const header=elem('div');
  header.append(elem('div','ak-pdf-eyebrow','Akademie · fertiges Dokument'));
  const title=elem('h2','','Ihre PDF ist fertig');
  title.id='akPdfHeading';
  header.append(title);

  const close=elem('button','ak-pdf-close','Schließen');
  close.type='button';
  close.addEventListener('click',hide);
  top.append(header,close);

  const file=elem('div','ak-pdf-file');
  const filename=elem('strong'); filename.id='akPdfFilename';
  const detail=elem('div','ak-pdf-detail'); detail.id='akPdfDetails';
  file.append(filename,detail);

  const actions=elem('div','ak-pdf-actions');

  const view=elem('button','ak-pdf-action primary','PDF ansehen');
  view.type='button'; view.id='akPdfView'; view.addEventListener('click',viewFile);

  const save=elem('button','ak-pdf-action','Speichern');
  save.type='button'; save.id='akPdfSave'; save.addEventListener('click',saveFile);

  const share=elem('button','ak-pdf-action','Teilen');
  share.type='button'; share.id='akPdfShare'; share.addEventListener('click',shareFile);

  const copy=elem('button','ak-pdf-action light copy','Dateinamen kopieren');
  copy.type='button'; copy.id='akPdfCopy'; copy.addEventListener('click',copyName);

  actions.append(view,save,share,copy);

  const notice=elem('p','ak-pdf-notice');
  notice.id='akPdfNotice';

  const status=elem('p','ak-pdf-status');
  status.id='akPdfStatus';
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');

  box.append(top,file,actions,notice,status);
  modal.append(box);
  document.body.append(modal);

  modal.addEventListener('click',ev=>{if(ev.target===modal)hide()});
  document.addEventListener('keydown',ev=>{if(modal&&!modal.hidden&&ev.key==='Escape')hide()});
}

function status(message,isError=false){
  const el=document.getElementById('akPdfStatus');
  if(!el)return;
  el.textContent=message;
  el.classList.toggle('error',isError);
}

function ensureUrl(){
  if(!documentFile)throw Error('Keine PDF vorhanden.');
  if(!objectUrl)objectUrl=URL.createObjectURL(documentFile);
  return objectUrl;
}

function canShare(){
  try{
    return !!(documentFile&&navigator.share&&navigator.canShare&&navigator.canShare({files:[documentFile]}));
  }catch(e){return false}
}

function show(){
  if(!documentFile)throw Error('Es liegt noch keine fertige PDF vor.');
  makeDialog();
  previousFocus=document.activeElement;

  document.getElementById('akPdfFilename').textContent=documentFile.name;
  document.getElementById('akPdfDetails').textContent=[
    metadata?.origin||'Von dieser Seite erstellt',
    metadata?.format||'',
    metadata?.created||''
  ].filter(Boolean).join(' · ');

  document.getElementById('akPdfNotice').textContent=
    'Die PDF wurde auf dieser Seite fertig erzeugt. „PDF ansehen“ öffnet die Datei direkt. „Speichern“ und „Teilen“ verwenden – soweit verfügbar – die Dateifreigabe Ihres Geräts.';

  status('Datei bereit.');
  modal.hidden=false;
  document.getElementById('akPdfView').focus();
}

function hide(){
  if(!modal)return;
  modal.hidden=true;
  previousFocus?.focus?.();
}

function setDocument(result){
  if(!result?.blob||!(result.blob instanceof Blob)||!result.filename||result.blob.size===0){
    throw Error('Der Generator hat keine gültige fertige Datei geliefert.');
  }

  const filename=String(result.filename)
    .replace(/[\\/\x00-\x1f<>:"|?*]/g,'_')
    .trim();

  if(!filename.toLowerCase().endsWith('.pdf'))throw Error('Der PDF-Dateiname ist nicht gültig.');

  if(objectUrl){
    URL.revokeObjectURL(objectUrl);
    objectUrl='';
  }

  documentFile=typeof File==='function'
    ? new File([result.blob],filename,{type:'application/pdf'})
    : result.blob;

  if(!(documentFile instanceof File)){
    try{Object.defineProperty(documentFile,'name',{value:filename})}catch(e){}
  }

  metadata={
    origin:result.origin||'LiquidityBooster Einladungskarte',
    format:result.format||'PDF',
    created:new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date())
  };

  show();
  return {filename,bytes:result.blob.size};
}

function viewFile(){
  if(!documentFile)return status('Keine Datei vorhanden.',true);
  try{
    const url=ensureUrl();
    const opened=window.open(url,'_blank','noopener');
    if(!opened){
      window.location.href=url;
    }
    status('PDF-Ansicht geöffnet.');
  }catch(e){
    status('PDF konnte nicht geöffnet werden: '+(e?.message||e),true);
  }
}

async function nativeShare(){
  if(!canShare())return false;
  await navigator.share({files:[documentFile],title:documentFile.name});
  return true;
}

async function saveFile(){
  if(!documentFile)return status('Keine Datei vorhanden.',true);

  if(typeof window.showSaveFilePicker==='function'){
    try{
      const handle=await window.showSaveFilePicker({
        suggestedName:documentFile.name,
        types:[{description:'PDF-Dokument',accept:{'application/pdf':['.pdf']}}]
      });
      const writable=await handle.createWritable();
      await writable.write(documentFile);
      await writable.close();
      return status('PDF gespeichert.');
    }catch(e){
      if(e?.name==='AbortError')return status('Speichern abgebrochen.');
    }
  }

  try{
    if(await nativeShare())return status('Dateifreigabe geöffnet. Dort „In Dateien sichern“ wählen.');
  }catch(e){
    if(e?.name==='AbortError')return status('Speichern abgebrochen.');
  }

  try{
    const url=ensureUrl();
    const a=document.createElement('a');
    a.href=url;
    a.download=documentFile.name||'LiquidityBooster-Einladung.pdf';
    a.type='application/pdf';
    a.hidden=true;
    document.body.appendChild(a);
    a.click();
    a.remove();
    status('PDF-Download gestartet. Falls Ihr Browser ihn nicht übernimmt, bitte „PDF ansehen“ verwenden und dort speichern.');
  }catch(e){
    status('Speichern konnte nicht gestartet werden: '+(e?.message||e),true);
  }
}

async function shareFile(){
  if(!documentFile)return status('Keine Datei vorhanden.',true);
  try{
    if(await nativeShare())return status('Dateifreigabe geöffnet.');
  }catch(e){
    if(e?.name==='AbortError')return status('Freigabe abgebrochen.');
  }
  status('Direktes Teilen wird in diesem Browser nicht unterstützt. Bitte „PDF ansehen“ öffnen und von dort teilen.',true);
}

async function copyName(){
  if(!documentFile)return;
  const name=documentFile.name||'LiquidityBooster-Einladung.pdf';
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(name);
      return status('Dateiname kopiert.');
    }
  }catch(e){}
  status('Dateiname konnte nicht kopiert werden.',true);
}

window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl)});

window.AkademiePdfUebergabe=Object.freeze({
  version:'AKADEMIE_PDF_UEBERGABE_KARTEN_V2',
  setDocument,
  show,
  hasDocument:()=>!!documentFile
});
})();