from pathlib import Path
import re

path = Path('pages/headteam-vorlauf/headteam-2/index.html')
html = path.read_text(encoding='utf-8')

old_grid = '.new-entry{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:14px;align-items:center;'
new_grid = '.new-entry{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:10px;align-items:center;'
if old_grid not in html:
    raise SystemExit('new-entry grid pattern not found')
html = html.replace(old_grid, new_grid, 1)

view_css = '.new-view{display:inline-flex;align-items:center;justify-content:center;border:1px solid #cfe6e8;border-radius:9px;background:#fff;color:var(--navy);padding:6px 9px;font-size:11px;font-weight:900;text-decoration:none;white-space:nowrap}.new-view:hover,.new-view:focus{background:var(--mint);border-color:var(--mint);color:#fff;outline:none}'
css_pattern = re.compile(r'(\.new-badge\{[^}]*\})')
if len(css_pattern.findall(html)) != 1:
    raise SystemExit(f'expected exactly one new-badge CSS rule, found {len(css_pattern.findall(html))}')
html = css_pattern.sub(r'\1' + view_css, html, count=1)

# Add one compact direct-link button after the NEW badge in the dashboard list template.
badge_pattern = re.compile(r'(<span class="new-badge">NEU</span>)')
matches = list(badge_pattern.finditer(html))
if len(matches) != 1:
    raise SystemExit(f'expected exactly one NEW badge template, found {len(matches)}')
replacement = r'''\1${p.url?'<a class="new-view" href="'+esc(p.url)+'" target="_blank" rel="noopener">Ansehen</a>':''}'''
html = badge_pattern.sub(replacement, html, count=1)

path.write_text(html, encoding='utf-8')
print('Added compact Ansehen button to Neu eingestellt dashboard rows.')
