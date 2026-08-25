#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def make_case_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = secrets.token_hex(4).upper()
    return f"PCA-{stamp}-{suffix}"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def empty_perspective() -> dict:
    return {"summary": "", "advantages": [], "disadvantages": [], "questions": [], "recommendations": []}


def main() -> int:
    ap = argparse.ArgumentParser(description="Initialisiert einen neuen Projekt-Check-Fall.")
    ap.add_argument("--intake", required=True, type=Path)
    ap.add_argument("--checks", default=Path("projekt-check-engine/checks/checks-37.json"), type=Path)
    ap.add_argument("--cases-root", default=Path("data/projekt-check/cases"), type=Path)
    ap.add_argument("--case-id", default="")
    ap.add_argument("--initial-state", choices=["wartet_auf_start", "angenommen"], default="wartet_auf_start")
    ap.add_argument("--persist-intake", choices=["full", "sanitized", "none"], default="full")
    args = ap.parse_args()

    intake = load_json(args.intake)
    defs = load_json(args.checks)
    traces = intake.get("traces")
    if not isinstance(traces, list) or not traces:
        raise SystemExit("Intake enthält keine öffentliche Spur.")
    if len(defs.get("checks", [])) != 37:
        raise SystemExit("Prüfstandard enthält nicht exakt 37 Bereiche.")

    requested_output = intake.get("requested_output") or "customer_check"
    if requested_output not in {"customer_check", "company_check"}:
        raise SystemExit("requested_output muss customer_check oder company_check sein.")

    case_id = args.case_id.strip() or make_case_id()
    case_dir = args.cases_root / case_id
    if case_dir.exists():
        raise SystemExit(f"Case existiert bereits: {case_id}")
    case_dir.mkdir(parents=True, exist_ok=False)

    now = utc_now()
    intake["case_id"] = case_id
    intake.setdefault("contract_version", "1.0")
    intake.setdefault("submitted_at", now)
    intake.setdefault("source", "projekt-check-web")
    intake["requested_output"] = requested_output

    checks = []
    evaluation_checks = []
    for item in defs["checks"]:
        checks.append({
            "id": item["id"],
            "key": item["key"],
            "workflow_status": "wartet",
            "result_status": None,
            "evidence_count": 0,
            "summary": "",
            "perspectives": {
                "customer": {"status": "wartet", "updated_at": None},
                "company": {"status": "wartet", "updated_at": None},
                "academy": {"status": "wartet", "updated_at": None},
            },
            "started_at": None,
            "finished_at": None,
        })
        evaluation_checks.append({
            "id": item["id"],
            "key": item["key"],
            "result_status": None,
            "neutral_finding": {
                "confirmed_facts": [],
                "first_party_claims": [],
                "pros": [],
                "cons": [],
                "open_points": [],
                "contradictions": [],
                "evidence_refs": [],
            },
            "customer": empty_perspective(),
            "company": empty_perspective(),
            "academy": empty_perspective(),
        })

    empty_doc = {"status": "wartet", "url": "", "filename": "", "pages": 0, "bytes": 0, "generated_at": None}
    status = {
        "contract_version": "1.1",
        "case_id": case_id,
        "state": args.initial_state,
        "created_at": now,
        "updated_at": now,
        "delivery_document": requested_output,
        "identity": {"status": "unresolved", "label": "", "confidence": "none"},
        "overall_rating": None,
        "checks": checks,
        "documents": {
            "customer_check": dict(empty_doc),
            "company_check": dict(empty_doc),
            "academy_full_analysis": dict(empty_doc),
        },
        "error": None,
    }
    evaluation = {"schema_version": "1.0", "case_id": case_id, "checks": evaluation_checks}

    if args.persist_intake == "full":
        public_intake = intake
    elif args.persist_intake == "sanitized":
        public_intake = {
            "case_id": case_id,
            "contract_version": intake.get("contract_version", "1.0"),
            "submitted_at": intake.get("submitted_at", now),
            "language": intake.get("language", "de"),
            "requested_output": requested_output,
            "source": "projekt-check-poststelle",
            "trace_count": len(traces),
            "has_claim": bool(str(intake.get("claim") or "").strip()),
            "protected_intake": True,
        }
    else:
        public_intake = None

    if public_intake is not None:
        (case_dir / "intake.json").write_text(json.dumps(public_intake, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (case_dir / "status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (case_dir / "evaluation.json").write_text(json.dumps(evaluation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(case_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
