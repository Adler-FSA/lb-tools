#!/usr/bin/env python3
"""Erzeugt aus dem vollständigen 16-Punkte-Output eine kompakte Monitor-Datei."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def compact_source(item: dict) -> dict:
    return {
        "source_url": item.get("source_url") or "",
        "source_role": item.get("source_role") or "unknown",
        "label": item.get("label") or item.get("title") or "Quelle",
    }


def build(data: dict) -> dict:
    block = data.get("sixteen_point_analysis") or {}
    questions = []
    for q in block.get("questions") or []:
        questions.append({
            "id": q.get("id"),
            "title": q.get("title") or "",
            "state": q.get("state") or "research_gap",
            "finding": q.get("finding") or "",
            "gaps": list(q.get("gaps") or []),
            "next_research": list(q.get("next_research") or []),
            "sources": [compact_source(x) for x in (q.get("evidence") or []) if x.get("source_url")],
            "counter_sources": [compact_source(x) for x in (q.get("counter_evidence") or []) if x.get("source_url")],
        })
    return {
        "status": block.get("status") or "not_ready",
        "context": data.get("context") or {},
        "generated_at": block.get("generated_at") or "",
        "principle": block.get("principle") or "",
        "summary": block.get("summary") or {},
        "guardrails": block.get("guardrails") or {},
        "questions": questions,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="16-Punkte-Output für Research Monitor verdichten")
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    source = json.loads(Path(args.input).read_text(encoding="utf-8"))
    out = build(source)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
