#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ALLOWED = {"wartet", "laeuft", "bestaetigt", "offen", "widerspruch", "kein_befund", "nicht_relevant", "fehler", "abgeschlossen"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def main() -> int:
    ap = argparse.ArgumentParser(description="Aktualisiert genau einen der 37 Prüfbereiche.")
    ap.add_argument("--status-file", required=True, type=Path)
    ap.add_argument("--id", required=True, type=int)
    ap.add_argument("--status", required=True, choices=sorted(ALLOWED))
    ap.add_argument("--summary", default="")
    ap.add_argument("--evidence-count", type=int, default=None)
    args = ap.parse_args()

    data = json.loads(args.status_file.read_text(encoding="utf-8"))
    checks = data.get("checks", [])
    target = next((x for x in checks if int(x.get("id", 0)) == args.id), None)
    if target is None:
        raise SystemExit(f"Prüfbereich {args.id} fehlt.")

    ts = now()
    if args.status == "laeuft" and not target.get("started_at"):
        target["started_at"] = ts
    target["status"] = args.status
    target["summary"] = args.summary
    if args.evidence_count is not None:
        target["evidence_count"] = max(0, args.evidence_count)
    if args.status not in {"wartet", "laeuft"}:
        target["finished_at"] = ts
    data["updated_at"] = ts
    args.status_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
