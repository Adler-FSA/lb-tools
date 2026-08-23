#!/usr/bin/env python3
"""Universeller Betreiber-/Register-Wrapper.

Führt die bestehende Betreiberrecherche aus, schaltet spezielle
Jurisdiktionsadapter nur bei einem tatsächlichen Hinweis ein und nutzt zusätzlich
Firmen-/Lizenz-/Registernummern als stabile Deep-Research-Anker.
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


base = load_module("operator_registry_research_base_for_universal", "operator_registry_research.py")
adapters = load_module("registry_adapters_for_universal", "registry_adapters.py")
identifiers = load_module("entity_identifier_research_for_universal", "entity_identifier_research.py")


def _compatible_record(record: dict) -> dict:
    official = record.get("source_relation") == "official_or_government"
    return {
        "entity": record.get("entity") or "",
        "source_role": "government" if official else "independent",
        "source_url": record.get("source_url") or "",
        "title": record.get("source_title") or "",
        "evidence": record.get("evidence") or "",
        "published_at": record.get("published_at") or "",
        "record_type": "identifier_registry_trace",
        "status_text": "",
        "license_number": record.get("identifier") or "",
        "project_connection": "externally_linked" if record.get("project_name_mentioned") else "identifier_match_only",
        "project_match": record.get("identifier") or "",
        "authority_confidence": "high" if official else "medium",
        "fetched": bool(record.get("fetched")),
        "found_via": record.get("found_via") or "identifier-search",
    }


def _merge_identifier_research(out: dict) -> None:
    identifier_block = identifiers.research(out)
    block = out.setdefault("operator_registry_research", {})
    block["identifier_research"] = identifier_block
    profiles = list(block.get("profiles") or [])

    for profile in profiles:
        entity = str(profile.get("entity") or "")
        claims = [x for x in identifier_block.get("claims") or [] if str(x.get("entity") or "").lower() == entity.lower()]
        records = [x for x in identifier_block.get("records") or [] if str(x.get("entity") or "").lower() == entity.lower()]
        profile["identifier_claims"] = claims
        profile["identifier_records"] = records
        conflicts = []
        for rec in records:
            for name in rec.get("alternate_legal_names") or []:
                if name.lower() != entity.lower() and name.lower() not in {x.lower() for x in conflicts}:
                    conflicts.append(name)
        profile["identifier_name_conflicts"] = conflicts

        for rec in records:
            compatible = _compatible_record(rec)
            target = "official_or_registry_records" if rec.get("source_relation") == "official_or_government" else "independent_records"
            existing = list(profile.get(target) or [])
            url = compatible.get("source_url")
            if not any(x.get("source_url") == url and x.get("license_number") == compatible.get("license_number") for x in existing):
                existing.append(compatible)
            profile[target] = existing
            all_records = list(profile.get("all_records") or [])
            if not any(x.get("source_url") == url and x.get("license_number") == compatible.get("license_number") for x in all_records):
                all_records.append(compatible)
            profile["all_records"] = all_records

        if profile.get("official_or_registry_records"):
            profile["existence_status"] = "official_or_registry_trace_found"
        elif profile.get("independent_records"):
            profile["existence_status"] = "independent_trace_found"
        if any(r.get("project_name_mentioned") for r in records):
            profile["project_connection_status"] = "externally_linked"
        elif records and profile.get("project_connection_status") == "project_claim_only_or_not_shown":
            profile["project_connection_status"] = "identifier_matched_externally_project_role_open"

    summary = block.setdefault("summary", {})
    ids = identifier_block.get("summary") or {}
    summary.update({
        "identifier_claim_count": ids.get("identifier_claim_count", 0),
        "identifier_record_count": ids.get("identifier_record_count", 0),
        "official_identifier_record_count": ids.get("official_identifier_record_count", 0),
        "independent_identifier_record_count": ids.get("independent_identifier_record_count", 0),
        "identifier_name_conflict_count": ids.get("identifier_name_conflict_count", 0),
    })
    # Kompatible Gesamtzähler nach dem Merge neu berechnen.
    summary["official_or_registry_record_count"] = sum(len(p.get("official_or_registry_records") or []) for p in profiles)
    summary["independent_record_count"] = sum(len(p.get("independent_records") or []) for p in profiles)
    summary["record_count"] = sum(len(p.get("all_records") or []) for p in profiles)


def enrich(data: dict) -> dict:
    original_probes = tuple(base.DIRECT_REGISTRY_PROBES)
    initial = adapters.select_adapter_ids(data)

    try:
        base.DIRECT_REGISTRY_PROBES = tuple(adapters.probe_urls(initial))
        out = base.enrich(data)

        discovered = adapters.select_adapter_ids(out)
        if set(discovered) != set(initial):
            base.DIRECT_REGISTRY_PROBES = tuple(adapters.probe_urls(discovered))
            out = base.enrich(data)
            selected = discovered
            routing = "selected_after_generic_research"
        else:
            selected = initial
            routing = "selected_from_existing_evidence" if selected else "generic_only"

        block = out.setdefault("operator_registry_research", {})
        block["registry_routing"] = {
            "mode": routing,
            "selected_adapters": adapters.describe(selected),
            "special_registry_probe_count": len(adapters.probe_urls(selected)),
            "principle": "Spezialregister werden nur bei passendem Jurisdiktionshinweis aktiviert.",
        }
        _merge_identifier_research(out)
        return out
    finally:
        base.DIRECT_REGISTRY_PROBES = original_probes
