#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

FINAL = {"bestaetigt", "offen", "widerspruch", "kein_befund", "nicht_relevant", "fehler", "abgeschlossen"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def main() -> int:
    ap = argparse.ArgumentParser(description="Schließt einen Projekt-Check erst nach 37 finalen Prüfungen und zwei PDFs ab.")
    ap.add_argument("--case-dir", required=True, type=Path)
    ap.add_argument("--archive-index", default=Path("data/projekt-check/archive/index.json"), type=Path)
    args = ap.parse_args()

    status_file = args.case_dir / "status.json"
    data = json.loads(status_file.read_text(encoding="utf-8"))
    checks = data.get("checks", [])
    if len(checks) != 37:
        raise SystemExit("Abbruch: Status enthält nicht exakt 37 Prüfbereiche.")
    not_final = [c["id"] for c in checks if c.get("status") not in FINAL]
    if not_final:
        raise SystemExit("Abbruch: Noch nicht final: " + ", ".join(map(str, not_final)))

    docs = data.get("documents", {})
    for key in ("user_check", "full_analysis"):
        doc = docs.get(key, {})
        if doc.get("status") != "fertig" or not doc.get("url") or not doc.get("filename"):
            raise SystemExit(f"Abbruch: Dokument {key} ist noch nicht fertig.")

    ts = now()
    data["state"] = "abgeschlossen"
    data["updated_at"] = ts
    status_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    archive = {"cases": []}
    if args.archive_index.exists():
        archive = json.loads(args.archive_index.read_text(encoding="utf-8"))
        if not isinstance(archive.get("cases"), list):
            archive = {"cases": []}

    entry = {
        "case_id": data["case_id"],
        "completed_at": ts,
        "identity_label": (data.get("identity") or {}).get("label", ""),
        "overall_rating": data.get("overall_rating"),
        "checks_completed": 37,
        "documents": {
            "user_check": docs["user_check"]["url"],
            "full_analysis": docs["full_analysis"]["url"],
        },
    }
    archive["cases"] = [x for x in archive["cases"] if x.get("case_id") != data["case_id"]]
    archive["cases"].append(entry)
    archive["cases"].sort(key=lambda x: x.get("completed_at", ""), reverse=True)
    args.archive_index.parent.mkdir(parents=True, exist_ok=True)
    args.archive_index.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
