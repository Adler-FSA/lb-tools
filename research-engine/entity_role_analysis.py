#!/usr/bin/env python3
"""Leitet behauptete Rechtsträger-Rollen aus Projekt-eigenen Belegen ab.

Die Klassifikation ist ausdrücklich keine unabhängige Bestätigung. Sie trennt nur,
welche Rolle die Projektwebsite einem gefundenen Rechtsträger zuschreibt, damit
Betreiber, Zahlungsabwicklung, Verwahrung und Infrastruktur nicht vermischt werden.
"""
from __future__ import annotations

import re


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _windows(data: dict, entity: str) -> list[dict]:
    analysis = data.get("analysis") or {}
    needle = clean(entity)
    if not needle:
        return []
    out: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for finding in analysis.get("findings") or []:
        evidence = clean(finding.get("evidence") or "")
        if needle.lower() not in evidence.lower():
            continue
        key = (clean(finding.get("source_url") or ""), evidence[:280])
        if key in seen:
            continue
        seen.add(key)
        out.append({"source_url": key[0], "text": evidence[:620]})

    for page in analysis.get("pages") or []:
        text = clean(page.get("text") or "")
        low = text.lower()
        start = 0
        while text and len(out) < 20:
            idx = low.find(needle.lower(), start)
            if idx < 0:
                break
            left = max(0, idx - 240)
            right = min(len(text), idx + len(needle) + 300)
            excerpt = clean(text[left:right])
            key = (clean(page.get("url") or ""), excerpt[:280])
            if key not in seen:
                seen.add(key)
                out.append({"source_url": key[0], "text": excerpt[:620]})
            start = idx + len(needle)
    return out[:20]


def classify_excerpt(entity: str, text: str) -> str:
    e = re.escape(clean(entity))
    t = clean(text)
    if not t:
        return "role_unclear"

    # Spezifische Rollen müssen VOR dem generischen "operated by" geprüft werden.
    # Sonst würde z. B. "custody infrastructure operated by Fireblocks" fälschlich
    # den Infrastrukturanbieter zum Betreiber des gesamten Projekts machen.
    if re.search(rf"(?:trading|trade)\s+name\s+of\s+{e}\b", t, re.I) or re.search(rf"\b{e}\b.{0,80}(?:legal\s+entity|trading\s+name)", t, re.I):
        return "brand_legal_entity"
    if re.search(rf"(?:payment|payments|transaction|transactions).{{0,140}}(?:facilitated|processed|provided|handled)\s+by\s+{e}\b", t, re.I):
        return "payment_facilitator"
    if re.search(rf"\b{e}\b.{{0,140}}(?:payment|payments|payment\s+services|payment\s+processor)", t, re.I):
        return "payment_facilitator"
    if re.search(rf"(?:custody|custodian|custodial|private\s+keys?|wallet\s+infrastructure).{{0,180}}(?:operated|provided|supported|powered)?\s*(?:by\s+)?\b{e}\b", t, re.I) or re.search(rf"\b{e}\b.{{0,180}}(?:custody|custodian|custodial|private\s+keys?|wallet\s+infrastructure)", t, re.I):
        return "custody_or_wallet_provider"
    if re.search(rf"(?:technology|infrastructure|security|mpc).{{0,180}}(?:operated|provided|supported|powered)?\s*(?:by\s+)?\b{e}\b", t, re.I) or re.search(rf"\b{e}\b.{{0,180}}(?:technology|infrastructure|security\s+provider|mpc)", t, re.I):
        return "technology_or_infrastructure_provider"
    if re.search(rf"(?:operated|owned|managed)\s+by\s+{e}\b", t, re.I) or re.search(rf"\boperator\b.{0,80}\b{e}\b", t, re.I):
        return "operator_claim"
    return "role_unclear"


def analyze(data: dict) -> list[dict]:
    analysis = data.get("analysis") or {}
    result: list[dict] = []
    for entity in analysis.get("legal_entities") or []:
        roles: list[dict] = []
        seen_roles: set[str] = set()
        for item in _windows(data, entity):
            role = classify_excerpt(entity, item.get("text") or "")
            if role == "role_unclear" or role in seen_roles:
                continue
            seen_roles.add(role)
            roles.append({
                "role": role,
                "source_relation": "project_owned_claim",
                "source_url": item.get("source_url") or "",
                "evidence": item.get("text") or "",
                "independently_confirmed": False,
            })
        result.append({
            "entity": entity,
            "claimed_roles": roles,
            "role_status": "project_role_claims_found" if roles else "role_unclear",
        })
    return result


def attach(data: dict) -> dict:
    relationships = analyze(data)
    block = data.setdefault("operator_registry_research", {})
    block["entity_relationships"] = relationships
    by_entity = {str(x.get("entity") or "").lower(): x for x in relationships}
    for profile in block.get("profiles") or []:
        rel = by_entity.get(str(profile.get("entity") or "").lower()) or {}
        profile["claimed_roles"] = list(rel.get("claimed_roles") or [])
        profile["role_status"] = rel.get("role_status") or "role_unclear"
    block.setdefault("guardrails", {})["project_role_claims_are_independent_evidence"] = False
    block["guardrails"]["entity_role_does_not_imply_ownership_or_ubo"] = True
    block["guardrails"]["specific_service_role_precedes_generic_operator_wording"] = True
    return data
