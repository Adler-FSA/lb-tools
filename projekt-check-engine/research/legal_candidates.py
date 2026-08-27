#!/usr/bin/env python3
from __future__ import annotations

import re
from collections import Counter

ENTITY_SUFFIX = r"(?:L\.?L\.?C\.?|LTD\.?|LIMITED|INC\.?|INCORPORATED|CORP\.?|CORPORATION|PLC|LLP|FZE|FZCO|DMCC|PJSC|GMBH|UG|AG|S\.?A\.?|SAS|B\.?V\.?|OÜ|OY|AB|APS|SRL|SRO)"
NAME_TOKEN = r"[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+"
PERSON_NAME = rf"{NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,3}}"
ROLE = r"(?:CEO|Chief Executive Officer|Founder|Co-Founder|President|Company President|Director|Managing Director|Chairman|Owner|Co-Owner|General Manager|Managing Partner)"

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


def extract_entity_candidates(evidence_sets: list[dict], limit: int = 12) -> list[dict]:
    counts: Counter[str] = Counter()
    examples: dict[str, str] = {}
    pattern = re.compile(rf"\b({NAME_TOKEN}(?:\s+{NAME_TOKEN}){{0,5}}\s+{ENTITY_SUFFIX})\b", re.I)
    explicit = re.compile(
        rf"(?:legal entity|operator|operated by|company name|registered company|rechtsträger|betreiber)\s*[:\-]?\s*([^\n.;]{{2,120}}?\b{ENTITY_SUFFIX})\b",
        re.I,
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
        re.compile(rf"\b({ROLE})\s*[:\-]?\s*({PERSON_NAME})\b", re.I),
        re.compile(rf"\b({PERSON_NAME})\s*\(([^)]*?\b{ROLE}\b[^)]*)\)", re.I),
        re.compile(rf"\b({PERSON_NAME})\s*[-–—,:]\s*({ROLE})\b", re.I),
    ]
    for text in _texts(evidence_sets):
        for index, regex in enumerate(patterns):
            for match in regex.finditer(text):
                if index == 0:
                    role, name = match.group(1), match.group(2)
                else:
                    name, role = match.group(1), match.group(2)
                name = _clean(name)
                role = _clean(role)
                if len(name.split()) < 2 or len(name) > 90:
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
