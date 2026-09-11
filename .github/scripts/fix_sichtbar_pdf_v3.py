from pathlib import Path
import re

FILES = {
    Path('pages/gastredner-15-minuten/index.html'): ('15', 'load();i18n();buildMondays();load();'),
    Path('pages/gastredner-30-minuten/index.html'): ('30', 'load();i18n();buildMondays();load();'),
    Path('pages/leitartikel-vorbereitung/index.html'): ('article', 'load();i18n();'),
}

COMMON = r'''
let pendingPdfUrl='';
function pdfDateStamp(d=new Date()){const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function applyPdfIdentity(filename){
  const base=filename.replace(/\.pdf$/i,'');
  document.title=base;
  document.documentElement.setAttribute('data-lb-pdf-filename',filename);
  try{sessionStorage.setItem('lb_sichtbar_pdf_filename',filename)}catch(e){}
  let meta=document.querySelector('meta[name="application-name"]');
  if(!meta){meta=document.createElement('meta');meta.name='application-name';document.head.appendChild(meta)}
  meta.content=base;
}
function pdfDownloadBox(){
  let box=document.getElementById('lbPdfDownloadBox');
  if(box)return box;
  box=document.createElement('section');
  box.id='lbPdfDownloadBox';
  box.className='card section';
  const sticky=document.querySelector('.sticky');
  if(sticky)sticky.insertAdjacentElement('beforebegin',box);else document.querySelector('.shell')?.appendChild(box);
  return box;
}
function offerNamedPdf(filename,pdfBlob){
  applyPdfIdentity(filename);
  if(pendingPdfUrl)URL.revokeObjectURL(pendingPdfUrl);
  const deliveryBlob=new Blob([pdfBlob],{type:'application/octet-stream'});
  pendingPdfUrl=URL.createObjectURL(deliveryBlob);
  const box=pdfDownloadBox();
  box.innerHTML='';
  const head=document.createElement('div');head.className='head';
  const body=document.createElement('div');body.className='body';
  const kicker=document.createElement('div');kicker.className='kicker';kicker.textContent=lang==='de'?'PDF erfolgreich erstellt':'PDF successfully created';
  const h2=document.createElement('h2');h2.textContent=lang==='de'?'Jetzt die fertige PDF herunterladen':'Download the finished PDF now';
  const p=document.createElement('p');p.textContent=lang==='de'?'Prüfe den Dateinamen und klicke erst jetzt auf den Download-Button. Die PDF wurde lokal erzeugt – ohne Drucker-Dialog.':'Check the filename and only then click the download button. The PDF was generated locally – without a print dialog.';
  head.append(kicker,h2,p);
  const call=document.createElement('div');call.className='callout';
  const label=document.createElement('b');label.textContent=lang==='de'?'Dateiname:':'Filename:';
  const file=document.createElement('div');file.style.cssText='margin-top:6px;font-weight:800;word-break:break-all;color:#132238';file.textContent=filename;
  call.append(label,file);
  const actions=document.createElement('div');actions.className='actions';
  const a=document.createElement('a');a.className='btn primary';a.style.textDecoration='none';a.textContent=lang==='de'?'PDF herunterladen / speichern':'Download / save PDF';a.href=pendingPdfUrl;a.download=filename;a.setAttribute('type','application/pdf');
  a.addEventListener('click',()=>setTimeout(()=>notice(lang==='de'?'PDF-Download gestartet. Bitte speichere die Datei unter dem angezeigten Namen und sende sie anschließend an ceo@liquiditybooster.de zu Händen von Michael Rau.':'PDF download started. Please save the file with the displayed name and then send it to ceo@liquiditybooster.de for the attention of Michael Rau.','ok'),80));
  actions.appendChild(a);body.append(call,actions);box.append(head,body);box.scrollIntoView({behavior:'smooth',block:'start'});
}
window.addEventListener('pagehide',()=>{if(pendingPdfUrl)URL.revokeObjectURL(pendingPdfUrl)});
'''

HANDLERS = {
    '15': "$('pdf').onclick=()=>{if(!validate())return;save();const created=pdfDateStamp(),wish=val('date1')||'ohne-Wunschdatum',filename=`LiquidityBooster-Auftrag-Gastredner-15min-${safe(val('name'))}-Wunsch-${wish}-Erstellt-${created}.pdf`;offerNamedPdf(filename,buildPdf());notice(lang==='de'?'PDF wurde erstellt. Bitte prüfe jetzt den Dateinamen und nutze den separaten Download-Button.':'PDF created. Please check the filename and use the separate download button.','ok')};\n",
    '30': "$('pdf').onclick=()=>{if(!validate())return;save();const created=pdfDateStamp(),wish=v('date1')||'ohne-Wunschdatum',filename=`LiquidityBooster-Auftrag-Gastredner-30min-${safe(v('name'))}-Wunsch-${wish}-Erstellt-${created}.pdf`;offerNamedPdf(filename,buildPdf());notice(lang==='de'?'PDF wurde erstellt. Bitte prüfe jetzt den Dateinamen und nutze den separaten Download-Button.':'PDF created. Please check the filename and use the separate download button.','ok')};\n",
    'article': "$('pdf').onclick=()=>{if(!validate())return;save();const created=pdfDateStamp(),filename=`LiquidityBooster-Auftrag-Leitartikel-${safe(v('name'))}-Erstellt-${created}.pdf`;offerNamedPdf(filename,buildPdf());notice(lang==='de'?'PDF wurde erstellt. Bitte prüfe jetzt den Dateinamen und nutze den separaten Download-Button.':'PDF created. Please check the filename and use the separate download button.','ok')};\n",
}

for path, (kind, tail_marker) in FILES.items():
    text = path.read_text(encoding='utf-8')
    if 'offerNamedPdf(filename,pdfBlob)' in text:
        print('already patched', path)
        continue
    start = text.find('function safe(')
    if start < 0:
        raise SystemExit(f'{path}: safe() start not found')
    tail_pos = text.find(tail_marker, start)
    if tail_pos < 0:
        raise SystemExit(f'{path}: tail marker not found')
    old_dl = text.find('function dl(', start)
    if old_dl < 0:
        raise SystemExit(f'{path}: old dl() not found')
    safe_code = text[start:old_dl]
    replacement = safe_code + COMMON + HANDLERS[kind]
    text = text[:start] + replacement + text[tail_pos:]
    path.write_text(text, encoding='utf-8')
    print('patched', path)

for path in FILES:
    text = path.read_text(encoding='utf-8')
    tail = text[text.find('function safe('):]
    if 'a.click()' in tail:
        raise SystemExit(f'{path}: automatic PDF click still present')
    if 'offerNamedPdf' not in text or 'PDF herunterladen / speichern' not in text:
        raise SystemExit(f'{path}: named V3 handoff missing')
    if "application/octet-stream" not in text:
        raise SystemExit(f'{path}: iPad/WebKit delivery wrapper missing')
    if 'window.print(' in text:
        raise SystemExit(f'{path}: browser print call found')

print('Sichtbar werden PDF V3 patch verified')
