from pathlib import Path
import re

path = Path('pages/headteam-vorlauf/headteam-2/index.html')
html = path.read_text(encoding='utf-8')

old_grid = '.new-entry{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:14px;align-items:center;'
new_grid = '.new-entry{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:10px;align-items:center;'
if old_grid not in html:
    raise SystemExit('new-entry grid pattern not found')
html = html.replace(old_grid, new_grid, 1)

css_anchor = '.new-badge{display:inline-flex;border-radius:999px;padding:5px 8px;background:var(--magenta-soft);color:var(--magenta);font-size:10px;font-weight:950;letter-spacing:.05em;text-transform:uppercase}'
if css_anchor not in html:
    raise SystemExit('new-badge CSS anchor not found')
view_css = css_anchor + '.new-view{display:inline-flex;align-items:center;justify-content:center;border:1px solid #cfe6e8;border-radius:9px;background:#fff;color:var(--navy);padding:6px 9px;font-size:11px;font-weight:900;text-decoration:none;white-space:nowrap}.new-view:hover,.new-view:focus{background:var(--mint);border-color:var(--mint);color:#fff;outline:none}'
html = html.replace(css_anchor, view_css, 1)

# Add one compact direct-link button after the NEW badge in the dashboard list template.
pattern = re.compile(r'(<span class="new-badge">NEU</span>)')
matches = list(pattern.finditer(html))
if len(matches) != 1:
    raise SystemExit(f'expected exactly one NEW badge template, found {len(matches)}')
replacement = r'''\1${p.url?'<a class="new-view" href="'+esc(p.url)+'" target="_blank" rel="noopener">Ansehen</a>':''}'''
html = pattern.sub(replacement, html, count=1)

path.write_text(html, encoding='utf-8')
print('Added compact Ansehen button to Neu eingestellt dashboard rows.')
