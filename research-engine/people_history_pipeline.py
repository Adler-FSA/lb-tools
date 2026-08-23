#!/usr/bin/env python3
"""Konsolidierte Personen-/Management-Pipeline.

1. breite Such-/Direktproben aus people_history_research
2. gezielter Same-Domain-Crawl auf bereits bestätigten Entity-Domains
3. gemeinsame, weiterhin konservative Profile
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


base = load_module("people_history_research_base", "people_history_research.py")
crawler = load_module("entity_people_crawler_for_pipeline", "entity_people_crawler.py")


def _profiles(records):
    profiles = []
    for entity in sorted({r.entity for r in records}):
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
                "roles": sorted({base.clean(r.claimed_role) for r in prs if base.clean(r.claimed_role)}),
                "history_record_count": len(history),
                "adverse_record_count": len(adverse),
                "records": [asdict(r) for r in prs],
            })
    return profiles


def enrich(data: dict) -> dict:
    result = base.enrich(data)
    block = result.get("people_history_research") or {}
    ctx = result.get("context") or {}
    project_name = base.clean(ctx.get("project_name") or ctx.get("input") or "")
    project_domain = base.clean(ctx.get("domain") or "")

    records = []
    for item in block.get("records") or []:
        try:
            records.append(base.PersonRecord(**item))
        except TypeError:
            continue

    crawls = []
    trusted = block.get("trusted_entity_hosts") or {}
    for entity in block.get("entities_checked") or []:
        roots = list(trusted.get(entity) or [])
        if not roots:
            continue
        crawl = crawler.crawl_entity_people(entity, roots)
        crawls.append(crawl)
        for finding in crawl.get("findings") or []:
            evidence = base.clean(finding.get("evidence") or "")
            title = base.clean(finding.get("source_title") or "")
            project_connection, project_match = base._project_connection(
                project_name, project_domain, title, "", evidence
            )
            records.append(base.PersonRecord(
                person_name=base.clean(finding.get("person_name") or ""),
                entity=entity,
                claimed_role=base.clean(finding.get("role") or ""),
                source_url=base.ext.canonical_url(finding.get("source_url") or ""),
                source_title=title,
                source_role=base._source_role(finding.get("source_url") or "", entity),
                evidence=evidence,
                published_at=base.clean(finding.get("published_at") or ""),
                entity_connection="brand_shown",
                project_connection=project_connection,
                project_match=project_match,
                ownership_claim=bool(base.OWNER_WORDS.search(evidence)),
                history_signal=bool(base.HISTORY_WORDS.search(evidence)),
                adverse_signal=bool(base.ADVERSE_WORDS.search(evidence)),
                fetched=True,
                found_via="trusted-entity-domain-crawl",
            ))

    records = base._dedupe(records)
    profiles = _profiles(records)
    project_people = [p for p in profiles if p["project_connection_status"] == "externally_linked"]
    owner_claims = [p for p in profiles if p["ownership_status"] == "ownership_claim_found"]

    block["status"] = "ok" if profiles else "no_people_confirmed"
    block["generated_at"] = datetime.now(timezone.utc).isoformat()
    block["profiles"] = profiles
    block["records"] = [asdict(r) for r in records]
    block["entity_domain_crawls"] = crawls
    block["summary"] = {
        "person_profile_count": len(profiles),
        "project_linked_person_count": len(project_people),
        "ownership_claim_profile_count": len(owner_claims),
        "verified_ubo_count": 0,
        "adverse_record_count": sum(int(p.get("adverse_record_count") or 0) for p in profiles),
        "entity_domain_crawl_count": len(crawls),
        "entity_domain_finding_count": sum(len(c.get("findings") or []) for c in crawls),
    }
    block["guardrails"] = {
        "entity_person_implies_project_person": False,
        "founder_or_ceo_implies_ubo": False,
        "ubo_without_ownership_source": False,
    }
    result["people_history_research"] = block
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="Akademie Research Engine · konsolidierte Personenpipeline")
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
