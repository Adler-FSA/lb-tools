#!/usr/bin/env python3
import re
import requests
from bs4 import BeautifulSoup

URL = "https://www.bafin.de/DE/Verbraucher/Aktuelles/verbraucher_node.html"
UA = "Akademie-Fruehwarn-Check/1.0 (+https://tools.liquiditybooster.de/pages/projekt-fruehwarn-check/)"

r = requests.get(URL, timeout=45, headers={"User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9"})
r.raise_for_status()
soup = BeautifulSoup(r.text, "html.parser")
print("=== BAFIN LINKDIAGNOSE ===")
print("Final URL:", r.url)
for a in soup.find_all("a", href=True):
    href = a.get("href", "")
    text = re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip()
    probe = (href + " " + text).lower()
    if any(x in probe for x in ("warn", "prospekt", "unerlaub", "marktmanip", "cms_gtp", "_function", "meldung")):
        print("TEXT:", text[:180])
        print("HREF:", href)
        print("---")
print("=== ENDE LINKDIAGNOSE ===")
