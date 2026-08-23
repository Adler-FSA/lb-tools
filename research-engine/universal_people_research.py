#!/usr/bin/env python3
"""Universeller Personen-/Management-Wrapper für Deep Research.

Die bestehende Personenpipeline ist fachlich konservativ, enthielt aber noch
Filterbegriffe aus dem KryptoSavings/OpenDelta-Testfall. Dieser Wrapper ersetzt
solche projektspezifischen Filter während des Universal-Laufs durch generische
Personen-/Organisationsfilter. Projektname, Rechtsträger und Marken werden nur
aus dem aktuellen Research-Datensatz abgeleitet.
"""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


pipeline = load_module("people_history_pipeline_for_universal", "people_history_pipeline.py")

# Nur generische UI-/Organisationsphrasen. Keine Projekt-, Personen-, Marken-
# oder Jurisdiktionsnamen dürfen hier stehen.
GENERIC_ORG_STOP = {
    "Privacy Notice", "Terms Use", "Chief Executive Officer", "Chief Operating Officer",
    "Chief Financial Officer", "Managing Director", "Board Directors", "Corporate Governance",
    "Key People", "Past Role", "Company Details", "Company Profile", "Operating Status",
    "Legal Name", "About Company", "About Us", "See All", "All Employees", "Latest News",
    "News Media", "Contact Us", "Executive Team", "Leadership Team",
}

GENERIC_BAD_WORDS = {
    "bank", "bancorp", "llc", "ltd", "limited", "inc", "dao", "company", "corporation",
    "authority", "services", "group", "capital", "protocol", "foundation", "finance",
    "financial", "credit", "people", "role", "profile", "details", "status", "legal",
    "name", "image", "photo", "employees", "republic", "islands", "kingdom", "union",
    "central", "governance", "board", "privacy", "terms", "media", "news",
}

CRAWLER_BAD_WORDS = {
    "chief", "executive", "officer", "company", "key", "people", "index", "products",
    "team", "leadership", "management", "corporate", "board",
}


def generic_crawler_name_ok(name: str) -> bool:
    """Konservativer Personenfilter ohne Marken-/Testfallwissen."""
    n = pipeline.base.clean(name).strip(" .,:;()[]\"'")
    parts = n.split()
    if len(parts) < 2 or len(parts) > 4 or len(n) < 5 or len(n) > 90:
        return False
    normalized = [re.sub(r"[^a-z]", "", p.lower()) for p in parts]
    if any(word in CRAWLER_BAD_WORDS for word in normalized):
        return False
    return not all(len(re.sub(r"[^A-Za-zÀ-ÖØ-öø-ÿ]", "", p)) <= 2 for p in parts)


def enrich(data: dict) -> dict:
    original_org_stop = pipeline.base.ORG_STOP
    original_bad_words = pipeline.base.BAD_WORDS
    original_crawler_name_ok = pipeline.crawler._name_ok

    try:
        pipeline.base.ORG_STOP = set(GENERIC_ORG_STOP)
        pipeline.base.BAD_WORDS = set(GENERIC_BAD_WORDS)
        pipeline.crawler._name_ok = generic_crawler_name_ok
        out = pipeline.enrich(data)
        block = out.setdefault("people_history_research", {})
        block["universal_routing"] = {
            "mode": "generic_people_filters",
            "project_specific_filters_used": False,
            "principle": "Personenfilter enthalten keine Namen, Marken oder Jurisdiktionen aus früheren Testprojekten.",
        }
        return out
    finally:
        pipeline.base.ORG_STOP = original_org_stop
        pipeline.base.BAD_WORDS = original_bad_words
        pipeline.crawler._name_ok = original_crawler_name_ok
