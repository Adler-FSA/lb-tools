(()=>{
'use strict';
/* FSA_PDF_DOCUMENT_EXPORT_V1
   Erzeugt eine echte PDF-Datei aus den bereits paginierten A4-Seiten der
   Notfallakte. Kein window.print(), keine Browser-URL, keine Browser-Kopf-/Fußzeile. */
const VERSION='FSA_PDF_DOCUMENT_EXPORT_V1';
const PAGE_W=794,PAGE_H=1123,SCALE=1.25,JPEG_QUALITY=.91;
const enc=new TextEncoder();
const waitFrame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const bytes=s=>enc.encode(s);
const concat=chunks=>{let n=0;for(const c of chunks)n+=c.length;const out=new Uint8Array(n);let p=0;for(const c of chunks){out.set(c,p);p+=c.length}return out};
const blobToBytes=async b=>new Uint8Array(await b.arrayBuffer());
const dataUrlToBytes=s=>{const b=atob(s.split(',')[1]);const a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
const canvasBlob=(canvas,type,quality)=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Canvas konnte nicht exportiert werden.')),type,quality));

function collectCss(){
  let css='';
  for(const style of document.querySelectorAll('style')) css+='\n'+(style.textContent||'');
  css=css.replaceAll('#printSheet ','.pdfCapture ');
  css+='\n.pdfCapture{font-family:Arial,Helvetica,sans-serif;font-size:10.8pt;line-height:1.4;color:#202b39;background:#fff;width:794px;height:1123px;position:relative;overflow:hidden}.pdfCapture .pPage{width:794px!important;height:1123px!important;min-height:1123px!important;box-sizing:border-box!important;background:#fff!important;overflow:hidden!important;padding:45px 42px 68px!important;margin:0!important;position:relative!important}.pdfCapture .pPageInner{height:930px!important;overflow:hidden!important}.pdfCapture .fsaPdfFooter{position:absolute;left:42px;right:42px;bottom:24px;display:flex;justify-content:space-between;gap:20px;align-items:flex-end;color:#667085;font:11px/1.25 Arial,Helvetica,sans-serif}.pdfCapture .fsaPdfFooterLeft{max-width:62%}.pdfCapture .fsaPdfFooterRight{text-align:right;white-space:nowrap}';
  return css;
}

function pageSvg(page,index,total,dateLabel,css){
  const ns='http://www.w3.org/2000/svg',xh='http://www.w3.org/1999/xhtml';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('xmlns',ns);svg.setAttribute('width',PAGE_W);svg.setAttribute('height',PAGE_H);svg.setAttribute('viewBox',`0 0 ${PAGE_W} ${PAGE_H}`);
  const fo=document.createElementNS(ns,'foreignObject');fo.setAttribute('x','0');fo.setAttribute('y','0');fo.setAttribute('width',String(PAGE_W));fo.setAttribute('height',String(PAGE_H));
  const root=document.createElementNS(xh,'div');root.setAttribute('class','pdfCapture');
  const st=document.createElementNS(xh,'style');st.textContent=css;root.appendChild(st);
  const clone=page.cloneNode(true);clone.removeAttribute('style');
  const footer=document.createElementNS(xh,'div');footer.setAttribute('class','fsaPdfFooter');
  const left=document.createElementNS(xh,'div');left.setAttribute('class','fsaPdfFooterLeft');left.textContent='Akademie für finanzielle Souveränität · Persönliche Notfallvorsorge';
  const right=document.createElementNS(xh,'div');right.setAttribute('class','fsaPdfFooterRight');right.textContent=`${dateLabel} · Seite ${index+1} von ${total}`;
  footer.append(left,right);clone.appendChild(footer);root.appendChild(clone);fo.appendChild(root);svg.appendChild(fo);
  return new XMLSerializer().serializeToString(svg);
}

async function renderPage(page,index,total,dateLabel,css,onProgress){
  const svgText=pageSvg(page,index,total,dateLabel,css);
  const url=URL.createObjectURL(new Blob([svgText],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error(`PDF-Seite ${index+1} konnte nicht gerendert werden.`));img.src=url});
    const canvas=document.createElement('canvas');canvas.width=Math.round(PAGE_W*SCALE);canvas.height=Math.round(PAGE_H*SCALE);
    const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await canvasBlob(canvas,'image/jpeg',JPEG_QUALITY);onProgress?.(index+1,total);return {bytes:await blobToBytes(blob),width:canvas.width,height:canvas.height};
  }finally{URL.revokeObjectURL(url)}
}

function makePdf(images){
  const n=images.length;const pageIds=[],imgIds=[],contentIds=[];let id=3;
  for(let i=0;i<n;i++){pageIds.push(id++);imgIds.push(id++);contentIds.push(id++)}
  const objs=new Map();
  objs.set(1,[bytes('<< /Type /Catalog /Pages 2 0 R >>')]);
  objs.set(2,[bytes(`<< /Type /Pages /Count ${n} /Kids [${pageIds.map(x=>`${x} 0 R`).join(' ')}] >>`)]);
  for(let i=0;i<n;i++){
    const im=images[i],name=`Im${i+1}`;
    objs.set(pageIds[i],[bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /${name} ${imgIds[i]} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`)]);
    objs.set(imgIds[i],[bytes(`<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`),im.bytes,bytes('\nendstream')]);
    const stream=`q\n595.28 0 0 841.89 0 0 cm\n/${name} Do\nQ\n`;objs.set(contentIds[i],[bytes(`<< /Length ${bytes(stream).length} >>\nstream\n${stream}endstream`)]);
  }
  const header=bytes('%PDF-1.4\n%FSA\n');const chunks=[header];let offset=header.length;const offsets=[0];
  for(let i=1;i<id;i++){offsets[i]=offset;const pre=bytes(`${i} 0 obj\n`),post=bytes('\nendobj\n'),parts=objs.get(i)||[bytes('<<>>')];chunks.push(pre,...parts,post);offset+=pre.length+post.length+parts.reduce((s,c)=>s+c.length,0)}
  const xrefOffset=offset;let xref=`xref\n0 ${id}\n0000000000 65535 f \n`;for(let i=1;i<id;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';xref+=`trailer\n<< /Size ${id} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(bytes(xref));return concat(chunks);
}

async function generate({filename,onProgress}={}){
  if(typeof window.optimizePrint==='function') window.optimizePrint();
  else if(typeof window.buildPrint==='function') window.buildPrint();
  await waitFrame();
  const sheet=document.getElementById('printSheet');if(!sheet)throw new Error('PDF-Druckbereich wurde nicht gefunden.');
  let pages=[...sheet.querySelectorAll('.pPage')];
  if(!pages.length){const fallback=document.createElement('div');fallback.className='pPage';const inner=document.createElement('div');inner.className='pPageInner';while(sheet.firstChild)inner.appendChild(sheet.firstChild);fallback.appendChild(inner);sheet.appendChild(fallback);pages=[fallback]}
  pages=pages.filter(p=>(p.textContent||'').trim()||p.querySelector('img,canvas,svg'));
  if(!pages.length)throw new Error('Die Notfallakte enthält keine PDF-Seiten.');
  const css=collectCss(),dateLabel=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()),images=[];
  for(let i=0;i<pages.length;i++)images.push(await renderPage(pages[i],i,pages.length,dateLabel,css,onProgress));
  const pdf=makePdf(images),blob=new Blob([pdf],{type:'application/pdf'});return {blob,filename:filename||'Notfallakte.pdf',pages:pages.length,bytes:pdf.length,version:VERSION};
}
window.NotfallaktePdfExport=Object.freeze({version:VERSION,generate});
})();
