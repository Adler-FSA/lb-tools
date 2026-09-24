/**
 * Nebenkosten Premium — Akademie PDF Master Core.
 * Technische Ableitung aus dem freigegebenen HotelPdfEigen V1
 * Quelle: pages/merchant-kompass/hotel-pdf-eigen.js
 * Quell-SHA bei Integration: 1c809c4225be063fd54455171567be2738a96675
 *
 * Gemeinsame Technik: A4-Geometrie, lokale PDF-Bytes, Helvetica/WinAnsi,
 * keine Browser-Druckfunktion, keine externe PDF-Bibliothek.
 * Inhalt und Dokumentlogik liegen bewusst außerhalb dieses Kerns.
 */
export const PDF_MASTER_SOURCE_SHA='1c809c4225be063fd54455171567be2738a96675';
export const PDF_MASTER_VERSION='AKADEMIE_PDF_MASTER_HOTEL_DERIVED_V1';

const PW=595.28,PH=841.89,M=41,W=PW-2*M,BOT=53,TOP=52;
const C={navy:'#132238',mint:'#00a7ad',mag:'#c6006f',ink:'#263545',muted:'#667587',line:'#dbe5e9',soft:'#f5f8f9',pale:'#eaf9f9',pink:'#fff1f7',white:'#ffffff'};
const te=new TextEncoder();
const cp={8364:128,8211:150,8212:151,8216:145,8217:146,8220:147,8221:148,8222:132,8226:149,8230:133,8224:134};
const raw=s=>String(s??'').replace(/\s+/g,' ').trim();
const trans=s=>raw(s).replace(/[\u2190\u2192\u2194]/g,x=>({'←':'<-','→':'->','↔':'<->'}[x])).replace(/\u2212/g,'-').replace(/\u00a0/g,' ');
const rgb=h=>{let s=(C[h]||h||C.ink).replace('#','');return [0,2,4].map(i=>(parseInt(s.slice(i,i+2),16)/255).toFixed(4)).join(' ')};
function bin(s){const a=[];for(const ch of trans(s)){const k=ch.codePointAt(0);a.push(k<=255?k:(cp[k]??63));}return new Uint8Array(a);}
function hx(s){return [...bin(s)].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();}
function join(parts){const out=new Uint8Array(parts.reduce((n,a)=>n+a.length,0));let i=0;for(const a of parts){out.set(a,i);i+=a.length;}return out;}
const enc=s=>te.encode(s);
let canvasContext=null;
function measure(t,z,b=false){
  if(canvasContext===null&&globalThis.document?.createElement){
    try{canvasContext=document.createElement('canvas').getContext('2d');}catch{canvasContext=false;}
  }
  if(canvasContext){canvasContext.font=`${b?'700':'400'} ${z}px Arial`;return canvasContext.measureText(trans(t)).width*1.055;}
  return trans(t).length*z*(b?.56:.53);
}
function split(text,width,z,b=false){
  let words=raw(text).replace(/\u2212/g,'-').split(/\s+/).filter(Boolean),lines=[],s='';
  for(let word of words){
    if(measure(word,z,b)>width){
      if(s){lines.push(s);s='';}
      let part='';
      for(const ch of word){if(part&&measure(part+ch,z,b)>width){lines.push(part);part=ch;}else part+=ch;}
      word=part;
    }
    if(!word)continue;
    const cand=s?s+' '+word:word;
    if(s&&measure(cand,z,b)>width){lines.push(s);s=word;}else s=cand;
  }
  if(s)lines.push(s);
  return lines.length?lines:[''];
}
function centsLabel(value,locale='de-DE'){
  return Number.isSafeInteger(value)?new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'}).format(value/100):'–';
}
export function safePdfFilePart(value,fallback='Dokument'){
  return String(value||fallback).replace(/ß/g,'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||fallback;
}

class PdfWriter{
  constructor({brand='Nebenkosten Premium',brandLine='Akademie Immobilien- & Mietservice',footerText='Nebenkosten Premium',pageWord='Seite'}={}){
    this.pages=[];this.current=null;this.brand=brand;this.brandLine=brandLine;this.footerText=footerText;this.pageWord=pageWord;this.page();
  }
  page(){
    const p={stream:[],y:PH-TOP};this.current=p;this.pages.push(p);
    this.rect(M-8,PH-35,W+16,2,'mint');
    this.logo(M,PH-35);
    this.text(this.brand,M+30,PH-23,9.4,true,'navy');
    this.text(this.brandLine.toUpperCase(),PW-M-205,PH-23,6.7,true,'muted');
    p.y=PH-TOP;
  }
  logo(x,y){
    const sc=.39,xx=u=>x+u*sc,yy=v=>y+(64-v)*sc;
    this.current.stream.push(`q ${rgb('navy')} rg ${xx(32)} ${yy(5)} m ${xx(56)} ${yy(16)} l ${xx(56)} ${yy(34)} l ${xx(56)} ${yy(46)} ${xx(48)} ${yy(55)} ${xx(32)} ${yy(60)} c ${xx(16)} ${yy(55)} ${xx(8)} ${yy(46)} ${xx(8)} ${yy(34)} c ${xx(8)} ${yy(16)} l h f Q\n`);
    this.current.stream.push(`q ${rgb('mint')} RG 2 w ${xx(19)} ${yy(32)} m ${xx(28)} ${yy(41)} l ${xx(46)} ${yy(21)} l S Q\n`);
  }
  rect(x,y,w,h,fill,stroke=null){
    this.current.stream.push(`q ${rgb(fill)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f Q\n`);
    if(stroke)this.current.stream.push(`q ${rgb(stroke)} RG .65 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S Q\n`);
  }
  line(x,y,w,c='line'){this.current.stream.push(`q ${rgb(c)} RG .65 w ${x.toFixed(2)} ${y.toFixed(2)} m ${(x+w).toFixed(2)} ${y.toFixed(2)} l S Q\n`);}
  text(t,x,y,z=9,b=false,color='ink'){if(!raw(t))return;this.current.stream.push(`BT /${b?'F2':'F1'} ${z.toFixed(2)} Tf ${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td <${hx(t)}> Tj ET\n`);}
  ensure(h){if(h>PH-TOP-BOT+1)throw Error('Ein Dokumentblock ist größer als A4.');if(this.current.y-h<BOT)this.page();}
  paragraph(text,{size=9.5,color='ink',bold=false,after=8,width=W-6,x=M+3}={}){
    const lines=split(text,width,size,bold);
    for(const l of lines){this.ensure(size*1.42);this.text(l,x,this.current.y-size,size,bold,color);this.current.y-=size*1.42;}
    this.current.y-=after;
  }
  title(title,subtitle=''){
    const titleLines=split(title,W-34,22,true),subLines=subtitle?split(subtitle,W-34,10.5):[];
    const h=32+titleLines.length*30+subLines.length*15+20;this.ensure(h);
    const y=this.current.y;this.rect(M,y-h,W,h,'pale','line');this.rect(M,y-h,5,h,'mint');
    let yy=y-27;
    for(const l of titleLines){this.text(l,M+17,yy,22,true,'navy');yy-=30;}
    if(subLines.length){yy-=3;for(const l of subLines){this.text(l,M+17,yy,10.5,false,'ink');yy-=15;}}
    this.current.y=y-h-17;
  }
  section(heading,kicker=''){
    const lines=split(heading,W-10,15,true),h=18+lines.length*22+14;this.ensure(h+28);
    if(kicker){this.text(kicker.toUpperCase(),M+2,this.current.y-5,7.8,true,'mag');this.current.y-=20;}
    for(const l of lines){this.text(l,M+2,this.current.y-12,15,true,'navy');this.current.y-=22;}
    this.line(M,this.current.y-2,W,'line');this.current.y-=14;
  }
  keyValues(items){
    const clean=(items||[]).filter(x=>x&&raw(x.label));
    if(!clean.length)return;
    const gap=10,cw=(W-gap)/2;
    for(let i=0;i<clean.length;i+=2){
      const row=clean.slice(i,i+2);
      const heights=row.map(it=>28+split(it.label,cw-24,8.2,true).length*11+split(it.value??'–',cw-24,11.2,true).length*15);
      const h=Math.max(55,...heights);this.ensure(h+10);const y=this.current.y;
      row.forEach((it,j)=>{const x=M+j*(cw+gap);this.rect(x,y-h,cw,h,'soft','line');let yy=y-14;
        for(const l of split(it.label,cw-24,8.2,true)){this.text(l,x+12,yy,8.2,true,'muted');yy-=11;}
        yy-=5;for(const l of split(it.value??'–',cw-24,11.2,true)){this.text(l,x+12,yy,11.2,true,'navy');yy-=15;}
      });
      this.current.y=y-h-10;
    }
  }
  callout(text,theme='mint'){
    const lines=split(text,W-30,9.2),h=lines.length*13+24;this.ensure(h+9);const y=this.current.y;
    this.rect(M,y-h,W,h,theme==='mag'?'pink':'pale','line');this.rect(M,y-h,4,h,theme==='mag'?'mag':'mint');
    lines.forEach((l,i)=>this.text(l,M+14,y-18-i*13,9.2,i===0,'ink'));this.current.y=y-h-11;
  }
  list(items){
    for(const item of items||[]){const lines=split(item,W-26,9.2);this.ensure(lines.length*13+8);this.text('•',M+4,this.current.y-9,9.2,true,'mint');
      lines.forEach((l,i)=>this.text(l,M+18,this.current.y-9-i*13,9.2,false,'ink'));this.current.y-=lines.length*13+7;}
    this.current.y-=3;
  }
  table(headers,rows){
    if(!headers?.length)return;
    const cols=headers.length,colW=W/cols;
    const head=()=>{const hh=34;this.ensure(hh+40);const y=this.current.y;this.rect(M,y-hh,W,hh,'navy');
      headers.forEach((h,i)=>split(h,colW-10,7.2,true).slice(0,3).forEach((l,j)=>this.text(l,M+i*colW+5,y-11-j*9,7.2,true,'white')));
      this.current.y=y-hh;};
    head();
    for(let r=0;r<(rows||[]).length;r++){
      const cells=(rows[r]||[]).map(v=>String(v??''));
      const lineSets=cells.map(v=>split(v,colW-10,7.8));
      const h=Math.max(27,...lineSets.map(a=>a.length*10+11));
      if(this.current.y-h<BOT+3){this.page();head();}
      const y=this.current.y;this.rect(M,y-h,W,h,r%2?'soft':'white','line');
      lineSets.forEach((ls,i)=>ls.forEach((l,j)=>this.text(l,M+i*colW+5,y-12-j*10,7.8,i===0,'ink')));
      this.current.y=y-h;
    }
    this.current.y-=12;
  }
  finish(){
    const n=this.pages.length;
    for(let i=0;i<n;i++){
      const p=this.pages[i];p.stream.push(`q ${rgb('line')} RG .65 w ${M} 39 m ${PW-M} 39 l S Q\n`);
      p.stream.push(`BT /F1 7 Tf ${rgb('muted')} rg ${M} 26 Td <${hx(this.footerText)}> Tj ET\n`);
      p.stream.push(`BT /F1 7 Tf ${rgb('muted')} rg ${PW-M-96} 26 Td <${hx(`${this.pageWord} ${i+1} von ${n}`)}> Tj ET\n`);
    }
    const obj=new Map(),pids=[],cids=[];let id=5;
    for(let i=0;i<n;i++){pids.push(id++);cids.push(id++);}
    obj.set(1,enc('<< /Type /Catalog /Pages 2 0 R >>'));
    obj.set(2,enc(`<< /Type /Pages /Count ${n} /Kids [${pids.map(k=>k+' 0 R').join(' ')}] >>`));
    obj.set(3,enc('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
    obj.set(4,enc('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
    for(let i=0;i<n;i++){
      const stream=enc(this.pages[i].stream.join(''));
      obj.set(pids[i],enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cids[i]} 0 R >>`));
      obj.set(cids[i],join([enc(`<< /Length ${stream.length} >>\nstream\n`),stream,enc('\nendstream')]));
    }
    const header=enc('%PDF-1.4\n%AKADEMIE\n'),parts=[header],ofs=[0];let at=header.length;
    for(let i=1;i<id;i++){ofs[i]=at;const chunks=[enc(`${i} 0 obj\n`),obj.get(i),enc('\nendobj\n')];parts.push(...chunks);at+=chunks.reduce((n,v)=>n+v.length,0);}
    const pos=at;let x=`xref\n0 ${id}\n0000000000 65535 f \n`;
    for(let i=1;i<id;i++)x+=String(ofs[i]).padStart(10,'0')+' 00000 n \n';
    x+=`trailer\n<< /Size ${id} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF`;parts.push(enc(x));
    return join(parts);
  }
}

export async function generateAkademiePdf({
  filename,title,subtitle='',sections=[],footerText='Nebenkosten Premium',
  brand='Nebenkosten Premium',brandLine='Akademie Immobilien- & Mietservice',
  pageWord='Seite',locale='de-DE'
}={}){
  if(!filename||!String(filename).toLowerCase().endsWith('.pdf'))throw new TypeError('Gültiger PDF-Dateiname erforderlich.');
  if(!raw(title))throw new TypeError('Dokumenttitel erforderlich.');
  const writer=new PdfWriter({brand,brandLine,footerText,pageWord});
  writer.title(title,subtitle);
  for(const section of sections||[]){
    if(section?.heading)writer.section(section.heading,section.kicker||'');
    for(const block of section?.blocks||[]){
      if(block.type==='paragraph')writer.paragraph(block.text||'');
      else if(block.type==='key_values')writer.keyValues(block.items||[]);
      else if(block.type==='callout')writer.callout(block.text||'',block.theme||'mint');
      else if(block.type==='list')writer.list(block.items||[]);
      else if(block.type==='table')writer.table(block.headers||[],block.rows||[]);
      else throw new Error('Unbekannter PDF-Inhaltsblock: '+String(block?.type||''));
    }
  }
  const bytes=writer.finish();
  if(bytes.length<100||new TextDecoder().decode(bytes.slice(0,8)).indexOf('%PDF-')!==0)throw new Error('PDF-Erzeugung fehlgeschlagen.');
  const blob=new Blob([bytes],{type:'application/pdf'});
  return {blob,filename:String(filename),pages:writer.pages.length,bytes:bytes.length,engine:PDF_MASTER_VERSION,sourceSha:PDF_MASTER_SOURCE_SHA,locale,centsLabel};
}
