from pathlib import Path
import re

path = Path('pages/headteam-vorlauf/headteam-2/index.html')
html = path.read_text(encoding='utf-8')

old_css = '.new-category{display:inline-flex;border-radius:999px;padding:4px 8px;background:var(--mint-soft);color:#08757a;font-size:11px;font-weight:900}'
new_css = '.new-category{display:inline-flex;border:0;border-radius:999px;padding:4px 8px;background:var(--mint-soft);color:#08757a;font-size:11px;font-weight:900;font-family:inherit;cursor:pointer}.new-category:hover,.new-category:focus{background:#d8f3f4;outline:2px solid rgba(0,167,173,.18);outline-offset:1px}'
if old_css not in html:
    raise SystemExit('CSS marker not found')
html = html.replace(old_css, new_css, 1)

pattern = re.compile(r"function renderNewEntries\(\)\{.*?\}\nfunction renderTeamQuick", re.S)
match = pattern.search(html)
if not match:
    raise SystemExit('renderNewEntries function not found')

replacement = '''function renderNewEntries(){const el=$('#newEntries');if(!el)return;const items=(state.projects||[]).slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,6);el.innerHTML=items.length?items.map(p=>{const cat=p.category?readCategoryLabel(p.category):'';return`<div class="new-entry"><div><div class="new-title">${esc(p.title||'–')}</div><div class="new-meta">${cat?`<button type="button" class="new-category" data-new-category="${esc(p.category)}" title="Bereich ${esc(cat)} öffnen">${esc(cat)}</button>`:'<span>Bereich noch nicht zugeordnet</span>'}${p.createdAt?`<span>Eingestellt: ${esc(formatDateTime(p.createdAt))}</span>`:''}</div></div><div class="new-release">${p.releaseDate?'Freigabe: '+esc(formatDate(p.releaseDate)):'Noch kein Freigabetermin'}</div><span class="new-badge">NEU</span></div>`}).join(''):`<div class="empty">Noch keine Projekte eingestellt.</div>`;el.querySelectorAll('[data-new-category]').forEach(btn=>btn.onclick=()=>{activeProjectCategory=btn.dataset.newCategory;activeType='all';setPanel('lead');document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.projectCategory===activeProjectCategory));renderProjects()})}
function renderTeamQuick'''

html = html[:match.start()] + replacement + html[match.end():]
path.write_text(html, encoding='utf-8')
print('Category badges in Neu eingestellt are now clickable quick links.')
