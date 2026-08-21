#!/usr/bin/env python3
from pathlib import Path
import re

path = Path(__file__).resolve().with_name("update_bafin.py")
text = path.read_text(encoding="utf-8")
original = text

new_url = "https://www.bafin.de/DE/verbraucherinnen-verbraucher/news-warnungen/warnmeldungen/warnmeldungen_node.html"

text = re.sub(
    r'BAFIN_WARNINGS = "[^"]+"\nBAFIN_LIST_SEEDS = \[.*?\n\]\n',
    f'BAFIN_WARNINGS = "{new_url}"\nBAFIN_LIST_SEEDS = [BAFIN_WARNINGS]\n',
    text,
    flags=re.S,
)

canonical = '''def canonical_list_url(url):
    parsed = urlparse(urljoin(BAFIN_BASE, url))
    if parsed.netloc not in {"www.bafin.de", "bafin.de"}:
        return ""

    path = re.sub(r";jsessionid=[^/?]+", "", parsed.path, flags=re.I)
    if "/DE/verbraucherinnen-verbraucher/news-warnungen/warnmeldungen/" not in path:
        return ""
    if "warnmeldungen_node" not in path:
        return ""

    return parsed._replace(path=path, fragment="").geturl()
'''
text = re.sub(
    r'def canonical_list_url\(url\):.*?\n\ndef is_navigation_link',
    canonical + '\n\ndef is_navigation_link',
    text,
    flags=re.S,
)

navigation = '''def is_navigation_link(a):
    href = a.get("href", "")
    if not href:
        return False
    low_href = href.lower()
    if "cms_gtp=" in low_href or "cms_gts=" in low_href:
        return True
    if "warnmeldungen_node" in low_href:
        return True
    labels = " ".join([
        clean(a.get_text(" ", strip=True)),
        a.get("aria-label", ""),
        a.get("title", ""),
    ]).lower()
    return any(x in labels for x in ("nächste", "naechste", "next", "seite"))
'''
text = re.sub(
    r'def is_navigation_link\(a\):.*?\n\ndef collect_article_links',
    navigation + '\n\ndef collect_article_links',
    text,
    flags=re.S,
)

if text == original:
    print("Kein Patch erforderlich oder Suchmuster nicht gefunden.")
else:
    path.write_text(text, encoding="utf-8")
    print("BaFin-Importer auf neue Warnmeldungsstruktur umgestellt.")
