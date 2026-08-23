#!/usr/bin/env python3
"""Schlanke externe Recherche für den SchnellCheck.

Der SchnellCheck sucht nur wenige, hochpriorisierte Fremdspuren. Plattform-,
Personen-, Register- und Vollsweeps bleiben der Deep-Research-Pipeline vorbehalten.
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


ext = load_module("external_research_for_quick", "external_research.py")

QUICK_MAX_FETCHED_PAGES = 8


def quick_query_plan(data: dict) -> list[tuple[str, str]]:
    ctx = data.get("context") or {}
    analysis = data.get("analysis") or {}
    detected = analysis.get("detected") or {}
    project_name = ext.clean_text(ctx.get("project_name") or ctx.get("input") or "")
    domain = ext.clean_text(ctx.get("domain") or "")
    qname = f'"{project_name}"'

    plan: list[tuple[str, str]] = [("article", qname)]
    if domain:
        plan.append(("article", f'"{domain}"'))

    finance_signal = any(detected.get(x) for x in ("staking", "defi", "trading", "leverage", "lending", "custody")) or analysis.get("max_yield_percentage") is not None
    distribution_signal = bool(detected.get("referral") or analysis.get("max_commission_percentage") is not None)

    if finance_signal:
        plan.append(("article", f'{qname} warning OR regulator OR license OR licence'))
    if distribution_signal:
        plan.append(("community", f'{qname} review OR experience OR erfahrung'))
    elif not finance_signal:
        plan.append(("article", f'{qname} review OR experience OR erfahrung'))

    return plan[:4]


def enrich(data: dict) -> dict:
    plan = quick_query_plan(data)
    original_plan = ext.query_plan
    original_max = ext.MAX_FETCHED_PAGES
    try:
        ext.query_plan = lambda project_name, domain, legal_entities: list(plan)
        ext.MAX_FETCHED_PAGES = QUICK_MAX_FETCHED_PAGES
        out = ext.enrich(data)
        block = out.setdefault("external_research", {})
        block["research_depth"] = "quick"
        block["query_budget"] = len(plan)
        block["page_fetch_budget"] = QUICK_MAX_FETCHED_PAGES
        block["principle"] = "SchnellCheck: wenige priorisierte Fremdspuren. Vollständige Plattform-, Personen-, Register- und Community-Recherche bleibt Deep Research vorbehalten."
        return out
    finally:
        ext.query_plan = original_plan
        ext.MAX_FETCHED_PAGES = original_max
