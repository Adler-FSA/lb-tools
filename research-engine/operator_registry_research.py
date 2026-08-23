#!/usr/bin/env python3
"""Betreiber-, Register- und Behörden-Rohrecherche.

Der Baustein prüft Rechtsträger, die in der Projektwebsite genannt werden,
außerhalb der Projektwebsite. Er trennt ausdrücklich:
- Existenz-/Registerspur eines Rechtsträgers,
- regulatorische oder lizenzbezogene Aussagen,
- eigene Aussagen des Rechtsträgers,
- unabhängige Hinweise,
- und die Frage, ob eine externe Quelle die Verbindung zum Projekt bestätigt.

Keine Gesamtbewertung, kein Betrugs- oder Seriositätsurteil.
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

MAX_ENTITY_RESULTS = 8
MAX_FETCHED_PAGES = 42

AUTHORITY_HOSTS = {
    "bafin.de": "regulator",
    "fca.org.uk": "regulator",
    "sec.gov": "regulator",
    "finra.org": "regulator",
    "esma.europa.eu": "regulator",
    "eba.europa.eu": "regulator",
    "europa.eu": "government",
    "gov.uk": "government",
}

CLAIMED_AUTHORITY_HOSTS = {
    "mwaliregistrar.info",
    "mwaliregistrar.net",
    "mwaliregistrar.com",
}

WARNING_WORDS = re.compile(
    r"\b(?:warning|warned|unauthori[sz]ed|unlicensed|suspended|revoked|clone|scam|fraud|"
    r"warnung|unerlaubt|nicht zugelassen|lizenz entzogen|suspendiert)\b",
    re.I,
)
LICENSE_WORDS = re.compile(
    r"\b(?:licen[cs]e|licen[cs]ed|registration|registered|register|authori[sz]ed|regulated|"
    r"banking company|banking licence|banking license|lizenz|registriert|zugelassen|reguliert)\b",
    re.I,
)
ACTIVE_WORDS = re.compile(r"\b(?:active|valid|authori[sz]ed|licensed|registered|aktiv|gültig)\b", re.I)
INACTIVE_WORDS = re.compile(r"\b(?:suspended|revoked|inactive|expired|cancelled|dissolved|suspendiert|widerrufen|inaktiv|abgelaufen)\b", re.I)
LICENSE_NO_RE = re.compile(r"\b(?:licen[cs]e\s*(?:no\.?|number)?|registration\s*(?:no\.?|number)?|reg\.?\s*no\.?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{4,30})", re.I)

# Die Website-Engine erkennt klassische Rechtsformen. Banknamen wie "... Bancorp"
# können aber echte Betreiberhinweise sein. Solche Kandidaten werden hier aus den
# bereits gespeicherten Beleg-Snippets nachgezogen und anschließend extern geprüft.
# Bewusst case-sensitiv am Namensanfang, damit normale Wörter vor dem Eigennamen
# nicht in den Rechtsträger hineingezogen werden.
BANCORP_ENTITY_RE = re.compile(r"\b([A-Z][A-Za-z0-9&.'’\- ]{1,70}\s+Bancorp)\b")


@dataclass
class EntityRecord:
    entity: str
    source_role: str
    source_url: str
    title: str
    evidence: str
    published_at: str
    record_type: str
    status_text: str
    license_number: str
    project_connection: str
    project_match: str
    authority_confidence: str
    fetched: bool
    found_via: str


def clean(value: str) -> str:
    return ext.clean_text(value)


def host_of(url: str) -> str:
    return ext.host_of(url)


def same_domain(url: str, domain: str) -> bool:
    return ext.same_domain(url, domain)


def derived_entities_from_evidence(analysis: dict) -> list[str]:
    out: list[str] = []
    for finding in analysis.get("findings") or []:
        text = clean(finding.get("evidence") or "")
        for m in BANCORP_ENTITY_RE.finditer(text):
            value = clean(m.group(1)).strip(" .,:;-")
            words = value.split()
            if len(words) > 4:
                value = " ".join(words[-4:])
            if len(value) >= 8 and value.lower() not in {x.lower() for x in out}:
                out.append(value)
    return out


def source_role(url: str, entity: str, title: str, text: str) -> tuple[str, str]:
    host = host_of(url)
    for suffix, role in AUTHORITY_HOSTS.items():
        if host == suffix or host.endswith("." + suffix):
            return role, "high"
    if host in CLAIMED_AUTHORITY_HOSTS or any(host.endswith("." + h) for h in CLAIMED_AUTHORITY_HOSTS):
        return "claimed_regulator_or_registry", "medium"

    hay = clean(" ".join([title, text[:5000]])).lower()
    entity_compact = ext.compact(entity)
    host_compact = ext.compact(host.split(".")[0])
    if entity_compact and host_compact and (entity_compact.startswith(host_compact) or host_compact in entity_compact):
        return "entity_owned", "medium"
    if "privacy" in hay or "terms of use" in hay or "contact" in hay:
        if ext.compact(entity.split()[0]) in ext.compact(host):
            return "entity_owned", "medium"
    return "independent", "low"


def exact_entity_present(entity: str, title: str, snippet: str, text: str) -> bool:
    hay = clean(" ".join([title, snippet, text[:12000]])).lower()
    return bool(entity and clean(entity).lower() in hay)


def project_connection(project_name: str, project_domain: str, title: str, snippet: str, text: str) -> tuple[str, str]:
    confidence, match = ext.match_confidence(project_name, project_domain, title, snippet, text)
    if confidence == "high":
        return "externally_linked", match
    if confidence == "medium":
        return "possible_link", match
    return "not_shown", ""


def classify_record(title: str, text: str) -> str:
    hay = clean(" ".join([title, text[:12000]]))
    if WARNING_WORDS.search(hay):
        return "warning_or_adverse_notice"
    if LICENSE_WORDS.search(hay):
        return "registry_or_license_record"
    return "entity_trace"


def extract_status(text: str) -> str:
    hay = clean(text)
    m = re.search(r"\bStatus\s*[:\-]?\s*(Active|Inactive|Suspended|Revoked|Valid|Expired|Cancelled)\b", hay, re.I)
    if m:
        return clean(m.group(1))
    if INACTIVE_WORDS.search(hay[:5000]):
        return "inactive_or_restricted_mentioned"
    if ACTIVE_WORDS.search(hay[:5000]):
        return "active_or_registered_mentioned"
    return ""


def extract_license_number(text: str) -> str:
    m = LICENSE_NO_RE.search(clean(text))
    return clean(m.group(1)) if m else ""


def evidence(text: str, entity: str, project_name: str, fallback: str, width: int = 430) -> str:
    body = clean(text)
    if not body:
        return clean(fallback)[:width]
    low = body.lower()
    for needle in (entity, project_name):
        needle = clean(needle)
        idx = low.find(needle.lower()) if needle else -1
        if idx >= 0:
            start = max(0, idx - 120)
            return clean(body[start:start + width])[:width]
    return clean(fallback or body[:width])[:width]


def entity_query_plan(entity: str, project_name: str, project_domain: str) -> list[str]:
    q = f'"{entity}"'
    return [
        q,
        f'{q} register OR registry OR license OR licence OR regulator',
        f'{q} warning OR unauthorized OR unlicensed OR suspended OR revoked',
        f'{q} "{project_name}"',
        f'{q} "{project_domain}"',
    ]


def _rank_role(role: str) -> int:
    return {
        "regulator": 5,
        "government": 5,
        "claimed_regulator_or_registry": 4,
        "entity_owned": 3,
        "independent": 2,
    }.get(role, 0)


def enrich(data: dict) -> dict:
    result = json.loads(json.dumps(data))
    ctx = result.get("context") or {}
    analysis = result.get("analysis") or {}
    project_name = clean(ctx.get("project_name") or ctx.get("input") or "")
    project_domain = clean(ctx.get("domain") or "")

    original_entities = [clean(x) for x in (analysis.get("legal_entities") or []) if clean(x)]
    entities = list(original_entities)
    for candidate in derived_entities_from_evidence(analysis):
        if candidate.lower() not in {x.lower() for x in entities}:
            entities.append(candidate)

    records: list[EntityRecord] = []
    attempts: list[dict] = []
    fetched = 0
    seen: set[tuple[str, str]] = set()

    for entity in entities:
        for query in entity_query_plan(entity, project_name, project_domain):
            hits, att = ext.web_search(query, MAX_ENTITY_RESULTS)
            attempts.extend([{**a, "entity": entity} for a in att])
            for hit in hits:
                url = ext.canonical_url(hit.url)
                key = (entity.lower(), url)
                if not url or key in seen or same_domain(url, project_domain):
                    continue
                seen.add(key)

                page = {"ok": False, "url": url, "title": "", "text": "", "published_at": ""}
                if fetched < MAX_FETCHED_PAGES:
                    page = ext.read_public_page(url)
                    fetched += 1

                title = clean(page.get("title") or hit.title)
                text = page.get("text") or ""
                if not exact_entity_present(entity, title, hit.snippet, text):
                    continue

                role, authority = source_role(page.get("url") or url, entity, title, text)
                conn, match = project_connection(project_name, project_domain, title, hit.snippet, text)
                rec_type = classify_record(title, text or hit.snippet)
                body = text or hit.snippet

                records.append(EntityRecord(
                    entity=entity,
                    source_role=role,
                    source_url=page.get("url") or url,
                    title=title,
                    evidence=evidence(body, entity, project_name, hit.snippet),
                    published_at=clean(page.get("published_at") or ""),
                    record_type=rec_type,
                    status_text=extract_status(body),
                    license_number=extract_license_number(body),
                    project_connection=conn,
                    project_match=match,
                    authority_confidence=authority,
                    fetched=bool(page.get("ok")),
                    found_via=f"{hit.provider}: {query}",
                ))

    dedup: dict[tuple[str, str], EntityRecord] = {}
    for rec in records:
        key = (rec.entity.lower(), ext.canonical_url(rec.source_url))
        cur = dedup.get(key)
        if cur is None or (_rank_role(rec.source_role), rec.fetched) > (_rank_role(cur.source_role), cur.fetched):
            dedup[key] = rec
    records = list(dedup.values())

    profiles = []
    for entity in entities:
        ers = [r for r in records if r.entity == entity]
        official = [r for r in ers if r.source_role in {"regulator", "government", "claimed_regulator_or_registry"}]
        self_sources = [r for r in ers if r.source_role == "entity_owned"]
        independent = [r for r in ers if r.source_role == "independent"]
        linked = [r for r in ers if r.project_connection == "externally_linked"]
        warnings = [r for r in ers if r.record_type == "warning_or_adverse_notice"]

        if any(r.source_role in {"regulator", "government", "claimed_regulator_or_registry"} and r.record_type == "registry_or_license_record" for r in official):
            existence = "registry_or_authority_trace"
        elif self_sources:
            existence = "entity_self_trace"
        elif independent:
            existence = "independent_trace"
        else:
            existence = "not_verified"

        profiles.append({
            "entity": entity,
            "existence_status": existence,
            "project_connection_status": "externally_linked" if linked else "not_independently_linked",
            "official_or_registry_records": [asdict(r) for r in official],
            "entity_owned_records": [asdict(r) for r in self_sources],
            "independent_records": [asdict(r) for r in independent],
            "warning_records": [asdict(r) for r in warnings],
            "record_count": len(ers),
        })

    result["operator_registry_research"] = {
        "status": "ok" if entities else "no_legal_entities",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "principle": "Existenz/Registerspur und Projektverbindung werden getrennt geprüft. Eine gefundene Firma bestätigt nicht automatisch ihre behauptete Rolle beim Projekt.",
        "project_name": project_name,
        "project_domain": project_domain,
        "entities_from_project_website": entities,
        "derived_entity_count": max(0, len(entities) - len(original_entities)),
        "search_attempts": attempts,
        "profiles": profiles,
        "records": [asdict(r) for r in sorted(records, key=lambda r: (r.entity.lower(), -_rank_role(r.source_role), r.title.lower()))],
    }
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="Akademie Research Engine · Betreiber/Register/Behörden")
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
