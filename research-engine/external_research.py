#!/usr/bin/env python3
"""Externe Rohrecherche für die Akademie Research Engine.

Sucht öffentliche Spuren außerhalb der Projektwebsite und ordnet sie nach
Quellentyp. Keine Anlagebewertung und kein Seriös-/Betrugsurteil.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

import requests
from bs4 import BeautifulSoup

UA = "Akademie-Research-Engine/1.0 (+https://www.liquiditybooster.de/)"
TIMEOUT = 12
MAX_RESULTS_PER_QUERY = 6
MAX_FETCHED_PAGES = 24

PLATFORM_HOSTS = {
    "youtube.com": ("video", "youtube"),
    "youtu.be": ("video", "youtube"),
    "facebook.com": ("social", "facebook"),
    "instagram.com": ("social", "instagram"),
    "tiktok.com": ("social", "tiktok"),
    "x.com": ("social", "x"),
    "twitter.com": ("social", "x"),
    "linkedin.com": ("social", "linkedin"),
    "t.me": ("social", "telegram"),
    "telegram.me": ("social", "telegram"),
    "reddit.com": ("community", "reddit"),
    "trustpilot.com": ("community", "trustpilot"),
}

SEARCH_BLOCKLIST = {
    "duckduckgo.com", "bing.com", "google.com", "search.yahoo.com",
}


@dataclass
class SearchHit:
    url: str
    title: str
    snippet: str
    query: str
    provider: str


@dataclass
class ExternalTrace:
    category: str
    source_relation: str
    platform: str
    source_url: str
    title: str
    evidence: str
    published_at: str
    attribution_confidence: str
    project_match: str
    found_via: str
    fetched: bool


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def compact(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", clean_text(value).lower())


def host_of(url: str) -> str:
    return (urlparse(url).hostname or "").lower().removeprefix("www.")


def same_domain(url: str, domain: str) -> bool:
    host = host_of(url)
    domain = (domain or "").lower().removeprefix("www.")
    return bool(domain and (host == domain or host.endswith("." + domain)))


def canonical_url(url: str) -> str:
    try:
        p = urlparse(url)
        if not p.scheme or not p.netloc:
            return ""
        path = p.path or "/"
        query = p.query
        # reine Trackingparameter entfernen, inhaltliche IDs aber erhalten
        if query:
            pairs = []
            for part in query.split("&"):
                key = part.split("=", 1)[0].lower()
                if key.startswith("utm_") or key in {"fbclid", "gclid", "ref_src", "ref_url"}:
                    continue
                pairs.append(part)
            query = "&".join(pairs)
        return f"{p.scheme.lower()}://{p.netloc.lower()}{path}" + (f"?{query}" if query else "")
    except Exception:
        return ""


def unwrap_search_url(url: str) -> str:
    """Entpackt bekannte DuckDuckGo-Redirects in die echte Ziel-URL."""
    if not url:
        return ""
    if url.startswith("//"):
        url = "https:" + url
    p = urlparse(url)
    if "duckduckgo.com" in (p.hostname or ""):
        target = parse_qs(p.query).get("uddg", [""])[0]
        if target:
            return unquote(target)
    return url


def _result_from_anchor(anchor, snippet: str, query: str, provider: str) -> SearchHit | None:
    href = unwrap_search_url(anchor.get("href", ""))
    if not href.startswith(("http://", "https://")):
        return None
    host = host_of(href)
    if not host or host in SEARCH_BLOCKLIST:
        return None
    return SearchHit(
        url=canonical_url(href),
        title=clean_text(anchor.get_text(" ")),
        snippet=clean_text(snippet),
        query=query,
        provider=provider,
    )


def search_duckduckgo(query: str, limit: int = MAX_RESULTS_PER_QUERY) -> list[SearchHit]:
    url = "https://html.duckduckgo.com/html/?q=" + quote_plus(query)
    try:
        r = requests.get(url, headers={"User-Agent": UA, "Accept": "text/html"}, timeout=TIMEOUT)
        if not r.ok:
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        out: list[SearchHit] = []
        for result in soup.select(".result"):
            a = result.select_one("a.result__a")
            if not a:
                continue
            sn = result.select_one(".result__snippet")
            hit = _result_from_anchor(a, sn.get_text(" ") if sn else "", query, "duckduckgo")
            if hit and hit.url not in {x.url for x in out}:
                out.append(hit)
            if len(out) >= limit:
                break
        return out
    except requests.RequestException:
        return []


def search_bing(query: str, limit: int = MAX_RESULTS_PER_QUERY) -> list[SearchHit]:
    try:
        r = requests.get(
            "https://www.bing.com/search",
            params={"q": query, "count": limit},
            headers={"User-Agent": UA, "Accept": "text/html"},
            timeout=TIMEOUT,
        )
        if not r.ok:
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        out: list[SearchHit] = []
        for item in soup.select("li.b_algo"):
            a = item.select_one("h2 a")
            if not a:
                continue
            p = item.select_one("p")
            hit = _result_from_anchor(a, p.get_text(" ") if p else "", query, "bing")
            if hit and hit.url not in {x.url for x in out}:
                out.append(hit)
            if len(out) >= limit:
                break
        return out
    except requests.RequestException:
        return []


def web_search(query: str, limit: int = MAX_RESULTS_PER_QUERY) -> tuple[list[SearchHit], list[dict]]:
    attempts = []
    hits = search_duckduckgo(query, limit)
    attempts.append({"query": query, "provider": "duckduckgo", "results": len(hits)})
    if hits:
        return hits, attempts
    hits = search_bing(query, limit)
    attempts.append({"query": query, "provider": "bing", "results": len(hits)})
    return hits, attempts


def extract_published_at(soup: BeautifulSoup, raw_text: str = "") -> str:
    selectors = (
        ('meta[property="article:published_time"]', "content"),
        ('meta[name="date"]', "content"),
        ('meta[name="pubdate"]', "content"),
        ('meta[itemprop="datePublished"]', "content"),
        ('time[datetime]', "datetime"),
    )
    for selector, attr in selectors:
        node = soup.select_one(selector)
        if node and node.get(attr):
            return clean_text(node.get(attr, ""))[:40]

    # JSON-LD wird häufig zuverlässiger gepflegt als sichtbare Datumstexte.
    for script in soup.select('script[type="application/ld+json"]'):
        text = script.get_text(" ")
        m = re.search(r'"datePublished"\s*:\s*"([^"]+)"', text, re.I)
        if m:
            return clean_text(m.group(1))[:40]

    m = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", raw_text[:8000])
    return m.group(1) if m else ""


def read_public_page(url: str) -> dict:
    headers = {"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"}
    try:
        r = requests.get(url, headers=headers, timeout=TIMEOUT, allow_redirects=True)
        if r.ok and ("html" in r.headers.get("content-type", "") or "text" in r.headers.get("content-type", "")):
            soup = BeautifulSoup(r.text, "html.parser")
            for tag in soup(["script", "style", "noscript", "svg"]):
                tag.decompose()
            title = clean_text(soup.title.get_text(" ") if soup.title else "")
            text = clean_text(soup.get_text(" "))
            if len(text) >= 220:
                return {
                    "ok": True,
                    "url": canonical_url(r.url or url),
                    "title": title,
                    "text": text[:50000],
                    "published_at": extract_published_at(BeautifulSoup(r.text, "html.parser"), r.text),
                    "mode": "direct",
                }
    except requests.RequestException:
        pass

    try:
        reader = "https://r.jina.ai/" + url
        r = requests.get(reader, headers={"User-Agent": UA, "Accept": "text/plain"}, timeout=TIMEOUT)
        if r.ok and len(r.text) >= 300:
            raw = r.text
            title_match = re.search(r"(?:^|\n)Title:\s*(.+)", raw, re.I)
            published_match = re.search(r"(?:^|\n)Published Time:\s*(.+)", raw, re.I)
            body = raw.split("Markdown Content:", 1)[1] if "Markdown Content:" in raw else raw
            text = clean_text(body)
            if len(text) >= 180:
                return {
                    "ok": True,
                    "url": canonical_url(url),
                    "title": clean_text(title_match.group(1)) if title_match else "",
                    "text": text[:50000],
                    "published_at": clean_text(published_match.group(1))[:40] if published_match else "",
                    "mode": "reader-fallback",
                }
    except requests.RequestException:
        pass
    return {"ok": False, "url": canonical_url(url), "title": "", "text": "", "published_at": "", "mode": "unreadable"}


def match_confidence(project_name: str, domain: str, title: str, snippet: str, page_text: str = "") -> tuple[str, str]:
    """Bewertet nur die Zuordnung zum Projekt, nicht die Glaubwürdigkeit der Quelle."""
    hay = clean_text(" ".join([title, snippet, page_text[:9000]])).lower()
    name = clean_text(project_name).lower()
    name_compact = compact(project_name)
    domain = (domain or "").lower().removeprefix("www.")

    if domain and domain in hay:
        return "high", "domain_exact"
    if name and name in hay:
        return "high", "name_exact"
    if len(name_compact) >= 6 and name_compact in compact(hay):
        return "medium", "name_normalized"
    return "low", "search_context_only"


def relation_for(url: str, project_domain: str) -> tuple[str, str, str]:
    host = host_of(url)
    if same_domain(url, project_domain):
        return "project_owned", "project", ""
    for platform_host, (category, platform) in PLATFORM_HOSTS.items():
        if host == platform_host or host.endswith("." + platform_host):
            relation = "community" if category == "community" else "platform"
            return relation, category, platform
    return "independent", "article", ""


def evidence_snippet(text: str, project_name: str, domain: str, fallback: str, width: int = 360) -> str:
    text = clean_text(text)
    if not text:
        return clean_text(fallback)[:width]
    needles = [clean_text(project_name), domain]
    low = text.lower()
    for needle in needles:
        if not needle:
            continue
        idx = low.find(needle.lower())
        if idx >= 0:
            start = max(0, idx - width // 3)
            end = min(len(text), idx + 2 * width // 3)
            return clean_text(text[start:end])[:width]
    return clean_text(fallback or text[:width])[:width]


def query_plan(project_name: str, domain: str, legal_entities: Iterable[str]) -> list[tuple[str, str]]:
    qname = f'"{project_name}"'
    plan = [
        ("article", qname),
        ("article", f'{qname} crypto OR investment OR yield'),
        ("video", f'{qname} site:youtube.com'),
        ("social", f'{qname} site:facebook.com'),
        ("social", f'{qname} site:instagram.com'),
        ("social", f'{qname} site:tiktok.com'),
        ("social", f'{qname} site:x.com OR site:twitter.com'),
        ("social", f'{qname} site:linkedin.com'),
        ("social", f'{qname} site:t.me'),
        ("community", f'{qname} review OR experience OR erfahrung'),
        ("community", f'{qname} withdrawal OR payout OR auszahlung'),
        ("community", f'{qname} site:reddit.com'),
        ("operator", f'{qname} founder OR CEO OR director OR owner'),
        ("operator", f'"{domain}" company OR operator OR company register'),
    ]
    for entity in list(legal_entities)[:5]:
        entity = clean_text(entity)
        if entity:
            plan.append(("operator", f'"{entity}"'))
    return plan


def enrich(core_result: dict) -> dict:
    result = json.loads(json.dumps(core_result))
    ctx = result.get("context", {})
    analysis = result.get("analysis", {})
    project_name = clean_text(ctx.get("project_name") or ctx.get("input") or ctx.get("domain") or "")
    domain = clean_text(ctx.get("domain") or "")
    legal_entities = analysis.get("legal_entities") or []

    if not project_name or not domain:
        result["external_research"] = {
            "status": "not_ready",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "reason": "Projektname oder bestätigte Projektdomain fehlt.",
            "traces": [],
            "search_attempts": [],
        }
        return result

    traces: list[ExternalTrace] = []
    attempts: list[dict] = []
    seen_urls: set[str] = set()
    fetched_count = 0

    for requested_category, query in query_plan(project_name, domain, legal_entities):
        hits, search_attempts = web_search(query)
        attempts.extend(search_attempts)
        for hit in hits:
            url = canonical_url(hit.url)
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)

            relation, detected_category, platform = relation_for(url, domain)
            category = requested_category
            if detected_category in {"video", "social", "community"}:
                category = detected_category

            # Projekt-eigene Treffer bleiben als Kontextspur erhalten, aber werden klar markiert.
            page = {"ok": False, "url": url, "title": "", "text": "", "published_at": ""}
            if fetched_count < MAX_FETCHED_PAGES:
                page = read_public_page(url)
                fetched_count += 1

            title = clean_text(page.get("title") or hit.title)
            page_text = page.get("text") or ""
            confidence, project_match = match_confidence(project_name, domain, title, hit.snippet, page_text)
            if confidence == "low":
                # Ein Suchtreffer allein reicht nicht als Projektzuordnung.
                continue

            evidence = evidence_snippet(page_text, project_name, domain, hit.snippet)
            traces.append(ExternalTrace(
                category=category,
                source_relation=relation,
                platform=platform,
                source_url=page.get("url") or url,
                title=title,
                evidence=evidence,
                published_at=clean_text(page.get("published_at") or ""),
                attribution_confidence=confidence,
                project_match=project_match,
                found_via=f"{hit.provider}: {query}",
                fetched=bool(page.get("ok")),
            ))

    # Deduplizieren, bevorzugt nach stärkster Zuordnung und gelesener Seite.
    dedup: dict[str, ExternalTrace] = {}
    rank = {"high": 2, "medium": 1, "low": 0}
    for trace in traces:
        key = canonical_url(trace.source_url)
        current = dedup.get(key)
        if current is None or (rank[trace.attribution_confidence], trace.fetched) > (rank[current.attribution_confidence], current.fetched):
            dedup[key] = trace

    final_traces = list(dedup.values())
    final_traces.sort(key=lambda t: (
        0 if t.source_relation == "independent" else 1,
        {"article": 0, "video": 1, "community": 2, "social": 3, "operator": 4}.get(t.category, 9),
        t.title.lower(),
    ))

    counts = {}
    relations = {}
    for trace in final_traces:
        counts[trace.category] = counts.get(trace.category, 0) + 1
        relations[trace.source_relation] = relations.get(trace.source_relation, 0) + 1

    result["external_research"] = {
        "status": "ok" if final_traces else "no_confirmed_external_traces",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "principle": "Nur öffentliche Rohspuren. Quellenglaubwürdigkeit und Projektqualität werden hier nicht bewertet.",
        "project_name": project_name,
        "domain": domain,
        "counts_by_category": counts,
        "counts_by_relation": relations,
        "search_attempts": attempts,
        "traces": [asdict(t) for t in final_traces[:80]],
    }
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="Akademie Research Engine · externe Rohrecherche")
    ap.add_argument("--input", required=True, help="JSON-Ausgabe der Website-Research-Engine")
    ap.add_argument("--output", required=True, help="Zieldatei für angereichertes JSON")
    args = ap.parse_args()

    source = json.loads(Path(args.input).read_text(encoding="utf-8"))
    enriched = enrich(source)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(enriched, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
