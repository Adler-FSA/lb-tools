from pathlib import Path

FILES = {
    "control": Path("pages/headteam-vorlauf/head-control-2.html"),
    "headteam": Path("pages/headteam-vorlauf/headteam-2/index.html"),
}


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


# Head Control 2
path = FILES["control"]
html = path.read_text(encoding="utf-8")
html = replace_once(
    html,
    '<button class="nav-btn" data-project-category="kurse">Kurse</button><button class="nav-btn" data-project-category="social-media">Social Media</button>',
    '<button class="nav-btn" data-project-category="kurse">Kurse</button><button class="nav-btn" data-project-category="produkte-aktualisiert">Produkte aktualisiert</button><button class="nav-btn" data-project-category="neue-produkte">Neue Produkte</button><button class="nav-btn" data-project-category="social-media">Social Media</button>',
    "Head Control navigation",
)
html = replace_once(
    html,
    '<option value="kurse">Kurse</option><option value="social-media">Social Media</option>',
    '<option value="kurse">Kurse</option><option value="produkte-aktualisiert">Produkte aktualisiert</option><option value="neue-produkte">Neue Produkte</option><option value="social-media">Social Media</option>',
    "Head Control category select",
)
html = replace_once(
    html,
    "'kurse':'Kurse','social-media':'Social Media'",
    "'kurse':'Kurse','produkte-aktualisiert':'Produkte aktualisiert','neue-produkte':'Neue Produkte','social-media':'Social Media'",
    "Head Control category map",
)
path.write_text(html, encoding="utf-8")

# Headteam 14 Tage
path = FILES["headteam"]
html = path.read_text(encoding="utf-8")
html = replace_once(
    html,
    '    <button class="nav-btn" data-project-category="kurse">Kurse</button>\n    <button class="nav-btn" data-project-category="social-media">Social Media</button>',
    '    <button class="nav-btn" data-project-category="kurse">Kurse</button>\n    <button class="nav-btn" data-project-category="produkte-aktualisiert">Produkte aktualisiert</button>\n    <button class="nav-btn" data-project-category="neue-produkte">Neue Produkte</button>\n    <button class="nav-btn" data-project-category="social-media">Social Media</button>',
    "Headteam navigation",
)
html = replace_once(
    html,
    "'kurse':'Kurse','social-media':'Social Media'",
    "'kurse':'Kurse','produkte-aktualisiert':'Produkte aktualisiert','neue-produkte':'Neue Produkte','social-media':'Social Media'",
    "Headteam category map",
)
path.write_text(html, encoding="utf-8")

for p in FILES.values():
    text = p.read_text(encoding="utf-8")
    for token in ("produkte-aktualisiert", "neue-produkte"):
        if token not in text:
            raise SystemExit(f"{p}: missing {token} after patch")

print("Added 'Produkte aktualisiert' and 'Neue Produkte' to Head Control 2 and Headteam 14 Tage.")
