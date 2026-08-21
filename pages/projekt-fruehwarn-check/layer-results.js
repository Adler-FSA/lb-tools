(()=>{
  const $ = s => document.querySelector(s);
  const compact = v => String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/https?:\/\//g,'').replace(/^www\./,'').replace(/\b(gmbh|ag|ug|ltd|limited|llc|inc|sarl|bv|plc|s\.?\s*r\.?\s*o\.?)\b/g,'').replace(/[^a-z0-9]/g,'');
  const exactMatch = (rec,q) => {
    const cq = compact(q); if(!cq) return false;
    const terms = [rec.name,rec.title,...(rec.aliases||[]),...(rec.domains||[]),...(rec.match_terms||[])].filter(Boolean);
    return terms.some(t=>compact(t)===cq);
  };
  let records=[]; let traces=[];
  const style=document.createElement('style');
  style.textContent=`.layerStatus{display:block;margin-top:7px;padding:9px 10px;border-radius:10px;font-size:.78rem;line-height:1.45}.layerStatus.hit{background:var(--red-soft);color:#7e2430;border:1px solid #efcbd1}.layerStatus.good{background:var(--green-soft);color:#176f50;border:1px solid #d0e9dc}.layerStatus.partial{background:var(--amber-soft);color:#7c5a18;border:1px solid #eadbb8}.layerStatus.neutral{background:var(--grey-soft);color:#5a6670;border:1px solid var(--line)}.layerStatus a{display:inline-block;margin-top:6px;color:var(--mint-dark);font-weight:900;text-decoration:none}.relationHint{display:block;margin:4px 0 0;font-size:.76rem;font-weight:850;color:#7c5a18}`;
  document.head.appendChild(style);

  async function load(){
    try{
      const [r,t]=await Promise.all([
        fetch('./data/records.json',{cache:'no-store'}).then(x=>x.json()),
        fetch('./data/public-traces.json',{cache:'no-store'}).then(x=>x.json())
      ]);
      records=Array.isArray(r.records)?r.records:[];
      traces=Array.isArray(t.records)?t.records:[];
    }catch(e){ records=[]; traces=[]; }
    updateFromVisibleQuery();
  }
  function set(id,cls,html){const e=$(id);if(!e)return;e.className='layerStatus '+cls;e.innerHTML=html}
  function isOfficialOriginal(rec){return /^(official_|authority_original|official_register)/.test(String(rec&&rec.source_type||''));}
  function link(rec){
    if(!rec||!rec.source_url)return'';
    const label=isOfficialOriginal(rec)?'Originalquelle öffnen ↗':'Quelle öffnen ↗';
    return `<a href="${rec.source_url}" target="_blank" rel="noopener">${label}</a>`;
  }
  function sourceLabel(rec){
    if(!rec)return'';
    return rec.authority||'';
  }
  function closeTechnicalStatus(){
    document.querySelectorAll('.sourceStatus details').forEach(d=>{d.open=false});
  }
  function setExtraSectionsVisible(show){
    document.querySelectorAll('.layers,.sourceStatus').forEach(el=>{
      el.style.display=show?'':'none';
    });
  }
  function searchFinished(){
    const feedback=$('#searchFeedback');
    return !!(feedback&&feedback.classList.contains('done'));
  }
  function polishVisibleResultCards(q,matchedRecords,matchedTraces){
    const cq=compact(q);
    const cards=[...document.querySelectorAll('.match')];
    cards.forEach(card=>{
      const text=compact(card.textContent);
      const rec=matchedRecords.find(r=>compact(r.name||r.title||'') && text.includes(compact(r.name||r.title||'')));
      if(rec && compact(rec.name||'')!==cq){
        const title=card.querySelector('.matchTitle');
        if(title && /warn|maßnahmen|warning|enforcement/i.test(title.textContent)) title.textContent='Verbundene behördliche Spur';
        const summary=card.querySelector('.matchSummary');
        if(summary && !summary.querySelector('.relationHint')){
          const hint=document.createElement('span');
          hint.className='relationHint';
          hint.textContent='Der Behördenfund betrifft ein verbundenes bzw. im Behördenhinweis gemeinsam genanntes Unternehmen. Bitte Originalmeldung lesen.';
          summary.appendChild(hint);
        }
      }
    });

    matchedTraces.forEach(trace=>{
      if(!trace.source_url)return;
      document.querySelectorAll(`.match a[href="${CSS.escape(trace.source_url)}"]`).forEach(a=>{
        a.textContent=isOfficialOriginal(trace)?'Originalquelle öffnen ↗':'Quelle öffnen ↗';
        const card=a.closest('.match');
        if(card && trace.source_type==='verified_secondary_authority_quote'){
          const meta=card.querySelector('.matchMeta');
          if(meta) meta.textContent=(trace.authority||'Verifizierte Sekundärquelle')+(trace.date?' · '+trace.date:'');
          const title=card.querySelector('.matchTitle');
          if(title) title.textContent='Öffentlich bestätigte juristische Spur';
        }
      });
    });
  }
  function update(q){
    if(!q)return;
    const matchedRecords=records.filter(r=>exactMatch(r,q));
    const matchedTraces=traces.filter(r=>exactMatch(r,q));
    const finWarn=matchedRecords.find(r=>/bafin-warnings|esma-non-compliant/.test(String(r.source_id||'')) || /warning|non_compliant/.test(String(r.status||'')));
    const finAuth=matchedRecords.find(r=>/esma-casp/.test(String(r.source_id||'')) || /authorized|authorised|licensed/.test(String(r.status||'')));
    const identity=matchedTraces.find(r=>r.category==='identity');
    const legal=matchedTraces.find(r=>r.category==='legal');
    const ads=matchedTraces.find(r=>r.category==='ads');
    const economic=matchedTraces.find(r=>r.category==='economic');

    if(identity){set('#layerStatus-identity','good',`<strong>Register-/Identitätsspur gefunden.</strong><br>${identity.summary_de||''}${link(identity)}`)}
    else set('#layerStatus-identity','partial','<strong>Noch nicht vollständig automatisch geprüft.</strong><br>Unternehmensregister sind derzeit überwiegend als Direktprüfung angebunden.');

    if(finWarn){
      const related=compact(finWarn.name||'')!==compact(q);
      set('#layerStatus-financial','hit',`<strong>${related?'Verbundene behördliche Spur gefunden.':'Behördenhinweis gefunden.'}</strong><br>${sourceLabel(finWarn)||'Aufsichtsbehörde'}${finWarn.date?' · '+finWarn.date:''}${related?`<span class="relationHint">Betroffener Name im Behördenfund: ${finWarn.name||'verbundenes Unternehmen'}</span>`:''}${link(finWarn)}`)
    } else if(finAuth){set('#layerStatus-financial','good',`<strong>Offizieller Zulassungs-/Registertreffer gefunden.</strong><br>${sourceLabel(finAuth)}${link(finAuth)}`)}
    else set('#layerStatus-financial','good','<strong>Kein eindeutiger Treffer.</strong><br>In den automatisch geprüften BaFin- und ESMA-Daten wurde kein eindeutiger Warn- oder Zulassungstreffer zugeordnet.');

    if(legal){set('#layerStatus-legal','hit',`<strong>Juristische Spur gefunden.</strong><br>${legal.summary_de||''}<br><small>${sourceLabel(legal)}</small>${link(legal)}`)}
    else set('#layerStatus-legal','partial','<strong>Noch nicht flächendeckend automatisch geprüft.</strong><br>Es gibt derzeit keine zentrale öffentliche Datenbank aller Ermittlungsverfahren; nur angeschlossene und öffentlich bestätigte Spuren können angezeigt werden.');

    if(economic){set('#layerStatus-economic','partial',`<strong>Wirtschaftliche Spur gefunden.</strong><br>${economic.summary_de||''}${link(economic)}`)}
    else set('#layerStatus-economic','partial','<strong>Noch nicht automatisch vollständig geprüft.</strong><br>Insolvenz- und Unternehmensstatus sind derzeit überwiegend als Direktprüfung angebunden.');

    if(ads){set('#layerStatus-ads','partial',`<strong>Öffentliche Werbespur gefunden.</strong><br>${ads.summary_de||''}<br><small>${sourceLabel(ads)}</small>${link(ads)}`)}
    else set('#layerStatus-ads','partial','<strong>Noch nicht automatisch geprüft.</strong><br>Meta Ad Library und TikTok Commercial Content Library sind aktuell als Direktprüfung angebunden.');

    setTimeout(()=>polishVisibleResultCards(q,matchedRecords,matchedTraces),80);
    closeTechnicalStatus();
  }
  function updateFromVisibleQuery(){
    const shell=$('#resultShell');
    const q=$('#queryOut');
    const query=$('#query');
    const shown=q?q.textContent.trim():'';
    const current=query?query.value.trim():'';
    if(shell&&shell.classList.contains('show')&&shown&&current===shown&&searchFinished()){
      setExtraSectionsVisible(true);
      update(shown);
    }else{
      setExtraSectionsVisible(false);
      closeTechnicalStatus();
    }
  }
  const obs=new MutationObserver(()=>setTimeout(updateFromVisibleQuery,40));
  window.addEventListener('DOMContentLoaded',()=>{
    setExtraSectionsVisible(false);
    closeTechnicalStatus();
    const query=$('#query');
    if(query){
      query.addEventListener('input',()=>{
        const shown=$('#queryOut')?.textContent.trim()||'';
        const current=query.value.trim();
        if(!shown||current!==shown){
          setExtraSectionsVisible(false);
          closeTechnicalStatus();
        }
      });
    }
    const targets=['#resultShell','#queryOut','#searchFeedback','#datasetState'].map($).filter(Boolean);
    targets.forEach(t=>obs.observe(t,{subtree:true,childList:true,characterData:true,attributes:true}));
    load();
  });
})();
