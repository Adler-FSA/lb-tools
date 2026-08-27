#!/usr/bin/env python3
from __future__ import annotations

import math
import re
from urllib.parse import urlparse

PERIODS = {
    "hourly": {"tokens": ["hourly", "per hour", "pro stunde", "stündlich"], "periods_per_year": 24 * 365},
    "daily": {"tokens": ["daily", "per day", "pro tag", "täglich", "taeglich"], "periods_per_year": 365},
    "weekly": {"tokens": ["weekly", "per week", "pro woche", "wöchentlich", "woechentlich"], "periods_per_year": 52},
    "monthly": {"tokens": ["monthly", "per month", "pro monat", "monatlich"], "periods_per_year": 12},
    "yearly": {"tokens": ["yearly", "annually", "annual", "per year", "pro jahr", "jährlich", "jaehrlich", "apy", "apr"], "periods_per_year": 1},
}

RETURN_TERMS = [
    "return", "returns", "rendite", "yield", "apy", "apr", "dividend", "dividends", "dividende", "dividenden",
    "profit", "profits", "ertrag", "erträge", "earn dividends", "cashback", "reward", "rewards", "interest", "roi",
    "earn", "earning", "payout",
]
REVENUE_TERMS = [
    "revenue", "revenues", "umsatz", "income source", "ertragsquelle", "einnahmequelle", "business model",
    "fees", "fee revenue", "sales revenue", "subscription revenue", "trading profit", "staking yield",
    "lending yield", "interest income", "treasury income",
]
MONEY_FLOW_TERMS = [
    "wallet", "payment", "payments", "package purchase", "package purchases", "blockchain transaction", "blockchain transactions",
    "deposit", "deposits", "funds", "treasury", "custody", "account", "distribution event", "distribution events", "withdraw", "withdrawal",
]
PAYOUT_TERMS = [
    "payout", "payouts", "withdraw", "withdrawal", "distribution", "distribution event", "distribution events", "dividend", "dividends",
    "refund", "repayment", "vesting", "lock", "bonus", "guarantee", "guaranteed",
]
GROWTH_TERMS = [
    "referral", "referrals", "affiliate", "ambassador", "invite", "invites", "network", "new members", "new users", "growth", "membership packages",
]
TRADING_TERMS = [
    "trading", "trade", "broker", "exchange", "arbitrage", "leverage", "drawdown", "track record", "performance history", "trading strategy",
]


def norm(value: str) -> str:
    return " ".join(str(value or "").replace("\u00a0", " ").split()).strip()


def host(url: str) -> str:
    h = (urlparse(str(url or "")).hostname or "").lower().strip(".")
    return h[4:] if h.startswith("www.") else h


def related_host(value: str, roots: set[str]) -> bool:
    h = host(value)
    return any(h == r or h.endswith("." + r) or r.endswith("." + h) for r in roots if r)


def unique(values, limit: int = 20):
    out=[]; seen=set()
    for raw in values:
        value=norm(raw)
        key=value.casefold()
        if value and key not in seen:
            seen.add(key); out.append(value)
        if len(out)>=limit:
            break
    return out


def evidence_text(item: dict) -> str:
    return norm(" ".join([
        str(item.get("title") or ""), str(item.get("h1") or ""), str(item.get("meta_description") or ""),
        str(item.get("text_excerpt") or ""), str(item.get("search_title") or ""), str(item.get("search_snippet") or ""),
    ]))


def period_from_context(context: str) -> tuple[str | None, int | None]:
    blob=context.casefold()
    for name, meta in PERIODS.items():
        if any(token in blob for token in meta["tokens"]):
            return name, int(meta["periods_per_year"])
    return None, None


def decimal_number(raw: str) -> float | None:
    raw=str(raw or "").strip().replace(" ", "")
    if not raw:
        return None
    if "," in raw and "." in raw:
        if raw.rfind(",") > raw.rfind("."):
            raw=raw.replace(".", "").replace(",", ".")
        else:
            raw=raw.replace(",", "")
    elif "," in raw:
        raw=raw.replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def percent_claims(text: str, evidence_id: str, scope: str) -> list[dict]:
    out=[]
    for match in re.finditer(r"(?<!\d)(\d{1,4}(?:[.,]\d{1,4})?)\s*%", text):
        rate=decimal_number(match.group(1))
        if rate is None:
            continue
        lo=max(0,match.start()-180); hi=min(len(text),match.end()+180)
        context=norm(text[lo:hi])
        blob=context.casefold()
        if not any(term in blob for term in RETURN_TERMS):
            continue
        period, periods=period_from_context(context)
        item={
            "evidence_ref": evidence_id,
            "scope": scope,
            "rate_percent": rate,
            "period": period,
            "context": context,
            "simple_annual_percent": None,
            "compound_annual_multiple": None,
            "calculation_note": "",
        }
        if period and periods:
            item["simple_annual_percent"]=round(rate * periods, 6)
            periodic=rate/100.0
            if periodic > -1 and periods <= 8760:
                try:
                    multiple=(1.0+periodic)**periods
                    if math.isfinite(multiple):
                        item["compound_annual_multiple"]=round(multiple, 6) if multiple < 1e12 else ">1e12"
                except (OverflowError, ValueError):
                    item["compound_annual_multiple"]="overflow"
            item["calculation_note"]="Mathematische Hochrechnung der genannten Rate; keine Prognose und kein Nachweis, dass diese Rate tatsächlich erzielt oder ausgezahlt wird."
        out.append(item)
    return out[:20]


def implied_claim_rate(claim: str) -> dict | None:
    text=norm(claim)
    if not text:
        return None
    period, periods=period_from_context(text)
    if not period or not periods:
        return None
    money_pattern=r"(\d{1,9}(?:[.,]\d{1,4})?)\s*(?:€|eur|euro|\$|usd|usdt)"
    amounts=[decimal_number(x) for x in re.findall(money_pattern, text, flags=re.I)]
    amounts=[x for x in amounts if x is not None and x > 0]
    if len(amounts) < 2:
        return None
    principal=max(amounts[0], amounts[1])
    payout=min(amounts[0], amounts[1])
    if payout >= principal:
        return None
    rate=(payout/principal)*100.0
    result={
        "source":"customer_supplied_claim",
        "principal":principal,
        "periodic_amount":payout,
        "period":period,
        "implied_periodic_rate_percent":round(rate,6),
        "simple_annual_percent":round(rate*periods,6),
        "compound_annual_multiple":None,
        "note":"Nur mathematische Einordnung der vom Auftraggeber übermittelten Behauptung; kein Projektbeleg und keine Prognose.",
    }
    try:
        multiple=(1+rate/100.0)**periods
        result["compound_annual_multiple"]=round(multiple,6) if math.isfinite(multiple) and multiple < 1e12 else ">1e12"
    except (OverflowError, ValueError):
        result["compound_annual_multiple"]="overflow"
    return result


def _matching_refs(items: list[dict], terms: list[str]) -> list[str]:
    refs=[]
    for item in items:
        blob=evidence_text(item).casefold()
        if any(term.casefold() in blob for term in terms):
            ref=str(item.get("evidence_id") or "")
            if ref:
                refs.append(ref)
    return unique(refs,20)


def _fallback_project_hosts(primary: dict, discovery: dict) -> set[str]:
    label=norm(discovery.get("identity_label") or "").casefold()
    hosts=set()
    if label:
        for item in primary.get("items") or []:
            header=norm(" ".join([str(item.get("title") or ""),str(item.get("h1") or ""),str(item.get("og_site_name") or "")])).casefold()
            if label in header:
                h=host(item.get("final_url") or item.get("requested_url") or "")
                if h:
                    hosts.add(h)
    if hosts:
        return hosts
    for round_ in discovery.get("crawl_rounds") or []:
        if int(round_.get("depth") or 0)==1:
            urls=round_.get("urls") or []
            if urls:
                h=host(urls[0])
                if h:
                    hosts.add(h)
            break
    return hosts


def analyze_economics(*, primary: dict, independent: dict, discovery: dict, intake: dict) -> dict:
    project_hosts={str(x).lower().removeprefix("www.") for x in discovery.get("project_hosts") or [] if x}
    if not project_hosts:
        project_hosts=_fallback_project_hosts(primary,discovery)
    trusted_first_round=set()
    for round_ in discovery.get("crawl_rounds") or []:
        if int(round_.get("depth") or 0)==1:
            trusted_first_round.update(str(x).split("#",1)[0].rstrip("/") for x in round_.get("urls") or [])

    project_items=[]
    for item in primary.get("items") or []:
        url=str(item.get("final_url") or item.get("requested_url") or "")
        canon=url.split("#",1)[0].rstrip("/")
        if related_host(url,project_hosts) or canon in trusted_first_round:
            project_items.append(item)

    external_items=[x for x in (independent.get("items") or []) if not x.get("error")]
    first_party_rates=[]
    for item in project_items:
        first_party_rates.extend(percent_claims(evidence_text(item),str(item.get("evidence_id") or ""),"first_party"))
    external_rates=[]
    for item in external_items:
        external_rates.extend(percent_claims(evidence_text(item),str(item.get("evidence_id") or ""),"external_trace"))

    first_party_blob="\n".join(evidence_text(x) for x in project_items).casefold()
    return_language=sorted({term for term in RETURN_TERMS if term in first_party_blob})
    revenue_language=sorted({term for term in REVENUE_TERMS if term in first_party_blob})
    money_flow_language=sorted({term for term in MONEY_FLOW_TERMS if term in first_party_blob})
    payout_language=sorted({term for term in PAYOUT_TERMS if term in first_party_blob})
    growth_language=sorted({term for term in GROWTH_TERMS if term in first_party_blob})
    trading_language=sorted({term for term in TRADING_TERMS if term in first_party_blob})

    external_blob="\n".join(evidence_text(x) for x in external_items).casefold()
    external_return_language=sorted({term for term in RETURN_TERMS + TRADING_TERMS + REVENUE_TERMS if term in external_blob})

    package_purchase_self_wallet=("package purchases are completed via blockchain transactions from your own wallet" in first_party_blob)
    bank_credentials_not_collected=("we do not collect or store" in first_party_blob and "bank account credentials" in first_party_blob)
    onchain_distribution=("distribution events" in first_party_blob and "public blockchain" in first_party_blob)

    rate_refs=unique([x["evidence_ref"] for x in first_party_rates],20)
    result={
        "project_hosts_used":sorted(project_hosts),
        "first_party_item_count":len(project_items),
        "external_item_count":len(external_items),
        "return_language":return_language,
        "revenue_source_language":revenue_language,
        "money_flow_language":money_flow_language,
        "payout_language":payout_language,
        "growth_language":growth_language,
        "trading_language":trading_language,
        "external_economic_language":external_return_language,
        "first_party_percent_claims":first_party_rates,
        "external_percent_claims":external_rates,
        "customer_claim_math":implied_claim_rate(str(intake.get("claim") or "")),
        "facts":{
            "package_purchase_from_own_wallet_claimed":package_purchase_self_wallet,
            "bank_account_credentials_not_collected_claimed":bank_credentials_not_collected,
            "onchain_distribution_events_claimed":onchain_distribution,
        },
        "refs":{
            "money_flow":_matching_refs(project_items,MONEY_FLOW_TERMS),
            "returns":unique(_matching_refs(project_items,RETURN_TERMS)+rate_refs,20),
            "revenue_source":_matching_refs(project_items,REVENUE_TERMS),
            "growth":_matching_refs(project_items,GROWTH_TERMS),
            "payout":_matching_refs(project_items,PAYOUT_TERMS),
            "trading":_matching_refs(project_items,TRADING_TERMS),
            "external":_matching_refs(external_items,RETURN_TERMS+REVENUE_TERMS+TRADING_TERMS),
        },
    }
    return result
