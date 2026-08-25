#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

WORKFLOW = {"wartet", "laeuft", "abgeschlossen", "fehler"}
RESULT = {"bestaetigt", "eigenaussage", "offen", "widerspruch", "kein_befund", "nicht_relevant"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def main() -> int:
    ap = argparse.ArgumentParser(description="Aktualisiert neutralen Prüf- und Befundstatus eines der 37 Bereiche.")
    ap.add_argument("--status-file", required=True, type=Path)
    ap.add_argument("--id", required=True, type=int)
    ap.add_argument("--workflow-status", required=True, choices=sorted(WORKFLOW))
    ap.add_argument("--result-status", choices=sorted(RESULT), default=None)
    ap.add_argument("--summary", default="")
    ap.add_argument("--evidence-count", type=int, default=None)
    args = ap.parse_args()

    data = json.loads(args.status_file.read_text(encoding="utf-8"))
    target = next((x for x in data.get("checks", []) if int(x.get("id", 0)) == args.id), None)
    if target is None:
        raise SystemExit(f"Prüfbereich {args.id} fehlt.")

    ts = now()
    if args.workflow_status == "laeuft" and not target.get("started_at"):
        target["started_at"] = ts
    target["workflow_status"] = args.workflow_status
    if args.result_status is not None:
        target["result_status"] = args.result_status
    target["summary"] = args.summary
    if args.evidence_count is not None:
        target["evidence_count"] = max(0, args.evidence_count)
    if args.workflow_status in {"abgeschlossen", "fehler"}:
        target["finished_at"] = ts
    if args.workflow_status == "abgeschlossen" and not target.get("result_status"):
        raise SystemExit("Ein abgeschlossener Prüfbereich benötigt einen result_status.")

    data["updated_at"] = ts
    args.status_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
