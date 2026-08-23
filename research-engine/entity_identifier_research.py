#!/usr/bin/env python3
"""Recherche über stabile Firmen-/Lizenz-/Registernummern.

Ein Firmenname kann sich ändern. Eine vom Projekt genannte Register-, Corporate-
oder Lizenznummer wird deshalb separat extrahiert und außerhalb der Projektdomain
gesucht. Ein Nummerntreffer bestätigt nicht automatisch die Projektverbindung;
er kann insbesondere einen Namenswechsel oder einen Widerspruch sichtbar machen.
"""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODULE = ROOT / "external_research.py"
spec = importlib.util.spec_from_file_location("external_research_for_identifier", MODULE)
ext = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = ext
spec.loader.exec_module(ext)

CONTEXT_RE = re.compile(
    r"\b(?:corporate|company|registration|registry|incorporation|business|msb|licen[cs]e|"
    r"money services business)\b",
    re.I,
)
TOKEN_RES = (
    re.compile(r"\bM\d{6,12}\b", re.I),
    re.compile(r"\b\d{1,4}(?:-\d{2,6}){1,3}\b"),
    re.compile(r"\b\d{3,6}\s+LLC\s+\d{4}\b", re.I),
    re.compile(r"\b\d{7,12}\b"),
)
LEGAL_NAME_RE = re.compile(
    r"\b([A-ZÄÖÜ0-9][A-Za-zÄÖÜäöüß0-9&.'’\- ]{1,70}\s(?:GmbH|AG|SE|Ltd\.?|Limited|LLC|Inc\.?|PLC|S\.?A\.?|S\.?R\.?L\.?|B\.V\.))\b"
)
OFFICIAL_SUFFIXES = (
    "canada.ca", "fintrac-canafe.canada.ca", "gc.ca", "gov.uk", "sec.gov", "finra.org",
    "bafin.de", "europa.eu", "esma.europa.eu", "gov.hk", "gov.sg", "gov.au", "gov.nz",
)


def clean(value: str) -> str:
    return ext.clean_text(value)


def compact_identifier(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", clean(value).upper())


def same_project(url: str, domain: str) -> bool:
    return ext.same_domain(url, domain)


def _candidate_tokens(text: str) -> list[tuple[str, int, int]]:
    body = clean(text)
    out: list[tuple[str, int, int]] = []
    seen: set[str] = set()
    for rx in TOKEN_RES:
        for m in rx.finditer(body):
            value = clean(m.group(0))
            key = compact_identifier(value)
            if len(key) < 6 or key in seen:
                continue
            # Reine lange Zahlen zählen nur, wenn im nahen Kontext eine Firmen-/Registerangabe steht.
            window = body[max(0, m.start() - 90):min(len(body), m.end() + 45)]
            if value.isdigit() and not CONTEXT_RE.search(window):
                continue
            seen.add(key)
            out.append((value, m.start(), m.end()))
    return out


def extract_identifier_claims(analysis: dict) -> list[dict]:
    claims: list[dict] = []
    seen: set[tuple[str, str]] = set()
    entities = [clean(x) for x in analysis.get("legal_entities") or [] if clean(x)]

    for finding in analysis.get("findings") or []:
        if finding.get("type") != "legal_entity":
            continue
        entity = clean(finding.get("value") or "")
        evidence = clean(finding.get("evidence") or "")
        for identifier, start, end in _candidate_tokens(evidence):
            key = (entity.lower(), compact_identifier(identifier))
            if key in seen:
                continue
            seen.add(key)
            claims.append({
                "entity": entity,
                "identifier": identifier,
                "identifier_compact": compact_identifier(identifier),
                "source_url": finding.get("source_url") or "",
                "evidence": evidence,
                "claim_relation": "project_owned",
            })

    # Numerische Rechtsformen können ihre eigene Firmen-ID bereits im Namen tragen.
    for entity in entities:
        for identifier, _, _ in _candidate_tokens(entity):
            key = (entity.lower(), compact_identifier(identifier))
            if key in seen:
                continue
            seen.add(key)
            claims.append({
                "entity": entity,
                "identifier": identifier,
                "identifier_compact": compact_identifier(identifier),
                "source_url": "",
                "evidence": entity,
                "claim_relation": "project_owned",
            })
    return claims[:24]


def _identifier_present(text: str, identifier: str) -> bool:
    target = compact_identifier(identifier)
    hay = re.sub(r"[^A-Z0-9]", "", clean(text).upper())
    return bool(target and target in hay)


def _source_relation(url: str) -> str:
    host = ext.host_of(url)
    if any(host == suffix or host.endswith("." + suffix) for suffix in OFFICIAL_SUFFIXES):
        return "official_or_government"
    return "independent"


def _alternate_names(text: str, claimed_entity: str) -> list[str]:
    out: list[str] = []
    claimed = ext.compact(claimed_entity)
    for m in LEGAL_NAME_RE.finditer(clean(text)):
        value = clean(m.group(1)).strip(" .,:;-()").strip()
        if not value or len(value) > 78 or ext.compact(value) == claimed:
            continue
        if value.lower() not in {x.lower() for x in out}:
            out.append(value)
    return out[:8]


def _project_match(text: str, project_name: str, project_domain: str) -> bool:
    hay = clean(text).lower()
    stem = (project_domain or "").split(".")[0].lower()
    tokens = [t for t in re.findall(r"[a-z0-9]+", project_name.lower()) if len(t) >= 4]
    return bool(stem and stem in hay) or any(t in hay for t in tokens[:3])


def research(data: dict) -> dict:
    ctx = data.get("context") or {}
    analysis = data.get("analysis") or {}
    project_name = clean(ctx.get("project_name") or ctx.get("input") or "")
    project_domain = clean(ctx.get("domain") or "")
    claims = extract_identifier_claims(analysis)
    records: list[dict] = []
    attempts: list[dict] = []
    fetched = 0
    seen_urls: set[tuple[str, str]] = set()

    for claim in claims:
        entity = claim["entity"]
        identifier = claim["identifier"]
        queries = [f'"{identifier}" "{entity}"', f'"{identifier}" registry', f'"{identifier}"']
        for query in queries:
            hits, att = ext.web_search(query, 6)
            attempts.extend([{**a, "entity": entity, "identifier": identifier} for a in att])
            for hit in hits:
                url = ext.canonical_url(hit.url)
                key = (claim["identifier_compact"], url)
                if not url or key in seen_urls or same_project(url, project_domain):
                    continue
                seen_urls.add(key)
                snippet_text = clean(f"{hit.title} {hit.snippet}")
                if not _identifier_present(snippet_text, identifier):
                    continue
                page = {"ok": False, "url": url, "title": hit.title, "text": hit.snippet, "published_at": ""}
                if fetched < 24:
                    try:
                        page = ext.read_public_page(url)
                    except Exception:
                        pass
                    fetched += 1
                body = clean(f"{page.get('title') or hit.title} {page.get('text') or hit.snippet}")
                if not _identifier_present(body, identifier):
                    continue
                relation = _source_relation(page.get("url") or url)
                alternate = _alternate_names(body[:16000], entity)
                records.append({
                    "entity": entity,
                    "identifier": identifier,
                    "identifier_compact": claim["identifier_compact"],
                    "source_url": ext.canonical_url(page.get("url") or url),
                    "source_title": clean(page.get("title") or hit.title),
                    "source_relation": relation,
                    "evidence": body[:900],
                    "published_at": clean(page.get("published_at") or ""),
                    "project_name_mentioned": _project_match(body, project_name, project_domain),
                    "alternate_legal_names": alternate,
                    "name_conflict": bool(alternate),
                    "fetched": bool(page.get("ok")),
                    "found_via": query,
                })
                if len([r for r in records if r["identifier_compact"] == claim["identifier_compact"]]) >= 4:
                    break
            if len([r for r in records if r["identifier_compact"] == claim["identifier_compact"]]) >= 4:
                break

    return {
        "status": "ok" if claims else "no_identifier_claims",
        "claims": claims,
        "records": records,
        "search_attempts": attempts,
        "summary": {
            "identifier_claim_count": len(claims),
            "identifier_record_count": len(records),
            "official_identifier_record_count": sum(1 for r in records if r["source_relation"] == "official_or_government"),
            "independent_identifier_record_count": sum(1 for r in records if r["source_relation"] == "independent"),
            "identifier_name_conflict_count": sum(1 for r in records if r.get("name_conflict")),
        },
        "principle": "Eine Nummernübereinstimmung ist ein starker Identitätsanker. Sie belegt jedoch nicht automatisch die aktuelle Projektrolle; abweichende Rechtsträgernamen werden als Klärungssignal ausgewiesen.",
    }
