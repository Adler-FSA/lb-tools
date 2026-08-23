#!/usr/bin/env python3
"""Universelle Research-Pipeline für zwei Produkte aus einem Motor.

quick = SchnellCheck: Identität, Website, Kernaussagen, wenige priorisierte Fremdspuren.
deep  = Projektanalyse: vollständige Fremdrecherche plus Rechtsträger, Personen,
        Akademie-Vergleich und 16-Punkte-Prüfung.

Die Pipeline enthält keine projektspezifischen Namen oder Register.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


router = load_module("universal_research_router", "research_router.py")
identity = load_module("universal_identity_resolver", "identity_resolver.py")
engine = load_module("universal_core_engine", "engine.py")
external = load_module("universal_external_research", "external_research.py")
quick_external = load_module("universal_quick_external_research", "quick_external_research.py")
operator = load_module("universal_operator_research", "universal_operator_research.py")
people = load_module("universal_people_pipeline", "universal_people_research.py")
academy = load_module("universal_academy_analysis", "academy_analysis.py")
sixteen = load_module("universal_sixteen_adapter", "sixteen_point_people_adapter.py")


def slugify(value: str) -> str:
    value = re.sub(r"^https?://", "", (value or "").strip(), flags=re.I)
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value[:72] or "research"


def _module_runs(plan) -> set[str]:
    return {item.module for item in plan if item.run}


def run_core(query: str, max_pages: int) -> dict:
    parsed = engine.parse_input(query)
    if not parsed["raw"]:
        raise ValueError("Leere Eingabe")

    ctx = {
        "input": parsed["raw"],
        "input_kind": parsed["kind"],
        "input_url": parsed["url"],
        "project_name": parsed["name"],
        "domain": parsed["domain"],
        "resolved_url": parsed["url"],
    }
    discovery_attempts = []

    if parsed["kind"] == "url":
        seed = engine.fetch_page(parsed["url"])
        if not seed:
            seed = engine.fetch_page(f"https://{parsed.get('fetch_host') or parsed['domain']}/")
        if not seed:
            return {"version": 2, "status": "no_readable_website", "context": ctx, "discovery_attempts": []}
        ctx["domain"] = (engine.urlparse(seed.url).hostname or parsed["domain"]).removeprefix("www.")
        ctx["resolved_url"] = seed.url
    else:
        domain, seed, discovery_attempts = engine.discover_project(parsed["name"])
        if not domain or not seed:
            return {
                "version": 2,
                "status": "website_not_resolved",
                "context": ctx,
                "discovery_attempts": discovery_attempts,
                "note": "Keine eindeutige Projektwebsite über die konservative Domainauflösung bestätigt.",
            }
        ctx["domain"] = domain
        ctx["resolved_url"] = seed.url

    pages = engine.crawl(seed, ctx["domain"], parsed["url"], max_pages=max_pages)
    return {
        "version": 2,
        "status": "ok",
        "context": ctx,
        "discovery_attempts": discovery_attempts,
        "analysis": engine.analyze_pages(pages, ctx),
        "principle": "Öffentliche Hinweise und Risikoindikatoren; kein Betrugs- oder Seriositätsurteil.",
    }


def resolve_and_run_core(request, max_pages: int) -> dict:
    """Löst Namenseingaben zuerst über Webkandidaten auf; Domainraten ist nur Fallback."""
    if request.input_kind != "name":
        return run_core(request.normalized_input, max_pages)

    resolution = identity.resolve(request.normalized_input)
    if resolution.get("status") == "resolved" and resolution.get("resolved_url"):
        data = run_core(resolution["resolved_url"], max_pages)
        ctx = data.setdefault("context", {})
        ctx.update({
            "input": request.raw,
            "input_kind": "name",
            "input_url": "",
            "project_name": request.raw,
            "domain": resolution.get("domain") or ctx.get("domain") or "",
            "resolved_url": resolution.get("resolved_url") or ctx.get("resolved_url") or "",
        })
        data["identity_resolution"] = {**resolution, "fallback_used": False}
        return data

    if resolution.get("status") == "ambiguous":
        return {
            "version": 2,
            "status": "identity_ambiguous",
            "context": {
                "input": request.raw,
                "input_kind": "name",
                "project_name": request.raw,
                "domain": "",
                "resolved_url": "",
            },
            "identity_resolution": {**resolution, "fallback_used": False},
            "principle": "Bei mehreren ähnlich plausiblen Projekten wird keine Website geraten.",
        }

    # Suchprovider können temporär ausfallen. Der alte konservative Domainresolver bleibt
    # deshalb als dokumentierter Fallback erhalten, nicht mehr als erste Identitätslogik.
    data = run_core(request.normalized_input, max_pages)
    data["identity_resolution"] = {**resolution, "fallback_used": True}
    return data


def build_quick_view(data: dict) -> dict:
    ctx = data.get("context") or {}
    analysis = data.get("analysis") or {}
    ext = data.get("external_research") or {}
    detected = analysis.get("detected") or {}

    topics = [
        key for key in (
            "staking", "defi", "trading", "leverage", "lending", "lockup",
            "withdrawal", "kyc", "custody", "referral", "bonus", "guarantee"
        ) if detected.get(key)
    ]
    gaps = []
    if not analysis.get("legal_entities"):
        gaps.append("Vertragspartner/Rechtsträger auf der Projektwebsite noch nicht eindeutig erkannt.")
    if ext.get("status") == "no_confirmed_external_traces":
        gaps.append("Im SchnellCheck noch keine eindeutig zugeordneten unabhängigen Fremdspuren bestätigt.")
    if analysis.get("max_yield_percentage") is not None:
        gaps.append("Renditeherkunft und Verlustszenario sind im SchnellCheck noch nicht tiefengeprüft.")
    if detected.get("referral") or analysis.get("max_commission_percentage") is not None:
        gaps.append("Vertriebsvergütung erkannt; Struktur und Nachhaltigkeit sind noch nicht tiefengeprüft.")

    return {
        "product": "schnellcheck",
        "project_name": ctx.get("project_name") or ctx.get("input") or "",
        "domain": ctx.get("domain") or "",
        "resolved_url": ctx.get("resolved_url") or "",
        "max_yield_percentage": analysis.get("max_yield_percentage"),
        "max_commission_percentage": analysis.get("max_commission_percentage"),
        "legal_entities_claimed": analysis.get("legal_entities") or [],
        "detected_topics": topics,
        "external_trace_count": len(ext.get("traces") or []),
        "review_candidate_count": len(ext.get("review_candidates") or []),
        "research_gaps": gaps,
        "deep_research_recommended": bool(gaps or detected.get("leverage") or detected.get("guarantee")),
        "research_depth": "quick",
        "principle": "Erste Klarheit, kein Seriositäts- oder Betrugsurteil.",
    }


def run(query: str, mode: str = "quick") -> dict:
    request = router.build_request(query, mode)
    started = datetime.now(timezone.utc).isoformat()

    if request.route == "blockchain_identity":
        return {
            "version": 2,
            "status": "specialized_route_required",
            "generated_at": started,
            "research_orchestration": router.request_payload(request, None),
            "specialized_route": {
                "module": "blockchain_identity",
                "status": "not_implemented_yet",
                "next_step": "Chain/Contract auflösen, danach identifizierten Projektnamen oder Domain in dieselbe Pipeline zurückführen.",
            },
            "principle": "Keine Identität erfinden: spezielle Eingaben werden zuerst fachlich aufgelöst.",
        }

    max_pages = 8 if request.mode == "quick" else engine.MAX_PAGES
    data = resolve_and_run_core(request, max_pages)
    plan = router.module_plan(request, data)
    runs = _module_runs(plan)
    data["research_orchestration"] = router.request_payload(request, data)
    data["research_orchestration"]["started_at"] = started
    data["research_orchestration"]["core_max_pages"] = max_pages

    if data.get("status") != "ok":
        data["version"] = 2
        return data

    if "external_research" in runs:
        data = quick_external.enrich(data) if request.mode == "quick" else external.enrich(data)

    plan = router.module_plan(request, data)
    runs = _module_runs(plan)
    data["research_orchestration"] = router.request_payload(request, data)
    data["research_orchestration"]["started_at"] = started
    data["research_orchestration"]["core_max_pages"] = max_pages
    data["research_orchestration"]["external_depth"] = "quick" if request.mode == "quick" else "deep"

    if request.mode == "quick":
        data["quick_check"] = build_quick_view(data)
        data["version"] = 2
        data["product"] = "schnellcheck"
        return data

    if "operator_registry" in runs:
        data = operator.enrich(data)
    if "people_history" in runs:
        data = people.enrich(data)
    if "academy_analysis" in runs:
        data = academy.enrich(data)
    if "project_analysis_16" in runs:
        data = sixteen.enrich(data)

    data["version"] = 2
    data["product"] = "projektanalyse"
    data["research_orchestration"]["completed_at"] = datetime.now(timezone.utc).isoformat()
    return data


def main() -> int:
    ap = argparse.ArgumentParser(description="Akademie Universal Research Engine")
    ap.add_argument("query", help="Projektname, Domain, URL, Referral-Link oder technische Kennung")
    ap.add_argument("--mode", choices=("quick", "deep"), default="quick")
    ap.add_argument("--output", default="", help="Optionaler Zielpfad. Standard: output/<slug>-<mode>.json")
    args = ap.parse_args()

    result = run(args.query, args.mode)
    payload = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    target = Path(args.output) if args.output else ROOT / "output" / f"{slugify(args.query)}-{args.mode}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(payload, encoding="utf-8")
    print(target)
    return 0 if result.get("status") in {"ok", "specialized_route_required", "identity_ambiguous"} else 2


if __name__ == "__main__":
    raise SystemExit(main())