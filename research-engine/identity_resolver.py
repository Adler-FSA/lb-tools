#!/usr/bin/env python3
"""Universelle Projektidentifikation aus einem bloßen Namen.

Statt blind Domains zu raten, sammelt der Resolver Webkandidaten, liest deren
öffentliche Seiten und bestätigt eine Website nur bei ausreichender
Namens-/Markenübereinstimmung. Keine Projektbewertung.
"""
from __future__ import annotations

import importlib.util
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


ext = load_module("identity_external_research", "external_research.py")
core = load_module("identity_core_engine", "engine.py")

BLOCKED_HOSTS = {
    "facebook.com", "instagram.com", "tiktok.com", "youtube.com", "youtu.be",
    "x.com", "twitter.com", "linkedin.com", "reddit.com", "trustpilot.com",
    "crunchbase.com", "bloomberg.com", "wikipedia.org",
}


@dataclass
class IdentityCandidate:
    url: str
    domain: str
    title: str
    evidence: str
    provider: str
    query: str
    score: int
    exact_name: bool
    normalized_name: bool
    domain_name_match: bool
    readable: bool


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def compact(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", clean(value).lower())


def registrableish_host(url: str) -> str:
    return (urlparse(url).hostname or "").lower().removeprefix("www.")


def blocked_host(host: str) -> bool:
    return any(host == x or host.endswith("." + x) for x in BLOCKED_HOSTS)


def root_url(url: str) -> str:
    p = urlparse(url)
    host = p.hostname or ""
    if not host:
        return ""
    return f"{p.scheme or 'https'}://{host}/"


def query_plan(name: str) -> list[str]:
    quoted = f'"{clean(name)}"'
    return [
        quoted,
        f'{quoted} official website',
        f'{quoted} company',
    ]


def candidate_score(name: str, url: str, title: str, snippet: str, page_text: str) -> tuple[int, dict]:
    name_clean = clean(name)
    name_low = name_clean.lower()
    name_compact = compact(name_clean)
    host = registrableish_host(url)
    host_stem = compact(host.split(".")[0])
    hay = clean(" ".join([title, snippet, page_text[:12000]]))
    hay_low = hay.lower()
    hay_compact = compact(hay)

    exact = bool(name_low and name_low in hay_low)
    normalized = bool(len(name_compact) >= 4 and name_compact in hay_compact)
    domain_match = bool(name_compact and (host_stem == name_compact or name_compact in compact(host)))

    score = 0
    if exact:
        score += 55
    elif normalized:
        score += 34
    if domain_match:
        score += 34
    if title and exact:
        score += 14
    if blocked_host(host):
        score -= 100
    if any(word in host for word in ("review", "scam", "news", "blogspot")):
        score -= 18

    return score, {
        "exact_name": exact,
        "normalized_name": normalized,
        "domain_name_match": domain_match,
    }


def resolve(name: str, limit_per_query: int = 6) -> dict:
    name = clean(name)
    if not name:
        return {"status": "invalid_input", "project_name": "", "candidates": [], "search_attempts": []}

    candidates: dict[str, IdentityCandidate] = {}
    attempts = []

    for query in query_plan(name):
        # Anders als external_research.web_search sammeln wir hier mehrere Provider,
        # damit ein schlechter erster Suchprovider die Identifikation nicht entscheidet.
        provider_results = []
        for provider, fn in (
            ("duckduckgo", ext.search_duckduckgo),
            ("bing", ext.search_bing),
            ("bing-rss", ext.search_bing_rss),
        ):
            hits = fn(query, limit_per_query)
            attempts.append({"query": query, "provider": provider, "results": len(hits)})
            provider_results.extend(hits)

        seen_urls = set()
        for hit in provider_results:
            url = ext.canonical_url(hit.url)
            host = registrableish_host(url)
            if not url or not host or blocked_host(host) or url in seen_urls:
                continue
            seen_urls.add(url)

            root = root_url(url)
            page = ext.read_public_page(root) if root else {"ok": False}
            title = clean(page.get("title") or hit.title)
            text = page.get("text") or ""
            score, flags = candidate_score(name, root or url, title, hit.snippet, text)
            if score < 34:
                continue
            evidence = core.clean_text(text[:420] if text else hit.snippet)[:420]
            item = IdentityCandidate(
                url=root or url,
                domain=registrableish_host(root or url),
                title=title,
                evidence=evidence,
                provider=hit.provider,
                query=query,
                score=score,
                readable=bool(page.get("ok")),
                **flags,
            )
            current = candidates.get(item.domain)
            if current is None or (item.score, item.readable) > (current.score, current.readable):
                candidates[item.domain] = item

    rows = sorted(candidates.values(), key=lambda x: (x.score, x.readable), reverse=True)
    confirmed = [x for x in rows if x.score >= 70 and x.readable]

    # Nur ein klarer Spitzenkandidat darf automatisch bestätigt werden.
    selected = None
    if confirmed:
        if len(confirmed) == 1 or confirmed[0].score >= confirmed[1].score + 12:
            selected = confirmed[0]

    return {
        "status": "resolved" if selected else ("ambiguous" if rows else "not_resolved"),
        "project_name": name,
        "resolved_url": selected.url if selected else "",
        "domain": selected.domain if selected else "",
        "selected": asdict(selected) if selected else None,
        "candidates": [asdict(x) for x in rows[:12]],
        "search_attempts": attempts,
        "principle": "Eine Suchmaschinenposition allein bestätigt keine Projektidentität; Domain und Seiteninhalt müssen zusammenpassen.",
    }
