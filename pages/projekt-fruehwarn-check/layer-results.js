(()=>{
  const $ = s => document.querySelector(s);
  const compact = v => String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/https?:\/\//g,'').replace(/^www\./,'').replace(/\b(gmbh|ag|ug|ltd|limited|llc|inc|sarl|bv|plc|s\.?\s*r\.?\s*o\.?)\b/g,'').replace(/[^a-z0-9]/g,'');
  const exactMatch = (rec,q) => {
    const cq = compact(q); if(!cq) return false;
    const terms = [rec.name,rec.title,...(rec.aliases||[]),...(rec.domains||[]),...(rec.match_terms||[])].filter(Boolean);
    return terms.some(t=>compact(t)===cq);
  };
  let records=[];
  let traces=[];
  let identitySeq=0;
  const gleifCache=new Map();

  const style=document.createElement('style');
  style.textContent=`.layerStatus{display:block;margin-top:7px;padding:9px 10px;border-radius:10px;font-size:.78rem;line-height:1.45}.layerStatus.hit{background:var(--red-soft);color:#7e2430;border:1px solid #efcbd1}.layerStatus.good{background:var(--green-soft);color:#176f50;border:1px solid #d0e9dc}.layerStatus.partial{background:var(--amber-soft);color:#7c5a18;border:1px solid #eadbb8}.layerStatus.neutral{background:var(--grey-soft);color:#5a6670;border:1px solid var(--line)}.layerStatus a{display:inline-block;margin-top:6px;color:var(--mint-dark);font-weight:900;text-decoration:none}.relationHint{display:block;margin:4px 0 0;font-size:.76rem;font-weight:850;color:#7c5a18}.identityFacts{display:grid;gap:2px;margin-top:5px}.identityFacts b{display:inline!important;margin:0!important;color:inherit!important}`;
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
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function isOfficialOriginal(rec){return /^(official_|authority_original|official_register)/.test(String(rec&&rec.source_type||''));}
  function link(rec){
    if(!rec||!rec.source_url)return'';
    const label=isOfficialOriginal(rec)?'Originalquelle öffnen ↗':'Quelle öffnen ↗';
    return `<a href="${esc(rec.source_url)}" target="_blank" rel="noopener">${label}</a>`;
  }
  function sourceLabel(rec){return rec&&rec.authority?rec.authority:'';}
  function closeTechnicalStatus(){document.querySelectorAll('.sourceStatus details').forEach(d=>{d.open=false});}
  function setExtraSectionsVisible(show){document.querySelectorAll('.layers,.sourceStatus').forEach(el=>{el.style.display=show?'':'none';});}
  function searchFinished(){const feedback=$('#searchFeedback');return !!(feedback&&feedback.classList.contains('done'));}
  function sameActiveQuery(q){
    const shown=$('#queryOut')?.textContent.trim()||'';
    const current=$('#query')?.value.trim()||'';
    return !!q && shown===q && current===shown && searchFinished();
  }

  function queryTerms(q){
    const raw=String(q||'').trim();
    const out=[raw];
    const domain=raw.toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0];
    if(domain.includes('.')){
      const first=domain.split('.')[0].replace(/[-_]+/g,' ').trim();
      if(first && compact(first)!==compact(raw)) out.push(first);
    }
    return [...new Set(out.filter(Boolean))];
  }

  function gleifNameCandidates(item){
    const a=item?.attributes||{};
    const e=a.entity||{};
    const names=[];
    const legal=e.legalName?.name||'';
    if(legal) names.push(legal);
    for(const n of (e.otherNames||[])){if(n?.name)names.push(n.name)}
    for(const n of (e.transliteratedOtherNames||[])){if(n?.name)names.push(n.name)}
    return names;
  }

  function gleifScore(item,q){
    const cq=compact(q); if(!cq)return 0;
    let best=0;
    for(const name of gleifNameCandidates(item)){
      const cn=compact(name); if(!cn)continue;
      if(cn===cq) best=Math.max(best,100);
      else if(cq.length>=6 && (cn.startsWith(cq)||cq.startsWith(cn))) best=Math.max(best,72);
    }
    return best;
  }

  function normalizeGleif(item,matchedTerm){
    const a=item?.attributes||{};
    const e=a.entity||{};
    const r=a.registration||{};
    const addr=e.legalAddress||e.headquartersAddress||{};
    return {
      lei:a.lei||item?.id||'',
      legalName:e.legalName?.name||gleifNameCandidates(item)[0]||'',
      status:e.status||'',
      jurisdiction:e.jurisdiction||e.legalJurisdiction||addr.country||'',
      city:addr.city||'',
      country:addr.country||'',
      registeredAs:e.registeredAs||r.validatedAs||'',
      registeredAt:e.registeredAt?.id||r.validatedAt?.id||'',
      registrationStatus:r.status||'',
      matchedTerm
    };
  }

  async function lookupGLEIF(q){
    const cacheKey=compact(q);
    if(gleifCache.has(cacheKey)) return gleifCache.get(cacheKey);
    const terms=queryTerms(q);
    const found=[];
    let reached=false;
    let lastError=null;
    for(const term of terms){
      try{
        const u=new URL('https://api.gleif.org/api/v1/lei-records');
        u.searchParams.set('filter[entity.names]',term);
        u.searchParams.set('page[size]','10');
        const res=await fetch(u.toString(),{headers:{'Accept':'application/vnd.api+json'}});
        if(!res.ok) throw new Error('HTTP '+res.status);
        reached=true;
        const json=await res.json();
        for(const item of (Array.isArray(json.data)?json.data:[])) found.push({item,term,score:gleifScore(item,term)});
      }catch(e){lastError=e;}
    }
    if(!reached && lastError) throw lastError;
    found.sort((x,y)=>y.score-x.score);
    const best=found.find(x=>x.score>=95);
    const value=best?{status:'match',record:normalizeGleif(best.item,best.term)}:{status:'none'};
    gleifCache.set(cacheKey,value);
    return value;
  }

  function renderGleifIdentity(result,q,seq){
    if(seq!==identitySeq||!sameActiveQuery(q))return;
    if(result?.status==='match'){
      const g=result.record||{};
      const facts=[];
      if(g.legalName) facts.push(`<span><b>Juristischer Name:</b> ${esc(g.legalName)}</span>`);
      if(g.lei) facts.push(`<span><b>LEI:</b> ${esc(g.lei)}</span>`);
      if(g.status||g.registrationStatus) facts.push(`<span><b>Status:</b> ${esc(g.status||g.registrationStatus)}</span>`);
      if(g.city||g.country) facts.push(`<span><b>Sitz:</b> ${esc([g.city,g.country].filter(Boolean).join(', '))}</span>`);
      if(g.jurisdiction) facts.push(`<span><b>Jurisdiktion:</b> ${esc(g.jurisdiction)}</span>`);
      if(g.registeredAs) facts.push(`<span><b>Registerkennung:</b> ${esc(g.registeredAs)}</span>`);
      const url=g.lei?`https://search.gleif.org/#/record/${encodeURIComponent(g.lei)}`:'https://search.gleif.org/';
      set('#layerStatus-identity','good',`<strong>GLEIF/LEI-Identitätsspur gefunden.</strong><br>Der eingegebene Name wurde einem LEI-Rechtsträger eindeutig zugeordnet.<span class="identityFacts">${facts.join('')}</span><a href="${url}" target="_blank" rel="noopener">GLEIF-Eintrag öffnen ↗</a><span class="relationHint">Ein LEI bestätigt eine Rechtsträger-Identität; er ist kein Gütesiegel und keine Finanzlizenz.</span>`);
    }else{
      set('#layerStatus-identity','partial',`<strong>Kein eindeutiger LEI-Treffer gefunden.</strong><br>Die automatische GLEIF-Prüfung konnte „${esc(q)}“ keinem LEI-Rechtsträger eindeutig zuordnen. Das bedeutet ausdrücklich nicht, dass die Firma nicht existiert. Deutsches Handels-/Unternehmensregister bzw. BRIS bleiben als Direktprüfung erforderlich.<a href="https://search.gleif.org/" target="_blank" rel="noopener">GLEIF-Suche öffnen ↗</a>`);
    }
  }

  async function updateIdentity(q,identity,seq){
    if(identity){
      set('#layerStatus-identity','good',`<strong>Register-/Identitätsspur gefunden.</strong><br>${identity.summary_de||''}${link(identity)}`);
      return;
    }
    set('#layerStatus-identity','neutral','<strong>Unternehmensidentität wird automatisch geprüft …</strong><br>GLEIF/LEI wird nach einem eindeutigen Rechtsträger durchsucht.');
    try{
      const result=await lookupGLEIF(q);
      renderGleifIdentity(result,q,seq);
    }catch(e){
      if(seq!==identitySeq||!sameActiveQuery(q))return;
      set('#layerStatus-identity','partial','<strong>GLEIF derzeit nicht automatisch erreichbar.</strong><br>Die Identitätsprüfung konnte über diese Quelle nicht abgeschlossen werden. Handels-/Unternehmensregister und BRIS stehen als Direktprüfung bereit.');
    }
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
    const seq=++identitySeq;
    const matchedRecords=records.filter(r=>exactMatch(r,q));
    const matchedTraces=traces.filter(r=>exactMatch(r,q));
    const finWarn=matchedRecords.find(r=>/bafin-warnings|esma-non-compliant/.test(String(r.source_id||'')) || /warning|non_compliant/.test(String(r.status||'')));
    const finAuth=matchedRecords.find(r=>/esma-casp/.test(String(r.source_id||'')) || /authorized|authorised|licensed/.test(String(r.status||'')));
    const identity=matchedTraces.find(r=>r.category==='identity');
    const legal=matchedTraces.find(r=>r.category==='legal');
    const ads=matchedTraces.find(r=>r.category==='ads');
    const economic=matchedTraces.find(r=>r.category==='economic');

    updateIdentity(q,identity,seq);

    if(finWarn){
      const related=compact(finWarn.name||'')!==compact(q);
      set('#layerStatus-financial','hit',`<strong>${related?'Verbundene behördliche Spur gefunden.':'Behördenhinweis gefunden.'}</strong><br>${sourceLabel(finWarn)||'Aufsichtsbehörde'}${finWarn.date?' · '+finWarn.date:''}${related?`<span class="relationHint">Betroffener Name im Behördenfund: ${esc(finWarn.name||'verbundenes Unternehmen')}</span>`:''}${link(finWarn)}`)
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
        identitySeq++;
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
