#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ALLOWED = {"wartet", "laeuft", "abgeschlossen", "fehler"}
PERSPECTIVES = {"customer", "company", "academy"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def main() -> int:
    ap = argparse.ArgumentParser(description="Aktualisiert eine Zielgruppen-Auswertung innerhalb eines der 37 Prüfbereiche.")
    ap.add_argument("--status-file", required=True, type=Path)
    ap.add_argument("--id", required=True, type=int)
    ap.add_argument("--perspective", required=True, choices=sorted(PERSPECTIVES))
    ap.add_argument("--status", required=True, choices=sorted(ALLOWED))
    args = ap.parse_args()

    data = json.loads(args.status_file.read_text(encoding="utf-8"))
    target = next((x for x in data.get("checks", []) if int(x.get("id", 0)) == args.id), None)
    if target is None:
        raise SystemExit(f"Prüfbereich {args.id} fehlt.")

    perspectives = target.setdefault("perspectives", {})
    perspectives[args.perspective] = {"status": args.status, "updated_at": now()}
    data["updated_at"] = now()
    args.status_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
