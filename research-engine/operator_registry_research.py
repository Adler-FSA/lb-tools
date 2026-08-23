#!/usr/bin/env python3
"""Betreiber-, Register- und Behörden-Rohrecherche.

Prüft Rechtsträger aus der Projektwebsite außerhalb des Projekts und trennt:
Existenz/Registerspur, Lizenz-/Statusaussage, institutionellen Behördenkontext
und eine extern belegte Verbindung zum Projekt. Keine Gesamtbewertung.
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
    "bafin.de": "regulator", "fca.org.uk": "regulator", "sec.gov": "regulator",
    "finra.org": "regulator", "esma.europa.eu": "regulator", "eba.europa.eu": "regulator",
    "europa.eu": "government", "gov.uk": "government", "banque-comores.km": "regulator",
}
CLAIMED_AUTHORITY_HOSTS = {"mwaliregistrar.info", "mwaliregistrar.net", "mwaliregistrar.com"}

# Direkte Kataloge werden selbst gelesen. Suchmaschinen-Ranking darf nicht darüber
# entscheiden, ob ein exakter öffentlicher Registereintrag überhaupt gesehen wird.
DIRECT_REGISTRY_PROBES = (
    "https://mwaliregistrar.info/list_of_entities.html",
)

CLAIMED_AUTHORITY_CONTEXT = {
    "mwaliregistrar.info": {
        "name": "Mwali International Services Authority",
        "aliases": ["Mwali International Services Authority", "M.I.S.A", "MISA", "Mwali", "Mohéli", "offshore", "off-shore"],
        "authority_urls": [
            "https://banque-comores.km/page/show/textes-reglementaires",
            "https://banque-comores.km/article/show/communique-sur-lexercice-illegal-dactivites-bancaires-offshores",
            "https://banque-comores.km/article/show/communique-du-8-decembre-2025",
        ],
    }
}

WARNING_WORDS = re.compile(
    r"\b(?:warning|warned|unauthori[sz]ed|unlicensed|suspended|revoked|clone|scam|fraud|illegal|"
    r"fictitious|fictive|illégal|illégale|illégales|warnung|unerlaubt|nicht zugelassen|lizenz entzogen|suspendiert)\b",
    re.I,
)
LICENSE_WORDS = re.compile(
    r"\b(?:licen[cs]e|licen[cs]ed|registration|registered|register|authori[sz]ed|regulated|"
    r"banking company|banking licence|banking license|agrément|agrement|lizenz|registriert|zugelassen|reguliert)\b",
    re.I,
)
ACTIVE_WORDS = re.compile(r"\b(?:active|valid|authori[sz]ed|licensed|registered|aktiv|gültig)\b", re.I)
INACTIVE_WORDS = re.compile(r"\b(?:suspended|revoked|inactive|expired|cancelled|dissolved|suspendiert|widerrufen|inaktiv|abgelaufen)\b", re.I)
LICENSE_NO_RE = re.compile(
    r"\b(?:licen[cs]e\s*(?:no\.?|number)?|registration\s*(?:no\.?|number)?|reg\.?\s*no\.?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{4,30})",
    re.I,
)
BARE_BANK_LICENSE_RE = re.compile(r"\b(B\d{7,12})\b", re.I)
BANCORP_ENTITY_RE = re.compile(r"\b([A-Z][A-Za-z0-9&.'’\- ]{1,70}\s+Bancorp)\b")
LEGAL_SUFFIX_RE = re.compile(r"\b(?:DAO\s+LLC|LLC|Ltd\.?|Limited|Inc\.?|PLC|GmbH|AG|S\.?A\.?)\b", re.I)


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


@dataclass
class AuthorityContextRecord:
    claimed_authority: str
    claimed_authority_host: str
    source_role: str
    source_url: str
    title: str
    evidence: str
    published_at: str
    context_type: str
    authority_confidence: str
    fetched: bool


def clean(value: str) -> str:
    return ext.clean_text(value)


def host_of(url: str) -> str:
    return ext.host_of(url)


def same_domain(url: str, domain: str) -> bool:
    return ext.same_domain(url, domain)


def claimed_authority_key(host: str) -> str:
    host = (host or "").lower().removeprefix("www.")
    for candidate in CLAIMED_AUTHORITY_HOSTS:
        if host == candidate or host.endswith("." + candidate):
            return "mwaliregistrar.info" if candidate.startswith("mwaliregistrar") else candidate
    return ""


def _normalize_bancorp_candidate(value: str) -> str:
    words = clean(value).strip(" .,:;-").split()
    if not words:
        return ""
    for i, word in enumerate(words):
        letters = re.sub(r"[^A-Za-z]", "", word)
        if len(letters) >= 2 and letters.isupper():
            words = words[i:]
            break
    else:
        starts = []
        for i, word in enumerate(words[:-1]):
            first = re.sub(r"^[^A-Za-z]+", "", word)[:1]
            if first and first.isupper():
                starts.append(i)
        if starts:
            words = words[starts[-1]:]
    if len(words) > 4:
        words = words[-4:]
    return " ".join(words)


def derived_entities_from_evidence(analysis: dict) -> list[str]:
    out: list[str] = []
    for finding in analysis.get("findings") or []:
        text = clean(finding.get("evidence") or "")
        for m in BANCORP_ENTITY_RE.finditer(text):
            value = _normalize_bancorp_candidate(m.group(1))
            if len(value) >= 8 and value.lower() not in {x.lower() for x in out}:
                out.append(value)
    return out


def source_role(url: str, entity: str, title: str, text: str) -> tuple[str, str]:
    host = host_of(url)
    for suffix, role in AUTHORITY_HOSTS.items():
        if host == suffix or host.endswith("." + suffix):
            return role, "high"
    if claimed_authority_key(host):
        return "claimed_regulator_or_registry", "medium"

    hay = clean(" ".join([title, text[:5000]])).lower()
    entity_compact = ext.compact(entity)
    host_compact = ext.compact(host.split(".")[0])
    if entity_compact and host_compact and (entity_compact.startswith(host_compact) or host_compact in entity_compact):
        return "entity_owned", "medium"
    if entity and ("privacy" in hay or "terms of use" in hay or "contact" in hay):
        first = entity.split()[0] if entity.split() else ""
        if first and ext.compact(first) in ext.compact(host):
            return "entity_owned", "medium"
    return "independent", "low"


def exact_entity_present(entity: str, title: str, snippet: str, text: str) -> bool:
    hay = clean(" ".join([title, snippet, text[:20000]])).lower()
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
    if LICENSE_WORDS.search(hay) or BARE_BANK_LICENSE_RE.search(hay):
        return "registry_or_license_record"
    return "entity_trace"


def extract_status(text: str) -> str:
    hay = clean(text)
    m = re.search(r"\bStatus\s*[:\-]?\s*(Active|Inactive|Suspended|Revoked|Valid|Expired|Cancelled)\b", hay, re.I)
    if m:
        return clean(m.group(1))
    if re.search(r"\bActive\b", hay, re.I):
        return "Active"
    if INACTIVE_WORDS.search(hay[:5000]):
        return "inactive_or_restricted_mentioned"
    if ACTIVE_WORDS.search(hay[:5000]):
        return "active_or_registered_mentioned"
    return ""


def extract_license_number(text: str) -> str:
    hay = clean(text)
    m = LICENSE_NO_RE.search(hay)
    if m:
        return clean(m.group(1))
    m = BARE_BANK_LICENSE_RE.search(hay)
    return clean(m.group(1)) if m else ""


def evidence(text: str, needle_primary: str, needle_secondary: str, fallback: str, width: int = 430) -> str:
    body = clean(text)
    if not body:
        return clean(fallback)[:width]
    low = body.lower()
    for needle in (needle_primary, needle_secondary):
        needle = clean(needle)
        idx = low.find(needle.lower()) if needle else -1
        if idx >= 0:
            start = max(0, idx - 100)
            return clean(body[start:start + width])[:width]
    return clean(fallback or body[:width])[:width]


def entity_value_context(text: str, entity: str, width: int = 260) -> str:
    """Wertefenster beginnt exakt am Rechtsträger, damit Tabellenzeilen nicht verrutschen."""
    body = clean(text)
    needle = clean(entity)
    if not body or not needle:
        return ""
    idx = body.lower().find(needle.lower())
    if idx < 0:
        return ""
    return clean(body[idx:idx + width])


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
    return {"regulator": 5, "government": 5, "claimed_regulator_or_registry": 4, "entity_owned": 3, "independent": 2}.get(role, 0)


def _record_from_page(entity: str, page: dict, project_name: str, project_domain: str, found_via: str, snippet: str = "") -> EntityRecord:
    url = page.get("url") or ""
    title = clean(page.get("title") or "")
    text = page.get("text") or snippet
    readable = evidence(text, entity, project_name, snippet, width=620)
    values = entity_value_context(text, entity) or readable
    role, authority = source_role(url, entity, title, text)
    conn, match = project_connection(project_name, project_domain, title, snippet, text)
    return EntityRecord(
        entity=entity,
        source_role=role,
        source_url=url,
        title=title,
        evidence=readable,
        published_at=clean(page.get("published_at") or ""),
        record_type=classify_record(title, readable),
        status_text=extract_status(values),
        license_number=extract_license_number(values),
        project_connection=conn,
        project_match=match,
        authority_confidence=authority,
        fetched=bool(page.get("ok")),
        found_via=found_via,
    )


def collect_direct_registry_records(entities: list[str], project_name: str, project_domain: str) -> list[EntityRecord]:
    out: list[EntityRecord] = []
    for url in DIRECT_REGISTRY_PROBES:
        page = ext.read_public_page(url)
        if not page.get("ok"):
            continue
        title = clean(page.get("title") or "")
        text = page.get("text") or ""
        for entity in entities:
            if exact_entity_present(entity, title, "", text):
                out.append(_record_from_page(entity, page, project_name, project_domain, f"direct-registry: {url}"))
    return out


def candidate_entity_domains(entity: str) -> list[str]:
    base = clean(LEGAL_SUFFIX_RE.sub(" ", entity))
    stem = re.sub(r"[^a-z0-9]+", "", base.lower())
    hyphen = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
    values = []
    for name in (stem, hyphen):
        if len(name) >= 5:
            for tld in ("com", "io", "org"):
                values.append(f"{name}.{tld}")
    return list(dict.fromkeys(values))[:6]


def collect_entity_owned_records(entities: list[str], project_name: str, project_domain: str) -> list[EntityRecord]:
    out: list[EntityRecord] = []
    for entity in entities:
        for domain in candidate_entity_domains(entity):
            root = ext.read_public_page(f"https://{domain}/")
            root_hay = clean((root.get("title") or "") + " " + (root.get("text") or "")[:5000])
            brand = ext.compact(LEGAL_SUFFIX_RE.sub(" ", entity))
            if not root.get("ok") or not brand or brand not in ext.compact(root_hay):
                continue
            for path in ("/terms-of-use", "/terms", "/privacy-notice", "/privacy", "/legal"):
                page = ext.read_public_page(f"https://{domain}{path}")
                if not page.get("ok"):
                    continue
                if exact_entity_present(entity, page.get("title") or "", "", page.get("text") or ""):
                    rec = _record_from_page(entity, page, project_name, project_domain, f"entity-domain-probe: {domain}")
                    if rec.source_role == "entity_owned":
                        out.append(rec)
            break
    return out


def authority_context_relevant(info: dict, text: str) -> bool:
    hay = clean(text).lower()
    return any(clean(alias).lower() in hay for alias in info.get("aliases") or [] if clean(alias))


def collect_authority_context(records: list[EntityRecord]) -> list[AuthorityContextRecord]:
    keys = set()
    for rec in records:
        if rec.source_role == "claimed_regulator_or_registry":
            key = claimed_authority_key(host_of(rec.source_url))
            if key:
                keys.add(key)

    out: list[AuthorityContextRecord] = []
    seen_urls = set()
    for key in keys:
        info = CLAIMED_AUTHORITY_CONTEXT.get(key) or {}
        name = clean(info.get("name") or key)
        for url in info.get("authority_urls") or []:
            canonical = ext.canonical_url(url)
            if not canonical or canonical in seen_urls:
                continue
            seen_urls.add(canonical)
            page = ext.read_public_page(canonical)
            if not page.get("ok"):
                continue
            title = clean(page.get("title") or "")
            text = page.get("text") or ""
            if not authority_context_relevant(info, title + " " + text):
                continue
            role, confidence = source_role(page.get("url") or canonical, "", title, text)
            if role not in {"regulator", "government"}:
                continue
            out.append(AuthorityContextRecord(
                claimed_authority=name,
                claimed_authority_host=key,
                source_role=role,
                source_url=page.get("url") or canonical,
                title=title,
                evidence=evidence(text, name, "offshore", title),
                published_at=clean(page.get("published_at") or ""),
                context_type="authority_warning" if WARNING_WORDS.search(clean(title + " " + text)) else "authority_context",
                authority_confidence=confidence,
                fetched=True,
            ))
    return out


def enrich(data: dict) -> dict:
    result = json.loads(json.dumps(data))
    ctx = result.get("context") or {}
    analysis = result.get("analysis") or {}
    project_name = clean(ctx.get("project_name") or ctx.get("input") or "")
    project_domain = clean(ctx.get("domain") or "")

    original_entities = [clean(x) for x in analysis.get("legal_entities") or [] if clean(x)]
    entities = list(original_entities)
    for candidate in derived_entities_from_evidence(analysis):
        if candidate.lower() not in {x.lower() for x in entities}:
            entities.append(candidate)

    records: list[EntityRecord] = []
    attempts: list[dict] = []
    seen: set[tuple[str, str]] = set()

    records.extend(collect_direct_registry_records(entities, project_name, project_domain))
    records.extend(collect_entity_owned_records(entities, project_name, project_domain))
    for rec in records:
        seen.add((rec.entity.lower(), ext.canonical_url(rec.source_url)))

    fetched = 0
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
                page = {"ok": False, "url": url, "title": hit.title, "text": hit.snippet, "published_at": ""}
                if fetched < MAX_FETCHED_PAGES:
                    page = ext.read_public_page(url)
                    fetched += 1
                    if not page.get("ok"):
                        page = {"ok": False, "url": url, "title": hit.title, "text": hit.snippet, "published_at": ""}
                if not exact_entity_present(entity, page.get("title") or hit.title, hit.snippet, page.get("text") or ""):
                    continue
                records.append(_record_from_page(entity, page, project_name, project_domain, f"{hit.provider}: {query}", hit.snippet))

    dedup: dict[tuple[str, str], EntityRecord] = {}
    for rec in records:
        key = (rec.entity.lower(), ext.canonical_url(rec.source_url))
        cur = dedup.get(key)
        if cur is None or (_rank_role(rec.source_role), rec.fetched) > (_rank_role(cur.source_role), cur.fetched):
            dedup[key] = rec
    records = list(dedup.values())
    authority_context = collect_authority_context(records)

    profiles = []
    for entity in entities:
        ers = [r for r in records if r.entity == entity]
        official = [r for r in ers if r.source_role in {"regulator", "government", "claimed_regulator_or_registry"}]
        self_sources = [r for r in ers if r.source_role == "entity_owned"]
        independent = [r for r in ers if r.source_role == "independent"]
        linked = [r for r in ers if r.project_connection == "externally_linked"]
        warnings = [r for r in ers if r.record_type == "warning_or_adverse_notice"]
        claimed_keys = {claimed_authority_key(host_of(r.source_url)) for r in official if r.source_role == "claimed_regulator_or_registry"}
        contexts = [c for c in authority_context if c.claimed_authority_host in claimed_keys]

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
            "authority_context_records": [asdict(c) for c in contexts],
            "record_count": len(ers),
        })

    result["operator_registry_research"] = {
        "status": "ok" if entities else "no_legal_entities",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "principle": "Existenz/Registerspur, institutioneller Behördenkontext und Projektverbindung werden getrennt geprüft. Eine gefundene Firma oder Lizenzliste bestätigt nicht automatisch ihre behauptete Rolle beim Projekt.",
        "project_name": project_name,
        "project_domain": project_domain,
        "entities_from_project_website": entities,
        "derived_entity_count": max(0, len(entities) - len(original_entities)),
        "direct_registry_probes": list(DIRECT_REGISTRY_PROBES),
        "search_attempts": attempts,
        "profiles": profiles,
        "records": [asdict(r) for r in sorted(records, key=lambda r: (r.entity.lower(), -_rank_role(r.source_role), r.title.lower()))],
        "authority_context_records": [asdict(c) for c in authority_context],
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
