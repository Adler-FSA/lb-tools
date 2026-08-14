(()=>{
'use strict';
/* FSA PDF MASTER WRITER
   Produktneutraler Basisbaustein fuer direkte lokale PDF-Erzeugung.
   Kein Browser-Druckdialog, kein Canvas, kein SVG foreignObject. */
const VERSION='FSA_PDF_MASTER_WRITER_V1';
const PW=595.28,PH=841.89;
const te=new TextEncoder();
const ascii=s=>te.encode(s);
const cp={8364:128,8211:150,8212:151,8216:145,8217:146,8220:147,8221:148,8226:149};
const concat=a=>{let n=0;a.forEach(x=>n+=x.length);const o=new Uint8Array(n);let p=0;a.forEach(x=>{o.set(x,p);p+=x.length});return o};
const clean=s=>String(s??'').replace(/[\t\r]+/g,' ').replace(/ +/g,' ').trim();
function bytes(s){const a=[];for(const ch of String(s??'')){const c=ch.codePointAt(0);a.push(c<=255?c:(cp[c]??63))}return new Uint8Array(a)}
const hex=s=>[...bytes(s)].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
function wrap(s,w,z,b=false){const max=Math.max(8,Math.floor(w/(z*(b?.55:.505)))),out=[];for(const para of String(s??'').split(/\n/)){const words=clean(para).split(/\s+/).filter(Boolean);if(!words.length){out.push('');continue}let line='';for(let word of words){while(word.length>max){if(line){out.push(line);line=''}out.push(word.slice(0,max));word=word.slice(max)}const t=line?line+' '+word:word;if(t.length>max&&line){out.push(line);line=word}else line=t}if(line)out.push(line)}return out.length?out:['']}
function makePainter({marginLeft=38,marginRight=38,top=38}={}){let y=PH-top;const c=[];const rgb=x=>`${x[0]} ${x[1]} ${x[2]} rg`;const text=(s,x,yy,z=9,b=false,col=[.11,.15,.2])=>{if(clean(s))c.push(`BT /${b?'F2':'F1'} ${z.toFixed(2)} Tf ${rgb(col)} ${x.toFixed(2)} ${yy.toFixed(2)} Td <${hex(clean(s))}> Tj ET\n`)};const lines=(s,x,w,z=9,b=false,col=[.11,.15,.2],g=1.3)=>{const a=wrap(s,w,z,b);a.forEach(q=>{if(q)text(q,x,y,z,b,col);y-=z*g});return a.length};const fill=(x,yy,w,h,col)=>c.push(`q ${rgb(col)} ${x} ${yy} ${w} ${h} re f Q\n`);const box=(x,yy,w,h,col=[.82,.86,.87],l=.6)=>c.push(`q ${col.join(' ')} RG ${l} w ${x} ${yy} ${w} ${h} re S Q\n`);const rule=(x,yy,w,col=[.82,.86,.87],l=.5)=>c.push(`q ${col.join(' ')} RG ${l} w ${x} ${yy} m ${x+w} ${yy} l S Q\n`);return{c,get y(){return y},set y(v){y=v},text,lines,fill,box,rule,wrap,clean}}
function buildPdf(streams){const n=streams.length;let id=5,pi=[],ci=[];for(let i=0;i<n;i++){pi.push(id++);ci.push(id++)}const o=new Map([[1,ascii('<< /Type /Catalog /Pages 2 0 R >>')],[2,ascii(`<< /Type /Pages /Count ${n} /Kids [${pi.map(x=>x+' 0 R').join(' ')}] >>`)],[3,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')],[4,ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')]]);for(let i=0;i<n;i++){o.set(pi[i],ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${ci[i]} 0 R >>`));o.set(ci[i],concat([ascii(`<< /Length ${streams[i].length} >>\nstream\n`),streams[i],ascii('\nendstream')]))}const h=ascii('%PDF-1.4\n%FSA\n'),chunks=[h],offs=[0];let off=h.length;for(let i=1;i<id;i++){offs[i]=off;const a=ascii(`${i} 0 obj\n`),b=o.get(i),z=ascii('\nendobj\n');chunks.push(a,b,z);off+=a.length+b.length+z.length}const xo=off;let x=`xref\n0 ${id}\n0000000000 65535 f \n`;for(let i=1;i<id;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${id} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`;chunks.push(ascii(x));return concat(chunks)}
window.FsaPdfMasterWriter=Object.freeze({version:VERSION,pageWidth:PW,pageHeight:PH,ascii,clean,wrap,makePainter,buildPdf});
})();
