#!/usr/bin/env python3
from __future__ import annotations

import html
import re
from urllib.parse import parse_qs, quote_plus, unquote, urlparse
from urllib.request import Request, urlopen

SEARCH_HOSTS = {"duckduckgo.com", "html.duckduckgo.com", "bing.com", "www.bing.com"}
SOCIAL_HOSTS = {
    "t.me":"telegram", "telegram.me":"telegram", "facebook.com":"facebook", "www.facebook.com":"facebook",
    "instagram.com":"instagram", "www.instagram.com":"instagram", "tiktok.com":"tiktok", "www.tiktok.com":"tiktok",
    "youtube.com":"youtube", "www.youtube.com":"youtube", "youtu.be":"youtube", "x.com":"x", "twitter.com":"x",
    "linkedin.com":"linkedin", "www.linkedin.com":"linkedin", "reddit.com":"reddit", "www.reddit.com":"reddit",
}
AUTHORITY_HINTS = (
    ".gov", ".gov.uk", ".gov.ae", ".europa.eu", "bafin.de", "fca.org.uk", "sec.gov", "finra.org",
    "esma.europa.eu", "eba.europa.eu", "centralbank", "registry", "register", "companieshouse.gov.uk",
)


def _fetch(url: str, timeout: int = 20) -> str:
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36 FSA-ProjectCheck/1.0",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    })
    with urlopen(req, timeout=timeout) as r:
        raw = r.read(1_500_000)
        charset = r.headers.get_content_charset() or "utf-8"
        return raw.decode(charset, errors="replace")


def _clean_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    return " ".join(html.unescape(value).split())


def _unwrap_ddg(url: str) -> str:
    if url.startswith("//"):
        url = "https:" + url
    p = urlparse(url)
    if p.hostname in {"duckduckgo.com", "www.duckduckgo.com"} and p.path.startswith("/l/"):
        qs = parse_qs(p.query)
        if qs.get("uddg"):
            return unquote(qs["uddg"][0])
    return url


def _valid_result(url: str) -> bool:
    p = urlparse(url)
    if p.scheme not in {"http", "https"} or not p.netloc:
        return False
    return (p.hostname or "").lower() not in SEARCH_HOSTS


def _parse_ddg(doc: str, query: str) -> list[dict]:
    out = []
    pattern = re.compile(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', flags=re.I|re.S)
    matches = list(pattern.finditer(doc))
    for i, m in enumerate(matches):
        url = _unwrap_ddg(html.unescape(m.group(1)))
        if not _valid_result(url):
            continue
        tail_end = matches[i+1].start() if i+1 < len(matches) else min(len(doc), m.end()+1800)
        tail = doc[m.end():tail_end]
        sm = re.search(r'class="result__snippet"[^>]*>(.*?)</(?:a|div)>', tail, flags=re.I|re.S)
        out.append({"provider":"duckduckgo","query":query,"url":url,"title":_clean_text(m.group(2)),"snippet":_clean_text(sm.group(1) if sm else "")})
    return out


def _parse_bing(doc: str, query: str) -> list[dict]:
    out = []
    for block in re.findall(r'<li class="b_algo".*?</li>', doc, flags=re.I|re.S):
        m = re.search(r'<h2>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', block, flags=re.I|re.S)
        if not m:
            continue
        url = html.unescape(m.group(1))
        if not _valid_result(url):
            continue
        sm = re.search(r'<p>(.*?)</p>', block, flags=re.I|re.S)
        out.append({"provider":"bing","query":query,"url":url,"title":_clean_text(m.group(2)),"snippet":_clean_text(sm.group(1) if sm else "")})
    return out


def classify_result(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    if host in SOCIAL_HOSTS:
        return SOCIAL_HOSTS[host]
    if any(hint in host for hint in AUTHORITY_HINTS):
        return "authority"
    if "youtube.com" in host or "youtu.be" in host:
        return "youtube"
    if "reddit.com" in host:
        return "reddit"
    return "web"


def _norm(value: str) -> str:
    return " ".join(str(value or "").lower().split())


def relevance_score(item: dict, domains: list[str], distinctive_terms: list[str]) -> int:
    blob = _norm(" ".join([item.get("url", ""), item.get("title", ""), item.get("snippet", "")]))
    score = 0
    for domain in domains:
        d = _norm(domain).removeprefix("www.")
        if d and d in blob:
            score = max(score, 5)
    for term in distinctive_terms:
        t = _norm(term)
        if len(t) >= 4 and t in blob:
            score = max(score, 4)
    return score


def search_one(query: str, per_provider: int = 6) -> tuple[list[dict], list[str]]:
    errors = []
    results = []
    try:
        doc = _fetch("https://html.duckduckgo.com/html/?q=" + quote_plus(query))
        results.extend(_parse_ddg(doc, query)[:per_provider])
    except Exception as exc:
        errors.append(f"duckduckgo: {type(exc).__name__}: {exc}"[:300])
    if len(results) < max(2, per_provider // 2):
        try:
            doc = _fetch("https://www.bing.com/search?q=" + quote_plus(query))
            results.extend(_parse_bing(doc, query)[:per_provider])
        except Exception as exc:
            errors.append(f"bing: {type(exc).__name__}: {exc}"[:300])

    dedup = []
    seen = set()
    for item in results:
        url = item["url"].split("#", 1)[0]
        key = url.lower().rstrip("/")
        if key in seen:
            continue
        seen.add(key)
        item["url"] = url
        item["category"] = classify_result(url)
        dedup.append(item)
    return dedup, errors


def build_queries(label: str, domains: list[str], distinctive_terms: list[str] | None = None) -> list[dict]:
    label = " ".join(str(label or "").split()).strip()
    domain = next((d for d in domains if d), "")
    terms = [" ".join(str(x or "").split()).strip() for x in (distinctive_terms or []) if str(x or "").strip()]
    anchors=[]
    if domain:
        anchors.append(f'"{domain}"')
    if terms:
        anchors.append(f'"{terms[0]}"')
    elif label:
        anchors.append(f'"{label}"')
    base = " ".join(anchors) or (f'"{label}"' if label else domain)
    themes = [
        ("identity", f"{base} company legal entity register"),
        ("regulation", f"{base} regulator licence license warning"),
        ("people", f"{base} founder director team management"),
        ("social", f"{base} Telegram YouTube Instagram Facebook TikTok"),
        ("user", f"{base} review experience complaint payout support"),
        ("crypto", f"{base} token blockchain contract wallet audit"),
        ("press", f"{base} news article interview"),
    ]
    return [{"theme":theme,"query":query.strip()} for theme, query in themes if query.strip()]


def search_project(label: str, domains: list[str], distinctive_terms: list[str] | None = None, max_per_query: int = 5, max_total: int = 28) -> dict:
    terms = distinctive_terms or []
    queries = build_queries(label, domains, terms)
    all_results = []
    rejected = []
    errors = []
    seen = set()
    for q in queries:
        results, errs = search_one(q["query"], per_provider=max_per_query)
        errors.extend(errs)
        for item in results:
            item["theme"] = q["theme"]
            item["relevance_score"] = relevance_score(item, domains, terms)
            if item["relevance_score"] < 4:
                rejected.append(item)
                continue
            key = item["url"].lower().rstrip("/")
            if key in seen:
                continue
            seen.add(key)
            all_results.append(item)
            if len(all_results) >= max_total:
                break
        if len(all_results) >= max_total:
            break
    return {"queries":queries,"results":all_results,"rejected_results":rejected,"errors":errors}
