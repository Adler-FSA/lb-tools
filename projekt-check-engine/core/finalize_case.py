#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

DOCUMENTS = ("customer_check", "company_check", "academy_full_analysis")
PERSPECTIVES = ("customer", "company", "academy")


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def main() -> int:
    ap = argparse.ArgumentParser(description="Schließt einen Projekt-Check erst nach 37 Prüfungen, drei Perspektiven und drei PDFs ab.")
    ap.add_argument("--case-dir", required=True, type=Path)
    ap.add_argument("--archive-index", default=Path("data/projekt-check/archive/index.json"), type=Path)
    args = ap.parse_args()

    status_file = args.case_dir / "status.json"
    data = json.loads(status_file.read_text(encoding="utf-8"))
    checks = data.get("checks", [])
    if len(checks) != 37:
        raise SystemExit("Abbruch: Status enthält nicht exakt 37 Prüfbereiche.")

    incomplete_checks = [c.get("id") for c in checks if c.get("workflow_status") != "abgeschlossen" or not c.get("result_status")]
    if incomplete_checks:
        raise SystemExit("Abbruch: Prüfbereiche noch nicht final: " + ", ".join(map(str, incomplete_checks)))

    incomplete_perspectives = []
    for check in checks:
        for perspective in PERSPECTIVES:
            if ((check.get("perspectives") or {}).get(perspective) or {}).get("status") != "abgeschlossen":
                incomplete_perspectives.append(f"{check.get('id')}:{perspective}")
    if incomplete_perspectives:
        raise SystemExit("Abbruch: Perspektiven noch nicht final: " + ", ".join(incomplete_perspectives))

    docs = data.get("documents", {})
    for key in DOCUMENTS:
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
        "project_label": (data.get("identity") or {}).get("label", ""),
        "completed_at": ts,
        "traffic_light": data.get("overall_rating"),
        "checks_completed": 37,
        "perspectives_completed": {"customer": 37, "company": 37, "academy": 37},
        "delivery_document": data.get("delivery_document"),
        "documents": {key: docs[key] for key in DOCUMENTS},
    }
    archive["cases"] = [x for x in archive["cases"] if x.get("case_id") != data["case_id"]]
    archive["cases"].append(entry)
    archive["cases"].sort(key=lambda x: x.get("completed_at", ""), reverse=True)
    args.archive_index.parent.mkdir(parents=True, exist_ok=True)
    args.archive_index.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
