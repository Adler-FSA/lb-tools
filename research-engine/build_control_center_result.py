#!/usr/bin/env python3
"""Baut aus einem Universal-Research-Lauf die kompakte Control-Center-Ausgabe."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def build(data: dict, request_id: str, query: str, mode: str, engine_exit_code: int = 0) -> dict:
    ctx = data.get("context") or {}
    analysis = data.get("analysis") or {}
    orchestration = data.get("research_orchestration") or {}
    request = orchestration.get("request") or {}
    input_basis = orchestration.get("input_basis") or {}
    quick = data.get("quick_check") or {}
    external = data.get("external_research") or {}
    operator = data.get("operator_registry_research") or {}
    people = data.get("people_history_research") or {}
    academy = data.get("academy_analysis") or {}
    sixteen = data.get("sixteen_point_analysis") or {}
    identity = data.get("identity_resolution") or {}

    traces = []
    for item in list(external.get("traces") or [])[:16]:
        traces.append({k: item.get(k) for k in (
            "category", "source_relation", "platform", "source_url", "title",
            "evidence", "published_at", "attribution_confidence", "project_match"
        )})

    profiles = []
    for p in list(operator.get("profiles") or [])[:12]:
        profiles.append({
            "entity": p.get("entity"),
            "existence_status": p.get("existence_status"),
            "project_connection_status": p.get("project_connection_status"),
            "official_record_count": len(p.get("official_or_registry_records") or []),
            "independent_record_count": len(p.get("independent_records") or []),
            "authority_context_count": len(p.get("authority_context_records") or []),
        })

    person_profiles = []
    for p in list(people.get("profiles") or [])[:16]:
        person_profiles.append({
            "person_name": p.get("person_name"),
            "entity": p.get("entity"),
            "roles": p.get("roles") or [],
            "entity_connection_status": p.get("entity_connection_status"),
            "project_connection_status": p.get("project_connection_status"),
            "ownership_status": p.get("ownership_status"),
            "ubo_verified": bool(p.get("ubo_verified")),
            "history_record_count": p.get("history_record_count") or 0,
            "adverse_record_count": p.get("adverse_record_count") or 0,
        })

    questions = []
    for q in list(sixteen.get("questions") or []):
        questions.append({
            "id": q.get("id"),
            "title": q.get("title"),
            "state": q.get("state"),
            "finding": q.get("finding"),
            "gaps": list(q.get("gaps") or [])[:8],
            "next_research": list(q.get("next_research") or [])[:6],
            "evidence_count": len(q.get("evidence") or []),
            "counter_evidence_count": len(q.get("counter_evidence") or []),
            "traffic_light_ready": bool(q.get("traffic_light_ready")),
            "traffic_light": q.get("traffic_light"),
        })

    anchor_type = quick.get("anchor_type") or ctx.get("anchor_type") or input_basis.get("anchor_type") or request.get("anchor_type")
    anchor_strength = quick.get("anchor_strength") or ctx.get("anchor_strength") or input_basis.get("anchor_strength") or request.get("anchor_strength")
    original_anchor = quick.get("original_evidence_anchor") or ctx.get("original_evidence_anchor") or input_basis.get("original_evidence_anchor") or query

    return {
        "schema": "academy-research-control-center-v1",
        "request_id": request_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "engine_exit_code": int(engine_exit_code),
        "status": data.get("status"),
        "product": data.get("product") or request.get("product"),
        "mode": request.get("mode") or mode,
        "query": query,
        "input_basis": {
            "anchor_type": anchor_type,
            "anchor_strength": anchor_strength,
            "original_evidence_anchor": original_anchor,
            "identity_confirmation_required": input_basis.get("identity_confirmation_required", (ctx.get("input_kind") or request.get("input_kind")) == "name"),
        },
        "context": {
            "input": ctx.get("input"),
            "input_kind": ctx.get("input_kind") or request.get("input_kind"),
            "project_name": quick.get("project_name") or ctx.get("project_name") or ctx.get("input"),
            "domain": quick.get("domain") or ctx.get("domain"),
            "resolved_url": quick.get("resolved_url") or ctx.get("resolved_url"),
            "original_evidence_anchor": original_anchor,
            "anchor_type": anchor_type,
            "anchor_strength": anchor_strength,
        },
        "identity": {
            "status": identity.get("status"),
            "fallback_used": identity.get("fallback_used"),
            "candidate_count": len(identity.get("candidates") or []),
            "candidates": [
                {k: c.get(k) for k in ("url", "domain", "title", "score", "readable")}
                for c in list(identity.get("candidates") or [])[:6]
            ],
        },
        "orchestration": {
            "capabilities": orchestration.get("capabilities") or [],
            "module_plan": orchestration.get("module_plan") or [],
            "core_max_pages": orchestration.get("core_max_pages"),
            "external_depth": orchestration.get("external_depth"),
        },
        "quick_check": quick,
        "website_analysis": {
            "max_yield_percentage": analysis.get("max_yield_percentage"),
            "max_commission_percentage": analysis.get("max_commission_percentage"),
            "legal_entities": analysis.get("legal_entities") or [],
            "detected": analysis.get("detected") or {},
            "risk_signals": list(analysis.get("risk_signals") or [])[:20],
            "questions": list(analysis.get("questions") or [])[:20],
            "page_count": len(analysis.get("pages") or []),
            "finding_count": len(analysis.get("findings") or []),
        },
        "external_research": {
            "status": external.get("status"),
            "research_depth": external.get("research_depth"),
            "trace_count": len(external.get("traces") or []),
            "review_candidate_count": len(external.get("review_candidates") or []),
            "project_owned_echo_count": len(external.get("project_owned_echoes") or []),
            "traces": traces,
        },
        "operator_research": {
            "status": operator.get("status"),
            "summary": operator.get("summary") or {},
            "registry_routing": operator.get("registry_routing") or {},
            "profiles": profiles,
        },
        "people_research": {
            "status": people.get("status"),
            "summary": people.get("summary") or {},
            "profiles": person_profiles,
            "universal_routing": people.get("universal_routing") or {},
        },
        "academy_analysis": {
            "status": academy.get("status"),
            "summary": academy.get("summary") or {},
            "open_questions": list(academy.get("open_questions") or [])[:24],
            "tensions": list(academy.get("tensions") or [])[:12],
        },
        "sixteen_point": {
            "status": sixteen.get("status"),
            "summary": sixteen.get("summary") or {},
            "questions": questions,
            "guardrails": sixteen.get("guardrails") or {},
        },
        "specialized_route": data.get("specialized_route"),
        "note": data.get("note"),
        "principle": data.get("principle"),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--request-id", required=True)
    ap.add_argument("--query", required=True)
    ap.add_argument("--mode", choices=("quick", "deep"), required=True)
    ap.add_argument("--engine-exit-code", type=int, default=0)
    args = ap.parse_args()
    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    view = build(data, args.request_id, args.query, args.mode, args.engine_exit_code)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(view, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
