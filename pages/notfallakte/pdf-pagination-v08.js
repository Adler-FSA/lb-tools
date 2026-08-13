/* V08 PDF pagination fix – browserübergreifende A4-Seitenbelegung ohne Leerseiten. */
(function(){
  'use strict';
  if(typeof window.buildPrint!=='function') return;

  function installPdfStyles(){
    let s=document.getElementById('pdfPaginationV08');
    if(s) return s;
    s=document.createElement('style');
    s.id='pdfPaginationV08';
    s.textContent=`
.pPage{width:794px;box-sizing:border-box;background:#fff;overflow:hidden;padding:45px 42px 53px}
.pPageInner{height:930px;overflow:hidden}
.pContinue{font-size:9.4pt;font-weight:800;color:#667085;margin:0 0 6px}
.pValue{hyphens:none!important;-webkit-hyphens:none!important;overflow-wrap:anywhere;word-break:normal!important}
@media print{
  @page{size:A4;margin:0!important}
  .printSheet{display:block!important}
  .pPage{width:210mm!important;height:auto!important;min-height:0!important;padding:12mm 11mm 14mm!important;box-sizing:border-box!important;overflow:visible!important;break-before:auto!important;page-break-before:auto!important;break-after:page!important;page-break-after:always!important}
  .pPage:last-child{break-after:auto!important;page-break-after:auto!important}
  .pPageInner{height:auto!important;min-height:0!important;overflow:visible!important}
  .pSection,.pRecord,.pItem,.pCallout,.pSafety,.pMessage{break-inside:avoid;page-break-inside:avoid}
}
`;
    document.head.appendChild(s);
    return s;
  }

  function cleanOldEngine(){
    const old=document.getElementById('pdfEngineV07');
    if(old) old.remove();
    installPdfStyles();
  }

  window.optimizePrint=function(){
    buildPrint();
    cleanOldEngine();
    const sheet=document.getElementById('printSheet');
    if(!sheet) return;

    const source=[...sheet.children].map(n=>n.cloneNode(true));
    sheet.innerHTML='';
    sheet.style.display='block';
    sheet.style.position='absolute';
    sheet.style.left='-100000px';
    sheet.style.top='0';
    sheet.style.width='794px';

    let page=null,inner=null;
    const newPage=()=>{
      page=document.createElement('div');
      page.className='pPage';
      inner=document.createElement('div');
      inner.className='pPageInner';
      page.appendChild(inner);
      sheet.appendChild(page);
    };
    newPage();

    const isEmptyPage=()=>!inner || ![...inner.children].some(n=>{
      const t=(n.textContent||'').trim();
      return t || n.querySelector?.('img,canvas,svg');
    });

    const fits=node=>{
      inner.appendChild(node);
      const ok=inner.scrollHeight<=930;
      inner.removeChild(node);
      return ok;
    };

    const appendAtomic=node=>{
      if(fits(node)){
        inner.appendChild(node);
        return;
      }
      if(!isEmptyPage()) newPage();
      if(fits(node)){
        inner.appendChild(node);
        return;
      }
      inner.appendChild(node);
    };

    const continuationHead=head=>{
      const h=head.cloneNode(true);
      const num=h.querySelector('.pNum');
      if(num) num.textContent='';
      const txt=[...h.childNodes].find(n=>n.nodeType===3 && n.textContent.trim());
      if(txt) txt.textContent=txt.textContent.replace(/\s*–\s*Fortsetzung\s*$/,'')+' – Fortsetzung';
      else h.appendChild(document.createTextNode(' – Fortsetzung'));
      return h;
    };

    const makeSection=(head,children,continued=false)=>{
      const sec=document.createElement('section');
      sec.className='pSection';
      sec.appendChild(continued?continuationHead(head):head.cloneNode(true));
      const body=document.createElement('div');
      body.className='pBody';
      children.forEach(x=>body.appendChild(x.cloneNode(true)));
      sec.appendChild(body);
      return sec;
    };

    const packRecords=(head,records,extras)=>{
      let continued=false;
      let bucket=[];
      const flush=()=>{
        if(!bucket.length) return;
        let sec=makeSection(head,bucket,continued);
        if(!fits(sec) && !isEmptyPage()) newPage();
        sec=makeSection(head,bucket,continued);
        inner.appendChild(sec);
        continued=true;
        bucket=[];
      };

      for(const rec of records){
        const trial=makeSection(head,[...bucket,rec],continued);
        if(fits(trial)){
          bucket.push(rec);
          continue;
        }
        if(bucket.length) flush();

        const single=makeSection(head,[rec],continued);
        if(fits(single)){
          bucket=[rec];
          continue;
        }
        if(!isEmptyPage()) newPage();
        const retry=makeSection(head,[rec],continued);
        if(fits(retry)){
          bucket=[rec];
          continue;
        }

        const title=rec.querySelector('.pRecordTitle');
        const grid=rec.querySelector('.pGrid,.pGrid3');
        const items=grid?[...grid.children]:[];
        if(!items.length){
          appendAtomic(retry);
          continued=true;
          continue;
        }

        let idx=0,part=0;
        while(idx<items.length){
          const sec=document.createElement('section');
          sec.className='pSection';
          sec.appendChild((continued||part)?continuationHead(head):head.cloneNode(true));
          const body=document.createElement('div');
          body.className='pBody';
          const r=document.createElement('div');
          r.className='pRecord';
          const rt=title?title.cloneNode(true):document.createElement('div');
          rt.className=rt.className||'pRecordTitle';
          if(part && rt.textContent) rt.textContent=rt.textContent.replace(/\s*–\s*Fortsetzung\s*$/,'')+' – Fortsetzung';
          r.appendChild(rt);
          const g=document.createElement('div');
          g.className=grid.className;
          r.appendChild(g);body.appendChild(r);sec.appendChild(body);

          let added=0;
          while(idx<items.length){
            g.appendChild(items[idx].cloneNode(true));
            if(fits(sec)){
              idx++;added++;
            }else{
              g.removeChild(g.lastElementChild);
              break;
            }
          }
          if(!added){
            if(!isEmptyPage()){
              newPage();
              continue;
            }
            g.appendChild(items[idx++].cloneNode(true));
          }
          appendAtomic(sec);
          continued=true;
          part++;
          if(idx<items.length) newPage();
        }
      }
      flush();
      for(const extra of extras) appendAtomic(extra.cloneNode(true));
    };

    const addTextSection=(head,msg)=>{
      const text=(msg.textContent||'').trim();
      const paras=text.split(/\n\s*\n/).filter(Boolean);
      if(!paras.length){appendAtomic(msg.closest('.pSection').cloneNode(true));return;}
      let idx=0,continued=false;
      while(idx<paras.length){
        const sec=document.createElement('section');sec.className='pSection';
        sec.appendChild(continued?continuationHead(head):head.cloneNode(true));
        const body=document.createElement('div');body.className='pBody';
        const box=document.createElement('div');box.className='pMessage';
        body.appendChild(box);sec.appendChild(body);
        const accepted=[];
        while(idx<paras.length){
          accepted.push(paras[idx]);
          box.textContent=accepted.join('\n\n');
          if(fits(sec)) idx++;
          else{accepted.pop();box.textContent=accepted.join('\n\n');break;}
        }
        if(!accepted.length){
          if(!isEmptyPage()){newPage();continue;}
          box.textContent=paras[idx++];
        }
        appendAtomic(sec);
        continued=true;
        if(idx<paras.length) newPage();
      }
    };

    const addSection=sec=>{
      const head=sec.querySelector(':scope>.pSectionHead');
      const body=sec.querySelector(':scope>.pBody');
      if(!head||!body){appendAtomic(sec.cloneNode(true));return;}
      const whole=sec.cloneNode(true);
      if(fits(whole)){inner.appendChild(whole);return;}

      const records=[...body.children].filter(x=>x.classList.contains('pRecord'));
      if(records.length){
        const extras=[...body.children].filter(x=>!x.classList.contains('pRecord'));
        packRecords(head,records,extras);
        return;
      }
      const msg=body.querySelector(':scope>.pMessage');
      if(msg){addTextSection(head,msg);return;}

      let continued=false;
      for(const child of [...body.children]){
        const part=makeSection(head,[child],continued);
        appendAtomic(part);
        continued=true;
      }
    };

    for(const node of source){
      if(node.classList.contains('pSection')) addSection(node);
      else appendAtomic(node.cloneNode(true));
    }

    [...sheet.querySelectorAll('.pPage')].forEach(p=>{
      const i=p.querySelector('.pPageInner');
      const meaningful=i && [...i.children].some(n=>(n.textContent||'').trim() || n.querySelector?.('img,canvas,svg'));
      if(!meaningful) p.remove();
    });

    sheet.style.cssText='';
  };
})();
