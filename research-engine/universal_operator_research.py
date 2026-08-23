#!/usr/bin/env python3
"""Universeller Betreiber-/Register-Wrapper.

Führt die bestehende Betreiberrecherche aus, schaltet aber spezielle
Jurisdiktionsadapter nur bei einem tatsächlichen Hinweis ein.
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


def enrich(data: dict) -> dict:
    original_probes = tuple(base.DIRECT_REGISTRY_PROBES)
    initial = adapters.select_adapter_ids(data)

    try:
        base.DIRECT_REGISTRY_PROBES = tuple(adapters.probe_urls(initial))
        out = base.enrich(data)

        # Falls die generische Fremdrecherche erst jetzt eine spezielle
        # Jurisdiktion entdeckt hat, darf der passende Direktadapter nachziehen.
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
        return out
    finally:
        base.DIRECT_REGISTRY_PROBES = original_probes
