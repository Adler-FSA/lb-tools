#!/usr/bin/env python3
"""Kanonischer Universal-Runtime fuer SchnellCheck und Deep Research.

Die bewährte Universal-Pipeline wird verwendet, aber Deep-Research-Ausgaben
laufen durch die universellen Akademie- und 16-Punkte-Schichten. Quick bleibt
bewusst schlank und bekommt ein eigenes Zeit-/Fetch-Budget.
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


pipeline = load_module("universal_pipeline_runtime_base", "universal_pipeline.py")
academy = load_module("universal_runtime_academy", "universal_academy_analysis.py")
sixteen = load_module("universal_runtime_sixteen", "universal_sixteen_analysis.py")
quality = load_module("universal_runtime_quality", "research_quality.py")
entity_roles = load_module("universal_runtime_entity_roles", "entity_role_analysis.py")
external_guard = load_module("universal_runtime_external_guard", "universal_external_research.py")

# Universal erweiterte Rechtsformen. Keine projektbezogenen Namen.
CORE_LEGAL_FORMS = re.compile(
    r"\b([A-ZÄÖÜ0-9][A-Za-zÄÖÜäöüß0-9&.,'’\- ]{1,90}\s(?:GmbH|AG|Aktiengesellschaft|SE|"
    r"Ltd\.?|Limited|LLC|Inc\.?|PLC|S\.?A\.?|S\.p\.A\.|B\.V\.|Sarl|S\.à\s*r\.l\.?|S\.?R\.?L\.?))\b"
)
LEGAL_SUFFIX = re.compile(
    r"\b(?:DAO\s+LLC|LLC|Ltd\.?|Limited|Inc\.?|PLC|GmbH|AG|S\.?A\.?|S\.?R\.?L\.?)\b",
    re.I,
)
LEGAL_END = re.compile(
    r"\b(?:GmbH|AG|Aktiengesellschaft|SE|Ltd\.?|Limited|LLC|Inc\.?|PLC|S\.?A\.?|S\.p\.A\.|B\.V\.|Sarl|S\.à\s*r\.l\.?|S\.?R\.?L\.?)$",
    re.I,
)
pipeline.engine.LEGAL_FORMS = CORE_LEGAL_FORMS
quality.LEGAL_END = LEGAL_END
# Betreiber- und Personenmodule müssen dieselbe Rechtsform kennen.
if hasattr(pipeline.operator, "base"):
    pipeline.operator.base.LEGAL_SUFFIX_RE = LEGAL_SUFFIX
if hasattr(pipeline.people, "pipeline") and hasattr(pipeline.people.pipeline, "base"):
    pipeline.people.pipeline.base.LEGAL_SUFFIX_RE = LEGAL_SUFFIX

# Externe Spuren laufen in Quick und Deep durch denselben Identitäts-Guard.
# Kurze Namen wie "WeFi" dürfen nicht allein durch Namensgleichheit als
# unabhängige Bestätigung gelten.
pipeline.external = external_guard
pipeline.quick_external.ext = external_guard
if hasattr(pipeline.operator, "base") and hasattr(pipeline.operator.base, "ext"):
    pipeline.operator.base.ext.match_confidence = external_guard.match_confidence

# Nur die Deep-Ausgabeschichten werden ersetzt. Routing, Identifikation und
# Register-/Personenmodule bleiben dieselben.
pipeline.academy = academy
pipeline.sixteen = sixteen

_base_run = pipeline.run
_base_resolve = pipeline.resolve_and_run_core
_base_fetch_page = pipeline.engine.fetch_page
_base_operator_enrich = pipeline.operator.enrich


def _looks_like_challenge(page) -> bool:
    if not page:
        return False
    hay = (str(getattr(page, "title", "")) + " " + str(getattr(page, "text", ""))).lower()
    strong = (
        "verify you are human",
        "checking your browser",
        "enable javascript and cookies to continue",
        "cloudflare ray id",
        "challenge-platform",
        "cf-chl-",
        "security verification",
        "attention required! | cloudflare",
    )
    if any(marker in hay for marker in strong):
        return True
    if "just a moment" in hay and any(marker in hay for marker in ("cloudflare", "javascript", "verify", "security")):
        return True
    return False


def _fetch_without_challenge(url: str):
    """Anti-Bot-/Challenge-Seiten sind keine Projektinhalte und lösen Host-Fallback aus."""
    page = _base_fetch_page(url)
    return None if _looks_like_challenge(page) else page


pipeline.engine.fetch_page = _fetch_without_challenge


def _operator_with_clean_entities(data: dict) -> dict:
    """Deep-Registermodule bekommen nur bereinigte Rechtsträger plus getrennte Rollenclaims."""
    analysis = data.get("analysis") or {}
    if not analysis:
        return entity_roles.attach(_base_operator_enrich(data))
    prepared = dict(data)
    prepared_analysis = dict(analysis)
    prepared_analysis["legal_entities"] = quality.clean_legal_entities(list(analysis.get("legal_entities") or []))
    prepared["analysis"] = prepared_analysis
    out = _base_operator_enrich(prepared)
    return entity_roles.attach(out)


pipeline.operator.enrich = _operator_with_clean_entities


def _resolve_with_budget(request, max_pages: int):
    """Core früh bereinigen, damit alle Deep-Module dieselbe bestätigte Projektidentität verwenden."""
    if getattr(request, "mode", "quick") == "quick":
        max_pages = min(max_pages, 5)
    data = _base_resolve(request, max_pages)
    if isinstance(data, dict) and data.get("status") == "ok":
        data = quality.postprocess(data)
    return data


pipeline.resolve_and_run_core = _resolve_with_budget


def run(query: str, mode: str = "quick") -> dict:
    """Produktiver Lauf mit getrennten Quick-/Deep-Budgets und Qualitätsfilter."""
    mode = (mode or "quick").lower()
    if mode == "quick":
        pipeline.engine.TIMEOUT = 7
        pipeline.engine._BROWSER_MAX = 2
        pipeline.quick_external.QUICK_MAX_FETCHED_PAGES = 4
        pipeline.quick_external.ext.TIMEOUT = 7
        pipeline.quick_external.ext.MAX_RESULTS_PER_QUERY = 4
    else:
        pipeline.engine.TIMEOUT = 12
        pipeline.engine._BROWSER_MAX = 5
        pipeline.quick_external.QUICK_MAX_FETCHED_PAGES = 8
        pipeline.quick_external.ext.TIMEOUT = 12
        pipeline.quick_external.ext.MAX_RESULTS_PER_QUERY = 6
        pipeline.external.TIMEOUT = 12
        pipeline.external.MAX_RESULTS_PER_QUERY = 6

    result = _base_run(query, mode)
    # Nachgelagerte Module können weitere Funde ergänzen; deshalb final erneut bereinigen.
    result = quality.postprocess(result)

    if mode == "quick":
        orchestration = result.get("research_orchestration") or {}
        if orchestration:
            orchestration["core_max_pages"] = 5
            orchestration["quick_time_budget"] = {
                "http_timeout_seconds": 7,
                "browser_fallbacks": 2,
                "external_page_budget": 4,
            }
    return result


pipeline.run = run
slugify = pipeline.slugify


def main() -> int:
    return pipeline.main()


if __name__ == "__main__":
    raise SystemExit(main())
