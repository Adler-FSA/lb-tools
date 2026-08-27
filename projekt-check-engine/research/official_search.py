#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlparse

from research.web_search import search_one

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG = ROOT / "projekt-check-engine/sources/official_sources.json"


def _norm(value: str) -> str:
    return " ".join(str(value or "").casefold().split())


def _contains_term(blob: str, term: str) -> bool:
    needle=_norm(term)
    if not needle:
        return False
    return bool(re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", blob))


def _host(url: str) -> str:
    value = (urlparse(str(url or "")).hostname or "").lower().strip(".")
    return value[4:] if value.startswith("www.") else value


def host_matches_source(url: str, source: dict) -> bool:
    h = _host(url)
    return any(h == d or h.endswith("." + d) for d in [str(x).lower().removeprefix("www.") for x in source.get("domains") or []])


def load_catalog(path: Path = DEFAULT_CATALOG) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def select_sources(catalog: dict, context_text: str, jurisdictions: list[dict], *, german_customer: bool = True, max_sources: int = 12) -> list[dict]:
    blob = _norm(context_text)
    strong_codes={
        str(x.get("jurisdiction") or "")
        for x in jurisdictions
        if x.get("strength")=="strong" or int(x.get("score") or 0)>=4
    }
    scored=[]
    for source in catalog.get("sources") or []:
        sj=str(source.get("jurisdiction") or "")
        kind=str(source.get("kind") or "")
        score=0
        strong_match = sj in strong_codes or (sj.startswith("AE") and "AE" in strong_codes)

        if german_customer and source.get("always_for_german_customer"):
            score += 10
        elif strong_match:
            score += 9
        elif sj=="EU" and german_customer and "regulator" in kind:
            # ESMA/EBA sind für eine deutsche Kundensicht relevant, wenn das Angebot
            # in ihren fachlichen Bereich fällt. Registerverzeichnisse werden dagegen
            # nicht ohne Betreiberbezug pauschal durchsucht.
            score += 4
        else:
            continue

        hits=[term for term in (source.get("activation_terms") or []) if _contains_term(blob,term)]
        if hits:
            score += min(6,len(hits)*2)

        # Ein EU-Regulator ohne jeden fachlichen Aktivierungstreffer bleibt draußen.
        if sj=="EU" and not strong_match and not hits:
            continue

        item=dict(source)
        item["selection_score"]=score
        item["activation_hits"]=hits[:8]
        item["strong_jurisdiction_match"]=strong_match
        scored.append(item)

    scored.sort(key=lambda x:(-x["selection_score"],x["id"]))
    return scored[:max_sources]


def _query_anchor(label: str, project_domains: list[str], distinctive_terms: list[str]) -> str:
    if distinctive_terms:
        return f'"{distinctive_terms[0]}"'
    if project_domains:
        return f'"{project_domains[0]}"'
    return f'"{label}"' if label else ""


def build_queries(source: dict, *, label: str, project_domains: list[str], distinctive_terms: list[str], entities: list[dict], persons: list[dict]) -> list[dict]:
    domain = next(iter(source.get("domains") or []), "")
    if not domain:
        return []
    site = f"site:{domain}"
    anchor = _query_anchor(label, project_domains, distinctive_terms)
    queries = []
    kind = str(source.get("kind") or "")

    if anchor:
        queries.append({"purpose":"project", "query":f"{anchor} {site}"})

    if "registry" in kind:
        for entity in entities[:3]:
            name = str(entity.get("name") or "").strip()
            if name:
                queries.append({"purpose":"entity", "candidate":name, "query":f'"{name}" {site}'})

    if "regulator" in kind and entities:
        name = str(entities[0].get("name") or "").strip()
        if name:
            queries.append({"purpose":"entity", "candidate":name, "query":f'"{name}" {site}'})
    if persons:
        name = str(persons[0].get("name") or "").strip()
        if name and anchor:
            queries.append({"purpose":"person", "candidate":name, "query":f'"{name}" {anchor} {site}'})

    dedup=[]; seen=set()
    for q in queries:
        key=q["query"].casefold()
        if key not in seen:
            seen.add(key); dedup.append(q)
    return dedup[:5]


def relation_score(item: dict, *, label: str, project_domains: list[str], distinctive_terms: list[str], entities: list[dict], persons: list[dict]) -> tuple[int, list[str]]:
    blob = _norm(" ".join([item.get("url", ""), item.get("title", ""), item.get("snippet", "")]))
    score = 0
    matches = []
    for domain in project_domains:
        d=_norm(domain).removeprefix("www.")
        if d and d in blob:
            score=max(score,6); matches.append(f"domain:{domain}")
    for term in distinctive_terms:
        t=_norm(term)
        if len(t)>=4 and t in blob:
            score=max(score,5); matches.append(f"anchor:{term}")
    for entity in entities:
        name=str(entity.get("name") or "")
        if _norm(name) and _norm(name) in blob:
            score=max(score,5); matches.append(f"entity:{name}")
    for person in persons:
        name=str(person.get("name") or "")
        if _norm(name) and _norm(name) in blob:
            score=max(score,4); matches.append(f"person:{name}")
    if label and len(_norm(label)) >= 5 and _norm(label) in blob:
        score=max(score,2); matches.append(f"label:{label}")
    return score, list(dict.fromkeys(matches))


def search_official_sources(*, label: str, project_domains: list[str], distinctive_terms: list[str], entities: list[dict], persons: list[dict], jurisdictions: list[dict], context_text: str, catalog_path: Path = DEFAULT_CATALOG, max_sources: int = 12, per_query: int = 5, max_results: int = 30) -> dict:
    catalog=load_catalog(catalog_path)
    sources=select_sources(catalog, context_text, jurisdictions, max_sources=max_sources)
    results=[]; rejected=[]; errors=[]; queries=[]; seen=set()
    for source in sources:
        for query in build_queries(source,label=label,project_domains=project_domains,distinctive_terms=distinctive_terms,entities=entities,persons=persons):
            q=dict(query); q.update({"source_id":source["id"],"source_name":source["name"],"source_kind":source["kind"],"jurisdiction":source["jurisdiction"]})
            queries.append(q)
            rows, errs = search_one(q["query"], per_provider=per_query)
            errors.extend([f"{source['id']}: {e}" for e in errs])
            for row in rows:
                row=dict(row)
                row.update({"source_id":source["id"],"source_name":source["name"],"source_kind":source["kind"],"jurisdiction":source["jurisdiction"],"purpose":q["purpose"]})
                if q.get("candidate"):
                    row["candidate"]=q["candidate"]
                if not host_matches_source(row.get("url", ""), source):
                    row["reject_reason"]="non_official_host"
                    rejected.append(row); continue
                score, matches=relation_score(row,label=label,project_domains=project_domains,distinctive_terms=distinctive_terms,entities=entities,persons=persons)
                row["relation_score"]=score; row["relation_matches"]=matches
                if score < 4:
                    row["reject_reason"]="insufficient_identity_relation"
                    rejected.append(row); continue
                key=row["url"].lower().rstrip("/")
                if key in seen: continue
                seen.add(key); results.append(row)
                if len(results)>=max_results: break
            if len(results)>=max_results: break
        if len(results)>=max_results: break
    return {"selected_sources":sources,"queries":queries,"results":results,"rejected_results":rejected,"errors":errors}
