#!/usr/bin/env python3
from __future__ import annotations

import re
from collections import Counter

# Firmenendungen bleiben bewusst case-sensitiv. Dadurch wird ein normales Satzende
# wie "including but not limited" nicht als angeblicher Rechtsträger erkannt.
ENTITY_SUFFIX = r"(?:L\.?L\.?C\.?|LLC|Ltd\.?|LTD\.?|Limited|LIMITED|Inc\.?|INC\.?|Incorporated|INCORPORATED|Corp\.?|CORP\.?|Corporation|CORPORATION|PLC|LLP|FZE|FZCO|DMCC|PJSC|GmbH|GMBH|UG|AG|S\.?A\.?|SAS|B\.?V\.?|OÜ|OY|AB|ApS|APS|SRL|SRO)"
NAME_TOKEN = r"[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+"
PERSON_NAME = rf"{NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,3}}"
ROLE = r"(?:CEO|Chief Executive Officer|Founder|Co-Founder|President|Company President|Director|Managing Director|Chairman|Owner|Co-Owner|General Manager|Managing Partner)"
ROLE_CI = rf"(?i:{ROLE})"
EXPLICIT_ENTITY_PREFIX = r"(?i:legal entity|operator|operated by|company name|registered company|rechtsträger|betreiber)"
PERSON_TRAILING_STOP = {"reveals", "presents", "explains", "announces", "discusses", "joins", "speaks", "talks", "live", "presentation", "overview", "interview"}
PERSON_REJECT_TOKENS = {"youtube", "auf", "video", "watch", "presentation", "overview"}

JURISDICTION_TERMS = {
    "DE": ["germany", "deutschland", "german", "berlin", "frankfurt", "munich", "münchen", "hamburg"],
    "EU": ["european union", "europe", "eu", "mica"],
    "UK": ["united kingdom", "uk", "britain", "british", "england", "london"],
    "US": ["united states", "usa", "u.s.", "new york", "delaware", "california", "florida"],
    "AE": ["united arab emirates", "uae", "dubai", "abu dhabi", "difc", "adgm"],
    "CH": ["switzerland", "schweiz", "swiss", "zug", "zurich", "zürich"],
    "SG": ["singapore"],
    "AU": ["australia", "australian"],
    "CY": ["cyprus", "zypern"],
    "MT": ["malta"],
}


def _clean(value: str) -> str:
    return " ".join(str(value or "").replace("\u00a0", " ").split()).strip(" ,;:|()[]{}")


def _texts(evidence_sets: list[dict]) -> list[str]:
    out: list[str] = []
    for evidence in evidence_sets:
        for item in evidence.get("items") or []:
            text = " ".join([
                str(item.get("title") or ""),
                str(item.get("h1") or ""),
                str(item.get("meta_description") or ""),
                str(item.get("text_excerpt") or ""),
                str(item.get("search_title") or ""),
                str(item.get("search_snippet") or ""),
            ])
            text = _clean(text)
            if text:
                out.append(text)
    return out


def _normalize_person_name(value: str) -> str:
    parts = _clean(value).split()
    while len(parts) > 2 and parts[-1].casefold() in PERSON_TRAILING_STOP:
        parts.pop()
    if len(parts) < 2:
        return ""
    if any(part.casefold() in PERSON_REJECT_TOKENS for part in parts):
        return ""
    return " ".join(parts)


def extract_entity_candidates(evidence_sets: list[dict], limit: int = 12) -> list[dict]:
    counts: Counter[str] = Counter()
    examples: dict[str, str] = {}
    pattern = re.compile(rf"\b({NAME_TOKEN}(?:\s+{NAME_TOKEN}){{0,5}}\s+{ENTITY_SUFFIX})\b")
    explicit = re.compile(
        rf"{EXPLICIT_ENTITY_PREFIX}\s*[:\-]?\s*([^\n.;]{{2,120}}?\b{ENTITY_SUFFIX})\b"
    )
    for text in _texts(evidence_sets):
        for regex in (explicit, pattern):
            for match in regex.finditer(text):
                value = _clean(match.group(1))
                if len(value) < 4 or len(value) > 120:
                    continue
                key = value.casefold()
                counts[key] += 3 if regex is explicit else 1
                examples.setdefault(key, value)
    return [
        {"name": examples[key], "mentions": counts[key], "basis": "public_project_or_external_trace"}
        for key, _ in counts.most_common(limit)
    ]


def extract_person_candidates(evidence_sets: list[dict], limit: int = 16) -> list[dict]:
    counts: Counter[str] = Counter()
    roles: dict[str, set[str]] = {}
    examples: dict[str, str] = {}
    patterns = [
        re.compile(rf"\b({ROLE_CI})\s*[:\-]?\s*({PERSON_NAME})\b"),
        re.compile(rf"\b({PERSON_NAME})\s*\(([^)]*?\b{ROLE_CI}\b[^)]*)\)"),
        re.compile(rf"\b({PERSON_NAME})\s*[-–—,:]\s*({ROLE_CI})\b"),
    ]
    for text in _texts(evidence_sets):
        for index, regex in enumerate(patterns):
            for match in regex.finditer(text):
                if index == 0:
                    role, name = match.group(1), match.group(2)
                else:
                    name, role = match.group(1), match.group(2)
                name = _normalize_person_name(name)
                role = _clean(role)
                if not name or len(name) > 90:
                    continue
                key = name.casefold()
                counts[key] += 1
                examples.setdefault(key, name)
                roles.setdefault(key, set()).add(role)
    return [
        {
            "name": examples[key],
            "mentions": counts[key],
            "roles": sorted(roles.get(key, set())),
            "basis": "public_project_or_external_trace",
        }
        for key, _ in counts.most_common(limit)
    ]


def extract_jurisdiction_hints(evidence_sets: list[dict]) -> list[dict]:
    blob = "\n".join(_texts(evidence_sets)).casefold()
    out = []
    for jurisdiction, terms in JURISDICTION_TERMS.items():
        hits = sorted({term for term in terms if re.search(rf"(?<!\w){re.escape(term.casefold())}(?!\w)", blob)})
        if hits:
            out.append({"jurisdiction": jurisdiction, "terms": hits, "score": len(hits)})
    out.sort(key=lambda x: (-x["score"], x["jurisdiction"]))
    return out


def extract_legal_candidates(evidence_sets: list[dict]) -> dict:
    return {
        "entities": extract_entity_candidates(evidence_sets),
        "persons": extract_person_candidates(evidence_sets),
        "jurisdiction_hints": extract_jurisdiction_hints(evidence_sets),
    }
