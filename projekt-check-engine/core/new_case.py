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
    suffix = secrets.token_hex(4).upper()[:8]
    return f"PCA-{stamp}-{suffix}"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser(description="Initialisiert einen neuen Projekt-Check-Fall.")
    ap.add_argument("--intake", required=True, type=Path)
    ap.add_argument("--checks", default=Path("projekt-check-engine/checks/checks-37.json"), type=Path)
    ap.add_argument("--cases-root", default=Path("data/projekt-check/cases"), type=Path)
    ap.add_argument("--case-id", default="")
    args = ap.parse_args()

    intake = load_json(args.intake)
    defs = load_json(args.checks)
    traces = intake.get("traces")
    if not isinstance(traces, list) or not traces:
        raise SystemExit("Intake enthält keine öffentliche Spur.")
    if len(defs.get("checks", [])) != 37:
        raise SystemExit("Prüfstandard enthält nicht exakt 37 Bereiche.")

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

    checks = []
    for item in defs["checks"]:
        checks.append({
            "id": item["id"],
            "key": item["key"],
            "status": "wartet",
            "evidence_count": 0,
            "summary": "",
            "started_at": None,
            "finished_at": None,
        })

    status = {
        "contract_version": "1.0",
        "case_id": case_id,
        "state": "angenommen",
        "created_at": now,
        "updated_at": now,
        "identity": {"status": "unresolved", "label": "", "confidence": "none"},
        "overall_rating": None,
        "checks": checks,
        "documents": {
            "user_check": {"status": "wartet", "url": "", "filename": "", "pages": 0, "bytes": 0},
            "full_analysis": {"status": "wartet", "url": "", "filename": "", "pages": 0, "bytes": 0},
        },
        "error": None,
    }

    (case_dir / "intake.json").write_text(json.dumps(intake, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (case_dir / "status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(case_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
