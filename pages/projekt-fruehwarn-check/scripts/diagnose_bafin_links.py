#!/usr/bin/env python3
import re
import requests
from bs4 import BeautifulSoup

UA = "Akademie-Fruehwarn-Check/1.0 (+https://tools.liquiditybooster.de/pages/projekt-fruehwarn-check/)"
URLS = [
    "https://www.bafin.de/DE/verbraucherinnen-verbraucher/news-warnungen/warnmeldungen/warnmeldungen_node.html",
    "https://www.bafin.de/SiteGlobals/Forms/Suche/Expertensuche/Servicesuche_Formular.html?pageLocale=de&cl2Categories_Format=meldung&sortOrder=searchDate_dt%20desc",
]

for url in URLS:
    r = requests.get(url, timeout=45, headers={"User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9"})
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    print("=== BAFIN LINKDIAGNOSE ===")
    print("Final URL:", r.url)
    article_count = 0
    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        text = re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip()
        low = href.lower()
        is_article = "/shareddocs/veroeffentlichungen/de/verbrauchermitteilung/" in low
        is_page = any(x in low for x in ("cms_gtp=", "cms_gts=", "pageno=", "page="))
        label = (text + " " + a.get("aria-label", "") + " " + a.get("title", "")).lower()
        if is_article:
            article_count += 1
        if is_page or any(x in label for x in ("nächste", "naechste", "next", "seite 2", "weiter")):
            print("PAGINATION TEXT:", text[:180])
            print("PAGINATION HREF:", href)
            print("---")
    print("Artikel-Links auf dieser Seite:", article_count)
    print("=== ENDE LINKDIAGNOSE ===")
