(()=>{
'use strict';
const MODE_KEY='lb_notfallakte_v08_mode';
const q=s=>document.querySelector(s);
const clone=o=>JSON.parse(JSON.stringify(o));

function showDemoTraining(){
  demoMode=true;
  state=merge(clone(demo));
  localStorage.setItem(MODE_KEY,'demo');
  fill();
  render();
  q('#demoBanner')?.classList.add('show');
  const box=q('#v08DemoTraining'); if(box) box.style.display='block';
  const st=q('#v08BackupStatus'); if(st){st.className='v08Status ok';st.innerHTML='<strong>Demo-Sicherungstraining aktiv ✓</strong><span>Erstelle eine DEMO-Sicherung, speichere sie und lies sie anschließend wieder ein. Genau so funktioniert später die Sicherung deiner eigenen Notfallakte.</span>'}
  flash('Demo wurde geöffnet ✓');
}
function showOwn(){
  localStorage.setItem(MODE_KEY,'own');
  q('#demoBanner')?.classList.remove('show');
  load();
  const box=q('#v08DemoTraining'); if(box) box.style.display='none';
  flash('Eigene Notfallakte wurde geöffnet ✓');
}
function ensureTrainingBox(){
  if(q('#v08DemoTraining'))return;
  const actions=q('.v08Actions'); if(!actions)return;
  const d=document.createElement('div');
  d.id='v08DemoTraining'; d.className='learn'; d.style.marginTop='16px';
  d.innerHTML='<strong>Demo-Sicherungstraining:</strong> Hier kannst du den vollständigen Sicherungsablauf gefahrlos mit Daniel Muster üben.<span class="why">1. DEMO-Sicherung erstellen. 2. Datei über „In Dateien sichern“ ablegen. 3. Demo-Excel ansehen. 4. Die DEMO-JSON über „Sicherung wiederherstellen“ wieder einlesen. Deine persönliche Notfallakte wird dabei nicht verändert.</span>';
  actions.parentNode.insertBefore(d,actions);
}
function installRestoreTraining(){
  const input=q('#v08JsonImport'); if(!input)return;
  input.onchange=e=>{
    const file=e.target.files?.[0]; e.target.value=''; if(!file)return;
    flash('Sicherungsdatei ausgewählt – Prüfung läuft …');
    const r=new FileReader();
    r.onload=async()=>{try{
      const pack=JSON.parse(String(r.result));
      if(!pack||pack.schema!=='lb-notfallakte-v8'||!pack.data||typeof pack.data!=='object')throw new Error('schema');
      if(demoMode){
        if(!pack.demo){alert('Diese Datei gehört zu einer persönlichen Notfallakte. In der Demo können nur DEMO-Sicherungen eingelesen werden.');return}
        if(!confirm('Diese DEMO-Sicherung jetzt testweise wiederherstellen? Die persönlichen Daten bleiben davon unberührt.'))return;
        state=merge(pack.data); demoMode=true; localStorage.setItem(MODE_KEY,'demo'); fill(); render(); q('#demoBanner')?.classList.add('show');
        flash('Demo-Sicherung erfolgreich wiederhergestellt ✓'); return;
      }
      if(pack.demo){alert('Eine DEMO-Sicherung kann nicht in deine persönliche Notfallakte eingelesen werden. Öffne dafür zuerst die Demo.');return}
      if(!confirm('Diese Sicherung wiederherstellen? Der aktuelle Stand dieser Notfallakte wird dadurch ersetzt.'))return;
      state=merge(pack.data); state.updatedAt=new Date().toISOString(); localStorage.setItem(KEY,JSON.stringify(state)); demoMode=false; localStorage.setItem(MODE_KEY,'own'); fill(); render(); status(); flash('Vollständige Sicherung wiederhergestellt ✓');
    }catch(err){alert('Diese Datei ist keine gültige Sicherung der Notfallakte Version 08.') }};
    r.readAsText(file,'utf-8');
  };
}
function xmlEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[m]))}
function colName(n){let s='';for(;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255])}function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
function cat(parts){let len=parts.reduce((a,b)=>a+b.length,0),o=new Uint8Array(len),p=0;parts.forEach(b=>{o.set(b,p);p+=b.length});return o}
const CRC=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=CRC[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zipStore(files){const te=new TextEncoder(),locals=[],centrals=[];let offset=0;for(const f of files){const name=te.encode(f.name),data=typeof f.data==='string'?te.encode(f.data):f.data,crc=crc32(data);const lh=cat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name]);locals.push(lh,data);const ch=cat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);centrals.push(ch);offset+=lh.length+data.length}const central=cat(centrals),body=cat(locals),end=cat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(body.length),u16(0)]);return new Blob([body,central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
function sheetXML(rows){const maxCols=Math.max(1,...rows.map(r=>r.length)),widths=[];for(let c=0;c<maxCols;c++){let m=12;for(const r of rows){const v=String(r[c]??'');m=Math.max(m,Math.min(38,Math.max(...v.split(/\n/).map(x=>x.length),0)+3))}widths[c]=Math.min(c===0?32:38,m)}let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>';widths.forEach((w,i)=>x+=`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`);x+='</cols><sheetData>';rows.forEach((row,ri)=>{x+=`<row r="${ri+1}" ht="${ri===0?27:34}" customHeight="1">`;row.forEach((v,ci)=>{const ref=colName(ci+1)+(ri+1);x+=`<c r="${ref}" t="inlineStr" s="${ri===0?1:2}"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`});x+='</row>'});return x+'</sheetData></worksheet>'}
function fileStamp(d=new Date()){const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`}
function safeName(s){return(String(s||'notfallakte').trim().replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g,'-').replace(/^-+|-+$/g,'')||'notfallakte')}
function sendFile(blob,name){const f=new File([blob],name,{type:blob.type,lastModified:Date.now()}),ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(ios&&navigator.share&&navigator.canShare?.({files:[f]})){flash('Datei ist vorbereitet – wähle im Teilen-Menü „In Dateien sichern“ ✓');navigator.share({files:[f]}).catch(()=>{});return}const a=document.createElement('a'),u=URL.createObjectURL(f);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function makeSheets(){readTop();const msg=state.messageMode==='academy'?academy:state.messageMode==='both'?academy+'\n\n'+state.ownWords:state.ownWords;const top=[['Bereich','Angabe'],['Name',state.owner],['Vertrauensperson / Familie',state.trusted],['Was soll meine Familie zuerst wissen?',state.generalNote],['Testament vorhanden?',state.testamentExists==='yes'?'Ja':state.testamentExists==='no'?'Nein':''],['Fundort Testament',state.testamentLocation],['Notar / Kanzlei / Verwahrstelle',state.notary],['Kontakt Notar',state.notaryContact],['Zuständige Stelle / Testamentseröffnung',state.opening],['Persönliche Worte',msg],['Ort',state.place],['Datum',state.reviewDate],['Unterschriftsmodus',state.signatureMode==='paper'?'Nach dem Ausdruck handschriftlich unterschreiben':state.signatureMode==='digital'?'Digital unterschrieben':state.signatureMode||''],['Digitale Unterschrift vorhanden?',state.signatureData?'Ja':'Nein']];const names=['Übersicht','Projekte','Zugänge','Geräte & 2FA','Bankkonten','Wallets','Digital','Ansprechpartner','Verträge','Offene Themen'],out=[{name:names[0],rows:top}];schemas.forEach((s,i)=>{const fs=s[3],rows=[fs.map(f=>f[1])];(state[s[0]]||[]).forEach(r=>rows.push(fs.map(f=>f[2]==='select'?(r[f[0]]==='high'?'Sofort beachten':r[f[0]]==='mid'?'In den nächsten Tagen':r[f[0]]==='low'?'Später in Ruhe':''):r[f[0]]||'')));out.push({name:names[i+1],rows})});return out}
function exportPrettyExcel(){flash(demoMode?'Demo: Excel-Datei wird erstellt …':'Excel-Datei wird erstellt …');const sheets=makeSheets(),files=[];let overrides='',sh='',rels='';sheets.forEach((s,i)=>{overrides+=`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;sh+=`<sheet name="${xmlEsc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`;rels+=`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`;files.push({name:`xl/worksheets/sheet${i+1}.xml`,data:sheetXML(s.rows)})});files.push({name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`});files.push({name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'});rels+=`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;files.push({name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sh}</sheets></workbook>`});files.push({name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`});files.push({name:'xl/styles.xml',data:'<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF132238"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>'});sendFile(zipStore(files),`${demoMode?'DEMO-':''}Notfallakte-${safeName(state.owner)}-Uebersicht-${fileStamp()}.xlsx`);setTimeout(()=>flash(demoMode?'Demo-Excel wurde erstellt ✓':'Excel-Übersicht erstellt ✓'),150)}
function boot(){ensureTrainingBox();if(q('#demoBtn'))q('#demoBtn').onclick=showDemoTraining;if(q('#ownBtn'))q('#ownBtn').onclick=showOwn;installRestoreTraining();if(q('#v08Excel'))q('#v08Excel').onclick=exportPrettyExcel;const mode=localStorage.getItem(MODE_KEY);if(mode!=='own')showDemoTraining();else{const box=q('#v08DemoTraining');if(box)box.style.display='none'}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
})();