#!/usr/bin/env python3
"""Personen-, Management- und Historien-Rohrecherche.

Der Baustein recherchiert natürliche Personen rund um bereits erkannte
Rechtsträger. Er trennt bewusst:
- Person ist mit einem Rechtsträger verbunden,
- Person ist extern mit dem Projekt verbunden,
- Person ist als Eigentümer/UBO belegt,
- Person hat lediglich eine Rolle wie Founder/CEO/Director.

Keine Kategorie wird aus einer anderen abgeleitet. Insbesondere ist Founder/CEO
kein UBO-Nachweis und eine Rechtsträger-Personenspur bestätigt nicht automatisch
eine Verbindung zu KryptoSavings.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

MODULE = Path(__file__).resolve().parent / "external_research.py"
spec = importlib.util.spec_from_file_location("external_research", MODULE)
ext = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = ext
spec.loader.exec_module(ext)

MAX_RESULTS = 6
MAX_FETCHED_PAGES = 30

ROLE_PATTERN = (
    r"co[- ]?founder|founder|chief executive officer|chief operating officer|chief financial officer|"
    r"ceo|coo|cfo|president|director|managing director|owner|shareholder|beneficial owner|ubo|"
    r"geschäftsführer|geschaeftsfuehrer|gründer|gruender|inhaber|eigentümer|eigentuemer|vorstand"
)
ROLE_WORDS = re.compile(rf"\b(?:{ROLE_PATTERN})\b", re.I)
OWNER_WORDS = re.compile(r"\b(?:beneficial owner|ubo|ultimate beneficial owner|owner|shareholder|wirtschaftlich berechtigt|eigentümer|eigentuemer)\b", re.I)
HISTORY_WORDS = re.compile(r"\b(?:former|previous|past|formerly|prior|founded|co-founded|worked at|experience|career|history|früher|ehemalig|zuvor|vita|laufbahn)\b", re.I)
ADVERSE_WORDS = re.compile(r"\b(?:warning|warned|sanction|sanctioned|fraud|scam|convicted|indicted|bankrupt|insolven|disqualified|revoked|suspended|warnung|sanktion|verurteilt|insolvenz)\b", re.I)
LEGAL_SUFFIX_RE = re.compile(r"\b(?:DAO\s+LLC|LLC|Ltd\.?|Limited|Inc\.?|PLC|GmbH|AG|S\.?A\.?)\b", re.I)

NAME_TOKEN = r"[A-ZÄÖÜÀ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’\-]{1,35}"
NAME_PATTERN = rf"{NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,3}}"
NAME_BEFORE_ROLE_RE = re.compile(
    rf"\b(?P<name>{NAME_PATTERN})\s*(?:[:,–—-]|\bis\b|\bserves\s+as\b)\s*(?:the\s+|an?\s+)?(?P<role>(?i:{ROLE_PATTERN}))\b"
)
ROLE_BEFORE_NAME_RE = re.compile(
    rf"\b(?P<role>(?i:{ROLE_PATTERN}))\b\s*[:,–—-]?\s+(?P<name>{NAME_PATTERN})\b"
)

ORG_STOP = {
    "Open Delta", "Delta West", "Credit Bank", "Coriolis Bancorp", "Republic Marshall Islands",
    "Marshall Islands", "United Kingdom", "Union Comoros", "Mwali International", "Services Authority",
    "Banque Centrale", "Central Bank", "Privacy Notice", "Terms Use", "Chief Executive Officer",
    "Managing Director", "Board Directors", "Corporate Governance", "Krypto Savings", "KryptoSavings Works",
    "Key People", "Past Role", "Company Details", "Company Profile", "Operating Status", "Legal Name",
    "About Company", "About Us", "See All", "All Employees", "Latest News", "News Media",
}
BAD_WORDS = {
    "bank", "bancorp", "llc", "ltd", "limited", "inc", "dao", "company", "corporation", "authority",
    "services", "group", "capital", "protocol", "foundation", "finance", "financial", "credit", "delta",
    "people", "role", "profile", "details", "status", "legal", "name", "image", "photo", "employees",
}

DIRECT_DIRECTORY_TEMPLATES = ("https://www.crunchbase.com/organization/{slug}",)


@dataclass
class PersonRecord:
    person_name: str
    entity: str
    claimed_role: str
    source_url: str
    source_title: str
    source_role: str
    evidence: str
    published_at: str
    entity_connection: str
    project_connection: str
    project_match: str
    ownership_claim: bool
    history_signal: bool
    adverse_signal: bool
    fetched: bool
    found_via: str


def clean(value: str) -> str:
    return ext.clean_text(value)


def entity_brand_aliases(entity: str) -> list[str]:
    base = clean(LEGAL_SUFFIX_RE.sub(" ", entity)).strip(" .,-")
    values: list[str] = []
    for candidate in (base, re.sub(r"\s+", "", base)):
        candidate = clean(candidate)
        if len(candidate) >= 5 and candidate.lower() not in {x.lower() for x in values}:
            values.append(candidate)
    return values


def _source_role(url: str, entity: str = "") -> str:
    host = ext.host_of(url)
    if host.endswith("linkedin.com"):
        return "platform"
    if host.endswith("crunchbase.com"):
        return "independent"
    if host.endswith(("bloomberg.com", "reuters.com", "forbes.com", "theblock.co", "cbinsights.com")):
        return "independent"
    if host.endswith(("sec.gov", "fca.org.uk", "bafin.de", "gov.uk")):
        return "regulator"
    compact_entity = ext.compact(LEGAL_SUFFIX_RE.sub(" ", entity))
    parts = host.split(".")
    host_label = parts[-2] if len(parts) >= 2 else (parts[0] if parts else "")
    compact_host = ext.compact(host_label)
    if compact_entity and compact_host and (compact_host in compact_entity or compact_entity.startswith(compact_host)):
        return "entity_owned"
    return "independent"


def _person_ok(name: str) -> bool:
    n = clean(name).strip(" .,:;()[]")
    if len(n) < 5 or len(n) > 90 or n in ORG_STOP:
        return False
    parts = n.split()
    if len(parts) < 2 or len(parts) > 4:
        return False
    if any(ext.compact(p) in BAD_WORDS for p in parts):
        return False
    return not all(len(re.sub(r"[^A-Za-zÀ-ÖØ-öø-ÿ]", "", p)) <= 2 for p in parts)


def extract_person_candidates(text: str) -> list[str]:
    body = clean(text)
    if not body or not ROLE_WORDS.search(body):
        return []
    out: list[str] = []
    for rx in (NAME_BEFORE_ROLE_RE, ROLE_BEFORE_NAME_RE):
        for m in rx.finditer(body):
            name = clean(m.group("name")).strip(" .,:;()[]")
            if _person_ok(name) and name.lower() not in {x.lower() for x in out}:
                out.append(name)
    return out[:16]


def _role_near_person(text: str, person: str) -> str:
    body = clean(text)
    idx = body.lower().find(clean(person).lower())
    if idx < 0:
        return ""
    window = body[max(0, idx - 150): idx + len(person) + 180]
    matches = list(ROLE_WORDS.finditer(window))
    return clean(matches[0].group(0)) if matches else ""


def _evidence(text: str, person: str, entity: str, width: int = 620) -> str:
    body = clean(text)
    if not body:
        return ""
    low = body.lower()
    for needle in (person, entity):
        idx = low.find(clean(needle).lower()) if clean(needle) else -1
        if idx >= 0:
            return clean(body[max(0, idx - 140): idx + width])[:width]
    return body[:width]


def people_search(query: str, limit: int = MAX_RESULTS) -> tuple[list, list[dict]]:
    """Personensuche: Provider werden kombiniert statt beim ersten Treffer beendet."""
    attempts: list[dict] = []
    out = []
    seen: set[str] = set()
    providers = (
        ("bing", ext.search_bing),
        ("duckduckgo", ext.search_duckduckgo),
        ("bing-rss", ext.search_bing_rss),
    )
    for provider, fn in providers:
        hits = fn(query, limit)
        attempts.append({"query": query, "provider": provider, "results": len(hits)})
        for hit in hits:
            url = ext.canonical_url(hit.url)
            if not url or url in seen:
                continue
            seen.add(url)
            out.append(hit)
    return out[: max(limit * 2, limit)], attempts


def person_query_plan(entity: str, trusted_hosts: list[str]) -> list[str]:
    q = f'"{entity}"'
    queries = [
        f'{q} founder CEO director owner management',
        f'{q} "beneficial owner" OR shareholder OR UBO',
        f'{q} president OR "managing director" OR executive',
    ]
    for alias in entity_brand_aliases(entity):
        aq = f'"{alias}"'
        queries.extend([
            f'{aq} founder CEO director',
            f'{aq} co-founder CEO',
            f'site:crunchbase.com/organization {aq} founder CEO',
        ])
        for host in trusted_hosts:
            queries.append(f'site:blog.{host} {aq} founder CEO')
    return list(dict.fromkeys(queries))


def person_history_queries(person: str, entity: str, project_name: str, project_domain: str) -> list[str]:
    p = f'"{person}"'
    return [
        f'{p} "{entity}"',
        f'{p} "{project_name}"',
        f'{p} "{project_domain}"',
        f'{p} founder CEO director owner history',
        f'{p} warning sanction fraud bankruptcy',
    ]


def _has_exact(text: str, value: str) -> bool:
    return bool(clean(value) and clean(value).lower() in clean(text).lower())


def _has_brand(text: str, entity: str) -> bool:
    hay = clean(text).lower()
    return any(alias.lower() in hay for alias in entity_brand_aliases(entity))


def _trusted_hosts_for_entity(operator_block: dict, entity: str) -> list[str]:
    hosts: list[str] = []
    for profile in operator_block.get("profiles") or []:
        if clean(profile.get("entity") or "").lower() != clean(entity).lower():
            continue
        for record in profile.get("entity_owned_records") or []:
            host = ext.host_of(record.get("source_url") or "")
            if not host:
                continue
            parts = host.split(".")
            root = ".".join(parts[-2:]) if len(parts) >= 2 else host
            if root and root not in hosts:
                hosts.append(root)
    return hosts


def _host_is_trusted(url: str, trusted_hosts: list[str]) -> bool:
    host = ext.host_of(url)
    return any(host == root or host.endswith("." + root) for root in trusted_hosts)


def _brand_bridge_ok(text: str, entity: str, trusted_hosts: list[str]) -> bool:
    """Markenfund wird nur verwendet, wenn Entity↔Brand bereits über eigene Domain gestützt ist."""
    return bool(trusted_hosts) and _has_brand(text, entity)


def _project_connection(project_name: str, project_domain: str, title: str, snippet: str, text: str) -> tuple[str, str]:
    conf, match = ext.match_confidence(project_name, project_domain, title, snippet, text)
    return ("externally_linked", match) if conf == "high" else (("possible_link", match) if conf == "medium" else ("not_shown", ""))


def _record(person: str, entity: str, page: dict, snippet: str, found_via: str, project_name: str, project_domain: str, entity_connection_hint: str = "") -> PersonRecord:
    title = clean(page.get("title") or "")
    text = clean(page.get("text") or snippet)
    combined = clean(" ".join([title, snippet, text]))
    project_conn, project_match = _project_connection(project_name, project_domain, title, snippet, text)
    role = _role_near_person(combined, person)
    evidence = _evidence(combined, person, entity)
    entity_connection = "shown" if _has_exact(combined, entity) else (entity_connection_hint or "not_shown")
    return PersonRecord(
        person_name=person,
        entity=entity,
        claimed_role=role,
        source_url=ext.canonical_url(page.get("url") or ""),
        source_title=title,
        source_role=_source_role(page.get("url") or "", entity),
        evidence=evidence,
        published_at=clean(page.get("published_at") or ""),
        entity_connection=entity_connection,
        project_connection=project_conn,
        project_match=project_match,
        ownership_claim=bool(OWNER_WORDS.search(evidence)),
        history_signal=bool(HISTORY_WORDS.search(evidence)),
        adverse_signal=bool(ADVERSE_WORDS.search(evidence)),
        fetched=bool(page.get("ok")),
        found_via=found_via,
    )


def _dedupe(records: list[PersonRecord]) -> list[PersonRecord]:
    rank = {"regulator": 5, "government": 5, "independent": 4, "entity_owned": 3, "platform": 2, "project_owned": 1}
    by: dict[tuple[str, str, str], PersonRecord] = {}
    for rec in records:
        key = (rec.person_name.lower(), rec.entity.lower(), ext.canonical_url(rec.source_url))
        cur = by.get(key)
        if cur is None or (rank.get(rec.source_role, 0), rec.fetched) > (rank.get(cur.source_role, 0), cur.fetched):
            by[key] = rec
    return sorted(by.values(), key=lambda r: (r.person_name.lower(), -rank.get(r.source_role, 0), r.source_url))


def _directory_probe_urls(entity: str) -> list[str]:
    aliases = entity_brand_aliases(entity)
    if not aliases:
        return []
    compact_slug = re.sub(r"[^a-z0-9]+", "", aliases[-1].lower())
    return [template.format(slug=compact_slug) for template in DIRECT_DIRECTORY_TEMPLATES if len(compact_slug) >= 5]


def _trusted_page_probe_urls(trusted_hosts: list[str]) -> list[str]:
    urls: list[str] = []
    for root in trusted_hosts:
        urls.extend([f"https://{root}/", f"https://blog.{root}/", f"https://blog.{root}/archive/"])
    return list(dict.fromkeys(urls))


def enrich(data: dict) -> dict:
    result = json.loads(json.dumps(data))
    ctx = result.get("context") or {}
    op = result.get("operator_registry_research") or {}
    project_name = clean(ctx.get("project_name") or ctx.get("input") or "")
    project_domain = clean(ctx.get("domain") or "")
    entities = [clean(p.get("entity") or "") for p in op.get("profiles") or [] if clean(p.get("entity") or "")]
    if not entities:
        entities = [clean(x) for x in (result.get("analysis") or {}).get("legal_entities") or [] if clean(x)]

    attempts: list[dict] = []
    direct_probes: list[dict] = []
    records: list[PersonRecord] = []
    candidates: dict[str, set[str]] = {entity: set() for entity in entities}
    fetched = 0
    seen_hits: set[tuple[str, str]] = set()

    # Stufe 0: wenige deterministische Probes auf bereits gestützten Entity-Domains/Verzeichnissen.
    for entity in entities:
        trusted_hosts = _trusted_hosts_for_entity(op, entity)
        for url in _trusted_page_probe_urls(trusted_hosts) + _directory_probe_urls(entity):
            if fetched >= MAX_FETCHED_PAGES:
                break
            canonical = ext.canonical_url(url)
            key = (entity.lower(), canonical)
            if not canonical or key in seen_hits or ext.same_domain(canonical, project_domain):
                continue
            seen_hits.add(key)
            page = ext.read_public_page(canonical)
            fetched += 1
            combined = clean(" ".join([page.get("title") or "", page.get("text") or ""])) if page.get("ok") else ""
            exact_entity = _has_exact(combined, entity)
            brand_bridge = _brand_bridge_ok(combined, entity, trusted_hosts)
            people = extract_person_candidates(combined) if (exact_entity or brand_bridge) else []
            direct_probes.append({"entity": entity, "url": canonical, "ok": bool(page.get("ok")), "mode": page.get("mode"), "exact_entity": exact_entity, "brand_bridge": brand_bridge, "people": people})
            if not exact_entity and not brand_bridge:
                continue
            hint = "brand_shown" if brand_bridge and not exact_entity else ""
            for person in people:
                candidates.setdefault(entity, set()).add(person)
                records.append(_record(person, entity, page, "", f"direct-people-probe: {canonical}", project_name, project_domain, hint))

    # Stufe 1: Multi-Provider-Suche, aber Seiten erst nach Snippet-Vorfilter laden.
    for entity in entities:
        trusted_hosts = _trusted_hosts_for_entity(op, entity)
        for query in person_query_plan(entity, trusted_hosts):
            hits, att = people_search(query, MAX_RESULTS)
            attempts.extend([{**a, "stage": "entity_people", "entity": entity} for a in att])
            for hit in hits:
                url = ext.canonical_url(hit.url)
                key = (entity.lower(), url)
                if not url or key in seen_hits or ext.same_domain(url, project_domain):
                    continue
                pre = clean(" ".join([hit.title, hit.snippet]))
                pre_exact = _has_exact(pre, entity)
                pre_brand = _brand_bridge_ok(pre, entity, trusted_hosts)
                if not pre_exact and not pre_brand:
                    continue
                seen_hits.add(key)
                page = {"ok": False, "url": url, "title": hit.title, "text": hit.snippet, "published_at": "", "mode": "search-snippet"}
                if fetched < MAX_FETCHED_PAGES:
                    fetched_page = ext.read_public_page(url)
                    fetched += 1
                    if fetched_page.get("ok"):
                        page = fetched_page
                combined = clean(" ".join([page.get("title") or hit.title, hit.snippet, page.get("text") or ""]))
                exact_entity = _has_exact(combined, entity)
                brand_bridge = _brand_bridge_ok(combined, entity, trusted_hosts)
                if not exact_entity and not brand_bridge:
                    continue
                hint = "brand_shown" if brand_bridge and not exact_entity else ""
                for person in extract_person_candidates(combined):
                    candidates.setdefault(entity, set()).add(person)
                    records.append(_record(person, entity, page, hit.snippet, f"{hit.provider}: {query}", project_name, project_domain, hint))

    # Stufe 2: Gefundene Personen – Historie und echte Projektverbindung separat prüfen.
    for entity, names in candidates.items():
        for person in sorted(names):
            for query in person_history_queries(person, entity, project_name, project_domain):
                hits, att = people_search(query, MAX_RESULTS)
                attempts.extend([{**a, "stage": "person_history", "entity": entity, "person": person} for a in att])
                for hit in hits:
                    url = ext.canonical_url(hit.url)
                    key = (person.lower(), url)
                    if not url or key in seen_hits or ext.same_domain(url, project_domain):
                        continue
                    pre = clean(" ".join([hit.title, hit.snippet]))
                    if not _has_exact(pre, person):
                        continue
                    seen_hits.add(key)
                    page = {"ok": False, "url": url, "title": hit.title, "text": hit.snippet, "published_at": "", "mode": "search-snippet"}
                    if fetched < MAX_FETCHED_PAGES:
                        fetched_page = ext.read_public_page(url)
                        fetched += 1
                        if fetched_page.get("ok"):
                            page = fetched_page
                    combined = clean(" ".join([page.get("title") or hit.title, hit.snippet, page.get("text") or ""]))
                    if _has_exact(combined, person):
                        records.append(_record(person, entity, page, hit.snippet, f"{hit.provider}: {query}", project_name, project_domain))

    records = _dedupe(records)
    profiles = []
    for entity in entities:
        entity_records = [r for r in records if r.entity == entity]
        for person in sorted({r.person_name for r in entity_records}):
            prs = [r for r in entity_records if r.person_name == person]
            project_linked = [r for r in prs if r.project_connection == "externally_linked"]
            entity_linked = [r for r in prs if r.entity_connection in {"shown", "brand_shown"}]
            owner_records = [r for r in prs if r.ownership_claim]
            adverse = [r for r in prs if r.adverse_signal]
            history = [r for r in prs if r.history_signal]
            profiles.append({
                "person_name": person,
                "entity": entity,
                "entity_connection_status": "externally_shown" if entity_linked else "not_shown",
                "project_connection_status": "externally_linked" if project_linked else "not_independently_linked",
                "ownership_status": "ownership_claim_found" if owner_records else "not_verified",
                "ubo_verified": False,
                "roles": sorted({clean(r.claimed_role) for r in prs if clean(r.claimed_role)}),
                "history_record_count": len(history),
                "adverse_record_count": len(adverse),
                "records": [asdict(r) for r in prs],
            })

    project_people = [p for p in profiles if p["project_connection_status"] == "externally_linked"]
    ubo_claims = [p for p in profiles if p["ownership_status"] == "ownership_claim_found"]
    result["people_history_research"] = {
        "status": "ok" if profiles else "no_people_confirmed",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "principle": "Eine Personenspur zu einem Rechtsträger ist keine Projektverbindung. Founder/CEO/Director ist kein UBO-Nachweis. UBO wird nur mit belastbarer Eigentümerquelle bestätigt.",
        "project_name": project_name,
        "project_domain": project_domain,
        "entities_checked": entities,
        "entity_brand_aliases": {entity: entity_brand_aliases(entity) for entity in entities},
        "trusted_entity_hosts": {entity: _trusted_hosts_for_entity(op, entity) for entity in entities},
        "direct_probes": direct_probes,
        "search_attempts": attempts,
        "profiles": profiles,
        "records": [asdict(r) for r in records],
        "summary": {
            "person_profile_count": len(profiles),
            "project_linked_person_count": len(project_people),
            "ownership_claim_profile_count": len(ubo_claims),
            "verified_ubo_count": 0,
            "adverse_record_count": sum(int(p["adverse_record_count"]) for p in profiles),
        },
        "guardrails": {
            "entity_person_implies_project_person": False,
            "founder_or_ceo_implies_ubo": False,
            "ubo_without_ownership_source": False,
        },
    }
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="Akademie Research Engine · Personen/Management/Historie")
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    source = json.loads(Path(args.input).read_text(encoding="utf-8"))
    out = enrich(source)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
