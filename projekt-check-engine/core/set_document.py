#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

DOCUMENTS = {"customer_check", "company_check", "academy_full_analysis"}
STATUSES = {"wartet", "wird_erstellt", "fertig", "fehler"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def main() -> int:
    ap = argparse.ArgumentParser(description="Aktualisiert den Status eines der drei Projekt-Check-PDFs.")
    ap.add_argument("--status-file", required=True, type=Path)
    ap.add_argument("--document", required=True, choices=sorted(DOCUMENTS))
    ap.add_argument("--status", required=True, choices=sorted(STATUSES))
    ap.add_argument("--url", default="")
    ap.add_argument("--filename", default="")
    ap.add_argument("--pages", type=int, default=0)
    ap.add_argument("--bytes", dest="byte_count", type=int, default=0)
    args = ap.parse_args()

    data = json.loads(args.status_file.read_text(encoding="utf-8"))
    docs = data.setdefault("documents", {})
    ts = now()
    docs[args.document] = {
        "status": args.status,
        "url": args.url,
        "filename": args.filename,
        "pages": max(0, args.pages),
        "bytes": max(0, args.byte_count),
        "generated_at": ts if args.status == "fertig" else None,
    }
    data["updated_at"] = ts
    if args.status == "wird_erstellt":
        data["state"] = "pdf_erstellung"
    args.status_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
