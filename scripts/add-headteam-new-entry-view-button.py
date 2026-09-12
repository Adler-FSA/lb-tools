from pathlib import Path

path = Path('pages/headteam-vorlauf/headteam-2/index.html')
html = path.read_text(encoding='utf-8')

old_grid = '.new-entry{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:14px;align-items:center;'
new_grid = '.new-entry{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:10px;align-items:center;'
if old_grid not in html:
    raise SystemExit('new-entry grid pattern not found')
html = html.replace(old_grid, new_grid, 1)

if '.new-view{' not in html:
    style = '<style>.new-view{display:inline-flex;align-items:center;justify-content:center;border:1px solid #cfe6e8;border-radius:9px;background:#fff;color:var(--navy);padding:6px 9px;font-size:11px;font-weight:900;text-decoration:none;white-space:nowrap}.new-view:hover,.new-view:focus{background:var(--mint);border-color:var(--mint);color:#fff;outline:none}@media(max-width:760px){.new-entry{grid-template-columns:minmax(0,1fr) auto auto}.new-view{grid-column:2/4;justify-self:end}}</style>'
    if '</head>' not in html:
        raise SystemExit('head close tag not found')
    html = html.replace('</head>', style + '</head>', 1)

old_badge = '<span class="new-badge">NEU</span></div>`}).join(\'\')'
new_badge = '<span class="new-badge">NEU</span>${p.url?\'<a class="new-view" href="\'+esc(p.url)+\'" target="_blank" rel="noopener">Ansehen</a>\':\'\'}</div>`}).join(\'\')'
if old_badge not in html:
    raise SystemExit('NEW badge template pattern not found')
html = html.replace(old_badge, new_badge, 1)

path.write_text(html, encoding='utf-8')
print('Added compact Ansehen button to Neu eingestellt dashboard rows.')
