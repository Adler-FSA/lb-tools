#!/usr/bin/env python3
from __future__ import annotations

import re
from urllib.parse import urlparse

from research.web_search import search_one

PAYMENT_TERMS = (
    "banking", "bank account", "payment", "payments", "payment account", "payment service",
    "payment services", "payment provider", "payment processor", "card", "debit card", "credit card",
    "virtual card", "physical card", "iban", "sepa", "swift", "bic", "issuer", "issuing",
    "card issuer", "banking partner", "payment partner", "psp", "emi", "electronic money institution",
    "payment institution", "money app", "fintech app",
)
NETWORK_TERMS = ("visa", "mastercard", "maestro", "unionpay")
INFRASTRUCTURE_TERMS = (
    "issuer", "issuing bank", "card issuer", "bin sponsor", "banking partner", "payment partner",
    "payment processor", "payment provider", "psp", "emi", "electronic money institution",
    "payment institution", "acquirer", "acquiring bank", "sponsor bank",
)
NEGATION_PATTERNS = (
    "do not collect", "does not collect", "do not store", "does not store", "not collect", "not store",
    "never ask", "will never ask", "we do not", "we don't", "without collecting",
)

IBAN_RE = re.compile(r"(?<![A-Z0-9])[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}(?![A-Z0-9])")
BIN_RE = re.compile(r"\b(?:BIN|IIN)\s*(?:number|no\.?|#|:)?\s*([0-9]{6,8})\b", re.I)
BIC_RE = re.compile(r"\b(?:BIC|SWIFT)\s*(?:code|no\.?|#|:)?\s*([A-Z0-9]{8}(?:[A-Z0-9]{3})?)\b", re.I)


def norm(value: str) -> str:
    return " ".join(str(value or "").replace("\u00a0", " ").split()).strip()


def _unique(values, limit: int = 50):
    out=[]; seen=set()
    for raw in values:
        value=norm(raw)
        key=value.casefold()
        if value and key not in seen:
            seen.add(key); out.append(value)
        if len(out)>=limit:
            break
    return out


def _has_term(text: str, term: str) -> bool:
    text=str(text or "").casefold(); term=str(term or "").casefold().strip()
    if not term: return False
    pattern=r"(?<![\w])"+re.escape(term).replace(r"\ ",r"\s+")+r"(?![\w])"
    return re.search(pattern,text,flags=re.I) is not None


def matching_terms(text: str, terms) -> list[str]:
    return [term for term in terms if _has_term(text,term)]


def evidence_text(item: dict) -> str:
    return norm(" ".join([
        str(item.get("title") or ""), str(item.get("h1") or ""), str(item.get("meta_description") or ""),
        str(item.get("text_excerpt") or ""), str(item.get("search_title") or ""), str(item.get("search_snippet") or ""),
        str(item.get("final_url") or ""), str(item.get("requested_url") or ""),
    ]))


def _sentences(text: str) -> list[str]:
    # Enough for evidence classification; keep clauses compact and deterministic.
    parts=re.split(r"(?<=[.!?])\s+|\n+|\s+[·•|]\s+",str(text or ""))
    return [norm(x) for x in parts if norm(x)]


def _negated(sentence: str) -> bool:
    low=sentence.casefold()
    return any(x in low for x in NEGATION_PATTERNS)


def feature_claims(text: str) -> list[dict]:
    out=[]
    for sentence in _sentences(text):
        terms=matching_terms(sentence,PAYMENT_TERMS)
        networks=matching_terms(sentence,NETWORK_TERMS)
        if not terms and not networks:
            continue
        if _negated(sentence):
            continue
        out.append({"text":sentence[:700],"terms":_unique(terms,20),"networks":_unique(networks,10)})
    return out[:30]


def extract_payment_identifiers(text: str, evidence_ref: str, scope: str) -> list[dict]:
    text=str(text or ""); out=[]; seen=set()
    for m in IBAN_RE.finditer(text.upper()):
        value=m.group(0)
        # IBAN-like strings are only accepted when nearby context is payment/banking related.
        ctx=norm(text[max(0,m.start()-120):min(len(text),m.end()+120)])
        if not matching_terms(ctx,("iban","bank account","payment account","sepa","swift")):
            continue
        key=("iban",value)
        if key in seen: continue
        seen.add(key); out.append({"type":"iban","value":value,"evidence_ref":evidence_ref,"scope":scope,"context":ctx})
    for m in BIN_RE.finditer(text):
        value=m.group(1); key=("bin",value)
        if key in seen: continue
        seen.add(key); out.append({"type":"bin_iin","value":value,"evidence_ref":evidence_ref,"scope":scope,"context":norm(text[max(0,m.start()-120):min(len(text),m.end()+120)])})
    for m in BIC_RE.finditer(text.upper()):
        value=m.group(1); key=("bic",value)
        if key in seen: continue
        seen.add(key); out.append({"type":"bic_swift","value":value,"evidence_ref":evidence_ref,"scope":scope,"context":norm(text[max(0,m.start()-120):min(len(text),m.end()+120)])})
    return out


def build_payment_queries(label: str, primary_domain: str, distinctive_terms: list[str]) -> list[str]:
    anchors=[]
    for value in distinctive_terms+[label,primary_domain]:
        value=norm(value)
        if value and value.casefold() not in {x.casefold() for x in anchors}:
            anchors.append(value)
    if not anchors: return []
    main=anchors[0]
    second=next((x for x in anchors[1:] if x.casefold()!=primary_domain.casefold()),"")
    extra=f" {second}" if second else ""
    return _unique([
        f'"{main}"{extra} card issuer Visa Mastercard',
        f'"{main}"{extra} banking partner bank issuer',
        f'"{main}"{extra} payment provider processor PSP',
        f'"{main}"{extra} IBAN SEPA SWIFT',
        f'"{main}"{extra} EMI payment institution electronic money',
        f'"{main}"{extra} BIN issuer card',
    ],12)


def search_payment_traces(label: str, primary_domain: str, distinctive_terms: list[str], max_results: int = 12) -> dict:
    queries=build_payment_queries(label,primary_domain,distinctive_terms)
    anchors=[norm(x).casefold() for x in distinctive_terms+[label,primary_domain] if norm(x)]
    results=[]; rejected=[]; errors=[]; seen=set()
    for query in queries:
        rows,errs=search_one(query,per_provider=5); errors.extend(errs)
        for row in rows:
            blob=norm(" ".join([row.get("url",""),row.get("title",""),row.get("snippet","")])).casefold()
            relevant=any(a in blob for a in anchors if len(a)>=4)
            payment=bool(matching_terms(blob,PAYMENT_TERMS+NETWORK_TERMS+INFRASTRUCTURE_TERMS))
            if not (relevant and payment):
                rejected.append(row); continue
            key=str(row.get("url") or "").casefold().rstrip("/")
            if not key or key in seen: continue
            seen.add(key); results.append(row)
            if len(results)>=max_results: break
        if len(results)>=max_results: break
    return {"queries":queries,"results":results,"rejected_results":rejected,"errors":errors}


def analyze_payment_sources(primary_items: list[dict], external_items: list[dict]) -> dict:
    claims=[]; identifiers=[]; networks=[]; infra_terms=[]; payment_terms=[]
    scope_counts={"first_party":0,"external_trace":0}
    first_party_networks=[]; external_networks=[]
    first_party_identifiers=[]; external_identifiers=[]
    for scope,items in (("first_party",primary_items),("external_trace",external_items)):
        for item in items:
            ref=str(item.get("evidence_id") or "")
            text=evidence_text(item)
            rows=feature_claims(text)
            for row in rows:
                claims.append({"evidence_ref":ref,"scope":scope,**row})
                scope_counts[scope]+=1
                payment_terms.extend(row.get("terms") or [])
                networks.extend(row.get("networks") or [])
                if scope=="first_party": first_party_networks.extend(row.get("networks") or [])
                else: external_networks.extend(row.get("networks") or [])
            infra_terms.extend(matching_terms(text,INFRASTRUCTURE_TERMS))
            ids=extract_payment_identifiers(text,ref,scope); identifiers.extend(ids)
            if scope=="first_party": first_party_identifiers.extend(ids)
            else: external_identifiers.extend(ids)
    return {
        "claims":claims,
        "first_party_claim_count":scope_counts["first_party"],
        "external_claim_count":scope_counts["external_trace"],
        "payment_terms":_unique(payment_terms),
        "network_terms":_unique(networks),
        "first_party_networks":_unique(first_party_networks),
        "external_networks":_unique(external_networks),
        "infrastructure_terms":_unique(infra_terms),
        "identifiers":identifiers,
        "first_party_identifiers":first_party_identifiers,
        "external_identifiers":external_identifiers,
        "has_first_party_payment_claim":scope_counts["first_party"]>0,
        "has_external_payment_claim":scope_counts["external_trace"]>0,
        "has_first_party_payment_identifier":bool(first_party_identifiers),
    }
