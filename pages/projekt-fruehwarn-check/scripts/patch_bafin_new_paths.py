#!/usr/bin/env python3
from pathlib import Path
import re

path = Path(__file__).resolve().with_name("update_bafin.py")
text = path.read_text(encoding="utf-8")
original = text

warnings_url = "https://www.bafin.de/DE/verbraucherinnen-verbraucher/news-warnungen/warnmeldungen/warnmeldungen_node.html"
search_url = "https://www.bafin.de/SiteGlobals/Forms/Suche/Expertensuche/Servicesuche_Formular.html?pageLocale=de&cl2Categories_Format=meldung&sortOrder=searchDate_dt%20desc&zeitraum=zeitraum_thisYear&resultsPerPage=50"

text = re.sub(
    r'BAFIN_WARNINGS = "[^"]+"\n(?:BAFIN_SEARCH = "[^"]+"\n)?BAFIN_LIST_SEEDS = .*?\nUSER_AGENT',
    f'BAFIN_WARNINGS = "{warnings_url}"\nBAFIN_SEARCH = "{search_url}"\nBAFIN_LIST_SEEDS = [BAFIN_SEARCH]\nUSER_AGENT',
    text,
    flags=re.S,
)

canonical = '''def canonical_list_url(url):
    parsed = urlparse(urljoin(BAFIN_BASE, url))
    if parsed.netloc not in {"www.bafin.de", "bafin.de"}:
        return ""

    path = re.sub(r";jsessionid=[^/?]+", "", parsed.path, flags=re.I)
    if not path.endswith("/SiteGlobals/Forms/Suche/Expertensuche/Servicesuche_Formular.html"):
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
    if "servicesuche_formular.html" not in low_href:
        return False
    # BaFin paginiert die Trefferliste über gtp=..._list=2, =3 usw.
    # Filterlinks (Aufsichtsbereich, Zeitraum, Format usw.) dürfen NICHT verfolgt werden.
    return "gtp=" in low_href
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
    print("BaFin-Importer auf laufendes Jahr, 50 Treffer pro Seite und echte gtp-Pagination begrenzt.")
