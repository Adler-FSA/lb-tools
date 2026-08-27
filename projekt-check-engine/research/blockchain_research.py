#!/usr/bin/env python3
from __future__ import annotations

import re
from urllib.parse import urlparse

from research.web_search import search_one

CHAIN_PATTERNS = {
    "ethereum": ("ethereum", "eth mainnet", "etherscan"),
    "bsc": ("bnb smart chain", "binance smart chain", "bscscan"),
    "polygon": ("polygon", "polygonscan"),
    "base": ("base chain", "basescan"),
    "arbitrum": ("arbitrum", "arbiscan"),
    "optimism": ("optimism", "optimistic ethereum", "optimism explorer"),
    "avalanche": ("avalanche c-chain", "snowtrace"),
    "tron": ("tron", "tronscan"),
    "solana": ("solana", "solscan"),
    "bitcoin": ("bitcoin", "btc blockchain"),
}

EXPLORER_HOSTS = {
    "etherscan.io": "ethereum",
    "bscscan.com": "bsc",
    "polygonscan.com": "polygon",
    "basescan.org": "base",
    "arbiscan.io": "arbitrum",
    "optimistic.etherscan.io": "optimism",
    "snowtrace.io": "avalanche",
    "tronscan.org": "tron",
    "solscan.io": "solana",
}

TECHNICAL_TERMS = (
    "blockchain", "public ledger", "on-chain", "onchain", "smart contract", "smart contracts",
    "contract address", "wallet address", "transaction hash", "dao", "governance", "treasury",
    "tokenomics", "liquidity", "mint", "minting", "vesting", "audit", "audited", "multisig",
)

DEFI_TERMS = (
    "defi", "dapp", "staking", "lending", "borrowing", "borrow", "bridge", "oracle",
    "multisig", "liquidity pool", "liquidity pools", "governance", "dao",
)

CONTROL_TERMS = (
    "owner", "admin", "administrator", "proxy", "upgradeable", "upgrade", "pause", "pausable",
    "mint", "minting", "burn", "blacklist", "whitelist", "multisig", "timelock",
)

EVM_ADDRESS_RE = re.compile(r"(?<![0-9a-fA-F])0x[0-9a-fA-F]{40}(?![0-9a-fA-F])")
EVM_TX_RE = re.compile(r"(?<![0-9a-fA-F])0x[0-9a-fA-F]{64}(?![0-9a-fA-F])")
TRON_ADDRESS_RE = re.compile(r"(?<![A-Za-z0-9])T[1-9A-HJ-NP-Za-km-z]{33}(?![A-Za-z0-9])")
EXPLORER_URL_RE = re.compile(r"https?://[^\s\"'<>]+", re.I)


def norm(value: str) -> str:
    return " ".join(str(value or "").replace("\u00a0", " ").split()).strip()


def _has_term(text: str, term: str) -> bool:
    text = str(text or "").casefold()
    term = str(term or "").casefold().strip()
    if not term:
        return False
    pattern = r"(?<![\w])" + re.escape(term).replace(r"\ ", r"\s+") + r"(?![\w])"
    return re.search(pattern, text, flags=re.I) is not None


def matching_terms(text: str, terms) -> list[str]:
    return [term for term in terms if _has_term(text, term)]


def evidence_text(item: dict) -> str:
    return norm(" ".join([
        str(item.get("title") or ""), str(item.get("h1") or ""), str(item.get("meta_description") or ""),
        str(item.get("text_excerpt") or ""), str(item.get("search_title") or ""), str(item.get("search_snippet") or ""),
        str(item.get("final_url") or ""), str(item.get("requested_url") or ""),
    ]))


def _host(url: str) -> str:
    host = (urlparse(str(url or "")).hostname or "").lower().strip(".")
    return host[4:] if host.startswith("www.") else host


def _unique(values, limit: int = 50):
    out=[]; seen=set()
    for raw in values:
        value=norm(raw)
        key=value.casefold()
        if value and key not in seen:
            seen.add(key); out.append(value)
        if len(out) >= limit:
            break
    return out


def detect_chains(text: str) -> list[str]:
    out=[]
    for chain, patterns in CHAIN_PATTERNS.items():
        if any(_has_term(text, pattern) for pattern in patterns):
            out.append(chain)
    return out


def explorer_chain(url: str) -> str | None:
    host=_host(url)
    for explorer, chain in EXPLORER_HOSTS.items():
        if host == explorer or host.endswith("." + explorer):
            return chain
    return None


def extract_explorer_urls(text: str) -> list[dict]:
    out=[]; seen=set()
    for raw in EXPLORER_URL_RE.findall(str(text or "")):
        url=raw.rstrip(".,);]}")
        chain=explorer_chain(url)
        if not chain:
            continue
        key=url.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append({"url":url,"chain":chain})
    return out


def _context(text: str, start: int, end: int, radius: int = 180) -> str:
    return norm(text[max(0,start-radius):min(len(text),end+radius)])


def extract_identifiers(text: str, evidence_ref: str, scope: str) -> list[dict]:
    text=str(text or "")
    out=[]; seen=set()

    for m in EVM_TX_RE.finditer(text):
        value=m.group(0)
        key=("evm_tx",value.casefold())
        if key in seen: continue
        seen.add(key)
        ctx=_context(text,m.start(),m.end())
        out.append({"type":"evm_tx_hash","value":value,"evidence_ref":evidence_ref,"scope":scope,"context":ctx,"chains":detect_chains(ctx)})

    # 64-hex transaction hashes are removed before address matching to prevent partial matches.
    masked=EVM_TX_RE.sub(lambda m: " " * len(m.group(0)), text)
    for m in EVM_ADDRESS_RE.finditer(masked):
        value=m.group(0)
        key=("evm_address",value.casefold())
        if key in seen: continue
        seen.add(key)
        ctx=_context(text,m.start(),m.end())
        role="address"
        low=ctx.casefold()
        if "contract" in low or "token address" in low:
            role="contract_candidate"
        elif "wallet" in low or "treasury" in low:
            role="wallet_candidate"
        out.append({"type":"evm_address","role":role,"value":value,"evidence_ref":evidence_ref,"scope":scope,"context":ctx,"chains":detect_chains(ctx)})

    for m in TRON_ADDRESS_RE.finditer(text):
        value=m.group(0)
        key=("tron_address",value)
        if key in seen: continue
        seen.add(key)
        ctx=_context(text,m.start(),m.end())
        role="wallet_candidate" if ("wallet" in ctx.casefold() or "treasury" in ctx.casefold()) else "address"
        out.append({"type":"tron_address","role":role,"value":value,"evidence_ref":evidence_ref,"scope":scope,"context":ctx,"chains":["tron"]})
    return out


def build_technical_queries(label: str, primary_domain: str, distinctive_terms: list[str]) -> list[str]:
    anchors=[]
    for value in distinctive_terms + [label, primary_domain]:
        value=norm(value)
        if value and value.casefold() not in {x.casefold() for x in anchors}:
            anchors.append(value)
    if not anchors:
        return []
    main=anchors[0]
    extra=f" {anchors[1]}" if len(anchors)>1 else ""
    return _unique([
        f'"{main}"{extra} smart contract address explorer',
        f'"{main}"{extra} blockchain wallet contract',
        f'"{main}"{extra} token address audit',
        f'"{main}"{extra} staking lending liquidity governance DAO',
        f'"{main}"{extra} etherscan bscscan polygonscan basescan arbiscan tronscan solscan',
    ],10)


def search_technical_traces(label: str, primary_domain: str, distinctive_terms: list[str], max_results: int = 12) -> dict:
    queries=build_technical_queries(label,primary_domain,distinctive_terms)
    results=[]; errors=[]; rejected=[]; seen=set()
    anchors=[x.casefold() for x in distinctive_terms+[label,primary_domain] if norm(x)]
    for query in queries:
        rows, errs=search_one(query,per_provider=5)
        errors.extend(errs)
        for row in rows:
            blob=norm(" ".join([row.get("url",""),row.get("title",""),row.get("snippet","")])).casefold()
            relevant=any(anchor in blob for anchor in anchors if len(anchor)>=4)
            technical=bool(matching_terms(blob,TECHNICAL_TERMS+DEFI_TERMS)) or bool(explorer_chain(row.get("url", "")) )
            if not (relevant and technical):
                rejected.append(row); continue
            key=str(row.get("url") or "").casefold().rstrip("/")
            if not key or key in seen: continue
            seen.add(key); results.append(row)
            if len(results)>=max_results: break
        if len(results)>=max_results: break
    return {"queries":queries,"results":results,"rejected_results":rejected,"errors":errors}


def analyze_technical_sources(primary_items: list[dict], external_items: list[dict]) -> dict:
    all_claims=[]; identifiers=[]; explorer_urls=[]; chains=[]
    defi_terms=[]; control_terms=[]; technical_terms=[]
    for scope, items in (("first_party",primary_items),("external_trace",external_items)):
        for item in items:
            ref=str(item.get("evidence_id") or "")
            text=evidence_text(item)
            tech=matching_terms(text,TECHNICAL_TERMS)
            defi=matching_terms(text,DEFI_TERMS)
            control=matching_terms(text,CONTROL_TERMS)
            item_chains=detect_chains(text)
            if tech or defi or item_chains:
                all_claims.append({"evidence_ref":ref,"scope":scope,"technical_terms":tech,"defi_terms":defi,"chains":item_chains})
            identifiers.extend(extract_identifiers(text,ref,scope))
            explorer_urls.extend({**x,"evidence_ref":ref,"scope":scope} for x in extract_explorer_urls(text))
            chains.extend(item_chains); defi_terms.extend(defi); control_terms.extend(control); technical_terms.extend(tech)

    # de-duplicate identifiers by type/value/scope while preserving the strongest first occurrence.
    ids=[]; seen=set()
    for row in identifiers:
        key=(row.get("type"),str(row.get("value") or "").casefold(),row.get("scope"))
        if key in seen: continue
        seen.add(key); ids.append(row)

    ex=[]; seen=set()
    for row in explorer_urls:
        key=str(row.get("url") or "").casefold().rstrip("/")
        if key in seen: continue
        seen.add(key); ex.append(row)

    first_party_ids=[x for x in ids if x.get("scope")=="first_party"]
    first_party_explorers=[x for x in ex if x.get("scope")=="first_party"]
    return {
        "technical_claims":all_claims,
        "technical_terms":_unique(technical_terms),
        "defi_terms":_unique(defi_terms),
        "control_terms":_unique(control_terms),
        "chains":_unique(chains),
        "identifiers":ids,
        "explorer_urls":ex,
        "first_party_identifier_count":len(first_party_ids),
        "first_party_explorer_count":len(first_party_explorers),
        "has_specific_technical_identifier":bool(first_party_ids or first_party_explorers),
        "has_blockchain_claim":bool(technical_terms or chains),
        "has_defi_claim":bool(defi_terms),
    }
