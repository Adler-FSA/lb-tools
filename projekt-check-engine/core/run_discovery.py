#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urldefrag

ENGINE_ROOT = Path(__file__).resolve().parents[1]
if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))

from evidence.evidence_store import build_evidence
from identify.browser_probe import choose_priority_links, probe_urls
from identify.resolve_identity import resolve_identity


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def canonical_url(value: str) -> str:
    return urldefrag(str(value or "").strip())[0]


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_status(case_dir: Path, *, state: str | None = None, identity: dict | None = None, error: str | None = None, evidence: dict | None = None) -> None:
    path = case_dir / "status.json"
    status = read_json(path)
    if state:
        status["state"] = state
    if identity is not None:
        status["identity"] = {
            "status": identity.get("status", "unresolved"),
            "label": identity.get("label", ""),
            "confidence": identity.get("confidence", "none"),
        }
    if error is not None:
        status["error"] = error or None
    if evidence is not None:
        all_count = int(evidence.get("evidence_count") or 0)
        social_count = sum(
            int(count)
            for source_type, count in (evidence.get("source_type_counts") or {}).items()
            if source_type != "website"
        )
        for check in status.get("checks", []):
            if check.get("id") in {3, 28}:
                check["evidence_count"] = all_count
            elif check.get("id") == 20:
                check["evidence_count"] = all_count if all_count else social_count
    status["updated_at"] = utc_now()
    write_json(path, status)


def main() -> int:
    ap = argparse.ArgumentParser(description="Neue Projekt-Check-Discovery: Browser-Probe, Identifikation und Primärbelege.")
    ap.add_argument("--intake", required=True, type=Path)
    ap.add_argument("--case-id", required=True)
    ap.add_argument("--cases-root", default=Path("data/projekt-check/cases"), type=Path)
    ap.add_argument("--max-expanded", default=18, type=int)
    ap.add_argument("--max-depth", default=3, type=int)
    args = ap.parse_args()

    case_id = args.case_id.strip().upper()
    case_dir = args.cases_root / case_id
    if not case_dir.exists():
        raise SystemExit(f"Fallordner fehlt: {case_dir}")

    intake = read_json(args.intake)
    traces = intake.get("traces") or []
    if not isinstance(traces, list) or not traces:
        raise SystemExit("Keine öffentlichen Spuren im Intake.")

    update_status(
        case_dir,
        state="identifizierung",
        identity={"status": "resolving", "label": "", "confidence": "none"},
        error="",
    )

    max_expanded = max(0, min(args.max_expanded, 30))
    max_depth = max(1, min(args.max_depth, 4))
    discovery = {
        "schema_version": "1.1",
        "case_id": case_id,
        "started_at": utc_now(),
        "initial_trace_count": len(traces),
        "expanded_trace_count": 0,
        "browser_probe": "playwright-chromium",
        "crawl_depth_limit": max_depth,
        "crawl_rounds": [],
        "errors": [],
    }

    try:
        initial_probes = probe_urls(traces)
        probes = list(initial_probes)
        seen_urls: set[str] = set()
        for probe in probes:
            for key in ("requested_url", "final_url"):
                value = canonical_url(probe.get(key) or "")
                if value:
                    seen_urls.add(value)

        expanded_urls: list[str] = []
        for depth in range(1, max_depth + 1):
            remaining = max_expanded - len(expanded_urls)
            if remaining <= 0:
                break
            candidates = choose_priority_links(probes, limit=min(max(remaining * 2, remaining), 40))
            layer_urls: list[str] = []
            for candidate in candidates:
                url = canonical_url(candidate)
                if not url or url in seen_urls or url in layer_urls:
                    continue
                layer_urls.append(url)
                if len(layer_urls) >= remaining:
                    break
            if not layer_urls:
                break

            layer_probes = probe_urls(layer_urls)
            probes.extend(layer_probes)
            expanded_urls.extend(layer_urls)
            for url in layer_urls:
                seen_urls.add(url)
            for probe in layer_probes:
                final_url = canonical_url(probe.get("final_url") or "")
                if final_url:
                    seen_urls.add(final_url)

            discovery["crawl_rounds"].append(
                {
                    "depth": depth,
                    "urls": layer_urls,
                    "probe_count": len(layer_probes),
                    "navigation_target_count": sum(len(p.get("navigation_links") or []) for p in layer_probes),
                }
            )

        identity = resolve_identity(probes)
        evidence = build_evidence(probes)
        discovery["expanded_trace_count"] = len(expanded_urls)
        discovery["priority_links"] = expanded_urls
        discovery["navigation_target_count"] = sum(len(p.get("navigation_links") or []) for p in probes)
        discovery["finished_at"] = utc_now()
        discovery["identity_status"] = identity.get("status")
        discovery["identity_label"] = identity.get("label")
        discovery["evidence_count"] = evidence.get("evidence_count", 0)
        discovery["probe_errors"] = [
            {"url": p.get("requested_url"), "error": p.get("error")}
            for p in probes
            if p.get("error")
        ]

        identity_payload = {
            "schema_version": "1.0",
            "case_id": case_id,
            **identity,
        }
        evidence_payload = {
            "case_id": case_id,
            **evidence,
        }

        write_json(case_dir / "identity.json", identity_payload)
        write_json(case_dir / "evidence.json", evidence_payload)
        write_json(case_dir / "discovery.json", discovery)
        update_status(case_dir, state="recherche", identity=identity, error="", evidence=evidence)
        print(json.dumps({"case_id": case_id, "identity": identity.get("label"), "evidence": evidence.get("evidence_count"), "expanded": len(expanded_urls)}, ensure_ascii=False))
        return 0
    except Exception as exc:
        discovery["finished_at"] = utc_now()
        discovery["errors"].append(f"{type(exc).__name__}: {exc}"[:1500])
        write_json(case_dir / "discovery.json", discovery)
        update_status(
            case_dir,
            state="fehler",
            identity={"status": "insufficient", "label": "", "confidence": "none"},
            error=f"Discovery fehlgeschlagen: {type(exc).__name__}: {exc}"[:1500],
        )
        raise


if __name__ == "__main__":
    raise SystemExit(main())
