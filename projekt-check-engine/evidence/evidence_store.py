#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter


def build_evidence(probes: list[dict]) -> dict:
    items = []
    for index, probe in enumerate(probes, start=1):
        items.append(
            {
                "evidence_id": f"E{index:03d}",
                "kind": "public_web_capture",
                "source_type": probe.get("source_type") or "website",
                "requested_url": probe.get("requested_url") or "",
                "final_url": probe.get("final_url") or "",
                "captured_at": probe.get("captured_at") or "",
                "http_status": probe.get("http_status"),
                "title": probe.get("title") or "",
                "h1": probe.get("h1") or "",
                "meta_description": probe.get("meta_description") or "",
                "og_site_name": probe.get("og_site_name") or "",
                "text_excerpt": probe.get("text_excerpt") or "",
                "content_sha256": probe.get("content_sha256") or "",
                "error": probe.get("error") or "",
            }
        )

    counts = Counter(item["source_type"] for item in items)
    reachable = sum(1 for item in items if not item["error"] and item["http_status"] and item["http_status"] < 500)
    return {
        "schema_version": "1.0",
        "evidence_count": len(items),
        "reachable_count": reachable,
        "source_type_counts": dict(sorted(counts.items())),
        "items": items,
    }
