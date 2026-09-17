/* Akademie PDF-Uebergabe v1: ausschliesslich die BEREITS erzeugte PDF bereitstellen.
 * Kein PDF-Rendering, kein Server, kein Service Worker, kein Druckdialog.
 * Die Wahl des Speicherorts bleibt eine Berechtigung des Browsers/Betriebssystems.
 */
(()=>{'use strict';
if(window.AkademiePdfUebergabe)return;
let documentFile=null,metadata=null,modal=null,previousFocus=null,downloadUrl='';
const style=document.createElement('style');style.textContent=`
.ak-pdf-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(9,20,34,.73);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}
.ak-pdf-backdrop[hidden]{display:none!important}.ak-pdf-dialog{width:min(560px,100%);max-height:min(90vh,920px);overflow:auto;background:#fff;border:1px solid #cfe0e6;border-radius:22px;box-shadow:0 25px 80px #0005;padding:24px;color:#132238;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
.ak-pdf-dialog *{box-sizing:border-box}.ak-pdf-top{display:flex;justify-content:space-between;gap:12px;align-items:start}.ak-pdf-eyebrow{font-size:12px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#008e96}.ak-pdf-dialog h2{font-size:clamp(22px,4vw,28px);margin:4px 0 8px;line-height:1.2}.ak-pdf-close{border:1px solid #d3e1e7;background:#fff;color:#132238;border-radius:10px;padding:7px 12px;cursor:pointer;font:inherit;font-weight:700}.ak-pdf-file{margin:18px 0;background:#f1fafb;border:1px solid #d1e6e9;border-left:5px solid #00a7ad;border-radius:15px;padding:17px;overflow-wrap:anywhere}.ak-pdf-file strong{font-size:16px;display:block}.ak-pdf-detail{font-size:13px;color:#536778;margin-top:6px}.ak-pdf-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ak-pdf-action{border:0;border-radius:11px;padding:13px 10px;background:#132238;color:#fff;cursor:pointer;font:inherit;font-weight:800}.ak-pdf-action.primary{background:#008e98}.ak-pdf-action:disabled{opacity:.45;cursor:not-allowed}.ak-pdf-action.copy{background:#e8f1f3;color:#132238;grid-column:1/-1}.ak-pdf-notice{font-size:13px;color:#44586b;margin:14px 0 0}.ak-pdf-status{font-size:13px;margin:10px 0 0;color:#007c74;min-height:19px}.ak-pdf-status.error{color:#b00045}@media(max-width:480px){.ak-pdf-dialog{padding:17px;border-radius:17px}.ak-pdf-actions{grid-template-columns:1fr}.ak-pdf-action.copy{grid-column:auto}}`;
document.head.appendChild(style);
function elem(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function makeDialog(){if(modal)return;
 modal=elem('div','ak-pdf-backdrop');modal.hidden=true;
 const box=elem('section','ak-pdf-dialog');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','akPdfHeading');
 const top=elem('div','ak-pdf-top'),header=elem('div');header.append(elem('div','ak-pdf-eyebrow','Akademie · fertiges Dokument'));
 const title=elem('h2','','Ihre PDF ist fertig');title.id='akPdfHeading';header.append(title);
 const close=elem('button','ak-pdf-close','Schließen');close.type='button';close.addEventListener('click',hide);top.append(header,close);
 const file=elem('div','ak-pdf-file');const filename=elem('strong');filename.id='akPdfFilename';const detail=elem('div','ak-pdf-detail');detail.id='akPdfDetails';file.append(filename,detail);
 const actions=elem('div','ak-pdf-actions'),save=elem('button','ak-pdf-action primary','Speichern');save.type='button';save.id='akPdfSave';save.addEventListener('click',saveFile);
 const share=elem('button','ak-pdf-action','Teilen');share.type='button';share.id='akPdfShare';share.addEventListener('click',shareFile);
 const copy=elem('button','ak-pdf-action copy','Dateinamen kopieren');copy.type='button';copy.id='akPdfCopy';copy.addEventListener('click',copyName);
 actions.append(save,share,copy);
 const notice=elem('p','ak-pdf-notice');notice.id='akPdfNotice';const status=elem('p','ak-pdf-status');status.id='akPdfStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 box.append(top,file,actions,notice,status);modal.append(box);document.body.append(modal);
 modal.addEventListener('click',ev=>{if(ev.target===modal)hide();});
 document.addEventListener('keydown',ev=>{if(modal&&!modal.hidden&&ev.key==='Escape'){ev.preventDefault();hide();}if(modal&&!modal.hidden&&ev.key==='Tab'){const controls=[...modal.querySelectorAll('button:not([disabled])')];if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}}});
}
function status(message,isError=false){const el=document.getElementById('akPdfStatus');if(!el)return;el.textContent=message;el.classList.toggle('error',isError);}
function canShare(){try{return !!(documentFile&&navigator.share&&navigator.canShare&&navigator.canShare({files:[documentFile]}));}catch(e){return false;}}
function show(){if(!documentFile)throw Error('Es liegt noch keine fertige PDF vor.');makeDialog();previousFocus=document.activeElement;
 document.getElementById('akPdfFilename').textContent=documentFile.name;
 document.getElementById('akPdfDetails').textContent=[metadata?.origin||'Von dieser Seite erstellt',metadata?.pages?metadata.pages+' A4-Seiten':'',metadata?.created||''].filter(Boolean).join(' · ');
 const picker=typeof window.showSaveFilePicker==='function',sharing=canShare();document.getElementById('akPdfShare').disabled=!sharing;
 document.getElementById('akPdfNotice').textContent=picker?'Speichern öffnet die Ordnerauswahl Ihres Geräts.':sharing?'Speichern und Teilen übergeben die fertige, benannte PDF an die Dateifreigabe Ihres Geräts. Dort „In Dateien sichern“ oder einen anderen Speicherort wählen.':'Dieser Browser bietet weder eine Ordnerauswahl noch die Dateifreigabe für PDF-Dateien an. Speichern nutzt deshalb seinen normalen Download. Der Browser kann den Dateinamen dabei abweichend vergeben.';
 status('Die fertig erzeugte Datei liegt nur vorübergehend in dieser geöffneten Seite.');modal.hidden=false;document.body.style.setProperty('--ak-pdf-modal-open','1');document.getElementById('akPdfSave').focus();
}
function hide(){if(!modal)return;modal.hidden=true;previousFocus?.focus?.();}
function setDocument(result){if(!result?.blob||!(result.blob instanceof Blob)||!result.filename||result.blob.size===0)throw Error('Der Generator hat keine gueltige fertige Datei geliefert.');
 const filename=String(result.filename).replace(/[\\/\x00-\x1f<>:"|?*]/g,'_').trim();if(!filename.toLowerCase().endsWith('.pdf'))throw Error('Der PDF-Dateiname ist nicht gueltig.');
 documentFile=new File([result.blob],filename,{type:'application/pdf'});metadata={pages:result.pages,origin:result.origin||'Hotel-Gesprächsseite · tools.liquiditybooster.de',created:new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date())};
 show();return {filename:documentFile.name,bytes:documentFile.size};
}
async function saveFile(){if(!documentFile)return status('Keine Datei vorhanden.',true);
 if(typeof window.showSaveFilePicker==='function'){
  try{const handle=await window.showSaveFilePicker({suggestedName:documentFile.name,types:[{description:'PDF-Dokument',accept:{'application/pdf':['.pdf']}}]});const writable=await handle.createWritable();await writable.write(documentFile);await writable.close();return status('PDF unter dem gewählten Dateinamen gespeichert.');}
  catch(e){if(e?.name==='AbortError')return status('Speichern abgebrochen.');return status('Speichern fehlgeschlagen: '+(e?.message||e),true);}
 }
 if(canShare())return shareFile();
 // Letzter Fallback: keine falsche Garantie fuer die Namensvergabe von Firefox/iOS.
 if(!downloadUrl)downloadUrl=URL.createObjectURL(documentFile);
 const link=elem('a');link.href=downloadUrl;link.download=documentFile.name;link.type='application/pdf';link.hidden=true;document.body.appendChild(link);link.click();link.remove();status('Browser-Download gestartet. Bitte Dateinamen und Inhalt der gespeicherten Datei kontrollieren.');
}
function shareFile(){if(!documentFile)return status('Keine Datei vorhanden.',true);if(!canShare())return status('Dateifreigabe für PDF-Dateien wird hier nicht unterstützt.',true);
 try{const task=navigator.share({files:[documentFile],title:documentFile.name});Promise.resolve(task).then(()=>status('Datei an die Gerätefreigabe übergeben. Bitte prüfen, ob sie gespeichert wurde.')).catch(e=>{if(e?.name==='AbortError')return status('Freigabe abgebrochen.');status('Dateifreigabe fehlgeschlagen: '+(e?.message||e),true);});}catch(e){status('Dateifreigabe fehlgeschlagen: '+(e?.message||e),true);}
}
function copyName(){if(!documentFile)return;const text=documentFile.name;if(!navigator.clipboard?.writeText)return status('Dateinamen-Kopieren wird von diesem Browser nicht unterstützt.',true);navigator.clipboard.writeText(text).then(()=>status('Dateiname kopiert.')).catch(()=>status('Dateiname konnte nicht kopiert werden.',true));}
window.AkademiePdfUebergabe=Object.freeze({version:'AKADEMIE_PDF_UEBERGABE_TEST_V1',setDocument,show,hasDocument:()=>!!documentFile});
})();