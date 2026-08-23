#!/usr/bin/env python3
"""Projekt-Team-Spuren für Deep Research.

Entdeckt Personen/Rollen zunächst auf projekt-eigenen About/Team/Leadership-Seiten
und versucht anschließend eine unabhängige Bestätigung. Projektbehauptung,
unabhängige Bestätigung und Eigentum/UBO bleiben strikt getrennt.
"""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
MODULE = ROOT / "external_research.py"
spec = importlib.util.spec_from_file_location("external_research_for_project_people", MODULE)
ext = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = ext
spec.loader.exec_module(ext)

ROLE_PATTERN = (
    r"co[- ]?founder|founder|group ceo|chief executive officer|chief product officer|"
    r"chief technology officer|chief operating officer|chief financial officer|"
    r"ceo|cpo|cto|coo|cfo|chairman|board member|director|managing director|president"
)
ROLE_RE = re.compile(rf"\b(?:{ROLE_PATTERN})\b", re.I)
NAME_TOKEN = r"[A-ZÄÖÜÀ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’\-]{1,35}"
NAME_PATTERN = rf"{NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,3}}"
NAME_ROLE_RE = re.compile(
    rf"\b(?P<name>{NAME_PATTERN})\b\s*(?:[:,–—-]|\bis\b|\bserves\s+as\b)?\s*"
    rf"(?:the\s+|an?\s+)?(?P<role>(?i:{ROLE_PATTERN}))\b"
)
ROLE_NAME_RE = re.compile(
    rf"\b(?P<role>(?i:{ROLE_PATTERN}))\b\s*[:,–—-]?\s+(?P<name>{NAME_PATTERN})\b"
)
TEAM_HINT_RE = re.compile(r"\b(?:about|team|leadership|management|board|people|company|founders?)\b", re.I)
BAD_NAME_WORDS = {
    "about", "team", "leadership", "management", "board", "member", "chief", "executive",
    "officer", "company", "project", "platform", "financial", "services", "infrastructure",
    "privacy", "terms", "contact", "read", "documentation", "founder", "chairman",
}
INDEPENDENT_HOSTS = {
    "crunchbase.com", "reuters.com", "bloomberg.com", "forbes.com", "theblock.co",
    "coindesk.com", "cbinsights.com", "theorg.com", "linkedin.com", "play.google.com",
}


def clean(value: str) -> str:
    return ext.clean_text(value)


def _name_ok(value: str) -> bool:
    name = clean(value).strip(" .,:;()[]\"'")
    parts = name.split()
    if len(parts) < 2 or len(parts) > 4 or len(name) < 5 or len(name) > 90:
        return False
    normalized = [re.sub(r"[^a-z]", "", p.lower()) for p in parts]
    if any(p in BAD_NAME_WORDS for p in normalized):
        return False
    return True


def _evidence(text: str, start: int, end: int, width: int = 430) -> str:
    body = clean(text)
    left = max(0, start - 90)
    right = min(len(body), end + width)
    return clean(body[left:right])[:620]


def extract_people(text: str) -> list[dict]:
    body = clean(text)
    if not body or not ROLE_RE.search(body):
        return []
    out: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for rx in (NAME_ROLE_RE, ROLE_NAME_RE):
        for m in rx.finditer(body):
            name = clean(m.group("name")).strip(" .,:;()[]\"'")
            role = clean(m.group("role"))
            if not _name_ok(name):
                continue
            key = (name.lower(), role.lower())
            if key in seen:
                continue
            seen.add(key)
            out.append({"person_name": name, "role": role, "evidence": _evidence(body, m.start(), m.end())})
    return out[:20]


def _same_project_domain(url: str, domain: str) -> bool:
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    root = (domain or "").lower().removeprefix("www.")
    return bool(root and (host == root or host.endswith("." + root)))


def candidate_team_urls(data: dict) -> list[str]:
    ctx = data.get("context") or {}
    analysis = data.get("analysis") or {}
    domain = clean(ctx.get("domain") or "")
    urls: list[str] = []
    for page in analysis.get("pages") or []:
        url = ext.canonical_url(page.get("url") or "")
        title = clean(page.get("title") or "")
        if not url or not _same_project_domain(url, domain):
            continue
        hay = f"{url} {title}"
        if TEAM_HINT_RE.search(hay) and url not in urls:
            urls.append(url)
    if domain:
        for path in ("/about", "/about-us", "/team", "/leadership", "/management"):
            url = f"https://{domain}{path}"
            if url not in urls:
                urls.append(url)
    return urls[:8]


def discover_claims(data: dict) -> dict:
    ctx = data.get("context") or {}
    project_name = clean(ctx.get("project_name") or ctx.get("input") or "")
    project_domain = clean(ctx.get("domain") or "")
    claims: list[dict] = []
    pages_checked: list[dict] = []
    seen: set[str] = set()

    for url in candidate_team_urls(data):
        page = ext.read_public_page(url)
        pages_checked.append({"url": url, "ok": bool(page.get("ok")), "mode": page.get("mode")})
        if not page.get("ok"):
            continue
        for item in extract_people(page.get("text") or ""):
            key = item["person_name"].lower()
            if key in seen:
                continue
            seen.add(key)
            claims.append({
                **item,
                "source_url": ext.canonical_url(page.get("url") or url),
                "source_title": clean(page.get("title") or ""),
                "source_relation": "project_owned",
                "project_connection_status": "project_claim_only",
                "external_confirmations": [],
            })

    attempts: list[dict] = []
    fetched = 0
    project_tokens = [t for t in re.findall(r"[A-Za-z0-9]+", project_name.lower()) if len(t) >= 4]
    domain_stem = project_domain.split(".")[0].lower() if project_domain else ""

    for claim in claims[:10]:
        person = claim["person_name"]
        queries = [f'"{person}" "{project_name}"', f'"{person}" "{project_domain}"']
        confirmations: list[dict] = []
        seen_urls: set[str] = set()
        for query in queries:
            hits, att = ext.web_search(query, 6)
            attempts.extend(att)
            for hit in hits:
                url = ext.canonical_url(hit.url)
                if not url or url in seen_urls or _same_project_domain(url, project_domain):
                    continue
                seen_urls.add(url)
                combined = clean(f"{hit.title} {hit.snippet}")
                low = combined.lower()
                project_match = bool(domain_stem and domain_stem in low) or any(t in low for t in project_tokens[:3])
                if person.lower() not in low or not project_match:
                    continue
                page = {"ok": False, "url": url, "title": hit.title, "text": hit.snippet}
                if fetched < 12:
                    page = ext.read_public_page(url)
                    fetched += 1
                text = clean(f"{page.get('title') or hit.title} {page.get('text') or hit.snippet}")
                tlow = text.lower()
                if person.lower() not in tlow:
                    continue
                if not (bool(domain_stem and domain_stem in tlow) or any(t in tlow for t in project_tokens[:3])):
                    continue
                host = ext.host_of(page.get("url") or url)
                relation = "independent" if any(host == h or host.endswith("." + h) for h in INDEPENDENT_HOSTS) else "external"
                confirmations.append({
                    "source_url": ext.canonical_url(page.get("url") or url),
                    "source_title": clean(page.get("title") or hit.title),
                    "source_relation": relation,
                    "evidence": text[:620],
                    "found_via": query,
                })
                if len(confirmations) >= 3:
                    break
            if len(confirmations) >= 3:
                break
        claim["external_confirmations"] = confirmations
        if confirmations:
            claim["project_connection_status"] = "externally_linked"

    return {
        "status": "ok" if claims else "no_project_people_claims",
        "project_name": project_name,
        "project_domain": project_domain,
        "pages_checked": pages_checked,
        "claims": claims,
        "search_attempts": attempts,
        "principle": "Projekt-Team-Angaben sind Eigenangaben; externe Bestätigung und Eigentum/UBO werden separat bewertet.",
    }
