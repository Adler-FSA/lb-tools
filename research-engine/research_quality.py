#!/usr/bin/env python3
"""Universelle Qualitäts-Nachbearbeitung für Research-Ergebnisse.

Keine projektspezifischen Namen. Ziel: sichtbare Projektbezeichnung stabilisieren,
Rechtsträger-Kandidaten konservativer filtern und wichtige Funde mit Belegen bündeln.
"""
from __future__ import annotations

import re


def _repair_mojibake(value: str) -> str:
    text = str(value or "")
    if not any(marker in text for marker in ("Ã", "Â", "â", "\u0080", "\u0094")):
        return text
    for enc in ("latin1", "cp1252"):
        try:
            repaired = text.encode(enc).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
        before = sum(text.count(m) for m in ("Ã", "Â", "â", "\u0080", "\u0094"))
        after = sum(repaired.count(m) for m in ("Ã", "Â", "â", "\u0080", "\u0094"))
        if after < before:
            return repaired
    return text


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", _repair_mojibake(str(value or ""))).strip()


def compact(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", clean_text(value).lower())


def looks_like_url(value: str) -> bool:
    value = clean_text(value)
    return bool(re.match(r"^(?:https?://|www\.)", value, re.I) or "/" in value and "." in value)


def _domain_stem(domain: str) -> str:
    host = clean_text(domain).lower().removeprefix("www.")
    parts = [p for p in host.split(".") if p]
    return parts[0] if parts else ""


def derive_project_name(context: dict, analysis: dict) -> str:
    """Leitet bei URL-Eingaben eine lesbare Projektbezeichnung aus Website/Domain ab."""
    current = clean_text(context.get("project_name"))
    if current and not looks_like_url(current):
        return current

    domain = clean_text(context.get("domain"))
    stem = _domain_stem(domain)

    for page in analysis.get("pages") or []:
        title = clean_text(page.get("title"))
        if not title:
            continue
        parts = [clean_text(x) for x in re.split(r"\s*[|·•–—]\s*|\s+-\s+", title) if clean_text(x)]
        for part in parts:
            if 1 < len(part) <= 55 and stem and compact(stem) in compact(part):
                return part
        if len(title) <= 55:
            return title

    if stem:
        return stem.upper() if len(stem) <= 3 else stem[:1].upper() + stem[1:]
    return current or clean_text(context.get("input"))


CLAUSE_PREFIX = re.compile(
    r"^.*?\b(?:facilitated|provided|operated|managed|issued|offered|powered|held|custodied|processed)\s+by\s+",
    re.I,
)

BAD_ENTITY_CONTEXT = re.compile(
    r"\b(?:with\s+(?:corporate|company|registration)\s+(?:number|no\.?|id)|"
    r"having\s+(?:its\s+)?registered\s+office|incorporated\s+under\s+the\s+laws|"
    r"laws\s+of|registered\s+office\s+at)\b",
    re.I,
)

BAD_ENTITY_START = re.compile(
    r"^(?:these|those|this|the|our|all|such|services?|operations?|platform|website|"
    r"terms|privacy|users?|customers?)\b",
    re.I,
)

LEADING_YEAR_RE = re.compile(r"^(?:©\s*)?(?:(?:19|20)\d{2})\s+(?=[A-ZÄÖÜ])")

LEGAL_END = re.compile(
    r"\b(?:GmbH|AG|Aktiengesellschaft|SE|Ltd\.?|Limited|LLC|Inc\.?|PLC|S\.?A\.?|S\.p\.A\.|B\.V\.|Sarl|S\.à\s*r\.l\.?)$",
    re.I,
)


def clean_entity_candidate(value: str) -> str:
    value = clean_text(value).strip(" -–—:;,.()[]")
    value = CLAUSE_PREFIX.sub("", value).strip(" -–—:;,.()[]")
    value = LEADING_YEAR_RE.sub("", value).strip(" -–—:;,.()[]")
    if not value or len(value) > 78:
        return ""
    if BAD_ENTITY_CONTEXT.search(value):
        return ""
    if BAD_ENTITY_START.search(value):
        return ""
    if not LEGAL_END.search(value):
        return ""
    words = re.findall(r"[A-Za-zÄÖÜäöüß0-9&'’.-]+", value)
    if len(words) < 2:
        return ""
    return value


def clean_legal_entities(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for raw in values or []:
        value = clean_entity_candidate(raw)
        key = compact(value)
        if value and key and key not in seen:
            seen.add(key)
            result.append(value)
    return result[:12]


def evidence_highlights(analysis: dict, limit: int = 14) -> list[dict]:
    wanted = {
        "yield_percentage", "commission_percentage", "trading", "lending", "withdrawal",
        "kyc", "custody", "referral", "bonus", "guarantee", "legal_entity", "referral_input",
    }
    out: list[dict] = []
    seen: set[tuple[str, str, str]] = set()
    for item in analysis.get("findings") or []:
        kind = clean_text(item.get("type"))
        if kind not in wanted:
            continue
        evidence = clean_text(item.get("evidence"))
        source_url = clean_text(item.get("source_url"))
        value = clean_text(item.get("value"))
        key = (kind, compact(value), source_url)
        if not evidence or key in seen:
            continue
        seen.add(key)
        out.append({"type": kind, "value": value, "source_url": source_url, "evidence": evidence, "confidence": item.get("confidence") or "medium"})
        if len(out) >= limit:
            break
    return out


def _append_claim_evidence_to_quick(quick: dict, highlights: list[dict]) -> None:
    gaps = list(quick.get("research_gaps") or [])
    for item in highlights:
        if item.get("type") != "guarantee":
            continue
        evidence = clean_text(item.get("evidence"))
        source = clean_text(item.get("source_url"))
        text = "Garantie-/Sicherheitsaussage erkannt und deshalb genauer zu prüfen."
        if evidence:
            text += f" Beleg: {evidence}"
        if source:
            text += f" Quelle: {source}"
        if text not in gaps:
            gaps.append(text)
    quick["research_gaps"] = gaps[:12]


def postprocess(data: dict) -> dict:
    if not isinstance(data, dict):
        return data
    context = data.setdefault("context", {})
    analysis = data.get("analysis") or {}

    if analysis:
        cleaned = clean_legal_entities(list(analysis.get("legal_entities") or []))
        analysis["legal_entities"] = cleaned
        context["project_name"] = derive_project_name(context, analysis)
        highlights = evidence_highlights(analysis)
        analysis["evidence_highlights"] = highlights

        quick = data.get("quick_check")
        if isinstance(quick, dict):
            quick["project_name"] = context.get("project_name") or quick.get("project_name")
            quick["legal_entities_claimed"] = cleaned
            quick["evidence_highlights"] = list(highlights)
            _append_claim_evidence_to_quick(quick, highlights)

    return data
