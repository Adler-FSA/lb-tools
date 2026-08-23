#!/usr/bin/env python3
"""Personen-, Management- und Historien-Rohrecherche.

Dieser Baustein recherchiert natürliche Personen rund um bereits erkannte
Rechtsträger. Er trennt bewusst:
- Person ist mit einem Rechtsträger verbunden,
- Person ist extern mit dem Projekt verbunden,
- Person ist als Eigentümer/UBO belegt,
- Person hat lediglich eine Rolle wie Founder/CEO/Director.

Keine dieser Kategorien wird aus einer anderen abgeleitet. Insbesondere ist
Founder/CEO kein UBO-Nachweis und eine Rechtsträger-Personenspur bestätigt nicht
automatisch eine Verbindung zu KryptoSavings.
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

MAX_RESULTS = 7
MAX_FETCHED_PAGES = 36

ROLE_WORDS = re.compile(
    r"\b(?:co[- ]?founder|founder|chief executive officer|chief operating officer|chief financial officer|"
    r"ceo|coo|cfo|president|director|managing director|owner|shareholder|beneficial owner|ubo|"
    r"geschäftsführer|geschaeftsfuehrer|gründer|gruender|inhaber|eigentümer|eigentuemer|vorstand)\b",
    re.I,
)
OWNER_WORDS = re.compile(r"\b(?:beneficial owner|ubo|ultimate beneficial owner|owner|shareholder|wirtschaftlich berechtigt|eigentümer|eigentuemer)\b", re.I)
HISTORY_WORDS = re.compile(r"\b(?:former|previous|past|formerly|prior|founded|co-founded|worked at|experience|career|history|früher|ehemalig|zuvor|vita|laufbahn)\b", re.I)
ADVERSE_WORDS = re.compile(r"\b(?:warning|warned|sanction|sanctioned|fraud|scam|convicted|indicted|bankrupt|insolven|disqualified|revoked|suspended|warnung|sanktion|verurteilt|insolvenz)\b", re.I)

# Bewusst konservativ: nur 2-4 Wörter, Großbuchstaben/Diakritika, keine Firmenendungen.
PERSON_RE = re.compile(
    r"\b([A-ZÄÖÜÀ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’\-]{1,35}(?:\s+[A-ZÄÖÜÀ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’\-]{1,35}){1,3})\b"
)
ORG_STOP = {
    "Open Delta", "Delta West", "Credit Bank", "Coriolis Bancorp", "Republic Marshall Islands",
    "Marshall Islands", "United Kingdom", "Union Comoros", "Mwali International", "Services Authority",
    "Banque Centrale", "Central Bank", "Privacy Notice", "Terms Use", "Chief Executive Officer",
    "Managing Director", "Board Directors", "Corporate Governance", "Krypto Savings", "KryptoSavings Works",
}
BAD_WORDS = {
    "bank", "bancorp", "llc", "ltd", "limited", "inc", "dao", "company", "corporation", "authority",
    "services", "group", "capital", "protocol", "foundation", "finance", "financial", "credit", "delta",
}


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


def _source_role(url: str, entity: str = "") -> str:
    host = ext.host_of(url)
    if host.endswith("linkedin.com"):
        return "platform"
    if host.endswith("crunchbase.com"):
        return "independent"
    if host.endswith("bloomberg.com") or host.endswith("reuters.com") or host.endswith("forbes.com"):
        return "independent"
    if host.endswith("sec.gov") or host.endswith("fca.org.uk") or host.endswith("bafin.de") or host.endswith("gov.uk"):
        return "regulator"
    compact_entity = ext.compact(re.sub(r"\b(?:DAO\s+LLC|LLC|Ltd\.?|Limited|Inc\.?|PLC|GmbH|AG|S\.?A\.?)\b", " ", entity, flags=re.I))
    compact_host = ext.compact(host.split(".")[0])
    if compact_entity and compact_host and (compact_host in compact_entity or compact_entity.startswith(compact_host)):
        return "entity_owned"
    return "independent"


def _person_ok(name: str) -> bool:
    n = clean(name).strip(" .,:;()[]")
    if len(n) < 5 or len(n) > 90:
        return False
    if n in ORG_STOP:
        return False
    parts = n.split()
    if len(parts) < 2 or len(parts) > 4:
        return False
    if any(ext.compact(p) in BAD_WORDS for p in parts):
        return False
    if all(len(re.sub(r"[^A-Za-zÀ-ÖØ-öø-ÿ]", "", p)) <= 2 for p in parts):
        return False
    return True


def extract_person_candidates(text: str) -> list[str]:
    body = clean(text)
    if not body or not ROLE_WORDS.search(body):
        return []
    out: list[str] = []
    for m in PERSON_RE.finditer(body):
        name = clean(m.group(1))
        if not _person_ok(name):
            continue
        # Nur Kandidaten in engem Rollenkontext akzeptieren.
        start = max(0, m.start() - 120)
        end = min(len(body), m.end() + 120)
        if not ROLE_WORDS.search(body[start:end]):
            continue
        if name.lower() not in {x.lower() for x in out}:
            out.append(name)
    return out[:12]


def _role_near_person(text: str, person: str) -> str:
    body = clean(text)
    idx = body.lower().find(clean(person).lower())
    if idx < 0:
        return ""
    window = body[max(0, idx - 150): idx + len(person) + 180]
    matches = list(ROLE_WORDS.finditer(window))
    if not matches:
        return ""
    return clean(matches[0].group(0))


def _evidence(text: str, person: str, entity: str, width: int = 560) -> str:
    body = clean(text)
    if not body:
        return ""
    low = body.lower()
    for needle in (person, entity):
        idx = low.find(clean(needle).lower()) if clean(needle) else -1
        if idx >= 0:
            return clean(body[max(0, idx - 130): idx + width])[:width]
    return body[:width]


def person_query_plan(entity: str) -> list[str]:
    q = f'"{entity}"'
    return [
        f'{q} founder CEO director owner management',
        f'{q} "beneficial owner" OR shareholder OR UBO',
        f'{q} president OR "managing director" OR executive',
        f'{q} LinkedIn founder CEO director',
    ]


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


def _project_connection(project_name: str, project_domain: str, title: str, snippet: str, text: str) -> tuple[str, str]:
    conf, match = ext.match_confidence(project_name, project_domain, title, snippet, text)
    return ("externally_linked", match) if conf == "high" else (("possible_link", match) if conf == "medium" else ("not_shown", ""))


def _record(person: str, entity: str, page: dict, snippet: str, found_via: str, project_name: str, project_domain: str) -> PersonRecord:
    title = clean(page.get("title") or "")
    text = clean(page.get("text") or snippet)
    combined = clean(" ".join([title, snippet, text]))
    project_conn, project_match = _project_connection(project_name, project_domain, title, snippet, text)
    role = _role_near_person(combined, person)
    evidence = _evidence(combined, person, entity)
    return PersonRecord(
        person_name=person,
        entity=entity,
        claimed_role=role,
        source_url=ext.canonical_url(page.get("url") or ""),
        source_title=title,
        source_role=_source_role(page.get("url") or "", entity),
        evidence=evidence,
        published_at=clean(page.get("published_at") or ""),
        entity_connection="shown" if _has_exact(combined, entity) else "not_shown",
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
    records: list[PersonRecord] = []
    candidates: dict[str, set[str]] = {entity: set() for entity in entities}
    fetched = 0
    seen_hits: set[tuple[str, str]] = set()

    # Stufe 1: Personen nur in Treffern akzeptieren, die den Rechtsträger exakt nennen.
    for entity in entities:
        for query in person_query_plan(entity):
            hits, att = ext.web_search(query, MAX_RESULTS)
            attempts.extend([{**a, "stage": "entity_people", "entity": entity} for a in att])
            for hit in hits:
                url = ext.canonical_url(hit.url)
                key = (entity.lower(), url)
                if not url or key in seen_hits or ext.same_domain(url, project_domain):
                    continue
                seen_hits.add(key)
                page = {"ok": False, "url": url, "title": hit.title, "text": hit.snippet, "published_at": ""}
                if fetched < MAX_FETCHED_PAGES:
                    page = ext.read_public_page(url)
                    fetched += 1
                    if not page.get("ok"):
                        page = {"ok": False, "url": url, "title": hit.title, "text": hit.snippet, "published_at": ""}
                combined = clean(" ".join([page.get("title") or hit.title, hit.snippet, page.get("text") or ""]))
                if not _has_exact(combined, entity):
                    continue
                for person in extract_person_candidates(combined):
                    candidates.setdefault(entity, set()).add(person)
                    records.append(_record(person, entity, page, hit.snippet, f"{hit.provider}: {query}", project_name, project_domain))

    # Stufe 2: Für bereits gefundene Personen Historie und vor allem eine echte Projektverbindung prüfen.
    for entity, names in candidates.items():
        for person in sorted(names):
            for query in person_history_queries(person, entity, project_name, project_domain):
                hits, att = ext.web_search(query, MAX_RESULTS)
                attempts.extend([{**a, "stage": "person_history", "entity": entity, "person": person} for a in att])
                for hit in hits:
                    url = ext.canonical_url(hit.url)
                    key = (person.lower(), url)
                    if not url or key in seen_hits or ext.same_domain(url, project_domain):
                        continue
                    seen_hits.add(key)
                    page = {"ok": False, "url": url, "title": hit.title, "text": hit.snippet, "published_at": ""}
                    if fetched < MAX_FETCHED_PAGES:
                        page = ext.read_public_page(url)
                        fetched += 1
                        if not page.get("ok"):
                            page = {"ok": False, "url": url, "title": hit.title, "text": hit.snippet, "published_at": ""}
                    combined = clean(" ".join([page.get("title") or hit.title, hit.snippet, page.get("text") or ""]))
                    if not _has_exact(combined, person):
                        continue
                    # Historienrecord darf entity-only ODER project-linked sein; Verbindungen werden im Record getrennt.
                    records.append(_record(person, entity, page, hit.snippet, f"{hit.provider}: {query}", project_name, project_domain))

    records = _dedupe(records)
    profiles = []
    for entity in entities:
        entity_records = [r for r in records if r.entity == entity]
        names = sorted({r.person_name for r in entity_records})
        for person in names:
            prs = [r for r in entity_records if r.person_name == person]
            project_linked = [r for r in prs if r.project_connection == "externally_linked"]
            entity_linked = [r for r in prs if r.entity_connection == "shown"]
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
