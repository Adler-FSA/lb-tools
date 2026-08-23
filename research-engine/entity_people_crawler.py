#!/usr/bin/env python3
"""Kleiner Same-Domain-Crawler für Personenrollen auf bereits bestätigten Entity-Domains.

Er entdeckt Links nur innerhalb einer zuvor als entity-owned bestätigten Domain
und akzeptiert Personen nur, wenn Rolle und Entity-Marke lokal miteinander
verbunden sind. Damit wird z. B. ein CEO eines im selben Artikel erwähnten
Partnerunternehmens nicht dem geprüften Rechtsträger zugerechnet.
"""
from __future__ import annotations

import importlib.util
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from urllib.parse import urljoin, urlparse

MODULE = Path(__file__).resolve().parent / "external_research.py"
spec = importlib.util.spec_from_file_location("external_research_for_entity_people", MODULE)
ext = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = ext
spec.loader.exec_module(ext)

ROLE_PATTERN = r"co[- ]?founder|founder|chief executive officer|ceo|president|director|managing director"
LEGAL_SUFFIX_RE = re.compile(r"\b(?:DAO\s+LLC|LLC|Ltd\.?|Limited|Inc\.?|PLC|GmbH|AG|S\.?A\.?)\b", re.I)
NAME_TOKEN = r"[A-ZÄÖÜÀ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’\-]{1,35}"
NAME_PATTERN = rf"{NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,3}}"

SKIP_PATH_PARTS = (
    "/tag/", "/author/", "/page/", "/signup", "/subscribe", "/privacy", "/terms",
    "/rss", "/assets/", "/content/images/", "/ghost/",
)
SKIP_EXACT_PATHS = {"", "/", "/about", "/about/", "/archive", "/archive/"}


@dataclass
class EntityPersonFinding:
    person_name: str
    role: str
    entity: str
    alias: str
    source_url: str
    source_title: str
    evidence: str
    published_at: str
    fetch_mode: str


def clean(value: str) -> str:
    return ext.clean_text(value)


def entity_aliases(entity: str) -> list[str]:
    base = clean(LEGAL_SUFFIX_RE.sub(" ", entity)).strip(" .,-")
    vals: list[str] = []
    for candidate in (base, re.sub(r"\s+", "", base)):
        candidate = clean(candidate)
        if len(candidate) >= 5 and candidate.lower() not in {v.lower() for v in vals}:
            vals.append(candidate)
    return vals


def _name_ok(name: str) -> bool:
    n = clean(name).strip(" .,:;()[]\"'")
    parts = n.split()
    if len(parts) < 2 or len(parts) > 4 or len(n) > 90:
        return False
    banned = {"chief", "executive", "officer", "company", "open", "delta", "key", "people", "index", "products"}
    return not any(re.sub(r"[^a-z]", "", p.lower()) in banned for p in parts)


def _evidence(text: str, start: int, end: int, width: int = 360) -> str:
    left = max(0, start - 110)
    right = min(len(text), end + width)
    return clean(text[left:right])[:620]


def extract_entity_role_mentions(text: str, entity: str) -> list[dict]:
    """Extrahiert nur syntaktisch lokale Entity↔Rolle↔Person-Verknüpfungen."""
    body = clean(text)
    out: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for alias in entity_aliases(entity):
        a = re.escape(alias)
        patterns = (
            # OpenDelta co-founder Nick Schteringard
            re.compile(rf"\b(?P<alias>{a})['’]?s?\s+(?P<role>(?i:{ROLE_PATTERN}))\s+(?P<name>{NAME_PATTERN})\b"),
            # Konstantin Wünscher, CEO of OpenDelta
            re.compile(rf"\b(?P<name>{NAME_PATTERN})\s*,?\s+(?P<role>(?i:{ROLE_PATTERN}))\s+(?:of|at|for)\s+(?P<alias>{a})\b"),
            # Konstantin Wünscher is the CEO of OpenDelta
            re.compile(rf"\b(?P<name>{NAME_PATTERN})\s+(?:is|serves\s+as)\s+(?:the\s+|an?\s+)?(?P<role>(?i:{ROLE_PATTERN}))\s+(?:of|at|for)\s+(?P<alias>{a})\b"),
            # CEO of OpenDelta Konstantin Wünscher
            re.compile(rf"\b(?P<role>(?i:{ROLE_PATTERN}))\s+(?:of|at|for)\s+(?P<alias>{a})\s*[:,–—-]?\s+(?P<name>{NAME_PATTERN})\b"),
        )
        for rx in patterns:
            for m in rx.finditer(body):
                name = clean(m.group("name")).strip(" .,:;()[]\"'")
                role = clean(m.group("role"))
                if not _name_ok(name):
                    continue
                key = (name.lower(), role.lower())
                if key in seen:
                    continue
                seen.add(key)
                out.append({
                    "person_name": name,
                    "role": role,
                    "entity": entity,
                    "alias": alias,
                    "evidence": _evidence(body, m.start(), m.end()),
                })
    return out


def _root_domain(host: str) -> str:
    parts = (host or "").lower().split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else (host or "").lower()


def _same_root(url: str, trusted_root: str) -> bool:
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    root = trusted_root.lower().removeprefix("www.")
    return host == root or host.endswith("." + root)


def _article_like(url: str) -> bool:
    p = urlparse(url)
    path = p.path or "/"
    low = path.lower()
    if low in SKIP_EXACT_PATHS or any(part in low for part in SKIP_PATH_PARTS):
        return False
    if re.search(r"\.(?:png|jpe?g|gif|webp|svg|css|js|ico|xml|json|pdf)$", low):
        return False
    slug = low.strip("/").split("/")[-1]
    return len(slug) >= 5 and any(ch.isalpha() for ch in slug)


def discover_same_domain_links(seed_url: str, trusted_root: str, limit: int = 14) -> list[str]:
    """Extrahiert Artikel-Links aus HTML; Reader-Markdown dient nur als Fallback."""
    found: list[str] = []
    try:
        r = ext.requests.get(seed_url, headers={"User-Agent": ext.UA, "Accept": "text/html"}, timeout=ext.TIMEOUT, allow_redirects=True)
        if r.ok:
            soup = ext.BeautifulSoup(r.text, "html.parser")
            for a in soup.select("a[href]"):
                href = clean(a.get("href") or "")
                if not href:
                    continue
                url = ext.canonical_url(urljoin(r.url or seed_url, href))
                if url and _same_root(url, trusted_root) and _article_like(url) and url not in found:
                    found.append(url)
                    if len(found) >= limit:
                        return found
    except Exception:
        pass

    if found:
        return found[:limit]

    try:
        r = ext.requests.get("https://r.jina.ai/" + seed_url, headers={"User-Agent": ext.UA, "Accept": "text/plain"}, timeout=ext.TIMEOUT)
        if r.ok:
            for href in re.findall(r"\]\((https?://[^)\s]+)\)", r.text):
                url = ext.canonical_url(href)
                if url and _same_root(url, trusted_root) and _article_like(url) and url not in found:
                    found.append(url)
                    if len(found) >= limit:
                        break
    except Exception:
        pass
    return found[:limit]


def crawl_entity_people(entity: str, trusted_roots: list[str], max_links_per_root: int = 14, max_pages: int = 18) -> dict:
    links: list[str] = []
    seeds: list[str] = []
    diagnostics: list[dict] = []
    for root in trusted_roots:
        root = root.lower().removeprefix("www.")
        for seed in (f"https://{root}/", f"https://blog.{root}/archive/", f"https://blog.{root}/"):
            if seed not in seeds:
                seeds.append(seed)
            for link in discover_same_domain_links(seed, root, max_links_per_root):
                if link not in links:
                    links.append(link)

    findings: list[EntityPersonFinding] = []
    seen_people_sources: set[tuple[str, str]] = set()
    for url in links[:max_pages]:
        page = ext.read_public_page(url)
        if not page.get("ok"):
            diagnostics.append({"url": url, "ok": False, "mode": page.get("mode")})
            continue
        mentions = extract_entity_role_mentions(page.get("text") or "", entity)
        diagnostics.append({"url": page.get("url") or url, "ok": True, "mode": page.get("mode"), "mention_count": len(mentions)})
        for m in mentions:
            key = (m["person_name"].lower(), ext.canonical_url(page.get("url") or url))
            if key in seen_people_sources:
                continue
            seen_people_sources.add(key)
            findings.append(EntityPersonFinding(
                person_name=m["person_name"],
                role=m["role"],
                entity=entity,
                alias=m["alias"],
                source_url=ext.canonical_url(page.get("url") or url),
                source_title=clean(page.get("title") or ""),
                evidence=m["evidence"],
                published_at=clean(page.get("published_at") or ""),
                fetch_mode=clean(page.get("mode") or ""),
            ))

    return {
        "entity": entity,
        "trusted_roots": trusted_roots,
        "seeds": seeds,
        "discovered_links": links,
        "pages_checked": min(len(links), max_pages),
        "findings": [asdict(x) for x in findings],
        "diagnostics": diagnostics,
    }
