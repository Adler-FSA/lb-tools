from pathlib import Path

p = Path('pages/projekt-fruehwarn-check/index.html')
s = p.read_text(encoding='utf-8')

old = """  function recordTerms(r){ return [r.name,r.title,r.authority,...(r.aliases||[]),...(r.domains||[]),...(r.match_terms||[])].filter(Boolean).map(normalize); }
  function matchRecord(r,q){
    const nq=normalize(q); if(!nq) return false;
    return recordTerms(r).some(term => term===nq || term.includes(nq) || nq.includes(term));
  }
"""

new = """  function recordTerms(r){ return [r.name,r.title,...(r.aliases||[]),...(r.domains||[]),...(r.match_terms||[])].filter(Boolean).map(normalize); }
  function termTokens(term){ return term.split(/[\\s.\\-_/]+/).filter(Boolean); }
  function matchQuality(r,q){
    const nq=normalize(q); if(!nq) return 0;
    const qTokens=termTokens(nq);
    let similar=false;
    for(const term of recordTerms(r)){
      if(!term) continue;
      if(term===nq) return 3;
      const tokens=termTokens(term);
      if(qTokens.length===1 && tokens.includes(nq)) return 3;
      if(qTokens.length>1 && (term.startsWith(nq+' ') || term.startsWith(nq+'.') || term.startsWith(nq+'-'))) return 3;
      if(nq.includes('.') && (term===nq || term.endsWith('.'+nq))) return 3;
      if(nq.length>=4 && tokens.some(token=>token.startsWith(nq))) similar=true;
      else if(nq.length>=3 && term.includes(nq)) similar=true;
    }
    return similar ? 1 : 0;
  }
"""

if old not in s:
    raise SystemExit('Suchlogik-Ausgangsblock nicht gefunden; Abbruch ohne Änderung.')
s = s.replace(old, new, 1)

old_render = """    const regionRecords=state.records.filter(r=>r.region===region);
    const matches=regionRecords.filter(r=>matchRecord(r,q));
    const automaticSources=state.sources.filter(s=>s.region===region && ['auto','local'].includes(s.mode));
    if(matches.length){
      matches.forEach(r=>{
        const div=document.createElement('div'); div.className='match '+recordClass(r);
        const summary=state.lang==='en'?(r.summary_en||r.summary_de||''):(r.summary_de||r.summary_en||'');
        div.innerHTML='<div class=\"matchTop\"><div class=\"matchTitle\">'+esc(recordLabel(r))+'</div></div>'+\n          '<div class=\"matchMeta\">'+esc(r.authority||'')+(r.date?' · '+esc(r.date):'')+'</div>'+\n          '<div class=\"matchSummary\"><strong>'+esc(r.name||r.title||q)+'</strong>'+(summary?'<br>'+esc(summary):'')+'</div>'+\n          (r.source_url?'<a href=\"'+esc(r.source_url)+'\" target=\"_blank\" rel=\"noopener\">'+esc(t('resultSource'))+' ↗</a>':'');
        box.appendChild(div);
      });
    }else{
"""

new_render = """    const regionRecords=state.records.filter(r=>r.region===region);
    const graded=regionRecords.map(r=>({record:r,quality:matchQuality(r,q)})).filter(x=>x.quality>0);
    const matches=graded.filter(x=>x.quality>=3).map(x=>x.record);
    const similar=graded.filter(x=>x.quality===1).map(x=>x.record).slice(0,8);
    const automaticSources=state.sources.filter(s=>s.region===region && ['auto','local'].includes(s.mode));
    if(matches.length){
      matches.forEach(r=>{
        const div=document.createElement('div'); div.className='match '+recordClass(r);
        const summary=state.lang==='en'?(r.summary_en||r.summary_de||''):(r.summary_de||r.summary_en||'');
        div.innerHTML='<div class=\"matchTop\"><div class=\"matchTitle\">'+esc(recordLabel(r))+'</div></div>'+\n          '<div class=\"matchMeta\">'+esc(r.authority||'')+(r.date?' · '+esc(r.date):'')+'</div>'+\n          '<div class=\"matchSummary\"><strong>'+esc(r.name||r.title||q)+'</strong>'+(summary?'<br>'+esc(summary):'')+'</div>'+\n          (r.source_url?'<a href=\"'+esc(r.source_url)+'\" target=\"_blank\" rel=\"noopener\">'+esc(t('resultSource'))+' ↗</a>':'');
        box.appendChild(div);
      });
    }else{
"""

if old_render not in s:
    raise SystemExit('Trefferdarstellung-Ausgangsblock nicht gefunden; Abbruch ohne Änderung.')
s = s.replace(old_render, new_render, 1)

anchor = """      box.appendChild(div);
    }
  }
  function renderSources(region){
"""
addition = """      box.appendChild(div);
    }
    if(similar.length){
      const note=document.createElement('div'); note.className='directTitle'; note.textContent=state.lang==='en'?'Similar names – not assigned':'Ähnliche Bezeichnungen – nicht zugeordnet'; box.appendChild(note);
      similar.forEach(r=>{
        const div=document.createElement('div'); div.className='match notice';
        div.innerHTML='<div class=\"matchTop\"><div class=\"matchTitle\">'+esc(state.lang==='en'?'Possible name similarity':'Mögliche Namensähnlichkeit')+'</div></div>'+\n          '<div class=\"matchMeta\">'+esc(r.authority||'')+'</div>'+\n          '<div class=\"matchSummary\"><strong>'+esc(r.name||r.title||q)+'</strong><br>'+esc(state.lang==='en'?'This entry is not automatically attributed to the searched provider. Please compare the name and domain.':'Dieser Eintrag wird dem gesuchten Anbieter nicht automatisch zugeordnet. Bitte Name und Domain vergleichen.')+'</div>'+\n          (r.source_url?'<a href=\"'+esc(r.source_url)+'\" target=\"_blank\" rel=\"noopener\">'+esc(t('resultSource'))+' ↗</a>':'');
        box.appendChild(div);
      });
    }
  }
  function renderSources(region){
"""

if anchor not in s:
    raise SystemExit('Einfügepunkt für ähnliche Treffer nicht gefunden; Abbruch ohne Änderung.')
s = s.replace(anchor, addition, 1)

p.write_text(s, encoding='utf-8')
print('Trefferlogik aktualisiert: eindeutig und ähnlich werden getrennt dargestellt.')
