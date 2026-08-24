#!/usr/bin/env python3
"""Universeller Guard für externe Research-Spuren.

Kurze oder generische Projektnamen dürfen nicht allein durch Namensgleichheit
als unabhängig bestätigte Spur gelten. Der Guard bleibt projektneutral und
lässt die bestehende External-Research-Engine unangetastet.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


base = load_module("external_research_base_for_universal_guard", "external_research.py")
_BASE_MATCH_CONFIDENCE = base.match_confidence

# Konfigurationswerte werden vom Universal-Runtime je Modus angepasst.
TIMEOUT = base.TIMEOUT
MAX_RESULTS_PER_QUERY = base.MAX_RESULTS_PER_QUERY
MAX_FETCHED_PAGES = base.MAX_FETCHED_PAGES
query_plan = base.query_plan

# Öffentliche Helfer weiterreichen, damit Quick-/Operator-Module denselben Adapter
# wie bisher verwenden können.
clean_text = base.clean_text
compact = base.compact
host_of = base.host_of
same_domain = base.same_domain
canonical_url = base.canonical_url
web_search = base.web_search
read_public_page = base.read_public_page
legal_entity_anchor = base.legal_entity_anchor
relation_for = base.relation_for
evidence_snippet = base.evidence_snippet
SearchHit = base.SearchHit
ExternalTrace = base.ExternalTrace


def match_confidence(project_name: str, domain: str, title: str, snippet: str, page_text: str = "") -> tuple[str, str]:
    """Namensgleichheit bei kurzen Namen ist nur ein Kandidat, kein Beweis.

    Beispiel: "WeFi" kann mehrere völlig verschiedene Firmen bezeichnen.
    Ein bestätigter Domainbezug bleibt dagegen ein starker Identitätsanker.
    """
    confidence, match = _BASE_MATCH_CONFIDENCE(project_name, domain, title, snippet, page_text)
    name_compact = compact(project_name)
    if match == "name_exact" and len(name_compact) <= 5:
        return "medium", "short_name_exact"
    return confidence, match


def _promote_short_name_with_entity(data: dict, block: dict) -> None:
    """Kurzer Name + erkannter Rechtsträger darf wieder stark werden.

    Damit werden echte Artikel nicht pauschal verworfen: Nennt eine Quelle neben
    dem kurzen Projektnamen auch einen vom Projekt selbst erkannten Rechtsträger,
    ist die Zuordnung wesentlich belastbarer.
    """
    entities = [clean_text(x) for x in (data.get("analysis") or {}).get("legal_entities") or [] if clean_text(x)]
    if not entities:
        return

    keep = []
    promoted = []
    for item in list(block.get("review_candidates") or []):
        if item.get("project_match") != "short_name_exact":
            keep.append(item)
            continue
        hay = clean_text(" ".join([item.get("title") or "", item.get("evidence") or ""])).lower()
        entity = next((e for e in entities if e.lower() in hay), "")
        if not entity:
            keep.append(item)
            continue
        upgraded = dict(item)
        upgraded["attribution_confidence"] = "high"
        upgraded["project_match"] = "short_name_plus_legal_entity"
        promoted.append(upgraded)

    existing = list(block.get("traces") or [])
    seen = {canonical_url(x.get("source_url") or "") for x in existing}
    for item in promoted:
        key = canonical_url(item.get("source_url") or "")
        if key and key not in seen:
            existing.append(item)
            seen.add(key)

    block["traces"] = existing
    block["review_candidates"] = keep
    block["review_candidate_count"] = len(keep)
    if promoted:
        counts = dict(block.get("counts_by_category") or {})
        relations = dict(block.get("counts_by_relation") or {})
        for item in promoted:
            cat = item.get("category") or "article"
            rel = item.get("source_relation") or "independent"
            counts[cat] = counts.get(cat, 0) + 1
            relations[rel] = relations.get(rel, 0) + 1
        block["counts_by_category"] = counts
        block["counts_by_relation"] = relations
        block["status"] = "ok"


def _deep_query_budget(data: dict) -> int:
    """Gibt die tatsächlich konfigurierte Zahl der Deep-Suchabfragen zurück."""
    ctx = data.get("context") or {}
    analysis = data.get("analysis") or {}
    project_name = clean_text(ctx.get("project_name") or ctx.get("input") or ctx.get("domain") or "")
    domain = clean_text(ctx.get("domain") or "")
    if not project_name or not domain:
        return 0
    return len(query_plan(project_name, domain, analysis.get("legal_entities") or []))


def enrich(data: dict) -> dict:
    original_match = base.match_confidence
    original_plan = base.query_plan
    original_timeout = base.TIMEOUT
    original_results = base.MAX_RESULTS_PER_QUERY
    original_pages = base.MAX_FETCHED_PAGES
    try:
        base.match_confidence = match_confidence
        base.query_plan = query_plan
        base.TIMEOUT = TIMEOUT
        base.MAX_RESULTS_PER_QUERY = MAX_RESULTS_PER_QUERY
        base.MAX_FETCHED_PAGES = MAX_FETCHED_PAGES
        out = base.enrich(data)
        block = out.setdefault("external_research", {})
        _promote_short_name_with_entity(out, block)
        block["research_depth"] = "deep"
        block["query_budget"] = _deep_query_budget(out)
        block["page_fetch_budget"] = MAX_FETCHED_PAGES
        block["identity_guardrail"] = {
            "short_name_threshold": 5,
            "principle": "Kurze/mehrdeutige Projektnamen werden nicht allein durch Namensgleichheit als externe Bestätigung akzeptiert.",
        }
        return out
    finally:
        base.match_confidence = original_match
        base.query_plan = original_plan
        base.TIMEOUT = original_timeout
        base.MAX_RESULTS_PER_QUERY = original_results
        base.MAX_FETCHED_PAGES = original_pages
