from pathlib import Path
import re

html_path=Path('pages/vertraege/club-partner.html')
s=html_path.read_text(encoding='utf-8')

s=s.replace('<script src="./fsa-contract-pdf-engine.js"></script>','<script src="./contract-pdf-engine-v1.js?v=1"></script>')
s=s.replace('Die PDF wird direkt durch die FSA Contract PDF Engine erzeugt - ohne Browser-Druckdialog.','Die PDF wird direkt aus dem aktuellen Vertragstext dieser Seite und den eingegebenen Vertragsdaten erzeugt - ohne Browser-Druckdialog.')
s=s.replace('The PDF is generated directly by the FSA Contract PDF Engine - without a browser print dialog.','The PDF is generated directly from the current contract text on this page and the entered contract data - without a browser print dialog.')

s,n=re.subn(r"function pdfBlocks\(blank\)\{.*?\}\nfunction showError",'function showError',s,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'SCHUTZSTOPP: pdfBlocks nicht eindeutig entfernt ({n})')

new_create="""async function createPdf(blank){
  $('#formError').classList.remove('show');
  if(!window.FSAContractPdfEngine||window.FSAContractPdfEngine.version!=='FSA_CONTRACT_PDF_ENGINE_V1'){
    showError(lang==='de'?'Vertrags-PDF-Engine konnte nicht geladen werden.':'Contract PDF engine could not be loaded.');return
  }
  if(!blank&&!validateFilled())return;
  const signer=blank?'Leer':$('#signerName').value.trim();
  const filename=(lang==='de'?'Club-Partner-Vertrag-':'Club-Partner-Agreement-')+window.FSAContractPdfEngine.safeFilePart(signer)+'.pdf';
  const controls=$$('input,textarea,select');
  const snapshot=blank?controls.map(el=>({el,value:el.value,checked:el.checked})):null;
  try{
    if(blank){controls.forEach(el=>{if(el.type==='checkbox'||el.type==='radio')el.checked=false;else el.value=''});updatePartyPreview()}
    const result=await window.FSAContractPdfEngine.generate({
      contentRoot:'.paper',
      fieldsRoot:'#partnerForm',
      fieldsTitle:ui[lang]['form.title'],
      footerText:lang==='de'?'Club-Partner-Vereinbarung · LiquidityBooster':'Club Partner Agreement · LiquidityBooster',
      filename
    });
    if(currentUrl)URL.revokeObjectURL(currentUrl);
    currentUrl=URL.createObjectURL(result.blob);
    const a=$('#downloadLink');a.href=currentUrl;a.download=filename;
    $('#downloadInfo').textContent=(lang==='de'?`PDF erstellt: ${result.pages} Seiten · `:`PDF created: ${result.pages} pages · `)+filename;
    $('#downloadState').classList.add('show');
    setTimeout(()=>$('#downloadState').scrollIntoView({behavior:'smooth',block:'nearest'}),20)
  }catch(err){
    console.error(err);
    showError((lang==='de'?'PDF-Erstellung fehlgeschlagen: ':'PDF creation failed: ')+(err&&err.message?err.message:err))
  }finally{
    if(snapshot){snapshot.forEach(x=>{x.el.value=x.value;x.el.checked=x.checked});updatePartyPreview()}
  }
}"""

pattern=r"async function createPdf\(blank\)\{.*?\}\n\$\('#blankPdfBtn'\)"
s,n=re.subn(pattern,new_create+"\n$('#blankPdfBtn')",s,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'SCHUTZSTOPP: createPdf nicht eindeutig ersetzt ({n})')

required=[
    '<script src="./contract-pdf-engine-v1.js?v=1"></script>',
    "contentRoot:'.paper'",
    "fieldsRoot:'#partnerForm'",
    'window.FSAContractPdfEngine'
]
for needle in required:
    if needle not in s:
        raise SystemExit('SCHUTZSTOPP: fehlt: '+needle)

for needle in ['function pdfBlocks(','window.FsaContractPdf','./fsa-contract-pdf-engine.js','../notfallakte/','NotfallaktePdfExport']:
    if needle in s:
        raise SystemExit('SCHUTZSTOPP: alte PDF-Verdrahtung verbleibt: '+needle)

html_path.write_text(s,encoding='utf-8')
print('Club-Partner-Vertrag direkt auf generische DOM-PDF-Engine umgestellt.')
