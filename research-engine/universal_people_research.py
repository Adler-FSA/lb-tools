#!/usr/bin/env python3
"""Universeller Personen-/Management-Wrapper für Deep Research.

Ersetzt projektspezifische Filter durch generische Regeln und ergänzt eine zweite
Personenspur: Projektseiten dürfen Team-/Managementrollen als Eigenangabe liefern;
unabhängige Bestätigung sowie Eigentum/UBO bleiben davon strikt getrennt.
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
project_people = load_module("project_people_discovery_for_universal", "project_people_discovery.py")
PROJECT_BASE_NAME_OK = project_people._name_ok

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

PROJECT_SLOGAN_RE = re.compile(
    r"\b(?:core\s+values?|our\s+values?|company\s+values?|mission|vision|our\s+mission|our\s+vision|"
    r"stay\s+relentless|own\s+it(?:\s+end[- ]to[- ]end)?|end[- ]to[- ]end|culture|principles?|"
    r"what\s+we\s+believe|how\s+we\s+work|why\s+we\s+exist)\b",
    re.I,
)


def generic_crawler_name_ok(name: str) -> bool:
    n = pipeline.base.clean(name).strip(" .,:;()[]\"'")
    parts = n.split()
    if len(parts) < 2 or len(parts) > 4 or len(n) < 5 or len(n) > 90:
        return False
    normalized = [re.sub(r"[^a-z]", "", p.lower()) for p in parts]
    if any(word in CRAWLER_BAD_WORDS for word in normalized):
        return False
    return not all(len(re.sub(r"[^A-Za-zÀ-ÖØ-öø-ÿ]", "", p)) <= 2 for p in parts)


def generic_project_name_ok(value: str, *, flat_fallback: bool = False) -> bool:
    """Projektseiten dürfen Teamnamen liefern, aber keine Werte-/Slogan-Überschriften."""
    name = pipeline.base.clean(value).strip(" .,:;()[]\"'")
    if not PROJECT_BASE_NAME_OK(name, flat_fallback=flat_fallback):
        return False
    if PROJECT_SLOGAN_RE.search(name):
        return False
    lowered = name.lower()
    if any(phrase in lowered for phrase in ("stay ", "own it", "our ", "we ")):
        return False
    return True


def _merge_project_claims(out: dict, discovery: dict) -> None:
    block = out.setdefault("people_history_research", {})
    profiles = list(block.get("profiles") or [])
    by_name = {str(p.get("person_name") or "").strip().lower(): p for p in profiles if p.get("person_name")}

    for claim in discovery.get("claims") or []:
        name = str(claim.get("person_name") or "").strip()
        if not name:
            continue
        key = name.lower()
        confirmations = list(claim.get("external_confirmations") or [])
        role = str(claim.get("role") or "").strip()
        existing = by_name.get(key)
        if existing:
            roles = list(existing.get("roles") or [])
            if role and role.lower() not in {str(x).lower() for x in roles}:
                roles.append(role)
            existing["roles"] = roles
            existing["project_claim_source"] = {
                "source_url": claim.get("source_url"),
                "source_title": claim.get("source_title"),
                "evidence": claim.get("evidence"),
            }
            existing["external_project_confirmations"] = confirmations
            if confirmations:
                existing["project_connection_status"] = "externally_linked"
            elif existing.get("project_connection_status") != "externally_linked":
                existing["project_connection_status"] = "project_claim_only"
            continue

        profile = {
            "person_name": name,
            "entity": "",
            "roles": [role] if role else [],
            "entity_connection_status": "not_assessed",
            "project_connection_status": "externally_linked" if confirmations else "project_claim_only",
            "ownership_status": "not_verified",
            "ubo_verified": False,
            "history_record_count": 0,
            "adverse_record_count": 0,
            "project_claim_source": {
                "source_url": claim.get("source_url"),
                "source_title": claim.get("source_title"),
                "evidence": claim.get("evidence"),
            },
            "external_project_confirmations": confirmations,
        }
        profiles.append(profile)
        by_name[key] = profile

    block["profiles"] = profiles
    block["project_people_discovery"] = discovery
    summary = block.setdefault("summary", {})
    summary["person_profile_count"] = len(profiles)
    summary["project_claimed_person_count"] = sum(
        1 for p in profiles if p.get("project_connection_status") in {"project_claim_only", "externally_linked"}
    )
    summary["project_linked_person_count"] = sum(
        1 for p in profiles if p.get("project_connection_status") == "externally_linked"
    )
    if profiles:
        block["status"] = "ok"


def enrich(data: dict) -> dict:
    original_org_stop = pipeline.base.ORG_STOP
    original_bad_words = pipeline.base.BAD_WORDS
    original_crawler_name_ok = pipeline.crawler._name_ok
    original_project_name_ok = project_people._name_ok

    try:
        pipeline.base.ORG_STOP = set(GENERIC_ORG_STOP)
        pipeline.base.BAD_WORDS = set(GENERIC_BAD_WORDS)
        pipeline.crawler._name_ok = generic_crawler_name_ok
        project_people._name_ok = generic_project_name_ok
        out = pipeline.enrich(data)
        discovery = project_people.discover_claims(out)
        _merge_project_claims(out, discovery)
        block = out.setdefault("people_history_research", {})
        block["universal_routing"] = {
            "mode": "generic_people_filters_plus_project_claims",
            "project_specific_filters_used": False,
            "project_claims_are_independent_evidence": False,
            "founder_or_ceo_implies_ubo": False,
            "principle": "Projekt-Team-Angaben sind Eigenangaben; externe Bestätigung und Eigentum/UBO bleiben getrennte Beweiskategorien.",
        }
        return out
    finally:
        pipeline.base.ORG_STOP = original_org_stop
        pipeline.base.BAD_WORDS = original_bad_words
        pipeline.crawler._name_ok = original_crawler_name_ok
        project_people._name_ok = original_project_name_ok
