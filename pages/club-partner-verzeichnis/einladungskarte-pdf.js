/* LiquidityBooster Einladungskarten-PDF
 * Echte lokale PDF-Erzeugung. Kein Browserdruck.
 * Ausgabe: A6-Einzelkarte oder A4-Bogen mit 4 identischen A6-Karten.
 */
(()=>{'use strict';
if(window.LBInvitationPdf)return;

const PT_PER_MM=72/25.4;
const A6={w:105*PT_PER_MM,h:148*PT_PER_MM};
const A4={w:210*PT_PER_MM,h:297*PT_PER_MM};

function safeName(s){
  return (String(s||'Club-Partner').trim()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ß/g,'ss').replace(/[^A-Za-z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'').slice(0,70))||'Club-Partner';
}

function cp1252Byte(ch){
  const code=ch.codePointAt(0);
  if(code<=0x7f)return code;
  if(code>=0xa0&&code<=0xff)return code;
  const map={0x20ac:0x80,0x201a:0x82,0x0192:0x83,0x201e:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x02c6:0x88,0x2030:0x89,0x0160:0x8a,0x2039:0x8b,0x0152:0x8c,0x017d:0x8e,0x2018:0x91,0x2019:0x92,0x201c:0x93,0x201d:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x02dc:0x98,0x2122:0x99,0x0161:0x9a,0x203a:0x9b,0x0153:0x9c,0x017e:0x9e,0x0178:0x9f};
  return map[code]??0x3f;
}
function hexText(s){
  let out='';
  for(const ch of String(s??''))out+=cp1252Byte(ch).toString(16).padStart(2,'0').toUpperCase();
  return '<'+out+'>';
}
function n(v){return Number(v).toFixed(2).replace(/\.00$/,'');}

let measureCanvas=null;
function textWidth(text,size,bold=false){
  if(!measureCanvas)measureCanvas=document.createElement('canvas');
  const ctx=measureCanvas.getContext('2d');
  ctx.font=(bold?'700 ':'400 ')+size+'px Arial';
  return ctx.measureText(String(text)).width;
}

function qrMatrix(text){
  if(typeof qrcode!=='function')throw Error('QR-Code-Technik ist nicht verfügbar.');
  const qr=qrcode(0,'M');
  qr.addData(text);
  qr.make();
  const count=qr.getModuleCount(),rows=[];
  for(let r=0;r<count;r++){
    const row=[];
    for(let c=0;c<count;c++)row.push(qr.isDark(r,c));
    rows.push(row);
  }
  return rows;
}

function pdfText(cmd,x,y,size,text,{bold=false,gray=0,align='left'}={}){
  let tx=x;
  if(align==='center')tx=x-textWidth(text,size,bold)/2;
  else if(align==='right')tx=x-textWidth(text,size,bold);
  cmd.push(`BT /${bold?'F2':'F1'} ${n(size)} Tf ${n(gray)} g 1 0 0 1 ${n(tx)} ${n(y)} Tm ${hexText(text)} Tj ET`);
}

function rect(cmd,x,y,w,h,{fill=null,stroke=null,line=0.4}={}){
  if(fill!==null)cmd.push(`${n(fill)} g ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`);
  if(stroke!==null)cmd.push(`${n(stroke)} G ${n(line)} w ${n(x)} ${n(y)} ${n(w)} ${n(h)} re S`);
}

function line(cmd,x1,y1,x2,y2,{gray=0,line=0.4}={}){
  cmd.push(`${n(gray)} G ${n(line)} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`);
}

function drawQr(cmd,matrix,x,y,size){
  const quiet=4,total=matrix.length+quiet*2,module=size/total;
  rect(cmd,x,y,size,size,{fill:1});
  for(let r=0;r<matrix.length;r++){
    for(let c=0;c<matrix.length;c++){
      if(!matrix[r][c])continue;
      const rx=x+(c+quiet)*module;
      const ry=y+size-(r+quiet+1)*module;
      rect(cmd,rx,ry,module+0.05,module+0.05,{fill:0});
    }
  }
}

function drawCard(cmd,x0,y0,partner){
  const cw=A6.w,ch=A6.h;
  const left=x0+26,center=x0+cw/2;

  // Kartenrahmen / Schneidekante
  rect(cmd,x0,y0,cw,ch,{stroke:0.72,line:0.35});

  // Großes Fragezeichen im Hintergrund
  pdfText(cmd,x0+cw-34,y0+ch-102,104,'?',{bold:true,gray:0.88,align:'right'});

  // Headline
  const lines=[
    'WAS WÄRE,',
    'WENN DU ETWAS',
    'ENTDECKST,',
    'DAS DU HEUTE NOCH',
    'NICHT KENNST?'
  ];
  let hy=y0+ch-48;
  for(const s of lines){
    pdfText(cmd,left,hy,17.2,s,{bold:true});
    hy-=19.2;
  }

  // Marke
  pdfText(cmd,left,y0+260,21.5,'LiquidityBooster',{bold:true});
  cmd.push(`0 g ${n(left)} ${n(y0+250)} m ${n(x0+cw-32)} ${n(y0+247)} ${n(x0+cw-38)} ${n(y0+244)} ${n(left)} ${n(y0+250)} c f`);

  // Dreiklang
  pdfText(cmd,left,y0+229,9.1,'Wissen');
  rect(cmd,left+38,y0+231.2,2.2,2.2,{fill:0});
  pdfText(cmd,left+46,y0+229,9.1,'Perspektiven');
  rect(cmd,left+104,y0+231.2,2.2,2.2,{fill:0});
  pdfText(cmd,left+112,y0+229,9.1,'Möglichkeiten');

  // QR
  const matrix=qrMatrix(partner.affiliateUrl);
  const qrSize=101;
  drawQr(cmd,matrix,center-qrSize/2,y0+112,qrSize);

  // Scan-Zeile
  pdfText(cmd,center,y0+91,10.2,'Scannen. Anschauen. Selbst entscheiden.',{bold:true,align:'center'});

  // Absender
  line(cmd,x0+31,y0+76,x0+cw-31,y0+76,{gray:0.68,line:0.45});
  pdfText(cmd,center,y0+59,8.4,'Diese Einladung kommt von:',{align:'center'});
  const name=[partner.firstName,partner.lastName].filter(Boolean).join(' ').trim();
  let nameSize=12.2;
  while(textWidth(name,nameSize,true)>cw-58 && nameSize>9.3)nameSize-=0.4;
  pdfText(cmd,center,y0+39,nameSize,name,{bold:true,align:'center'});
}

function makePdf(pageW,pageH,content){
  const objects=[];
  const add=s=>{objects.push(s);return objects.length};

  const catalogId=add('');
  const pagesId=add('');
  const fontRegularId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const stream=content.join('\n')+'\n';
  const contentId=add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  const pageId=add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${n(pageW)} ${n(pageH)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);

  objects[catalogId-1]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId-1]=`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;

  let pdf='%PDF-1.4\n%LBPDF\n';
  const offsets=[0];
  for(let i=0;i<objects.length;i++){
    offsets.push(pdf.length);
    pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref=pdf.length;
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'});
}

function single(partner){
  const cmd=[];
  drawCard(cmd,0,0,partner);
  const name=safeName([partner.firstName,partner.lastName].filter(Boolean).join('-'));
  return {
    blob:makePdf(A6.w,A6.h,cmd),
    filename:`LiquidityBooster-Einladung-${name}-A6.pdf`,
    pages:1,
    format:'A6'
  };
}

function fourUp(partner){
  const cmd=[];
  const verticalOffset=(A4.h-(2*A6.h))/2;
  drawCard(cmd,0,verticalOffset+A6.h,partner);
  drawCard(cmd,A6.w,verticalOffset+A6.h,partner);
  drawCard(cmd,0,verticalOffset,partner);
  drawCard(cmd,A6.w,verticalOffset,partner);

  // feine zentrale Schneidelinien über den gesamten Bogen
  line(cmd,A6.w,verticalOffset,A6.w,verticalOffset+2*A6.h,{gray:0.55,line:0.25});
  line(cmd,0,verticalOffset+A6.h,A4.w,verticalOffset+A6.h,{gray:0.55,line:0.25});

  const name=safeName([partner.firstName,partner.lastName].filter(Boolean).join('-'));
  return {
    blob:makePdf(A4.w,A4.h,cmd),
    filename:`LiquidityBooster-Einladung-${name}-4er-A4.pdf`,
    pages:1,
    format:'A4'
  };
}

window.LBInvitationPdf=Object.freeze({
  version:'LB_INVITATION_PDF_V1',
  single,
  fourUp
});
})();