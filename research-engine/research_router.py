#!/usr/bin/env python3
"""Universeller Request-Router für SchnellCheck und Deep Research.

Der Router trifft nur Strukturentscheidungen. Er bewertet kein Projekt und
enthält keine projektspezifischen Namen, Domains, Personen oder Register.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from urllib.parse import urlparse

MODES = {"quick", "deep"}

EVM_ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")
SOLANA_ADDRESS_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
URLISH_RE = re.compile(
    r"^(?:https?://|www\.)|^[a-z0-9.-]+\.[a-z]{2,}(?:/|$)",
    re.I,
)
REFERRAL_RE = re.compile(
    r"(?:/ref(?:erral)?/|/invite/|/partner/|[?&](?:ref|referral|affiliate|partner|sponsor|invite)=)",
    re.I,
)
SOCIAL_HOSTS = {
    "youtube.com", "youtu.be", "facebook.com", "instagram.com", "tiktok.com",
    "x.com", "twitter.com", "linkedin.com", "t.me", "telegram.me", "reddit.com",
}
CHAIN_HINT_WORDS = re.compile(
    r"\b(token|coin|contract address|smart contract|erc[- ]?20|bep[- ]?20|solana|ethereum|bnb chain|polygon|base|arbitrum|avalanche)\b",
    re.I,
)


@dataclass(frozen=True)
class ResearchRequest:
    raw: str
    mode: str
    product: str
    input_kind: str
    route: str
    normalized_input: str
    domain_hint: str
    referral_hint: bool
    blockchain_hint: bool
    social_hint: bool


@dataclass(frozen=True)
class ModuleDecision:
    module: str
    run: bool
    reason: str
    depth: str


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_url(value: str) -> str:
    value = clean(value)
    if not value:
        return ""
    if not re.match(r"^https?://", value, re.I):
        value = "https://" + value
    p = urlparse(value)
    if not p.hostname:
        return value
    path = p.path or "/"
    query = f"?{p.query}" if p.query else ""
    return f"{p.scheme or 'https'}://{p.netloc.lower()}{path}{query}"


def classify_input(value: str) -> dict:
    raw = clean(value)
    if not raw:
        raise ValueError("Leere Eingabe")

    if EVM_ADDRESS_RE.fullmatch(raw):
        return {
            "input_kind": "evm_contract_or_address",
            "route": "blockchain_identity",
            "normalized_input": raw,
            "domain_hint": "",
            "referral_hint": False,
            "blockchain_hint": True,
            "social_hint": False,
        }

    if " " not in raw and SOLANA_ADDRESS_RE.fullmatch(raw) and any(ch.isdigit() for ch in raw):
        return {
            "input_kind": "solana_address_candidate",
            "route": "blockchain_identity",
            "normalized_input": raw,
            "domain_hint": "",
            "referral_hint": False,
            "blockchain_hint": True,
            "social_hint": False,
        }

    if URLISH_RE.search(raw):
        url = normalize_url(raw)
        host = (urlparse(url).hostname or "").lower().removeprefix("www.")
        social = any(host == h or host.endswith("." + h) for h in SOCIAL_HOSTS)
        return {
            "input_kind": "url",
            "route": "web_identity",
            "normalized_input": url,
            "domain_hint": host,
            "referral_hint": bool(REFERRAL_RE.search(url)),
            "blockchain_hint": bool(CHAIN_HINT_WORDS.search(raw)),
            "social_hint": social,
        }

    return {
        "input_kind": "name",
        "route": "web_identity",
        "normalized_input": raw,
        "domain_hint": "",
        "referral_hint": False,
        "blockchain_hint": bool(CHAIN_HINT_WORDS.search(raw)),
        "social_hint": False,
    }


def build_request(value: str, mode: str = "quick") -> ResearchRequest:
    mode = clean(mode).lower() or "quick"
    if mode not in MODES:
        raise ValueError(f"Unbekannter Research-Modus: {mode}")
    info = classify_input(value)
    return ResearchRequest(
        raw=clean(value),
        mode=mode,
        product="schnellcheck" if mode == "quick" else "projektanalyse",
        **info,
    )


def capabilities(core_result: dict | None, request: ResearchRequest) -> list[str]:
    caps: set[str] = set()
    if request.route == "web_identity":
        caps.add("web")
    if request.blockchain_hint:
        caps.add("blockchain")
    if request.referral_hint:
        caps.add("distribution")
    if request.social_hint:
        caps.add("social")

    analysis = (core_result or {}).get("analysis") or {}
    detected = analysis.get("detected") or {}
    if analysis.get("legal_entities"):
        caps.add("legal_entity")
    if analysis.get("max_yield_percentage") is not None:
        caps.add("yield")
    if analysis.get("max_commission_percentage") is not None or detected.get("referral"):
        caps.add("distribution")
    if detected.get("trading") or detected.get("leverage") or detected.get("defi") or detected.get("staking"):
        caps.add("crypto_finance")
    if detected.get("kyc") or detected.get("custody"):
        caps.add("customer_assets")
    if analysis.get("social_and_video_links"):
        caps.add("social")
    return sorted(caps)


def module_plan(request: ResearchRequest, core_result: dict | None = None) -> list[ModuleDecision]:
    caps = set(capabilities(core_result, request))
    core_ok = (core_result or {}).get("status") == "ok"

    if request.route == "blockchain_identity":
        return [
            ModuleDecision("blockchain_identity", True, "Chain-Adresse erkannt; zuerst Asset/Projekt identifizieren.", "quick"),
            ModuleDecision("website_research", False, "Ohne aufgelöste Projektidentität keine Domain raten.", "quick"),
            ModuleDecision("external_research", False, "Startet erst nach Identitätsauflösung.", "quick"),
            ModuleDecision("project_analysis_16", False, "Erst nach Identitätsauflösung und Belegsammlung.", "deep"),
        ]

    decisions = [
        ModuleDecision("website_research", True, "Web-/Namenseingabe: Projektwebsite und Kernaussagen ermitteln.", "quick"),
    ]
    if not core_result:
        decisions.append(ModuleDecision("external_research", False, "Wird nach bestätigter Projektidentität geplant.", "quick"))
        return decisions

    decisions.append(ModuleDecision(
        "external_research",
        core_ok,
        "Bestätigte Projektidentität vorhanden." if core_ok else "Keine bestätigte Projektwebsite.",
        "quick",
    ))

    operator_needed = core_ok and "legal_entity" in caps
    decisions.append(ModuleDecision(
        "operator_registry",
        operator_needed and request.mode == "deep",
        "Rechtsträger erkannt; Register-/Behördenprüfung gehört in Deep Research."
        if operator_needed else "Kein Rechtsträger erkannt oder SchnellCheck-Modus.",
        "deep",
    ))
    decisions.append(ModuleDecision(
        "people_history",
        operator_needed and request.mode == "deep",
        "Management/Personen erst nach Rechtsträger-Erkennung vertiefen."
        if operator_needed else "Keine belastbare Rechtsträgerbasis oder SchnellCheck-Modus.",
        "deep",
    ))
    decisions.append(ModuleDecision(
        "academy_analysis",
        core_ok and request.mode == "deep",
        "Deep Research vergleicht Projektbehauptungen mit unabhängigen Spuren."
        if core_ok and request.mode == "deep" else "Nur für vollständige Projektanalyse.",
        "deep",
    ))
    decisions.append(ModuleDecision(
        "project_analysis_16",
        core_ok and request.mode == "deep",
        "16-Punkte-Standard nur im Produkt Projektanalyse."
        if core_ok and request.mode == "deep" else "SchnellCheck zeigt keine vollständige 16-Punkte-Analyse.",
        "deep",
    ))
    return decisions


def request_payload(request: ResearchRequest, core_result: dict | None = None) -> dict:
    return {
        "request": asdict(request),
        "capabilities": capabilities(core_result, request),
        "module_plan": [asdict(x) for x in module_plan(request, core_result)],
        "principle": "Im Hintergrund so tief wie nötig; im SchnellCheck nur so viel wie für erste Klarheit erforderlich.",
    }
