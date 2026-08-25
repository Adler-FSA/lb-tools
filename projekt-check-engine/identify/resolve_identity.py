#!/usr/bin/env python3
from __future__ import annotations

import re
from collections import Counter
from urllib.parse import urlparse

GENERIC_LABELS = {
    "home", "homepage", "login", "log in", "sign in", "signin", "welcome",
    "dashboard", "account", "register", "registration", "auth", "authentication",
}


def _clean(value: str) -> str:
    return " ".join(str(value or "").strip().split())


def _hostname(url: str) -> str:
    host = (urlparse(url).hostname or "").lower().strip(".")
    return host[4:] if host.startswith("www.") else host


def _title_head(title: str) -> str:
    title = _clean(title)
    if not title:
        return ""
    parts = re.split(r"\s+[|·–—-]\s+", title)
    return _clean(parts[0])[:120]


def _usable_label(value: str) -> bool:
    value = _clean(value)
    if not value or len(value) < 2 or len(value) > 120:
        return False
    if value.lower() in GENERIC_LABELS:
        return False
    if value.lower().startswith(("sign in", "log in", "welcome back")):
        return False
    return True


def label_candidate(probe: dict) -> tuple[str, int, str]:
    site_name = _clean(probe.get("og_site_name") or "")
    if _usable_label(site_name):
        return site_name, 4, "og_site_name"

    title = _title_head(probe.get("title") or "")
    if _usable_label(title):
        return title, 3, "title"

    h1 = _clean(probe.get("h1") or "")
    if _usable_label(h1):
        return h1[:120], 2, "h1"

    host = _hostname(probe.get("final_url") or probe.get("requested_url") or "")
    if host:
        return host, 1, "domain"
    return "", 0, "none"


def resolve_identity(probes: list[dict]) -> dict:
    """Resolve a practical project label without judging the project.

    This is an identification aid, not proof of legal identity. Legal-entity
    attribution remains a separate evidence task in the 37-point analysis.
    """
    candidates: list[dict] = []
    domains: list[str] = []
    for probe in probes:
        host = _hostname(probe.get("final_url") or probe.get("requested_url") or "")
        if host and host not in domains:
            domains.append(host)
        label, score, basis = label_candidate(probe)
        if label:
            candidates.append(
                {
                    "label": label,
                    "score": score,
                    "basis": basis,
                    "url": probe.get("final_url") or probe.get("requested_url") or "",
                }
            )

    if not candidates:
        return {
            "status": "insufficient",
            "label": "",
            "confidence": "none",
            "primary_domain": domains[0] if domains else "",
            "domains": domains,
            "candidates": [],
            "note": "Aus den erreichbaren öffentlichen Spuren konnte noch keine belastbare Projektbezeichnung abgeleitet werden.",
        }

    normalized = Counter(_clean(c["label"]).lower() for c in candidates)
    for candidate in candidates:
        candidate["score_total"] = candidate["score"] + min(3, normalized[_clean(candidate["label"]).lower()] - 1)

    candidates.sort(key=lambda item: (item["score_total"], item["score"]), reverse=True)
    best = candidates[0]
    max_score = best["score_total"]
    confidence = "high" if max_score >= 6 else "medium" if max_score >= 3 else "low"

    return {
        "status": "resolved",
        "label": best["label"],
        "confidence": confidence,
        "primary_domain": _hostname(best.get("url") or "") or (domains[0] if domains else ""),
        "domains": domains,
        "candidates": candidates[:12],
        "note": (
            "Die Bezeichnung dient nur der technischen Zuordnung des gefundenen Angebots. "
            "Sie ist kein Nachweis für Rechtsträger, Betreiberidentität oder regulatorische Zuordnung."
        ),
    }
